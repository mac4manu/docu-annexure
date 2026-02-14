import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2, CheckCircle } from "lucide-react";
import { useUploadDocument } from "@/hooks/use-documents";
import { useToast } from "@/hooks/use-toast";

const PROGRESS_STAGES = [
  { label: "Uploading file...", duration: 1000 },
  { label: "Analyzing document...", duration: 2000 },
  { label: "Extracting content...", duration: 10000 },
  { label: "Saving document...", duration: 3000 },
];

export function UploadZone() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const { mutate: upload, isPending } = useUploadDocument();
  const { toast } = useToast();

  useEffect(() => {
    if (!isPending) {
      setStageIndex(0);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    const advanceStage = (idx: number) => {
      if (idx < PROGRESS_STAGES.length - 1) {
        timeoutId = setTimeout(() => {
          setStageIndex(idx + 1);
          advanceStage(idx + 1);
        }, PROGRESS_STAGES[idx].duration);
      }
    };

    advanceStage(0);
    return () => clearTimeout(timeoutId);
  }, [isPending]);

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
    <div className="w-full h-full" data-testid="upload-zone-container">
      <div
        {...getRootProps()}
        data-testid="dropzone"
        className={`
          relative group cursor-pointer h-full
          rounded-md border-2 border-dashed
          transition-all duration-300 ease-out
          px-5 py-4
          bg-background/50 backdrop-blur-sm
          flex items-center justify-center
          ${
            isDragActive
              ? "border-primary bg-primary/5 scale-[1.01] shadow-xl shadow-primary/10"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }
          ${isPending ? "pointer-events-none cursor-wait" : ""}
        `}
      >
        <input {...getInputProps()} data-testid="input-file-upload" />

        {isPending ? (
          <div className="flex flex-col items-center justify-center gap-5">
            <div className="p-4 rounded-full bg-primary/10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>

            <div className="space-y-3 w-full max-w-sm">
              <h3 className="text-lg font-semibold text-foreground" data-testid="text-processing-title">
                Processing Document
              </h3>

              <div className="space-y-2">
                {PROGRESS_STAGES.map((stage, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 text-sm transition-all duration-300 ${
                      idx < stageIndex
                        ? "text-muted-foreground"
                        : idx === stageIndex
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/40"
                    }`}
                    data-testid={`text-stage-${idx}`}
                  >
                    {idx < stageIndex ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : idx === stageIndex ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                    )}
                    <span>{stage.label}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                Complex documents with tables, formulas, or images are automatically detected and analyzed with AI vision.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className={`
              p-3.5 rounded-full transition-colors duration-300
              ${isDragActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary"}
            `}>
              <UploadCloud className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground" data-testid="text-upload-title">
                Upload Document
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs" data-testid="text-upload-description">
                Drag & drop or click to upload PDF, Word, or PowerPoint files (max 10 documents)
              </p>
            </div>

            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground border border-border">PDF</span>
              <span className="px-2.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground border border-border">Word</span>
              <span className="px-2.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground border border-border">PPTX</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
