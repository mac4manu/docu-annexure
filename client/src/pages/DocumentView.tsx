import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Download, PanelLeftClose, PanelLeftOpen, ExternalLink, BookOpen, Users, Calendar, Hash, FileText, ChevronDown, ChevronUp, Search, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { useDocument } from "@/hooks/use-documents";
import { ChatInterface } from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import "katex/dist/katex.min.css";
import { preprocessLaTeX } from "@/lib/latex-utils";

function MetadataPanel({ doc }: { doc: any }) {
  const [expanded, setExpanded] = useState(true);
  const hasMetadata = doc.doi || doc.docTitle || doc.authors || doc.journal || doc.publishYear || doc.keywords;

  if (!hasMetadata) return null;

  return (
    <Card className="mx-6 mt-6 mb-2" data-testid="card-metadata">
      <button
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left"
        onClick={() => setExpanded(!expanded)}
        data-testid="button-toggle-metadata"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Document Metadata</span>
          {doc.doi && (
            <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">DOI</Badge>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2.5 border-t border-border pt-3">
          {doc.docTitle && (
            <div data-testid="metadata-title">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Title</span>
              <p className="text-sm font-medium leading-snug mt-0.5">{doc.docTitle}</p>
            </div>
          )}

          {doc.authors && (
            <div className="flex items-start gap-2" data-testid="metadata-authors">
              <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Authors</span>
                <p className="text-sm leading-snug mt-0.5">{doc.authors}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            {doc.journal && (
              <div className="flex items-center gap-1.5" data-testid="metadata-journal">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm">{doc.journal}</span>
              </div>
            )}
            {doc.publishYear && (
              <div className="flex items-center gap-1.5" data-testid="metadata-year">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm">{doc.publishYear}</span>
              </div>
            )}
          </div>

          {doc.doi && (
            <div className="flex items-center gap-2" data-testid="metadata-doi">
              <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a
                href={`https://doi.org/${doc.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
                data-testid="link-doi"
              >
                {doc.doi}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {doc.keywords && (
            <div data-testid="metadata-keywords">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Keywords</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {doc.keywords.split(",").map((kw: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-[10px] whitespace-break-spaces no-default-hover-elevate no-default-active-elevate">
                    {kw.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {doc.abstract && (
            <div data-testid="metadata-abstract">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Abstract</span>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{doc.abstract}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function DocumentView() {
  const [match, params] = useRoute("/document/:id");
  const id = parseInt(params?.id || "0");
  const { data: doc, isLoading, error } = useDocument(id);
  const [docPanelVisible, setDocPanelVisible] = useState(true);
  const { toast } = useToast();

  const { data: chunkInfo } = useQuery({
    queryKey: ["/api/documents", id, "chunks"],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/chunks`, { credentials: "include" });
      if (!res.ok) return { indexed: false, chunkCount: 0 };
      return res.json();
    },
    enabled: !!doc,
  });

  const reindexMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/documents/${id}/reindex`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", id, "chunks"] });
      toast({ title: "Search index built", description: `${data.chunkCount} chunks created for smarter Q&A.` });
    },
    onError: () => {
      toast({ title: "Indexing failed", description: "Could not build search index. Try again later.", variant: "destructive" });
    },
  });

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

  const displayTitle = doc.docTitle || doc.title;

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
          <h1 className="text-sm font-semibold truncate" title={displayTitle} data-testid="text-doc-title">
            {displayTitle}
          </h1>
          <Badge variant="secondary" className="text-[10px] shrink-0 no-default-hover-elevate no-default-active-elevate">{doc.fileType.toUpperCase()}</Badge>
          {doc.doi && (
            <Badge variant="outline" className="text-[10px] shrink-0 no-default-hover-elevate no-default-active-elevate">
              <Hash className="w-3 h-3 mr-0.5" />
              DOI
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {chunkInfo?.indexed ? (
            <Badge variant="secondary" className="text-[10px] shrink-0 gap-1 no-default-hover-elevate no-default-active-elevate" data-testid="badge-indexed">
              <Search className="w-3 h-3" />
              RAG Indexed
            </Badge>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => reindexMutation.mutate()}
              disabled={reindexMutation.isPending}
              title="Build search index for smarter AI answers"
              data-testid="button-reindex"
            >
              {reindexMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5 mr-1.5" />
              )}
              {reindexMutation.isPending ? "Indexing..." : "Build Index"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDocPanelVisible(!docPanelVisible)}
            title={docPanelVisible ? "Hide document" : "Show document"}
            data-testid="button-toggle-doc-panel"
          >
            {docPanelVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload} data-testid="button-download-md">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <ResizablePanelGroup direction="horizontal" data-testid="panel-group-doc-chat">
          {docPanelVisible && (
            <>
              <ResizablePanel defaultSize={40} minSize={20} data-testid="panel-document">
                <div className="h-full overflow-y-auto overflow-x-hidden">
                  <MetadataPanel doc={doc} />
                  <div className="max-w-3xl mx-auto px-6 py-8">
                    <article className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none prose-table:border-collapse prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted prose-td:border prose-td:border-border prose-td:p-2" data-testid="article-doc-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {preprocessLaTeX(doc.content)}
                      </ReactMarkdown>
                    </article>
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle data-testid="handle-resize" />
            </>
          )}
          <ResizablePanel defaultSize={docPanelVisible ? 60 : 100} minSize={30} data-testid="panel-chat">
            <ChatInterface documentId={doc.id} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
