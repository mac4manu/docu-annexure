import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FileText, MessagesSquare } from "lucide-react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import DocumentView from "@/pages/DocumentView";
import MultiDocChat from "@/pages/MultiDocChat";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/document/:id" component={DocumentView} />
      <Route path="/chat" component={MultiDocChat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function HeaderNav() {
  const [location] = useLocation();
  const isDocuments = location === "/" || location.startsWith("/document");
  const isChat = location === "/chat";

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
    </nav>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col h-screen w-full">
          <header className="flex-none h-12 border-b border-border bg-background px-4 flex items-center gap-3 z-50 sticky top-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm tracking-tight" data-testid="text-header-app-name">DocuMind</span>
            </div>
            <div className="h-5 w-px bg-border shrink-0" />
            <HeaderNav />
            <span className="text-[10px] text-muted-foreground hidden lg:inline ml-auto shrink-0">Document inference & knowledge chat</span>
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
