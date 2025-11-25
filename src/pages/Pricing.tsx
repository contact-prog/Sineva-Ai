import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import PricingSection from '@/components/landing/PricingSection';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-7xl text-center mb-12">
          <Badge variant="outline" className="mb-6">
            <Sparkles className="h-4 w-4 mr-2" />
            Pricing Plans
          </Badge>
          
          <h1 className="text-5xl font-bold mb-6">
            Choose the Perfect Plan for{' '}
            <span className="gradient-text">Your Business</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start with a free trial. Scale as you grow. All plans include access to all 9 AI agents.
          </p>
        </div>

        <PricingSection />
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
