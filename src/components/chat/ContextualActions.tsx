import { Button } from '@/components/ui/button';
import { Image, Share2, Calendar, Edit, Download, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextualAction {
  id: string;
  label: string;
  icon: React.ElementType;
  prompt: string;
  context: string[];
}

interface ContextualActionsProps {
  messageContent: string;
  onActionClick: (prompt: string) => void;
  className?: string;
}

const actions: ContextualAction[] = [
  {
    id: 'create-graphic',
    label: 'Create Graphic',
    icon: Image,
    prompt: 'Create a graphic based on: ',
    context: ['content', 'blog', 'post', 'article', 'write']
  },
  {
    id: 'share-social',
    label: 'Share to Social',
    icon: Share2,
    prompt: 'Optimize this for social media sharing: ',
    context: ['content', 'blog', 'article', 'graphic', 'video']
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: Calendar,
    prompt: 'Schedule this content: ',
    context: ['content', 'post', 'graphic', 'video', 'email']
  },
  {
    id: 'enhance',
    label: 'Enhance',
    icon: Edit,
    prompt: 'Enhance and improve: ',
    context: ['content', 'blog', 'email', 'post']
  },
  {
    id: 'export',
    label: 'Export',
    icon: Download,
    prompt: 'Export this in different formats: ',
    context: ['content', 'blog', 'article']
  },
  {
    id: 'code',
    label: 'Get Code',
    icon: Code,
    prompt: 'Generate embeddable code for: ',
    context: ['graphic', 'video', 'content']
  }
];

export function ContextualActions({ messageContent, onActionClick, className }: ContextualActionsProps) {
  // Detect context from message content
  const contentLower = messageContent.toLowerCase();
  
  // Filter actions based on content context
  const relevantActions = actions.filter(action => 
    action.context.some(keyword => contentLower.includes(keyword))
  ).slice(0, 4); // Limit to 4 most relevant actions

  if (relevantActions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50", className)}>
      <span className="text-xs text-muted-foreground font-medium mr-2 self-center">
        Quick Actions:
      </span>
      {relevantActions.map((action) => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => onActionClick(action.prompt + messageContent)}
            className="h-7 gap-1.5 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/50"
          >
            <Icon className="h-3 w-3" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
