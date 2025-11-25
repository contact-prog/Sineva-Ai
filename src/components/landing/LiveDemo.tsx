import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Sparkles, Image, Video, Share2, MessageSquare, FileText, Target, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UseCase {
  title: string;
  request: string;
  steps: {
    icon: any;
    label: string;
    agent: string;
    color: string;
    bgColor: string;
    description: string;
  }[];
}

const LiveDemo = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedUseCase, setSelectedUseCase] = useState(0);

  const useCases: UseCase[] = [
    {
      title: 'Product Launch Campaign',
      request: '"Create a product launch campaign"',
      steps: [
        { 
          icon: Sparkles, 
          label: 'Understanding campaign requirements...', 
          agent: 'Sineva Brain', 
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          description: 'Analyzing your product launch needs and target audience'
        },
        { 
          icon: Image, 
          label: 'Generating product images and social graphics...', 
          agent: 'Design Studio', 
          color: 'text-accent',
          bgColor: 'bg-accent/10',
          description: 'Creating 15 platform-optimized graphics'
        },
        { 
          icon: Video, 
          label: 'Creating promotional video...', 
          agent: 'Video Studio', 
          color: 'text-secondary',
          bgColor: 'bg-secondary/10',
          description: 'Producing 30-second product showcase video'
        },
        { 
          icon: Share2, 
          label: 'Scheduling 15 posts across platforms...', 
          agent: 'Social Media', 
          color: 'text-accent-cyan',
          bgColor: 'bg-accent-cyan/10',
          description: 'Instagram, Facebook, LinkedIn, Twitter, TikTok'
        },
      ]
    },
    {
      title: 'Content Marketing Campaign',
      request: '"Create a month of blog content for my SaaS"',
      steps: [
        { 
          icon: Sparkles, 
          label: 'Analyzing content strategy...', 
          agent: 'Sineva Brain', 
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          description: 'Understanding your niche, audience, and SEO goals'
        },
        { 
          icon: FileText, 
          label: 'Writing 12 SEO-optimized blog posts...', 
          agent: 'Content Writer', 
          color: 'text-accent',
          bgColor: 'bg-accent/10',
          description: 'Complete with meta descriptions and keywords'
        },
        { 
          icon: Image, 
          label: 'Creating featured images for each post...', 
          agent: 'Design Studio', 
          color: 'text-secondary',
          bgColor: 'bg-secondary/10',
          description: 'Custom graphics matching your brand'
        },
        { 
          icon: Share2, 
          label: 'Scheduling social promotion...', 
          agent: 'Social Media', 
          color: 'text-accent-cyan',
          bgColor: 'bg-accent-cyan/10',
          description: '60 social posts promoting the content'
        },
      ]
    },
    {
      title: 'Ad Campaign Creation',
      request: '"Launch a Facebook and Google Ads campaign"',
      steps: [
        { 
          icon: Sparkles, 
          label: 'Analyzing ad strategy...', 
          agent: 'Sineva Brain', 
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          description: 'Determining audience, budget, and campaign goals'
        },
        { 
          icon: Target, 
          label: 'Creating ad copy variations...', 
          agent: 'Ad Manager', 
          color: 'text-accent',
          bgColor: 'bg-accent/10',
          description: '20 A/B test variations for each platform'
        },
        { 
          icon: Image, 
          label: 'Generating ad creatives...', 
          agent: 'Design Studio', 
          color: 'text-secondary',
          bgColor: 'bg-secondary/10',
          description: 'Multiple sizes and formats for all placements'
        },
        { 
          icon: Target, 
          label: 'Setting up campaigns and tracking...', 
          agent: 'Ad Manager', 
          color: 'text-accent-cyan',
          bgColor: 'bg-accent-cyan/10',
          description: 'Live campaigns with conversion tracking'
        },
      ]
    },
    {
      title: 'Website Redesign',
      request: '"Redesign my website with modern AI features"',
      steps: [
        { 
          icon: Sparkles, 
          label: 'Analyzing current site and goals...', 
          agent: 'Sineva Brain', 
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          description: 'Auditing UX, performance, and conversion paths'
        },
        { 
          icon: Globe, 
          label: 'Designing new pages and layouts...', 
          agent: 'Website Builder', 
          color: 'text-accent',
          bgColor: 'bg-accent/10',
          description: 'Modern, responsive design with AI chatbot'
        },
        { 
          icon: Image, 
          label: 'Creating all visual assets...', 
          agent: 'Design Studio', 
          color: 'text-secondary',
          bgColor: 'bg-secondary/10',
          description: 'Hero images, icons, and brand elements'
        },
        { 
          icon: FileText, 
          label: 'Writing optimized copy...', 
          agent: 'Content Writer', 
          color: 'text-accent-cyan',
          bgColor: 'bg-accent-cyan/10',
          description: 'SEO-friendly content for all pages'
        },
      ]
    }
  ];

  const currentUseCase = useCases[selectedUseCase];

  const handleDemo = () => {
    if (isRunning) return;
    setIsRunning(true);
    setCurrentStep(0);
    setCompletedSteps([]);

    currentUseCase.steps.forEach((_, index) => {
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, index]);
        if (index < currentUseCase.steps.length - 1) {
          setCurrentStep(index + 1);
        } else {
          setCurrentStep(-1);
          setTimeout(() => setIsRunning(false), 500);
        }
      }, (index + 1) * 2000);
    });
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentStep(-1);
    setCompletedSteps([]);
  };

  return (
    <section className="py-20 px-4 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-12">
          <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-primary/20 mb-4">
            <MessageSquare className="h-4 w-4 mr-2 inline" />
            Live Interactive Demo
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold">Watch Agents Work Together</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See how Sineva AI coordinates multiple agents for different marketing scenarios
          </p>
        </div>

        {/* Use Case Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {useCases.map((useCase, index) => (
            <button
              key={index}
              onClick={() => {
                if (!isRunning) {
                  setSelectedUseCase(index);
                  handleReset();
                }
              }}
              disabled={isRunning}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedUseCase === index
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 bg-card'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <p className="font-semibold text-sm">{useCase.title}</p>
            </button>
          ))}
        </div>

        <Card className="p-8 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="space-y-8">
            {/* User Request */}
            <div>
              <p className="text-sm text-muted-foreground mb-2 font-semibold">User Request:</p>
              <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-6 rounded-lg border border-border/50">
                <p className="text-foreground font-medium text-lg flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  {currentUseCase.request}
                </p>
              </div>
            </div>

            {/* Active Agents */}
            <div>
              <p className="text-sm text-muted-foreground mb-4 font-semibold">Active AI Agents:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {currentUseCase.steps.map((step, idx) => {
                  const isActive = currentStep >= idx || completedSteps.includes(idx);
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: isActive ? 1.05 : 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className={`p-4 text-center transition-all border ${
                        isActive ? step.bgColor + ' border-primary/30 shadow-lg' : 'border-border/30'
                      }`}>
                        <div className="flex flex-col items-center gap-2">
                          <step.icon className={`h-6 w-6 ${isActive ? step.color : 'text-muted-foreground'}`} />
                          <p className="text-sm font-medium">{step.agent}</p>
                          {isActive && (
                            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                              {completedSteps.includes(idx) ? '✓ Done' : 'Working'}
                            </Badge>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Execution Steps */}
            <div>
              <p className="text-sm text-muted-foreground mb-4 font-semibold">Execution Progress:</p>
              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  {currentUseCase.steps.map((step, index) => {
                    const isCompleted = completedSteps.includes(index);
                    const isActive = currentStep === index;
                    const isPending = !isCompleted && !isActive;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ 
                          opacity: isPending ? 0.4 : 1, 
                          x: 0,
                          scale: isActive ? 1.02 : 1
                        }}
                        transition={{ duration: 0.3 }}
                        className={`p-4 rounded-lg border transition-all ${
                          isCompleted ? 'bg-success/5 border-success/20' :
                          isActive ? step.bgColor + ' border-primary/30' :
                          'bg-muted/20 border-border/30'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            {isCompleted ? (
                              <CheckCircle2 className="h-6 w-6 text-success" />
                            ) : isActive ? (
                              <Loader2 className={`h-6 w-6 ${step.color} animate-spin`} />
                            ) : (
                              <div className="h-6 w-6 rounded-full border-2 border-muted flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">{index + 1}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold mb-1">{step.label}</p>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className={`text-xs ${step.color}`}>
                                {step.agent}
                              </Badge>
                              {isActive && (
                                <span className="text-xs text-muted-foreground animate-pulse">Processing...</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Demo Controls */}
            <div className="flex gap-4">
              <Button
                onClick={handleDemo}
                disabled={isRunning}
                className="flex-1 py-6 text-lg font-medium"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Running Demo...
                  </>
                ) : completedSteps.length === currentUseCase.steps.length ? (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Demo Complete!
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Start Live Demo
                  </>
                )}
              </Button>
              {(completedSteps.length > 0) && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="lg"
                  className="px-8"
                >
                  Reset
                </Button>
              )}
            </div>

            {completedSteps.length === currentUseCase.steps.length && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-primary/20"
              >
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2">Task Complete!</h3>
                <p className="text-muted-foreground">
                  All work completed and ready for review in under 2 minutes
                </p>
              </motion.div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
};

export default LiveDemo;
