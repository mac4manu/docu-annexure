import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { FileText, Trash2, MessageSquare, FileType2, Presentation, ArrowRight, Hash, Users } from "lucide-react";
import { type Document } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteDocument } from "@/hooks/use-documents";

interface DocumentCardProps {
  document: Document;
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case "pdf":
      return <FileText className="w-4 h-4" />;
    case "pptx":
    case "ppt":
      return <Presentation className="w-4 h-4" />;
    case "docx":
    case "doc":
      return <FileType2 className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

function getFileLabel(fileType: string) {
  switch (fileType) {
    case "pdf":
      return "PDF";
    case "pptx":
    case "ppt":
      return "PowerPoint";
    case "docx":
    case "doc":
      return "Word";
    default:
      return fileType.toUpperCase();
  }
}

function getFileAccentClass(fileType: string) {
  return "bg-primary/10 text-primary border-primary/20";
}

export function DocumentCard({ document }: DocumentCardProps) {
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteDocument();
  const accentClass = getFileAccentClass(document.fileType);
  const contentPreview = document.content
    ? document.content.replace(/[#*_`>\-\[\]()!|]/g, "").slice(0, 100).trim()
    : "";

  return (
    <div
      className="group relative rounded-md border border-border bg-card overflow-hidden transition-shadow duration-200 hover:shadow-md"
      data-testid={`card-document-${document.id}`}
    >
      <div className="h-1 bg-primary" />

      <Link href={`/document/${document.id}`} className="block">
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-3">
          <div className={`p-1.5 rounded-md border shrink-0 ${accentClass}`}>
            {getFileIcon(document.fileType)}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="text-sm font-semibold text-foreground truncate leading-snug"
              title={document.docTitle || document.title}
              data-testid={`text-card-title-${document.id}`}
            >
              {document.docTitle || document.title}
            </h3>
            {document.authors && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1" data-testid={`text-card-authors-${document.id}`}>
                <Users className="w-3 h-3 shrink-0" />
                {document.authors}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {document.doi && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium no-default-hover-elevate no-default-active-elevate">
                <Hash className="w-3 h-3 mr-0.5" />
                DOI
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium no-default-hover-elevate no-default-active-elevate">
              {getFileLabel(document.fileType)}
            </Badge>
          </div>
        </div>

        <div className="px-4 py-3">
          {document.abstract ? (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2" data-testid={`text-card-preview-${document.id}`}>
              {document.abstract}
            </p>
          ) : contentPreview ? (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2" data-testid={`text-card-preview-${document.id}`}>
              {contentPreview}...
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/50 italic">No preview available</p>
          )}
          {(document.journal || document.publishYear) && (
            <p className="text-[11px] text-muted-foreground/70 mt-1.5 truncate" data-testid={`text-card-journal-${document.id}`}>
              {[document.journal, document.publishYear].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-border px-4 py-2 bg-muted/10">
        <span className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
        </span>

        <div className="flex items-center gap-1">
          <Link href={`/document/${document.id}`}>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" data-testid={`link-view-chat-${document.id}`}>
              <MessageSquare className="w-3 h-3" />
              View & Chat
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isDeleting}
                className="shrink-0 text-muted-foreground invisible group-hover:visible"
                data-testid={`button-delete-${document.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{document.title}" and remove it from your library.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteDoc(document.id)}
                  className="bg-destructive text-destructive-foreground"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
