export interface CalendarEvent {
  id: string;
  title?: string;
  content: string;
  platform: string;
  start: Date;
  end: Date;
  status: 'draft' | 'scheduled' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  mediaUrls?: string[];
  isDraft?: boolean;
  integrationId?: string;
}
