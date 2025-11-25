import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Clock,
  Image as ImageIcon,
  Edit,
  Trash2,
  Play,
  Pause,
  X,
} from 'lucide-react';
import { Enums } from '@/integrations/supabase/types';
import { format } from 'date-fns';

interface EventDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    content: string;
    scheduled_for: string;
    platforms: Enums<'integration_platform'>[];
    status: Enums<'queue_status'>;
    priority: Enums<'post_priority'>;
    media_urls?: string[];
    tags?: string[];
    error_message?: string | null;
  } | null;
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => void;
  onPause: (eventId: string) => void;
  onResume: (eventId: string) => void;
  onCancel: (eventId: string) => void;
}

const platformIcons = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
};

const statusColors = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
  scheduled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  processing: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  published: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  failed: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  cancelled: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
  paused: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
};

export const EventDetailsDialog = ({
  open,
  onOpenChange,
  event,
  onEdit,
  onDelete,
  onPause,
  onResume,
  onCancel,
}: EventDetailsDialogProps) => {
  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Scheduled Post Details
            <Badge className={statusColors[event.status]}>
              {event.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              Scheduled for {format(new Date(event.scheduled_for), 'PPpp')}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Platforms */}
          <div>
            <h4 className="text-sm font-medium mb-2">Platforms</h4>
            <div className="flex gap-2 flex-wrap">
              {event.platforms.map((platform) => {
                const Icon = platformIcons[platform as keyof typeof platformIcons];
                if (!Icon) return null;
                return (
                  <Badge key={platform} variant="outline" className="gap-1">
                    <Icon className="h-3 w-3" />
                    {platform}
                  </Badge>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Content */}
          <div>
            <h4 className="text-sm font-medium mb-2">Content</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {event.content}
            </p>
          </div>

          {/* Media */}
          {event.media_urls && event.media_urls.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Media ({event.media_urls.length})
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {event.media_urls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Media ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md"
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="flex gap-2 flex-wrap">
                  {event.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Priority */}
          <Separator />
          <div>
            <h4 className="text-sm font-medium mb-2">Priority</h4>
            <Badge variant="outline">{event.priority}</Badge>
          </div>

          {/* Error Message */}
          {event.status === 'failed' && event.error_message && (
            <>
              <Separator />
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <h4 className="text-sm font-medium text-red-900 dark:text-red-300 mb-1">
                  Error
                </h4>
                <p className="text-sm text-red-700 dark:text-red-400">
                  {event.error_message}
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <Separator />
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(event.id)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>

            {event.status === 'scheduled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPause(event.id)}
                className="gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}

            {event.status === 'paused' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResume(event.id)}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            )}

            {['scheduled', 'pending', 'paused'].includes(event.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(event.id)}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(event.id)}
              className="gap-2 ml-auto"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
