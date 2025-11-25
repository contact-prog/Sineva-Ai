import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useChat } from '@/contexts/ChatContext';
import { ContentTypeSelector } from '@/components/services/content/ContentTypeSelector';
import { ContentInputForm } from '@/components/services/content/ContentInputForm';
import { ContentResultCard } from '@/components/services/content/ContentResultCard';
import { ContentTemplateSelector } from '@/components/services/content/ContentTemplateSelector';
import { ContentVariationCompare } from '@/components/services/content/ContentVariationCompare';
import { ContentEditor } from '@/components/services/content/ContentEditor';
import { SEOScoreCard } from '@/components/services/content/SEOScoreCard';
import { ContentOptimizer } from '@/components/social/ContentOptimizer';
import { PlatformSuiteDisplay } from '@/components/services/content/PlatformSuiteDisplay';
import { ContentLibrary } from '@/components/services/content/ContentLibrary';
import { ContentRecommendations } from '@/components/services/content/ContentRecommendations';
import { BlogSEOMetadata } from '@/components/services/content/BlogSEOMetadata';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, ChevronDown, Zap, Search, Library } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Content = () => {
  const { setCurrentService } = useChat();
  const location = useLocation();
  const contentResultRef = useRef<HTMLDivElement>(null);
  const [contentType, setContentType] = useState('blog');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('standard');
  const [captionPlatform, setCaptionPlatform] = useState('instagram');
  const [additionalContext, setAdditionalContext] = useState('');
  const [useResearch, setUseResearch] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('none');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Phase 2 states
  const [variations, setVariations] = useState<any[]>([]);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState<any>(null);
  const [isAnalyzingSEO, setIsAnalyzingSEO] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
  
  // Phase 3 states
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformSuite, setPlatformSuite] = useState<any>(null);
  const [isGeneratingSuite, setIsGeneratingSuite] = useState(false);

  // Phase 4 states - Blog SEO metadata
  const [metaDescription, setMetaDescription] = useState<string>('');
  const [seoKeywords, setSeoKeywords] = useState<string[]>([]);
  const [readabilityScore, setReadabilityScore] = useState<number | undefined>(undefined);

  useEffect(() => {
    setCurrentService('content');
  }, [setCurrentService]);

  // Handle preloaded content from chat
  useEffect(() => {
    const state = location.state as any;
    if (state?.preloadedContent) {
      setGeneratedContent(state.preloadedContent);
      if (state.topic) setTopic(state.topic);
      if (state.contentType) setContentType(state.contentType);
      if (state.metaDescription) setMetaDescription(state.metaDescription);
      if (state.seoKeywords) setSeoKeywords(state.seoKeywords);
      if (state.readabilityScore !== undefined) setReadabilityScore(state.readabilityScore);
      
      // Auto-scroll to content
      setTimeout(() => {
        contentResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      
      toast.success('Content loaded from chat');
    }
  }, [location]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setVariations([]); // Reset variations
    setSeoAnalysis(null); // Reset SEO analysis
    setPlatformSuite(null); // Reset platform suite
    setMetaDescription(''); // Reset metadata
    setSeoKeywords([]);
    setReadabilityScore(undefined);
    setActiveTab('content'); // Switch to content tab
    
    try {
      if (useResearch) {
        toast.info('Researching your topic first...', { duration: 3000 });
      }

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          contentType,
          topic,
          tone,
          length: contentType === 'caption' ? captionPlatform : length,
          additionalContext: additionalContext.trim() || undefined,
          useResearch,
          templateFramework: selectedTemplate,
          captionPlatform: contentType === 'caption' ? captionPlatform : undefined
        }
      });

      if (error) throw error;

      setGeneratedContent(data.content);
      
      // Save blog SEO metadata if available
      if (data.metaDescription) setMetaDescription(data.metaDescription);
      if (data.seoKeywords) setSeoKeywords(data.seoKeywords);
      if (data.readabilityScore !== undefined) setReadabilityScore(data.readabilityScore);
      
      toast.success('Content generated successfully!');
      
      // Auto-scroll to generated content (centered view)
      setTimeout(() => {
        contentResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      
      // Auto-analyze SEO for blog posts
      if (contentType === 'blog' && data.content) {
        setTimeout(() => handleAnalyzeSEO(data.content), 1000);
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVariations = async () => {
    if (!generatedContent) {
      toast.error('Generate content first');
      return;
    }

    setIsGeneratingVariations(true);
    try {
      toast.info('Generating 3 variations...', { duration: 2000 });
      
      const { data, error } = await supabase.functions.invoke('generate-content-variations', {
        body: {
          originalContent: generatedContent,
          topic,
          contentType,
          numberOfVariations: 3,
          variationAngles: [
            'more professional tone',
            'more casual and engaging',
            'data-driven with statistics'
          ]
        }
      });

      if (error) throw error;

      if (data?.variations) {
        setVariations(data.variations);
        setActiveTab('variations');
        toast.success(`${data.variations.length} variations generated!`);
      }
    } catch (error) {
      console.error('Error generating variations:', error);
      toast.error('Failed to generate variations');
    } finally {
      setIsGeneratingVariations(false);
    }
  };

  const handleAnalyzeSEO = async (content?: string) => {
    const contentToAnalyze = content || generatedContent;
    
    if (!contentToAnalyze) {
      toast.error('Generate content first');
      return;
    }

    if (contentType !== 'blog') {
      toast.info('SEO analysis is only available for blog posts');
      return;
    }

    setIsAnalyzingSEO(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-seo', {
        body: {
          content: contentToAnalyze,
          targetKeyword: topic
        }
      });

      if (error) throw error;

      if (data) {
        setSeoAnalysis(data);
        setActiveTab('seo');
        toast.success('SEO analysis complete!');
      }
    } catch (error) {
      console.error('Error analyzing SEO:', error);
      toast.error('Failed to analyze SEO');
    } finally {
      setIsAnalyzingSEO(false);
    }
  };

  const handleSelectVariation = (content: string) => {
    setGeneratedContent(content);
    setActiveTab('content');
  };

  const handleContentUpdate = (newContent: string) => {
    setGeneratedContent(newContent);
  };

  const handleGeneratePlatformSuite = async () => {
    if (!generatedContent || selectedPlatforms.length === 0) {
      toast.error('Please generate content and select target platforms first');
      return;
    }

    setIsGeneratingSuite(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-platform-suite', {
        body: { content: generatedContent, platforms: selectedPlatforms }
      });

      if (error) throw error;

      if (data.success) {
        setPlatformSuite(data.suite);
        setActiveTab('platform-suite');
        toast.success('Platform content suite generated!');
      } else {
        throw new Error(data.error || 'Failed to generate platform suite');
      }
    } catch (error: any) {
      console.error('Platform suite generation error:', error);
      toast.error(error.message || 'Failed to generate platform suite');
    } finally {
      setIsGeneratingSuite(false);
    }
  };

  const handleTogglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleApplyOptimization = (optimization: any) => {
    if (optimization.hashtags) {
      const hashtagText = '\n\n' + optimization.hashtags.map((tag: string) => `#${tag}`).join(' ');
      setGeneratedContent(prev => prev + hashtagText);
      toast.success('Hashtags applied to content');
    } else if (optimization.platform && optimization.content) {
      setGeneratedContent(optimization.content);
      toast.success(`Applied ${optimization.platform} optimized content`);
    }
  };

  const platformOptions = [
    { id: 'twitter', name: 'Twitter/X', icon: '𝕏' },
    { id: 'linkedin', name: 'LinkedIn', icon: 'in' },
    { id: 'instagram', name: 'Instagram', icon: '📷' },
    { id: 'facebook', name: 'Facebook', icon: 'f' },
    { id: 'tiktok', name: 'TikTok', icon: '♪' },
  ];

  const handleSelectFromLibrary = (content: string, type: string) => {
    setGeneratedContent(content);
    setContentType(type);
    setActiveTab('content');
    toast.success('Content loaded from library!');
  };

  const handleSelectRecommendation = (title: string, contentType: string, tone: string) => {
    setTopic(title);
    setContentType(contentType);
    setTone(tone);
    toast.success('Recommendation applied! Click Generate to create content.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="glass-card p-6 border-l-4 border-primary">
          <h1 className="text-4xl font-bold mb-2">AI Content Generator</h1>
          <p className="text-muted-foreground text-lg">
            Create engaging content for any platform with AI
          </p>
        </div>

        {/* Content Type Selection */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Select Content Type</h2>
          <ContentTypeSelector
            selectedType={contentType}
            onSelectType={setContentType}
          />
        </div>

        {/* Input Form */}
        <Card className="glass-card border-primary/20 p-6">
          <h2 className="text-xl font-semibold mb-6">Content Details</h2>
          <ContentInputForm
            topic={topic}
            tone={tone}
            length={length}
            additionalContext={additionalContext}
            useResearch={useResearch}
            contentType={contentType}
            captionPlatform={captionPlatform}
            onTopicChange={setTopic}
            onToneChange={setTone}
            onLengthChange={setLength}
            onContextChange={setAdditionalContext}
            onResearchToggle={setUseResearch}
            onCaptionPlatformChange={setCaptionPlatform}
          />

          {/* Advanced Options - Template Selector */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="mt-6">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                Advanced Options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <ContentTemplateSelector
                contentType={contentType}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={setSelectedTemplate}
              />
            </CollapsibleContent>
          </Collapsible>
          
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            size="lg"
            className="w-full mt-6 hover-glow"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {useResearch ? 'Researching & Generating...' : 'Generating...'}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Content
              </>
            )}
          </Button>
        </Card>

        {/* Generated Content Results - Placed right after input */}
        {generatedContent && (
          <div ref={contentResultRef}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="edit">AI Editor</TabsTrigger>
                <TabsTrigger value="variations">
                  Variations
                  {variations.length > 0 && (
                    <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-2">
                      {variations.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="seo" disabled={contentType !== 'blog'}>
                  SEO Score
                </TabsTrigger>
                <TabsTrigger value="optimize">Optimize</TabsTrigger>
                <TabsTrigger value="platform-suite">Suite</TabsTrigger>
              </TabsList>

            <TabsContent value="content" className="mt-6">
              <div className="space-y-4">
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleGenerateVariations}
                    disabled={isGeneratingVariations}
                    className="flex-1"
                  >
                    {isGeneratingVariations ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Generate 3 Variations
                      </>
                    )}
                  </Button>
                  {contentType === 'blog' && (
                    <Button
                      variant="outline"
                      onClick={() => handleAnalyzeSEO()}
                      disabled={isAnalyzingSEO}
                      className="flex-1"
                    >
                      {isAnalyzingSEO ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Analyze SEO
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <ContentResultCard
                  content={generatedContent}
                  onRegenerate={handleGenerate}
                  isRegenerating={isGenerating}
                  contentTopic={topic}
                />
              </div>
            </TabsContent>

            <TabsContent value="edit" className="mt-6">
              <div className="space-y-4">
                <ContentEditor
                  content={generatedContent}
                  contentType={contentType}
                  onContentUpdate={handleContentUpdate}
                />
                <ContentResultCard
                  content={generatedContent}
                  onRegenerate={handleGenerate}
                  isRegenerating={isGenerating}
                  contentTopic={topic}
                />
              </div>
            </TabsContent>

            <TabsContent value="variations" className="mt-6">
              {variations.length > 0 ? (
                <ContentVariationCompare
                  originalContent={generatedContent}
                  variations={variations}
                  onSelectVariation={handleSelectVariation}
                />
              ) : (
                <Card className="p-12 text-center">
                  <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No variations generated yet. Click "Generate 3 Variations" to create alternatives.
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="seo" className="mt-6">
              <div className="space-y-4">
                {/* Blog SEO Metadata Display */}
                {contentType === 'blog' && (metaDescription || seoKeywords.length > 0 || readabilityScore !== undefined) && (
                  <BlogSEOMetadata
                    metaDescription={metaDescription}
                    seoKeywords={seoKeywords}
                    readabilityScore={readabilityScore}
                  />
                )}
                
                <SEOScoreCard 
                  seoAnalysis={seoAnalysis} 
                  isAnalyzing={isAnalyzingSEO}
                />
              </div>
            </TabsContent>

            <TabsContent value="optimize" className="mt-6">
              {generatedContent ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">Target Platforms</Label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {platformOptions.map((platform) => (
                        <div key={platform.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={platform.id}
                            checked={selectedPlatforms.includes(platform.id)}
                            onCheckedChange={() => handleTogglePlatform(platform.id)}
                          />
                          <Label
                            htmlFor={platform.id}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {platform.icon} {platform.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedPlatforms.length > 0 && (
                    <ContentOptimizer
                      content={generatedContent}
                      platforms={selectedPlatforms}
                      onApplyOptimization={handleApplyOptimization}
                    />
                  )}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    Generate content first to access optimization tools
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="platform-suite" className="mt-6">
              {generatedContent ? (
                <>
                  {!platformSuite && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold mb-3 block">Select Platforms for Content Suite</Label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {platformOptions.map((platform) => (
                            <div key={platform.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`suite-${platform.id}`}
                                checked={selectedPlatforms.includes(platform.id)}
                                onCheckedChange={() => handleTogglePlatform(platform.id)}
                              />
                              <Label
                                htmlFor={`suite-${platform.id}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {platform.icon} {platform.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={handleGeneratePlatformSuite}
                        disabled={isGeneratingSuite || selectedPlatforms.length === 0}
                        className="w-full"
                        size="lg"
                      >
                        {isGeneratingSuite ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating Suite...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Multi-Platform Content Suite
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {platformSuite && (
                    <PlatformSuiteDisplay suite={platformSuite} />
                  )}
                </>
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    Generate content first to create a multi-platform suite
                  </p>
                </Card>
              )}
            </TabsContent>
            </Tabs>
          </div>
        )}

        {/* AI Recommendations Section - Compact when content is generated */}
        {!generatedContent && (
          <Card className="glass-card border-primary/20 p-6">
            <ContentRecommendations onSelectRecommendation={handleSelectRecommendation} />
          </Card>
        )}

        {/* Content Library Section - Compact when content is generated */}
        {!generatedContent && (
          <Card className="glass-card border-primary/20 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Library className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Content Library & Templates</h2>
            </div>
            <ContentLibrary 
              onSelectContent={handleSelectFromLibrary}
            />
          </Card>
        )}

        {/* Collapsed Library Access when content is generated */}
        {generatedContent && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Card className="glass-card border-primary/20 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Library className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Browse Library & Recommendations</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <Card className="glass-card border-primary/20 p-6">
                <ContentRecommendations onSelectRecommendation={handleSelectRecommendation} />
              </Card>
              <Card className="glass-card border-primary/20 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Library className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Content Library & Templates</h2>
                </div>
                <ContentLibrary 
                  onSelectContent={handleSelectFromLibrary}
                />
              </Card>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
};

export default Content;
