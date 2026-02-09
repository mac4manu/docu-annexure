import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { FileText, Trash2, ArrowRight } from "lucide-react";
import { type Document } from "@shared/schema";
import { Button } from "@/components/ui/button";
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
    <div className="
      group relative flex flex-col justify-between
      bg-card rounded-xl p-5 border border-border/60
      shadow-sm hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-1
      transition-all duration-300 ease-out
    ">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-primary/10 rounded-lg text-primary">
          <FileText className="w-6 h-6" />
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button 
              disabled={isDeleting}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-bold font-display text-foreground line-clamp-1 mb-1" title={document.title}>
          {document.title}
        </h3>
        <p className="text-xs text-muted-foreground font-medium">
          Uploaded {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}
        </p>
      </div>

      <Link href={`/document/${document.id}`} className="block w-full">
        <Button 
          variant="outline" 
          className="w-full justify-between group-hover:border-primary group-hover:text-primary transition-colors"
        >
          View & Chat
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>
    </div>
  );
}
