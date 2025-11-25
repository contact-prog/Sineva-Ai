import { BusinessStage } from '@/types/onboarding';
import { Sparkles, Building, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StepOneProps {
  value?: BusinessStage;
  onChange: (stage: BusinessStage) => void;
  onNext: () => void;
}

const stages = [
  {
    value: 'starting_fresh' as BusinessStage,
    icon: Sparkles,
    title: 'Starting Fresh',
    description: 'New business, building from scratch',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    value: 'already_running' as BusinessStage,
    icon: Building,
    title: 'Already Running',
    description: 'Have an existing business with online presence',
    color: 'from-purple-500 to-pink-500',
  },
  {
    value: 'ready_to_scale' as BusinessStage,
    icon: Rocket,
    title: 'Ready to Scale',
    description: 'Established business, want to accelerate growth',
    color: 'from-orange-500 to-red-500',
  },
];

export function StepOne({ value, onChange, onNext }: StepOneProps) {
  const handleSelect = (stage: BusinessStage) => {
    onChange(stage);
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Welcome to Sineva AI
        </h1>
        <p className="text-lg text-muted-foreground">
          Let's start by understanding your business stage
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isSelected = value === stage.value;

          return (
            <motion.button
              key={stage.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleSelect(stage.value)}
              className={cn(
                'relative group p-8 rounded-2xl border-2 transition-all duration-300',
                'hover:shadow-2xl hover:-translate-y-2',
                'focus:outline-none focus:ring-4 focus:ring-primary/20',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-xl scale-105'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              <div className={cn(
                'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity',
                'bg-gradient-to-br',
                stage.color
              )} />

              <div className="relative space-y-4">
                <div className={cn(
                  'w-16 h-16 mx-auto rounded-2xl flex items-center justify-center',
                  'bg-gradient-to-br transition-transform group-hover:scale-110',
                  stage.color
                )}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-bold">{stage.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {stage.description}
                </p>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center"
                  >
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
