import { Wand2, Video, FileText, Calendar, Mail, Share2, BarChart3, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  prompt: string;
}

const quickActions: QuickAction[] = [
  { icon: Wand2, label: 'Create image', prompt: 'Create a graphic for me' },
  { icon: Video, label: 'Create video', prompt: 'Generate a video for me' },
  { icon: FileText, label: 'Write content', prompt: 'Write content for me' },
  { icon: Calendar, label: 'Plan calendar', prompt: 'Plan my content calendar' },
  { icon: Mail, label: 'Send email', prompt: 'Send an email' },
  { icon: Share2, label: 'Schedule post', prompt: 'Schedule a social media post' },
  { icon: BarChart3, label: 'Check analytics', prompt: 'Show me my analytics' },
  { icon: Globe, label: 'Publish to WordPress', prompt: 'Publish to WordPress' },
];

interface QuickActionChipsProps {
  onActionClick: (prompt: string) => void;
  className?: string;
}

export function QuickActionChips({ onActionClick, className }: QuickActionChipsProps) {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide", className)}>
      {quickActions.map((action) => (
        <Button
          key={action.label}
          variant="ghost"
          size="sm"
          onClick={() => onActionClick(action.prompt)}
          className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 h-auto text-sm bg-muted/30 hover:bg-muted/60 border border-border/40 transition-all duration-200 hover:scale-105 hover:border-primary/30"
        >
          <action.icon className="h-4 w-4 flex-shrink-0" />
          <span>{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
