import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import {
  Sparkles,
  Video,
  FileText,
  Globe,
  Target,
  Calendar,
  Users,
  Zap,
} from 'lucide-react';

const BentoFeatures = () => {
  const features = [
    {
      icon: Sparkles,
      title: 'AI Graphic Generator',
      description: 'Create stunning visuals, logos, and social media graphics in seconds',
      size: 'large',
    },
    {
      icon: Video,
      title: 'AI Video Generator',
      description: 'Generate professional videos with advanced AI models',
      size: 'large',
    },
    {
      icon: FileText,
      title: 'Content Generator',
      description: 'Write blogs, captions, and copy that converts',
      size: 'medium',
    },
    {
      icon: Globe,
      title: 'Website Builder',
      description: 'Build beautiful websites with AI assistance',
      size: 'medium',
    },
    {
      icon: Target,
      title: 'Ad Campaign Manager',
      description: 'Optimize and manage campaigns across platforms',
      size: 'medium',
    },
    {
      icon: Calendar,
      title: 'Social Media Scheduler',
      description: 'Plan and automate your social presence',
      size: 'medium',
    },
    {
      icon: Users,
      title: 'CRM & Lead Nurturing',
      description: 'Manage relationships and convert leads automatically',
      size: 'medium',
    },
    {
      icon: Zap,
      title: 'Smart Onboarding',
      description: 'Get started instantly with AI-powered setup',
      size: 'medium',
    },
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          className="text-center mb-16"
        >
          <h2 className="mb-6">
            Everything You Need to
            <br />
            <span className="gradient-text">Dominate Marketing</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            All-in-one platform with AI-powered tools for every marketing need
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isLarge = feature.size === 'large';
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className={`${isLarge ? 'lg:col-span-2' : ''}`}
              >
                <Card
                  className={`glass-card group relative overflow-hidden border-primary/20 hover:border-primary/50 transition-all duration-300 h-full ${
                    isLarge ? 'p-8' : 'p-6'
                  } hover-lift`}
                >
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-primary/5" />
                  </div>

                  <div className="relative z-10">
                    <div className={`inline-flex items-center justify-center rounded-xl bg-primary/10 border border-primary/20 p-3 mb-4 group-hover:border-primary/50 group-hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all duration-300`}>
                      <Icon className="w-6 h-6 text-primary" />
                    </div>

                    <h3 className={`font-bold mb-2 ${isLarge ? 'text-2xl' : 'text-xl'}`}>
                      {feature.title}
                    </h3>
                    <p className={`text-muted-foreground ${isLarge ? 'text-base' : 'text-sm'}`}>
                      {feature.description}
                    </p>

                    {isLarge && (
                      <div className="mt-6 text-sm font-medium text-primary group-hover:text-accent transition-colors">
                        Learn more →
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default BentoFeatures;
