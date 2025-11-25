import { motion } from 'framer-motion';
import { Users, Rocket, Heart, Zap } from 'lucide-react';

const StatsSection = () => {
  const stats = [
    { icon: Users, value: '50K+', label: 'Active Users', color: 'text-primary' },
    { icon: Rocket, value: '2M+', label: 'Projects Created', color: 'text-secondary' },
    { icon: Heart, value: '98%', label: 'Satisfaction Rate', color: 'text-accent' },
    { icon: Zap, value: '10x', label: 'Faster Delivery', color: 'text-accent-cyan' },
  ];

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className={`w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 ${stat.color}`}>
                <stat.icon className="h-8 w-8" />
              </div>
              <div className="text-4xl font-bold mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
