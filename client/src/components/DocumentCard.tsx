import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { FileText, Trash2, ArrowRight } from "lucide-react";
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

export function DocumentCard({ document }: DocumentCardProps) {
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteDocument();

  return (
    <Card className="group flex flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-primary/10 rounded-md text-primary shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate" title={document.title} data-testid={`text-card-title-${document.id}`}>
              {document.title}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isDeleting}
              className="shrink-0 text-muted-foreground"
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

      <Link href={`/document/${document.id}`} className="block w-full">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
          data-testid={`button-view-${document.id}`}
        >
          View & Chat
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </Card>
  );
}
