import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Sparkles, Target, Users, Zap } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Badge variant="outline" className="mb-6">
            <Sparkles className="h-4 w-4 mr-2" />
            About Sineva AI
          </Badge>
          
          <h1 className="text-5xl font-bold mb-6">
            We're Building the Future of{' '}
            <span className="gradient-text">Marketing Automation</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12">
            Sineva AI was founded with a simple mission: make professional marketing accessible to every business, regardless of size or budget.
          </p>

          <div className="prose prose-invert max-w-none mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Story</h2>
            <p className="text-muted-foreground mb-6">
              We started Sineva AI because we saw too many brilliant businesses struggle with marketing. They had amazing products but couldn't afford expensive agencies or didn't have time to learn complex tools.
            </p>
            <p className="text-muted-foreground mb-6">
              Our solution? An AI-powered platform where you simply tell us what you need, and our specialized agents take care of everything - from design to content, video to social media management.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {[
              { icon: Target, title: 'Our Mission', desc: 'Democratize professional marketing for businesses of all sizes' },
              { icon: Users, title: 'Our Team', desc: '50+ AI researchers, engineers, and marketing experts' },
              { icon: Zap, title: 'Our Impact', desc: '50K+ businesses automated, 2M+ projects delivered' },
              { icon: Sparkles, title: 'Our Vision', desc: 'AI that understands and executes your marketing vision perfectly' },
            ].map((item, i) => (
              <Card key={i} className="p-6">
                <item.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
