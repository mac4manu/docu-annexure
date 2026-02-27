import { Link } from "wouter";
import { Shield, Database, Bot, User, Trash2, Eye, Lock, ArrowLeft, ScanSearch, FileWarning, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  {
    icon: ScanSearch,
    title: "Automatic PII Detection & Redaction",
    items: [
      "All uploaded documents are automatically scanned for personally identifiable information (PII) before any content is stored",
      "The following PII types are detected and redacted: Social Security Numbers (SSNs), phone numbers, email addresses, credit card numbers, bank account numbers, driver\u2019s license numbers, dates of birth, and full street addresses",
      "Detected PII is replaced with redaction markers (e.g., [SSN REDACTED], [PHONE REDACTED]) so you can see where sensitive data was removed",
      "In addition to pattern-based detection, AI-powered analysis catches PII that regex alone may miss, such as names in the context of personal data and financial details",
      "Only the redacted version of document content is stored in the database \u2014 the original unredacted text is never persisted",
    ],
  },
  {
    icon: Database,
    title: "What DocuAnnexure Stores",
    items: [
      "Redacted text content from your uploaded documents \u2014 all PII is stripped before storage",
      "Original uploaded files are deleted immediately after processing",
      "Document metadata such as title, authors, DOI, journal, keywords, and (for real estate documents) property type, listing price, square footage, and year built",
      "Your chat conversations and messages with the AI assistant",
      "Your feedback ratings (thumbs up/down) on AI responses",
      "Basic profile information from your Replit account (name, email, profile picture)",
    ],
  },
  {
    icon: FileWarning,
    title: "What Gets Redacted",
    items: [
      "Social Security Numbers (SSNs) \u2014 replaced with [SSN REDACTED]",
      "Phone numbers \u2014 replaced with [PHONE REDACTED]",
      "Email addresses \u2014 replaced with [EMAIL REDACTED]",
      "Credit card numbers \u2014 replaced with [CREDIT CARD REDACTED]",
      "Bank account numbers \u2014 replaced with [BANK ACCOUNT REDACTED]",
      "Driver\u2019s license numbers \u2014 replaced with [DRIVER'S LICENSE REDACTED]",
      "Dates of birth \u2014 replaced with [DOB REDACTED]",
      "Full street addresses with unit numbers \u2014 replaced with [ADDRESS REDACTED]",
      "Names and other personal identifiers detected by AI analysis \u2014 replaced with appropriate redaction markers",
    ],
  },
  {
    icon: Building2,
    title: "Real Estate Document Privacy",
    items: [
      "Real estate documents often contain sensitive personal and financial information that is automatically redacted",
      "Full property addresses are redacted \u2014 only general location information (city, state, zip code) is retained for metadata",
      "Buyer/seller names, agent contact details, and financial account numbers in contracts and closing documents are redacted",
      "Listing prices and property characteristics (square footage, year built) are retained as non-sensitive metadata for document organization",
      "HOA documents, title reports, and inspection reports are scanned for personal information before storage",
    ],
  },
  {
    icon: Bot,
    title: "AI Processing",
    items: [
      "Document content is sent to OpenAI's API for text extraction and chat responses",
      "PII redaction occurs before content is stored, but original text may be temporarily processed by the AI during extraction",
      "AI confidence scoring also involves sending content to OpenAI for evaluation",
      "Avoid uploading highly sensitive or confidential documents beyond what PII redaction can handle",
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
    title: "What DocuAnnexure Does NOT Do",
    items: [
      "Unredacted PII is never stored \u2014 all personally identifiable information is stripped before storage",
      "Your data is never sold, shared, or distributed to third parties (beyond AI processing)",
      "Original uploaded files are never retained \u2014 only the redacted extracted text content is stored",
      "Your documents are never used to train AI models",
      "Your activity is never tracked for advertising purposes",
    ],
  },
  {
    icon: Trash2,
    title: "Data Deletion",
    items: [
      "Original uploaded files are automatically deleted immediately after text extraction and PII redaction",
      "You can delete any document from your library at any time",
      "You can delete any chat conversation, which also removes all its messages",
      "Deleted data is permanently removed from the database",
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
            DocuAnnexure is built with transparency in mind. This page explains what information is collected, how it is processed, and the control you have over your data. All documents undergo automatic PII redaction before storage.
          </p>
        </div>

        <Card className="mb-6" data-testid="card-privacy-summary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              DocuAnnexure processes your documents using AI to extract content and enable chat-based Q&A. Before any content is stored, it is automatically scanned for personally identifiable information (PII) such as SSNs, phone numbers, email addresses, and more. All detected PII is redacted and replaced with markers. Your original files are not retained after processing. All data is private to your account. Document content is sent to a third-party AI service (OpenAI) for extraction and chat responses. You can delete your documents and conversations at any time.
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
