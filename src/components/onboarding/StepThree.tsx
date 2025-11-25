import { OnboardingData, BRAND_VOICES } from '@/types/onboarding';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StepThreeProps {
  data: Partial<OnboardingData>;
  onChange: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
}

export function StepThree({ data, onChange, onNext }: StepThreeProps) {
  const handleColorChange = (type: 'primary' | 'secondary' | 'accent', value: string) => {
    onChange({
      [`${type}Color`]: value,
    });
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Brand Identity</h2>
        <p className="text-muted-foreground">
          Define your brand's visual identity and personality
        </p>
      </div>

      <div className="space-y-6">
        {/* Brand Colors */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold">Brand Colors</Label>
          <div className="grid md:grid-cols-3 gap-4">
            {(['primary', 'secondary', 'accent'] as const).map((type) => (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: type === 'primary' ? 0 : type === 'secondary' ? 0.1 : 0.2 }}
                className="space-y-2"
              >
                <Label className="capitalize">{type} Color</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      value={data[`${type}Color`] || ''}
                      onChange={(e) => handleColorChange(type, e.target.value)}
                      placeholder="#000000"
                      className="pr-12"
                    />
                    <div
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded border-2 border-background shadow-sm cursor-pointer"
                      style={{ backgroundColor: data[`${type}Color`] || '#000000' }}
                      onClick={() => document.getElementById(`color-${type}`)?.click()}
                    />
                    <input
                      id={`color-${type}`}
                      type="color"
                      className="sr-only"
                      value={data[`${type}Color`] || '#000000'}
                      onChange={(e) => handleColorChange(type, e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {data.scrapedData?.colors && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Colors extracted from your website
            </p>
          )}
        </div>

        {/* Brand Voice */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold">Brand Voice</Label>
          <div className="grid md:grid-cols-3 gap-4">
            {BRAND_VOICES.map((voice, index) => {
              const isSelected = data.brandVoice === voice.value;
              return (
                <motion.button
                  key={voice.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onChange({ brandVoice: voice.value })}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-all',
                    'hover:shadow-lg hover:-translate-y-1',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <h4 className="font-semibold mb-1">{voice.label}</h4>
                  <p className="text-xs text-muted-foreground">
                    {voice.description}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <Label htmlFor="tagline" className="text-lg font-semibold">
            Tagline
          </Label>
          <Input
            id="tagline"
            placeholder="Your memorable tagline..."
            value={data.tagline || ''}
            onChange={(e) => onChange({ tagline: e.target.value })}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">
            {data.tagline?.length || 0}/100 characters
          </p>
        </div>
      </div>
    </div>
  );
}
