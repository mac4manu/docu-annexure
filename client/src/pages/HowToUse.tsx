import { Upload, FileSearch, MessagesSquare, FolderOpen, BarChart3, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const steps = [
  {
    number: 1,
    icon: Upload,
    title: "Upload Your Documents",
    description:
      "Go to the Documents tab and drag & drop your files into the upload area, or click to browse. We support PDF, Word (.docx), and PowerPoint (.pptx) files up to 50 MB.",
    tip: "Complex documents with tables, formulas, or images are automatically detected and processed with advanced AI for the best results.",
  },
  {
    number: 2,
    icon: FileSearch,
    title: "View Extracted Content",
    description:
      "Once uploaded, click on any document to see its content. The AI extracts text, tables, formulas, and image descriptions — all formatted and easy to read.",
    tip: "Tables are rendered as proper tables, and math formulas appear in their correct notation.",
  },
  {
    number: 3,
    icon: MessagesSquare,
    title: "Chat With a Single Document",
    description:
      "On any document page, use the chat panel on the right side to ask questions. The AI reads your document and gives you answers based on its content.",
    tip: "Try asking things like \"Summarize this document\" or \"What are the key findings?\"",
  },
  {
    number: 4,
    icon: FolderOpen,
    title: "Chat Across Multiple Documents",
    description:
      "Go to the Chat tab to select two or more documents and ask questions that span across all of them. The AI will cross-reference and find connections.",
    tip: "Great for comparing reports, finding common themes, or pulling data from several sources at once.",
  },
  {
    number: 5,
    icon: BarChart3,
    title: "Track Your Activity",
    description:
      "Visit the Metrics tab to see how many documents you've uploaded, how many chats you've had, and your recent activity at a glance.",
    tip: "Use this to keep track of your document analysis progress over time.",
  },
];

const faqs = [
  {
    q: "What file types can I upload?",
    a: "PDF (.pdf), Word (.docx, .doc), and PowerPoint (.pptx, .ppt) files.",
  },
  {
    q: "Is there a file size limit?",
    a: "Yes, the maximum file size is 50 MB per document.",
  },
  {
    q: "Can other people see my documents?",
    a: "No. Your documents and chats are private to your account. Nobody else can see them.",
  },
  {
    q: "How does the AI understand my documents?",
    a: "For simple text documents, the content is extracted directly. For complex documents with tables, images, or formulas, the AI uses advanced vision technology to read each page like a human would.",
  },
  {
    q: "Can I delete a document?",
    a: "Yes. On the Documents page, each document card has a delete button. Deleting a document also removes its chat history.",
  },
];

export default function HowToUse() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-howto-heading">
            How to Use DocuAnnexure
          </h1>
          <p className="text-sm text-muted-foreground">
            A simple guide to get the most out of your document analysis tool.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step) => (
            <Card key={step.number} data-testid={`card-step-${step.number}`}>
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <div className="flex-none flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">STEP {step.number}</span>
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="font-semibold text-sm">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    <p className="text-xs text-primary/80 leading-relaxed italic">{step.tip}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight" data-testid="text-faq-heading">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <Card key={idx} data-testid={`card-faq-${idx}`}>
                <CardContent className="p-4 space-y-1.5">
                  <p className="text-sm font-medium">{faq.q}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pb-4 flex-wrap">
          <Link href="/">
            <Button data-testid="button-goto-documents">
              Go to Documents
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link href="/chat">
            <Button variant="outline" data-testid="button-goto-chat">
              Start Chatting
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
