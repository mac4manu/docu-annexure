import { motion } from "framer-motion";
import { useDocuments } from "@/hooks/use-documents";
import { UploadZone } from "@/components/UploadZone";
import { DocumentCard } from "@/components/DocumentCard";
import { LayoutGrid, Loader2 } from "lucide-react";

export default function Home() {
  const { data: documents, isLoading } = useDocuments();

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4 tracking-tight"
          >
            Chat with your <span className="text-primary">Documents</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Upload your PDF or PowerPoint files. We'll convert them to Markdown and let you chat with them instantly using AI.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <UploadZone />
        </motion.div>

        <div className="mt-16">
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display font-semibold">Your Library</h2>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-48 bg-muted/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <DocumentCard document={doc} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-2xl bg-muted/20">
              <p className="text-muted-foreground">No documents uploaded yet. Start by dropping a file above!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
