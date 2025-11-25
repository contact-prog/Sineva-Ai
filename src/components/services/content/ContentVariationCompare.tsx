import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Copy, Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Variation {
  variationNumber: number;
  content: string;
  angle: string;
  tone: string;
}

interface ContentVariationCompareProps {
  originalContent: string;
  variations: Variation[];
  onSelectVariation: (content: string) => void;
}

export function ContentVariationCompare({ 
  originalContent, 
  variations, 
  onSelectVariation 
}: ContentVariationCompareProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Content copied to clipboard');
  };

  const handleDownload = (content: string, index: number) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `variation-${index + 1}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Variation downloaded');
  };

  const handleSelect = (content: string, index: number) => {
    setSelectedIndex(index);
    onSelectVariation(content);
    toast.success(`Variation ${index + 1} selected`);
  };

  const allContent = [
    { content: originalContent, label: 'Original', angle: 'original', tone: 'original', isOriginal: true },
    ...variations.map(v => ({ ...v, label: `Variation ${v.variationNumber}`, isOriginal: false }))
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Content Variations</h3>
        <Badge variant="secondary">{variations.length} variations generated</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allContent.map((item, index) => {
          const isSelected = selectedIndex === index;
          const actualIndex = item.isOriginal ? -1 : index - 1;

          return (
            <Card
              key={index}
              className={cn(
                "p-4 transition-all",
                isSelected && "border-primary ring-2 ring-primary/20"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{item.label}</h4>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex gap-1">
                  {!item.isOriginal && (
                    <>
                      <Badge variant="outline" className="text-xs">
                        {item.angle}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {item.tone}
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              <Textarea
                value={item.content}
                readOnly
                rows={12}
                className="text-sm font-mono mb-3 resize-none"
              />

              <div className="flex gap-2">
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleSelect(item.content, index)}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Selected
                    </>
                  ) : (
                    'Use This'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(item.content)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                {!item.isOriginal && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(item.content, actualIndex)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
