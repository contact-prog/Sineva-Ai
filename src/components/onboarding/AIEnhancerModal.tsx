import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIEnhancerModalProps {
  open: boolean;
  onClose: () => void;
  originalDescription: string;
  companyContext: string;
  onSelect: (enhanced: string) => void;
}

interface Variation {
  type: string;
  text: string;
}

export function AIEnhancerModal({ 
  open, 
  onClose, 
  originalDescription, 
  companyContext,
  onSelect 
}: AIEnhancerModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);

  const generateVariations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-description', {
        body: { 
          description: originalDescription,
          companyContext 
        },
      });

      if (error) throw error;

      if (data.success && data.variations) {
        setVariations(data.variations);
      }
    } catch (error) {
      console.error('Enhancement error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate variations. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && variations.length === 0) {
      generateVariations();
    }
    if (!newOpen) {
      onClose();
    }
  };

  const getVariationLabel = (type: string) => {
    switch (type) {
      case 'concise':
        return { title: 'Concise', desc: 'Short and punchy' };
      case 'detailed':
        return { title: 'Detailed', desc: 'Expanded with context' };
      case 'creative':
        return { title: 'Creative', desc: 'Unique storytelling angle' };
      default:
        return { title: type, desc: '' };
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI-Enhanced Descriptions</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card className="p-4 bg-muted/50">
            <p className="text-sm font-medium mb-1">Original:</p>
            <p className="text-sm text-muted-foreground">{originalDescription}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {originalDescription.split(' ').length} words
            </p>
          </Card>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating AI variations...
              </p>
            </div>
          ) : variations.length > 0 ? (
            <>
              <div className="space-y-4">
                {variations.map((variation, index) => {
                  const label = getVariationLabel(variation.type);
                  return (
                    <Card key={index} className="p-4 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{label.title}</p>
                          <p className="text-xs text-muted-foreground">{label.desc}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => onSelect(variation.text)}
                          className="gap-2"
                        >
                          <Check className="w-3 h-3" />
                          Use This
                        </Button>
                      </div>
                      <p className="text-sm mt-2">{variation.text}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {variation.text.split(' ').length} words
                      </p>
                    </Card>
                  );
                })}
              </div>

              <Button
                variant="outline"
                onClick={generateVariations}
                disabled={isLoading}
                className="w-full gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate Variations
              </Button>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
