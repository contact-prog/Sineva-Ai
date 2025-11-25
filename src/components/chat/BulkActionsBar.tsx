import { Trash2, Archive, ArchiveRestore, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConversationActions } from '@/hooks/useConversationActions';
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

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onActionComplete?: () => void;
  showArchive?: boolean;
}

export function BulkActionsBar({ 
  selectedIds, 
  onClearSelection, 
  onActionComplete,
  showArchive = false 
}: BulkActionsBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { bulkDelete, bulkArchive, isLoading } = useConversationActions();

  const handleBulkDelete = async () => {
    await bulkDelete(selectedIds);
    setDeleteDialogOpen(false);
    onClearSelection();
    onActionComplete?.();
  };

  const handleBulkArchive = async (archive: boolean) => {
    await bulkArchive(selectedIds, archive);
    onClearSelection();
    onActionComplete?.();
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background border border-border rounded-lg shadow-lg p-4">
        <span className="text-sm font-medium">
          {selectedIds.length} selected
        </span>
        
        <div className="flex items-center gap-2 ml-4">
          {showArchive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkArchive(false)}
              disabled={isLoading}
            >
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Restore
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkArchive(true)}
              disabled={isLoading}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          )}
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          className="ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Conversations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.length} conversations and all their messages. 
              This action cannot be undone.
              <br /><br />
              Consider archiving instead if you might need these conversations later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedIds.length} Conversations
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}