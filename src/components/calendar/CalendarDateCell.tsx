import { cn } from '@/lib/utils';
import { CalendarEvent } from './CalendarGrid';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { EventContextMenu } from './EventContextMenu';
import { PlatformIcon } from './PlatformIcon';

interface CalendarDateCellProps {
  date: Date;
  events: CalendarEvent[];
  isPast: boolean;
  isToday: boolean;
  onEventClick?: (event: CalendarEvent) => void;
  onEventEdit?: (event: CalendarEvent) => void;
  onEventDuplicate?: (event: CalendarEvent) => void;
  onEventDelete?: (event: CalendarEvent) => void;
  onEventRetry?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  processing: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground',
};

export function CalendarDateCell({
  date,
  events,
  isPast,
  isToday,
  onEventClick,
  onEventEdit,
  onEventDuplicate,
  onEventDelete,
  onEventRetry,
  onDateClick,
}: CalendarDateCellProps) {
  return (
    <div
      className={cn(
        'border-r border-b last:border-r-0 p-2 min-h-[120px] hover:bg-accent/5 transition-colors cursor-pointer',
        isPast && 'bg-muted/30',
        isToday && 'bg-primary/5'
      )}
      onClick={() => onDateClick?.(date)}
    >
      <div className="space-y-1">
        {events.map((event) => (
          <EventContextMenu
            key={event.id}
            event={event}
            onEdit={onEventEdit}
            onDuplicate={onEventDuplicate}
            onDelete={onEventDelete}
            onRetry={onEventRetry}
          >
            <div
              className={cn(
                'p-2 rounded-md border text-xs cursor-pointer hover:shadow-sm transition-all',
                statusColors[event.status] || 'bg-card'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onEventClick?.(event);
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <PlatformIcon platform={event.platform} size={12} className="shrink-0" />
                <span className="font-medium truncate">{format(event.start, 'h:mm a')}</span>
              </div>
              <p className="line-clamp-2 text-[11px] leading-tight">
                {event.content}
              </p>
              {event.mediaUrls && event.mediaUrls.length > 0 && (
                <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1">
                  📷 {event.mediaUrls.length}
                </Badge>
              )}
            </div>
          </EventContextMenu>
        ))}
      </div>
    </div>
  );
}
