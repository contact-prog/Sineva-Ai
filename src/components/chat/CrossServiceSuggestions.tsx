import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Suggestion {
  service: string;
  action: string;
  description: string;
  prompt: string;
  priority: 'high' | 'medium' | 'low';
}

interface CrossServiceSuggestionsProps {
  suggestions: Suggestion[];
  onSelectSuggestion: (prompt: string) => void;
  className?: string;
}

const priorityConfig = {
  high: {
    icon: Zap,
    color: 'text-accent border-accent/30 bg-accent/5',
    badgeColor: 'bg-accent/20 text-accent'
  },
  medium: {
    icon: TrendingUp,
    color: 'text-primary border-primary/30 bg-primary/5',
    badgeColor: 'bg-primary/20 text-primary'
  },
  low: {
    icon: Sparkles,
    color: 'text-muted-foreground border-border bg-card/50',
    badgeColor: 'bg-muted text-muted-foreground'
  }
};

export function CrossServiceSuggestions({ 
  suggestions, 
  onSelectSuggestion, 
  className 
}: CrossServiceSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <Card className={cn(
      "p-4 glass-effect border-primary/20 animate-fade-in",
      className
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <Sparkles className="h-4 w-4 text-primary brain-pulse" />
          <div className="absolute inset-0 brain-glow" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">
          Strategic Next Steps
        </h4>
      </div>
      
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => {
          const config = priorityConfig[suggestion.priority];
          const Icon = config.icon;
          
          return (
            <button
              key={index}
              onClick={() => onSelectSuggestion(suggestion.prompt)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all group hover:shadow-md",
                config.color,
                "hover:scale-[1.02]"
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-4 w-4 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {suggestion.action}
                    </p>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0",
                      config.badgeColor
                    )}>
                      {suggestion.service}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        Click any suggestion to execute
      </p>
    </Card>
  );
}
