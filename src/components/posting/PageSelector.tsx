import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Page {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

interface PageSelectorProps {
  pages: Page[];
  selectedPageId: string;
  onPageSelect: (pageId: string) => void;
  label?: string;
  className?: string;
}

export function PageSelector({ 
  pages, 
  selectedPageId, 
  onPageSelect,
  label = "Select Facebook Page",
  className = ""
}: PageSelectorProps) {
  if (!pages || pages.length === 0) {
    return null;
  }

  if (pages.length === 1) {
    const page = pages[0];
    return (
      <div className={className}>
        <Label className="text-sm font-medium mb-2 block">{label}</Label>
        <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
          <div>
            <p className="font-medium">{page.name}</p>
            {page.category && (
              <p className="text-xs text-muted-foreground">{page.category}</p>
            )}
          </div>
          <Badge variant="secondary">Default</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Label htmlFor="page-selector" className="text-sm font-medium mb-2 block">
        {label} <Badge variant="outline" className="ml-2">{pages.length} pages</Badge>
      </Label>
      <Select value={selectedPageId} onValueChange={onPageSelect}>
        <SelectTrigger id="page-selector" className="w-full">
          <SelectValue placeholder="Choose a page to post to" />
        </SelectTrigger>
        <SelectContent>
          {pages.map((page) => (
            <SelectItem key={page.id} value={page.id}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{page.name}</span>
                {page.category && (
                  <span className="text-xs text-muted-foreground">{page.category}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
