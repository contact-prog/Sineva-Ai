import { Copy, Edit, RefreshCw, Trash2, Pin, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { toast } from "sonner";

interface MessageActionsProps {
  messageId: string;
  role: "user" | "assistant";
  content: string;
  isPinned?: boolean;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onReact?: (reaction: "up" | "down") => void;
}

export function MessageActions({
  messageId,
  role,
  content,
  isPinned,
  onEdit,
  onRegenerate,
  onDelete,
  onPin,
  onReact,
}: MessageActionsProps) {
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Quick reactions for assistant messages */}
      {role === "assistant" && onReact && (
        <div className="flex gap-1 mr-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-accent"
            onClick={() => onReact("up")}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-accent"
            onClick={() => onReact("down")}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Copy button - always visible */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 hover:bg-accent"
        onClick={handleCopy}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>

      {/* More actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-accent"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {role === "user" && onEdit && (
            <>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          {role === "assistant" && onRegenerate && (
            <>
              <DropdownMenuItem onClick={onRegenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate response
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {onPin && (
            <DropdownMenuItem onClick={onPin}>
              <Pin className="h-4 w-4 mr-2" />
              {isPinned ? "Unpin message" : "Pin message"}
            </DropdownMenuItem>
          )}

          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete message
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
