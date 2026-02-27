import { FileText, MessagesSquare, ArrowRight, Shield, Zap, ShieldAlert, FileStack, TableProperties, FlaskConical, BookOpen, Database, Bot, Lock, ExternalLink, Search, GraduationCap, Building2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import logoImg from "@/assets/images/logo-transparent.png";
import heroBg from "@/assets/images/hero-bg.png";

const highlightedFeatures = [
  {
    icon: FileText,
    title: "AI-Powered Extraction",
    description:
      "Upload PDF, Word, PowerPoint, or Excel files. AI vision extracts tables, formulas, images, and text into structured markdown.",
  },
  {
    icon: MessagesSquare,
    title: "Chat With Your Documents",
    description:
      "Ask questions about one or multiple documents simultaneously and get precise, context-aware answers instantly.",
  },
  {
    icon: Search,
    title: "RAG-Powered Smart Search",
    description:
      "Documents are semantically indexed so the AI retrieves only the most relevant sections to answer your questions — faster, more accurate, and cost-efficient.",
  },
];

const secondaryFeatures = [
  {
    icon: ShieldAlert,
    title: "Tortured Phrase Detection",
    description:
      "Detect suspicious synonym substitutions that may signal paper mill activity or automated paraphrasing to evade plagiarism.",
  },
  {
    icon: FileStack,
    title: "Multi-Document Analysis",
    description:
      "Compare findings, methodologies, and data across multiple documents in a single chat session with cross-references.",
  },
  {
    icon: TableProperties,
    title: "Tables & Formulas",
    description:
      "Faithfully preserves data tables, LaTeX math equations, chemical formulas, and statistical results from your files.",
  },
  {
    icon: BookOpen,
    title: "Metadata Extraction",
    description:
      "Automatically extracts DOI, title, authors, journal, publication year, abstract, and keywords from uploaded documents.",
  },
  {
    icon: GraduationCap,
    title: "Professor-Level Expertise",
    description:
      "AI acts as a seasoned expert across life sciences, medicine, physics, and real estate — walking you through derivations, contract terms, methodologies, and reasoning step by step.",
  },
  {
    icon: Sparkles,
    title: "Adaptive AI Persona",
    description:
      "The AI automatically adapts to your document — acting as a research scientist for papers, a medical expert for clinical reports, a real estate attorney for contracts, or a thesis advisor for academic work.",
  },
  {
    icon: Building2,
    title: "Real Estate Analysis",
    description:
      "Analyze lease agreements, purchase contracts, property disclosures, and inspection reports. Flag unusual clauses, identify contingencies, and extract key financial terms.",
  },
  {
    icon: ShieldCheck,
    title: "PII Protection",
    description:
      "Automatic detection and redaction of sensitive personal information — SSNs, phone numbers, addresses, and more — before document content is stored.",
  },
];

const trustItems = [
  { icon: Shield, text: "Secure authentication" },
  { icon: Zap, text: "Instant document processing" },
];

export default function Landing() {
  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="DocuAnnexure" className="w-9 h-9 rounded-md" />
            <span className="font-bold text-base tracking-tight" data-testid="text-landing-logo">DocuAnnexure</span>
          </div>
          <Button variant="outline" data-testid="button-header-login" onClick={() => window.location.href = "/api/login"}>Log in</Button>
        </div>
      </header>

      <section className="relative">
        <div className="absolute inset-0 overflow-hidden">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-10 md:py-14">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <h1
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight font-serif"
                data-testid="text-hero-title"
              >
                Your documents,
                <br />
                <span className="text-primary">intelligently understood</span>
              </h1>
              <p className="text-base md:text-lg text-white/70 max-w-lg leading-relaxed">
                Upload research papers or real estate documents and let AI extract rich content — tables, formulas, and more — answer your questions, and help you discover insights
                across your entire knowledge base.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Button size="lg" className="bg-white text-foreground border-white/80" data-testid="button-hero-get-started" onClick={() => window.location.href = "/api/login"}>
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-4 pt-1 flex-wrap">
                {trustItems.map((item) => (
                  <span key={item.text} className="flex items-center gap-1.5 text-xs text-white/50">
                    <item.icon className="w-3.5 h-3.5" />
                    {item.text}
                  </span>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center justify-center overflow-hidden">
              <div className="w-72 h-72 rounded-full bg-primary/10 blur-3xl absolute" />
              <div className="relative bg-background/10 backdrop-blur-sm rounded-md p-6 ring-1 ring-white/10 space-y-4 w-full max-w-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                  <div className="w-3 h-3 rounded-full bg-green-400/60" />
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 w-3/4 bg-white/10 rounded-full" />
                  <div className="h-2.5 w-full bg-white/10 rounded-full" />
                  <div className="h-2.5 w-5/6 bg-white/10 rounded-full" />
                  <div className="h-6 mt-3 w-2/3 bg-primary/20 rounded-md" />
                  <div className="h-2.5 w-full bg-white/10 rounded-full" />
                  <div className="h-2.5 w-4/5 bg-white/10 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-serif" data-testid="text-features-heading">
              Everything you need to work with documents
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
              From extraction to analysis, DocuAnnexure handles your document workflow end-to-end.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {highlightedFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border-2 border-primary/30 bg-card overflow-hidden hover-elevate"
                data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="px-5 py-4 border-b border-primary/20 bg-primary/5 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/15 text-primary shrink-0 border border-primary/25">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg">{feature.title}</h3>
                </div>
                <div className="px-5 py-5">
                  <p className="text-sm text-foreground/70 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {secondaryFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-md border border-border bg-card overflow-hidden hover-elevate"
                data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0 border border-primary/20">
                      <feature.icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                  </div>
                  <p className="text-xs text-foreground/60 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-muted/20 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-xl md:text-2xl font-bold tracking-tight font-serif" data-testid="text-privacy-heading">
                Your data, your control
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We are transparent about how your documents are handled.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                icon: Database,
                title: "No file retention",
                desc: "Original uploaded files are deleted after processing. Only extracted text is stored.",
              },
              {
                icon: Lock,
                title: "Private to you",
                desc: "All documents and chats are isolated to your account. No other user can access them.",
              },
              {
                icon: Bot,
                title: "AI processing",
                desc: "Document content is sent to OpenAI for extraction and chat. Avoid uploading highly confidential files.",
              },
              {
                icon: Shield,
                title: "Delete anytime",
                desc: "You can permanently delete any document or conversation from the app whenever you choose.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-md border border-border bg-card p-4 space-y-2"
                data-testid={`card-privacy-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/privacy">
              <Button variant="outline" size="sm" data-testid="button-read-privacy-policy">
                Read full Privacy & Data Policy
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 bg-muted/30 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight font-serif mb-3" data-testid="text-cta-heading">
            Ready to get started?
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            Upload your first document and start chatting with AI in seconds.
          </p>
          <Button size="lg" data-testid="button-cta-login" onClick={() => window.location.href = "/api/login"}>
            Get Started
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} DocuAnnexure</span>
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-privacy">
              Privacy & Data Policy
            </Link>
            <span className="text-xs text-muted-foreground" data-testid="text-footer-built-by">Built by Manu Balakrishnan</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
