import { useEffect } from "react";
import { Navigate, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { FarmDataProvider } from "@/context/farm-data-context";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNav } from "@/components/top-nav";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function ProtectedAppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, profile, profileLoading, loading, refreshProfile, supabase } = useAuth();

  useEffect(() => {
    if (loading || !user || !profile || profile.onboarding_completed) return;
    if (pathname !== "/onboarding") {
      void navigate({ to: "/onboarding" });
    }
  }, [loading, user, profile, pathname, navigate]);

  useEffect(() => {
    if (loading || !user || !profile || !profile.onboarding_completed) return;
    if (pathname === "/onboarding") {
      void navigate({ to: "/" });
    }
  }, [loading, user, profile, pathname, navigate]);

  if (!supabase) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground max-w-md">
          Supabase is not configured for the browser. Add{" "}
          <code className="text-xs bg-muted px-1 rounded">VITE_SUPABASE_URL</code> and{" "}
          <code className="text-xs bg-muted px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to your environment
          (same values as server <code className="text-xs bg-muted px-1">SUPABASE_*</code> are fine).
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/sign-in" search={{ redirect: pathname }} />;
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading your profile…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground text-center max-w-md">
          We could not load your profile. If you just signed up, run the latest Supabase migration (profiles + trigger)
          or tap retry.
        </p>
        <Button type="button" variant="outline" onClick={() => void refreshProfile()}>
          Retry
        </Button>
      </div>
    );
  }

  if (pathname === "/onboarding") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="border-b bg-background/80 px-4 py-3 flex items-center justify-between">
          <span className="font-display font-semibold">Verdant onboarding</span>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-[960px] w-full mx-auto">
          <Outlet />
        </main>
        <Toaster richColors position="top-right" />
      </div>
    );
  }

  if (!profile.onboarding_completed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <FarmDataProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopNav />
            <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">
              <Outlet />
            </main>
          </div>
        </div>
        <Toaster richColors position="top-right" />
      </SidebarProvider>
    </FarmDataProvider>
  );
}
