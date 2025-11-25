import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Play, 
  Pause, 
  Trash2, 
  RotateCw, 
  MoreVertical,
  CheckCircle2,
  X,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QueueStatusBadge } from './QueueStatusBadge';
import { QueueConnectionBadge } from './QueueConnectionBadge';
import { Enums } from '@/integrations/supabase/types';
import { format } from 'date-fns';

interface QueueItem {
  id: string;
  content: string;
  scheduled_for: string;
  platforms: Enums<'integration_platform'>[];
  status: Enums<'queue_status'>;
  priority: Enums<'post_priority'>;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  last_attempt_at: string | null;
  next_retry_at: string | null;
}

const priorityColors = {
  low: 'bg-gray-100 dark:bg-gray-800',
  medium: 'bg-blue-100 dark:bg-blue-900/30',
  high: 'bg-orange-100 dark:bg-orange-900/30',
  urgent: 'bg-red-100 dark:bg-red-900/30',
};

export const QueueManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<Enums<'queue_status'> | 'all'>('all');

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('posting_queue')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false })
        .order('scheduled_for', { ascending: true });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQueueItems(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    // Real-time subscription
    const channel = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posting_queue',
        },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus]);

  const toggleSelectAll = () => {
    if (selectedItems.size === queueItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(queueItems.map((item) => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const bulkUpdateStatus = async (status: Enums<'queue_status'>) => {
    try {
      const ids = Array.from(selectedItems);
      const { error } = await supabase
        .from('posting_queue')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${ids.length} post(s) updated to ${status}`,
      });

      setSelectedItems(new Set());
      fetchQueue();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const bulkDelete = async () => {
    try {
      const ids = Array.from(selectedItems);
      const { error } = await supabase
        .from('posting_queue')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${ids.length} post(s) deleted`,
      });

      setSelectedItems(new Set());
      fetchQueue();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const retryFailed = async (id: string) => {
    try {
      const { error } = await supabase
        .from('posting_queue')
        .update({
          status: 'scheduled',
          attempts: 0,
          error_message: null,
          next_retry_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post queued for retry',
      });

      fetchQueue();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredItems = queueItems;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Queue Manager
              <QueueConnectionBadge />
            </CardTitle>
            <CardDescription>
              Manage scheduled posts with priority-based processing
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {selectedItems.size > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkUpdateStatus('scheduled')}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Resume ({selectedItems.size})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bulkUpdateStatus('paused')}
                  className="gap-2"
                >
                  <Pause className="h-4 w-4" />
                  Pause ({selectedItems.size})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={bulkDelete}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedItems.size})
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['all', 'scheduled', 'pending', 'processing', 'failed', 'paused'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status as any)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading queue...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No items in queue
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.size === queueItems.length && queueItems.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Platforms</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                      />
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate">{item.content.slice(0, 100)}...</div>
                      {item.error_message && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {item.error_message.slice(0, 50)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {item.platforms.slice(0, 3).map((platform) => (
                          <Badge key={platform} variant="outline" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                        {item.platforms.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.platforms.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(item.scheduled_for), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${priorityColors[item.priority]} text-xs`}>
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <QueueStatusBadge status={item.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.attempts}/{item.max_attempts}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm">
                          {item.status === 'failed' && (
                            <>
                              <DropdownMenuItem onClick={() => retryFailed(item.id)}>
                                <RotateCw className="h-4 w-4 mr-2" />
                                Retry Now
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {item.status === 'paused' && (
                            <DropdownMenuItem onClick={() => bulkUpdateStatus('scheduled')}>
                              <Play className="h-4 w-4 mr-2" />
                              Resume
                            </DropdownMenuItem>
                          )}
                          {item.status === 'scheduled' && (
                            <DropdownMenuItem onClick={() => bulkUpdateStatus('paused')}>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => bulkUpdateStatus('cancelled')}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={bulkDelete}
                            className="text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
