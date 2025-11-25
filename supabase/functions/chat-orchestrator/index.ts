import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { 
  getAllTools, 
  detectServices, 
  getToolByName, 
  buildSystemInstruction 
} from "../_shared/service-registry.ts";
import {
  detectWorkflowType,
  mapInputsFromPreviousSteps,
  estimateWorkflowDuration,
  assessWorkflowComplexity,
  validateWorkflowPlan,
  type WorkflowPlan,
  type WorkflowStep
} from "../_shared/workflow-planner.ts";
import {
  createAgentContext,
  updateContextAfterStep,
  getContextSummary,
  getAgentSpecificContext,
  type AgentContext
} from "../_shared/agent-context.ts";
import {
  getUserMemoryContext,
  buildSystemPromptWithMemory,
  learnFromInteraction,
  initializeBrandMemory,
  getOptimalPostingTimes,
  getBestPractices
} from "../_shared/memory-manager.ts";
import {
  analyzeImage,
  processDocument,
  generateMultiModalRecommendations
} from "../_shared/multi-modal-processor.ts";
import {
  determineRecoveryStrategy,
  executeRecovery
} from "../_shared/error-recovery.ts";
import {
  generateProactiveSuggestions,
  detectWorkflowOpportunity,
  formatSuggestionsForChat,
  detectUserGoal,
  applySmartDefaults,
  generatePredictiveSuggestions
} from "../_shared/suggestion-engine.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, message, context } = await req.json();

    // Get authorization header to extract user
    const authHeader = req.headers.get('authorization');
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    // Get user for usage and personalization
    const { data: { user } } = await supabaseClient.auth.getUser();

    // Check usage limits before processing
    const { data: usageCheck, error: usageError } = await supabaseClient.functions.invoke(
      'check-usage-limit',
      { body: { serviceType: 'chat', creditsNeeded: 1, userId: user?.id } }
    );

    if (usageError) {
      console.error('Usage check failed, allowing chat request by default:', usageError);
    } else if (usageCheck && !usageCheck.allowed && usageCheck.currentPlan !== 'enterprise') {
      return new Response(
        JSON.stringify({ 
          error: usageCheck.message || 'Chat limit exceeded',
          needsUpgrade: usageCheck.needsUpgrade,
          currentPlan: usageCheck.currentPlan
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (usageCheck && !usageCheck.allowed && usageCheck.currentPlan === 'enterprise') {
      console.warn('Usage check reported limit exceeded for enterprise plan; allowing request anyway.', usageCheck);
    }

    // Get user profile for personalization
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('company_name, brand_voice, target_audience, goals, industry, primary_color, secondary_color, accent_color')
      .eq('id', user?.id || '')
      .single();

    // Initialize brand memory if this is first time (idempotent operation)
    if (userProfile && user?.id) {
      await initializeBrandMemory(supabaseClient, user.id, userProfile);
    }

    // Load user memory context for personalization
    const memoryContext = user?.id 
      ? await getUserMemoryContext(supabaseClient, user.id)
      : {};
    
    console.log('[Memory] Loaded context:', Object.keys(memoryContext));

    // Get conversation data with summary for context compression
    const { data: conversation } = await supabaseClient
      .from('conversations')
      .select('conversation_summary, message_count, last_summary_at')
      .eq('id', conversationId)
      .single();

    // Get conversation history
    const { data: messagesData } = await supabaseClient
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // PHASE 1.2: GOAL DETECTION
    // Build conversation context for goal detection
    const conversationContext = {
      recentMessages: (messagesData || []).slice(-5).map(m => ({
        role: m.role,
        content: m.content
      })),
      recentTools: (messagesData || [])
        .filter(m => m.tool_calls)
        .flatMap(m => (m.tool_calls as any[]).map(tc => tc.functionCall?.name || tc.name))
        .slice(-10),
      conversationGoal: message
    };

    // Detect user's goal
    const detectedGoal = detectUserGoal(conversationContext, memoryContext);
    console.log('[Goal Detection]', detectedGoal.type, `(${(detectedGoal.confidence * 100).toFixed(0)}%)`, '- Path:', detectedGoal.suggestedPath.join(' → '));

    // Smart context compression - use summary for long conversations
    let contextMessages = messagesData || [];
    let conversationContextNote = '';
    
    if (conversation?.conversation_summary && contextMessages.length > 10) {
      // Use summary for older messages, keep recent ones
      conversationContextNote = `\n\n📋 CONVERSATION SUMMARY (${conversation.message_count} previous messages):\n${conversation.conversation_summary}\n\n`;
      // Keep only last 8 messages for detailed context
      contextMessages = contextMessages.slice(-8);
      console.log(`[Context Compression] Using summary + ${contextMessages.length} recent messages`);
    } else if (contextMessages.length > 15) {
      // If no summary but conversation is long, keep last 12 messages
      contextMessages = contextMessages.slice(-12);
      console.log(`[Context Compression] Keeping last ${contextMessages.length} messages`);
    }

    const history = contextMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role,  // Convert assistant → model for Gemini API
      parts: [{ text: m.content }]
    })) || [];

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // ========== WORKFLOW DETECTION ==========
    const workflowType = detectWorkflowType(message);
    console.log('Workflow type detected:', workflowType);
    
    // ========== SERVICE-AGNOSTIC ARCHITECTURE ==========
    
    // Detect which services the user is asking about
    const detectedServices = detectServices(message);
    console.log('Detected services:', detectedServices.map(s => s.name));

    // Get all available tools dynamically from registry
    const allTools = getAllTools();
    
    // Add workflow planning tool for complex requests
    const workflowPlanningTool = {
      name: 'create_workflow_plan',
      description: `Create a multi-step execution plan for complex tasks involving multiple services.
      Use this when user requests multiple actions in sequence (e.g., "create a graphic and post it", 
      "generate content and send email", "research E2 visa, create Instagram post, and publish it").`,
      parameters: {
        type: 'object',
        properties: {
          userGoal: {
            type: 'string',
            description: 'The ultimate goal the user wants to achieve'
          },
          requiresResearch: {
            type: 'boolean',
            description: 'Whether research/analysis is needed first'
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                agent: { 
                  type: 'string', 
                  enum: ['research', 'graphics', 'video', 'content', 'social', 'email', 'calendar']
                },
                action: { type: 'string', description: 'Tool name to call for this step' },
                purpose: { type: 'string', description: 'Why this step is needed' },
                parameters: { type: 'object', description: 'Parameters for the tool' },
                dependsOn: { 
                  type: 'array', 
                  items: { type: 'number' },
                  description: 'Step numbers this depends on'
                },
                inputMapping: {
                  type: 'object',
                  description: 'Map outputs from previous steps (e.g., {"imageId": "step2.result.id"})'
                },
                canRunInParallel: { type: 'boolean', description: 'Can run simultaneously with other steps' }
              },
              required: ['agent', 'action', 'purpose', 'parameters']
            }
          }
        },
        required: ['userGoal', 'steps']
      }
    };
    
    // Include workflow tool for workflow/research types
    const tools = workflowType !== 'simple' 
      ? {
          functionDeclarations: [
            ...allTools.functionDeclarations,
            workflowPlanningTool
          ]
        }
      : allTools;
    
    console.log('Available tools:', tools.functionDeclarations.map((t: any) => t.name));

    // Build brand context with memory and conversation summary
    let brandContext = '';
    if (userProfile) {
      brandContext = `
BRAND CONTEXT:
- Company: ${userProfile.company_name || 'your business'}
- Brand Voice: ${userProfile.brand_voice || 'Professional and engaging'}
- Target Audience: ${userProfile.target_audience || 'General audience'}
- Marketing Goals: ${userProfile.goals?.join(', ') || 'Growth and engagement'}
- Industry: ${userProfile.industry || 'General'}
${conversationContextNote}`;

      // Add memory-based insights
      if (memoryContext.preferences && Object.keys(memoryContext.preferences).length > 0) {
        brandContext += '\n\nLEARNED USER PREFERENCES:\n';
        Object.entries(memoryContext.preferences).forEach(([key, value]) => {
          brandContext += `- ${key}: ${JSON.stringify(value)}\n`;
        });
      }

      if (memoryContext.patterns && Object.keys(memoryContext.patterns).length > 0) {
        brandContext += '\n\nSUCCESSFUL PATTERNS (what works well):\n';
        const topPatterns = Object.entries(memoryContext.patterns).slice(0, 3);
        topPatterns.forEach(([key, value]) => {
          brandContext += `- ${key}: ${JSON.stringify(value)}\n`;
        });
      }

      if (memoryContext.successful_workflows && memoryContext.successful_workflows.length > 0) {
        brandContext += '\n\nRECENT SUCCESSFUL WORKFLOWS:\n';
        memoryContext.successful_workflows.slice(0, 2).forEach((workflow: any, i: number) => {
          brandContext += `${i + 1}. ${workflow.description || JSON.stringify(workflow)}\n`;
        });
      }

      // PHASE 1.2: Add detected goal to context
      if (detectedGoal.confidence > 0.5) {
        brandContext += `\n\n🎯 DETECTED USER GOAL: ${detectedGoal.type.replace('_', ' ').toUpperCase()}\n`;
        brandContext += `Suggested path: ${detectedGoal.suggestedPath.join(' → ')}\n`;
        brandContext += `Confidence: ${(detectedGoal.confidence * 100).toFixed(0)}%\n`;
      }
    }

// Build professional Sineva Brain system instruction with multi-agent orchestration
    const sinevaSystemInstruction = `
You are Sineva Brain - the Master Orchestrator of a multi-agent marketing automation system.

CORE IDENTITY:
- Professional marketing consultant and strategic advisor
- Authoritative expert in AI-powered marketing automation
- Master coordinator of specialized AI agents
- Precise, efficient, and results-oriented
- Business-focused with deep analytical capabilities

MULTI-AGENT ORCHESTRATION CAPABILITIES:
You coordinate specialized agents to execute complex, multi-step workflows:

1. **Research Agent**: Conducts topic research, competitor analysis, and strategy recommendations
2. **Graphics Agent**: Generates AI images using Gemini 3 Pro Image
3. **Video Agent**: Creates videos using VEO 3.1 models
4. **Content Agent**: Writes captions, blog posts, and marketing copy
5. **Social Agent**: Publishes content to social media platforms
6. **Email Agent**: Sends email campaigns
7. **Calendar Agent**: Schedules content for future publishing

${brandContext}

ORCHESTRATION PROTOCOL:

**Step 1: Analyze Request Complexity**
Determine if request is:
- Simple (single tool call) → Execute directly with available tools
- Workflow (multiple connected actions) → Create workflow plan using create_workflow_plan
- Research-required (needs analysis first) → Start with research then create workflow

**Step 2: Create Execution Plan for Workflows**
When user requests multiple actions (e.g., "generate Instagram post and publish it"), call create_workflow_plan with:
- Clear goal decomposition
- Sequential steps with proper agents and actions
- Input/output mapping between agents (e.g., {"imageId": "step2.result.id"})
- Research phase if analyzing unfamiliar topics

**Step 3: Execute with Context Flow**
- Each agent receives context from previous steps automatically
- Results flow forward through the workflow
- Brand Kit data is always included
- Research insights inform content creation
- Generated assets are passed to publishing agents

**Step 4: Progress Communication**
- Explain what you're orchestrating briefly
- Provide strategic insights about decisions made
- Confirm completion with concise summary

WORKFLOW EXAMPLES:

Example 1: "Generate Instagram post about E2 visa and publish it"
→ Call create_workflow_plan with:
  - Step 1: Research Agent analyzes E2 visa best practices
  - Step 2: Graphics Agent generates Instagram image (using research insights)
  - Step 3: Content Agent writes caption (using research insights)
  - Step 4: Social Agent publishes (using image from step 2, caption from step 3)

Example 2: "Create a video ad and schedule it for Monday"
→ Call create_workflow_plan with:
  - Step 1: Video Agent generates ad
  - Step 2: Content Agent writes description
  - Step 3: Calendar Agent schedules for Monday

DECISION-MAKING RULES:
- Use create_workflow_plan for multi-step requests with "and", "then", "plus"
- Always research unfamiliar topics first
- Always fetch Brand Kit for consistency
- Chain agents when actions are dependent
- Explain orchestration briefly before execution

COMMUNICATION STYLE:
- Professional and strategic
- Concise explanations of orchestration plans
- Provide reasoning for agent selection
- Celebrate workflow completion simply

Remember: You are the Master Orchestrator. When users request multiple actions, use create_workflow_plan to coordinate specialized agents and deliver complete marketing solutions.
`;

    const systemInstruction = detectedServices.length > 0 
      ? `${sinevaSystemInstruction}\n\nDETECTED SERVICES IN REQUEST:\n${detectedServices.map(s => `- ${s.name}: ${s.description}`).join('\n')}`
      : sinevaSystemInstruction;

    // ========== END SERVICE-AGNOSTIC ARCHITECTURE ==========

    // ========== INTELLIGENT MODEL SELECTION ==========
    // Three-tier model and thinking level selection
    const complexIndicators = [
      'analyze', 'strategy', 'plan', 'multiple', 'compare', 
      'recommend', 'optimize', 'workflow', 'orchestrate', 'explain',
      'generate', 'create', 'design'
    ];

    const indicatorCount = complexIndicators.filter(indicator => 
      message.toLowerCase().includes(indicator)
    ).length;

    const isHighComplexity = indicatorCount >= 2 || 
      history.length > 15 || 
      message.length > 800 ||
      detectedServices.length > 1;

    const isModerateComplexity = indicatorCount === 1 || 
      (history.length > 10 && history.length <= 15) || 
      (message.length > 500 && message.length <= 800);

    // Use Gemini 2.5 Pro (stable production model)
    const selectedModel = 'gemini-2.5-pro';

    console.log(`Model Selection: ${selectedModel} | Complexity: ${isHighComplexity ? 'HIGH' : isModerateComplexity ? 'MODERATE' : 'LOW'} | History: ${history.length} msgs`);
    // ========== END MODEL SELECTION ==========

    // Call Gemini 2.5 Pro with streaming via Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent?alt=sse&key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            ...history,
            {
              role: 'user',
              parts: [{ text: message }]
            }
          ],
          tools: [tools],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API Error Details:', {
        status: geminiResponse.status,
        statusText: geminiResponse.statusText,
        error: errorText,
        model: selectedModel,
        endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:streamGenerateContent`
      });
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    // Create a transform stream to process SSE and save to DB
    let fullResponse = '';
    let toolCalls: any[] = [];
    let toolResults: any[] = [];

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                const candidate = data.candidates?.[0];
                const content = candidate?.content;

                if (content?.parts) {
                  // Check for function calls
                  const functionCall = content.parts.find((part: any) => part.functionCall);
                  
                  if (functionCall) {
                    toolCalls = [functionCall.functionCall];
                    
                    // ========== WORKFLOW EXECUTION LOGIC ==========
                    // Handle create_workflow_plan specially
                    if (functionCall.functionCall.name === 'create_workflow_plan') {
                      try {
                        const planArgs = functionCall.functionCall.args;
                        console.log('Creating workflow plan:', planArgs);
                        
                        // Build workflow plan
                        const workflowPlan: WorkflowPlan = {
                          id: crypto.randomUUID(),
                          originalPrompt: message,
                          goal: planArgs.userGoal,
                          researchRequired: planArgs.requiresResearch || false,
                          steps: planArgs.steps.map((s: any, idx: number) => ({
                            stepNumber: idx + 1,
                            agent: s.agent,
                            action: s.action,
                            purpose: s.purpose,
                            parameters: s.parameters || {},
                            dependsOn: s.dependsOn || [],
                            inputMapping: s.inputMapping,
                            canRunInParallel: s.canRunInParallel || false
                          })),
                          estimatedDuration: 0,
                          complexity: 'simple'
                        };
                        
                        workflowPlan.estimatedDuration = estimateWorkflowDuration(workflowPlan.steps);
                        workflowPlan.complexity = assessWorkflowComplexity(workflowPlan.steps);
                        
                        // Validate workflow
                        const validation = validateWorkflowPlan(workflowPlan);
                        if (!validation.valid) {
                          throw new Error(`Invalid workflow plan: ${validation.errors.join(', ')}`);
                        }
                        
                        // Save workflow to database
                        const { data: workflowExec } = await supabaseClient
                          .from('workflow_executions')
                          .insert({
                            user_id: user?.id,
                            conversation_id: conversationId,
                            original_prompt: message,
                            workflow_type: workflowType,
                            status: 'executing',
                            plan: workflowPlan
                          })
                          .select()
                          .single();
                        
                        console.log('Workflow execution created:', workflowExec?.id);
                        
                        // Create agent context
                        let agentContext = createAgentContext(
                          workflowExec?.id || '',
                          user?.id || '',
                          userProfile,
                          message,
                          workflowPlan.goal,
                          workflowPlan.steps.length
                        );
                        
                        // Execute workflow steps sequentially
                        const stepResults: Record<number, any> = {};
                        
                        for (const step of workflowPlan.steps) {
                          console.log(`Executing Step ${step.stepNumber}: ${step.purpose}`);
                          
                          // Update step status
                          await supabaseClient.from('workflow_steps').insert({
                            workflow_id: workflowExec?.id,
                            step_number: step.stepNumber,
                            agent: step.agent,
                            action: step.action,
                            purpose: step.purpose,
                            status: 'executing',
                            parameters: step.parameters,
                            started_at: new Date().toISOString()
                          });
                          
                          try {
                            // Map inputs from previous steps
                            const mappedParams = mapInputsFromPreviousSteps(
                              step.parameters,
                              step.inputMapping,
                              stepResults
                            );
                            
                            // Add agent-specific context
                            const contextualParams = {
                              ...mappedParams,
                              _context: getAgentSpecificContext(agentContext, step.agent)
                            };
                            
                            // Get tool configuration
                            const toolConfig = getToolByName(step.action);
                            if (!toolConfig) {
                              throw new Error(`Tool ${step.action} not found`);
                            }
                            
                            // Transform args
                            const transformedArgs = toolConfig.requestMapper 
                              ? toolConfig.requestMapper(contextualParams)
                              : contextualParams;
                            
                            // Invoke edge function
                            console.log(`Invoking: ${toolConfig.edgeFunction}`, transformedArgs);
                            const functionResponse = await supabaseClient.functions.invoke(
                              toolConfig.edgeFunction,
                              { body: transformedArgs }
                            );
                            
                            const stepResult = functionResponse.data;
                            stepResults[step.stepNumber] = stepResult;
                            
                            // Update context after step
                            agentContext = updateContextAfterStep(
                              agentContext,
                              step.stepNumber,
                              step.agent,
                              step.action,
                              stepResult
                            );
                            
                            // Update step status to completed
                            await supabaseClient
                              .from('workflow_steps')
                              .update({
                                status: 'completed',
                                result: stepResult,
                                completed_at: new Date().toISOString()
                              })
                              .eq('workflow_id', workflowExec?.id)
                              .eq('step_number', step.stepNumber);
                            
                            // Stream progress update
                            const progressMsg = `✓ Step ${step.stepNumber}/${workflowPlan.steps.length}: ${step.purpose} completed`;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                              text: progressMsg,
                              workflowProgress: {
                                currentStep: step.stepNumber + 1,
                                totalSteps: workflowPlan.steps.length,
                                stepCompleted: step.stepNumber
                              }
                            })}\n\n`));
                            
                          } catch (stepError: unknown) {
                            const errorMsg = stepError instanceof Error ? stepError.message : 'Step failed';
                            console.error(`Step ${step.stepNumber} error:`, errorMsg);
                            
                            await supabaseClient
                              .from('workflow_steps')
                              .update({
                                status: 'failed',
                                error_message: errorMsg,
                                completed_at: new Date().toISOString()
                              })
                              .eq('workflow_id', workflowExec?.id)
                              .eq('step_number', step.stepNumber);
                            
                            throw stepError;
                          }
                        }
                        
                        // Mark workflow as completed
                        await supabaseClient
                          .from('workflow_executions')
                          .update({
                            status: 'completed',
                            results: stepResults,
                            completed_at: new Date().toISOString()
                          })
                          .eq('id', workflowExec?.id);
                        
                        const completionMsg = `\n\n✓ Workflow completed successfully! All ${workflowPlan.steps.length} steps executed.\n\n${getContextSummary(agentContext)}`;
                        fullResponse += completionMsg;
                        
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          text: completionMsg,
                          workflowCompleted: true,
                          workflowPlan,
                          stepResults
                        })}\n\n`));
                        
                        toolResults = [{
                          name: 'create_workflow_plan',
                          response: { workflowPlan, stepResults, success: true }
                        }];
                        
                      } catch (workflowError: unknown) {
                        const errorMsg = workflowError instanceof Error ? workflowError.message : 'Workflow failed';
                        console.error('Workflow execution error:', errorMsg);
                        fullResponse += `Error executing workflow: ${errorMsg}`;
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          text: `Error: ${errorMsg}`,
                          error: true
                        })}\n\n`));
                        
                        toolResults = [{
                          name: 'create_workflow_plan',
                          error: errorMsg
                        }];
                      }
                    } else {
                      // ========== STANDARD TOOL EXECUTION ==========
                      let toolResult: any;
                      let executionStartTime = Date.now();
                      let retryAttempt = 0;
                      const MAX_RETRIES = 3;
                      const fnName = functionCall.functionCall.name;
                      let fnArgs = functionCall.functionCall.args;

                      // Helper function to categorize errors
                      const categorizeError = (errorMsg: string): string => {
                        const msg = errorMsg.toLowerCase();
                        if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
                        if (msg.includes('rate limit') || msg.includes('too many requests')) return 'rate_limit';
                        if (msg.includes('invalid') || msg.includes('validation')) return 'invalid_parameter';
                        if (msg.includes('not found') || msg.includes('missing')) return 'not_found';
                        if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('forbidden')) return 'permission';
                        return 'unknown';
                      };

                      // PHASE 1.5: Intelligent retry loop with error recovery
                      while (retryAttempt <= MAX_RETRIES) {
                        try {
                          if (retryAttempt === 0) {
                            console.log(`Executing tool: ${fnName}`, fnArgs);
                          } else {
                            console.log(`[Recovery] Retry attempt ${retryAttempt} for ${fnName}`);
                          }
                          
                          // Get tool configuration from registry
                          const toolConfig = getToolByName(fnName);
                          
                          if (!toolConfig) {
                            throw new Error(`Tool ${fnName} not found in service registry`);
                          }

                          // PHASE 1.2: Apply smart defaults based on user patterns
                          const serviceName = fnName.split('_')[0];
                          fnArgs = applySmartDefaults(fnArgs, serviceName, memoryContext);
                          
                          // PHASE 1.3: Apply best practices from successful past executions
                          if (user?.id && retryAttempt === 0) {
                            const bestPractices = await getBestPractices(supabaseClient, user.id, serviceName);
                            if (bestPractices) {
                              console.log('[Best Practices] Applying learned patterns');
                              fnArgs = { ...bestPractices, ...fnArgs }; // User params override learned ones
                            }
                          }

                          // Transform args using tool's request mapper
                          const transformedArgs = toolConfig.requestMapper 
                            ? toolConfig.requestMapper(fnArgs)
                            : fnArgs;

                          // Invoke the appropriate edge function
                          const functionResponse = await supabaseClient.functions.invoke(
                            toolConfig.edgeFunction,
                            { body: transformedArgs }
                          );

                          if (functionResponse.error) {
                            throw functionResponse.error;
                          }

                          toolResult = functionResponse.data;
                          
                          // Success! Break out of retry loop
                          const executionTime = Date.now() - executionStartTime;
                          console.log(`[Success] ${fnName} completed in ${executionTime}ms`);
                          
                          // Learn from successful execution
                          if (user?.id) {
                            await learnFromInteraction(supabaseClient, user.id, {
                              service: serviceName,
                              params: fnArgs,
                              success: true,
                              executionTime
                            });
                          }
                          
                          break; // Success, exit retry loop

                        } catch (toolError: any) {
                          const errorMessage = toolError?.message || String(toolError);
                          const errorType = categorizeError(errorMessage);
                          
                          console.error(`[Tool Error] Attempt ${retryAttempt + 1}/${MAX_RETRIES + 1}:`, errorMessage);

                          // PHASE 1.5: Determine recovery strategy
                          const recoveryStrategy = await determineRecoveryStrategy(
                            {
                              toolName: fnName,
                              params: fnArgs,
                              errorMessage,
                              errorType,
                              attempt: retryAttempt
                            },
                            supabaseClient,
                            user?.id
                          );

                          console.log('[Recovery Strategy]', recoveryStrategy.action, '-', recoveryStrategy.reason);

                          // Learn from failure
                          if (user?.id) {
                            await learnFromInteraction(supabaseClient, user.id, {
                              service: fnName.split('_')[0],
                              params: fnArgs,
                              success: false,
                              errorType
                            });
                          }

                          if (recoveryStrategy.action === 'abort' || retryAttempt >= MAX_RETRIES) {
                            // Final failure, inform user
                            throw new Error(recoveryStrategy.userMessage);
                          }

                          // Show recovery message to user
                          if (retryAttempt > 0) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                              text: `\n${recoveryStrategy.userMessage}`,
                              recovery: true
                            })}\n\n`));
                          }

                          // Apply recovery modifications for next attempt
                          if (recoveryStrategy.modifiedParams) {
                            fnArgs = recoveryStrategy.modifiedParams;
                          }

                          retryAttempt++;
                          
                          // Small delay before retry
                          await new Promise(resolve => setTimeout(resolve, 500 * retryAttempt));
                        }
                      }
                        
                      // ========== END STANDARD TOOL EXECUTION ==========
                      
                      const structuredToolResult = {
                        name: fnName,
                        response: toolResult
                      };
                      
                      toolResults = [structuredToolResult];
                      
                      const toolMessage = `✓ ${fnName.replace(/_/g, ' ')} completed successfully.`;
                      fullResponse += toolMessage;
                      
                      // Send tool result event with structured data
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                        text: toolMessage,
                        functionCall: functionCall.functionCall,
                        toolResult: structuredToolResult
                      })}\n\n`));
                    }
                    // Regular text response
                    const text = content.parts.map((part: any) => part.text || '').join('');
                    if (text) {
                      fullResponse += text;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                    }
                  }
                }
              }
            }
          }

          // If no text was accumulated from the streaming API, fall back to a non-streaming call
          if (!fullResponse.trim()) {
            try {
              console.warn('Gemini stream returned no text, falling back to generateContent');

              const fallbackResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    contents: [
                      ...history,
                      {
                        role: 'user',
                        parts: [{ text: message }]
                      }
                    ],
                    tools: [tools],
                    systemInstruction: {
                      parts: [{ text: systemInstruction }]
                    }
                  })
                }
              );

              if (fallbackResponse.ok) {
                const fallbackJson = await fallbackResponse.json();
                const fallbackText = fallbackJson.candidates?.[0]?.content?.parts
                  ?.map((part: any) => part.text || '')
                  .join('') || '';

                if (fallbackText.trim()) {
                  fullResponse = fallbackText;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: fallbackText, fallback: true })}\n\n`)
                  );
                }
              } else {
                const errText = await fallbackResponse.text();
                console.error('Gemini fallback generateContent error:', errText);
        fullResponse = 'I am connected but could not generate a response due to a backend issue.';
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ text: fullResponse, error: true, fallback: true })}\n\n`
          )
        );
              }
            } catch (fallbackError) {
              console.error('Gemini fallback error:', fallbackError);
      fullResponse = 'I am connected but could not generate a response due to a backend error.';
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ text: fullResponse, error: true, fallback: true })}\n\n`
        )
      );
            }
          }

          // Send done event
          controller.enqueue(encoder.encode('data: {"done":true}\n\n'));

          // Save complete message to DB
          await supabaseClient.from('chat_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullResponse,
            tool_calls: toolCalls.length > 0 ? toolCalls : null,
            tool_results: toolResults.length > 0 ? toolResults : null
          });

          // Update message count and trigger summary if needed
          const currentMessageCount = (conversation?.message_count || 0) + 2; // +2 for user and assistant
          await supabaseClient
            .from('conversations')
            .update({ 
              message_count: currentMessageCount,
              updated_at: new Date().toISOString()
            })
            .eq('id', conversationId);

          // Trigger summary generation if threshold reached (10+ messages and no recent summary)
          const hoursSinceLastSummary = conversation?.last_summary_at 
            ? (Date.now() - new Date(conversation.last_summary_at).getTime()) / (1000 * 60 * 60)
            : 999;
          
          if (currentMessageCount >= 10 && (!conversation?.last_summary_at || hoursSinceLastSummary > 1)) {
            console.log(`[Summary] Triggering generation for conversation ${conversationId} (${currentMessageCount} messages)`);
            // Fire and forget - don't block response
            supabaseClient.functions.invoke('generate-conversation-summary', {
              body: { conversationId }
            }).catch(err => console.error('[Summary] Generation failed:', err));
          }

          // Learn from successful interactions and generate suggestions
          let proactiveSuggestions: any[] = [];
          if (user?.id && toolResults.length > 0) {
            // Learn from each successful tool execution
            for (const result of toolResults) {
              // Only learn from successful tool calls
              if (result.response && !result.error) {
                const toolName = result.name;
                const toolParams = toolCalls.find(tc => tc.functionCall?.name === toolName)?.functionCall?.args;
                
                // Extract service from tool name
                let service = 'general';
                if (toolName.includes('graphic')) service = 'graphics';
                else if (toolName.includes('video')) service = 'video';
                else if (toolName.includes('content')) service = 'content';
                else if (toolName.includes('social') || toolName.includes('post')) service = 'social';
                else if (toolName.includes('email')) service = 'email';
                else if (toolName.includes('calendar') || toolName.includes('schedule')) service = 'calendar';
                
                await learnFromInteraction(supabaseClient, user.id, {
                  service,
                  params: toolParams || {},
                  success: true
                });

                // Generate proactive suggestions based on what just happened
                const actionSuggestions = generateProactiveSuggestions(
                  result,
                  memoryContext,
                  {
                    recentTools: toolCalls.map(tc => tc.functionCall?.name || ''),
                    conversationGoal: message
                  }
                );

                proactiveSuggestions.push(...actionSuggestions);
              }
            }

            // PHASE 1.2: Generate predictive suggestions based on conversation flow
            const updatedConversationContext = {
              recentMessages: [
                ...conversationContext.recentMessages,
                { role: 'user', content: message },
                { role: 'assistant', content: fullResponse }
              ],
              recentTools: [
                ...conversationContext.recentTools,
                ...toolCalls.map(tc => tc.functionCall?.name || '')
              ].slice(-10),
              conversationGoal: message,
              detectedIntent: detectedGoal.type
            };

            const predictiveSuggestions = generatePredictiveSuggestions(
              updatedConversationContext,
              memoryContext,
              detectedGoal
            );

            proactiveSuggestions.push(...predictiveSuggestions);

            console.log('[Memory] Learned from', toolResults.length, 'interactions');
            console.log('[Suggestions] Generated', proactiveSuggestions.length, 'total suggestions');
            
            // Remove duplicate suggestions and prioritize
            const uniqueSuggestions = Array.from(
              new Map(proactiveSuggestions.map(s => [s.id, s])).values()
            ).sort((a, b) => {
              const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
              const aPriority = priorityWeight[(a.priority as string) || 'low'];
              const bPriority = priorityWeight[(b.priority as string) || 'low'];
              
              if (aPriority !== bPriority) {
                return bPriority - aPriority;
              }
              return b.confidence - a.confidence;
            });

            // Send suggestions to client if any (top 3-4)
            if (uniqueSuggestions.length > 0) {
              const topSuggestions = uniqueSuggestions.slice(0, 4);
              console.log('[Suggestions] Sending top', topSuggestions.length, 'suggestions to client');
              
              // Add formatted suggestions to response
              const suggestionsText = formatSuggestionsForChat(topSuggestions);
              fullResponse += suggestionsText;
              
              // Send suggestions as separate event for UI rendering
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                text: suggestionsText,
                suggestions: topSuggestions.map(s => ({
                  id: s.id,
                  title: s.title,
                  description: s.description,
                  action: s.action,
                  params: s.params,
                  confidence: s.confidence,
                  reasoning: s.reasoning,
                  priority: s.priority
                }))
              })}\n\n`));
            }
          }

          // Increment usage counter (ignore errors in dev)
          try {
            await supabaseClient.functions.invoke('increment-usage', {
              body: {
                serviceType: 'chat',
                operationType: 'ai_message',
                creditsUsed: 1,
                metadata: { model: selectedModel, hasToolCalls: toolCalls.length > 0 }
              }
            });
          } catch (usageError) {
            console.warn('Increment usage failed, continuing anyway:', usageError);
          }

          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
