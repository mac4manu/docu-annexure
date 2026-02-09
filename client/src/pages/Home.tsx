import { useDocuments } from "@/hooks/use-documents";
import { UploadZone } from "@/components/UploadZone";
import { DocumentCard } from "@/components/DocumentCard";
import { useState } from "react";
import { Loader2, FileText, Search, SortAsc, SortDesc } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
