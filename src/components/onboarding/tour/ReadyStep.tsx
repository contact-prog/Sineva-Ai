import { motion } from 'framer-motion';
import { MessageSquare, Image, Video, LayoutDashboard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReadyStepProps {
  onSelectDestination: (path: string) => void;
}

export function ReadyStep({ onSelectDestination }: ReadyStepProps) {
  const destinations = [
    {
      icon: MessageSquare,
      title: 'Chat with AI',
      desc: 'Start a conversation',
      path: '/app/chat',
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-500'
    },
    {
      icon: Image,
      title: 'Create a Graphic',
      desc: 'Design your first visual',
      path: '/app/graphics',
      color: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-500'
    },
    {
      icon: Video,
      title: 'Generate a Video',
      desc: 'Make a marketing video',
      path: '/app/videos',
      color: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-500'
    },
    {
      icon: LayoutDashboard,
      title: 'View Dashboard',
      desc: 'See your overview',
      path: '/app/dashboard',
      color: 'from-orange-500/20 to-red-500/20',
      iconColor: 'text-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Confetti Effect */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="text-center space-y-3"
      >
        <div className="relative inline-block">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                x: Math.cos((i / 8) * Math.PI * 2) * 60,
                y: Math.sin((i / 8) * Math.PI * 2) * 60
              }}
              transition={{ duration: 1, delay: 0.2 }}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-primary"
            />
          ))}
        </div>

        <h2 className="text-2xl md:text-3xl font-bold">You're All Set!</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Your AI marketing assistant is ready. Where would you like to start?
        </p>
      </motion.div>

      {/* Destination Grid */}
      <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {destinations.map((dest, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            <Button
              onClick={() => onSelectDestination(dest.path)}
              variant="outline"
              className="w-full h-auto p-4 group relative overflow-hidden hover:border-primary/50 transition-all"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${dest.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              
              <div className="relative flex items-start gap-3 text-left w-full">
                <div className="p-2 rounded-lg bg-accent group-hover:bg-background transition-colors">
                  <dest.icon className={`w-5 h-5 ${dest.iconColor}`} />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold">{dest.title}</h3>
                  <p className="text-sm text-muted-foreground">{dest.desc}</p>
                </div>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center space-y-2"
      >
        <p className="text-sm text-muted-foreground">
          💡 Tip: Check out the Gallery to see your sample content
        </p>
      </motion.div>
    </div>
  );
}
