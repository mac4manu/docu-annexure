import { useEffect } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, FileText, Calendar, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { useDocument } from "@/hooks/use-documents";
import { ChatInterface } from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function DocumentView() {
  const [match, params] = useRoute("/document/:id");
  const id = parseInt(params?.id || "0");
  const { data: document, isLoading, error } = useDocument(id);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium animate-pulse">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-2">Document Not Found</h2>
        <p className="text-muted-foreground mb-6">The document you're looking for doesn't exist or has been deleted.</p>
        <Link href="/">
          <Button>Return Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex-none h-16 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight truncate max-w-md" title={document.title}>
              {document.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {document.fileType.toUpperCase()}
              </span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(document.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex" onClick={() => {
            const blob = new Blob([document.content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${document.originalFilename.split('.')[0]}.md`;
            a.click();
          }}>
            <Download className="w-4 h-4 mr-2" />
            Download MD
          </Button>
        </div>
      </header>

      {/* Main Content Area - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Markdown Content */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950/50">
          <div className="max-w-3xl mx-auto px-8 py-12">
            <article className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none">
              <ReactMarkdown>{document.content}</ReactMarkdown>
            </article>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-[1px] bg-border shadow-sm flex-none z-10" />

        {/* Right Pane: Chat Interface */}
        <div className="w-full max-w-md lg:max-w-lg flex-none bg-muted/10">
          <ChatInterface documentId={document.id} />
        </div>
      </div>
    </div>
  );
}
