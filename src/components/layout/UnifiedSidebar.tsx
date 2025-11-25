import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChat } from '@/contexts/ChatContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Plus, 
  Search, 
  Home,
  Brain,
  Images,
  Wand2,
  Video,
  FileText,
  Globe,
  Calendar,
  Share2,
  Mail,
  Package,
  Plug,
  Settings,
  Trash2,
  ChevronUp,
  Moon,
  Sun,
  LogOut
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';
import { useToast } from '@/hooks/use-toast';
import logoLight from '@/assets/sineva-logo-light.png';
import logoDark from '@/assets/sineva-logo-dark.png';

interface UserProfile {
  email: string;
  name: string | null;
  avatar_url: string | null;
}

const navigationGroups = [
  {
    label: 'Main',
    items: [
      { title: 'Dashboard', url: '/app/dashboard', icon: Home },
      { title: 'Media Gallery', url: '/app/gallery', icon: Images },
    ]
  },
  {
    label: 'Create',
    items: [
      { title: 'Graphics', url: '/app/graphics', icon: Wand2 },
      { title: 'Videos', url: '/app/videos', icon: Video },
      { title: 'Content', url: '/app/content', icon: FileText },
      { title: 'WordPress', url: '/app/wordpress', icon: Globe },
    ]
  },
  {
    label: 'Marketing',
    items: [
      { title: 'Calendar', url: '/app/calendar', icon: Calendar },
      { title: 'Social Media', url: '/app/social', icon: Share2 },
      { title: 'Email', url: '/app/email-generator', icon: Mail },
    ]
  },
  {
    label: 'Settings',
    items: [
      { title: 'Settings', url: '/app/settings', icon: Settings },
    ]
  }
];

const INITIAL_DISPLAY_LIMIT = 4;

export function UnifiedSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const collapsed = state === 'collapsed';
  const { conversations, createConversation, selectConversation, currentConversation } = useChat();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllChats, setShowAllChats] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      setUserProfile({
        email: profile?.email || user.email || '',
        name: profile?.name || null,
        avatar_url: profile?.avatar_url || null
      });
    } catch (error) {
      console.error('Error loading profile:', error);
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

  const handleNewChat = async () => {
    await createConversation();
    navigate('/app/chat');
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      if (currentConversation?.id === conversationId) {
        navigate('/app/chat');
      }

      window.location.reload();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      });
    }
  };

  const getInitials = () => {
    if (userProfile?.name) {
      return userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (userProfile?.email) {
      return userProfile.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const filteredConversations = conversations.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sidebar className={cn(collapsed ? "w-14" : "w-64")} collapsible="icon">
      <SidebarHeader className="border-b border-border/30 p-3">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <img 
              src={theme === 'dark' ? logoDark : logoLight}
              alt="Sineva AI" 
              className="h-6 w-auto"
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        {/* Chat Section */}
        <div className="p-2 space-y-2 border-b border-border/30">
          {/* New Chat Button */}
          <Button 
            onClick={handleNewChat} 
            className="w-full justify-start gap-2"
            variant="default"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            {!collapsed && <span>New Chat</span>}
          </Button>

          {/* Chat as nav item */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink 
                  to="/app/chat" 
                  className="hover:bg-muted/50" 
                  activeClassName="bg-sidebar-accent border-l-2 border-primary text-primary font-medium"
                >
                  <Brain className="h-4 w-4" />
                  {!collapsed && <span>Sineva Brain</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Search Conversations */}
          {!collapsed && conversations.length > 0 && (
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          )}

          {/* Conversation List */}
          {!collapsed && filteredConversations.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Chats ({filteredConversations.length})</span>
                {filteredConversations.length > INITIAL_DISPLAY_LIMIT && (
                  <button
                    onClick={() => setShowAllChats(!showAllChats)}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    {showAllChats ? 'Collapse' : 'Expand'}
                  </button>
                )}
              </div>
              {(showAllChats
                ? filteredConversations 
                : filteredConversations.slice(0, INITIAL_DISPLAY_LIMIT)
              ).map((conv) => (
                <div key={conv.id} className="relative group">
                  <button
                    onClick={() => {
                      selectConversation(conv.id);
                      navigate('/app/chat');
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 pr-10 rounded-md text-sm transition-colors truncate",
                      currentConversation?.id === conv.id
                        ? "bg-sidebar-accent text-primary font-medium"
                        : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    {conv.title}
                  </button>
                  
                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              
              {filteredConversations.length > INITIAL_DISPLAY_LIMIT && (
                <button
                  onClick={() => setShowAllChats(!showAllChats)}
                  className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showAllChats 
                    ? `Show less` 
                    : `Show ${filteredConversations.length - INITIAL_DISPLAY_LIMIT} more`
                  }
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Groups */}
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel className="text-xs">{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-muted/50"
                        activeClassName="bg-sidebar-accent border-l-2 border-primary text-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/30 p-2">
        {userProfile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 px-2 h-auto py-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userProfile.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <>
                    <div className="flex flex-col items-start text-left flex-1 min-w-0">
                      <span className="text-sm font-medium truncate w-full">
                        {userProfile.name || 'User'}
                      </span>
                      <span className="text-xs text-muted-foreground truncate w-full">
                        {userProfile.email}
                      </span>
                    </div>
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover" side="top">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userProfile.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{userProfile.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark Mode
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
