import { MoreVertical, Trash2, Archive, Download, Eraser, ArchiveRestore } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { useConversationActions } from '@/hooks/useConversationActions';

interface ConversationActionsMenuProps {
  conversationId: string;
  conversationTitle: string;
  isArchived?: boolean;
  onActionComplete?: () => void;
}

export function ConversationActionsMenu({ 
  conversationId, 
  conversationTitle,
  isArchived = false,
  onActionComplete 
}: ConversationActionsMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const { 
    deleteConversation, 
    archiveConversation, 
    exportConversation, 
    clearConversation,
    isLoading 
  } = useConversationActions();

  const handleDelete = async () => {
    await deleteConversation(conversationId);
    setDeleteDialogOpen(false);
    onActionComplete?.();
  };

  const handleArchive = async () => {
    await archiveConversation(conversationId, !isArchived);
    onActionComplete?.();
  };

  const handleExport = async () => {
    await exportConversation(conversationId);
  };

  const handleClear = async () => {
    await clearConversation(conversationId);
    setClearDialogOpen(false);
    onActionComplete?.();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
            disabled={isLoading}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right" className="w-56 z-[200]">
          <DropdownMenuItem onClick={handleArchive}>
            {isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Restore from Archive
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Conversation
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setClearDialogOpen(true)}>
            <Eraser className="h-4 w-4 mr-2" />
            Clear Messages
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{conversationTitle}" and all its messages. 
              This action cannot be undone.
              <br /><br />
              Consider exporting the conversation first if you want to keep a backup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Messages?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all messages in "{conversationTitle}" but keep the conversation itself. 
              You can continue chatting in this conversation afterwards.
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Messages
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}