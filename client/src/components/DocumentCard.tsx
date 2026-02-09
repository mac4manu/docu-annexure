import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { FileText, Trash2, MessageSquare, FileType2, Presentation } from "lucide-react";
import { type Document } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      return <FileText className="w-5 h-5" />;
    case "pptx":
    case "ppt":
      return <Presentation className="w-5 h-5" />;
    case "docx":
    case "doc":
      return <FileType2 className="w-5 h-5" />;
    default:
      return <FileText className="w-5 h-5" />;
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
  switch (fileType) {
    case "pdf":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    case "pptx":
    case "ppt":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "docx":
    case "doc":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    default:
      return "bg-primary/10 text-primary";
  }
}

export function DocumentCard({ document }: DocumentCardProps) {
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteDocument();
  const accentClass = getFileAccentClass(document.fileType);
  const contentPreview = document.content
    ? document.content.replace(/[#*_`>\-\[\]()!|]/g, "").slice(0, 120).trim()
    : "";

  return (
    <Link href={`/document/${document.id}`}>
      <Card
        className="group relative flex flex-col p-0 cursor-pointer transition-shadow duration-200 hover:shadow-md"
        data-testid={`card-document-${document.id}`}
      >
        <div className="flex items-start gap-3 p-4 pb-2">
          <div className={`p-2.5 rounded-md shrink-0 ${accentClass}`}>
            {getFileIcon(document.fileType)}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="text-sm font-semibold text-foreground truncate leading-snug"
              title={document.title}
              data-testid={`text-card-title-${document.id}`}
            >
              {document.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium no-default-hover-elevate no-default-active-elevate">
                {getFileLabel(document.fileType)}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {contentPreview && (
          <p className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed line-clamp-2" data-testid={`text-card-preview-${document.id}`}>
            {contentPreview}...
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="w-3 h-3" />
            <span>View & Chat</span>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isDeleting}
                className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.preventDefault()}
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
      </Card>
    </Link>
  );
}
