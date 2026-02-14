import { useDocuments } from "@/hooks/use-documents";
import { UploadZone } from "@/components/UploadZone";
import { DocumentCard } from "@/components/DocumentCard";
import { useState } from "react";
import { Loader2, FileText, Search, SortAsc, SortDesc, MessagesSquare, Microscope, HeartPulse, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

const USE_CASES = [
  {
    icon: Microscope,
    domain: "Scientific Research",
    scenario: "Upload a 30-page manuscript and ask:",
    prompt: "Summarize the core novelty of this method compared to the literature cited in the introduction.",
    accentClass: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  {
    icon: HeartPulse,
    domain: "Health & Medical",
    scenario: "Upload a clinical trial report and ask:",
    prompt: "What were the primary endpoints, sample size, and statistical significance of the outcomes?",
    accentClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  },
  {
    icon: GraduationCap,
    domain: "Education & Academic",
    scenario: "Upload a textbook chapter and ask:",
    prompt: "Break down the key concepts in this chapter and create a study guide with practice questions.",
    accentClass: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
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

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <UploadZone />

        {!hasDocuments && !isLoading && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3" data-testid="text-use-cases-heading">What can you do with DocuAnnexure?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {USE_CASES.map((uc) => (
                <Card key={uc.domain} className="p-4" data-testid={`card-usecase-${uc.domain.toLowerCase().replace(/\s/g, "-")}`}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className={`p-1.5 rounded-md ${uc.accentClass}`}>
                      <uc.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold">{uc.domain}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1.5">{uc.scenario}</p>
                  <p className="text-xs italic text-foreground/80 leading-relaxed">"{uc.prompt}"</p>
                </Card>
              ))}
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                Upload a document above, then head to the{" "}
                <Link href="/chat" className="text-primary font-medium underline underline-offset-2">
                  Chat tab
                </Link>{" "}
                to start asking questions.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-display font-semibold" data-testid="text-library-heading">Your Library</h2>
              {hasDocuments && (
                <span className="text-xs text-muted-foreground">
                  {filtered.length} of {documents.length} file{documents.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {hasDocuments && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter documents..."
                    className="pl-8 h-9 w-48 text-xs bg-muted/30"
                    data-testid="input-search-documents"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSortNewest((prev) => !prev)}
                  title={sortNewest ? "Newest first" : "Oldest first"}
                  data-testid="button-sort-documents"
                >
                  {sortNewest ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
                </Button>
                <Link href="/chat">
                  <Button variant="default" size="sm" data-testid="button-chat-with-docs">
                    <MessagesSquare className="w-3.5 h-3.5 mr-1.5" />
                    Chat with docs
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 bg-muted/50 rounded-md animate-pulse" />
              ))}
            </div>
          ) : hasDocuments ? (
            filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Search className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground" data-testid="text-no-results">No documents match "{search}"</p>
              </div>
            )
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-md bg-muted/10">
              <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm" data-testid="text-empty-library">No documents yet. Upload a file above to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
