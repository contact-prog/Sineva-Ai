import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Pause,
  X 
} from 'lucide-react';
import { Enums } from '@/integrations/supabase/types';

interface QueueStatusBadgeProps {
  status: Enums<'queue_status'>;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Clock,
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
  },
  published: {
    label: 'Published',
    icon: CheckCircle2,
    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
  },
  cancelled: {
    label: 'Cancelled',
    icon: X,
    className: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700',
  },
  paused: {
    label: 'Paused',
    icon: Pause,
    className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
};

export const QueueStatusBadge = ({ 
  status, 
  showIcon = true,
  size = 'md' 
}: QueueStatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${sizeClasses[size]} gap-1 border`}
    >
      {showIcon && (
        <Icon className={`${size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} ${status === 'processing' ? 'animate-spin' : ''}`} />
      )}
      {config.label}
    </Badge>
  );
};
