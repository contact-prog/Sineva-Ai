import { EventProps } from 'react-big-calendar';
import { Badge } from '@/components/ui/badge';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  X,
  Image,
  Loader2
} from 'lucide-react';
import { Enums } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

interface CalendarEventResource {
  content: string;
  platforms: Enums<'integration_platform'>[];
  status: Enums<'queue_status'>;
  media_urls?: string[];
  priority: Enums<'post_priority'>;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CalendarEventResource;
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
};

const statusIcons = {
  pending: Clock,
  scheduled: Clock,
  processing: Clock,
  published: CheckCircle2,
  failed: AlertCircle,
  cancelled: X,
  paused: Pause,
};

const priorityColors = {
  low: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

export const CalendarEventCard = ({ event }: EventProps<CalendarEvent>) => {
  const StatusIcon = statusIcons[event.resource.status];
  const hasMedia = event.resource.media_urls && event.resource.media_urls.length > 0;
  
  return (
    <div className="p-1.5 space-y-1.5 overflow-hidden h-full group">
      {/* Status and Time Row */}
      <div className="flex items-center gap-1 justify-between">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <StatusIcon 
            className={cn(
              "h-3 w-3 flex-shrink-0",
              event.resource.status === 'processing' && 'animate-spin'
            )} 
          />
          <span className="text-[10px] text-muted-foreground truncate">
            {event.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </span>
        </div>
      </div>
      
      {/* Content Preview */}
      <p className="text-xs font-medium line-clamp-2 leading-tight">{event.title}</p>
      
      {/* Bottom Row: Platforms and Indicators */}
      <div className="flex items-center gap-1.5 justify-between">
        <div className="flex items-center gap-0.5">
          {event.resource.platforms.slice(0, 3).map((platform) => {
            const Icon = platformIcons[platform as keyof typeof platformIcons];
            if (!Icon) return null;
            return (
              <div
                key={platform}
                className="h-4 w-4 rounded-full bg-muted flex items-center justify-center"
              >
                <Icon className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
            );
          })}
          {event.resource.platforms.length > 3 && (
            <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center">
              <span className="text-[9px] text-muted-foreground font-medium">
                +{event.resource.platforms.length - 3}
              </span>
            </div>
          )}
        </div>
        
        {/* Media Indicator */}
        {hasMedia && (
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <Image className="h-2.5 w-2.5" />
            <span className="text-[9px]">{event.resource.media_urls!.length}</span>
          </div>
        )}
      </div>
      
      {/* Priority Badge (only if not medium) */}
      {event.resource.priority !== 'medium' && (
        <Badge className={cn("text-[9px] px-1 py-0 h-4", priorityColors[event.resource.priority])}>
          {event.resource.priority}
        </Badge>
      )}
    </div>
  );
};
