import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquare, Brain, Users, Zap, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const WorkflowOrchestration = () => {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const steps = [
    {
      icon: MessageSquare,
      title: 'User Input',
      description: 'You describe what you need in plain language',
      details: 'Simply chat with Sineva as you would with a team member. No technical jargon or complex commands needed.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Brain,
      title: 'Brain Analyzes',
      description: 'Sineva Brain parses your request and identifies required actions',
      details: 'Advanced AI understands context, intent, and requirements. It breaks down complex requests into actionable tasks.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Users,
      title: 'Agent Selection',
      description: 'Brain determines which agents are needed',
      details: 'Automatically routes to the right specialists - design, video, content, social media, or multiple agents working together.',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Zap,
      title: 'Parallel Execution',
      description: 'Multiple agents work simultaneously',
      details: 'Agents collaborate in real-time, sharing context and outputs to deliver comprehensive results faster.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: CheckCircle,
      title: 'Delivery',
      description: 'Complete work delivered for your review',
      details: 'All outputs are organized and ready. Review, refine, or approve with simple conversational feedback.',
      color: 'from-violet-500 to-purple-500',
    },
  ];

  return (
    <section className="py-20 px-4 bg-muted/20">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">How Sineva Brain Orchestrates Your Workflow</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Click on any step to see the detailed process of how your request transforms into completed work
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-4 mb-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="h-full"
            >
              <Card
                className={`p-6 cursor-pointer transition-all h-full flex flex-col ${
                  activeStep === index ? 'ring-2 ring-primary bg-card' : 'hover:bg-card/50'
                }`}
                onClick={() => setActiveStep(activeStep === index ? null : index)}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 mx-auto`}>
                  <step.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-bold text-center mb-2 min-h-[3.5rem] flex items-center justify-center">{step.title}</h3>
                <p className="text-sm text-muted-foreground text-center flex-1">{step.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Details Panel */}
        {activeStep !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-8 bg-gradient-to-br from-card to-muted/20 border-primary/20">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${steps[activeStep].color} flex items-center justify-center flex-shrink-0`}>
                  {(() => {
                    const IconComponent = steps[activeStep].icon;
                    return <IconComponent className="h-8 w-8 text-white" />;
                  })()}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">{steps[activeStep].title}</h3>
                  <p className="text-lg text-muted-foreground mb-4">{steps[activeStep].description}</p>
                  <p className="text-foreground leading-relaxed">{steps[activeStep].details}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default WorkflowOrchestration;
