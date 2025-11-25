import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

interface CalendarPerformanceMonitorProps {
  eventCount: number;
}

export function CalendarPerformanceMonitor({ eventCount }: CalendarPerformanceMonitorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Activity className="h-4 w-4" />
      <span>{eventCount} posts loaded</span>
    </div>
  );
}
