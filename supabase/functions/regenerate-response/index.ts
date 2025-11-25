import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, messageId, newUserMessage } = await req.json();

    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!user) {
      throw new Error('Unauthorized');
    }

    // If editing user message, update it
    if (messageId && newUserMessage) {
      const { error: updateError } = await supabaseClient
        .from('chat_messages')
        .update({ content: newUserMessage })
        .eq('id', messageId)
        .eq('conversation_id', conversationId);

      if (updateError) throw updateError;
    }

    // Delete assistant response that follows this message
    const { data: allMessages } = await supabaseClient
      .from('chat_messages')
      .select('id, role, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (allMessages) {
      const messageIndex = allMessages.findIndex(m => m.id === messageId);
      if (messageIndex >= 0 && messageIndex < allMessages.length - 1) {
        const nextMessage = allMessages[messageIndex + 1];
        if (nextMessage.role === 'assistant') {
          await supabaseClient
            .from('chat_messages')
            .delete()
            .eq('id', nextMessage.id);
        }
      }
    }

    // Call chat orchestrator to regenerate response
    const { data: chatData, error: chatError } = await supabaseClient.functions.invoke(
      'chat-orchestrator',
      {
        body: {
          conversationId,
          message: newUserMessage || messageId,
          context: { regenerate: true }
        }
      }
    );

    if (chatError) throw chatError;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in regenerate-response:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
