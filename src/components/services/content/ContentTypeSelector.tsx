import { Card } from '@/components/ui/card';
import { FileText, MessageSquare, Mail, Image, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentType {
  id: string;
  label: string;
  description: string;
  icon: typeof FileText;
}

const contentTypes: ContentType[] = [
  { id: 'blog', label: 'Blog Post', description: 'Long-form articles', icon: FileText },
  { id: 'email', label: 'Email', description: 'Marketing emails', icon: Mail },
  { id: 'caption', label: 'Social Caption', description: 'Platform-optimized posts', icon: MessageSquare },
  { id: 'article', label: 'Article', description: 'News & features', icon: Newspaper },
];

interface ContentTypeSelectorProps {
  selectedType: string;
  onSelectType: (type: string) => void;
}

export function ContentTypeSelector({ selectedType, onSelectType }: ContentTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {contentTypes.map((type) => {
        const Icon = type.icon;
        return (
          <Card
            key={type.id}
            className={cn(
              "cursor-pointer transition-all hover:bg-muted/50 p-4",
              selectedType === type.id && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => onSelectType(type.id)}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <Icon className={cn(
                "w-8 h-8",
                selectedType === type.id ? "text-primary" : "text-muted-foreground"
              )} />
              <div>
                <div className="font-semibold text-sm">{type.label}</div>
                <div className="text-xs text-muted-foreground">{type.description}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
