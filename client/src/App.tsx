import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FileText, MessagesSquare, BarChart3 } from "lucide-react";
import logoImg from "@/assets/images/logo-simple.png";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import DocumentView from "@/pages/DocumentView";
import MultiDocChat from "@/pages/MultiDocChat";
import Metrics from "@/pages/Metrics";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/document/:id" component={DocumentView} />
      <Route path="/chat" component={MultiDocChat} />
      <Route path="/metrics" component={Metrics} />
      <Route component={NotFound} />
    </Switch>
  );
}

function HeaderNav() {
  const [location] = useLocation();
  const isDocuments = location === "/" || location.startsWith("/document");
  const isChat = location === "/chat";
  const isMetrics = location === "/metrics";

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
    </nav>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col h-screen w-full">
          <header className="flex-none h-14 border-b border-border bg-background px-4 flex items-center gap-3 z-50 sticky top-0">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 cursor-pointer">
              <img src={logoImg} alt="Doc Annexure" className="w-10 h-10 rounded-md shrink-0" />
              <div className="flex flex-col leading-none" data-testid="text-header-app-name">
                <span className="font-bold text-base tracking-tight">Doc Annexure</span>
                <span className="text-[11px] text-muted-foreground leading-tight mt-0.5">Document inference & knowledge chat</span>
              </div>
            </Link>
            <div className="h-6 w-px bg-border shrink-0" />
            <HeaderNav />
          </header>
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
