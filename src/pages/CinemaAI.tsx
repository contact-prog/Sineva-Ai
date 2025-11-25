import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Sparkles, CheckCircle2 } from "lucide-react";

const formSchema = z.object({
  // Section 1: Basic founder details
  founderName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Phone number is required"),
  whatsapp: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().min(2, "Country is required"),
  linkedinUrl: z.string().url("Valid LinkedIn URL required"),
  personalWebsite: z.string().url().optional().or(z.literal("")),
  ageRange: z.string().min(1, "Age range is required"),
  primaryRole: z.string().min(1, "Primary role is required"),
  coFounders: z.string().optional(),
  hearAboutUs: z.string().optional(),
  
  // Section 2: Startup identity
  startupName: z.string().min(2, "Startup name is required"),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  oneLineDescription: z.string().max(140, "Max 140 characters").min(10, "Description required"),
  category: z.string().min(1, "Category is required"),
  headquarters: z.string().min(2, "Headquarters required"),
  legalEntityType: z.string().min(1, "Legal entity type required"),
  incorporationDate: z.string().optional(),
  
  // Section 3: Problem and solution
  problemDescription: z.string().max(1500, "Max 300 words").min(50, "Problem description required"),
  painPointEvidence: z.string().max(1000, "Max 200 words").min(50, "Evidence required"),
  solutionDescription: z.string().max(1000, "Max 200 words").min(50, "Solution description required"),
  uniqueValueProp: z.string().max(1000, "Max 200 words").min(50, "Value proposition required"),
  whyAI: z.string().max(1250, "Max 250 words").min(50, "AI explanation required"),
  
  // Section 4: Product and tech
  productStage: z.string().min(1, "Product stage required"),
  demoLink: z.string().url().optional().or(z.literal("")),
  techStack: z.string().min(20, "Tech stack description required"),
  aiStack: z.string().min(20, "AI stack description required"),
  intellectualProperty: z.string().optional(),
  
  // Section 5: Market and traction
  targetCustomer: z.string().min(20, "Target customer description required"),
  marketType: z.string().min(1, "Market type required"),
  tractionMetrics: z.string().min(20, "Traction metrics required"),
  revenue: z.string().min(1, "Revenue range required"),
  partnerships: z.string().optional(),
  
  // Section 6: Business model
  revenueModel: z.string().min(20, "Revenue model required"),
  pricingModel: z.string().min(10, "Pricing model required"),
  salesStrategy: z.string().min(20, "Sales strategy required"),
  idealCustomerProfile: z.string().min(20, "ICP required"),
  
  // Section 7: Team
  teamSize: z.string().min(1, "Team size required"),
  teamBreakdown: z.string().min(20, "Team breakdown required"),
  foundersFullTime: z.string().min(1, "Full-time status required"),
  foundersBackground: z.string().min(50, "Founders background required"),
  whyThisTeam: z.string().max(1000, "Max 200 words").min(50, "Team explanation required"),
  
  // Section 8: Funding
  currentFundingStage: z.string().min(1, "Funding stage required"),
  totalRaised: z.string().optional(),
  amountRaising: z.string().min(1, "Amount raising required"),
  capitalType: z.string().min(1, "Capital type required"),
  useOfFunds: z.string().min(50, "Use of funds required"),
  expectedRunway: z.string().min(1, "Expected runway required"),
  keyMilestones: z.string().min(50, "Key milestones required"),
  
  // Section 9: Competition and risks
  mainCompetitors: z.string().min(20, "Competitors required"),
  differentiation: z.string().max(1000, "Max 200 words").min(20, "Differentiation required"),
  biggestRisks: z.string().min(20, "Risks required"),
  regulatoryIssues: z.string().optional(),
  
  // Section 10: Video pitch
  videoPitchUrl: z.string().url("Valid video URL required"),
  deckUrl: z.string().url().optional().or(z.literal("")),
  
  // Section 11: Fit and declarations
  whyCinemaAI: z.string().max(1000, "Max 200 words").min(50, "Why Sineva AI required"),
  howCanWeHelp: z.string().max(750, "Max 150 words").min(20, "How we can help required"),
  additionalInfo: z.string().optional(),
  confirmTruth: z.boolean().refine((val) => val === true, "Must confirm"),
  agreeToShare: z.boolean().refine((val) => val === true, "Must agree"),
  agreeToContact: z.boolean().refine((val) => val === true, "Must agree"),
});

type FormData = z.infer<typeof formSchema>;

export default function CinemaAI() {
  const [currentSection, setCurrentSection] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Here you would send the data to your backend/CRM
      console.log("Form submission:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
      toast.success("Application submitted successfully!");
      
      // Trigger email automation here
      // sendEmail({ type: "full_application_submitted", data });
      
    } catch (error) {
      toast.error("Failed to submit application. Please try again.");
    }
  };

  const totalSections = 11;

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Application Received!</h2>
          <p className="text-muted-foreground mb-6">
            Thank you for applying for investment from Sineva AI. Your application for{" "}
            <strong>{form.getValues("startupName")}</strong> has been received successfully.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Our investment team will now review your details, product, and video pitch. If your startup is 
            shortlisted, you will receive an email within 5-7 business days with next steps and a link to 
            schedule a call with our directors.
          </p>
          <Button onClick={() => window.location.reload()}>Submit Another Application</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1 className="text-4xl sm:text-5xl font-bold">Sineva AI Investments</h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Empowering Indian AI startups with capital, expertise, and network to build the next generation 
              of intelligent solutions
            </p>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <Card className="p-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Section {currentSection} of {totalSections}</span>
              <span className="text-sm text-muted-foreground">{Math.round((currentSection / totalSections) * 100)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentSection / totalSections) * 100}%` }}
              />
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Section 1: Basic Founder Details */}
              {currentSection === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Basic Founder Details</h2>
                    <p className="text-muted-foreground">Tell us about yourself</p>
                  </div>

                  <FormField control={form.control} name="founderName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl><Input {...field} placeholder="John Doe" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl><Input {...field} type="email" placeholder="john@example.com" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl><Input {...field} placeholder="+91 98765 43210" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="whatsapp" render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number (Optional)</FormLabel>
                      <FormControl><Input {...field} placeholder="+91 98765 43210" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="city" render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl><Input {...field} placeholder="Bangalore" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="state" render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <FormControl><Input {...field} placeholder="Karnataka" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="country" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country *</FormLabel>
                        <FormControl><Input {...field} placeholder="India" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn Profile URL *</FormLabel>
                      <FormControl><Input {...field} placeholder="https://linkedin.com/in/johndoe" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="personalWebsite" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Website or Portfolio (Optional)</FormLabel>
                      <FormControl><Input {...field} placeholder="https://johndoe.com" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="ageRange" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age Range *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select age range" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="<20">&lt;20</SelectItem>
                            <SelectItem value="20-25">20–25</SelectItem>
                            <SelectItem value="26-30">26–30</SelectItem>
                            <SelectItem value="31-40">31–40</SelectItem>
                            <SelectItem value="40+">40+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="primaryRole" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Role in Startup *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CEO">CEO</SelectItem>
                            <SelectItem value="CTO">CTO</SelectItem>
                            <SelectItem value="COO">COO</SelectItem>
                            <SelectItem value="solo-founder">Solo Founder</SelectItem>
                            <SelectItem value="co-founder">Co-founder</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="coFounders" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Co-founder Names, Roles, LinkedIn URLs (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Jane Smith, CTO, https://linkedin.com/in/janesmith" rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="hearAboutUs" render={({ field }) => (
                    <FormItem>
                      <FormLabel>How did you hear about Sineva AI Investments? (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Section 2: Startup Identity */}
              {currentSection === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Startup Identity</h2>
                    <p className="text-muted-foreground">Tell us about your startup</p>
                  </div>

                  <FormField control={form.control} name="startupName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Startup Name *</FormLabel>
                      <FormControl><Input {...field} placeholder="AI Solutions Inc" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website / App Store Link (Optional)</FormLabel>
                      <FormControl><Input {...field} placeholder="https://aisolutions.com" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="oneLineDescription" render={({ field }) => (
                    <FormItem>
                      <FormLabel>One-line Startup Description (Max 140 characters) *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="AI-powered platform transforming customer service" maxLength={140} />
                      </FormControl>
                      <div className="text-xs text-muted-foreground text-right">{field.value?.length || 0}/140</div>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="core-ai">Core AI / Infrastructure</SelectItem>
                          <SelectItem value="saas">SaaS</SelectItem>
                          <SelectItem value="b2b-tools">B2B Tools</SelectItem>
                          <SelectItem value="consumer-app">Consumer App</SelectItem>
                          <SelectItem value="fintech">Fintech</SelectItem>
                          <SelectItem value="healthtech">Healthtech</SelectItem>
                          <SelectItem value="edtech">Edtech</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="headquarters" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Headquarters Location (City, State) *</FormLabel>
                      <FormControl><Input {...field} placeholder="Bangalore, Karnataka" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="legalEntityType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legal Entity Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select entity type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="not-incorporated">Not incorporated yet</SelectItem>
                            <SelectItem value="sole-prop">Sole Proprietorship</SelectItem>
                            <SelectItem value="partnership">Partnership</SelectItem>
                            <SelectItem value="pvt-ltd">Private Limited</SelectItem>
                            <SelectItem value="llp">LLP</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="incorporationDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Incorporation (Optional)</FormLabel>
                        <FormControl><Input {...field} type="date" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* Section 3: Problem and Solution */}
              {currentSection === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Problem and Solution</h2>
                    <p className="text-muted-foreground">What are you solving?</p>
                  </div>

                  <FormField control={form.control} name="problemDescription" render={({ field }) => (
                    <FormItem>
                      <FormLabel>What problem are you solving? (Max 250-300 words) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Describe the problem, who faces it, and how big it is..." rows={6} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="painPointEvidence" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why is this a real, painful problem? Give 2-3 examples (Max 200 words) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Provide real examples or data points..." rows={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="solutionDescription" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Describe your solution (Max 200 words) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="What does your product actually do for the user?" rows={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="uniqueValueProp" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unique Value Proposition vs Competitors (Max 200 words) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="What makes your solution unique?" rows={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="whyAI" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why is AI necessary here? Which parts use AI/ML? (Max 250 words) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Explain models, frameworks, APIs used..." rows={6} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Section 4: Product and Tech */}
              {currentSection === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Product and Tech Details</h2>
                    <p className="text-muted-foreground">Your technical stack and AI implementation</p>
                  </div>

                  <FormField control={form.control} name="productStage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Product Stage *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="idea">Just an idea</SelectItem>
                          <SelectItem value="prototype">Prototype / MVP in development</SelectItem>
                          <SelectItem value="mvp-live">MVP live with early users</SelectItem>
                          <SelectItem value="live-paying">Live product with paying customers</SelectItem>
                          <SelectItem value="scaling">Scaling (post-revenue, growing)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="demoLink" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Demo Link (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://demo.aisolutions.com or YouTube/Loom link" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="techStack" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tech Stack (Frontend, Backend, Database, Infrastructure) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="React, Node.js, PostgreSQL, AWS..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="aiStack" render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Stack (Models, Data Handling, APIs) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="GPT-4, custom models, data sources, privacy measures..." rows={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="intellectualProperty" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intellectual Property (Patents, Proprietary Datasets, Algorithms) (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Any patents filed or proprietary technology?" rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Section 5: Market and Traction */}
              {currentSection === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Market, Customers, and Traction</h2>
                    <p className="text-muted-foreground">Your market and current progress</p>
                  </div>

                  <FormField control={form.control} name="targetCustomer" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Customer Segment (Role, Industry, Geography) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Small business owners in retail, India and Southeast Asia..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="marketType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select market type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="b2b">B2B</SelectItem>
                          <SelectItem value="b2c">B2C</SelectItem>
                          <SelectItem value="b2b2c">B2B2C</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                          <SelectItem value="smb">SMB</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="tractionMetrics" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Traction Metrics (Users, Revenue, Retention, etc.) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="1,000 signups, 200 paying customers, 80% retention..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="revenue" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly/Annual Revenue Range *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select revenue range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">₹0</SelectItem>
                          <SelectItem value="1-50k">₹1–₹50k</SelectItem>
                          <SelectItem value="50k-2L">₹50k–₹2L</SelectItem>
                          <SelectItem value="2L-10L">₹2L–₹10L</SelectItem>
                          <SelectItem value="10L+">₹10L+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="partnerships" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Existing Partnerships or Accelerators (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Google for Startups, AWS, Y Combinator..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Section 6: Business Model */}
              {currentSection === 6 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Business Model and Revenue</h2>
                    <p className="text-muted-foreground">How you make money</p>
                  </div>

                  <FormField control={form.control} name="revenueModel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revenue Model *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Subscription SaaS, transaction fees, marketplace..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="pricingModel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pricing Model (Ticket Size, ARPU, Contract Value) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="₹999/month per user, ₹50k annual contracts..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="salesStrategy" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sales Strategy *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Online marketing, outbound sales, channel partners..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="idealCustomerProfile" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ideal Customer Profile (ICP) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Description of your perfect customer..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Section 7: Team */}
              {currentSection === 7 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Team and Execution Capacity</h2>
                    <p className="text-muted-foreground">Your team structure and capabilities</p>
                  </div>

                  <FormField control={form.control} name="teamSize" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Team Size (Founders + Core Team) *</FormLabel>
                      <FormControl><Input {...field} type="number" placeholder="5" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="teamBreakdown" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Breakdown (Tech, AI/Data, Product, Sales, Operations) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="2 engineers, 1 AI specialist, 1 product manager..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="foundersFullTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Are Founders Full-time or Part-time? *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all-fulltime">All full-time</SelectItem>
                          <SelectItem value="some-fulltime">Some full-time</SelectItem>
                          <SelectItem value="all-parttime">All part-time</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="foundersBackground" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Founders' Background (Education, Previous Experience) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="IIT graduate, worked at Google for 5 years..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="whyThisTeam" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why is this team the right team to win? (Max 200 words) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Explain your team's unique strengths..." rows={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Section 8: Funding */}
              {currentSection === 8 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Funding Request and Deal Structure</h2>
                    <p className="text-muted-foreground">Your funding requirements</p>
                  </div>

                  <FormField control={form.control} name="currentFundingStage" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Funding Stage *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bootstrapped">Bootstrapped</SelectItem>
                          <SelectItem value="friends-family">Friends & Family</SelectItem>
                          <SelectItem value="angel">Angel Round</SelectItem>
                          <SelectItem value="pre-seed">Pre-seed</SelectItem>
                          <SelectItem value="seed">Seed</SelectItem>
                          <SelectItem value="series-a">Series A+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="totalRaised" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Money Raised So Far (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="₹50L from angel investors..." rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="amountRaising" render={({ field }) => (
                    <FormItem>
                      <FormLabel>How Much Are You Currently Raising? (₹) *</FormLabel>
                      <FormControl><Input {...field} placeholder="₹1 Crore" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="capitalType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type of Capital Seeking *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select capital type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="equity">Equity</SelectItem>
                          <SelectItem value="debt">Debt</SelectItem>
                          <SelectItem value="convertible">Convertible (SAFE/Note)</SelectItem>
                          <SelectItem value="mix">Mix</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="useOfFunds" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposed Use of Funds (% breakdown) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="40% Product & Tech, 30% Marketing, 20% Hiring, 10% Operations..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="expectedRunway" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Runway with This Capital (Months) *</FormLabel>
                      <FormControl><Input {...field} type="number" placeholder="18" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="keyMilestones" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Milestones in Next 12-18 Months *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Reach 10,000 users, ₹1Cr ARR, expand to 3 new cities..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Section 9: Competition and Risks */}
              {currentSection === 9 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Risk, Challenges, and Competition</h2>
                    <p className="text-muted-foreground">Your competitive landscape</p>
                  </div>

                  <FormField control={form.control} name="mainCompetitors" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Competitors (Direct and Indirect) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="List competitors with links if possible..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="differentiation" render={({ field }) => (
                    <FormItem>
                      <FormLabel>How Are You Different from Competitors? (Max 200 words) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Explain your unique differentiation..." rows={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="biggestRisks" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biggest Risks or Challenges in Next 12-18 Months *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Tech risks, hiring challenges, GTM, regulation..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="regulatoryIssues" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Any Regulatory or Data-Privacy Issues? (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Compliance requirements, data regulations..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Section 10: Video Pitch */}
              {currentSection === 10 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Video Pitch Requirement</h2>
                    <p className="text-muted-foreground">Record your pitch for us</p>
                  </div>

                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm">
                      <strong>Instructions:</strong> Record a 1–2.5 minute video explaining why Sineva AI should 
                      invest in you. Include: who you are, the problem, your solution, traction, and why your 
                      team will win. Upload to YouTube (unlisted), Google Drive, Loom, etc. and paste the link below.
                    </p>
                  </div>

                  <FormField control={form.control} name="videoPitchUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video Pitch URL *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://youtube.com/watch?v=..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="deckUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Optional Pitch Deck (PDF Link)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://drive.google.com/..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Section 11: Fit and Declarations */}
              {currentSection === 11 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Fit with Sineva AI & Final Declarations</h2>
                    <p className="text-muted-foreground">Why Sineva AI?</p>
                  </div>

                  <FormField control={form.control} name="whyCinemaAI" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why Do You Specifically Want Sineva AI as an Investor? (Max 200 words) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="What attracts you to Sineva AI?" rows={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="howCanWeHelp" render={({ field }) => (
                    <FormItem>
                      <FormLabel>How Can Sineva AI Help You Apart from Money? (Max 150 words) *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Network, expertise, connections..." rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="additionalInfo" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Any Additional Information? (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Anything else you want us to know..." rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="font-semibold">Compliance & Consent</h3>
                    
                    <FormField control={form.control} name="confirmTruth" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I confirm that all information provided is true to the best of my knowledge *
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="agreeToShare" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I agree to share my information with Sineva AI for evaluation purposes *
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="agreeToContact" render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I agree to be contacted via email/phone/WhatsApp regarding my application *
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t border-border">
                {currentSection > 1 && (
                  <Button type="button" variant="outline" onClick={() => setCurrentSection(prev => prev - 1)}>
                    Previous
                  </Button>
                )}
                {currentSection < totalSections ? (
                  <Button type="button" onClick={() => setCurrentSection(prev => prev + 1)} className="ml-auto">
                    Next
                  </Button>
                ) : (
                  <Button type="submit" className="ml-auto">
                    Submit Application
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
