import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Wand2, Send, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditHistory {
  instruction: string;
  timestamp: Date;
}

interface ContentEditorProps {
  content: string;
  contentType: string;
  onContentUpdate: (newContent: string) => void;
}

export function ContentEditor({ content, contentType, onContentUpdate }: ContentEditorProps) {
  const [editInstruction, setEditInstruction] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);

  const quickEdits = [
    'Make it shorter',
    'Make it more casual',
    'Add more details',
    'Improve clarity',
    'Add statistics',
    'Make it more engaging'
  ];

  const handleEdit = async (instruction: string) => {
    if (!instruction.trim()) {
      toast.error('Please enter an edit instruction');
      return;
    }

    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke('edit-content', {
        body: {
          originalContent: content,
          editInstruction: instruction,
          contentType
        }
      });

      if (error) throw error;

      if (data?.editedContent) {
        onContentUpdate(data.editedContent);
        setEditHistory([...editHistory, { 
          instruction, 
          timestamp: new Date() 
        }]);
        setEditInstruction('');
        toast.success('Content edited successfully!');
      }
    } catch (error) {
      console.error('Error editing content:', error);
      toast.error('Failed to edit content');
    } finally {
      setIsEditing(false);
    }
  };

  const handleQuickEdit = (instruction: string) => {
    handleEdit(instruction);
  };

  const handleCustomEdit = () => {
    handleEdit(editInstruction);
  };

  return (
    <Card className="p-4 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <Wand2 className="w-5 h-5 text-primary" />
        <h4 className="font-semibold">AI Content Editor</h4>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Tell me how to improve this content using natural language
      </p>

      {/* Quick Edit Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickEdits.map((edit) => (
          <Button
            key={edit}
            variant="secondary"
            size="sm"
            onClick={() => handleQuickEdit(edit)}
            disabled={isEditing}
          >
            {edit}
          </Button>
        ))}
      </div>

      {/* Custom Edit Input */}
      <div className="flex gap-2 mb-4">
        <Input
          value={editInstruction}
          onChange={(e) => setEditInstruction(e.target.value)}
          placeholder="e.g., 'Add more examples' or 'Make the tone more professional'"
          onKeyPress={(e) => e.key === 'Enter' && !isEditing && handleCustomEdit()}
          disabled={isEditing}
        />
        <Button
          onClick={handleCustomEdit}
          disabled={isEditing || !editInstruction.trim()}
        >
          {isEditing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Edit History */}
      {editHistory.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h5 className="text-sm font-semibold mb-2">Edit History</h5>
          <div className="space-y-2">
            {editHistory.slice(-3).reverse().map((edit, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-xs">
                  {edit.timestamp.toLocaleTimeString()}
                </Badge>
                <span className="text-muted-foreground">{edit.instruction}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
