import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Rocket, Wand2, TrendingUp } from 'lucide-react';

const HowItWorks = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.8, 1, 1, 0.8]);

  const steps = [
    {
      icon: Rocket,
      number: '01',
      title: 'Quick Setup',
      description:
        'Tell us about your business and goals. Our AI analyzes your needs and sets up your complete marketing system in minutes.',
      color: 'from-primary to-accent',
    },
    {
      icon: Wand2,
      number: '02',
      title: 'AI Does the Work',
      description:
        'Watch as AI creates stunning graphics, videos, content, and manages your campaigns automatically across all channels.',
      color: 'from-accent to-secondary',
    },
    {
      icon: TrendingUp,
      number: '03',
      title: 'Watch Growth Happen',
      description:
        'Track real-time performance, get AI-powered insights, and scale your marketing effortlessly with intelligent automation.',
      color: 'from-secondary to-success',
    },
  ];

  return (
    <section id="how-it-works" ref={containerRef} className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-accent rounded-full blur-3xl" />
      </div>

      <motion.div className="container mx-auto px-6" style={{ opacity, scale }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="mb-6">
            From Zero to <span className="gradient-text">Marketing Hero</span>
            <br />
            in 3 Simple Steps
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start generating results in minutes, not months
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
          {/* Connection Lines (Desktop) */}
          <div className="hidden md:block absolute top-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-secondary opacity-30" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                <div className="text-center">
                  {/* Number */}
                  <motion.div
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full glass-effect mb-6 relative"
                    whileHover={{ scale: 1.1 }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-20 rounded-full`} />
                    <span className="text-3xl font-bold gradient-text">{step.number}</span>
                  </motion.div>

                  {/* Icon */}
                  <motion.div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br ${step.color} mb-6`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>

                {/* Arrow (Mobile) */}
                {index < steps.length - 1 && (
                  <div className="md:hidden flex justify-center my-8">
                    <motion.div
                      animate={{ y: [0, 10, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-accent"
                    >
                      ↓
                    </motion.div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
};

export default HowItWorks;
