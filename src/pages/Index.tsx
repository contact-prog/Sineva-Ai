import Navigation from '@/components/landing/Navigation';
import LiveDemo from '@/components/landing/LiveDemo';
import WorkflowOrchestration from '@/components/landing/WorkflowOrchestration';
import StatsSection from '@/components/landing/StatsSection';
import ComparisonSection from '@/components/landing/ComparisonSection';
import PricingSection from '@/components/landing/PricingSection';
import TrustBar from '@/components/landing/TrustBar';
import FAQSection from '@/components/landing/FAQSection';
import Footer from '@/components/landing/Footer';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRight, Sparkles, Wand2, Video, FileText, Calendar, Share2, Target, Globe, Users, Check, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center space-y-8">
            <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-primary/20">
              <Sparkles className="h-4 w-4 mr-2 inline" />
              9 AI-Powered Marketing Services
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Just Talk.{" "}
              <span className="bg-gradient-to-r from-secondary via-accent-cyan to-secondary bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                Sineva Does Everything
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              No technical skills needed. Chat with our AI and watch as specialized agents handle design, video, content, social media, and more - all automatically.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button size="lg" className="text-lg px-8 py-6 group" onClick={() => navigate('/auth')}>
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => navigate('/app/chat')}>
                See How It Works
              </Button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>Free 100 credits</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>All services included</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Demo */}
      <LiveDemo />

      {/* Workflow Orchestration */}
      <WorkflowOrchestration />

      {/* Stats */}
      <StatsSection />

      {/* Services Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">Complete Marketing Suite</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to grow your business, powered by AI
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Wand2, title: "AI Graphics", desc: "Create stunning visuals for any platform", color: "from-blue-500 to-cyan-500" },
              { icon: Video, title: "AI Videos", desc: "Generate professional video content", color: "from-purple-500 to-pink-500" },
              { icon: FileText, title: "Content Writer", desc: "Write blogs, captions, and copy", color: "from-orange-500 to-red-500" },
              { icon: Calendar, title: "Content Calendar", desc: "Plan and schedule your content", color: "from-green-500 to-emerald-500" },
              { icon: Share2, title: "Social Media", desc: "Manage all your social platforms", color: "from-blue-500 to-indigo-500" },
              { icon: Target, title: "Ad Campaigns", desc: "Create and optimize ad campaigns", color: "from-red-500 to-pink-500" },
              { icon: Globe, title: "Website Builder", desc: "Build beautiful websites with AI", color: "from-violet-500 to-purple-500" },
              { icon: Users, title: "Lead CRM", desc: "Nurture and convert leads", color: "from-teal-500 to-cyan-500" },
              { icon: MessageSquare, title: "AI Chat", desc: "Your marketing co-pilot", color: "from-amber-500 to-orange-500" },
            ].map((service, i) => (
              <Card key={i} className="p-6 space-y-4 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <service.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">{service.title}</h3>
                <p className="text-muted-foreground">{service.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <ComparisonSection />

      {/* Pricing */}
      <PricingSection />

      {/* Trust Bar */}
      <TrustBar />

      {/* FAQ */}
      <FAQSection />

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary via-accent to-primary">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Ready to Transform Your Marketing?
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Join thousands of businesses using AI to scale their marketing efforts. Start free today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6 group" onClick={() => navigate('/auth')}>
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/20" onClick={() => navigate('/app/chat')}>
              Talk to AI Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
