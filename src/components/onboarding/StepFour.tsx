import { OnboardingData, MARKETING_GOALS, MARKETING_CHANNELS } from '@/types/onboarding';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StepFourProps {
  data: Partial<OnboardingData>;
  onChange: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
}

export function StepFour({ data, onChange, onNext }: StepFourProps) {
  const toggleGoal = (goal: string) => {
    const currentGoals = data.goals || [];
    const newGoals = currentGoals.includes(goal)
      ? currentGoals.filter(g => g !== goal)
      : [...currentGoals, goal];
    onChange({ goals: newGoals });
  };

  const toggleChannel = (channel: string) => {
    const currentChannels = data.currentChannels || [];
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];
    onChange({ currentChannels: newChannels });
  };

  const formatBudget = (value: number) => {
    if (value >= 50000) return '$50,000+';
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Marketing Goals</h2>
        <p className="text-muted-foreground">
          Tell us about your marketing objectives and resources
        </p>
      </div>

      <div className="space-y-8">
        {/* Marketing Goals */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold">What are your primary goals? *</Label>
          <p className="text-sm text-muted-foreground">Select all that apply</p>
          <div className="grid md:grid-cols-2 gap-3">
            {MARKETING_GOALS.map((goal, index) => {
              const isSelected = data.goals?.includes(goal);
              return (
                <motion.button
                  key={goal}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => toggleGoal(goal)}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all',
                    'hover:shadow-md hover:-translate-y-0.5',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    className="pointer-events-none"
                  />
                  <span className={cn(
                    'font-medium text-sm',
                    isSelected && 'text-primary'
                  )}>
                    {goal}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Label htmlFor="targetAudience" className="text-lg font-semibold">
            Who is your ideal customer?
          </Label>
          <Textarea
            id="targetAudience"
            placeholder="Describe your target audience (e.g., small business owners, tech-savvy millennials, etc.)"
            value={data.targetAudience || ''}
            onChange={(e) => onChange({ targetAudience: e.target.value })}
            rows={3}
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground">
            {data.targetAudience?.length || 0}/300 characters
          </p>
        </div>

        {/* Monthly Budget */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold">Monthly Marketing Budget</Label>
          <Card className="p-6 bg-muted/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Budget Range</span>
                <span className="text-2xl font-bold text-primary">
                  {formatBudget(data.monthlyBudget || 5000)}
                </span>
              </div>
              <Slider
                value={[data.monthlyBudget || 5000]}
                onValueChange={([value]) => onChange({ monthlyBudget: value })}
                min={0}
                max={50000}
                step={500}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$0</span>
                <span>$10k</span>
                <span>$25k</span>
                <span>$50k+</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Current Channels */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold">Current Marketing Channels</Label>
          <p className="text-sm text-muted-foreground">
            What channels are you currently using?
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {MARKETING_CHANNELS.map((channel, index) => {
              const isSelected = data.currentChannels?.includes(channel);
              return (
                <motion.button
                  key={channel}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => toggleChannel(channel)}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all',
                    'hover:shadow-md hover:-translate-y-0.5',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    className="pointer-events-none"
                  />
                  <span className={cn(
                    'font-medium text-sm',
                    isSelected && 'text-primary'
                  )}>
                    {channel}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
