import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIGenerationStep {
  id: string;
  label: string;
  completed: boolean;
  progress: number;
}

interface AIGenerationProgressProps {
  onComplete?: () => void;
}

export function AIGenerationProgress({ onComplete }: AIGenerationProgressProps) {
  const [steps, setSteps] = useState<AIGenerationStep[]>([
    { id: '1', label: 'Generating social media posts...', completed: false, progress: 0 },
    { id: '2', label: 'Creating blog post ideas...', completed: false, progress: 0 },
    { id: '3', label: 'Designing marketing strategy...', completed: false, progress: 0 },
    { id: '4', label: 'Finalizing your brand kit...', completed: false, progress: 0 },
  ]);

  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // Simulate progressive completion with realistic timings
    const timings = [
      { delay: 0, stepIndex: 0, progress: 25 },
      { delay: 3000, stepIndex: 0, progress: 100, complete: true },
      { delay: 4000, stepIndex: 1, progress: 25 },
      { delay: 6000, stepIndex: 1, progress: 100, complete: true },
      { delay: 7000, stepIndex: 2, progress: 25 },
      { delay: 9000, stepIndex: 2, progress: 100, complete: true },
      { delay: 10000, stepIndex: 3, progress: 25 },
      { delay: 11000, stepIndex: 3, progress: 100, complete: true },
    ];

    timings.forEach(({ delay, stepIndex, progress, complete }) => {
      setTimeout(() => {
        setSteps(prev => prev.map((step, i) => 
          i === stepIndex 
            ? { ...step, progress, completed: complete || false }
            : step
        ));
        
        if (complete) {
          setCurrentStepIndex(stepIndex + 1);
        }
        
        // Calculate overall progress
        const completedSteps = stepIndex + (complete ? 1 : progress / 100);
        setOverallProgress((completedSteps / steps.length) * 100);
      }, delay);
    });

    // Trigger completion callback
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 12000);
  }, [onComplete]);

  const allCompleted = steps.every(step => step.completed);

  return (
    <Card className="p-6 space-y-4 bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/20">
      <AnimatePresence mode="wait">
        {!allCompleted ? (
          <motion.div
            key="generating"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-lg">Creating Your AI Content</h3>
                  <span className="text-xs text-muted-foreground">
                    ~{Math.max(0, Math.ceil((12000 - (overallProgress * 120)) / 1000))}s remaining
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {steps[currentStepIndex]?.label || 'Processing...'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Progress value={overallProgress} className="h-2" />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">{Math.round(overallProgress)}%</p>
                <p className="text-xs text-muted-foreground">
                  This usually takes 10-15 seconds
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      step.completed 
                        ? 'bg-primary text-primary-foreground' 
                        : index === currentStepIndex
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.completed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : index === currentStepIndex ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-sm flex-1 ${
                      step.completed 
                        ? 'text-foreground font-medium' 
                        : index === currentStepIndex
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index === currentStepIndex && !step.completed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="ml-9"
                    >
                      <Progress value={step.progress} className="h-1" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="completed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 text-green-600"
          >
            <CheckCircle2 className="w-6 h-6" />
            <div className="flex-1">
              <h3 className="font-semibold">AI Content Generated!</h3>
              <p className="text-sm text-muted-foreground">All your content is ready to review</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
