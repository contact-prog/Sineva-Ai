import { motion } from 'framer-motion';
import { MessageSquare, Sparkles, Zap, Clock } from 'lucide-react';

export function ChatDemoStep() {
  const demoMessages = [
    { role: 'user', text: 'Create a social media post about our new product' },
    { role: 'ai', text: 'I\'d be happy to help! I can create posts optimized for Instagram, Facebook, LinkedIn, and Twitter. Would you like me to generate variations for each platform?' },
  ];

  const features = [
    {
      icon: Sparkles,
      title: 'Remembers Context',
      desc: 'Knows your brand, preferences, and history'
    },
    {
      icon: Zap,
      title: 'Suggests Next Steps',
      desc: 'Anticipates what you might need next'
    },
    {
      icon: Clock,
      title: 'Learns Over Time',
      desc: 'Gets smarter with each interaction'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl md:text-3xl font-bold">Your AI Marketing Brain</h2>
        <p className="text-muted-foreground">
          Chat naturally, like talking to a marketing expert who knows your brand
        </p>
      </div>

      {/* Demo Chat Interface */}
      <div className="bg-accent/30 rounded-2xl p-6 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <MessageSquare className="w-4 h-4" />
          <span>Example conversation</span>
        </div>

        {demoMessages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.3 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border'
              }`}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex gap-2 pt-2"
        >
          {['Schedule for Monday', 'Add to calendar', 'Create graphics'].map((suggestion, i) => (
            <span
              key={i}
              className="px-3 py-1.5 text-xs bg-background/50 rounded-full border border-border"
            >
              {suggestion}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="text-center space-y-2 p-4 rounded-lg bg-card border border-border"
          >
            <feature.icon className="w-6 h-6 text-primary mx-auto" />
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
