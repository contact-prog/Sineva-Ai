import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onStepClick: (step: number) => void;
}

const STEP_LABELS = [
  'Business Stage',
  'Business Basics',
  'Brand Identity',
  'Marketing Goals',
  'Review & Complete',
];

export function ProgressBar({ currentStep, totalSteps, onStepClick }: ProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="container max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
            const isCompleted = step < currentStep;
            const isCurrent = step === currentStep;
            const canClick = step <= currentStep;

            return (
              <div key={step} className="flex items-center flex-1">
                <button
                  onClick={() => canClick && onStepClick(step)}
                  disabled={!canClick}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'border-primary bg-primary/10 text-primary',
                    !isCompleted && !isCurrent && 'border-muted bg-background text-muted-foreground',
                    canClick && 'cursor-pointer hover:scale-110',
                    !canClick && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="font-semibold">{step}</span>
                  )}
                </button>
                
                {step < totalSteps && (
                  <div className="flex-1 h-1 mx-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-500 bg-primary',
                        step < currentStep ? 'w-full' : 'w-0'
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex-1 text-center">
              <p className={cn(
                'text-xs font-medium transition-colors',
                i + 1 === currentStep && 'text-primary',
                i + 1 < currentStep && 'text-muted-foreground',
                i + 1 > currentStep && 'text-muted-foreground/50'
              )}>
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
