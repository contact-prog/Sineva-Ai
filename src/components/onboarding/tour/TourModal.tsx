import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TourModalProps {
  open: boolean;
  currentStep: number;
  totalSteps: number;
  children: React.ReactNode;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
  nextLabel?: string;
}

export function TourModal({
  open,
  currentStep,
  totalSteps,
  children,
  onNext,
  onBack,
  onSkip,
  canGoBack,
  canGoNext,
  nextLabel = "Next"
}: TourModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onSkip()}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] p-0 gap-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Content Area */}
        <div className="relative flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="p-6 md:p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="border-t bg-muted/30 p-4 md:p-6">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={onBack}
              disabled={!canGoBack}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                canGoBack
                  ? "text-foreground hover:bg-accent"
                  : "text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              ← Back
            </button>

            {/* Progress Dots */}
            <div className="flex gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {}}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    i === currentStep
                      ? "bg-primary w-8"
                      : i < currentStep
                      ? "bg-primary/50"
                      : "bg-border"
                  )}
                />
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={onNext}
              disabled={!canGoNext}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-medium transition-all",
                canGoNext
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg active:scale-95"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {nextLabel} →
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
