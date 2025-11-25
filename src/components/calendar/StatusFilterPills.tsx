import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type QueueStatus = Database['public']['Enums']['queue_status'];

interface StatusCounts {
  draft: number;
  scheduled: number;
  processing: number;
  published: number;
  failed: number;
  pending: number;
  cancelled: number;
  paused: number;
}

interface StatusFilterPillsProps {
  counts: StatusCounts;
  selectedStatuses: QueueStatus[];
  onStatusToggle: (status: QueueStatus) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; activeColor: string }> = {
  draft: {
    label: 'Draft',
    color: 'bg-muted text-muted-foreground',
    activeColor: 'bg-muted-foreground text-background',
  },
  scheduled: {
    label: 'Scheduled',
    color: 'bg-primary/10 text-primary',
    activeColor: 'bg-primary text-primary-foreground',
  },
  processing: {
    label: 'Processing',
    color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    activeColor: 'bg-yellow-500 text-background',
  },
  published: {
    label: 'Published',
    color: 'bg-green-500/10 text-green-700 dark:text-green-400',
    activeColor: 'bg-green-500 text-background',
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-500/10 text-red-700 dark:text-red-400',
    activeColor: 'bg-red-500 text-background',
  },
};

export function StatusFilterPills({ counts, selectedStatuses, onStatusToggle }: StatusFilterPillsProps) {
  const visibleStatuses = ['draft', 'scheduled', 'processing', 'published', 'failed'] as const;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground mr-1">Status:</span>
      {visibleStatuses.map((status) => {
        const config = STATUS_CONFIG[status];
        const count = counts[status] || 0;
        const isActive = selectedStatuses.includes(status as QueueStatus);

        return (
          <Badge
            key={status}
            variant="outline"
            className={cn(
              'cursor-pointer transition-colors border',
              isActive ? config.activeColor : config.color,
              'hover:opacity-80'
            )}
            onClick={() => onStatusToggle(status as QueueStatus)}
          >
            {config.label}
            <span className={cn(
              'ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-medium',
              isActive ? 'bg-background/20' : 'bg-background/50'
            )}>
              {count}
            </span>
          </Badge>
        );
      })}
    </div>
  );
}
