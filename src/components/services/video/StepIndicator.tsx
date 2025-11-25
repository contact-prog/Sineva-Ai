import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}

export function StepIndicator({ number, label, active, completed }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
          active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
          completed && "bg-primary text-primary-foreground",
          !active && !completed && "bg-muted text-muted-foreground"
        )}
      >
        {completed ? <Check className="w-5 h-5" /> : number}
      </div>
      <span className={cn(
        "text-xs font-medium",
        active && "text-foreground",
        !active && "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  );
}
