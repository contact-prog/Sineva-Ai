import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Code, Users, HelpCircle, ArrowRight } from 'lucide-react';

const Resources = () => {
  const resources = [
    {
      icon: BookOpen,
      title: 'Documentation',
      desc: 'Complete guides and API references',
      link: '/docs',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Code,
      title: 'API Reference',
      desc: 'Integrate Sineva AI into your apps',
      link: '/api',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Users,
      title: 'Community',
      desc: 'Join thousands of AI marketers',
      link: '/community',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: HelpCircle,
      title: 'Help Center',
      desc: 'Get instant answers to your questions',
      link: '/help',
      color: 'from-orange-500 to-red-500'
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-6">
              Resources
            </Badge>
            
            <h1 className="text-5xl font-bold mb-6">
              Everything You Need to{' '}
              <span className="gradient-text">Get Started</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comprehensive resources to help you master Sineva AI and grow your business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {resources.map((resource, i) => (
              <Card key={i} className="p-8 hover:shadow-xl transition-all hover:-translate-y-1">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${resource.color} flex items-center justify-center mb-6`}>
                  <resource.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{resource.title}</h3>
                <p className="text-muted-foreground mb-6">{resource.desc}</p>
                <Button variant="outline" className="group">
                  Explore
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Card>
            ))}
          </div>

          {/* Quick Links */}
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-accent/10">
            <h2 className="text-2xl font-bold mb-6">Popular Topics</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                'Getting Started Guide',
                'AI Agent Overview',
                'Best Practices',
                'Integration Tutorials',
                'Video Walkthroughs',
                'FAQs',
              ].map((topic, i) => (
                <a key={i} href="#" className="text-sm hover:text-primary transition-colors flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  {topic}
                </a>
              ))}
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Resources;
