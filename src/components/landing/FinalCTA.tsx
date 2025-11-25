import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FinalCTA = () => {
  const navigate = useNavigate();
  const benefits = [
    'No credit card required',
    '14-day free trial',
    'Cancel anytime',
    'Full feature access',
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Glass background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="absolute inset-0 backdrop-blur-3xl" />
      
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          {/* Glass Card Container */}
          <div className="glass-card border-primary/30 p-12 md:p-16 text-center hover:border-primary/50 transition-all duration-300">
            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <h2 className="mb-6">
                Ready to <span className="gradient-text">10x Your Marketing?</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                Join thousands of companies already using AI to dominate their markets. Start your free trial today.
              </p>
            </motion.div>

            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex flex-wrap justify-center gap-6 mb-12"
            >
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2 glass-effect px-4 py-2 rounded-full border border-primary/20">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{benefit}</span>
                </div>
              ))}
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 hover-glow text-lg px-12 py-7 group shadow-[0_0_30px_rgba(14,165,233,0.3)]"
                onClick={() => navigate('/auth')}
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Get started in less than 2 minutes
              </p>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="mt-12 pt-8 border-t border-primary/20 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <span className="text-primary">🔒</span>
                <span>Enterprise-grade security</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary">⚡</span>
                <span>99.9% uptime guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary">💬</span>
                <span>24/7 priority support</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
