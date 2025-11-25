import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface Suggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  params?: Record<string, any>;
  confidence: number;
  reasoning?: string;
}

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onSelectSuggestion: (suggestion: Suggestion) => void;
}

export const SuggestionChips = ({ suggestions, onSelectSuggestion }: SuggestionChipsProps) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-4 space-y-2 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <Sparkles className="h-4 w-4" />
        <span className="font-medium">Suggested next steps</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.id}
            variant="outline"
            size="sm"
            onClick={() => onSelectSuggestion(suggestion)}
            className="h-auto py-2 px-3 text-left hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 group"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium group-hover:text-primary transition-colors">
                {suggestion.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {suggestion.description}
              </span>
              {suggestion.reasoning && (
                <span className="text-xs text-muted-foreground/70 italic mt-0.5">
                  {suggestion.reasoning}
                </span>
              )}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};
