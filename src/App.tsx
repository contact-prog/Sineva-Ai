import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { TranslationProvider } from "@/contexts/TranslationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatProvider } from "@/contexts/ChatContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import MagicOnboarding from "./pages/MagicOnboarding";
import WelcomeTour from "./pages/WelcomeTour";
import SocialCallback from "./pages/SocialCallback";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Graphics from "./pages/Graphics";
import Videos from "./pages/Videos";
import VideoResult from "./pages/VideoResult";
import Gallery from "./pages/Gallery";
import Content from "./pages/Content";
import BrandKit from "./pages/BrandKit";
import Calendar from "./pages/Calendar";
import CreatePost from "./pages/CreatePost";
import EditPost from "./pages/EditPost";
import Social from "./pages/Social";
import EmailGenerator from "./pages/EmailGenerator";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import WordPressManager from "./pages/WordPressManager";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import Features from "./pages/Features";
import Resources from "./pages/Resources";
import CinemaAI from "./pages/CinemaAI";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TranslationProvider>
        <ChatProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                {/* Landing Page */}
                <Route path="/" element={<Index />} />
                
                {/* Authentication & Onboarding */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/magic-onboarding" element={<MagicOnboarding />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/welcome-tour" element={<WelcomeTour />} />
                <Route path="/social/callback" element={<SocialCallback />} />
                
                {/* Public Marketing Pages */}
                <Route path="/about" element={<About />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/features" element={<Features />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/sineva-ai-investments" element={<CinemaAI />} />
                
                {/* Redirect /cookies to /resources */}
                <Route path="/cookies" element={<Navigate to="/resources" replace />} />
                
                {/* App Routes (Protected) */}
                <Route element={<DashboardLayout />}>
                  {/* Main Dashboard */}
                  <Route path="/app/dashboard" element={<Dashboard />} />
                  <Route path="/app/chat" element={<Chat />} />
                  <Route path="/app/gallery" element={<Gallery />} />
                  
                  {/* AI Creation Tools */}
                  <Route path="/app/graphics" element={<Graphics />} />
                  <Route path="/app/videos" element={<Videos />} />
                  <Route path="/app/video-result" element={<VideoResult />} />
                  <Route path="/app/content" element={<Content />} />
                  <Route path="/app/wordpress" element={<WordPressManager />} />
                  
                  {/* Marketing Tools */}
                  <Route path="/app/calendar" element={<Calendar />} />
                  <Route path="/app/calendar/create" element={<CreatePost />} />
                  <Route path="/app/calendar/edit/:id" element={<EditPost />} />
                  <Route path="/app/social" element={<Social />} />
                  <Route path="/app/email-generator" element={<EmailGenerator />} />
                  
                  {/* Settings & Configuration */}
                  <Route path="/app/brand-kit" element={<BrandKit />} />
                  <Route path="/app/integrations" element={<Integrations />} />
                  <Route path="/app/settings" element={<Settings />} />
                </Route>
                
                {/* Redirects for backward compatibility (old routes without /app prefix) */}
                <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/chat" element={<Navigate to="/app/chat" replace />} />
                <Route path="/graphics" element={<Navigate to="/app/graphics" replace />} />
                <Route path="/videos" element={<Navigate to="/app/videos" replace />} />
                <Route path="/gallery" element={<Navigate to="/app/gallery" replace />} />
                <Route path="/content" element={<Navigate to="/app/content" replace />} />
                <Route path="/calendar" element={<Navigate to="/app/calendar" replace />} />
                <Route path="/social" element={<Navigate to="/app/social" replace />} />
                <Route path="/email-generator" element={<Navigate to="/app/email-generator" replace />} />
                <Route path="/brand-kit" element={<Navigate to="/app/brand-kit" replace />} />
                <Route path="/integrations" element={<Navigate to="/app/integrations" replace />} />
                <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
                
                {/* 404 - Must be last */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ChatProvider>
      </TranslationProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
