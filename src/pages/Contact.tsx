import Navigation from '@/components/landing/Navigation';
import Footer from '@/components/landing/Footer';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MessageSquare, Phone, MapPin } from 'lucide-react';

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-6">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Us
            </Badge>
            
            <h1 className="text-5xl font-bold mb-6">
              Get in <span className="gradient-text">Touch</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="p-8">
              <form className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Name</label>
                  <Input placeholder="Your name" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input type="email" placeholder="your@email.com" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Input placeholder="How can we help?" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Message</label>
                  <Textarea placeholder="Tell us more..." rows={6} />
                </div>
                <Button className="w-full" size="lg">Send Message</Button>
              </form>
            </Card>

            {/* Contact Info */}
            <div className="space-y-6">
              {[
                { icon: Mail, title: 'Email', desc: 'support@sineva.ai', link: 'mailto:support@sineva.ai' },
                { icon: Phone, title: 'Phone', desc: '+1 (555) 123-4567', link: 'tel:+15551234567' },
                { icon: MapPin, title: 'Office', desc: 'San Francisco, CA 94103', link: '#' },
              ].map((item, i) => (
                <Card key={i} className="p-6 hover:shadow-lg transition-shadow">
                  <a href={item.link} className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  </a>
                </Card>
              ))}

              <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10">
                <h3 className="font-bold mb-2">Need immediate help?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Check out our Help Center for instant answers to common questions.
                </p>
                <Button variant="outline" className="w-full">Visit Help Center</Button>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
