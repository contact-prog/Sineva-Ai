import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PricingSection = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      description: 'Perfect for solopreneurs testing the waters',
      features: [
        '50 Graphics per month',
        '10 Videos (30 sec each)',
        '100 AI Chat Messages',
        '50 Content Pieces',
        '200 Email Sends',
        '5 Social Accounts',
        'Unlimited Scheduling',
        'Basic Analytics',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Professional',
      price: '$79',
      period: '/month',
      description: 'For growing businesses and active marketers',
      features: [
        '200 Graphics per month',
        '40 Videos (mixed quality)',
        '500 AI Chat Messages',
        '200 Content Pieces',
        '1,000 Email Sends',
        '15 Social Accounts',
        'Priority Video Quality',
        'Advanced Analytics',
        'Brand Kit Management',
        'Bulk Operations',
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Business',
      price: '$199',
      period: '/month',
      description: 'For established businesses with high content needs',
      features: [
        '500 Graphics per month',
        '100 Videos (standard quality)',
        '2,000 AI Chat Messages',
        '500 Content Pieces',
        '5,000 Email Sends',
        'Unlimited Social Accounts',
        'Premium Video Quality',
        'Team Collaboration (5 users)',
        'Priority Support',
        'API Access',
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations with unlimited needs',
      features: [
        'Unlimited Everything',
        'All Quality Modes',
        'Unlimited Team Members',
        'Dedicated Account Manager',
        'Custom Integrations',
        'SLA Guarantees',
        'Advanced Security',
        'White-Label Options',
      ],
      cta: 'Contact Sales',
      popular: false,
    },
  ];

  return (
    <section className="py-20 px-4 relative">
      {/* Subtle background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      <div className="container mx-auto max-w-7xl relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          className="text-center space-y-4 mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold">
            Simple, <span className="gradient-text">Transparent Pricing</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free, scale as you grow. All plans include access to all 9 AI agents.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <Card
                className={`glass-card p-8 relative h-full flex flex-col hover-lift ${
                  plan.popular 
                    ? 'border-primary shadow-[0_0_30px_rgba(14,165,233,0.3)] scale-105' 
                    : 'border-primary/20'
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground shadow-[0_0_15px_rgba(14,165,233,0.5)]">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2 text-primary">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold gradient-text">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-primary hover:bg-primary/90 hover-glow' 
                      : 'border-primary/30 hover:border-primary'
                  }`}
                  variant={plan.popular ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => navigate('/auth')}
                >
                  {plan.cta}
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-muted-foreground mt-12 text-sm"
        >
          All plans include a 14-day free trial. No credit card required to start.
        </motion.p>
      </div>
    </section>
  );
};

export default PricingSection;
