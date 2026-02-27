import { Upload, FileSearch, MessagesSquare, FolderOpen, BarChart3, ArrowRight, HelpCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const steps = [
  {
    number: 1,
    icon: Upload,
    title: "Upload Your Documents",
    description:
      "Go to the Documents tab and drag & drop your files into the upload area, or click to browse. We support PDF, Word (.docx), PowerPoint (.pptx), and Excel (.xlsx) files up to 50 MB.",
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
    a: "PDF (.pdf), Word (.docx, .doc), PowerPoint (.pptx, .ppt), and Excel (.xlsx, .xls) files.",
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
  {
    q: "Can I use DocuAnnexure for real estate documents?",
    a: "Yes. DocuAnnexure supports real estate documents such as lease agreements, purchase contracts, property disclosures, inspection reports, appraisals, and title reports. The AI can summarize key terms, flag unusual clauses, identify contingencies and deadlines, and extract financial details.",
  },
  {
    q: "What happens to personal information in my documents?",
    a: "DocuAnnexure automatically detects and redacts personally identifiable information (PII) such as Social Security numbers, phone numbers, email addresses, and full street addresses before storing document content. Only the redacted version is kept.",
  },
  {
    q: "What real estate questions can I ask the AI?",
    a: "You can ask the AI to summarize key lease or contract terms, compare clauses across multiple documents, flag non-standard or unusual provisions, extract financial terms like listing price or cap rate, and identify contingencies and deadlines.",
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
            <div
              key={step.number}
              className="rounded-md border border-border bg-card overflow-hidden"
              data-testid={`card-step-${step.number}`}
            >
              <div className="px-5 py-3 border-b border-border bg-muted/20 flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <step.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md shrink-0">STEP {step.number}</span>
                  <h3 className="font-semibold text-sm truncate">{step.title}</h3>
                </div>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                <div className="flex items-start gap-2 text-xs text-primary/80 leading-relaxed">
                  <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{step.tip}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight" data-testid="text-faq-heading">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-md border border-border bg-card overflow-hidden"
                data-testid={`card-faq-${idx}`}
              >
                <div className="px-5 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2.5">
                  <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                  <p className="text-sm font-medium">{faq.q}</p>
                </div>
                <div className="px-5 py-3.5">
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              </div>
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
