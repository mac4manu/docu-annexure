import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FileText, MessagesSquare, BarChart3, HelpCircle, LogOut, Loader2 } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/document/:id" component={DocumentView} />
      <Route path="/chat" component={MultiDocChat} />
      <Route path="/metrics" component={Metrics} />
      <Route path="/how-to-use" component={HowToUse} />
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

  return (
    <nav className="flex items-center gap-1" data-testid="nav-header">
      <Link href="/">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            isDocuments
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover-elevate"
          }`}
          data-testid="nav-header-documents"
        >
          <FileText className="w-3.5 h-3.5" />
          Documents
        </span>
      </Link>
      <Link href="/chat">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            isChat
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover-elevate"
          }`}
          data-testid="nav-header-chat"
        >
          <MessagesSquare className="w-3.5 h-3.5" />
          Chat
        </span>
      </Link>
      <Link href="/metrics">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            isMetrics
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover-elevate"
          }`}
          data-testid="nav-header-metrics"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Metrics
        </span>
      </Link>
      <Link href="/how-to-use">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            isHowTo
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover-elevate"
          }`}
          data-testid="nav-header-howto"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          How to Use
        </span>
      </Link>
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
    </div>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
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
