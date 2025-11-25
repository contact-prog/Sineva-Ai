import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Edit,
  Copy,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { CalendarEvent } from './CalendarGrid';

interface EventContextMenuProps {
  event: CalendarEvent;
  children: React.ReactNode;
  onEdit?: (event: CalendarEvent) => void;
  onDuplicate?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  onRetry?: (event: CalendarEvent) => void;
}

export function EventContextMenu({
  event,
  children,
  onEdit,
  onDuplicate,
  onDelete,
  onRetry,
}: EventContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-card">
        <ContextMenuItem onClick={() => onEdit?.(event)}>
          <Edit className="mr-2 h-4 w-4" />
          <span>Edit Post</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={() => onDuplicate?.(event)}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Duplicate</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {event.status === 'failed' && (
          <>
            <ContextMenuItem onClick={() => onRetry?.(event)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>Retry Post</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        <ContextMenuItem
          onClick={() => onDelete?.(event)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
