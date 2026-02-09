import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUploadDocument } from "@/hooks/use-documents";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export function UploadZone() {
  const [isDragActive, setIsDragActive] = useState(false);
  const { mutate: upload, isPending } = useUploadDocument();
  const { toast } = useToast();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      upload(formData, {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Document uploaded and converted successfully!",
          });
        },
        onError: (error) => {
          toast({
            title: "Upload Failed",
            description: error.message,
            variant: "destructive",
          });
        },
      });
    },
    [upload, toast]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
    },
    maxFiles: 1,
    disabled: isPending,
  });

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div
        {...getRootProps()}
        className={`
          relative group cursor-pointer
          rounded-2xl border-2 border-dashed
          transition-all duration-300 ease-out
          p-10 text-center
          bg-background/50 backdrop-blur-sm
          ${
            isDragActive
              ? "border-primary bg-primary/5 scale-[1.01] shadow-xl shadow-primary/10"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }
          ${isPending ? "opacity-50 pointer-events-none cursor-wait" : ""}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center gap-4">
          <div className={`
            p-4 rounded-full transition-colors duration-300
            ${isDragActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary"}
          `}>
            {isPending ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-display font-semibold text-foreground">
              {isPending ? "Processing Document..." : "Upload Document"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {isPending 
                ? "We're converting your file to Markdown. This may take a moment."
                : "Drag & drop PDF, Word, or PowerPoint files here, or click to select."
              }
            </p>
          </div>

          {!isPending && (
            <div className="flex gap-2 mt-2">
              <span className="px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground border border-border">PDF</span>
              <span className="px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground border border-border">Word</span>
              <span className="px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground border border-border">PPTX</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
