// Workflow Planning & Task Decomposition Engine
// This module enables Brain to analyze complex requests, decompose them into steps,
// and create execution plans with agent coordination

export interface WorkflowStep {
  stepNumber: number;
  agent: 'research' | 'graphics' | 'video' | 'content' | 'social' | 'email' | 'calendar';
  action: string; // Tool name to call
  purpose: string; // Why this step is needed
  parameters: Record<string, any>; // Parameters for the tool
  dependsOn?: number[]; // Which previous steps this needs data from
  inputMapping?: Record<string, string>; // Map outputs from previous steps (e.g., {"imageId": "step2.result.id"})
  canRunInParallel: boolean;
}

export interface WorkflowPlan {
  id: string;
  originalPrompt: string;
  goal: string;
  researchRequired: boolean;
  steps: WorkflowStep[];
  estimatedDuration: number; // in seconds
  complexity: 'simple' | 'moderate' | 'complex';
}

/**
 * Detect if a user request requires a complex workflow
 */
export function detectWorkflowType(message: string): 'simple' | 'workflow' | 'research' {
  const messageLower = message.toLowerCase();
  
  // Research keywords - user wants analysis or strategy first
  const researchKeywords = [
    'research', 'analyze', 'strategy', 'best practices',
    'what works', 'trends', 'competitors', 'optimize',
    'recommend', 'suggest approach', 'what should i',
    'how to approach', 'advice on'
  ];
  
  // Workflow keywords - user wants multiple connected actions
  const workflowKeywords = [
    'and post', 'and publish', 'and send', 'and schedule',
    'create and', 'generate and', 'make and', 'build and',
    'then post', 'then send', 'then publish', 'then schedule',
    'plus', 'also', 'along with'
  ];
  
  if (researchKeywords.some(kw => messageLower.includes(kw))) {
    return 'research';
  }
  
  if (workflowKeywords.some(kw => messageLower.includes(kw))) {
    return 'workflow';
  }
  
  return 'simple';
}

/**
 * Map inputs from previous step results to current step parameters
 * Example: { "imageId": "step2.result.id" } -> { "imageId": "abc-123" }
 */
export function mapInputsFromPreviousSteps(
  parameters: Record<string, any>,
  inputMapping: Record<string, string> | undefined,
  previousResults: Record<number, any>
): Record<string, any> {
  if (!inputMapping) return parameters;
  
  const mappedParams = { ...parameters };
  
  for (const [paramKey, sourcePath] of Object.entries(inputMapping)) {
    // Parse source path like "step2.result.id" or "step1.insights"
    const match = sourcePath.match(/step(\d+)\.(.+)/);
    if (match) {
      const stepNumber = parseInt(match[1]);
      const path = match[2];
      
      const stepResult = previousResults[stepNumber];
      if (stepResult) {
        // Navigate nested path
        const value = path.split('.').reduce((obj, key) => obj?.[key], stepResult);
        if (value !== undefined) {
          mappedParams[paramKey] = value;
        }
      }
    }
  }
  
  return mappedParams;
}

/**
 * Calculate estimated duration based on workflow complexity
 */
export function estimateWorkflowDuration(steps: WorkflowStep[]): number {
  const stepDurations: Record<string, number> = {
    research: 15,
    graphics: 30,
    video: 90,
    content: 10,
    social: 5,
    email: 5,
    calendar: 3
  };
  
  let totalDuration = 0;
  
  // Calculate sequential execution time
  for (const step of steps) {
    totalDuration += stepDurations[step.agent] || 10;
  }
  
  // If some steps can run in parallel, reduce estimate
  const parallelSteps = steps.filter(s => s.canRunInParallel).length;
  if (parallelSteps > 1) {
    totalDuration *= 0.7; // 30% reduction for parallelization
  }
  
  return Math.round(totalDuration);
}

/**
 * Determine workflow complexity based on number of steps and dependencies
 */
export function assessWorkflowComplexity(steps: WorkflowStep[]): 'simple' | 'moderate' | 'complex' {
  const stepCount = steps.length;
  const hasDependencies = steps.some(s => s.dependsOn && s.dependsOn.length > 0);
  const hasResearch = steps.some(s => s.agent === 'research');
  
  if (stepCount <= 2 && !hasDependencies) {
    return 'simple';
  }
  
  if (stepCount <= 4 && !hasResearch) {
    return 'moderate';
  }
  
  return 'complex';
}

/**
 * Validate a workflow plan before execution
 */
export function validateWorkflowPlan(plan: WorkflowPlan): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check that steps are numbered sequentially
  const expectedNumbers = Array.from({ length: plan.steps.length }, (_, i) => i + 1);
  const actualNumbers = plan.steps.map(s => s.stepNumber).sort((a, b) => a - b);
  
  if (JSON.stringify(expectedNumbers) !== JSON.stringify(actualNumbers)) {
    errors.push('Steps must be numbered sequentially starting from 1');
  }
  
  // Check that dependencies reference valid steps
  for (const step of plan.steps) {
    if (step.dependsOn) {
      for (const depStep of step.dependsOn) {
        if (depStep >= step.stepNumber) {
          errors.push(`Step ${step.stepNumber} cannot depend on step ${depStep} (must be earlier)`);
        }
        if (!plan.steps.some(s => s.stepNumber === depStep)) {
          errors.push(`Step ${step.stepNumber} depends on non-existent step ${depStep}`);
        }
      }
    }
  }
  
  // Check that parallel steps don't have dependencies on each other
  const parallelSteps = plan.steps.filter(s => s.canRunInParallel);
  for (const step of parallelSteps) {
    if (step.dependsOn?.some(dep => parallelSteps.some(ps => ps.stepNumber === dep))) {
      errors.push(`Parallel step ${step.stepNumber} has dependency on another parallel step`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
