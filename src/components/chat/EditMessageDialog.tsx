import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface EditMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalContent: string;
  onSave: (newContent: string) => void;
  isLoading?: boolean;
}

export function EditMessageDialog({
  open,
  onOpenChange,
  originalContent,
  onSave,
  isLoading,
}: EditMessageDialogProps) {
  const [editedContent, setEditedContent] = useState(originalContent);

  const handleSave = () => {
    if (editedContent.trim()) {
      onSave(editedContent.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
          <DialogDescription>
            Edit your message and regenerate the AI response
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[150px] resize-none"
            disabled={isLoading}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!editedContent.trim() || isLoading}
          >
            {isLoading ? "Saving..." : "Save & Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
