import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText, MessageSquare, Target, Check, Brain, Palette, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import type { ScrapedData } from '@/types/onboarding';

interface MagicRevealProps {
  data: {
    socialPosts: Array<{
      platform: string;
      caption: string;
      imageUrl?: string;
    }>;
    blogIdeas: string[];
    marketingPlan: {
      recommendedPlatforms: string[];
      postingFrequency: string;
      contentMix: {
        educational: number;
        promotional: number;
        entertaining: number;
      };
      bestPostingTimes: Array<{
        day: string;
        times: string[];
      }>;
      reasoning: string;
    };
    brandKit: {
      companyName: string;
      industry: string;
      colors: string[];
      logoUrl?: string;
      description?: string;
    };
  };
  onContinue: () => void;
  scrapedData?: ScrapedData | null;
}

export function MagicReveal({ data, onContinue, scrapedData }: MagicRevealProps) {
  // Debug: Log the scraped data to understand what we're receiving
  useEffect(() => {
    console.log('MagicReveal received scrapedData:', scrapedData);
    console.log('MagicReveal received data:', data);
  }, [scrapedData, data]);

  useEffect(() => {
    // Fire confetti on reveal
    const duration = 3000;
    const end = Date.now() + duration;

    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899']
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 mx-auto">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold">
            🎉 Your AI-Powered Content is Ready!
          </h1>
          <p className="text-xl text-muted-foreground">
            We analyzed <span className="font-semibold text-foreground">{data.brandKit.companyName}</span> and created:
          </p>
        </motion.div>

        {/* Scraped Brand Information */}
        {scrapedData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-2xl p-6 space-y-6"
          >
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="w-5 h-5 text-primary" />
              Extracted Brand Information
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Company Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Company Name</p>
                  <p className="font-semibold text-lg">{scrapedData.companyName}</p>
                </div>

                {scrapedData.tagline && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Tagline</p>
                    <p className="text-sm italic text-foreground/90">"{scrapedData.tagline}"</p>
                  </div>
                )}

                {scrapedData.description && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Description</p>
                    <p className="text-sm text-foreground/80">{scrapedData.description}</p>
                  </div>
                )}

                {scrapedData.industry && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Industry</p>
                    <Badge variant="secondary">{scrapedData.industry}</Badge>
                  </div>
                )}
              </div>

              {/* Contact & Location */}
              <div className="space-y-4">
                {(scrapedData.contactInfo?.email || scrapedData.contactInfo?.phone || scrapedData.contactInfo?.address) && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Contact Information</p>
                    <div className="space-y-1 text-sm">
                      {scrapedData.contactInfo.email && (
                        <p className="text-foreground/80">📧 {scrapedData.contactInfo.email}</p>
                      )}
                      {scrapedData.contactInfo.phone && (
                        <p className="text-foreground/80">📞 {scrapedData.contactInfo.phone}</p>
                      )}
                      {scrapedData.contactInfo.address && (
                        <p className="text-foreground/80">📍 {scrapedData.contactInfo.address}</p>
                      )}
                    </div>
                  </div>
                )}

                {scrapedData.businessHours && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Business Hours</p>
                    <p className="text-sm text-foreground/80">🕐 {scrapedData.businessHours}</p>
                  </div>
                )}

                {(scrapedData.location?.city || scrapedData.location?.state || scrapedData.location?.country) && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Location</p>
                    <p className="text-sm text-foreground/80">
                      {[scrapedData.location.city, scrapedData.location.state, scrapedData.location.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Services */}
            {scrapedData.services && scrapedData.services.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Services / Products</p>
                <div className="flex flex-wrap gap-2">
                  {scrapedData.services.map((service, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Social Links */}
            {scrapedData.socialLinks && scrapedData.socialLinks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Social Media</p>
                <div className="flex flex-wrap gap-2">
                  {scrapedData.socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
                    >
                      {link.platform}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Website Screenshots */}
            {(scrapedData.screenshots?.desktop || scrapedData.screenshots?.mobile) && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Website Preview</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {scrapedData.screenshots?.desktop && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Desktop View</p>
                      <img
                        src={scrapedData.screenshots.desktop}
                        alt={`${scrapedData.companyName} desktop website`}
                        className="w-full rounded-lg border border-border shadow-sm"
                        loading="lazy"
                      />
                    </div>
                  )}
                  {scrapedData.screenshots?.mobile && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Mobile View</p>
                      <img
                        src={scrapedData.screenshots.mobile}
                        alt={`${scrapedData.companyName} mobile website`}
                        className="w-full rounded-lg border border-border shadow-sm"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Brand Colors */}
            {scrapedData.colors && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Brand Colors</p>
                <div className="flex items-center gap-3">
                  {scrapedData.colors.primary && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-12 h-12 rounded-lg border border-border shadow-sm"
                        style={{ backgroundColor: scrapedData.colors.primary }}
                      />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Primary</p>
                        <p className="text-xs font-mono">{scrapedData.colors.primary}</p>
                      </div>
                    </div>
                  )}
                  {scrapedData.colors.secondary && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-12 h-12 rounded-lg border border-border shadow-sm"
                        style={{ backgroundColor: scrapedData.colors.secondary }}
                      />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Secondary</p>
                        <p className="text-xs font-mono">{scrapedData.colors.secondary}</p>
                      </div>
                    </div>
                  )}
                  {scrapedData.colors.accent && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-12 h-12 rounded-lg border border-border shadow-sm"
                        style={{ backgroundColor: scrapedData.colors.accent }}
                      />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase">Accent</p>
                        <p className="text-xs font-mono">{scrapedData.colors.accent}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card border border-destructive/30 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 text-destructive font-semibold mb-2">
              <XCircle className="w-5 h-5" />
              Missing Scraped Data
            </div>
            <p className="text-sm text-muted-foreground">
              We couldn't extract comprehensive brand information from your website. This might be due to:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
              <li>Missing SCREENSHOT_API_KEY or CLAUDE_API_KEY environment variables</li>
              <li>Website content protection or anti-scraping measures</li>
              <li>Network connectivity issues during the scraping process</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              Check the console logs for detailed error information.
            </p>
          </motion.div>
        )}

        {/* Social Media Posts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="w-5 h-5 text-primary" />
            {data.socialPosts.length} Social Media Posts
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {data.socialPosts.map((post, index) => (
              <div key={index} className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="text-xs font-medium text-primary uppercase">
                  {post.platform}
                </div>
                {post.imageUrl && (
                  <img src={post.imageUrl} alt="" className="w-full h-32 object-cover rounded-lg" />
                )}
                <p className="text-sm text-foreground/80 line-clamp-3">
                  {post.caption}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Blog Post Ideas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="w-5 h-5 text-primary" />
            Blog Post Ideas
          </div>
          <ul className="space-y-2">
            {data.blogIdeas.slice(0, 3).map((idea, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-foreground/80">
                <span className="text-primary mt-1">•</span>
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Marketing Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Target className="w-5 h-5 text-primary" />
            Your Personalized Marketing Plan
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Recommended Platforms:</p>
              <div className="flex flex-wrap gap-2">
                {data.marketingPlan.recommendedPlatforms.map((platform, index) => (
                  <span key={index} className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full">
                    {platform}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Posting Frequency:</p>
              <p className="text-sm font-medium">{data.marketingPlan.postingFrequency}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Content Mix:</p>
              <p className="text-sm">
                {data.marketingPlan.contentMix.educational}% Educational • {' '}
                {data.marketingPlan.contentMix.promotional}% Promotional • {' '}
                {data.marketingPlan.contentMix.entertaining}% Entertaining
              </p>
            </div>
          </div>
        </motion.div>

        {/* AI Brand Intelligence */}
        {scrapedData?.brandIntelligence && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-card border border-border rounded-2xl p-6 space-y-6"
          >
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Brain className="w-5 h-5 text-primary" />
              Claude AI Brand Intelligence Analysis
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Brand Voice */}
              {scrapedData.brandIntelligence?.brandVoice && (
                <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Brand Voice
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Tone:</span> {scrapedData.brandIntelligence.brandVoice.tone}
                    </p>
                    {scrapedData.brandIntelligence.brandVoice.characteristics?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Key Characteristics:</p>
                        <div className="flex flex-wrap gap-2">
                          {scrapedData.brandIntelligence.brandVoice.characteristics.map((trait, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {trait}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Target Audience */}
              {scrapedData.brandIntelligence?.targetAudience && (
                <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Target Audience
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Demographics</p>
                      <p className="text-sm text-foreground">
                        {scrapedData.brandIntelligence.targetAudience.demographics}
                      </p>
                    </div>
                    {scrapedData.brandIntelligence.targetAudience.psychographics && (
                      <div>
                        <p className="text-xs text-muted-foreground">Psychographics</p>
                        <p className="text-sm text-foreground">
                          {scrapedData.brandIntelligence.targetAudience.psychographics}
                        </p>
                      </div>
                    )}
                    {scrapedData.brandIntelligence.targetAudience.painPoints?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Pain Points</p>
                        <ul className="space-y-1 mt-1">
                          {scrapedData.brandIntelligence.targetAudience.painPoints.slice(0, 3).map((pain, index) => (
                            <li key={index} className="text-xs text-foreground/70 flex items-start gap-1">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{pain}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Brand Strengths */}
              {scrapedData.brandIntelligence?.brandStrengths && scrapedData.brandIntelligence.brandStrengths.length > 0 && (
                <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Key Brand Strengths
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {scrapedData.brandIntelligence.brandStrengths.map((strength, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        ✓ {strength}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Strategy */}
              {scrapedData.brandIntelligence?.contentStrategy && (
                <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Content Strategy Recommendations
                  </p>
                  <div className="space-y-2">
                    {scrapedData.brandIntelligence.contentStrategy.postingFrequency && (
                      <div>
                        <p className="text-xs text-muted-foreground">Posting Frequency</p>
                        <p className="text-sm text-foreground">
                          {scrapedData.brandIntelligence.contentStrategy.postingFrequency}
                        </p>
                      </div>
                    )}
                    {scrapedData.brandIntelligence.contentStrategy.platforms?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Recommended Platforms</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {scrapedData.brandIntelligence.contentStrategy.platforms.map((platform, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {scrapedData.brandIntelligence.contentStrategy.keyThemes?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Key Content Themes</p>
                        <ul className="space-y-1 mt-1">
                          {scrapedData.brandIntelligence.contentStrategy.keyThemes.slice(0, 4).map((theme, index) => (
                            <li key={index} className="text-xs text-foreground/70 flex items-start gap-1">
                              <span className="text-primary mt-0.5">•</span>
                              <span>{theme}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Marketing Recommendations */}
            {scrapedData.brandIntelligence?.marketingRecommendations && scrapedData.brandIntelligence.marketingRecommendations.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-sm font-semibold">Marketing Strategy Recommendations</p>
                <div className="grid md:grid-cols-2 gap-3">
                  {scrapedData.brandIntelligence.marketingRecommendations.slice(0, 4).map((rec, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium">{rec.strategy}</p>
                        <Badge variant={rec.priority === 'high' ? 'default' : 'secondary'} className="text-[10px]">
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Visual Analysis */}
        {scrapedData?.visualAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Palette className="w-5 h-5 text-primary" />
              Claude Vision - Visual Brand Analysis
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {scrapedData.visualAnalysis?.designStyle && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Design Style</p>
                  <p className="text-sm text-foreground">{scrapedData.visualAnalysis.designStyle}</p>
                </div>
              )}

              {scrapedData.visualAnalysis?.layoutType && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Layout Type</p>
                  <p className="text-sm text-foreground">{scrapedData.visualAnalysis.layoutType}</p>
                </div>
              )}

              {scrapedData.visualAnalysis?.typography && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Typography</p>
                  <p className="text-sm text-foreground">
                    {scrapedData.visualAnalysis.typography.style} - {scrapedData.visualAnalysis.typography.hierarchy}
                  </p>
                </div>
              )}

              {scrapedData.visualAnalysis?.brandPersonality && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Brand Personality</p>
                  <p className="text-sm text-foreground">{scrapedData.visualAnalysis.brandPersonality}</p>
                </div>
              )}
            </div>

            {scrapedData.visualAnalysis?.visualElements?.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Visual Elements</p>
                <div className="flex flex-wrap gap-2">
                  {scrapedData.visualAnalysis.visualElements.map((element, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {element}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Brand Kit Confirmation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Check className="w-5 h-5 text-primary" />
            Saved to Your Brand Kit
          </div>

          {/* Visual brand preview */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              {data.brandKit.logoUrl ? (
                <img
                  src={data.brandKit.logoUrl}
                  alt={`${data.brandKit.companyName} logo`}
                  className="w-12 h-12 rounded-lg border border-border bg-background object-contain p-2"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg border border-border bg-muted flex items-center justify-center text-lg font-semibold">
                  {data.brandKit.companyName?.charAt(0) || 'S'}
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{data.brandKit.companyName}</p>
                <p className="text-xs text-muted-foreground">{data.brandKit.industry}</p>
              </div>
            </div>

            {Array.isArray(data.brandKit.colors) && data.brandKit.colors.length > 0 && (
              <div className="flex items-center gap-2">
                {data.brandKit.colors.slice(0, 3).map((color, index) => (
                  <div key={index} className="flex flex-col items-center gap-1">
                    <div
                      className="w-10 h-10 rounded-full border border-border shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {index === 0 ? 'Primary' : index === 1 ? 'Secondary' : 'Accent'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-sm pt-2">
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-primary" />
              Logo
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-primary" />
              Colors
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-primary" />
              Brand Voice
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-primary" />
              Company Info
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            📝 Don't worry, you can edit everything in Brand Kit settings
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center"
        >
          <Button
            onClick={onContinue}
            size="lg"
            className="h-14 px-12 text-lg font-semibold"
          >
            Continue to App Tour →
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
