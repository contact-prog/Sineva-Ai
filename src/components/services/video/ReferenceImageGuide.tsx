import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ReferenceImageGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <HelpCircle className="w-4 h-4 mr-1" />
          How it works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reference Image Feature</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a character or product image to ensure visual consistency across all video scenes.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Character Consistency</h4>
                <p className="text-sm text-muted-foreground">
                  Your character will maintain the same appearance, clothing, and features throughout the entire video
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Product Showcase</h4>
                <p className="text-sm text-muted-foreground">
                  Perfect for product demos - your product stays recognizable in different scenes and angles
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Brand Consistency</h4>
                <p className="text-sm text-muted-foreground">
                  Maintain your brand's visual identity by using your logo, mascot, or product as reference
                </p>
              </div>
            </div>
          </div>

          <Alert className="border-primary/50 bg-primary/5">
            <AlertDescription className="text-sm">
              <strong>Premium+ Model:</strong> When you upload a reference image, we automatically use VEO 3.1 Preview model 
              ($0.15 per 5 seconds) which is optimized for image-to-video generation with superior visual consistency.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/30 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">Best Practices:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Use high-quality, well-lit images (1080p or higher)</li>
              <li>Ensure the subject is clearly visible and centered</li>
              <li>Avoid cluttered backgrounds in the reference image</li>
              <li>For characters, use a full-body or upper-body shot</li>
              <li>For products, show the product from multiple angles if possible</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
