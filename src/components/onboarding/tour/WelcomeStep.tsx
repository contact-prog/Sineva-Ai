import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface WelcomeStepProps {
  companyName?: string;
}

export function WelcomeStep({ companyName }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-6 py-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="relative"
      >
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-primary" />
        </div>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
        />
      </motion.div>

      <div className="space-y-3 max-w-xl">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl md:text-4xl font-bold"
        >
          Welcome to Sineva AI{companyName ? `, ${companyName}!` : '!'}
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-muted-foreground"
        >
          Your AI-powered marketing assistant is ready to transform how you create content
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground"
      >
        <span className="px-4 py-2 bg-accent/50 rounded-full">✨ Generate Graphics</span>
        <span className="px-4 py-2 bg-accent/50 rounded-full">🎥 Create Videos</span>
        <span className="px-4 py-2 bg-accent/50 rounded-full">✍️ Write Content</span>
        <span className="px-4 py-2 bg-accent/50 rounded-full">📅 Schedule Posts</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-muted-foreground"
      >
        Let me show you what you can do...
      </motion.p>
    </div>
  );
}
