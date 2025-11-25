import { OnboardingData, ScrapedData } from '@/types/onboarding';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, RefreshCw, Edit, ExternalLink, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BrandIntelligenceDisplay } from './BrandIntelligenceDisplay';

interface ScrapedDataReviewProps {
  scrapedData: ScrapedData;
  formData: Partial<OnboardingData>;
  onAccept: () => void;
  onRescrape: () => void;
  onChange: (data: Partial<OnboardingData>) => void;
}

export function ScrapedDataReview({ 
  scrapedData, 
  formData,
  onAccept, 
  onRescrape,
  onChange 
}: ScrapedDataReviewProps) {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Review Your Business Profile</h2>
          <p className="text-muted-foreground mt-1">
            We've extracted this information from your website
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onRescrape} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Re-scan Website
          </Button>
          <Button onClick={onAccept} className="gap-2">
            <Check className="w-4 h-4" />
            Accept & Continue
          </Button>
        </div>
      </div>

      {/* Core Business Information Card */}
      <Card className="p-6 space-y-4 border-2">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Company Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Company Name *</label>
            <Input
              value={formData.companyName || ''}
              onChange={(e) => onChange({ companyName: e.target.value })}
              placeholder="Enter company name"
            />
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Industry *</label>
            <Input
              value={formData.industry || ''}
              onChange={(e) => onChange({ industry: e.target.value })}
              placeholder="Enter your industry"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Business Description *</label>
          <textarea
            className="w-full min-h-[80px] p-3 border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            value={formData.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Brief description of your business"
          />
        </div>
      </Card>

      {/* Visual Brand Assets - Always show if we have logo OR colors */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold">Brand Assets</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Logo Section - Always show, with fallback */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium">Company Logo</p>
            {scrapedData.logoUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg bg-muted/30 p-4">
                  <img 
                    src={scrapedData.logoUrl} 
                    alt={`${formData.companyName || 'Company'} logo`}
                    className="max-h-20 max-w-full object-contain"
                    onError={(e) => {
                      console.error('Logo failed to load:', scrapedData.logoUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onChange({ logoUrl: scrapedData.logoUrl })}
                  className="w-full"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Apply Logo to Brand Kit
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground text-center">No logo detected</p>
              </div>
            )}
          </div>

          {/* Brand Colors */}
          {scrapedData.colors && (scrapedData.colors.primary || scrapedData.colors.secondary || scrapedData.colors.accent) && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Brand Colors</p>
              <div className="grid grid-cols-3 gap-3">
                {scrapedData.colors.primary && (
                  <div className="space-y-2">
                    <div 
                      className="w-full h-16 rounded-lg border-2 shadow-sm"
                      style={{ backgroundColor: scrapedData.colors.primary }}
                    />
                    <p className="text-[10px] text-center text-muted-foreground">Primary</p>
                  </div>
                )}
                {scrapedData.colors.secondary && (
                  <div className="space-y-2">
                    <div 
                      className="w-full h-16 rounded-lg border-2 shadow-sm"
                      style={{ backgroundColor: scrapedData.colors.secondary }}
                    />
                    <p className="text-[10px] text-center text-muted-foreground">Secondary</p>
                  </div>
                )}
                {scrapedData.colors.accent && (
                  <div className="space-y-2">
                    <div 
                      className="w-full h-16 rounded-lg border-2 shadow-sm"
                      style={{ backgroundColor: scrapedData.colors.accent }}
                    />
                    <p className="text-[10px] text-center text-muted-foreground">Accent</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Brand Intelligence & Insights */}
      {scrapedData.brandIntelligence && (
        <Card className="p-6 space-y-4 bg-primary/5 border-primary/20">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Brand Analysis & Insights
          </h3>

          <div className="space-y-4">
            {/* Brand Voice */}
            {scrapedData.brandIntelligence.brandVoice && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Brand Voice & Tone</p>
                <div className="bg-background rounded-lg p-3 space-y-2">
                  <p className="text-sm"><span className="font-medium">Tone:</span> {scrapedData.brandIntelligence.brandVoice.tone}</p>
                  {scrapedData.brandIntelligence.brandVoice.characteristics && (
                    <div className="flex flex-wrap gap-2">
                      {scrapedData.brandIntelligence.brandVoice.characteristics.map((trait: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{trait}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Target Audience */}
            {scrapedData.brandIntelligence.targetAudience && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Target Audience</p>
                <div className="bg-background rounded-lg p-3 space-y-2 text-sm">
                  {scrapedData.brandIntelligence.targetAudience.demographics && (
                    <p><span className="font-medium">Demographics:</span> {scrapedData.brandIntelligence.targetAudience.demographics}</p>
                  )}
                  {scrapedData.brandIntelligence.targetAudience.psychographics && (
                    <p><span className="font-medium">Psychographics:</span> {scrapedData.brandIntelligence.targetAudience.psychographics}</p>
                  )}
                </div>
              </div>
            )}

            {/* Industry Position */}
            {scrapedData.brandIntelligence.industryAnalysis && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Market Position</p>
                <div className="bg-background rounded-lg p-3 space-y-2 text-sm">
                  <p><span className="font-medium">Category:</span> {scrapedData.brandIntelligence.industryAnalysis.category}</p>
                  <p><span className="font-medium">Position:</span> {scrapedData.brandIntelligence.industryAnalysis.marketPosition}</p>
                </div>
              </div>
            )}

            {/* Content Strategy Recommendation */}
            {scrapedData.brandIntelligence.contentStrategy && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Recommended Content Strategy</p>
                <div className="bg-background rounded-lg p-3 space-y-2 text-sm">
                  {scrapedData.brandIntelligence.contentStrategy.platforms && (
                    <div>
                      <span className="font-medium">Best Platforms:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {scrapedData.brandIntelligence.contentStrategy.platforms.map((platform: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{platform}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {scrapedData.brandIntelligence.contentStrategy.postingFrequency && (
                    <p><span className="font-medium">Frequency:</span> {scrapedData.brandIntelligence.contentStrategy.postingFrequency}</p>
                  )}
                </div>
              </div>
            )}

            {/* Brand Strengths */}
            {scrapedData.brandIntelligence.brandStrengths && scrapedData.brandIntelligence.brandStrengths.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Key Brand Strengths</p>
                <div className="flex flex-wrap gap-2">
                  {scrapedData.brandIntelligence.brandStrengths.slice(0, 5).map((strength: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">✓ {strength}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Optional Additional Details */}
      {(scrapedData.socialLinks?.length || scrapedData.services?.length) && (
        <Accordion type="multiple" className="space-y-2">
          {scrapedData.socialLinks && scrapedData.socialLinks.length > 0 && (
            <AccordionItem value="social" className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Social Links</span>
                  <Badge variant="outline" className="text-xs">{scrapedData.socialLinks.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-2">
                <div className="space-y-2">
                  {scrapedData.socialLinks.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary" className="capitalize text-xs">
                        {link.platform}
                      </Badge>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate flex-1 text-xs"
                      >
                        {link.url}
                      </a>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {scrapedData.services && scrapedData.services.length > 0 && (
            <AccordionItem value="services" className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Services</span>
                  <Badge variant="outline" className="text-xs">{scrapedData.services.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pt-2">
                <div className="flex flex-wrap gap-2">
                  {scrapedData.services.slice(0, 8).map((service, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{service}</Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      )}
    </div>
  );
}
