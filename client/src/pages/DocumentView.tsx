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
import { Badge } from "@/components/ui/badge";

import "katex/dist/katex.min.css";

export default function DocumentView() {
  const [match, params] = useRoute("/document/:id");
  const id = parseInt(params?.id || "0");
  const { data: doc, isLoading, error } = useDocument(id);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground text-sm animate-pulse" data-testid="text-loading">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold mb-2" data-testid="text-error-title">Document Not Found</h2>
        <p className="text-muted-foreground mb-4 text-sm">The document you're looking for doesn't exist or has been deleted.</p>
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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none h-11 border-b border-border px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-sm font-semibold truncate" title={doc.title} data-testid="text-doc-title">
            {doc.title}
          </h1>
          <Badge variant="secondary" className="text-[10px] shrink-0">{doc.fileType.toUpperCase()}</Badge>
        </div>

        <Button variant="ghost" size="sm" onClick={handleDownload} data-testid="button-download-md">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
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

        <div className="w-[1px] bg-border flex-none" />

        <div className="w-full max-w-sm lg:max-w-md flex-none">
          <ChatInterface documentId={doc.id} />
        </div>
      </div>
    </div>
  );
}
