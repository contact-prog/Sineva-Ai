import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send, Inbox, FileText, Star, Trash2, Clock, Plus, CheckCircle2, RefreshCw, Search, ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmailThreadView } from "@/components/email/EmailThreadView";

export default function EmailGenerator() {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [ccRecipients, setCcRecipients] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentCc, setCurrentCc] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState("");
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [outlookEmail, setOutlookEmail] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ filename: string; content: string }>>([]);
  const [emailFolder, setEmailFolder] = useState<'inbox' | 'sent'>('inbox');
  const [emails, setEmails] = useState<any[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [showScheduleSection, setShowScheduleSection] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledEmails, setScheduledEmails] = useState<any[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [selectedScheduledEmail, setSelectedScheduledEmail] = useState<any>(null);
  const [isScheduledEmailDialogOpen, setIsScheduledEmailDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [inboxReplyMessage, setInboxReplyMessage] = useState("");
  const [isSendingInboxReply, setIsSendingInboxReply] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    checkEmailConnection();
    
    // Check for connection success/error in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    if (connected === 'gmail' || connected === 'outlook') {
      toast({
        title: `${connected === 'gmail' ? 'Gmail' : 'Outlook'} Connected`,
        description: `Your ${connected === 'gmail' ? 'Gmail' : 'Outlook'} account has been connected successfully!`,
      });
      checkEmailConnection();
      window.history.replaceState({}, '', '/app/email-generator');
    } else if (urlParams.get('error')) {
      toast({
        title: "Connection Failed",
        description: `Failed to connect: ${urlParams.get('error')}`,
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/app/email-generator');
    }
  }, []);

  useEffect(() => {
    if (gmailConnected || outlookConnected) {
      fetchEmails();
      fetchScheduledEmails();
    }
  }, [gmailConnected, outlookConnected, emailFolder]);

  // Real-time subscription for scheduled email updates
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('scheduled-emails-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'email_history',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Email status update:', payload);
            
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              const updatedEmail = payload.new;
              // Verify the email belongs to current user before updating state
              if (updatedEmail.user_id === user.id && updatedEmail.send_mode === 'scheduled') {
                setScheduledEmails(prev => {
                  const exists = prev.find(e => e.id === updatedEmail.id);
                  if (exists) {
                    return prev.map(e => e.id === updatedEmail.id ? updatedEmail : e);
                  } else {
                    return [updatedEmail, ...prev];
                  }
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedEmail = payload.old;
              // Only remove if it belongs to current user
              if (deletedEmail.user_id === user.id) {
                setScheduledEmails(prev => prev.filter(e => e.id !== deletedEmail.id));
              }
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, emailFolder]);

  const checkEmailConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: accounts, error } = await supabase
        .from('social_accounts')
        .select('platform, account_name, is_active')
        .eq('user_id', user.id)
        .in('platform', ['gmail', 'outlook'])
        .eq('is_active', true);

      if (error) {
        console.error('Error checking email connections:', error);
        return;
      }

      if (accounts && accounts.length > 0) {
        const gmailAccount = accounts.find(acc => acc.platform === 'gmail');
        const outlookAccount = accounts.find(acc => acc.platform === 'outlook');

        if (gmailAccount) {
          setGmailConnected(true);
          setGmailEmail(gmailAccount.account_name);
        }

        if (outlookAccount) {
          setOutlookConnected(true);
          setOutlookEmail(outlookAccount.account_name);
        }
      }
    } catch (error) {
      console.error('Error checking email connection:', error);
    }
  };

  const fetchEmails = async (pageToken?: string) => {
    if (pageToken) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingEmails(true);
      setEmails([]);
      setNextPageToken(null);
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Determine which service to use
      const functionName = gmailConnected ? 'get-gmail-messages' : 'get-outlook-messages';
      const serviceName = gmailConnected ? 'Gmail' : 'Outlook';

      const { data, error } = await supabase.functions.invoke(functionName, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          folder: emailFolder,
          maxResults: 50,
          pageToken: pageToken || undefined,
          skipToken: pageToken || undefined, // Outlook uses skipToken
        },
      });

      if (error) throw error;

      if (pageToken) {
        // Append to existing emails
        setEmails(prev => [...prev, ...(data.messages || [])]);
      } else {
        // Replace emails
        setEmails(data.messages || []);
      }
      
      setNextPageToken(data.nextPageToken || null);
    } catch (error: any) {
      console.error('Error fetching emails:', error);
      
      // Check if it's a token refresh error
      const errorMessage = error.message || error.error?.message || "";
      const isTokenError = errorMessage.includes("refresh") || errorMessage.includes("token") || errorMessage.includes("reconnect");
      
      const serviceName = gmailConnected ? 'Gmail' : 'Outlook';
      
      if (isTokenError) {
        toast({
          title: `${serviceName} Connection Expired`,
          description: `Your ${serviceName} connection has expired. Please reconnect your account.`,
          variant: "destructive",
          duration: 10000,
        });
        // Disconnect the expired account
        if (gmailConnected) {
          setGmailConnected(false);
          setGmailEmail("");
        } else {
          setOutlookConnected(false);
          setOutlookEmail("");
        }
        setEmails([]);
      } else {
        toast({
          title: "Failed to Load Emails",
          description: errorMessage || "Could not fetch your emails",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingEmails(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (nextPageToken && !isLoadingMore) {
      fetchEmails(nextPageToken);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(parseInt(timestamp));
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const filteredEmails = emails.filter(email => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      email.subject?.toLowerCase().includes(searchLower) ||
      email.from?.toLowerCase().includes(searchLower) ||
      email.to?.toLowerCase().includes(searchLower);
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredEmails.length / itemsPerPage);
  const paginatedEmails = filteredEmails.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEmailClick = (email: any) => {
    setSelectedEmail(email);
    setIsEmailDialogOpen(true);
  };

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please login first",
          variant: "destructive",
        });
        setIsConnecting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('gmail-auth-initiate', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          returnUrl: window.location.origin + window.location.pathname, // Pass current page URL
        },
      });

      if (error) throw error;

      // Redirect to Google OAuth
      window.location.href = data.oauthUrl;
    } catch (error: any) {
      console.error('Error initiating Gmail OAuth:', error);
      toast({
        title: "Connection Failed",
        description: error.message || 'Failed to connect Gmail',
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleConnectOutlook = async () => {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('outlook-auth-initiate', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          returnUrl: window.location.origin + window.location.pathname, // Pass current page URL
        },
      });

      if (error) throw error;

      if (data?.oauthUrl) {
        window.location.href = data.oauthUrl;
      }
    } catch (error: any) {
      console.error('Error initiating Outlook OAuth:', error);
      toast({
        title: "Connection Failed",
        description: error.message || 'Failed to connect Outlook',
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Determine which platform to disconnect based on what's connected
      let platformToDisconnect: 'gmail' | 'outlook' | null = null;
      if (gmailConnected) platformToDisconnect = 'gmail';
      else if (outlookConnected) platformToDisconnect = 'outlook';

      if (!platformToDisconnect) return;

      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', platformToDisconnect);

      if (error) throw error;

      // Update state based on disconnected platform
      if (platformToDisconnect === 'gmail') {
        setGmailConnected(false);
        setGmailEmail("");
      } else {
        setOutlookConnected(false);
        setOutlookEmail("");
      }
      setEmails([]);
      
      toast({
        title: `${platformToDisconnect === 'gmail' ? 'Gmail' : 'Outlook'} Disconnected`,
        description: `Your ${platformToDisconnect === 'gmail' ? 'Gmail' : 'Outlook'} account has been disconnected successfully`,
      });
    } catch (error: any) {
      console.error('Error disconnecting email:', error);
      toast({
        title: "Disconnection Failed",
        description: error.message || 'Failed to disconnect email',
        variant: "destructive",
      });
    }
  };

  const addRecipient = () => {
    if (currentEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) {
      if (!recipients.includes(currentEmail)) {
        setRecipients([...recipients, currentEmail]);
        setCurrentEmail("");
      } else {
        toast({
          title: "Duplicate Email",
          description: "This recipient is already added",
          variant: "destructive",
        });
      }
    } else if (currentEmail) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
    }
  };

  const parseCommaSeparatedEmails = (value: string, existingList: string[], setter: (list: string[]) => void) => {
    // Check if value contains commas
    if (value.includes(',')) {
      const emails = value.split(',').map(email => email.trim()).filter(email => email);
      const validEmails: string[] = [];
      const invalidEmails: string[] = [];
      
      emails.forEach(email => {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          if (!existingList.includes(email) && !validEmails.includes(email)) {
            validEmails.push(email);
          }
        } else if (email) {
          invalidEmails.push(email);
        }
      });

      if (validEmails.length > 0) {
        setter([...existingList, ...validEmails]);
      }

      if (invalidEmails.length > 0) {
        toast({
          title: "Invalid Emails Skipped",
          description: `Skipped invalid emails: ${invalidEmails.join(', ')}`,
          variant: "destructive",
        });
      }

      return true;
    }
    return false;
  };

  const addCcRecipient = () => {
    if (currentCc && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentCc)) {
      if (!ccRecipients.includes(currentCc)) {
        setCcRecipients([...ccRecipients, currentCc]);
        setCurrentCc("");
      } else {
        toast({
          title: "Duplicate Email",
          description: "This CC recipient is already added",
          variant: "destructive",
        });
      }
    } else if (currentCc) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const removeCcRecipient = (email: string) => {
    setCcRecipients(ccRecipients.filter(r => r !== email));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Array<{ filename: string; content: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const base64Content = base64.split(',')[1]; // Remove data:image/...;base64, prefix
        
        newAttachments.push({
          filename: file.name,
          content: base64Content,
        });

        if (newAttachments.length === files.length) {
          setAttachments(prev => [...prev, ...newAttachments]);
          toast({
            title: "Files Added",
            description: `${files.length} file(s) attached`,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Attachment Removed",
      description: "File removed from email",
    });
  };

  const handleSendEmail = async () => {
    // Auto-add any typed emails before validating
    const finalRecipients = [...recipients];
    const finalCcRecipients = [...ccRecipients];
    
    // Parse and add currentEmail if it contains valid emails
    if (currentEmail.trim()) {
      const emails = currentEmail.split(',').map(e => e.trim()).filter(e => e);
      emails.forEach(email => {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !finalRecipients.includes(email)) {
          finalRecipients.push(email);
        }
      });
    }
    
    // Parse and add currentCc if it contains valid emails
    if (currentCc.trim()) {
      const emails = currentCc.split(',').map(e => e.trim()).filter(e => e);
      emails.forEach(email => {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !finalCcRecipients.includes(email)) {
          finalCcRecipients.push(email);
        }
      });
    }
    
    if (finalRecipients.length === 0 || !subject || !message) {
      toast({
        title: "Missing Information",
        description: "Please add at least one recipient and fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!gmailConnected && !outlookConnected) {
      toast({
        title: "Email Not Connected",
        description: "Please connect your Gmail or Outlook account first",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    console.log("Starting email send process...");
    console.log("Recipients:", finalRecipients);
    console.log("Subject:", subject);
    console.log("CC:", finalCcRecipients);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Determine which service to use
      const serviceName = gmailConnected ? 'Gmail' : 'Outlook';
      const functionName = gmailConnected ? 'send-gmail' : 'send-outlook';
      
      console.log(`Calling ${functionName} edge function...`);
      const { data, error } = await supabase.functions.invoke(functionName, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          to: finalRecipients,
          cc: finalCcRecipients.length > 0 ? finalCcRecipients : undefined,
          subject: subject,
          body: message,
          attachments: attachments.length > 0 ? attachments.map(att => ({
            filename: att.filename,
            content: att.content,
            mimeType: att.filename.endsWith('.pdf') ? 'application/pdf' : 
                     att.filename.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
                     att.filename.endsWith('.png') ? 'image/png' : 
                     'application/octet-stream'
          })) : undefined,
        },
      });

      console.log("Edge function response:", data);
      console.log("Edge function error:", error);

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Email Sent Successfully",
          description: `Email sent via ${serviceName} to ${finalRecipients.length} recipient(s)${finalCcRecipients.length > 0 ? ` (${finalCcRecipients.length} in CC)` : ''}`,
        });
        
        // Reset form
        setRecipients([]);
        setCcRecipients([]);
        setCurrentEmail("");
        setCurrentCc("");
        setSubject("");
        setMessage("");
        setAttachments([]);
      } else {
        throw new Error(data.error || "Failed to send email");
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      
      // Check if it's a token refresh error
      const errorMessage = error.message || error.error?.message || "";
      const isTokenError = errorMessage.includes("refresh") || errorMessage.includes("token") || errorMessage.includes("reconnect");
      
      if (isTokenError) {
        toast({
          title: `${gmailConnected ? 'Gmail' : 'Outlook'} Connection Expired`,
          description: `Your ${gmailConnected ? 'Gmail' : 'Outlook'} connection has expired. Please reconnect your account below.`,
          variant: "destructive",
          duration: 10000,
        });
        // Disconnect the expired account
        setGmailConnected(false);
        setGmailEmail("");
      } else {
        toast({
          title: "Failed to Send Email",
          description: errorMessage || "An error occurred while sending the email",
          variant: "destructive",
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const fetchScheduledEmails = async () => {
    try {
      setIsLoadingScheduled(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setScheduledEmails([]);
        return;
      }

      const { data, error } = await supabase
        .from('email_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('send_mode', 'scheduled')
        .eq('status', 'scheduled')
        .not('scheduled_for', 'is', null)
        .order('scheduled_for', { ascending: false });

      if (error) {
        console.error('Error fetching scheduled emails:', error);
        setScheduledEmails([]);
        throw error;
      }
      
      // Additional safeguard: filter client-side to ensure only user's emails
      const userEmails = (data || []).filter(email => email.user_id === user.id);
      setScheduledEmails(userEmails);
    } catch (error) {
      console.error('Error fetching scheduled emails:', error);
      setScheduledEmails([]);
    } finally {
      setIsLoadingScheduled(false);
    }
  };

  const handleScheduleEmail = async () => {
    console.log('handleScheduleEmail called');
    console.log('scheduledDate:', scheduledDate);
    console.log('scheduledTime:', scheduledTime);
    console.log('recipients:', recipients);
    console.log('subject:', subject);
    console.log('message:', message);

    if (!scheduledDate || !scheduledTime) {
      toast({
        title: "Missing Information",
        description: "Please select both date and time for scheduling",
        variant: "destructive",
      });
      return;
    }

    // Auto-add any typed emails before validating
    const finalRecipients = [...recipients];
    const finalCcRecipients = [...ccRecipients];
    
    // Parse and add currentEmail if it contains valid emails
    if (currentEmail.trim()) {
      const emails = currentEmail.split(',').map(e => e.trim()).filter(e => e);
      emails.forEach(email => {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !finalRecipients.includes(email)) {
          finalRecipients.push(email);
        }
      });
    }
    
    // Parse and add currentCc if it contains valid emails
    if (currentCc.trim()) {
      const emails = currentCc.split(',').map(e => e.trim()).filter(e => e);
      emails.forEach(email => {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !finalCcRecipients.includes(email)) {
          finalCcRecipients.push(email);
        }
      });
    }

    if (finalRecipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please add at least one recipient",
        variant: "destructive",
      });
      return;
    }

    if (!subject || !message) {
      toast({
        title: "Incomplete Email",
        description: "Please fill in subject and message",
        variant: "destructive",
      });
      return;
    }

    if (!gmailConnected && !outlookConnected) {
      toast({
        title: "Email Not Connected",
        description: "Please connect your Gmail or Outlook account first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsScheduling(true);
      
      const scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`;
      const scheduledDateObj = new Date(scheduledDateTime);
      console.log('scheduledDateTime:', scheduledDateTime);
      console.log('scheduledDateObj:', scheduledDateObj);

      if (scheduledDateObj <= new Date()) {
        toast({
          title: "Invalid Time",
          description: "Please select a future date and time",
          variant: "destructive",
        });
        setIsScheduling(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      console.log('Calling schedule-email edge function...');
      const { data, error } = await supabase.functions.invoke('schedule-email', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          to: finalRecipients,
          cc: finalCcRecipients.length > 0 ? finalCcRecipients : undefined,
          subject,
          body: message,
          scheduledFor: scheduledDateObj.toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      console.log('schedule-email response:', data);
      console.log('schedule-email error:', error);

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to schedule email');
      }

      toast({
        title: "Email Scheduled",
        description: `Email will be sent on ${scheduledDateObj.toLocaleString()}`,
      });

      // Reset form
      setRecipients([]);
      setCcRecipients([]);
      setCurrentEmail("");
      setCurrentCc("");
      setSubject("");
      setMessage("");
      setScheduledDate("");
      setScheduledTime("");
      setShowScheduleSection(false);
      setAttachments([]);
      
      // Refresh scheduled emails list
      await fetchScheduledEmails();
    } catch (error: any) {
      console.error('Error scheduling email:', error);
      const errorMessage = error.message || error.error?.message || 'Unknown error';
      toast({
        title: "Scheduling Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelScheduled = async (emailId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('email_history')
        .update({ status: 'cancelled' })
        .eq('id', emailId)
        .eq('user_id', user.id); // Additional security: ensure user owns this email

      if (error) throw error;

      toast({
        title: "Scheduled Email Cancelled",
        description: "The email will not be sent",
      });

      fetchScheduledEmails();
    } catch (error) {
      console.error('Error cancelling email:', error);
      toast({
        title: "Cancellation Failed",
        description: "Failed to cancel scheduled email",
        variant: "destructive",
      });
    }
  };

  const handleSendReply = async () => {
    if (!selectedScheduledEmail || !replyMessage.trim()) return;

    try {
      setIsSendingReply(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Determine which service to use
      const serviceName = gmailConnected ? 'send-gmail' : 'send-outlook';
      
      // Send reply via appropriate service
      const { data, error } = await supabase.functions.invoke(serviceName, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          to: [selectedScheduledEmail.from_email || selectedScheduledEmail.recipient_email],
          subject: `Re: ${selectedScheduledEmail.subject}`,
          body: replyMessage,
        },
      });

      if (error) throw error;

      // Save reply to email_history
      const { error: insertError } = await supabase
        .from('email_history')
        .insert({
          user_id: session.user.id,
          recipient_email: selectedScheduledEmail.from_email || selectedScheduledEmail.recipient_email,
          subject: `Re: ${selectedScheduledEmail.subject}`,
          body: replyMessage,
          status: 'sent',
          direction: 'sent',
          send_mode: 'immediate',
          replied_to_email_id: selectedScheduledEmail.id,
          from_email: gmailEmail || outlookEmail,
        });

      if (insertError) throw insertError;

      toast({
        title: "Reply Sent",
        description: "Your reply has been sent successfully",
      });

      // Clear reply and refresh
      setReplyMessage("");
      await fetchScheduledEmails();
      
      // Refresh the selected email to show updated thread
      const { data: updatedEmail } = await supabase
        .from('email_history')
        .select('*')
        .eq('id', selectedScheduledEmail.id)
        .single();
      
      if (updatedEmail) {
        setSelectedScheduledEmail(updatedEmail);
      }
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({
        title: "Reply Failed",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSendInboxReply = async () => {
    if (!selectedEmail || !inboxReplyMessage.trim()) return;

    try {
      setIsSendingInboxReply(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Optimistically add reply to UI
      const optimisticReply = {
        from: gmailEmail || outlookEmail || 'You',
        date: new Date().toISOString(),
        content: inboxReplyMessage,
      };

      // Determine which service to use
      const serviceName = gmailConnected ? 'send-gmail' : 'send-outlook';
      
      // Prepare threading headers
      const messageId = selectedEmail.messageId || selectedEmail.id;
      const threadId = selectedEmail.threadId;
      
      // Build References chain: combine existing references with the current message ID
      let referencesChain = selectedEmail.references || '';
      if (messageId) {
        referencesChain = referencesChain ? `${referencesChain} ${messageId}` : messageId;
      }
      
      // Keep the subject line unchanged if it already starts with Re:
      const replySubject = selectedEmail.subject || '(No subject)';
      
      // Send reply via appropriate service with threading headers
      const { data, error } = await supabase.functions.invoke(serviceName, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          to: [selectedEmail.from],
          subject: replySubject, // Keep subject unchanged for proper threading
          body: inboxReplyMessage,
          ...(gmailConnected && messageId && {
            inReplyTo: messageId,
            references: referencesChain, // Use the full references chain
          }),
          ...(outlookConnected && {
            inReplyTo: messageId,
            conversationId: threadId,
          }),
        },
      });

      if (error) throw error;

      // Use the NEW message ID from the response, not the original message ID
      const newMessageId = data?.messageId || `reply-${Date.now()}`;

      // Check if selectedEmail.id is a valid UUID (from our database) or just a message ID
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedEmail.id);

      // Save reply to email_history with threading information
      const { error: insertError } = await supabase
        .from('email_history')
        .insert({
          user_id: session.user.id,
          recipient_email: selectedEmail.from,
          subject: replySubject, // Store the unchanged subject
          body: inboxReplyMessage,
          status: 'sent',
          direction: 'sent',
          send_mode: 'immediate',
          from_email: gmailEmail || outlookEmail,
          provider_message_id: newMessageId,
          message_id: newMessageId, // Store Message-ID for future threading
          references_header: referencesChain, // Store the full references chain
          // Only set replied_to_email_id if we have a valid UUID from our database
          ...(isValidUUID && { replied_to_email_id: selectedEmail.id }),
        });

      if (insertError) throw insertError;

      toast({
        title: "Reply Sent",
        description: "Your reply has been sent and will appear in the same thread",
      });

      // Clear reply and refresh
      setInboxReplyMessage("");
      await fetchEmails();
      
      // Update the selected email to show the new reply optimistically
      setSelectedEmail({
        ...selectedEmail,
        body: selectedEmail.body + '\n\n---\n\n' + inboxReplyMessage,
      });
    } catch (error: any) {
      console.error('Error sending inbox reply:', error);
      toast({
        title: "Reply Failed",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setIsSendingInboxReply(false);
    }
  };

  const handleUseTemplate = (template: string) => {
    setSelectedTemplate(template);
    const templates: Record<string, { subject: string; message: string }> = {
      welcome: {
        subject: "Welcome to Our Community! 🎉",
        message: "Dear valued customer,\n\nThank you for joining us! We're excited to have you on board.\n\nBest regards,\nThe Team",
      },
      newsletter: {
        subject: "Our Latest Updates & News",
        message: "Hello!\n\nHere are this month's highlights and updates...\n\nStay tuned for more!\nThe Team",
      },
      product: {
        subject: "Introducing Our New Product",
        message: "We're thrilled to announce the launch of our latest product!\n\nCheck it out today.\n\nBest,\nThe Team",
      },
    };
    
    const templateData = templates[template];
    if (templateData) {
      setSubject(templateData.subject);
      setMessage(templateData.message);
      toast({
        title: "Template Applied",
        description: `${template} template has been loaded`,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between glass-card p-6 border-l-4 border-primary">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email Marketing</h1>
          <p className="text-muted-foreground mt-1">
            Create, manage, and send professional email campaigns • Use main chat for AI assistance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {gmailConnected || outlookConnected ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    {gmailConnected ? 'Gmail' : 'Outlook'} Connected
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    {gmailConnected ? gmailEmail : outlookEmail}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleDisconnect}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Mail className="w-4 h-4" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsConnectModalOpen(true)}
              disabled={isConnecting}
              variant="outline"
              className="gap-2"
            >
              <Mail className="w-4 h-4" />
              {isConnecting ? 'Connecting...' : 'Connect Email'}
            </Button>
          )}
          <Button onClick={handleSendEmail} disabled={isSending || (!gmailConnected && !outlookConnected)} className="gap-2 hover-glow">
            <Send className="h-4 w-4" />
            {isSending ? 'Sending...' : 'Send Campaign'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card border-primary/20 hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">1,234</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-primary/20 hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Inbox className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">24.5%</div>
            <p className="text-xs text-muted-foreground">Above industry avg</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-primary/20 hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">3.2%</div>
            <p className="text-xs text-muted-foreground">+0.8% from last week</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-primary/20 hover-lift">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Send className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">5</div>
            <p className="text-xs text-muted-foreground">3 scheduled</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="compose" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Compose Email</CardTitle>
              <CardDescription>Create a new email campaign or use main chat for AI-generated content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipients">To: *</Label>
                <div className="flex gap-2">
                  <Input 
                    id="recipients" 
                    placeholder="Enter email addresses (comma-separated)" 
                    value={currentEmail}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (parseCommaSeparatedEmails(value, recipients, setRecipients)) {
                        setCurrentEmail("");
                      } else {
                        setCurrentEmail(value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        addRecipient();
                      }
                    }}
                  />
                  <Button type="button" onClick={addRecipient} variant="secondary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                {recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {recipients.map((email) => (
                      <Badge key={email} variant="default" className="gap-2">
                        {email}
                        <button
                          type="button"
                          onClick={() => removeRecipient(email)}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cc">CC: (Optional)</Label>
                <div className="flex gap-2">
                  <Input 
                    id="cc" 
                    placeholder="Enter CC email addresses (comma-separated)" 
                    value={currentCc}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (parseCommaSeparatedEmails(value, ccRecipients, setCcRecipients)) {
                        setCurrentCc("");
                      } else {
                        setCurrentCc(value);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        addCcRecipient();
                      }
                    }}
                  />
                  <Button type="button" onClick={addCcRecipient} variant="secondary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
                {ccRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ccRecipients.map((email) => (
                      <Badge key={email} variant="outline" className="gap-2">
                        {email}
                        <button
                          type="button"
                          onClick={() => removeCcRecipient(email)}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line *</Label>
                <Input 
                  id="subject" 
                  placeholder="Your email subject..." 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea 
                  id="message" 
                  placeholder="Write your email message here... Or ask AI in the main chat to generate content for you!"
                  className="min-h-[250px]"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attachments">Attachments (Images, PDFs, etc.)</Label>
                <Input 
                  id="attachments" 
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="cursor-pointer"
                />
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attachments.map((file, index) => (
                      <Badge key={index} variant="secondary" className="gap-2">
                        {file.filename}
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedule Email Section */}
              <div className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Schedule Email
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowScheduleSection(!showScheduleSection)}
                  >
                    {showScheduleSection ? 'Hide' : 'Show'}
                  </Button>
                </div>

                {showScheduleSection && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="scheduledDate">Date</Label>
                        <Input
                          id="scheduledDate"
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="scheduledTime">Time</Label>
                        <Input
                          id="scheduledTime"
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleScheduleEmail}
                      disabled={isScheduling || !scheduledDate || !scheduledTime || (!gmailConnected && !outlookConnected)}
                      className="w-full"
                      variant="secondary"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {isScheduling ? 'Scheduling...' : 'Schedule Email'}
                    </Button>
                  </div>
                )}
              </div>
              <div className="p-4 border border-primary/20 rounded-lg glass-effect">
                <p className="text-sm text-muted-foreground mb-2">
                  💡 <strong>Pro Tip:</strong> Use the main AI chat to generate email content, then paste it here!
                </p>
                <p className="text-xs text-muted-foreground">
                  Try: "Generate a welcome email for new customers" or "Create a product launch announcement"
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSendEmail} disabled={isSending || (!gmailConnected && !outlookConnected)} className="hover-glow">
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? 'Sending...' : 'Send Now'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Emails Tab */}
        <TabsContent value="scheduled">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Scheduled Emails</CardTitle>
              <CardDescription>View and manage your scheduled emails</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingScheduled ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : scheduledEmails.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No scheduled emails</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledEmails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => {
                        setSelectedScheduledEmail(email);
                        setIsScheduledEmailDialogOpen(true);
                      }}
                      className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={
                                email.status === 'scheduled'
                                  ? 'default'
                                  : email.status === 'sent'
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {email.status === 'scheduled' ? 'Scheduled' : email.status === 'sent' ? 'Sent' : 'Failed'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {email.scheduled_for ? new Date(email.scheduled_for).toLocaleString() : new Date(email.created_at).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="font-semibold truncate">{email.subject}</h4>
                          <p className="text-sm text-muted-foreground">To: {email.recipient_email}</p>
                          {email.cc_emails && email.cc_emails.length > 0 && (
                            <p className="text-xs text-muted-foreground">CC: {email.cc_emails.join(', ')}</p>
                          )}
                          {email.error_message && (
                            <p className="text-xs text-destructive mt-1">Error: {email.error_message}</p>
                          )}
                        </div>
                        {email.status === 'scheduled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelScheduled(email.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inbox Tab */}
        <TabsContent value="inbox">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>Your Emails</CardTitle>
                    <CardDescription>View your inbox and sent emails</CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex gap-1 border border-primary/20 rounded-lg p-1">
                      <Button
                        variant={emailFolder === 'inbox' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setEmailFolder('inbox')}
                        className="text-xs sm:text-sm"
                      >
                        <Inbox className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Inbox</span>
                      </Button>
                      <Button
                        variant={emailFolder === 'sent' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setEmailFolder('sent')}
                        className="text-xs sm:text-sm"
                      >
                        <Send className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Sent</span>
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchEmails()}
                      disabled={isLoadingEmails}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoadingEmails ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
                
                {(gmailConnected || outlookConnected) && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by subject or sender..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!gmailConnected && !outlookConnected ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Connect an email service to view your emails</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={handleConnectGmail}>
                      <Mail className="h-4 w-4 mr-2" />
                      Connect Gmail
                    </Button>
                    <Button onClick={handleConnectOutlook}>
                      <Mail className="h-4 w-4 mr-2" />
                      Connect Outlook
                    </Button>
                  </div>
                </div>
              ) : isLoadingEmails ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 border border-primary/20 rounded-lg">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="text-center py-8">
                  <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No emails match your search' : `No emails found in ${emailFolder}`}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 overflow-hidden">
                    {paginatedEmails.map((email) => (
                      <div 
                        key={email.id} 
                        onClick={() => handleEmailClick(email)}
                        className="flex items-center gap-3 p-3 sm:p-4 border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer group"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${email.unread ? 'bg-primary' : 'bg-muted'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className={`font-medium truncate text-sm sm:text-base ${email.unread ? 'text-primary' : 'text-foreground'}`}>
                              {emailFolder === 'sent' ? email.to : email.from}
                            </p>
                            {email.unread && <Badge variant="outline" className="text-xs flex-shrink-0">New</Badge>}
                          </div>
                          <p className={`text-xs sm:text-sm truncate ${email.unread ? 'font-medium' : 'text-muted-foreground'}`}>
                            {email.subject || '(No subject)'}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {formatDate(email.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="mt-4 pt-4 border-t border-primary/20">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">
                        {totalPages > 1 && `Page ${currentPage} of ${totalPages} • `}
                        {filteredEmails.length} emails loaded
                      </p>
                      {totalPages > 1 && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Previous</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            <span className="hidden sm:inline mr-1">Next</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Load More from Gmail */}
                    {nextPageToken && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Loading older emails...
                          </>
                        ) : (
                          'Load More Emails from Gmail'
                        )}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Templates</CardTitle>
                  <CardDescription>Pre-designed templates for common campaigns</CardDescription>
                </div>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { id: "welcome", name: "Welcome Email", category: "Onboarding", uses: 234, description: "Greet new customers" },
                  { id: "newsletter", name: "Newsletter", category: "Marketing", uses: 156, description: "Monthly updates" },
                  { id: "product", name: "Product Launch", category: "Announcement", uses: 89, description: "Announce new products" },
                  { id: "followup", name: "Follow-up", category: "Sales", uses: 145, description: "Re-engage prospects" },
                  { id: "event", name: "Event Invitation", category: "Events", uses: 67, description: "Invite to events" },
                  { id: "thanks", name: "Thank You", category: "Engagement", uses: 198, description: "Show appreciation" },
                ].map((template, i) => (
                  <div key={i} className="p-4 border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors glass-effect group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1 text-foreground">{template.name}</h4>
                        <Badge variant="outline" className="text-xs mb-2">{template.category}</Badge>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      </div>
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Used {template.uses} times</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full group-hover:border-primary group-hover:text-primary transition-colors"
                      onClick={() => handleUseTemplate(template.id)}
                    >
                      Use Template
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Detail Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Email Thread</DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Thread View */}
              <EmailThreadView
                from={selectedEmail.from}
                to={selectedEmail.to}
                cc={selectedEmail.cc}
                date={selectedEmail.timestamp}
                subject={selectedEmail.subject || '(No subject)'}
                body={selectedEmail.body || selectedEmail.snippet || 'No content available'}
              />

              {/* Reply Box */}
              <div className="border-t border-border pt-4 space-y-3">
                <Label className="text-sm font-semibold">Reply</Label>
                <Textarea
                  placeholder="Type your reply..."
                  value={inboxReplyMessage}
                  onChange={(e) => setInboxReplyMessage(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSendInboxReply}
                    disabled={isSendingInboxReply || !inboxReplyMessage.trim()}
                    size="sm"
                  >
                    {isSendingInboxReply ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Reply
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scheduled Email Detail Dialog */}
      <Dialog open={isScheduledEmailDialogOpen} onOpenChange={setIsScheduledEmailDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Email Thread</DialogTitle>
          </DialogHeader>
          {selectedScheduledEmail && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    selectedScheduledEmail.status === 'scheduled'
                      ? 'default'
                      : selectedScheduledEmail.status === 'sent'
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {selectedScheduledEmail.status === 'scheduled' ? 'Scheduled' : selectedScheduledEmail.status === 'sent' ? 'Sent' : 'Failed'}
                </Badge>
                {selectedScheduledEmail.scheduled_for && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(selectedScheduledEmail.scheduled_for).toLocaleString()}
                  </span>
                )}
              </div>

              {/* Thread View */}
              <EmailThreadView
                from={selectedScheduledEmail.from_email || gmailEmail || outlookEmail || 'Unknown'}
                to={selectedScheduledEmail.recipient_email}
                cc={selectedScheduledEmail.cc_emails || undefined}
                date={selectedScheduledEmail.created_at}
                subject={selectedScheduledEmail.subject}
                body={selectedScheduledEmail.body}
              />

              {/* Error Message */}
              {selectedScheduledEmail.error_message && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{selectedScheduledEmail.error_message}</p>
                </div>
              )}

              {/* Reply Box - Only show for sent emails */}
              {selectedScheduledEmail.status === 'sent' && (
                <div className="border-t border-border pt-4 space-y-3">
                  <Label className="text-sm font-semibold">Reply</Label>
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyMessage.trim()}
                      size="sm"
                    >
                      {isSendingReply ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Connect Email Modal */}
      <Dialog open={isConnectModalOpen} onOpenChange={setIsConnectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Email Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              onClick={() => {
                setIsConnectModalOpen(false);
                handleConnectGmail();
              }}
              disabled={isConnecting}
              variant="outline"
              className="w-full h-20 flex flex-col items-center justify-center gap-2"
            >
              <Mail className="h-6 w-6 text-red-500" />
              <span className="font-medium">Connect with Gmail</span>
            </Button>
            <Button
              onClick={() => {
                setIsConnectModalOpen(false);
                handleConnectOutlook();
              }}
              disabled={isConnecting}
              variant="outline"
              className="w-full h-20 flex flex-col items-center justify-center gap-2"
            >
              <Mail className="h-6 w-6 text-blue-500" />
              <span className="font-medium">Connect with Outlook</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
