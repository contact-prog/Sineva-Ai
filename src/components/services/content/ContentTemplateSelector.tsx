import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Lightbulb, Target, TrendingUp, FileText, MessageSquare, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentTemplate, getRecommendedTemplates } from '@/config/content-templates';

interface ContentTemplateSelectorProps {
  contentType: string;
  selectedTemplate: string;
  onSelectTemplate: (templateId: string) => void;
}

const templateIcons: Record<string, any> = {
  aida: Target,
  pas: Lightbulb,
  fab: FileText,
  'before-after-bridge': TrendingUp,
  '4cs': CheckCircle2,
  storytelling: BookOpen,
  scqa: MessageSquare,
  'hook-story-offer': Zap,
  none: FileText
};

export function ContentTemplateSelector({ 
  contentType, 
  selectedTemplate, 
  onSelectTemplate 
}: ContentTemplateSelectorProps) {
  const templates = getRecommendedTemplates(contentType);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-2">Content Framework (Optional)</h3>
        <p className="text-sm text-muted-foreground">
          Choose a proven copywriting framework to structure your content
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((template) => {
          const Icon = templateIcons[template.id] || FileText;
          const isSelected = selectedTemplate === template.id;

          return (
            <Card
              key={template.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50 p-4",
                isSelected && "border-primary ring-2 ring-primary/20 bg-primary/5"
              )}
              onClick={() => onSelectTemplate(template.id)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{template.name}</h4>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {template.description}
                  </p>
                  {template.id !== 'none' && (
                    <div className="flex flex-wrap gap-1">
                      {template.bestFor.slice(0, 3).map((use) => (
                        <Badge key={use} variant="secondary" className="text-xs">
                          {use}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selectedTemplate && selectedTemplate !== 'none' && (
        <Card className="p-4 bg-muted/50 border-primary/20">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            Framework Structure
          </h4>
          <ul className="space-y-1.5">
            {templates.find(t => t.id === selectedTemplate)?.structure.map((step, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary font-semibold">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
