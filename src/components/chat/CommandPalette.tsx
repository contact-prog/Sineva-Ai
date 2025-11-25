import { useEffect, useState } from 'react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { 
  Image, Video, FileText, Mail, Calendar, Settings, 
  Sparkles, Zap, TrendingUp, Users, Search 
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommandSelect: (command: string) => void;
}

const commands = [
  {
    category: 'Quick Actions',
    items: [
      { 
        id: 'graphic',
        label: 'Create Graphic',
        icon: Image,
        prompt: 'Create a social media graphic for',
        keywords: ['image', 'design', 'visual', 'graphic']
      },
      { 
        id: 'video',
        label: 'Generate Video',
        icon: Video,
        prompt: 'Create a video about',
        keywords: ['video', 'animation', 'motion']
      },
      { 
        id: 'content',
        label: 'Write Content',
        icon: FileText,
        prompt: 'Write a blog post about',
        keywords: ['blog', 'article', 'content', 'write']
      },
      { 
        id: 'email',
        label: 'Draft Email',
        icon: Mail,
        prompt: 'Draft an email about',
        keywords: ['email', 'message', 'draft']
      },
      { 
        id: 'schedule',
        label: 'Schedule Post',
        icon: Calendar,
        prompt: 'Schedule a post for',
        keywords: ['schedule', 'calendar', 'post', 'plan']
      },
    ]
  },
  {
    category: 'AI Tools',
    items: [
      { 
        id: 'optimize',
        label: 'Optimize Content',
        icon: Sparkles,
        prompt: 'Optimize my content for SEO:',
        keywords: ['optimize', 'seo', 'improve', 'enhance']
      },
      { 
        id: 'analyze',
        label: 'Analyze Performance',
        icon: TrendingUp,
        prompt: 'Analyze performance of',
        keywords: ['analyze', 'performance', 'metrics', 'stats']
      },
      { 
        id: 'audience',
        label: 'Audience Insights',
        icon: Users,
        prompt: 'Provide insights about my target audience',
        keywords: ['audience', 'insights', 'demographics', 'target']
      },
      { 
        id: 'research',
        label: 'Research Topic',
        icon: Search,
        prompt: 'Research and provide insights about',
        keywords: ['research', 'insights', 'information', 'learn']
      },
    ]
  },
  {
    category: 'Workflows',
    items: [
      { 
        id: 'campaign',
        label: 'Create Campaign',
        icon: Zap,
        prompt: 'Create a complete marketing campaign for',
        keywords: ['campaign', 'marketing', 'strategy', 'multi']
      },
      { 
        id: 'repurpose',
        label: 'Repurpose Content',
        icon: FileText,
        prompt: 'Repurpose this content for multiple platforms:',
        keywords: ['repurpose', 'adapt', 'convert', 'transform']
      },
    ]
  }
];

export function CommandPalette({ open, onOpenChange, onCommandSelect }: CommandPaletteProps) {
  const [search, setSearch] = useState('');

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const handleSelect = (prompt: string) => {
    onCommandSelect(prompt);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search commands or type what you want to do..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          {search ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">No matching commands found</p>
              <p className="text-xs text-muted-foreground">
                Press Enter to use "{search}" as a prompt
              </p>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Start typing to search...
            </p>
          )}
        </CommandEmpty>
        
        {commands.map((group) => (
          <CommandGroup key={group.category} heading={group.category}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.keywords.join(' ')}`}
                  onSelect={() => handleSelect(item.prompt)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
