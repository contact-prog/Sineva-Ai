import { Card } from '@/components/ui/card';
import { Check, X } from 'lucide-react';

const ComparisonSection = () => {
  const features = [
    { feature: 'Natural language interface', sineva: true, traditional: false },
    { feature: 'Multiple agents working together', sineva: true, traditional: false },
    { feature: 'Automated workflow orchestration', sineva: true, traditional: false },
    { feature: 'Context sharing across services', sineva: true, traditional: true },
    { feature: 'Learning curve', sineva: 'Minutes', traditional: 'Weeks' },
    { feature: 'Manual tool switching', sineva: false, traditional: true },
    { feature: 'Unified pricing', sineva: true, traditional: false },
  ];

  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">Why Choose Sineva AI?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See how Sineva's AI-first approach compares to traditional marketing tools
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-6 font-bold text-lg">Feature</th>
                  <th className="text-center p-6 font-bold text-lg text-primary">Sineva AI</th>
                  <th className="text-center p-6 font-bold text-lg text-muted-foreground">Traditional Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {features.map((item, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="p-6 font-medium">{item.feature}</td>
                    <td className="p-6 text-center">
                      {typeof item.sineva === 'boolean' ? (
                        item.sineva ? (
                          <Check className="h-6 w-6 text-primary mx-auto" />
                        ) : (
                          <X className="h-6 w-6 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className="text-primary font-semibold">{item.sineva}</span>
                      )}
                    </td>
                    <td className="p-6 text-center">
                      {typeof item.traditional === 'boolean' ? (
                        item.traditional ? (
                          <Check className="h-6 w-6 text-success mx-auto" />
                        ) : (
                          <X className="h-6 w-6 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className="text-muted-foreground font-semibold">{item.traditional}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default ComparisonSection;
