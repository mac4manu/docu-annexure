import { useDocuments } from "@/hooks/use-documents";
import { UploadZone } from "@/components/UploadZone";
import { DocumentCard } from "@/components/DocumentCard";
import { useState } from "react";
import { Loader2, FileText, Search, SortAsc, SortDesc, MessagesSquare, BrainCircuit, ShieldAlert, FileStack, TableProperties, FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "AI-Powered Extraction",
    description: "Extracts tables, formulas, images, and structured content from PDFs, Word, and PowerPoint files using AI vision.",
  },
  {
    icon: MessagesSquare,
    title: "Chat with Documents",
    description: "Ask questions about one or multiple documents simultaneously and get precise, context-aware answers.",
  },
  {
    icon: ShieldAlert,
    title: "Tortured Phrase Detection",
    description: "Flags suspicious synonym substitutions that may indicate paper mill activity or automated paraphrasing to evade plagiarism.",
  },
  {
    icon: FileStack,
    title: "Multi-Document Analysis",
    description: "Compare findings, methodologies, and data across multiple documents in a single chat session.",
  },
  {
    icon: TableProperties,
    title: "Tables & Formulas",
    description: "Faithfully preserves data tables, LaTeX math equations, chemical formulas, and statistical results.",
  },
  {
    icon: FlaskConical,
    title: "Domain Expertise",
    description: "Specialized for scientific research, health & medical literature, and education & academic materials.",
  },
];

export default function Home() {
  const { data: documents, isLoading } = useDocuments();
  const [search, setSearch] = useState("");
  const [sortNewest, setSortNewest] = useState(true);

  const filtered = documents
    ? documents
        .filter((doc) =>
          doc.title.toLowerCase().includes(search.toLowerCase()) ||
          doc.originalFilename.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortNewest ? dateB - dateA : dateA - dateB;
        })
    : [];

  const hasDocuments = documents && documents.length > 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none px-6 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-lg font-display font-semibold text-foreground tracking-tight" data-testid="text-page-heading">
            Documents
          </h1>
          <p className="text-xs text-muted-foreground">
            Upload and chat with your PDF, Word, or PowerPoint files
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="flex gap-6 h-full">
          <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
            <div className="shrink-0" style={{ minHeight: "40%" }}>
              <UploadZone />
            </div>

            <div className="mt-4 shrink-0">
              <h2 className="text-sm font-semibold text-muted-foreground mb-2.5" data-testid="text-features-heading">Key Features</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                {FEATURES.map((feat) => (
                  <div
                    key={feat.title}
                    className="rounded-md border border-border bg-card overflow-hidden"
                    data-testid={`card-feature-${feat.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center gap-2">
                      <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0 border border-primary/20">
                        <feat.icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-semibold leading-tight" data-testid={`text-feature-title-${feat.title.toLowerCase().replace(/\s+/g, "-")}`}>{feat.title}</span>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-xs text-muted-foreground leading-relaxed">{feat.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-80 lg:w-96 shrink-0 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-display font-semibold" data-testid="text-library-heading">Your Library</h2>
                {hasDocuments && (
                  <span className="text-[11px] text-muted-foreground">
                    {filtered.length} of {documents.length}
                  </span>
                )}
              </div>
              {hasDocuments && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSortNewest((prev) => !prev)}
                    title={sortNewest ? "Newest first" : "Oldest first"}
                    data-testid="button-sort-documents"
                  >
                    {sortNewest ? <SortDesc className="w-3.5 h-3.5" /> : <SortAsc className="w-3.5 h-3.5" />}
                  </Button>
                  <Link href="/chat">
                    <Button variant="default" size="sm" data-testid="button-chat-with-docs">
                      <MessagesSquare className="w-3.5 h-3.5 mr-1.5" />
                      Chat
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {hasDocuments && (
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter documents..."
                  className="pl-8 h-9 text-xs bg-muted/30"
                  data-testid="input-search-documents"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
              {isLoading ? (
                <>
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-28 bg-muted/50 rounded-md animate-pulse" />
                  ))}
                </>
              ) : hasDocuments ? (
                filtered.length > 0 ? (
                  filtered.map((doc) => (
                    <DocumentCard key={doc.id} document={doc} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Search className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground" data-testid="text-no-results">No documents match "{search}"</p>
                  </div>
                )
              ) : (
                <div className="text-center py-10 border-2 border-dashed border-border/50 rounded-md bg-muted/10">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-xs" data-testid="text-empty-library">No documents yet</p>
                  <p className="text-muted-foreground/60 text-[10px] mt-1">Upload a file to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
