import { useState } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday, isPast } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, FileText, Megaphone, TrendingUp } from 'lucide-react';
import { CalendarEvent } from './CalendarGrid';
import { EventContextMenu } from './EventContextMenu';
import { PlatformIcon } from './PlatformIcon';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventDrop: (event: CalendarEvent, start: Date, end: Date) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date }) => void;
  onEdit?: (event: CalendarEvent) => void;
  onDuplicate?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  onRetry?: (event: CalendarEvent) => void;
}

export const CalendarView = ({ 
  events, 
  onEventClick,
  onEdit,
  onDuplicate,
  onDelete,
  onRetry,
}: CalendarViewProps) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const navigate = useNavigate();

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  // Generate 7 days starting from currentWeekStart
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start), day));
  };

  const statusColors = {
    draft: 'bg-muted border-muted-foreground/50',
    scheduled: 'bg-blue-500/10 border-blue-500/50',
    pending: 'bg-yellow-500/10 border-yellow-500/50',
    processing: 'bg-purple-500/10 border-purple-500/50',
    completed: 'bg-green-500/10 border-green-500/50',
    failed: 'bg-destructive/10 border-destructive/50',
    cancelled: 'bg-muted border-border',
  };

  return (
    <div className="bg-card rounded-lg border">
      {/* Week Navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {format(currentWeekStart, 'MMMM yyyy')}
        </h2>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 divide-x divide-border">
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isDayToday = isToday(day);
          const isDayPast = isPast(day) && !isDayToday;

          return (
            <div key={index} className="min-h-[600px] flex flex-col">
              {/* Day Header */}
              <div className={cn(
                "p-3 border-b text-center",
                isDayToday && "bg-primary/5"
              )}>
                <div className="text-xs font-medium text-muted-foreground uppercase">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  "text-2xl font-semibold mt-1",
                  isDayToday && "text-primary",
                  isDayPast && "text-muted-foreground"
                )}>
                  {format(day, 'd')}
                </div>
                {dayEvents.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {dayEvents.length} {dayEvents.length === 1 ? 'post' : 'posts'}
                  </div>
                )}
              </div>

              {/* Events Column */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {/* Add New Button - Show for today and next 30 days, centered if no events */}
                {!isDayPast && (
                  <div className={cn(
                    "w-full",
                    dayEvents.length === 0 && "flex items-center justify-center h-full"
                  )}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={cn(
                            "gap-2 bg-primary/10 hover:bg-primary/20 border-primary/30 transition-colors",
                            dayEvents.length === 0 ? "justify-center w-auto px-6" : "w-full justify-start"
                          )}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="text-sm font-medium">Add New</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="center" 
                        className="w-56 bg-popover/95 backdrop-blur-sm border shadow-lg z-[100]"
                      >
                        <DropdownMenuItem 
                          onClick={() => navigate('/app/calendar/create')}
                          className="cursor-pointer hover:bg-accent focus:bg-accent"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Post
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => navigate('/app/content')}
                          className="cursor-pointer hover:bg-accent focus:bg-accent"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Create Blog Post
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => console.log('Run Advertisement')}
                          className="cursor-pointer hover:bg-accent focus:bg-accent"
                        >
                          <Megaphone className="h-4 w-4 mr-2" />
                          Run Advertisement
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => console.log('Boost Post')}
                          className="cursor-pointer hover:bg-accent focus:bg-accent"
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Boost Post
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                
                {dayEvents.map((event) => {
                    const statusBadgeConfig = {
                      completed: { label: 'Published', class: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/50' },
                      published: { label: 'Published', class: 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/50' },
                      failed: { label: 'Failed', class: 'bg-destructive/20 text-destructive border-destructive/50' },
                      cancelled: { label: 'Cancelled', class: 'bg-muted text-muted-foreground border-border' },
                      scheduled: { label: 'Scheduled', class: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50' },
                      pending: { label: 'Pending', class: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50' },
                      processing: { label: 'Processing', class: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/50' },
                      draft: { label: 'Draft', class: 'bg-muted text-muted-foreground border-border' },
                    };

                    const statusBadge = statusBadgeConfig[event.status];

                    return (
                      <EventContextMenu
                        key={event.id}
                        event={event}
                        onEdit={onEdit}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                        onRetry={onRetry}
                      >
                        <div
                          onClick={() => onEventClick(event)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-lg bg-card/50 backdrop-blur-sm",
                            statusColors[event.status]
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <PlatformIcon platform={event.platform} size={18} />
                              <span className="text-xs font-medium text-muted-foreground">
                                {event.platform}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                            <span>{format(new Date(event.start), 'h:mm a')}</span>
                          </div>

                          <p className="text-sm line-clamp-2 mb-2">{event.content}</p>

                          {event.mediaUrls && event.mediaUrls.length > 0 && (
                            <div className="mb-2">
                              <img 
                                src={event.mediaUrls[0]} 
                                alt="Post media" 
                                className="w-full h-24 object-cover rounded border"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            {event.mediaUrls && event.mediaUrls.length > 0 && (
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                📷 {event.mediaUrls.length} media
                              </Badge>
                            )}
                            <Badge className={cn("text-[10px] h-5 px-2 border", statusBadge.class)}>
                              {statusBadge.label}
                            </Badge>
                          </div>
                        </div>
                      </EventContextMenu>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
