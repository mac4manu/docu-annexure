import { useDocuments } from "@/hooks/use-documents";
import { UploadZone } from "@/components/UploadZone";
import { DocumentCard } from "@/components/DocumentCard";
import { LayoutGrid, Loader2, FileText } from "lucide-react";

export default function Home() {
  const { data: documents, isLoading } = useDocuments();

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
          <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
            <LayoutGrid className="w-4 h-4 text-primary" />
            <h2 className="text-base font-display font-semibold" data-testid="text-library-heading">Your Library</h2>
            {documents && documents.length > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">{documents.length} file{documents.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-40 bg-muted/50 rounded-md animate-pulse" />
              ))}
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-md bg-muted/10">
              <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No documents yet. Upload a file above to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
