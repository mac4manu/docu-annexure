import { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2, CheckCircle, Sparkles, FileText, Eye } from "lucide-react";
import { useUploadDocument } from "@/hooks/use-documents";
import { useToast } from "@/hooks/use-toast";

interface ProgressStep {
  step: string;
  detail: string;
  done: boolean;
}

const STEP_CONFIG: Record<string, { icon: typeof FileText; label: string }> = {
  analyzing: { icon: FileText, label: "Analyzing document" },
  complex_detected: { icon: Sparkles, label: "Complex content detected" },
  converting: { icon: FileText, label: "Converting pages" },
  extracting_text: { icon: FileText, label: "Extracting text" },
  extracting_vision: { icon: Eye, label: "AI vision extraction" },
  formatting: { icon: FileText, label: "Formatting content" },
  saving: { icon: FileText, label: "Saving document" },
  metadata: { icon: Sparkles, label: "Extracting metadata" },
};

export function UploadZone() {
  const [isDragActive, setIsDragActive] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pendingEventsRef = useRef<{ step: string; detail?: string }[]>([]);
  const sseReadyRef = useRef(false);
  const { mutate: upload, isPending } = useUploadDocument();
  const { toast } = useToast();

  const cleanupSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    sseReadyRef.current = false;
    pendingEventsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanupSSE();
    };
  }, [cleanupSSE]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setSteps([{ step: "uploading", detail: `Uploading ${file.name}...`, done: false }]);
      sseReadyRef.current = false;
      pendingEventsRef.current = [];

      cleanupSSE();
      const es = new EventSource("/api/upload/progress", { withCredentials: true });
      eventSourceRef.current = es;

      const processEvent = (data: { step: string; detail?: string }) => {
        if (data.step === "connected") return;
        setSteps(prev => {
          const updated = prev.map(s => ({ ...s, done: true }));
          return [...updated, { step: data.step, detail: data.detail || data.step, done: false }];
        });
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.step === "connected") {
            sseReadyRef.current = true;
            for (const pending of pendingEventsRef.current) {
              processEvent(pending);
            }
            pendingEventsRef.current = [];
            return;
          }
          processEvent(data);
        } catch {}
      };

      es.onerror = () => {
        cleanupSSE();
      };

      const formData = new FormData();
      formData.append("file", file);

      upload(formData, {
        onSuccess: () => {
          setSteps(prev => prev.map(s => ({ ...s, done: true })));
          cleanupSSE();
          setTimeout(() => setSteps([]), 1500);
          toast({
            title: "Success",
            description: "Document uploaded and converted successfully!",
          });
        },
        onError: (error) => {
          cleanupSSE();
          setSteps([]);
          toast({
            title: "Upload Failed",
            description: error.message,
            variant: "destructive",
          });
        },
      });
    },
    [upload, toast, cleanupSSE]
  );

  const onDropRejected = useCallback(
    (fileRejections: any[]) => {
      setIsDragActive(false);
      const rejection = fileRejections[0];
      if (rejection) {
        const ext = rejection.file?.name?.split(".").pop()?.toUpperCase() || "unknown";
        toast({
          title: "Unsupported File Type",
          description: `".${ext.toLowerCase()}" files are not supported. Please upload PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), or Excel (.xls/.xlsx) files.`,
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDropRejected,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    disabled: isPending,
  });

  const isProcessing = isPending || steps.length > 0;

  return (
    <div className="w-full" data-testid="upload-zone-container">
      <div
        {...getRootProps()}
        data-testid="dropzone"
        className={`
          relative group cursor-pointer
          rounded-md border-2 border-dashed
          transition-all duration-300 ease-out
          px-5 py-4
          bg-primary/[0.03] dark:bg-primary/[0.06]
          flex items-center justify-center
          ${
            isDragActive
              ? "border-primary bg-primary/10 scale-[1.01] shadow-xl shadow-primary/10"
              : "border-primary/30 hover:border-primary hover:bg-primary/[0.07]"
          }
          ${isProcessing ? "pointer-events-none cursor-wait" : ""}
        `}
      >
        <input {...getInputProps()} data-testid="input-file-upload" />

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center gap-5">
            <div className="p-4 rounded-full bg-primary/10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>

            <div className="space-y-3 w-full max-w-sm">
              <h3 className="text-lg font-semibold text-foreground" data-testid="text-processing-title">
                Processing Document
              </h3>

              <div className="space-y-2">
                {steps.map((s, idx) => {
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 text-sm transition-all duration-300 ${
                        s.done
                          ? "text-muted-foreground"
                          : "text-foreground font-medium"
                      }`}
                      data-testid={`text-stage-${idx}`}
                    >
                      {s.done ? (
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                      )}
                      <span>{s.detail}</span>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground pt-1">
                Complex documents with tables, formulas, or images are automatically detected and analyzed with AI vision.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-left">
            <div className={`
              p-2.5 rounded-full transition-colors duration-300 shrink-0
              ${isDragActive ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary group-hover:bg-primary/15"}
            `}>
              <UploadCloud className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground" data-testid="text-upload-title">
                Upload Document
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5" data-testid="text-upload-description">
                Drag & drop or click to upload PDF, Word, PowerPoint, or Excel files (max 20 documents)
              </p>
            </div>

            <div className="flex gap-1.5 shrink-0 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground border border-border">PDF</span>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground border border-border">Word</span>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground border border-border">PPTX</span>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground border border-border">Excel</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
