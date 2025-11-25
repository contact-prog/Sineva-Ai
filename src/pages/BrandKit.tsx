import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Package, Palette, Target, AlertCircle, Globe } from 'lucide-react';
import { INDUSTRIES, BRAND_VOICES, MARKETING_GOALS, MARKETING_CHANNELS } from '@/types/onboarding';
import { z } from 'zod';
import { ScrapedDataReview } from '@/components/onboarding/ScrapedDataReview';
import type { ScrapedData } from '@/types/onboarding';

interface BrandKitData {
  company_name: string | null;
  industry: string | null;
  description: string | null;
  website_url: string | null;
  business_stage: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  brand_voice: string | null;
  tagline: string | null;
  goals: string[] | null;
  target_audience: string | null;
  monthly_budget: number | null;
  current_channels: string[] | null;
  scraped_data: ScrapedData | null;
}

const brandKitSchema = z.object({
  company_name: z.string().min(1, "Company name is required").max(100, "Company name must be less than 100 characters").nullable(),
  website_url: z.string().url("Invalid website URL").or(z.literal("")).nullable(),
  industry: z.string().min(1, "Industry is required").nullable(),
  description: z.string().max(500, "Description must be less than 500 characters").nullable(),
  tagline: z.string().max(100, "Tagline must be less than 100 characters").nullable(),
  goals: z.array(z.string()).min(1, "Select at least one marketing goal").nullable(),
});

export default function BrandKit() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string>('');
  const [data, setData] = useState<BrandKitData>({
    company_name: null,
    industry: null,
    description: null,
    website_url: null,
    business_stage: null,
    primary_color: null,
    secondary_color: null,
    accent_color: null,
    logo_url: null,
    brand_voice: null,
    tagline: null,
    goals: null,
    target_audience: null,
    monthly_budget: null,
    current_channels: null,
    scraped_data: null,
  });

  useEffect(() => {
    loadBrandKit();
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadBrandKit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (profile) {
        setData({
          company_name: profile.company_name,
          industry: profile.industry,
          description: profile.description,
          website_url: profile.website_url,
          business_stage: profile.business_stage,
          primary_color: profile.primary_color,
          secondary_color: profile.secondary_color,
          accent_color: profile.accent_color,
          logo_url: profile.logo_url,
          brand_voice: profile.brand_voice,
          tagline: profile.tagline,
          goals: profile.goals,
          target_audience: profile.target_audience,
          monthly_budget: profile.monthly_budget,
          current_channels: profile.current_channels,
          scraped_data: profile.scraped_data as ScrapedData | null,
        });
      }
    } catch (error) {
      console.error('Error loading brand kit:', error);
      toast({
        title: 'Error',
        description: 'Failed to load brand kit data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate data
    try {
      brandKitSchema.parse(data);
      setValidationErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setValidationErrors(errors);
        toast({ 
          title: "Validation Error", 
          description: "Please fix the errors before saving", 
          variant: "destructive" 
        });
        return;
      }
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...data,
          scraped_data: data.scraped_data as any
        })
        .eq('id', userId);

      if (error) throw error;

      setHasUnsavedChanges(false);
      toast({
        title: 'Success',
        description: 'Brand kit updated successfully',
      });
    } catch (error) {
      console.error('Error saving brand kit:', error);
      toast({
        title: 'Error',
        description: 'Failed to save brand kit',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      // Immediately save to database
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ logo_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setData({ ...data, logo_url: publicUrl });

      toast({
        title: 'Success',
        description: 'Logo uploaded and saved successfully',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const updateField = (field: keyof BrandKitData, value: any) => {
    setData({ ...data, [field]: value });
    setHasUnsavedChanges(true);
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (loading) {
    return (
      <div className="container max-w-5xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Brand Kit</h1>
          <p className="text-muted-foreground mt-2">
            Manage your brand identity and marketing strategy
            {hasUnsavedChanges && <span className="text-amber-600 ml-2">(Unsaved changes)</span>}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || Object.keys(validationErrors).length > 0} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {Object.keys(validationErrors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix the following errors before saving:
            <ul className="list-disc list-inside mt-2">
              {Object.entries(validationErrors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Company Information
          </CardTitle>
          <CardDescription>Basic information about your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={data.company_name || ''}
                onChange={(e) => updateField('company_name', e.target.value)}
                placeholder="Your Company Name"
                className={validationErrors.company_name ? "border-destructive" : ""}
              />
              {validationErrors.company_name && (
                <p className="text-sm text-destructive">{validationErrors.company_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry *</Label>
              <Select
                value={data.industry || ''}
                onValueChange={(value) => updateField('industry', value)}
              >
                <SelectTrigger className={validationErrors.industry ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.industry && (
                <p className="text-sm text-destructive">{validationErrors.industry}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                type="url"
                value={data.website_url || ''}
                onChange={(e) => updateField('website_url', e.target.value)}
                placeholder="https://example.com"
                className={validationErrors.website_url ? "border-destructive" : ""}
              />
              {validationErrors.website_url && (
                <p className="text-sm text-destructive">{validationErrors.website_url}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_stage">Business Stage</Label>
              <Select
                value={data.business_stage || ''}
                onValueChange={(value) => updateField('business_stage', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea_stage">Idea Stage</SelectItem>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="already_running">Already Running</SelectItem>
                  <SelectItem value="scaling">Scaling</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Business Description</Label>
            <Textarea
              id="description"
              value={data.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe what your business does..."
              rows={4}
              className={validationErrors.description ? "border-destructive" : ""}
            />
            {validationErrors.description && (
              <p className="text-sm text-destructive">{validationErrors.description}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Brand Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Brand Identity
          </CardTitle>
          <CardDescription>Visual elements and brand voice</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo">Logo</Label>
            <div className="flex items-center gap-4">
              {data.logo_url && (
                <img
                  src={data.logo_url}
                  alt="Logo"
                  className="w-20 h-20 object-contain rounded border border-border"
                />
              )}
              <div className="flex-1 space-y-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="cursor-pointer"
                  disabled={uploadingLogo}
                />
                {uploadingLogo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading and saving logo...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={data.primary_color || '#000000'}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                  className="w-16 h-10 cursor-pointer"
                />
                <Input
                  value={data.primary_color || ''}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={data.secondary_color || '#000000'}
                  onChange={(e) => updateField('secondary_color', e.target.value)}
                  className="w-16 h-10 cursor-pointer"
                />
                <Input
                  value={data.secondary_color || ''}
                  onChange={(e) => updateField('secondary_color', e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent_color">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accent_color"
                  type="color"
                  value={data.accent_color || '#000000'}
                  onChange={(e) => updateField('accent_color', e.target.value)}
                  className="w-16 h-10 cursor-pointer"
                />
                <Input
                  value={data.accent_color || ''}
                  onChange={(e) => updateField('accent_color', e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand_voice">Brand Voice</Label>
              <Select
                value={data.brand_voice || ''}
                onValueChange={(value) => updateField('brand_voice', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand voice" />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_VOICES.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {data.brand_voice && (
                <p className="text-sm text-muted-foreground">
                  {BRAND_VOICES.find((v) => v.value === data.brand_voice)?.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={data.tagline || ''}
                onChange={(e) => updateField('tagline', e.target.value)}
                placeholder="Your brand tagline"
                className={validationErrors.tagline ? "border-destructive" : ""}
              />
              {validationErrors.tagline && (
                <p className="text-sm text-destructive">{validationErrors.tagline}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Website Intelligence Data */}
      {data.scraped_data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Website Intelligence
            </CardTitle>
            <CardDescription>AI-extracted data from your website analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrapedDataReview
              scrapedData={data.scraped_data}
              formData={data}
              onAccept={() => {}}
              onRescrape={() => {}}
              onChange={() => {}}
            />
          </CardContent>
        </Card>
      )}

      {/* Marketing Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Marketing Strategy
          </CardTitle>
          <CardDescription>Goals, audience, and channels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target_audience">Target Audience</Label>
            <Textarea
              id="target_audience"
              value={data.target_audience || ''}
              onChange={(e) => updateField('target_audience', e.target.value)}
              placeholder="Describe your target audience..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className={validationErrors.goals ? "text-destructive" : ""}>Marketing Goals *</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {MARKETING_GOALS.map((goal) => (
                <label
                  key={goal}
                  className="flex items-center space-x-2 p-2 rounded border border-border hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={data.goals?.includes(goal) || false}
                    onCheckedChange={(checked) => {
                      const newGoals = checked
                        ? [...(data.goals || []), goal]
                        : (data.goals || []).filter((g) => g !== goal);
                      updateField('goals', newGoals);
                    }}
                  />
                  <span className="text-sm">{goal}</span>
                </label>
              ))}
            </div>
            {validationErrors.goals && (
              <p className="text-sm text-destructive">{validationErrors.goals}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_channels">Current Marketing Channels</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {MARKETING_CHANNELS.map((channel) => (
                <label
                  key={channel}
                  className="flex items-center space-x-2 p-2 rounded border border-border hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={data.current_channels?.includes(channel) || false}
                    onCheckedChange={(checked) => {
                      const newChannels = checked
                        ? [...(data.current_channels || []), channel]
                        : (data.current_channels || []).filter((c) => c !== channel);
                      updateField('current_channels', newChannels);
                    }}
                  />
                  <span className="text-sm">{channel}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly_budget">Monthly Marketing Budget ($)</Label>
            <Input
              id="monthly_budget"
              type="number"
              value={data.monthly_budget || ''}
              onChange={(e) => updateField('monthly_budget', parseFloat(e.target.value) || null)}
              placeholder="5000"
              min="0"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
