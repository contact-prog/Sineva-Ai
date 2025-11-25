import { motion } from 'framer-motion';
import { Image, Video, FileText, Calendar, Sparkles } from 'lucide-react';

export function FeaturesStep() {
  const features = [
    {
      icon: Image,
      title: 'Graphics',
      desc: 'Create stunning visuals in seconds',
      color: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-500'
    },
    {
      icon: Video,
      title: 'Videos',
      desc: 'Generate marketing videos with AI',
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-500'
    },
    {
      icon: FileText,
      title: 'Content',
      desc: 'Write blog posts, captions, emails',
      color: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-500'
    },
    {
      icon: Calendar,
      title: 'Calendar',
      desc: 'Schedule across all platforms',
      color: 'from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-2xl md:text-3xl font-bold">Everything You Need</h2>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto">
          From ideation to publication, manage your entire marketing workflow in one place
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              delay: i * 0.1,
              type: "spring",
              stiffness: 260,
              damping: 20
            }}
            whileHover={{ scale: 1.02 }}
            className="group relative overflow-hidden rounded-xl bg-card border border-border p-4 transition-all hover:shadow-lg hover:border-primary/50"
          >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            
            <div className="relative space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent group-hover:bg-background transition-colors">
                  <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>

              {/* Mini Preview Animation */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                className="h-1 bg-gradient-to-r from-primary/50 to-primary rounded-full"
              />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center space-y-2"
      >
        <p className="text-sm text-muted-foreground">
          All powered by advanced AI that understands your brand
        </p>
      </motion.div>
    </div>
  );
}
