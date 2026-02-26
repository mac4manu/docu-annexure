import { useEffect } from "react";
import { Switch, Route, Link, useLocation, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FileText, MessagesSquare, BarChart3, HelpCircle, LogOut, Loader2, FlaskConical, Megaphone, ShieldX, Shield, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/images/logo-transparent.png";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import DocumentView from "@/pages/DocumentView";
import MultiDocChat from "@/pages/MultiDocChat";
import Metrics from "@/pages/Metrics";
import Landing from "@/pages/Landing";
import HowToUse from "@/pages/HowToUse";
import Changelog from "@/pages/Changelog";
import Privacy from "@/pages/Privacy";
import UserManagement from "@/pages/UserManagement";
import VersionBanner from "@/components/VersionBanner";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function usePageTracking() {
  const [location] = useLocation();
  useEffect(() => {
    if (window.gtag) {
      window.gtag("config", "G-YTW4Q7BHN1", {
        page_path: location,
      });
    }
  }, [location]);
}

function Router() {
  usePageTracking();
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/document/:id" component={DocumentView} />
      <Route path="/chat" component={MultiDocChat} />
      <Route path="/metrics" component={Metrics} />
      <Route path="/how-to-use" component={HowToUse} />
      <Route path="/changelog" component={Changelog} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/admin/users" component={UserManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function HeaderNav() {
  const [location] = useLocation();
  const isDocuments = location === "/" || location.startsWith("/document");
  const isChat = location === "/chat";
  const isMetrics = location === "/metrics";
  const isHowTo = location === "/how-to-use";
  const isChangelog = location === "/changelog";
  const isPrivacy = location === "/privacy";
  const isAdminUsers = location === "/admin/users";

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });

  const navItems = [
    { href: "/", label: "Documents", icon: FileText, active: isDocuments, testId: "nav-header-documents" },
    { href: "/chat", label: "Chat", icon: MessagesSquare, active: isChat, testId: "nav-header-chat" },
    { href: "/metrics", label: "Metrics", icon: BarChart3, active: isMetrics, testId: "nav-header-metrics" },
    { href: "/how-to-use", label: "How to Use", icon: HelpCircle, active: isHowTo, testId: "nav-header-howto" },
    { href: "/changelog", label: "What's New", icon: Megaphone, active: isChangelog, testId: "nav-header-changelog" },
    { href: "/privacy", label: "Privacy", icon: Shield, active: isPrivacy, testId: "nav-header-privacy" },
    ...(adminCheck?.isAdmin ? [{ href: "/admin/users", label: "Users", icon: Users, active: isAdminUsers, testId: "nav-header-admin-users" }] : []),
  ];

  return (
    <nav className="flex items-center gap-1.5" data-testid="nav-header">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant={item.active ? "default" : "ghost"}
            size="sm"
            className={item.active ? "" : "text-muted-foreground"}
            data-testid={item.testId}
          >
            <item.icon className="w-3.5 h-3.5 mr-1.5" />
            {item.label}
          </Button>
        </Link>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map((n) => n!.charAt(0).toUpperCase())
    .join("");
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";

  return (
    <div className="flex items-center gap-2 ml-auto shrink-0">
      <Avatar className="w-7 h-7" data-testid="avatar-user">
        <AvatarImage src={user.profileImageUrl ?? undefined} alt={displayName} />
        <AvatarFallback className="text-[10px]">{initials || "U"}</AvatarFallback>
      </Avatar>
      <span className="text-xs text-muted-foreground hidden sm:inline max-w-[120px] truncate" data-testid="text-user-name">
        {displayName}
      </span>
      <Button variant="ghost" size="icon" title="Log out" data-testid="button-logout" onClick={() => window.location.href = "/api/logout"}>
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  );
}

function AuthenticatedApp() {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <VersionBanner />
      <div className="flex-none bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-amber-800 dark:text-amber-200" data-testid="banner-prototype">
        <FlaskConical className="w-3.5 h-3.5 shrink-0" />
        <span>This app is a prototype and currently in evaluation phase. Upload limit: 5 documents per user.</span>
      </div>
      <header className="flex-none h-14 border-b border-border bg-background px-4 flex items-center gap-3 z-50">
        <Link href="/" className="flex items-center gap-2.5 shrink-0 cursor-pointer">
          <img src={logoImg} alt="DocuAnnexure" className="w-10 h-10 rounded-md shrink-0" />
          <div className="flex flex-col leading-none" data-testid="text-header-app-name">
            <span className="font-bold text-base tracking-tight">DocuAnnexure</span>
            <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">Document inference & knowledge chat</span>
          </div>
        </Link>
        <div className="h-6 w-px bg-border shrink-0" />
        <HeaderNav />
        <UserMenu />
      </header>
      <main className="flex-1 overflow-hidden min-h-0">
        <Router />
      </main>
      <footer className="flex-none border-t border-border py-3 px-4" data-testid="footer-app">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} DocuAnnexure</span>
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-privacy">
              Privacy & Data Policy
            </Link>
            <span className="text-xs text-muted-foreground" data-testid="text-footer-built-by">Built by Manu Balakrishnan</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AccessRestricted() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="max-w-md text-center space-y-4 px-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <ShieldX className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold" data-testid="text-access-restricted-title">Access Restricted</h1>
        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-access-restricted-message">
          This application is currently in a closed evaluation phase. Your account is not on the approved access list.
        </p>
        <p className="text-xs text-muted-foreground">
          If you believe you should have access, please contact the administrator.
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/api/logout"} data-testid="button-restricted-logout">
          <LogOut className="w-3.5 h-3.5 mr-1.5" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isLoading, isRestricted } = useAuth();
  const [isPrivacy] = useRoute("/privacy");

  if (isPrivacy) {
    return <Privacy />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isRestricted) {
    return <AccessRestricted />;
  }

  if (!user) {
    return <Landing />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
