import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Calendar, LogOut, Trash2, Shield, Package, Plug, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import BrandKit from "./BrandKit";
import Integrations from "./Integrations";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserData {
  company_name: string | null;
  industry: string | null;
  onboarding_completed: boolean;
}

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteStatus, setDeleteStatus] = useState<string>("");
  
  // Get the active tab from URL params, default to "account"
  const activeTab = searchParams.get("tab") || "account";

  useEffect(() => {
    loadUserData();
  }, []);

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // Fetch user_profiles for additional data
      const { data: userProfileData } = await supabase
        .from('user_profiles')
        .select('company_name, industry, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      setProfile({
        id: user.id,
        email: user.email || '',
        name: profileData?.name || null,
        avatar_url: profileData?.avatar_url || null,
        created_at: user.created_at
      });

      setUserData(userProfileData);
      setName(profileData?.name || '');
    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully"
      });

      setProfile({ ...profile, name });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    if (deleteConfirmText !== "DELETE") {
      toast({
        title: "Confirmation Required",
        description: 'Please type "DELETE" to confirm account deletion',
        variant: "destructive"
      });
      return;
    }

    setDeleting(true);
    setDeleteProgress(0);
    
    try {
      // Animated progress for better UX
      setDeleteStatus("Preparing to delete account...");
      setDeleteProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));

      setDeleteStatus("Deleting all your data...");
      setDeleteProgress(40);
      
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        method: 'POST'
      });

      if (error) throw new Error(error.message || 'Failed to delete account');

      setDeleteStatus("Cleaning up storage...");
      setDeleteProgress(70);
      await new Promise(resolve => setTimeout(resolve, 500));

      setDeleteStatus("Finalizing deletion...");
      setDeleteProgress(90);
      await new Promise(resolve => setTimeout(resolve, 300));

      setDeleteProgress(100);
      setDeleteStatus("Account deleted successfully");

      toast({
        title: "Account Deleted",
        description: "Your account and all data have been permanently deleted",
        duration: 5000
      });

      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Sign out (may fail if user already deleted, but that's okay)
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.log('Sign out after deletion (expected):', signOutError);
      }
      
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete account. Please contact support.",
        variant: "destructive"
      });
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
      setDeleteProgress(0);
      setDeleteStatus("");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText("");
    setDeleteProgress(0);
    setDeleteStatus("");
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6 max-w-6xl">
        <div className="bg-card border border-border/30 rounded-lg p-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert>
          <AlertDescription>
            Failed to load profile data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, brand kit, and integrations
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="brand" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Brand Kit
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* Account Settings Tab */}
        <TabsContent value="account" className="space-y-6 mt-6">
          {/* Profile Section */}
          <Card className="border border-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {getInitials(profile.name, profile.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{profile.name || 'No name set'}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {profile.email}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    Member since {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if you need assistance.
                </p>
              </div>

              <Button 
                onClick={handleSaveProfile} 
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Business Information */}
          {userData && (
            <Card className="border border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Business Information
                </CardTitle>
                <CardDescription>Your company and industry details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Company</Label>
                    <p className="font-medium">{userData.company_name || 'Not set'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Industry</Label>
                    <p className="font-medium">{userData.industry || 'Not set'}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('brand')}
                >
                  Edit Business Details
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Account Actions */}
          <Card className="border border-border/30">
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              
              <Alert className="border-destructive/50 bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="ml-2">
                  <p className="font-medium text-destructive mb-2">Danger Zone - Delete Account</p>
                  
                  <AnimatePresence mode="wait">
                    {!showDeleteConfirm ? (
                      <motion.div
                        key="initial"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <p className="text-sm text-muted-foreground mb-3">
                          Permanently delete your account and all associated data including graphics, videos, content, social connections, and files.
                        </p>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleDeleteAccount}
                          className="animate-fade-in"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete Account
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        {!deleting ? (
                          <>
                            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20 animate-fade-in">
                              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-destructive">
                                  WARNING: This action cannot be undone!
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  All your data will be permanently deleted from our servers.
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="delete-confirm" className="text-sm font-medium">
                                Type <span className="font-mono font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">DELETE</span> to confirm:
                              </Label>
                              <Input
                                id="delete-confirm"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="Type DELETE"
                                className="font-mono border-destructive/50 focus:border-destructive"
                                autoFocus
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== "DELETE"}
                                className="hover:scale-105 transition-transform"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Permanently Delete
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handleCancelDelete}
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-4 p-4 bg-background rounded-lg border border-border"
                          >
                            <div className="flex items-center gap-3">
                              <Loader2 className="h-5 w-5 animate-spin text-destructive" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{deleteStatus}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Please wait while we process your request...
                                </p>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span>{deleteProgress}%</span>
                              </div>
                              <Progress value={deleteProgress} className="h-2" />
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Kit Tab */}
        <TabsContent value="brand" className="mt-6">
          <BrandKit />
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-6">
          <Integrations />
        </TabsContent>
      </Tabs>
    </div>
  );
}
