import { useDocuments } from "@/hooks/use-documents";
import { UploadZone } from "@/components/UploadZone";
import { DocumentCard } from "@/components/DocumentCard";

import { useState } from "react";
import { Loader2, FileText, Search as SearchIcon, SortAsc, SortDesc, MessagesSquare, BrainCircuit, FileStack, TableProperties, BookOpen, Search, GraduationCap, Building2, ShieldCheck, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const HIGHLIGHTS = [
  {
    icon: BrainCircuit,
    title: "AI-Powered Extraction",
    description: "Extracts tables, formulas, images, and structured content from PDFs, Word, PowerPoint, and Excel files using AI vision.",
  },
  {
    icon: MessagesSquare,
    title: "Chat with Documents",
    description: "Ask questions about one or multiple documents simultaneously and get precise, context-aware answers.",
  },
  {
    icon: Search,
    title: "RAG-Powered Smart Search",
    description: "Documents are semantically indexed so the AI retrieves only the most relevant sections to answer your questions.",
  },
];

const MORE_FEATURES = [
  {
    icon: BrainCircuit,
    title: "Cross-Domain Cognitive Augmentation",
    description: "Bridges knowledge across disciplines — translates jargon, surfaces analogies, and connects concepts between fields.",
  },
  {
    icon: ShieldCheck,
    title: "Mathematical Equation Verification",
    description: "Audits equations, derivations, and statistical models for correctness — catching objective errors that authors cannot dispute.",
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
    icon: BookOpen,
    title: "Metadata Extraction",
    description: "Automatically extracts DOI, title, authors, journal, year, abstract, and keywords from uploaded documents.",
  },
  {
    icon: GraduationCap,
    title: "Professor-Level Expertise",
    description: "AI acts as a research mentor across life sciences, medicine, physics, and real estate — walking you through reasoning step by step.",
  },
  {
    icon: Sparkles,
    title: "Adaptive AI Persona",
    description: "The AI automatically adapts — research scientist for papers, medical expert for clinical reports, real estate attorney for contracts.",
  },
  {
    icon: Building2,
    title: "Real Estate Analysis",
    description: "Analyze contracts, leases, disclosures, inspection reports, and appraisals. Flag unusual clauses and extract financial terms.",
  },
  {
    icon: ShieldCheck,
    title: "PII Protection",
    description: "Automatic detection and redaction of personal information — SSNs, phone numbers, emails, addresses — before storage.",
  },
];

export default function Home() {
  const { data: documents, isLoading } = useDocuments();
  const [search, setSearch] = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const [showFeatures, setShowFeatures] = useState(false);

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

  if (hasDocuments) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-none px-6 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h1 className="text-lg font-display font-semibold text-foreground tracking-tight" data-testid="text-page-heading">
              Documents
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFeatures(!showFeatures)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md"
                data-testid="button-toggle-features"
              >
                {showFeatures ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>Capabilities</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="mb-4">
            <UploadZone />
          </div>

          {showFeatures && (
            <div className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[...HIGHLIGHTS, ...MORE_FEATURES].map((feat) => (
                <div
                  key={feat.title}
                  className="rounded-md border border-border bg-card overflow-hidden hover-elevate"
                  data-testid={`card-feature-${feat.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0 border border-primary/20">
                        <feat.icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold leading-tight">{feat.title}</span>
                    </div>
                    <p className="text-[11px] text-foreground/55 leading-relaxed">{feat.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-display font-semibold" data-testid="text-library-heading">Your Library</h2>
              <span className="text-[11px] text-muted-foreground">
                {filtered.length} of {documents.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSortNewest((prev) => !prev)}
                title={sortNewest ? "Newest first" : "Oldest first"}
                data-testid="button-sort-documents"
              >
                {sortNewest ? <SortDesc className="w-3.5 h-3.5" /> : <SortAsc className="w-3.5 h-3.5" />}
              </Button>
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter documents..."
                  className="pl-8 h-8 text-xs bg-muted/30 w-48"
                  data-testid="input-search-documents"
                />
              </div>
              <Link href="/chat">
                <Button variant="default" size="sm" data-testid="button-chat-with-docs">
                  <MessagesSquare className="w-3.5 h-3.5 mr-1.5" />
                  Chat
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.length > 0 ? (
              filtered.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <SearchIcon className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground" data-testid="text-no-results">No documents match "{search}"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none px-6 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-lg font-display font-semibold text-foreground tracking-tight" data-testid="text-page-heading">
            Documents
          </h1>
          <p className="text-xs text-muted-foreground">
            Upload and chat with your PDF, Word, PowerPoint, or Excel files
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <UploadZone />

          {isLoading ? (
            <div className="mt-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-8">
              <div className="grid md:grid-cols-3 gap-4 mb-5">
                {HIGHLIGHTS.map((feat) => (
                  <div
                    key={feat.title}
                    className="rounded-lg border-2 border-primary/25 bg-card overflow-hidden"
                    data-testid={`card-feature-${feat.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0 border border-primary/25">
                          <feat.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold leading-tight" data-testid={`text-feature-title-${feat.title.toLowerCase().replace(/\s+/g, "-")}`}>{feat.title}</span>
                      </div>
                      <p className="text-xs text-foreground/65 leading-relaxed">{feat.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {MORE_FEATURES.map((feat) => (
                  <div
                    key={feat.title}
                    className="rounded-md border border-border bg-card overflow-hidden hover-elevate"
                    data-testid={`card-feature-${feat.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0 border border-primary/20">
                          <feat.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold leading-tight">{feat.title}</span>
                      </div>
                      <p className="text-[11px] text-foreground/55 leading-relaxed">{feat.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
