import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, TrendingUp, Users, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const SocialProof = () => {
  const [stats, setStats] = useState({
    users: 0,
    campaigns: 0,
    generated: 0,
  });

  useEffect(() => {
    // Animate counter
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      setStats({
        users: Math.floor((10000 / steps) * step),
        campaigns: Math.floor((50000 / steps) * step),
        generated: Math.floor((1000000 / steps) * step),
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Marketing Director',
      company: 'TechCorp',
      content:
        'Sineva AI transformed our marketing workflow. We\'ve 10x\'d our content output while maintaining quality.',
      rating: 5,
      avatar: 'SJ',
    },
    {
      name: 'Michael Chen',
      role: 'Founder',
      company: 'GrowthLabs',
      content:
        'The AI-powered automation saved us 40+ hours per week. Best investment we\'ve made for our marketing.',
      rating: 5,
      avatar: 'MC',
    },
    {
      name: 'Emily Rodriguez',
      role: 'CMO',
      company: 'Innovate Inc',
      content:
        'From graphics to videos to complete campaigns - all generated with incredible quality. Simply amazing.',
      rating: 5,
      avatar: 'ER',
    },
  ];

  const statsData = [
    { icon: Users, label: 'Active Users', value: stats.users.toLocaleString() + '+', color: 'text-primary' },
    { icon: TrendingUp, label: 'Campaigns Created', value: stats.campaigns.toLocaleString() + '+', color: 'text-accent' },
    { icon: Zap, label: 'Assets Generated', value: stats.generated.toLocaleString() + '+', color: 'text-secondary' },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="mb-6">
            Trusted by <span className="gradient-text">Growing Businesses</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of companies already using AI to dominate their marketing
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20"
        >
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ scale: 0.8 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-border/50 hover-lift hover-glow">
                  <CardContent className="p-8 text-center">
                    <Icon className={`w-12 h-12 mx-auto mb-4 ${stat.color}`} />
                    <div className="text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                    <div className="text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
            >
              <Card className="border-border/50 hover-lift h-full">
                <CardContent className="p-6">
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                    ))}
                  </div>

                  {/* Content */}
                  <p className="text-muted-foreground mb-6 leading-relaxed">"{testimonial.content}"</p>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                        {testimonial.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {testimonial.role} at {testimonial.company}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
