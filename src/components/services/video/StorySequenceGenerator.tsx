import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Film } from 'lucide-react';
import { StoryInputStep } from './steps/StoryInputStep';
import { StoryCustomizeStep, StoryFormData } from './steps/StoryCustomizeStep';
import { StoryPlatformsStep } from './steps/StoryPlatformsStep';
import { StoryGenerateStep } from './steps/StoryGenerateStep';
import { StepIndicator } from './StepIndicator';

interface StorySequenceGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StorySequenceGenerator({ isOpen, onClose }: StorySequenceGeneratorProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<StoryFormData>({
    storyInput: '',
    duration: 60,
    style: 'narrative',
    platforms: [],
    includeVoiceover: false,
    includeMusic: false,
    includeLogo: false,
    videoQuality: 'standard',
  });

  const updateFormData = (updates: Partial<StoryFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      storyInput: '',
      duration: 60,
      style: 'narrative',
      platforms: [],
      includeVoiceover: false,
      includeMusic: false,
      includeLogo: false,
      videoQuality: 'standard',
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Film className="w-6 h-6 text-primary" />
            Story Sequence Generator
          </DialogTitle>
          <DialogDescription>
            Create a multi-scene video story with AI-generated scenes, voiceover, and music
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-6 px-4">
          <StepIndicator number={1} label="Story Input" active={step === 1} completed={step > 1} />
          <div className="flex-1 h-0.5 bg-border mx-2" />
          <StepIndicator number={2} label="Customize" active={step === 2} completed={step > 2} />
          <div className="flex-1 h-0.5 bg-border mx-2" />
          <StepIndicator number={3} label="Platforms" active={step === 3} completed={step > 3} />
          <div className="flex-1 h-0.5 bg-border mx-2" />
          <StepIndicator number={4} label="Generate" active={step === 4} completed={false} />
        </div>

        {/* Step Content */}
        <div className="px-2">
        {step === 1 && (
          <StoryInputStep 
            storyInput={formData.storyInput}
            aspectRatio={formData.aspectRatio || '16:9'}
            updateStoryInput={(value) => updateFormData({ storyInput: value })}
            updateAspectRatio={(value) => updateFormData({ aspectRatio: value })}
            onNext={() => setStep(2)}
          />
        )}
          {step === 2 && (
            <StoryCustomizeStep 
              formData={formData}
              updateFormData={updateFormData}
              onNext={() => setStep(3)} 
              onBack={() => setStep(1)} 
            />
          )}
          {step === 3 && (
            <StoryPlatformsStep 
              formData={formData}
              updateFormData={updateFormData}
              onNext={() => setStep(4)} 
              onBack={() => setStep(2)} 
            />
          )}
          {step === 4 && (
            <StoryGenerateStep 
              formData={formData}
              onBack={() => setStep(3)}
              onComplete={handleClose}
              previewMode={formData.previewMode}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
