import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, Image, FileText, Calendar } from 'lucide-react';

interface SamplesStepProps {
  isGenerating: boolean;
  samplesGenerated: boolean;
}

export function SamplesStep({ isGenerating, samplesGenerated }: SamplesStepProps) {
  const samples = [
    {
      icon: Image,
      title: 'Sample Graphic',
      desc: 'A branded social media post',
      color: 'text-purple-500'
    },
    {
      icon: FileText,
      title: 'Sample Blog Post',
      desc: 'Industry-relevant article',
      color: 'text-blue-500'
    },
    {
      icon: Calendar,
      title: 'Sample Schedule',
      desc: 'Pre-scheduled content',
      color: 'text-green-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold">
          {isGenerating ? 'Creating Sample Content...' : 'Your Sample Content is Ready!'}
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {isGenerating 
            ? 'We\'re generating examples based on your industry and brand. This takes just a moment...'
            : 'Explore these samples to see what Sineva AI can do for your business'
          }
        </p>
      </div>

      {/* Samples Grid */}
      <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {samples.map((sample, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative p-4 rounded-lg bg-card border border-border text-center space-y-2"
          >
            <div className="mx-auto w-10 h-10 rounded-full bg-accent flex items-center justify-center">
              <sample.icon className={`w-5 h-5 ${sample.color}`} />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">{sample.title}</h3>
              <p className="text-sm text-muted-foreground">{sample.desc}</p>
            </div>

            {/* Status Indicator */}
            <div className="absolute top-3 right-3">
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : samplesGenerated ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : null}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md mx-auto"
        >
          <div className="h-2 bg-accent rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 3, ease: "easeInOut" }}
              className="h-full bg-primary"
            />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Analyzing your brand and generating content...
          </p>
        </motion.div>
      )}

      {/* Success Message */}
      {samplesGenerated && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-full">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">All samples ready to explore!</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
