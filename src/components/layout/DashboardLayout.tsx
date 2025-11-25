import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { UnifiedSidebar } from './UnifiedSidebar';
import { ChatProvider } from '@/contexts/ChatContext';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { Loader2 } from 'lucide-react';

const DashboardLayout = () => {
  const { loading, onboardingComplete } = useOnboardingGuard();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!onboardingComplete) {
    return null;
  }

  return (
    <ChatProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <UnifiedSidebar />
          <div className="flex-1 flex flex-col">
            <header className="sticky top-0 z-40 border-b border-border/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center px-4">
                <SidebarTrigger className="h-9 w-9" />
              </div>
            </header>
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ChatProvider>
  );
};

export default DashboardLayout;
