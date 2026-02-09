import { FileText, MessagesSquare, Brain, ArrowRight, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoImg from "@/assets/images/logo-transparent.png";
import heroBg from "@/assets/images/hero-bg.png";

const features = [
  {
    icon: FileText,
    title: "Rich Document Extraction",
    description:
      "Upload PDF, Word, or PowerPoint files. AI-powered vision extracts tables, formulas, images, and text into structured markdown.",
  },
  {
    icon: MessagesSquare,
    title: "Chat With Your Documents",
    description:
      "Ask questions about any document or chat across multiple files simultaneously. Get instant, AI-powered answers.",
  },
  {
    icon: Brain,
    title: "Intelligent Analysis",
    description:
      "Advanced AI understands context, cross-references between documents, and provides insights with proper citations.",
  },
];

const trustItems = [
  { icon: Shield, text: "Secure authentication" },
  { icon: Zap, text: "Instant document processing" },
];

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="DocuAnnexure" className="w-9 h-9 rounded-md" />
            <span className="font-bold text-base tracking-tight" data-testid="text-landing-logo">DocuAnnexure</span>
          </div>
          <a href="/api/login">
            <Button data-testid="button-header-login">Log in</Button>
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight font-serif"
                data-testid="text-hero-title"
              >
                Your documents,
                <br />
                <span className="text-primary">intelligently understood</span>
              </h1>
              <p className="text-base md:text-lg text-white/70 max-w-lg leading-relaxed">
                Upload any document and let AI extract rich content, answer your questions, and help you discover insights
                across your entire knowledge base.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <a href="/api/login">
                  <Button size="lg" data-testid="button-hero-get-started">
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-4 pt-2 flex-wrap">
                {trustItems.map((item) => (
                  <span key={item.text} className="flex items-center gap-1.5 text-xs text-white/50">
                    <item.icon className="w-3.5 h-3.5" />
                    {item.text}
                  </span>
                ))}
              </div>
            </div>

            <div className="hidden md:flex items-center justify-center">
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate" data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-6 space-y-3">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} DocuAnnexure</span>
          <span className="text-xs text-muted-foreground">Document inference & knowledge chat</span>
        </div>
      </footer>
    </div>
  );
}
