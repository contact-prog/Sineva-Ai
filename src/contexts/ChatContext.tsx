import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
  toolResults?: any[];
  suggestions?: CrossServiceSuggestion[] | ProactiveSuggestion[];
  createdAt: Date;
  isPinned?: boolean;
  reaction?: 'up' | 'down';
}

interface CrossServiceSuggestion {
  service: string;
  action: string;
  description: string;
  prompt: string;
  priority: 'high' | 'medium' | 'low';
}

interface ProactiveSuggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  params?: Record<string, any>;
  confidence: number;
  reasoning?: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  workflowState?: ServiceWorkflow | null;
}

/**
 * Universal Service Workflow State
 * Tracks the current active workflow for any service (graphics, video, content, etc.)
 */
export interface ServiceWorkflow {
  service: string; // 'graphics' | 'video' | 'content' | etc.
  stage: 'idle' | 'setup' | 'preview' | 'editing' | 'batch' | 'generating' | 'complete';
  config: {
    // Workflow step tracking
    step?: string; // 'platforms' | 'options' | etc.
    
    // Graphics-specific config
    platforms?: string[];
    contentTypes?: Record<string, string>;
    quality?: 'standard' | 'high' | 'fast'; // Added 'fast' for video generation
    includeLogo?: boolean;
    negativePrompt?: string;
    referenceImage?: string;
    
    // Video-specific config
    videoId?: string;
    status?: string;
    duration?: number;
    format?: string;
    style?: string;
    
    // Content-specific config (blog generation)
    contentType?: string;
    tone?: string;
    topic?: string; // Auto-extracted from user message
    
    // Universal fields
    prompt?: string;
    [key: string]: any; // Extensible for future services
  };
  preview?: {
    id: string;
    url: string;
    platform?: string;
    dimensions?: string;
    apiUsed?: string;
    metadata?: any;
  };
  results?: Array<{
    id: string;
    url: string;
    video_url?: string;
    thumbnail_url?: string;
    duration_seconds?: number;
    prompt?: string;
    platform?: string;
    formatName?: string;
    dimensions?: string;
    metadata?: any;
  }>;
  metadata?: any; // Service-specific metadata
}

interface ChatContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  streamingMessage: string;
  isStreaming: boolean;
  createConversation: () => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  isFloatingChatOpen: boolean;
  setIsFloatingChatOpen: (open: boolean) => void;
  currentService: string | null;
  setCurrentService: (service: string | null) => void;
  
  // Workflow state management
  activeWorkflow: ServiceWorkflow | null;
  setActiveWorkflow: (workflow: ServiceWorkflow | null) => void;
  updateWorkflowStage: (stage: ServiceWorkflow['stage']) => Promise<void>;
  updateWorkflowConfig: (config: Partial<ServiceWorkflow['config']>) => Promise<void>;
  updateWorkflowPreview: (preview: ServiceWorkflow['preview']) => Promise<void>;
  updateWorkflowResults: (results: ServiceWorkflow['results']) => Promise<void>;
  resetWorkflow: () => Promise<void>;
  startVideoGeneration: (options: {
    platforms: string[];
    duration: number;
    quality: 'fast' | 'standard';
    aspectRatio: '16:9' | '9:16';
    referenceImageUrl?: string;
  }) => Promise<void>;

  // Message management
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  regenerateResponse: (messageId: string) => Promise<void>;
  pinMessage: (messageId: string) => Promise<void>;
  reactToMessage: (messageId: string, reaction: 'up' | 'down') => Promise<void>;
  pinnedMessages: Message[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  const [currentService, setCurrentService] = useState<string | null>(null);
  const [activeWorkflow, setActiveWorkflowState] = useState<ServiceWorkflow | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (data && !error) {
      setConversations(data.map(c => ({
        id: c.id,
        title: c.title,
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at),
        workflowState: c.workflow_state ? (c.workflow_state as unknown as ServiceWorkflow) : null
      })));
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data && !error) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        toolCalls: m.tool_calls as any[] | undefined,
        toolResults: m.tool_results as any[] | undefined,
        createdAt: new Date(m.created_at)
      })));
    }
  };

  /**
   * Persist workflow state to database
   */
  const persistWorkflow = async (workflow: ServiceWorkflow | null) => {
    if (!currentConversation) return;

    const { error } = await supabase
      .from('conversations')
      .update({ 
        workflow_state: workflow as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentConversation.id);

    if (error) {
      console.error('Failed to persist workflow:', error);
    } else {
      // Update local conversation state
      setCurrentConversation(prev => 
        prev ? { ...prev, workflowState: workflow } : null
      );
      await loadConversations(); // Refresh list
    }
  };

  /**
   * Set active workflow and persist
   */
  const setActiveWorkflow = useCallback(async (workflow: ServiceWorkflow | null) => {
    setActiveWorkflowState(workflow);
    await persistWorkflow(workflow);
  }, [currentConversation]);

  /**
   * Update workflow stage
   */
  const updateWorkflowStage = useCallback(async (stage: ServiceWorkflow['stage']) => {
    if (!activeWorkflow) return;
    
    const updated = { ...activeWorkflow, stage };
    setActiveWorkflowState(updated);
    await persistWorkflow(updated);
  }, [activeWorkflow, currentConversation]);

  /**
   * Update workflow config (partial update)
   */
  const updateWorkflowConfig = useCallback(async (config: Partial<ServiceWorkflow['config']>) => {
    if (!activeWorkflow) return;
    
    const updated = { 
      ...activeWorkflow, 
      config: { ...activeWorkflow.config, ...config }
    };
    setActiveWorkflowState(updated);
    await persistWorkflow(updated);
  }, [activeWorkflow, currentConversation]);

  /**
   * Update workflow preview
   */
  const updateWorkflowPreview = useCallback(async (preview: ServiceWorkflow['preview']) => {
    if (!activeWorkflow) return;
    
    const updated = { ...activeWorkflow, preview };
    setActiveWorkflowState(updated);
    await persistWorkflow(updated);
  }, [activeWorkflow, currentConversation]);

  /**
   * Update workflow results
   */
  const updateWorkflowResults = useCallback(async (results: ServiceWorkflow['results']) => {
    if (!activeWorkflow) return;
    
    const updated = { ...activeWorkflow, results };
    setActiveWorkflowState(updated);
    await persistWorkflow(updated);
  }, [activeWorkflow, currentConversation]);

  /**
   * Reset workflow to idle state
   */
  const resetWorkflow = useCallback(async () => {
    setActiveWorkflowState(null);
    await persistWorkflow(null);
  }, [currentConversation]);

  /**
   * Edit a user message and regenerate response
   */
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!currentConversation) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('regenerate-response', {
        body: {
          conversationId: currentConversation.id,
          messageId,
          newUserMessage: newContent
        }
      });

      if (error) throw error;
      
      // Reload messages to show updated conversation
      await loadMessages(currentConversation.id);
    } catch (error) {
      console.error('Error editing message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentConversation]);

  /**
   * Delete a message
   */
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentConversation) return;

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId)
      .eq('conversation_id', currentConversation.id);

    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    }
  }, [currentConversation]);

  /**
   * Regenerate assistant response
   */
  const regenerateResponse = useCallback(async (messageId: string) => {
    if (!currentConversation) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('regenerate-response', {
        body: {
          conversationId: currentConversation.id,
          messageId
        }
      });

      if (error) throw error;

      // Reload messages
      await loadMessages(currentConversation.id);
    } catch (error) {
      console.error('Error regenerating response:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentConversation]);

  /**
   * Pin/unpin a message
   */
  const pinMessage = useCallback(async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const newPinnedState = !message.isPinned;

    // Update in database (store in metadata)
    const { error } = await supabase
      .from('chat_messages')
      .update({ 
        // Store pinned state in content (since we don't have a pinned column)
        // We'll use a local state approach instead
      })
      .eq('id', messageId);

    // Update local state
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, isPinned: newPinnedState } : m
    ));
  }, [messages]);

  /**
   * React to a message (thumbs up/down)
   */
  const reactToMessage = useCallback(async (messageId: string, reaction: 'up' | 'down') => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const newReaction = message.reaction === reaction ? undefined : reaction;

    // Update local state
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, reaction: newReaction } : m
    ));

    // Log reaction for learning (optional backend call)
    console.log(`Message ${messageId} reaction: ${newReaction || 'removed'}`);
  }, [messages]);

  // Compute pinned messages
  const pinnedMessages = messages.filter(m => m.isPinned);

  // Poll video status helper
  const pollVideoStatus = async (videoId: string): Promise<any> => {
    const maxAttempts = 120; // 10 minutes (5s intervals)
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('check-video-status', {
          body: { videoId }
        });

        if (error) throw error;

        console.log(`[Video Poll ${attempt + 1}/${maxAttempts}]`, data.status);

        if (data.status === 'completed') {
          return {
            success: true,
            videoUrl: data.videoUrl,
            thumbnailUrl: data.thumbnailUrl,
            cost: data.cost,
            generationTime: data.generationTime
          };
        }

        if (data.status === 'failed') {
          throw new Error(data.error || data.metadata?.error || 'Video generation failed');
        }

        // Wait 5s before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error: any) {
        console.error('[Video Poll Error]', error);
        throw error;
      }
    }

    throw new Error('Video generation timed out after 10 minutes');
  };

  const startVideoGeneration = useCallback(async (options: {
    platforms: string[];
    duration: number;
    quality: 'fast' | 'standard';
    aspectRatio: '16:9' | '9:16';
    referenceImageUrl?: string;
  }) => {
    if (!activeWorkflow || activeWorkflow.service !== 'video' || !activeWorkflow.config?.prompt) {
      console.error('No active video workflow or prompt');
      return;
    }

    const { platforms, duration, quality, aspectRatio, referenceImageUrl } = options;

    const baseConfig = {
      ...activeWorkflow.config,
      platforms,
      duration,
      quality,
      aspectRatio,
      referenceImageUrl,
      status: 'generating'
    };

    const generatingWorkflow: ServiceWorkflow = {
      ...activeWorkflow,
      stage: 'generating',
      config: baseConfig
    };

    setActiveWorkflowState(generatingWorkflow);
    await persistWorkflow(generatingWorkflow);

    try {
      const { data, error } = await supabase.functions.invoke('generate-video-simple', {
        body: {
          prompt: activeWorkflow.config.prompt,
          duration,
          aspectRatio,
          quality,
          platforms,
          referenceImageUrl
        }
      });

      if (error) throw error;

      const videoId = data?.videoId;
      if (!videoId) {
        throw new Error('No video ID returned from video generation');
      }

      const withIdWorkflow: ServiceWorkflow = {
        ...generatingWorkflow,
        config: { ...generatingWorkflow.config, videoId }
      };

      setActiveWorkflowState(withIdWorkflow);
      await persistWorkflow(withIdWorkflow);

      // Start polling in background
      pollVideoStatus(videoId)
        .then(async (result) => {
          console.log('[Video Complete]', result);

          const completedWorkflow: ServiceWorkflow = {
            service: 'video',
            stage: 'complete',
            config: {
              videoId,
              status: 'completed',
              prompt: activeWorkflow.config.prompt,
              platforms,
              duration
            },
            results: [{
              id: videoId,
              video_url: result.videoUrl,
              thumbnail_url: result.thumbnailUrl,
              url: result.videoUrl,
              prompt: activeWorkflow.config.prompt,
              duration_seconds: duration,
              metadata: { cost: result.cost, generationTime: result.generationTime }
            }]
          };

          setActiveWorkflowState(completedWorkflow);
          await persistWorkflow(completedWorkflow);

          const successMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `✅ Video generated successfully!\n\n**Cost:** $${result.cost?.toFixed(3)}\n**Generation Time:** ${result.generationTime}s\n\nYou can preview your video below.`,
            createdAt: new Date()
          };
          setMessages(prev => [...prev, successMsg]);
        })
        .catch(async (error) => {
          console.error('[Video Failed]', error);

          const failedWorkflow: ServiceWorkflow = {
            service: 'video',
            stage: 'complete',
            config: {
              videoId: activeWorkflow.config.videoId,
              status: 'failed',
              prompt: activeWorkflow.config.prompt
            },
            metadata: { error: error.message }
          };

          setActiveWorkflowState(failedWorkflow);
          await persistWorkflow(failedWorkflow);

          const errorMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `❌ Video generation failed: ${error.message}`,
            createdAt: new Date()
          };
          setMessages(prev => [...prev, errorMsg]);
        });
    } catch (error: any) {
      console.error('[startVideoGeneration] Error:', error);

      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Video generation failed: ${error.message}`,
        createdAt: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  }, [activeWorkflow, persistWorkflow]);
  const createConversation = useCallback(async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: 'New Conversation',
        workflow_state: null
      })
      .select()
      .single();

    if (error) throw error;

    const newConv: Conversation = {
      id: data.id,
      title: data.title,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      workflowState: null
    };

    setConversations(prev => [newConv, ...prev]);
    setCurrentConversation(newConv);
    setMessages([]);
    setActiveWorkflowState(null); // Clear workflow for new conversation

    return data.id;
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setCurrentConversation(conv);
      await loadMessages(id);
      
      // Restore workflow state from conversation
      setActiveWorkflowState(conv.workflowState || null);
      
      // Set current service based on workflow
      if (conv.workflowState) {
        setCurrentService(conv.workflowState.service);
      } else {
        setCurrentService(null);
      }
    }
  }, [conversations]);

  const sendMessage = useCallback(async (content: string) => {
    if (!currentConversation) {
      const newId = await createConversation();
      await sendMessageToConversation(newId, content);
    } else {
      await sendMessageToConversation(currentConversation.id, content);
    }
  }, [currentConversation, createConversation]);

  const sendMessageToConversation = async (conversationId: string, content: string) => {
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Save user message to DB
    await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content
    });

    // Track if we initialized a workflow with its own UI
    let workflowInitialized = false;

    // If user explicitly mentions video, initialize simple video workflow
    if (!activeWorkflow && /video/i.test(content)) {
      const videoWorkflow: ServiceWorkflow = {
        service: 'video',
        stage: 'setup',
        config: {
          prompt: content
        }
      };

      setActiveWorkflowState(videoWorkflow);
      await persistWorkflow(videoWorkflow);
      setCurrentService('video');
      workflowInitialized = true;
    }
    
    // If user explicitly mentions blog/article/content writing, initialize content workflow
    if (!activeWorkflow && /(blog|article|write|content)/i.test(content)) {
      // Extract topic from the user's message
      // Look for patterns like "blog about X", "write about X", "article on X", etc.
      let extractedTopic = '';
      
      const topicPatterns = [
        /(?:blog|article|write|content)(?:\s+(?:about|on|regarding|for))?\s+(.+?)(?:\.|$)/i,
        /(?:create|generate|make)(?:\s+a)?\s+(?:blog|article|post)(?:\s+(?:about|on|regarding|for))?\s+(.+?)(?:\.|$)/i,
        /topic:\s*(.+?)(?:\.|$)/i
      ];
      
      for (const pattern of topicPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          extractedTopic = match[1].trim();
          // Clean up common filler words at the start
          extractedTopic = extractedTopic.replace(/^(a|an|the|some)\s+/i, '');
          break;
        }
      }
      
      // If no specific pattern matched, use the whole message as topic (fallback)
      if (!extractedTopic) {
        extractedTopic = content.replace(/(blog|article|write|content|create|generate|make|about|on)/gi, '').trim();
      }
      
      const contentWorkflow: ServiceWorkflow = {
        service: 'content',
        stage: 'setup',
        config: {
          prompt: content,
          topic: extractedTopic || '' // Pre-fill topic if extracted
        }
      };

      setActiveWorkflowState(contentWorkflow);
      await persistWorkflow(contentWorkflow);
      setCurrentService('content');
      workflowInitialized = true;
    }

    // If a workflow was initialized, just show a simple acknowledgment instead of calling chat orchestrator
    if (workflowInitialized) {
      const acknowledgmentMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I\'ve prepared the form below. Fill in the details and click "Generate" when ready.',
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, acknowledgmentMessage]);
      
      await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: acknowledgmentMessage.content
      });
      
      setIsLoading(false);
      setIsStreaming(false);
      return;
    }

    try {
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call streaming endpoint
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-orchestrator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({
            conversationId,
            message: content,
            context: currentService
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Process SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let toolCalls: any[] = [];
      let toolResults: any[] = [];

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.text) {
                fullResponse += data.text;
                setStreamingMessage(fullResponse);
              }
              
              if (data.functionCall) {
                toolCalls.push(data.functionCall);
              }
              
              if (data.toolResult) {
                toolResults.push(data.toolResult);
              }

              // Handle proactive suggestions from edge function
              if (data.suggestions) {
                // Store suggestions temporarily to add to final message
                (window as any).__pendingSuggestions = data.suggestions;
              }
              
              if (data.done) {
                // Streaming complete - add final message
                const assistantMessage: Message = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: fullResponse,
                  toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                  toolResults: toolResults.length > 0 ? toolResults : undefined,
                  suggestions: (window as any).__pendingSuggestions || undefined,
                  createdAt: new Date()
                };
                
                // Clear pending suggestions
                delete (window as any).__pendingSuggestions;
                
                setMessages(prev => [...prev, assistantMessage]);
                setStreamingMessage('');
                setIsStreaming(false);

                // ========== GENERATE CROSS-SERVICE SUGGESTIONS ==========
                if (toolResults.length > 0) {
                  // Generate suggestions based on tool execution
                  const lastToolResult = toolResults[toolResults.length - 1];
                  
                  try {
                    // Get fresh session for auth
                    const { data: { session: freshSession } } = await supabase.auth.getSession();
                    
                    if (!freshSession?.access_token) {
                      console.error('No session available for suggestions API');
                      return;
                    }
                    
                    const suggestionsResponse = await fetch(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cross-service-suggestions`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${freshSession.access_token}`
                        },
                        body: JSON.stringify({
                          toolName: lastToolResult.name,
                          toolResult: lastToolResult.response,
                          userContext: currentService
                        })
                      }
                    );

                    if (suggestionsResponse.ok) {
                      const { suggestions } = await suggestionsResponse.json();
                      
                      if (suggestions && suggestions.length > 0) {
                        // Update the assistant message with suggestions
                        setMessages(prev => {
                          const updated = [...prev];
                          const lastMsg = updated[updated.length - 1];
                          if (lastMsg && lastMsg.role === 'assistant') {
                            lastMsg.suggestions = suggestions;
                          }
                          return updated;
                        });
                      }
                    }
                  } catch (error) {
                    console.error('Failed to generate suggestions:', error);
                    // Don't block the main flow if suggestions fail
                  }
                }

                // ========== UPDATE WORKFLOW STATE BASED ON TOOL RESULTS ==========
                if (toolResults.length > 0) {
                  for (const toolResult of toolResults) {
                    const toolName = toolResult.name;
                    const response = toolResult.response;

                    // Graphics workflow updates
                    if (toolName === 'generate_graphic_preview' && response?.preview) {
                      const newWorkflow: ServiceWorkflow = {
                        service: 'graphics',
                        stage: 'preview',
                        config: {
                          prompt: response.preview.prompt,
                          platforms: response.preview.platforms || [],
                          quality: response.preview.quality,
                          includeLogo: response.preview.logo_included
                        },
                        preview: {
                          id: response.preview.id,
                          url: response.preview.image_url,
                          platform: response.preview.platform,
                          dimensions: response.preview.dimensions,
                          apiUsed: response.preview.model_used,
                          metadata: response.preview
                        }
                      };
                      setActiveWorkflowState(newWorkflow);
                      await persistWorkflow(newWorkflow);
                    }

                    if (toolName === 'edit_graphic' && response?.editedImageUrl) {
                      if (activeWorkflow?.service === 'graphics') {
                        const updated: ServiceWorkflow = {
                          ...activeWorkflow,
                          stage: 'editing',
                          preview: {
                            ...(activeWorkflow.preview || {}),
                            id: response.generationId || activeWorkflow.preview?.id || '',
                            url: response.editedImageUrl,
                            metadata: response
                          }
                        };
                        setActiveWorkflowState(updated);
                        await persistWorkflow(updated);
                      }
                    }

                    if (toolName === 'approve_and_generate_batch' && response?.generations) {
                      if (activeWorkflow?.service === 'graphics') {
                        const updated: ServiceWorkflow = {
                          ...activeWorkflow,
                          stage: 'batch',
                          results: response.generations.map((gen: any) => ({
                            id: gen.id,
                            url: gen.image_url,
                            platform: gen.platform,
                            formatName: gen.content_type,
                            dimensions: gen.dimensions,
                            metadata: gen
                          }))
                        };
                        setActiveWorkflowState(updated);
                        await persistWorkflow(updated);
                      }
                    }
                    
                    // Content/Blog workflow updates
                    if (toolName === 'generate_content' && response?.content) {
                      const contentWorkflow: ServiceWorkflow = {
                        service: 'content',
                        stage: 'complete',
                        config: {
                          contentType: response.contentType || 'blog'
                        },
                        metadata: {
                          content: response.content,
                          topic: response.topic,
                          contentType: response.contentType,
                          metaDescription: response.metaDescription,
                          seoKeywords: response.seoKeywords,
                          readabilityScore: response.readabilityScore
                        }
                      };
                      
                      setActiveWorkflowState(contentWorkflow);
                      await persistWorkflow(contentWorkflow);
                      setCurrentService('content');
                    }
                  }
                }
                // ========== END WORKFLOW STATE UPDATES ==========

                // Check for video generation and start polling
                const videoGenTool = toolResults.find((result: any) => 
                  result.name === 'generate_simple_video'
                );
                
                if (videoGenTool?.response?.videoId) {
                  const videoId = videoGenTool.response.videoId;
                  
                  // Set initial workflow state
                  const initialWorkflow: ServiceWorkflow = {
                    service: 'video',
                    stage: 'generating',
                    config: {
                      videoId,
                      status: 'generating',
                      prompt: content
                    }
                  };
                  setActiveWorkflowState(initialWorkflow);
                  await persistWorkflow(initialWorkflow);

                  // Start polling in background
                  pollVideoStatus(videoId)
                    .then(async (result) => {
                      console.log('[Video Complete]', result);
                      
                      // Update workflow to complete state
                      const completedWorkflow: ServiceWorkflow = {
                        service: 'video',
                        stage: 'complete',
                        config: {
                          videoId,
                          status: 'completed',
                          prompt: content,
                          platforms: initialWorkflow.config.platforms,
                          duration: initialWorkflow.config.duration
                        },
                        results: [{
                          id: videoId,
                          video_url: result.videoUrl,
                          thumbnail_url: result.thumbnailUrl,
                          url: result.videoUrl,
                          prompt: content,
                          duration_seconds: initialWorkflow.config.duration || 6,
                          metadata: { cost: result.cost, generationTime: result.generationTime }
                        }]
                      };
                      setActiveWorkflowState(completedWorkflow);
                      await persistWorkflow(completedWorkflow);
                      
                      // Add success message to chat
                      const successMsg: Message = {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: `✅ Video generated successfully!\n\n**Cost:** $${result.cost?.toFixed(3)}\n**Generation Time:** ${result.generationTime}s\n\nYou can preview your video below.`,
                        createdAt: new Date()
                      };
                      setMessages(prev => [...prev, successMsg]);
                    })
                    .catch(async (error) => {
                      console.error('[Video Failed]', error);
                      
                      // Update workflow to failed state
                      const failedWorkflow: ServiceWorkflow = {
                        service: 'video',
                        stage: 'complete',
                        config: {
                          videoId,
                          status: 'failed',
                          prompt: content
                        },
                        metadata: { error: error.message }
                      };
                      setActiveWorkflowState(failedWorkflow);
                      await persistWorkflow(failedWorkflow);
                      
                      // Add error message to chat
                      const errorMsg: Message = {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: `❌ Video generation failed: ${error.message}`,
                        createdAt: new Date()
                      };
                      setMessages(prev => [...prev, errorMsg]);
                    });
                }
              }
            } catch (e) {
              // Skip invalid JSON
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }

      // Update conversation title if it's the first message
      if (messages.length === 0) {
        const title = content.slice(0, 50);
        await supabase
          .from('conversations')
          .update({ title })
          .eq('id', conversationId);
        
        setCurrentConversation(prev => prev ? { ...prev, title } : null);
        await loadConversations();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setIsStreaming(false);
      setStreamingMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversation,
        messages,
        isLoading,
        streamingMessage,
        isStreaming,
        createConversation,
        selectConversation,
        sendMessage,
        isFloatingChatOpen,
        setIsFloatingChatOpen,
        currentService,
        setCurrentService,
        activeWorkflow,
        setActiveWorkflow,
        updateWorkflowStage,
        updateWorkflowConfig,
        updateWorkflowPreview,
        updateWorkflowResults,
        resetWorkflow,
        startVideoGeneration,
        editMessage,
        deleteMessage,
        regenerateResponse,
        pinMessage,
        reactToMessage,
        pinnedMessages
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
