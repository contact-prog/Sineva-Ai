import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ConversationActionsMenu } from './ConversationActionsMenu';
import { BulkActionsBar } from './BulkActionsBar';

interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onRefresh?: () => void;
}

export function ConversationList({
  conversations,
  currentConversationId,
  onSelectConversation,
  onRefresh,
}: ConversationListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectionMode(false);
  };

  const truncateTitle = (title: string) =>
    title.length > 16 ? `${title.slice(0, 16)}…` : title;

  const renderConversation = (conversation: Conversation) => (
    <Card
      key={conversation.id}
      className={`w-full p-3 cursor-pointer transition-all ${
        currentConversationId === conversation.id 
          ? 'border-primary bg-primary/10 shadow-sm' 
          : 'hover:bg-muted/50 border-transparent'
      }`}
    >
      <div className="flex items-start gap-3 w-full overflow-hidden">
        {selectionMode && (
          <Checkbox
            checked={selectedIds.includes(conversation.id)}
            onCheckedChange={() => toggleSelection(conversation.id)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
        )}

        <div 
          className="flex-1 min-w-0 overflow-hidden"
          onClick={() => !selectionMode && onSelectConversation(conversation.id)}
        >
          <div className="flex items-center gap-2 mb-1 min-w-0 overflow-hidden">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <h3 className="text-sm font-medium truncate min-w-0">
              {truncateTitle(conversation.title)}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {new Date(conversation.updatedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex-shrink-0 ml-auto">
          <ConversationActionsMenu
            conversationId={conversation.id}
            conversationTitle={conversation.title}
            isArchived={false}
            onActionComplete={() => {
              clearSelection();
              onRefresh?.();
            }}
          />
        </div>
      </div>
    </Card>
  );

  return (
    <>
      <div className="space-y-3 relative">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Conversations</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) clearSelection();
            }}
          >
            {selectionMode ? 'Cancel' : 'Select'}
          </Button>
        </div>

        <div className="space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map(conv => renderConversation(conv))
          )}
        </div>
      </div>

      <BulkActionsBar
        selectedIds={selectedIds}
        onClearSelection={clearSelection}
        onActionComplete={onRefresh}
        showArchive={false}
      />
    </>
  );
}
