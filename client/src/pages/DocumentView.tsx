import { Link, useRoute } from "wouter";
import { ArrowLeft, FileText, Calendar, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { format } from "date-fns";
import { useDocument } from "@/hooks/use-documents";
import { ChatInterface } from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";

import "katex/dist/katex.min.css";

export default function DocumentView() {
  const [match, params] = useRoute("/document/:id");
  const id = parseInt(params?.id || "0");
  const { data: doc, isLoading, error } = useDocument(id);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium animate-pulse" data-testid="text-loading">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-2" data-testid="text-error-title">Document Not Found</h2>
        <p className="text-muted-foreground mb-6">The document you're looking for doesn't exist or has been deleted.</p>
        <Link href="/">
          <Button data-testid="button-return-home">Return Home</Button>
        </Link>
      </div>
    );
  }

  const handleDownload = () => {
    const blob = new Blob([doc.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${doc.originalFilename.split(".")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="flex-none h-16 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="font-bold text-lg leading-tight truncate" title={doc.title} data-testid="text-doc-title">
              {doc.title}
            </h1>
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {doc.fileType.toUpperCase()}
              </span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(doc.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" className="hidden sm:flex" onClick={handleDownload} data-testid="button-download-md">
          <Download className="w-4 h-4 mr-2" />
          Download MD
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950/50">
          <div className="max-w-3xl mx-auto px-8 py-12">
            <article className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none prose-table:border-collapse prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted prose-td:border prose-td:border-border prose-td:p-2" data-testid="article-doc-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {doc.content}
              </ReactMarkdown>
            </article>
          </div>
        </div>

        <div className="w-[1px] bg-border shadow-sm flex-none z-10" />

        <div className="w-full max-w-md lg:max-w-lg flex-none bg-muted/10">
          <ChatInterface documentId={doc.id} />
        </div>
      </div>
    </div>
  );
}
