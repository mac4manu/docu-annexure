import { Link } from "wouter";
import { Shield, Database, Bot, User, Trash2, Eye, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    icon: Database,
    title: "What We Store",
    items: [
      "Extracted text content from your uploaded documents (the original files are deleted after processing)",
      "Document metadata such as title, authors, DOI, journal, and keywords",
      "Your chat conversations and messages with the AI assistant",
      "Your feedback ratings (thumbs up/down) on AI responses",
      "Basic profile information from your Replit account (name, email, profile picture)",
    ],
  },
  {
    icon: Bot,
    title: "AI Processing",
    items: [
      "Document content is sent to OpenAI's API for text extraction and chat responses",
      "This means your document text is processed by a third-party AI service",
      "AI confidence scoring also involves sending content to OpenAI for evaluation",
      "We recommend not uploading highly sensitive or confidential documents",
    ],
  },
  {
    icon: User,
    title: "Your Data Is Isolated",
    items: [
      "All your documents and conversations are private to your account",
      "Other users cannot see or access your uploaded documents or chat history",
      "Admin users can only view aggregate platform statistics (totals and averages), not individual content",
    ],
  },
  {
    icon: Lock,
    title: "What We Do NOT Do",
    items: [
      "We do not sell, share, or distribute your data to third parties (beyond AI processing)",
      "We do not store your original uploaded files \u2014 only the extracted text content is retained",
      "We do not use your documents to train AI models",
      "We do not track your activity for advertising purposes",
    ],
  },
  {
    icon: Trash2,
    title: "Data Deletion",
    items: [
      "You can delete any document from your library at any time",
      "You can delete any chat conversation, which also removes all its messages",
      "Deleted data is permanently removed from our database",
    ],
  },
  {
    icon: Eye,
    title: "Session & Authentication",
    items: [
      "Authentication is handled securely through Replit's OAuth system",
      "Sessions are stored server-side in the database with secure cookies",
      "You can log out at any time to end your session",
    ],
  },
];

export default function Privacy() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10 w-full">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-privacy-back">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-md bg-primary/10 text-primary border border-primary/20">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-serif" data-testid="text-privacy-title">
              Privacy & Data Policy
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed" data-testid="text-privacy-subtitle">
            We believe in transparency about how your data is handled. This page explains what information DocuAnnexure collects, how it is processed, and the control you have over your data.
          </p>
        </div>

        <Card className="mb-6" data-testid="card-privacy-summary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              DocuAnnexure processes your documents using AI to extract content and enable chat-based Q&A. Your original files are not retained after processing. All data is private to your account. Document content is sent to a third-party AI service (OpenAI) for extraction and chat responses. You can delete your documents and conversations at any time.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.title} data-testid={`card-privacy-${section.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                    <section.icon className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground" data-testid="text-privacy-last-updated">
            Last updated: February 2026. This policy applies to the current evaluation phase of DocuAnnexure.
          </p>
        </div>
      </div>
    </div>
  );
}
