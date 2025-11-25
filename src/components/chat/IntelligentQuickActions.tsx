import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Wand2, 
  Video, 
  FileText, 
  Calendar, 
  Mail, 
  Share2, 
  BarChart3, 
  Globe,
  Image,
  Palette,
  Clock,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  prompt: string;
  relevance: string[];
  excludeAfter: string[];
}

const allActions: QuickAction[] = [
  { 
    icon: Wand2, 
    label: 'Create image', 
    prompt: 'Create a graphic for me',
    relevance: ['content', 'blog', 'post', 'article', 'text', 'idea'],
    excludeAfter: ['graphic', 'image', 'visual', 'design']
  },
  { 
    icon: Video, 
    label: 'Create video', 
    prompt: 'Generate a video for me',
    relevance: ['content', 'story', 'script', 'visual'],
    excludeAfter: ['video', 'clip', 'animation']
  },
  { 
    icon: FileText, 
    label: 'Write content', 
    prompt: 'Write content for me',
    relevance: ['idea', 'topic', 'keyword', 'outline'],
    excludeAfter: ['content', 'blog', 'article', 'wrote', 'written']
  },
  { 
    icon: Calendar, 
    label: 'Schedule post', 
    prompt: 'Schedule this for my social media',
    relevance: ['content', 'post', 'graphic', 'video', 'created', 'generated'],
    excludeAfter: ['scheduled', 'planned', 'calendar']
  },
  { 
    icon: Mail, 
    label: 'Draft email', 
    prompt: 'Draft an email about this',
    relevance: ['content', 'announcement', 'update', 'news'],
    excludeAfter: ['email', 'sent', 'message', 'mailed']
  },
  { 
    icon: Share2, 
    label: 'Share to social', 
    prompt: 'Optimize this for social media platforms',
    relevance: ['content', 'blog', 'article', 'graphic', 'video'],
    excludeAfter: ['social', 'shared', 'posted', 'published', 'scheduled']
  },
  { 
    icon: Palette, 
    label: 'Enhance design', 
    prompt: 'Enhance the design and visual appeal',
    relevance: ['graphic', 'image', 'visual', 'created'],
    excludeAfter: ['enhanced', 'improved', 'redesigned']
  },
  { 
    icon: Globe, 
    label: 'Publish to WordPress', 
    prompt: 'Publish this to WordPress',
    relevance: ['blog', 'article', 'content', 'written'],
    excludeAfter: ['published', 'wordpress', 'posted', 'live']
  },
  { 
    icon: BarChart3, 
    label: 'Get analytics', 
    prompt: 'Show me analytics and performance data',
    relevance: ['published', 'scheduled', 'posted', 'sent'],
    excludeAfter: ['analytics', 'metrics', 'performance', 'stats']
  },
  { 
    icon: TrendingUp, 
    label: 'Optimize SEO', 
    prompt: 'Optimize this for SEO and search visibility',
    relevance: ['blog', 'article', 'content', 'website'],
    excludeAfter: ['optimized', 'seo', 'keywords']
  },
  { 
    icon: MessageSquare, 
    label: 'Create variations', 
    prompt: 'Create 3 variations of this content',
    relevance: ['content', 'blog', 'post', 'graphic'],
    excludeAfter: ['variations', 'versions', 'alternatives']
  }
];

interface IntelligentQuickActionsProps {
  messages: Message[];
  onActionClick: (prompt: string) => void;
  className?: string;
}

export function IntelligentQuickActions({ 
  messages, 
  onActionClick, 
  className 
}: IntelligentQuickActionsProps) {
  
  const intelligentActions = useMemo(() => {
    // Get the last 3 messages for better context
    const recentMessages = messages.slice(-3);
    if (recentMessages.length === 0) return [];

    // Combine content from recent messages
    const recentContext = recentMessages
      .map(m => m.content.toLowerCase())
      .join(' ');

    // Get tool calls from last assistant message
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    const recentTools = lastAssistant?.toolCalls?.map(tc => 
      (tc.name || tc.function?.name || '').toLowerCase()
    ) || [];

    // Score each action based on relevance and exclusions
    const scoredActions = allActions.map(action => {
      let score = 0;

      // Check relevance (positive scoring)
      const hasRelevantKeywords = action.relevance.some(keyword => 
        recentContext.includes(keyword)
      );
      if (hasRelevantKeywords) score += 10;

      // Check if this action was just completed (negative scoring)
      const wasJustCompleted = action.excludeAfter.some(keyword => 
        recentContext.includes(keyword) || 
        recentTools.some(tool => tool.includes(keyword))
      );
      if (wasJustCompleted) score -= 20;

      // Boost actions that follow logically
      // After creating content → schedule, share, publish
      if (recentContext.includes('created') || recentContext.includes('generated')) {
        if (['Schedule post', 'Share to social', 'Publish to WordPress'].includes(action.label)) {
          score += 5;
        }
      }

      // After email or social success → analytics
      if (recentContext.includes('successfully') || recentContext.includes('sent')) {
        if (action.label === 'Get analytics') {
          score += 5;
        }
      }

      return { action, score };
    });

    // Filter out negative scores and sort by relevance
    return scoredActions
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ action }) => action);
  }, [messages]);

  // Don't show if no relevant actions
  if (intelligentActions.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-2 px-2 py-2", className)}>
      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
        Quick Actions:
      </span>
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {intelligentActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            onClick={() => onActionClick(action.prompt)}
            className="flex items-center gap-2 whitespace-nowrap h-8 text-xs rounded-full px-3 hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all duration-200"
          >
            <action.icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
