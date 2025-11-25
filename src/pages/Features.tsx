import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Wand2, Video, FileText, Calendar, Share2, Target, Globe, Users, MessageSquare } from 'lucide-react';

const Features = () => {
  const features = [
    { icon: Wand2, title: 'AI Graphics', desc: 'Create stunning visuals for any platform with AI-powered design', features: ['Platform-optimized sizes', 'Brand kit integration', 'Logo placement', 'A/B test variations'] },
    { icon: Video, title: 'AI Videos', desc: 'Generate professional video content in minutes', features: ['Multiple video formats', 'Auto-captions', 'Music & effects', 'Export to all platforms'] },
    { icon: FileText, title: 'Content Writer', desc: 'Write blogs, captions, and copy that converts', features: ['SEO optimization', 'Multiple formats', 'Brand voice matching', 'Plagiarism-free'] },
    { icon: Calendar, title: 'Content Calendar', desc: 'Plan and schedule your content strategy', features: ['Visual calendar', 'Auto-scheduling', 'Content themes', 'Multi-platform'] },
    { icon: Share2, title: 'Social Media', desc: 'Manage all your social platforms in one place', features: ['Auto-posting', 'Analytics tracking', 'Engagement insights', 'Hashtag suggestions'] },
    { icon: Target, title: 'Ad Campaigns', desc: 'Create and optimize ad campaigns automatically', features: ['A/B testing', 'Budget optimization', 'Conversion tracking', 'Platform targeting'] },
    { icon: Globe, title: 'Website Builder', desc: 'Build beautiful websites with AI assistance', features: ['Drag & drop', 'Responsive design', 'SEO ready', 'Fast hosting'] },
    { icon: Users, title: 'Lead CRM', desc: 'Nurture and convert leads automatically', features: ['Lead scoring', 'Auto follow-ups', 'Pipeline management', 'Email automation'] },
    { icon: MessageSquare, title: 'AI Chat', desc: 'Your 24/7 marketing co-pilot', features: ['Natural conversations', 'Multi-agent coordination', 'Context awareness', 'Smart suggestions'] },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-6">
              All Features
            </Badge>
            
            <h1 className="text-5xl font-bold mb-6">
              Everything You Need to{' '}
              <span className="gradient-text">Dominate Marketing</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Nine specialized AI agents working together to handle every aspect of your marketing.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Card key={i} className="p-6 hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{feature.desc}</p>
                <ul className="space-y-2">
                  {feature.features.map((item, j) => (
                    <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Features;
