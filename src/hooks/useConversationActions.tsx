import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface ConversationAction {
  deleteConversation: (conversationId: string) => Promise<void>;
  archiveConversation: (conversationId: string, archive: boolean) => Promise<void>;
  exportConversation: (conversationId: string) => Promise<void>;
  clearConversation: (conversationId: string) => Promise<void>;
  bulkDelete: (conversationIds: string[]) => Promise<void>;
  bulkArchive: (conversationIds: string[], archive: boolean) => Promise<void>;
  isLoading: boolean;
}

export function useConversationActions(): ConversationAction {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidateConversations = () => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  };

  const deleteConversation = async (conversationId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: 'Conversation deleted',
        description: 'The conversation and all messages have been permanently deleted.',
      });
      
      invalidateConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const archiveConversation = async (conversationId: string, archive: boolean) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ archived: archive })
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: archive ? 'Conversation archived' : 'Conversation restored',
        description: archive 
          ? 'The conversation has been archived and can be restored later.' 
          : 'The conversation has been restored to your active chats.',
      });
      
      invalidateConversations();
    } catch (error) {
      console.error('Error archiving conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update conversation',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const exportConversation = async (conversationId: string) => {
    setIsLoading(true);
    try {
      // Fetch conversation details
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      // Fetch all messages
      const { data: messages, error: msgError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      // Create export data
      const exportData = {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
        },
        messages: messages?.map(msg => ({
          role: msg.role,
          content: msg.content,
          created_at: msg.created_at,
          tool_calls: msg.tool_calls,
          tool_results: msg.tool_results,
        })),
        exported_at: new Date().toISOString(),
      };

      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversation-${conversation.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Update last_exported_at timestamp
      await supabase
        .from('conversations')
        .update({ last_exported_at: new Date().toISOString() })
        .eq('id', conversationId);

      toast({
        title: 'Conversation exported',
        description: 'Your conversation has been downloaded as a JSON file.',
      });
    } catch (error) {
      console.error('Error exporting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to export conversation',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = async (conversationId: string) => {
    setIsLoading(true);
    try {
      // Delete all messages but keep the conversation
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (error) throw error;

      toast({
        title: 'Conversation cleared',
        description: 'All messages have been deleted but the conversation remains.',
      });
      
      invalidateConversations();
    } catch (error) {
      console.error('Error clearing conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear conversation',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const bulkDelete = async (conversationIds: string[]) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .in('id', conversationIds);

      if (error) throw error;

      toast({
        title: 'Conversations deleted',
        description: `${conversationIds.length} conversations have been permanently deleted.`,
      });
      
      invalidateConversations();
    } catch (error) {
      console.error('Error bulk deleting conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversations',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const bulkArchive = async (conversationIds: string[], archive: boolean) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ archived: archive })
        .in('id', conversationIds);

      if (error) throw error;

      toast({
        title: archive ? 'Conversations archived' : 'Conversations restored',
        description: `${conversationIds.length} conversations have been ${archive ? 'archived' : 'restored'}.`,
      });
      
      invalidateConversations();
    } catch (error) {
      console.error('Error bulk archiving conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to update conversations',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    deleteConversation,
    archiveConversation,
    exportConversation,
    clearConversation,
    bulkDelete,
    bulkArchive,
    isLoading,
  };
}
