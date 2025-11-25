import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Paperclip, Mic, CheckCircle2, X, Command } from 'lucide-react';
import { WelcomeScreen } from '@/components/chat/WelcomeScreen';
import { SuggestionChips } from '@/components/chat/SuggestionChips';
import { FileUploadZone } from '@/components/chat/FileUploadZone';
import { MessageActions } from '@/components/chat/MessageActions';
import { EditMessageDialog } from '@/components/chat/EditMessageDialog';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';
import { CommandPalette } from '@/components/chat/CommandPalette';
import { ContextualActions } from '@/components/chat/ContextualActions';
import { IntelligentQuickActions } from '@/components/chat/IntelligentQuickActions';
import { ProgressIndicator, useProgressSteps } from '@/components/chat/ProgressIndicator';
import ServiceResultRenderer from '@/components/chat/ServiceResultRenderer';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UploadedFile {
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'document' | 'other';
}

// Format tool names into user-friendly labels
const formatToolName = (toolName: string): string => {
  const toolMap: Record<string, string> = {
    'update_brand_kit': 'Updating Brand Kit',
    'generate_graphic_preview': 'Generating Graphic',
    'edit_graphic': 'Editing Graphic',
    'approve_and_generate_batch': 'Creating Graphics',
    'generate_content': 'Writing Content',
    'generate_video_story': 'Creating Video',
    'schedule_social_post': 'Scheduling Post',
    'send_email': 'Sending Email',
    'get_social_accounts': 'Checking Accounts',
    'generate_platform_suite': 'Creating Multi-Platform Content',
  };
  
  return toolMap[toolName] || toolName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const Chat = () => {
  const {
    messages,
    isLoading: loading,
    streamingMessage,
    isStreaming: streaming,
    sendMessage,
    setCurrentService,
    editMessage,
    deleteMessage,
    regenerateResponse,
    pinMessage,
    reactToMessage,
    activeWorkflow,
  } = useChat();

  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string } | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCurrentService(null);
  }, [setCurrentService]);

  // Command palette keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // Store message and clear input IMMEDIATELY (optimistic UI)
    const messageToSend = input.trim();
    setInput('');
    
    // Reset textarea height immediately
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Show immediate feedback
    setSendingStatus('Understanding your request...');

    try {
      await sendMessage(messageToSend);
      setSendingStatus('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setSendingStatus('');
      // On error, restore the input so user doesn't lose it
      setInput(messageToSend);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const handleFileUpload = () => {
    setShowFileUpload(!showFileUpload);
  };

  const handleFilesSelected = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditMessage = async (newContent: string) => {
    if (!editingMessage) return;
    
    await editMessage(editingMessage.id, newContent);
    setEditingMessage(null);
    toast.success('Message edited and response regenerated');
  };

  const handleDeleteMessage = async () => {
    if (!deletingMessage) return;
    
    await deleteMessage(deletingMessage);
    setDeletingMessage(null);
    toast.success('Message deleted');
  };

  const handleRegenerateResponse = async (messageId: string) => {
    await regenerateResponse(messageId);
    toast.success('Regenerating response...');
  };

  const handlePinMessage = async (messageId: string) => {
    await pinMessage(messageId);
    const message = messages.find(m => m.id === messageId);
    toast.success(message?.isPinned ? 'Message unpinned' : 'Message pinned');
  };

  const handleReactToMessage = async (messageId: string, reaction: 'up' | 'down') => {
    await reactToMessage(messageId, reaction);
  };

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    toast.info(isRecording ? 'Recording stopped' : 'Recording started');
  };

  const handleCommandSelect = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const hasMessages = messages.length > 0 || streaming;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Main Chat Area - Full Height Layout */}
      <div className="flex-1 flex flex-col">
        {/* Minimal Top Bar */}
        <div className="w-full border-b px-4 py-3 flex items-center backdrop-blur-sm bg-background/95 flex-shrink-0">
          <SidebarTrigger />
        </div>
        
        {/* Messages Area - Conditionally render layout */}
        {!hasMessages ? (
          /* Welcome Screen - Centered in full viewport */
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <WelcomeScreen onActionClick={handleQuickAction} />
          </div>
        ) : (
          /* Messages - Scrollable */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={cn(
                    "flex animate-fade-in group",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div 
                    className={cn(
                      "max-w-[85%] rounded-3xl px-5 py-3.5 shadow-sm relative",
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-card border border-border/50'
                    )}
                  >
                    {/* Message Actions */}
                    <div className="absolute -top-2 right-3">
                      <MessageActions
                        messageId={message.id}
                        role={message.role === 'system' ? 'assistant' : message.role}
                        content={message.content}
                        isPinned={message.isPinned}
                        onEdit={message.role === 'user' ? () => setEditingMessage({ id: message.id, content: message.content }) : undefined}
                        onRegenerate={message.role === 'assistant' ? () => handleRegenerateResponse(message.id) : undefined}
                        onDelete={() => setDeletingMessage(message.id)}
                        onPin={() => handlePinMessage(message.id)}
                        onReact={message.role === 'assistant' ? (reaction) => handleReactToMessage(message.id, reaction) : undefined}
                      />
                    </div>

                    {message.role === 'assistant' && message.toolCalls && (
                      <div className="mb-3 space-y-1.5">
                        {message.toolCalls.map((toolCall, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            <span className="text-muted-foreground">
                              {formatToolName(toolCall.name || toolCall.function?.name)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {message.content && (
                      <MarkdownRenderer content={message.content} />
                    )}

                    {message.toolResults && message.toolResults.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {message.toolResults.map((result, idx) => (
                          <div key={idx} className="p-3 bg-muted/30 rounded-2xl">
                            {result.response?.preview && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Preview Generated:</p>
                                <img 
                                  src={result.response.preview.image_url} 
                                  alt="Generated preview"
                                  className="rounded-xl max-w-full h-auto"
                                />
                              </div>
                            )}
                            {result.response?.generations && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Generated {result.response.generations.length} graphics:</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {result.response.generations.map((gen: any, i: number) => (
                                    <img 
                                      key={i}
                                      src={gen.image_url} 
                                      alt={`Generated ${gen.platform}`}
                                      className="rounded-xl w-full h-auto"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Proactive Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <SuggestionChips
                        suggestions={message.suggestions as any}
                        onSelectSuggestion={(suggestion) => {
                          // Build prompt from suggestion
                          const prompt = suggestion.params?.prompt || 
                            `${suggestion.title}: ${suggestion.description}`;
                          setInput(prompt);
                          textareaRef.current?.focus();
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}

              {/* Enhanced Progress Indicator */}
              {(loading || sendingStatus) && (() => {
                const lastMessage = messages[messages.length - 1];
                const steps = useProgressSteps(
                  lastMessage?.toolCalls || [], 
                  loading || !!sendingStatus
                );
                
                if (steps && steps.length > 0) {
                  return (
                    <div className="flex justify-start animate-fade-in">
                      <ProgressIndicator steps={steps} className="max-w-md" />
                    </div>
                  );
                }
                
                return (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-card border border-border/50 rounded-3xl px-5 py-3.5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{sendingStatus || 'Processing your request...'}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Streaming message with markdown */}
              {streaming && streamingMessage && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-card border border-border/50 rounded-3xl px-5 py-3.5 shadow-sm max-w-[85%]">
                    <MarkdownRenderer content={streamingMessage} />
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Typing...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Service Result Renderer - for video/graphics workflows */}
              {activeWorkflow && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[85%] w-full">
                    <ServiceResultRenderer workflow={activeWorkflow} />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
        
        {/* Input Area - Fixed at Bottom, Gemini/Perplexity Style */}
        <div className="w-full border-t backdrop-blur-sm bg-background/95 flex-shrink-0">
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
            {/* Intelligent Quick Actions - Above Input */}
            {hasMessages && (
              <IntelligentQuickActions
                messages={messages}
                onActionClick={handleQuickAction}
              />
            )}
            {/* File Upload Zone */}
            {showFileUpload && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <FileUploadZone
                  onFilesSelected={handleFilesSelected}
                  uploadedFiles={uploadedFiles}
                  onRemoveFile={handleRemoveFile}
                  compact={false}
                />
              </div>
            )}

            {/* Attached Files Display (when not showing full upload zone) */}
            {!showFileUpload && uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2">
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg text-sm group"
                  >
                    {file.preview ? (
                      <img src={file.preview} alt="" className="w-6 h-6 rounded object-cover" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                    <span className="truncate max-w-[150px]">{file.file.name}</span>
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="relative flex items-end gap-2 bg-card border border-border rounded-3xl p-2 shadow-lg hover:shadow-xl transition-all duration-300 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 focus-within:shadow-2xl">
              {/* Command Palette Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCommandPaletteOpen(true)}
                className="flex-shrink-0 h-10 w-10 rounded-full hover:bg-muted/80"
                title="Open command palette (⌘K)"
              >
                <Command className="h-5 w-5" />
              </Button>

              {/* File Upload Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFileUpload}
                className={cn(
                  "flex-shrink-0 h-10 w-10 rounded-full hover:bg-muted/80",
                  (showFileUpload || uploadedFiles.length > 0) && "text-primary bg-primary/10"
                )}
                title="Attach files"
              >
                <Paperclip className="h-5 w-5" />
              </Button>

              {/* Text Input */}
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask me anything about your marketing needs..."
                disabled={loading || streaming}
                className={cn(
                  "flex-1 min-h-[40px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2.5 text-sm placeholder:text-muted-foreground/60 scrollbar-hide transition-opacity duration-200",
                  (loading || streaming) && "opacity-50 cursor-not-allowed"
                )}
                rows={1}
              />

              {/* Voice Record Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVoiceRecord}
                className={cn(
                  "flex-shrink-0 h-10 w-10 rounded-full hover:bg-muted/80 transition-colors",
                  isRecording && "text-red-500 bg-red-50 dark:bg-red-950/20"
                )}
                title="Voice input"
              >
                <Mic className="h-5 w-5" />
              </Button>

              {/* Send Button */}
              <Button 
                onClick={handleSend} 
                disabled={loading || streaming || !input.trim()}
                size="icon"
                className="flex-shrink-0 h-10 w-10 rounded-full disabled:opacity-50 transition-all duration-200 active:scale-95 hover:shadow-lg"
              >
                {loading || streaming ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            
            {/* Footer Text */}
            <p className="text-xs text-center text-muted-foreground/60 mt-3">
              Sineva Brain can make mistakes. Check important info.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Message Dialog */}
      <EditMessageDialog
        open={!!editingMessage}
        onOpenChange={(open) => !open && setEditingMessage(null)}
        originalContent={editingMessage?.content || ''}
        onSave={handleEditMessage}
        isLoading={loading}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingMessage} onOpenChange={(open) => !open && setDeletingMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onCommandSelect={handleCommandSelect}
      />
    </div>
  );
};

export default Chat;
