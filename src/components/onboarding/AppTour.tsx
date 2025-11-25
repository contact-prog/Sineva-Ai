import { useState, useEffect } from 'react';
import { TourModal } from './tour/TourModal';
import { WelcomeStep } from './tour/WelcomeStep';
import { ChatDemoStep } from './tour/ChatDemoStep';
import { FeaturesStep } from './tour/FeaturesStep';
import { SamplesStep } from './tour/SamplesStep';
import { ReadyStep } from './tour/ReadyStep';

interface AppTourProps {
  companyName?: string;
  onComplete: (destination: string) => void;
  onSkip: () => void;
}

export function AppTour({ companyName, onComplete, onSkip }: AppTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);
  const [samplesGenerated, setSamplesGenerated] = useState(false);
  const totalSteps = 5;

  // Trigger sample generation when reaching step 3 (samples step)
  useEffect(() => {
    if (currentStep === 3 && !samplesGenerated && !isGeneratingSamples) {
      setIsGeneratingSamples(true);
      // Simulate generation time, actual generation happens in background
      setTimeout(() => {
        setIsGeneratingSamples(false);
        setSamplesGenerated(true);
      }, 3000);
    }
  }, [currentStep, samplesGenerated, isGeneratingSamples]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSelectDestination = (path: string) => {
    onComplete(path);
  };

  const canGoNext = currentStep < totalSteps - 1 && 
    (currentStep !== 3 || samplesGenerated); // Can't skip samples step until done

  const nextLabel = currentStep === totalSteps - 1 ? 'Finish' : 'Next';

  return (
    <TourModal
      open={true}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={onSkip}
      canGoBack={currentStep > 0}
      canGoNext={canGoNext}
      nextLabel={nextLabel}
    >
      {currentStep === 0 && <WelcomeStep companyName={companyName} />}
      {currentStep === 1 && <ChatDemoStep />}
      {currentStep === 2 && <FeaturesStep />}
      {currentStep === 3 && (
        <SamplesStep 
          isGenerating={isGeneratingSamples}
          samplesGenerated={samplesGenerated}
        />
      )}
      {currentStep === 4 && <ReadyStep onSelectDestination={handleSelectDestination} />}
    </TourModal>
  );
}
