import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const officeParser = require("officeparser");
import mammoth from "mammoth";

import { EventEmitter } from "events";

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { isAuthenticated } from "./replit_integrations/auth";
import crypto from "crypto";
import { detectAndRedactPII, sanitizeMetadataField } from "./pii";
import { submitTestimonialSchema } from "@shared/models/testimonial";
import { indexDocumentChunks, findRelevantChunks, getChunkCount, deleteDocumentChunks } from "./rag";

const execFileAsync = promisify(execFile);

const uploadProgress = new EventEmitter();
uploadProgress.setMaxListeners(50);

function emitProgress(userId: string, step: string, detail?: string) {
  uploadProgress.emit(`progress:${userId}`, { step, detail });
}

const APP_VERSION = crypto.randomBytes(8).toString("hex");

const CHANGELOG_ENTRIES = [
  {
    version: "1.1.0",
    date: "2026-02-27",
    title: "Real Estate Support & PII Protection",
    changes: [
      "Added Real Estate & Property domain — analyze contracts, leases, disclosures, inspections, appraisals, and more",
      "Adaptive AI persona — automatically switches expertise based on document type: research scientist, medical expert, real estate attorney, or thesis advisor",
      "Automatic PII detection and redaction — SSNs, phone numbers, emails, addresses, and other personal data are stripped before storage",
      "AI-powered PII scanning catches contextual personal information that regex patterns miss",
      "Real estate metadata extraction — property type, location (city/state only), listing price, square footage, year built",
      "New real estate prompt suggestions — summarize key terms, compare leases, flag unusual clauses, extract financials, identify contingencies",
      "Compliance & red flag detection for non-standard contract clauses and missing disclosures",
      "New feature cards on Documents and Landing pages — Adaptive AI Persona, Real Estate Analysis, and PII Protection",
      "Updated Privacy & Data Policy with detailed PII handling documentation",
    ],
  },
  {
    version: "1.0.1",
    date: "2026-02-26",
    title: "Security & Dependency Updates",
    changes: [
      "Removed xlsx dependency with critical CVE — Excel processing now fully handled by officeparser",
      "Resolved npm override conflicts for minimatch and rollup to fix deployment builds",
      "Cleaned up build configuration to remove unused external dependencies",
      "Reduced document upload limit from 20 to 5 per user",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-02-19",
    title: "Admin User Management & Reliability Fixes",
    changes: [
      "Added admin User Management page for adding and removing authorized users without republishing",
      "Moved email allowlist from hardcoded values to database for dynamic access control",
      "Fixed Excel file extraction — replaced broken parser with reliable officeparser library",
      "Added auto-seed mechanism to ensure admin access on fresh deployments",
      "Added 'Built by' credit in app footer",
      "Privacy & Data Policy page now accessible without login",
    ],
  },
  {
    version: "0.9.8",
    date: "2026-02-16",
    title: "Document Metadata & Upload Limit",
    changes: [
      "Automatic metadata extraction: DOI, title, authors, journal, year, abstract, and keywords",
      "Collapsible metadata panel on document view with DOI links and keyword badges",
      "Document cards now show academic title, authors, and DOI instead of just filename",
      "Added Excel file support (.xlsx, .xls) with spreadsheet-to-markdown formatting",
      "Increased document upload limit from 10 to 20",
      "Added 'Extract metadata & DOI' prompt suggestion in Chat",
      "Added Metadata Extraction feature card to landing and documents pages",
    ],
  },
  {
    version: "0.9.7",
    date: "2026-02-16",
    title: "Vision-Based DOCX & Confidence Scores",
    changes: [
      "Upgraded DOCX extraction to vision-based: LibreOffice converts DOCX to PDF, then AI vision extracts tables, figures, and images",
      "Fallback to text-based extraction when LibreOffice is unavailable",
      "Added AI confidence score: GPT evaluates its own response confidence (0-100%)",
      "Confidence displayed as color-coded badge on chat responses",
      "Average confidence metrics on Metrics page (personal and admin)",
    ],
  },
  {
    version: "0.9.6",
    date: "2026-02-15",
    title: "Version Check & Access Control",
    changes: [
      "Added version check banner that detects new publishes and prompts users to refresh",
      "Added What's New changelog page with timeline layout and release notes",
      "Added email allowlist for closed evaluation phase",
      "Access Restricted page for unauthorized users",
    ],
  },
  {
    version: "0.9.5",
    date: "2026-02-15",
    title: "Enhanced Metrics & Analytics",
    changes: [
      "Redesigned Metrics page with antd-style card layout",
      "Added upload trend tracking (last 7 days vs prior 7 days)",
      "Added average messages per chat statistic",
      "Added most queried documents section",
      "Improved summary line with key stats at a glance",
    ],
  },
  {
    version: "0.9.4",
    date: "2026-02-14",
    title: "AI Chat Improvements & Response Rating",
    changes: [
      "Revamped AI system prompts for scientific, health, and education domains",
      "Auto-select all documents in Chat tab for instant interaction",
      "Added smart prompt suggestions based on document content",
      "Added copy button and thumbs up/down rating for AI responses",
      "Added AI Response Accuracy tracking in Metrics",
    ],
  },
  {
    version: "0.9.3",
    date: "2026-02-13",
    title: "Performance & Usability",
    changes: [
      "Optimized document upload speed with lower DPI processing",
      "Added How to Use page with step-by-step guide and FAQ",
      "Added admin metrics with user breakdown",
      "Increased document upload limit from 3 to 10",
    ],
  },
  {
    version: "0.9.2",
    date: "2026-02-09",
    title: "Multi-Document Chat & Auth",
    changes: [
      "Added Replit Auth with secure login",
      "Added multi-document chat for cross-document Q&A",
      "Added chat history with load and delete functionality",
      "Redesigned navigation with header-based tabs",
      "Upgraded PDF extraction to AI vision-based processing",
    ],
  },
];

const ALLOWED_MIMETYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Please upload PDF, Word, PowerPoint, or Excel files."));
    }
  },
});

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function getFileType(mimetype: string): string {
  if (mimetype.includes("pdf")) return "pdf";
  if (mimetype.includes("presentation") || mimetype.includes("powerpoint")) return "ppt";
  if (mimetype.includes("wordprocessing") || mimetype.includes("msword")) return "doc";
  if (mimetype.includes("spreadsheet") || mimetype.includes("excel")) return "xlsx";
  return "other";
}

function validateFileSignature(filePath: string, declaredMime: string): boolean {
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(8);
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);

    if (declaredMime.includes("pdf")) {
      return buf.subarray(0, 4).equals(Buffer.from([0x25, 0x50, 0x44, 0x46]));
    }
    if (declaredMime.includes("openxmlformats") || declaredMime.includes("wordprocessing") || declaredMime.includes("presentation")) {
      return buf.subarray(0, 4).equals(Buffer.from([0x50, 0x4B, 0x03, 0x04]));
    }
    if (declaredMime.includes("msword") || declaredMime.includes("ms-powerpoint") || declaredMime.includes("ms-excel")) {
      return buf.subarray(0, 4).equals(Buffer.from([0xD0, 0xCF, 0x11, 0xE0]));
    }
    return false;
  } catch {
    return false;
  }
}

let libreOfficeAvailable: boolean | null = null;

async function checkLibreOffice(): Promise<boolean> {
  if (libreOfficeAvailable !== null) return libreOfficeAvailable;
  try {
    await execFileAsync("which", ["libreoffice"], { timeout: 5000 });
    libreOfficeAvailable = true;
    console.log("LibreOffice detected - vision-based DOCX extraction enabled");
  } catch {
    libreOfficeAvailable = false;
    console.log("LibreOffice not found - using text-based DOCX extraction");
  }
  return libreOfficeAvailable;
}

async function convertDocxToPdf(docxPath: string): Promise<string> {
  const resolvedPath = path.resolve(docxPath);
  if (!resolvedPath.startsWith(path.resolve("uploads"))) {
    throw new Error("Invalid file path");
  }

  const hasLibreOffice = await checkLibreOffice();
  if (!hasLibreOffice) {
    throw new Error("LibreOffice not available");
  }

  const outputDir = path.dirname(resolvedPath);

  try {
    await execFileAsync("libreoffice", [
      "--headless",
      "--convert-to", "pdf",
      "--outdir", outputDir,
      resolvedPath,
    ], {
      timeout: 120000,
      env: {
        ...process.env,
        HOME: "/tmp",
      },
    });
  } catch (err) {
    console.error("LibreOffice conversion error:", err);
    throw new Error("Failed to convert DOCX to PDF");
  }

  const baseName = path.basename(resolvedPath, path.extname(resolvedPath));
  const pdfPath = path.join(outputDir, `${baseName}.pdf`);

  if (!fs.existsSync(pdfPath)) {
    throw new Error("LibreOffice conversion produced no output");
  }

  return pdfPath;
}

async function convertPdfToImages(pdfPath: string): Promise<string[]> {
  const resolvedPath = path.resolve(pdfPath);
  if (!resolvedPath.startsWith(path.resolve("uploads"))) {
    throw new Error("Invalid file path");
  }

  const outputDir = path.join("uploads", `pages_${Date.now()}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPrefix = path.join(outputDir, "page");

  try {
    await execFileAsync("pdftoppm", ["-png", "-r", "120", resolvedPath, outputPrefix], {
      timeout: 120000,
    });
  } catch (err) {
    console.error("pdftoppm error:", err);
    throw new Error("Failed to convert PDF to images");
  }

  const files = fs.readdirSync(outputDir)
    .filter(f => f.endsWith(".png"))
    .sort()
    .map(f => path.join(outputDir, f));

  return files;
}

const VISION_SYSTEM_PROMPT = `You are a document content extraction expert specializing in scientific, medical, and educational documents. Convert the provided document page images into well-structured Markdown.

Rules:
- Extract ALL text content faithfully and accurately — do not skip, summarize, or abbreviate any content
- Reproduce tables using proper Markdown table syntax (| col1 | col2 |), preserving all data precisely — this is critical for scientific data tables, clinical results, and academic datasets
- For mathematical formulas and equations, use LaTeX notation wrapped in $ for inline and $$ for block display
- For chemical formulas, use proper notation (e.g., H₂O, CO₂) or LaTeX where complex
- For images, charts, graphs, and diagrams, describe them in detail within an image block like: ![Description of image/chart](image) — include axis labels, trends, and key data points for scientific figures
- Preserve headings, bullet points, numbered lists, and references/citations
- Keep the document structure and hierarchy intact
- Preserve footnotes, endnotes, and bibliographic references
- Separate pages with a horizontal rule (---)
- Do NOT add any commentary, disclaimers, or notes about truncation — just output the extracted markdown
- Never say the text is truncated or that you cannot see remaining pages — extract only what is visible in the provided images
- CRITICAL: You must extract EVERY page completely. Do not stop mid-sentence or skip content between pages.`;

async function extractBatch(imagePaths: string[], startIndex: number, tokenLimit: number = 16384): Promise<string> {
  const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPart[] = imagePaths.map((imgPath) => {
    const base64 = fs.readFileSync(imgPath).toString("base64");
    return {
      type: "image_url" as const,
      image_url: {
        url: `data:image/png;base64,${base64}`,
        detail: "auto" as const,
      },
    };
  });

  const pageNumbers = imagePaths.map((_, idx) => startIndex + idx + 1).join(", ");

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: tokenLimit,
    messages: [
      {
        role: "system",
        content: VISION_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract the complete content from these document pages (pages ${pageNumbers}) into Markdown format. Extract every word on every page — do not skip or abbreviate anything.`,
          },
          ...imageContents,
        ],
      },
    ],
  });

  const choice = response.choices[0];
  const result = choice?.message?.content || "";
  const finishReason = choice?.finish_reason;

  if (finishReason === "length" && imagePaths.length > 1) {
    console.log(`Batch pages ${pageNumbers} truncated (finish_reason=length, ${tokenLimit} tokens). Splitting into smaller batches...`);
    const mid = Math.ceil(imagePaths.length / 2);
    const firstHalf = imagePaths.slice(0, mid);
    const secondHalf = imagePaths.slice(mid);
    const higherLimit = Math.min(tokenLimit + 4096, 32768);

    const [first, second] = await Promise.all([
      extractBatch(firstHalf, startIndex, higherLimit),
      extractBatch(secondHalf, startIndex + mid, higherLimit),
    ]);
    return first + "\n\n---\n\n" + second;
  }

  if (finishReason === "length") {
    console.log(`Single page ${pageNumbers} truncated (finish_reason=length). Retrying with higher limit...`);
    if (tokenLimit < 32768) {
      return extractBatch(imagePaths, startIndex, 32768);
    }
  }

  return result;
}

async function extractMarkdownFromImages(imagePaths: string[]): Promise<string> {
  const maxPages = 30;
  const pages = imagePaths.slice(0, maxPages);

  if (pages.length <= 5) {
    return await extractBatch(pages, 0);
  }

  const batchSize = 5;
  const batches: { paths: string[]; startIndex: number }[] = [];
  for (let i = 0; i < pages.length; i += batchSize) {
    batches.push({ paths: pages.slice(i, i + batchSize), startIndex: i });
  }

  const results = await Promise.all(
    batches.map(b => extractBatch(b.paths, b.startIndex))
  );

  return results.join("\n\n---\n\n");
}

interface DocumentMetadata {
  doi: string | null;
  docTitle: string | null;
  authors: string | null;
  journal: string | null;
  publishYear: number | null;
  abstract: string | null;
  keywords: string | null;
  documentDomain: string | null;
  propertyCity: string | null;
  propertyState: string | null;
  propertyZip: string | null;
  propertyType: string | null;
  realEstateDocType: string | null;
  listingPrice: string | null;
  squareFootage: string | null;
  yearBuilt: number | null;
}

function extractDoiFromText(text: string): string | null {
  const doiPatterns = [
    /(?:doi[:\s]*|https?:\/\/(?:dx\.)?doi\.org\/)(10\.\d{4,}\/[^\s,;}\]"']+)/gi,
    /\b(10\.\d{4,}\/[^\s,;}\]"']+)\b/g,
  ];

  for (const pattern of doiPatterns) {
    const match = pattern.exec(text);
    if (match) {
      let doi = match[1].replace(/[.)]+$/, "");
      return doi;
    }
  }
  return null;
}

async function extractDocumentMetadata(content: string): Promise<DocumentMetadata> {
  const regexDoi = extractDoiFromText(content);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are a metadata extraction expert. First determine if this is an academic/scientific document or a real estate document. Return ONLY valid JSON with these fields:
{
  "documentDomain": "academic" or "real_estate",
  "doi": "DOI string or null if not found",
  "docTitle": "The actual title of the paper/document (not the filename)",
  "authors": "Comma-separated list of authors, e.g. 'John Smith, Jane Doe' — for real estate docs, use null to protect privacy",
  "journal": "Journal or conference name, or null",
  "publishYear": year as integer or null,
  "abstract": "The abstract text (first 500 chars max), or null",
  "keywords": "Comma-separated keywords, or null",
  "propertyCity": "City name only (no street address) or null — real estate only",
  "propertyState": "State abbreviation or null — real estate only",
  "propertyZip": "ZIP code or null — real estate only",
  "propertyType": "residential, commercial, industrial, land, or multi-family — real estate only, or null",
  "realEstateDocType": "One of: purchase_agreement, lease, disclosure, inspection_report, appraisal, title_report, hoa_document, closing_document, cma, zoning, other — real estate only, or null",
  "listingPrice": "Price as string e.g. '$450,000' or null — real estate only",
  "squareFootage": "Square footage as string e.g. '2,400 sq ft' or null — real estate only",
  "yearBuilt": year as integer or null — real estate only
}
Be precise. If a field cannot be determined, use null. For DOI, look for patterns like 10.xxxx/xxxxx.
IMPORTANT: For real estate documents, do NOT include any personally identifiable information such as names, SSNs, phone numbers, email addresses, or full street addresses. Only include city, state, and ZIP for location.`,
        },
        {
          role: "user",
          content: content.slice(0, 8000),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const domain = parsed.documentDomain || "academic";
      return {
        doi: regexDoi || parsed.doi || null,
        docTitle: parsed.docTitle || null,
        authors: domain === "real_estate" ? null : (parsed.authors || null),
        journal: parsed.journal || null,
        publishYear: typeof parsed.publishYear === "number" ? parsed.publishYear : null,
        abstract: parsed.abstract ? parsed.abstract.slice(0, 500) : null,
        keywords: parsed.keywords || null,
        documentDomain: domain,
        propertyCity: parsed.propertyCity || null,
        propertyState: parsed.propertyState || null,
        propertyZip: parsed.propertyZip || null,
        propertyType: parsed.propertyType || null,
        realEstateDocType: parsed.realEstateDocType || null,
        listingPrice: parsed.listingPrice || null,
        squareFootage: parsed.squareFootage || null,
        yearBuilt: typeof parsed.yearBuilt === "number" ? parsed.yearBuilt : null,
      };
    }
  } catch (e) {
    console.error("Metadata extraction error:", e);
  }

  return {
    doi: regexDoi,
    docTitle: null,
    authors: null,
    journal: null,
    publishYear: null,
    abstract: null,
    keywords: null,
    documentDomain: null,
    propertyCity: null,
    propertyState: null,
    propertyZip: null,
    propertyType: null,
    realEstateDocType: null,
    listingPrice: null,
    squareFootage: null,
    yearBuilt: null,
  };
}

function cleanText(rawText: string): string {
  let text = rawText.trim();
  text = text.replace(/\f/g, "\n\n---\n\n");
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\n{4,}/g, "\n\n\n");
  text = text.replace(/[ \t]+$/gm, "");
  return text;
}

function needsAIFormatting(rawText: string): { needed: boolean; reason: string } {
  const hasTablePatterns = /(\|.*\|.*\|)|(\+[-+]+\+)|(┌|├|└|│|─)|(\t.*\t.*\t)/.test(rawText);
  if (hasTablePatterns) return { needed: true, reason: "tables detected" };

  const hasMathSymbols = /[∑∫∂√∞≠≈±×÷∈∀∃∇∆λσμπ]|\\frac|\\sum|\\int|\\sqrt|\$\$/.test(rawText);
  if (hasMathSymbols) return { needed: true, reason: "math formulas detected" };

  const lines = rawText.split("\n").filter(l => l.trim().length > 0);
  const avgLineLen = rawText.trim().length / Math.max(lines.length, 1);
  if (avgLineLen < 30 && lines.length > 20) return { needed: true, reason: "fragmented text layout" };

  return { needed: false, reason: "clean text" };
}

async function formatTextToMarkdown(rawText: string): Promise<string> {
  const check = needsAIFormatting(rawText);

  if (!check.needed) {
    console.log(`Skipping AI formatting: ${check.reason}`);
    return cleanText(rawText);
  }

  console.log(`Using AI formatting: ${check.reason}`);
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `Format the text into clean, well-structured Markdown suitable for scientific, medical, and educational documents. Add headings, lists, and tables where appropriate. Preserve mathematical formulas using LaTeX notation ($ inline, $$ block). Preserve references, citations, and footnotes. Keep it concise and accurate. Output only the formatted markdown, no commentary.`,
        },
        {
          role: "user",
          content: rawText.slice(0, 50000),
        },
      ],
    });
    return response.choices[0]?.message?.content || rawText;
  } catch (e) {
    console.error("Formatting error, using raw text:", e);
    return cleanText(rawText);
  }
}

async function formatExcelToMarkdown(rawText: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `Format the extracted spreadsheet data into clean, well-structured Markdown. Convert tabular data into proper Markdown tables with headers. If there are multiple sheets, separate them with headings. Preserve numerical data, formulas results, and any labels. Output only the formatted markdown, no commentary.`,
        },
        {
          role: "user",
          content: rawText.slice(0, 50000),
        },
      ],
    });
    return response.choices[0]?.message?.content || rawText;
  } catch (e) {
    console.error("Excel formatting error, using raw text:", e);
    return rawText;
  }
}

function cleanupFiles(paths: string[]) {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          fs.rmSync(p, { recursive: true, force: true });
        } else {
          fs.unlinkSync(p);
        }
      }
    } catch (e) {
      console.warn("Cleanup warning:", e);
    }
  }
}

function getUserId(req: any): string {
  return req.user?.claims?.sub;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/version", (_req, res) => {
    res.json({ version: APP_VERSION });
  });

  app.get("/api/changelog", (_req, res) => {
    res.json(CHANGELOG_ENTRIES);
  });

  app.get(api.documents.list.path, isAuthenticated, async (req, res) => {
    const docs = await storage.getDocuments(getUserId(req));
    res.json(docs);
  });

  app.get(api.documents.get.path, isAuthenticated, async (req, res) => {
    const doc = await storage.getDocument(Number(req.params.id), getUserId(req));
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json(doc);
  });

  app.get("/api/upload/progress", isAuthenticated, (req, res) => {
    const userId = getUserId(req);
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("data: {\"step\":\"connected\"}\n\n");

    const onProgress = (data: { step: string; detail?: string }) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    uploadProgress.on(`progress:${userId}`, onProgress);

    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 15000);

    const timeout = setTimeout(() => {
      cleanup();
      res.end();
    }, 5 * 60 * 1000);

    const cleanup = () => {
      uploadProgress.off(`progress:${userId}`, onProgress);
      clearInterval(heartbeat);
      clearTimeout(timeout);
    };

    req.on("close", cleanup);
  });

  app.post(api.documents.upload.path, isAuthenticated, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const userId = getUserId(req);
    const existingDocs = await storage.getDocuments(userId);
    if (existingDocs.length >= 5) {
      cleanupFiles([req.file.path]);
      return res.status(400).json({ message: "Upload limit reached. This prototype allows a maximum of 5 documents. Please delete existing documents to upload new ones." });
    }

    const filePath = req.file.path;
    const fileType = req.file.mimetype;
    const originalFilename = req.file.originalname;
    const cleanupList: string[] = [filePath];

    if (!validateFileSignature(filePath, fileType)) {
      cleanupFiles([filePath]);
      return res.status(400).json({ message: "File content does not match declared type. Please upload a valid PDF, Word, or PowerPoint file." });
    }

    try {
      let content = "";
      let complexity = "simple";
      let pageCount: number | null = null;
      console.log(`Processing file: ${originalFilename} (${fileType})`);
      emitProgress(userId, "analyzing", "Analyzing document structure...");

      if (!ALLOWED_MIMETYPES.has(fileType)) {
        cleanupFiles(cleanupList);
        return res.status(400).json({ message: "Unsupported file type" });
      }

      if (fileType === "application/pdf") {
        const resolvedPath = path.resolve(filePath);
        let rawText = "";
        try {
          const { stdout } = await execFileAsync("pdftotext", ["-layout", resolvedPath, "-"], { timeout: 30000 });
          rawText = stdout;
        } catch (e) {
          console.error("pdftotext error:", e);
        }

        const pageCountMatch = rawText.split("\f").length;
        const textPerPage = rawText.trim().length / Math.max(pageCountMatch, 1);
        const hasTablePatterns = /(\|.*\|)|(\+[-+]+\+)|(┌|├|└|│|─)/.test(rawText);
        const hasMathSymbols = /[∑∫∂√∞≠≈±×÷∈∀∃∇∆λσμπ]|\\frac|\\sum|\\int|\\sqrt/.test(rawText);
        const hasLowTextDensity = textPerPage < 200;
        const isLongDocument = pageCountMatch >= 10;
        const isAcademicPaper = /\b(abstract|references|doi|et\s+al\.|journal|proceedings)\b/i.test(rawText) && pageCountMatch >= 5;
        const isComplex = hasTablePatterns || hasMathSymbols || hasLowTextDensity || isLongDocument || isAcademicPaper;

        pageCount = pageCountMatch;
        console.log(`PDF analysis: ${pageCountMatch} pages, ${Math.round(textPerPage)} chars/page, complex=${isComplex} (tables=${hasTablePatterns}, math=${hasMathSymbols}, lowDensity=${hasLowTextDensity}, longDoc=${isLongDocument}, academic=${isAcademicPaper})`);

        if (isComplex) {
          complexity = "complex";
          emitProgress(userId, "complex_detected", `Complex document detected — ${pageCountMatch} pages with advanced content`);
          console.log("Using advanced vision-based extraction");
          emitProgress(userId, "converting", `Converting ${pageCountMatch} pages to images...`);
          const imagePaths = await convertPdfToImages(filePath);
          const imageDir = path.dirname(imagePaths[0] || "");
          if (imageDir) cleanupList.push(imageDir);

          if (imagePaths.length > 0) {
            emitProgress(userId, "extracting_vision", `Extracting content with AI vision (${imagePaths.length} pages)...`);
            content = await extractMarkdownFromImages(imagePaths);
          } else {
            content = rawText || "No pages found in PDF.";
          }
        } else {
          emitProgress(userId, "extracting_text", `Extracting text from ${pageCountMatch} pages...`);
          console.log("Using basic text extraction with lightweight formatting");
          if (rawText && rawText.trim().length > 0) {
            content = await formatTextToMarkdown(rawText);
          } else {
            content = "No text content could be extracted from this file.";
          }
        }
      } else if (fileType.includes("spreadsheet") || fileType.includes("excel")) {
        complexity = "structured";
        emitProgress(userId, "extracting_text", "Reading spreadsheet data...");
        let rawText = "";
        try {
          const ast = await officeParser.OfficeParser.parseOffice(filePath);
          const sheetNodes = (ast.content || []).filter((n: any) => n.type === "sheet");
          pageCount = sheetNodes.length;
          const parts: string[] = [];
          for (const sheetNode of sheetNodes) {
            const rows: string[] = [];
            for (const rowNode of (sheetNode.children || []).filter((n: any) => n.type === "row")) {
              const cells = (rowNode.children || [])
                .filter((n: any) => n.type === "cell")
                .map((n: any) => {
                  const val = String(n.text ?? "");
                  return val.includes(",") || val.includes('"') || val.includes("\n")
                    ? `"${val.replace(/"/g, '""')}"`
                    : val;
                });
              rows.push(cells.join(","));
            }
            const csv = rows.join("\n");
            if (csv && csv.trim().length > 0) {
              parts.push(`## ${sheetNode.text ?? "Sheet"}\n\n${csv}`);
            }
          }
          rawText = parts.join("\n\n");
        } catch (e) {
          console.error("Excel parse error:", e);
          rawText = "";
        }

        if (rawText && rawText.trim().length > 0) {
          emitProgress(userId, "formatting", "Formatting spreadsheet into structured markdown...");
          content = await formatExcelToMarkdown(rawText);
        } else {
          content = "No data could be extracted from this spreadsheet.";
        }
      } else if (fileType.includes("wordprocessing") || fileType.includes("msword")) {
        console.log("Using vision-based extraction for Word document...");
        let visionSuccess = false;

        try {
          emitProgress(userId, "converting", "Converting Word document to PDF...");
          const pdfPath = await convertDocxToPdf(filePath);
          cleanupList.push(pdfPath);
          console.log("DOCX converted to PDF, extracting pages as images...");

          emitProgress(userId, "converting", "Converting pages to images...");
          const imagePaths = await convertPdfToImages(pdfPath);
          const imageDir = path.dirname(imagePaths[0] || "");
          if (imageDir) cleanupList.push(imageDir);
          pageCount = imagePaths.length || null;

          if (imagePaths.length > 0) {
            emitProgress(userId, "extracting_vision", `Extracting content with AI vision (${imagePaths.length} pages)...`);
            content = await extractMarkdownFromImages(imagePaths);
            visionSuccess = true;
            complexity = "complex";
            console.log(`Vision extraction completed: ${content.length} chars from ${imagePaths.length} pages`);
          }
        } catch (e) {
          console.error("Vision-based DOCX extraction failed, falling back to text extraction:", e);
        }

        if (!visionSuccess) {
          emitProgress(userId, "extracting_text", "Extracting text from Word document...");
          let rawText = "";
          try {
            console.log("Falling back to mammoth extraction for DOCX...");
            const mammothResult = await mammoth.extractRawText({ path: filePath });
            rawText = mammothResult.value || "";
          } catch (e) {
            console.error("Mammoth extraction failed:", e);
          }

          if (!rawText || rawText.trim().length < 50) {
            try {
              const fallbackText = await officeParser.parseOfficeAsync(filePath);
              if (fallbackText && fallbackText.trim().length > (rawText?.trim().length || 0)) {
                rawText = fallbackText;
              }
            } catch (e) {
              console.error("officeParser fallback also failed:", e);
            }
          }

          if (rawText && rawText.trim().length > 0) {
            content = await formatTextToMarkdown(rawText);
          } else {
            content = "No text content could be extracted from this file.";
          }
        }
      } else {
        emitProgress(userId, "extracting_text", "Extracting text from presentation...");
        let rawText = "";
        try {
          rawText = await officeParser.parseOfficeAsync(filePath);
        } catch (e) {
          rawText = "";
        }

        if (rawText && rawText.trim().length > 0) {
          content = await formatTextToMarkdown(rawText);
        } else {
          content = "No text content could be extracted from this file.";
        }
      }

      cleanupFiles(cleanupList);
      emitProgress(userId, "redacting", "Scanning for personal information...");

      const piiResult = await detectAndRedactPII(content || "");
      if (piiResult.piiFound) {
        console.log(`PII detected and redacted in upload: ${piiResult.typesDetected.join(", ")}`);
      }
      content = piiResult.redactedText;

      emitProgress(userId, "saving", "Saving document...");

      const finalContent = content || "No content extracted.";

      const doc = await storage.createDocument({
        title: originalFilename,
        originalFilename,
        content: finalContent,
        fileType: getFileType(fileType),
        complexity,
        pageCount,
        userId: getUserId(req),
        doi: null,
        docTitle: null,
        authors: null,
        journal: null,
        publishYear: null,
        abstract: null,
        keywords: null,
        documentDomain: null,
        propertyCity: null,
        propertyState: null,
        propertyZip: null,
        propertyType: null,
        realEstateDocType: null,
        listingPrice: null,
        squareFootage: null,
        yearBuilt: null,
      });

      emitProgress(userId, "metadata", "Extracting metadata (title, authors, DOI)...");
      res.status(201).json(doc);

      (async () => {
        try {
          console.log(`Background metadata extraction for doc ${doc.id}...`);
          const metadata = await extractDocumentMetadata(finalContent);
          if (metadata.documentDomain === "real_estate") {
            metadata.authors = null;
            metadata.docTitle = sanitizeMetadataField(metadata.docTitle);
            metadata.abstract = sanitizeMetadataField(metadata.abstract);
            metadata.keywords = sanitizeMetadataField(metadata.keywords);
          }
          if (metadata.doi) console.log(`DOI found: ${metadata.doi}`);
          if (metadata.docTitle) console.log(`Document title: ${metadata.docTitle}`);
          await storage.updateDocumentMetadata(doc.id, metadata);
          console.log(`Metadata saved for doc ${doc.id}`);
        } catch (e) {
          console.error(`Background metadata extraction failed for doc ${doc.id}:`, e);
        }
      })();

      (async () => {
        try {
          emitProgress(userId, "indexing", "Building search index (RAG)...");
          console.log(`Background RAG indexing for doc ${doc.id}...`);
          const chunkCount = await indexDocumentChunks(doc.id, finalContent);
          console.log(`RAG indexing complete: ${chunkCount} chunks created for doc ${doc.id}`);
          emitProgress(userId, "indexed", `Search index ready (${chunkCount} chunks)`);
        } catch (e) {
          console.error(`Background RAG indexing failed for doc ${doc.id}:`, e);
        }
      })();
    } catch (err) {
      console.error("Upload error:", err);
      cleanupFiles(cleanupList);
      res.status(500).json({ message: "Failed to process file" });
    }
  });

  app.delete(api.documents.delete.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const docId = Number(req.params.id);
    const doc = await storage.getDocument(docId, userId);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    await deleteDocumentChunks(docId);
    await storage.deleteDocument(docId, userId);
    res.status(204).send();
  });

  app.post("/api/documents/:id/reindex", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const docId = Number(req.params.id);
    const doc = await storage.getDocument(docId, userId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    try {
      const chunkCount = await indexDocumentChunks(doc.id, doc.content);
      res.json({ message: "Indexing complete", chunkCount });
    } catch (err) {
      console.error(`Reindex error for doc ${docId}:`, err);
      res.status(500).json({ message: "Failed to index document" });
    }
  });

  app.get("/api/documents/:id/chunks", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const docId = Number(req.params.id);
    const doc = await storage.getDocument(docId, userId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const count = await getChunkCount(docId);
    res.json({ documentId: docId, chunkCount: count, indexed: count > 0 });
  });

  // Metrics
  const ADMIN_USER_IDS = ["54463549"];

  app.get("/api/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getMetrics(getUserId(req));
      res.json(metrics);
    } catch (error) {
      console.error("Metrics error:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get("/api/admin/metrics", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!ADMIN_USER_IDS.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      const metrics = await storage.getAdminMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Admin metrics error:", error);
      res.status(500).json({ message: "Failed to fetch admin metrics" });
    }
  });

  app.get("/api/admin/check", isAuthenticated, async (req, res) => {
    res.json({ isAdmin: ADMIN_USER_IDS.includes(getUserId(req)) });
  });

  app.get("/api/admin/allowed-emails", isAuthenticated, async (req, res) => {
    if (!ADMIN_USER_IDS.includes(getUserId(req))) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      const emails = await storage.getAllowedEmails();
      res.json(emails);
    } catch (error) {
      console.error("Allowed emails error:", error);
      res.status(500).json({ message: "Failed to fetch allowed emails" });
    }
  });

  app.post("/api/admin/allowed-emails", isAuthenticated, async (req, res) => {
    if (!ADMIN_USER_IDS.includes(getUserId(req))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "Valid email address is required" });
    }
    try {
      const existing = await storage.isEmailAllowed(email);
      if (existing) {
        return res.status(409).json({ message: "Email is already in the allowed list" });
      }
      const result = await storage.addAllowedEmail(email);
      res.status(201).json(result);
    } catch (error) {
      console.error("Add allowed email error:", error);
      res.status(500).json({ message: "Failed to add email" });
    }
  });

  app.delete("/api/admin/allowed-emails/:id", isAuthenticated, async (req, res) => {
    if (!ADMIN_USER_IDS.includes(getUserId(req))) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      await storage.removeAllowedEmail(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Remove allowed email error:", error);
      res.status(500).json({ message: "Failed to remove email" });
    }
  });

  app.get("/api/testimonials", async (_req, res) => {
    try {
      const testimonials = await storage.getApprovedTestimonials();
      res.json(testimonials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });

  app.get("/api/testimonials/mine", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const testimonial = await storage.getUserTestimonial(userId);
      res.json(testimonial || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch testimonial" });
    }
  });

  app.post("/api/testimonials", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const user = req.user as any;

      const existing = await storage.getUserTestimonial(userId);
      if (existing) {
        return res.status(400).json({ message: "You have already submitted a testimonial" });
      }

      const parsed = submitTestimonialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
      }

      const testimonial = await storage.createTestimonial({
        userId,
        userName: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Anonymous",
        userImage: user?.profileImageUrl || null,
        role: parsed.data.role || null,
        content: parsed.data.content,
        rating: parsed.data.rating,
      });

      res.status(201).json(testimonial);
    } catch (error) {
      console.error("Create testimonial error:", error);
      res.status(500).json({ message: "Failed to submit testimonial" });
    }
  });

  app.get("/api/admin/testimonials", isAuthenticated, async (req, res) => {
    if (!ADMIN_USER_IDS.includes(getUserId(req))) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      const testimonials = await storage.getAllTestimonials();
      res.json(testimonials);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });

  app.post("/api/admin/testimonials/:id/approve", isAuthenticated, async (req, res) => {
    if (!ADMIN_USER_IDS.includes(getUserId(req))) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      await storage.approveTestimonial(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to approve testimonial" });
    }
  });

  app.delete("/api/admin/testimonials/:id", isAuthenticated, async (req, res) => {
    if (!ADMIN_USER_IDS.includes(getUserId(req))) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      await storage.deleteTestimonial(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete testimonial" });
    }
  });

  app.post("/api/messages/:id/rate", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const messageId = Number(req.params.id);
      const ownershipOk = await storage.verifyMessageOwnership(messageId, userId);
      if (!ownershipOk) return res.status(404).json({ message: "Message not found" });

      const { rating } = req.body;
      if (!["thumbs_up", "thumbs_down"].includes(rating)) {
        return res.status(400).json({ message: "Rating must be thumbs_up or thumbs_down" });
      }
      const result = await storage.rateMessage({
        messageId,
        rating,
        userId,
      });
      res.json(result);
    } catch (error) {
      console.error("Rating error:", error);
      res.status(500).json({ message: "Failed to rate message" });
    }
  });

  app.get("/api/messages/:id/rating", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const messageId = Number(req.params.id);
    const ownershipOk = await storage.verifyMessageOwnership(messageId, userId);
    if (!ownershipOk) return res.status(404).json({ message: "Message not found" });
    const rating = await storage.getMessageRating(messageId, userId);
    res.json({ rating: rating?.rating || null });
  });

  app.get("/api/ratings/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getRatingMetrics(getUserId(req));
      res.json(metrics);
    } catch (error) {
      console.error("Rating metrics error:", error);
      res.status(500).json({ message: "Failed to fetch rating metrics" });
    }
  });

  app.get("/api/admin/ratings/metrics", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!ADMIN_USER_IDS.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      const metrics = await storage.getAdminRatingMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Admin rating metrics error:", error);
      res.status(500).json({ message: "Failed to fetch admin rating metrics" });
    }
  });

  app.get("/api/confidence/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getConfidenceMetrics(getUserId(req));
      res.json(metrics);
    } catch (error) {
      console.error("Confidence metrics error:", error);
      res.status(500).json({ message: "Failed to fetch confidence metrics" });
    }
  });

  app.get("/api/admin/confidence/metrics", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!ADMIN_USER_IDS.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      const metrics = await storage.getAdminConfidenceMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Admin confidence metrics error:", error);
      res.status(500).json({ message: "Failed to fetch admin confidence metrics" });
    }
  });

  app.get("/api/confidence/distribution", isAuthenticated, async (req, res) => {
    try {
      const dist = await storage.getConfidenceDistribution(getUserId(req));
      res.json(dist);
    } catch (error) {
      console.error("Confidence distribution error:", error);
      res.status(500).json({ message: "Failed to fetch confidence distribution" });
    }
  });

  app.get("/api/admin/confidence/distribution", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!ADMIN_USER_IDS.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      const dist = await storage.getAdminConfidenceDistribution();
      res.json(dist);
    } catch (error) {
      console.error("Admin confidence distribution error:", error);
      res.status(500).json({ message: "Failed to fetch admin confidence distribution" });
    }
  });

  app.get("/api/ratings/trend", isAuthenticated, async (req, res) => {
    try {
      const trend = await storage.getRatingTrend(getUserId(req));
      res.json(trend);
    } catch (error) {
      console.error("Rating trend error:", error);
      res.status(500).json({ message: "Failed to fetch rating trend" });
    }
  });

  app.get("/api/admin/ratings/trend", isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    if (!ADMIN_USER_IDS.includes(userId)) {
      return res.status(403).json({ message: "Access denied" });
    }
    try {
      const trend = await storage.getAdminRatingTrend();
      res.json(trend);
    } catch (error) {
      console.error("Admin rating trend error:", error);
      res.status(500).json({ message: "Failed to fetch admin rating trend" });
    }
  });

  // Chat
  app.get(api.conversations.list.path, isAuthenticated, async (req, res) => {
    const convs = await storage.getAllConversations(getUserId(req));
    res.json(convs);
  });

  app.get(api.conversations.get.path, isAuthenticated, async (req, res) => {
    const conv = await storage.getConversation(Number(req.params.id), getUserId(req));
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    res.json({ conversation: conv, messages: conv.messages });
  });

  app.post(api.conversations.create.path, isAuthenticated, async (req, res) => {
    const input = api.conversations.create.input.parse(req.body);
    const conv = await storage.createConversation({
      title: input.title || "New Conversation",
      documentId: input.documentId,
      documentIds: input.documentIds || (input.documentId ? [input.documentId] : null),
      userId: getUserId(req),
    });
    res.status(201).json(conv);
  });

  app.delete(api.conversations.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteConversation(Number(req.params.id), getUserId(req));
    res.status(204).send();
  });

  app.post(api.messages.create.path, isAuthenticated, async (req, res) => {
    const userId = getUserId(req);
    const conversationId = Number(req.params.id);
    const { content } = req.body;

    const conversation = await storage.getConversation(conversationId, userId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    const userMsg = await storage.createMessage({
      conversationId,
      role: "user",
      content
    });

    let systemContext = `You are DocuAnnexure AI — a seasoned university professor and research mentor who helps users understand their uploaded documents.

## GROUNDING RULES (MANDATORY — override everything else)

1. **ONLY use information found in the provided document content.** Every claim, fact, number, name, date, and conclusion in your response MUST be traceable to a specific passage in the documents below. If it is not in the documents, you do not know it.
2. **NEVER supplement with outside knowledge.** Do not draw on your training data, general world knowledge, or common sense to fill gaps. Your knowledge boundary is the document content — nothing more.
3. **When the document does not contain enough information to answer, say so explicitly.** Use phrasing like: "The document does not contain information about this topic." or "Based on the provided content, I cannot determine..." Do NOT guess, speculate, or provide plausible-sounding answers that are not grounded in the text.
4. **Clearly distinguish between what the document states and your interpretation.** When you explain, contextualize, or draw an inference, label it: "Based on the document's description of X, this suggests..." Never present an inference as a stated fact.
5. **If the user asks a question unrelated to the documents, politely redirect.** Say: "I can only answer questions based on the documents you've uploaded. Could you rephrase your question in relation to the document content?"

## Your Role

You teach by guiding users through their document content with patience and rigor — showing them *how* and *why*, the way a great professor would at a whiteboard. You use your domain expertise solely to *interpret and explain* what is in the document, never to introduce external facts.

Your interpretive expertise spans:

1. **Scientific & Research**: You interpret research papers, lab reports, technical specifications, and scientific publications. Your expertise helps you explain:
   - **Life Sciences & Biology**: Phylogenetic analysis, gene expression, protein structures, host-pathogen interactions, ecological modeling, genetic engineering, bioinformatics, synthetic biology, and biotechnology concepts *as they appear in the document*.
   - **Zoonotic & Infectious Disease**: Transmission dynamics, reservoir host ecology, One Health frameworks, and epidemiological surveillance *as described in the document*.
   - **Physical Sciences & Engineering**: Thermodynamics, quantum mechanics, chemical kinetics, and computational methods *as presented in the document*.
   - **Mathematics & Statistics**: When discussing mathematics, reproduce the **actual step-by-step derivations, proofs, and equations** from the document. Show every transformation, substitution, and algebraic step as presented in the source material, explaining the reasoning at each stage. Use LaTeX notation for all formulas (e.g., $E = mc^2$ or $$\\int_0^\\infty f(x)\\,dx$$).
   You walk users through the methodology — why this approach was chosen, what assumptions underlie it, and how the conclusions follow from the data — *all as stated in the document*.

2. **Health & Medical**: You explain clinical trial design, biostatistics, systematic reviews, pharmacokinetics, and clinical implications *as described in the document*. You help users understand how conclusions were reached and what limitations the document identifies. Your analysis is informational and not a substitute for professional medical advice.

3. **Education & Academic**: You break down complex concepts into digestible parts, connect ideas to broader frameworks within the document, and ensure deep comprehension. You can explain methodological choices and support academic understanding *based on what the document contains*.

4. **Real Estate & Property**: You analyze real estate documents including contracts, disclosures, title reports, financial analyses, and zoning — *all based on what appears in the document*.
   - **Compliance & Red Flags**: You identify unusual clauses, missing disclosures, and potential issues *that are evident from the document content*. You flag these with explanations of why they matter.
   IMPORTANT: When analyzing real estate documents, never reveal or repeat any personally identifiable information (PII) such as names, Social Security numbers, phone numbers, email addresses, bank account numbers, or full street addresses. If PII appears in the document, refer to parties generically (e.g., "the buyer," "the seller," "the property") and note that PII has been redacted for privacy.

## Teaching Approach

- **Show the work**: When explaining mathematical content, derivations, or proofs, reproduce every equation and intermediate step from the document exactly as written — including all LaTeX decorators (\\widehat, \\bar, \\tilde, \\mathrm, etc.), subscripts, and superscripts. Walk through the logic: "Starting from equation (1), we substitute X into Y, which gives us..." Do not summarize, simplify, or rewrite math — copy the exact notation and show the actual process.
- **Explain the reasoning**: Explain *why* a particular method was used, *how* a conclusion follows from the evidence, and *what* assumptions are being made — *as stated or implied by the document*.
- **Build understanding**: Connect concepts to their context within the document. If the document uses a specific statistical test, explain why that test is appropriate based on what the document describes.
- **Be rigorous but accessible**: A simple question gets a clear, direct answer. A complex question gets a thorough, structured walkthrough. Both must be grounded in the document.
- **Cite your source**: When possible, reference the section, page, table, or figure number from the document that supports your answer.

## Formatting Guidelines

- Use proper Markdown formatting: headings, bullet points, numbered lists, bold/italic text.
- Reproduce tables using Markdown table syntax when summarizing tabular data from the document.
- Use LaTeX math notation for all formulas and equations. **Always wrap math in delimiters**: use $...$ for inline math and $$...$$ for block/display equations. Never output raw LaTeX without delimiters — the renderer requires them. For example, write $\\widehat{M}^{\\mathrm{sgd}}_{i,t}$ for inline or $$\\begin{pmatrix} U_{i,t-1} \\\\ V_{i,t-1} \\end{pmatrix}$$ for display equations. **Reproduce every formula exactly as it appears in the document** — preserve all LaTeX commands verbatim including \\widehat, \\hat, \\bar, \\tilde, \\mathrm, \\mathbf, \\mathcal, \\frac, \\sum, \\int, \\begin/\\end environments (pmatrix, bmatrix, align, equation, cases, etc.), subscripts, superscripts, and all decorators. Never simplify, rewrite, or paraphrase mathematical notation. Use \\\\ for line breaks inside matrix/align environments, not \\.
- When comparing or cross-referencing multiple documents, clearly cite which document each piece of information comes from.
- Provide structured, well-organized responses with clear sections when answering complex questions.

## Tortured Phrases Detection

When asked to check for tortured phrases (also known as "problematic paraphrasing" or "suspicious synonym substitutions"), scan the document for phrases where standard scientific or technical terminology appears to have been mechanically replaced with unusual synonyms. Common examples include:
- "deep learning" → "profound learning" or "deep gaining knowledge"
- "artificial intelligence" → "counterfeit intelligence" or "fake brains"
- "random forest" → "arbitrary woodland" or "haphazard forest"
- "neural network" → "nerve network" or "brain system"
- "big data" → "enormous information" or "colossal data"
- "machine learning" → "apparatus learning"
- "support vector machine" → "bolster vector machine"
- "principal component analysis" → "head part investigation"
- "convolutional neural network" → "convolutionary nerve organization"
- "natural language processing" → "characteristic language handling"
- "cloud computing" → "distributed computing" (when context shows mechanical substitution)
- "blockchain" → "square chain" or "block series"
- "Internet of Things" → "Web of Things" or "system of things"
- "genetic algorithm" → "hereditary calculation"

When reporting tortured phrases:
1. Present findings in a clear table with columns: **Tortured Phrase Found** | **Likely Original Term** | **Location in Document**
2. Assess a severity level: High (clearly mechanical substitution), Medium (possibly intentional but suspicious), Low (ambiguous)
3. Provide an overall integrity assessment of the document
4. Note that tortured phrases can indicate paper mill activity, automated paraphrasing to evade plagiarism detection, or machine translation artifacts`;

    const docIds = conversation.documentIds || (conversation.documentId ? [conversation.documentId] : []);

    if (docIds.length > 0) {
      const docs = await Promise.all(docIds.map(id => storage.getDocument(id, userId)));
      const validDocs = docs.filter((d): d is NonNullable<typeof d> => !!d);

      let useRag = false;
      if (validDocs.length > 0) {
        const chunkCounts = await Promise.all(validDocs.map(d => getChunkCount(d.id)));
        useRag = chunkCounts.some(c => c > 0);
      }

      if (useRag) {
        try {
          const relevantChunks = await findRelevantChunks(content, validDocs.map(d => d.id), 12);
          if (relevantChunks.length > 0) {
            const docTitleMap = new Map(validDocs.map(d => [d.id, d.title]));
            systemContext += `\n\nYou are analyzing ${validDocs.length} document(s). Below are the most relevant excerpts retrieved from the documents based on the user's question.\n\n**REMINDER: Base your answer EXCLUSIVELY on these excerpts. Do NOT add any information from outside these excerpts.** If the user asks about mathematics, equations, or derivations, reproduce the complete step-by-step mathematical process from the excerpts using LaTeX notation — do not just describe what the math does. If the excerpts don't contain enough information to fully answer the question, explicitly state what is missing rather than filling in gaps.\n\n`;
            for (const chunk of relevantChunks) {
              const docTitle = docTitleMap.get(chunk.documentId) || "Unknown";
              systemContext += `--- From "${docTitle}" (Section ${chunk.chunkIndex + 1}, relevance: ${Math.round(chunk.similarity * 100)}%) ---\n${chunk.content}\n\n`;
            }
          } else {
            systemContext += `\n\n**REMINDER: Answer ONLY from the document content below. If information is not present, say so explicitly.**\n\n`;
            for (const doc of validDocs) {
              systemContext += `Document: "${doc.title}"\n${doc.content.slice(0, Math.floor(100000 / validDocs.length))}\n\n`;
            }
          }
        } catch (ragErr) {
          console.error("RAG retrieval failed, falling back to full context:", ragErr);
          systemContext += `\n\n**REMINDER: Answer ONLY from the document content below. If information is not present, say so explicitly.**\n\n`;
          if (validDocs.length === 1) {
            systemContext += `You are analyzing a document titled "${validDocs[0].title}".\n\nDocument Content (in Markdown):\n${validDocs[0].content.slice(0, 100000)}`;
          } else {
            systemContext += `You are analyzing ${validDocs.length} documents.\n\n`;
            const maxPerDoc = Math.floor(100000 / validDocs.length);
            for (const doc of validDocs) {
              systemContext += `--- Document: "${doc.title}" ---\n${doc.content.slice(0, maxPerDoc)}\n\n`;
            }
          }
        }
      } else {
        systemContext += `\n\n**REMINDER: Answer ONLY from the document content below. If information is not present, say so explicitly.**\n\n`;
        if (validDocs.length === 1) {
          systemContext += `You are analyzing a document titled "${validDocs[0].title}".\n\nDocument Content (in Markdown):\n${validDocs[0].content.slice(0, 100000)}`;
        } else if (validDocs.length > 1) {
          systemContext += `You are analyzing ${validDocs.length} documents. When answering, reference which document the information comes from.\n\n`;
          const maxPerDoc = Math.floor(100000 / validDocs.length);
          for (const doc of validDocs) {
            systemContext += `--- Document: "${doc.title}" ---\n${doc.content.slice(0, maxPerDoc)}\n\n`;
          }
        }
      }
    } else {
      systemContext += `\n\n**No documents are associated with this conversation.** If the user asks a question, respond: "No documents are currently linked to this conversation. Please upload a document or start a new chat with a document to ask questions about its content."`;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.write(`data: ${JSON.stringify({ userMessageId: userMsg.id })}\n\n`);

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemContext },
          ...conversation.messages.map(m => ({ role: m.role as "user"|"assistant", content: m.content })),
          { role: "user", content }
        ],
        stream: true,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      const savedMsg = await storage.createMessage({
        conversationId,
        role: "assistant",
        content: fullResponse
      });

      let confidenceScore: number | null = null;
      try {
        const confidenceResponse = await openai.chat.completions.create({
          model: "gpt-5.2",
          messages: [
            {
              role: "system",
              content: `You are a confidence evaluator for a document Q&A system. Given a question and an AI response that should be based ONLY on provided document content, rate how well-grounded the response is on a scale of 0-100.

Scoring criteria:
- **Document grounding (most important)**: Does the response clearly derive from document content? Responses that cite specific sections, quote data, or reference document details = higher. Responses with vague or generic statements that could apply to any document = lower.
- **Accuracy of scope**: Does the response stay within the document's boundaries? If the response introduces facts, claims, or context not traceable to the document = significantly lower (cap at 40).
- **Appropriate refusal**: If the document lacks information and the response honestly says so = score 70-85 (this is correct behavior). If the response fills gaps with plausible-sounding but unsourced information = score 20-40.
- **Completeness**: Does the response address the question using available document content? (more complete = higher, but only for document-sourced information)
- **Hedging vs. honesty**: Appropriate hedging ("the document suggests..." or "based on section X...") = higher. Excessive unsupported confidence = lower.

Respond with ONLY a single integer between 0 and 100. Nothing else.`
            },
            {
              role: "user",
              content: `Question: ${content}\n\nAI Response: ${fullResponse.slice(0, 3000)}`
            }
          ],
          max_completion_tokens: 5,
          temperature: 0,
        });
        const scoreText = confidenceResponse.choices[0]?.message?.content?.trim();
        const parsed = parseInt(scoreText || "", 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
          confidenceScore = parsed;
          await storage.updateMessageConfidence(savedMsg.id, confidenceScore);
        }
      } catch (e) {
        console.error("Confidence scoring error:", e);
      }

      res.write(`data: ${JSON.stringify({ done: true, messageId: savedMsg.id, confidenceScore })}\n\n`);
      res.end();

    } catch (error) {
      console.error("OpenAI error:", error);
      res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
      res.end();
    }
  });

  return httpServer;
}
