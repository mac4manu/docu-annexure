import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const officeParser = require("officeparser");

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { isAuthenticated } from "./replit_integrations/auth";

const execFileAsync = promisify(execFile);

const ALLOWED_MIMETYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Please upload PDF, Word, or PowerPoint files."));
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
  return "other";
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

async function extractBatch(imagePaths: string[], startIndex: number): Promise<string> {
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
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content: `You are a document content extraction expert specializing in scientific, medical, and educational documents. Convert the provided document page images into well-structured Markdown.

Rules:
- Extract ALL text content faithfully and accurately
- Reproduce tables using proper Markdown table syntax (| col1 | col2 |), preserving all data precisely — this is critical for scientific data tables, clinical results, and academic datasets
- For mathematical formulas and equations, use LaTeX notation wrapped in $ for inline and $$ for block display
- For chemical formulas, use proper notation (e.g., H₂O, CO₂) or LaTeX where complex
- For images, charts, graphs, and diagrams, describe them in detail within an image block like: ![Description of image/chart](image) — include axis labels, trends, and key data points for scientific figures
- Preserve headings, bullet points, numbered lists, and references/citations
- Keep the document structure and hierarchy intact
- Preserve footnotes, endnotes, and bibliographic references
- Separate pages with a horizontal rule (---)
- Do NOT add any commentary — just output the extracted markdown`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract the content from these document pages (pages ${pageNumbers}) into Markdown format.`,
          },
          ...imageContents,
        ],
      },
    ],
  });

  return response.choices[0]?.message?.content || "";
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

async function formatTextToMarkdown(rawText: string): Promise<string> {
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
  
  app.get(api.documents.list.path, isAuthenticated, async (req, res) => {
    const docs = await storage.getDocuments(getUserId(req));
    res.json(docs);
  });

  app.get(api.documents.get.path, isAuthenticated, async (req, res) => {
    const doc = await storage.getDocument(Number(req.params.id), getUserId(req));
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json(doc);
  });

  app.post(api.documents.upload.path, isAuthenticated, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const userId = getUserId(req);
    const existingDocs = await storage.getDocuments(userId);
    if (existingDocs.length >= 10) {
      cleanupFiles([req.file.path]);
      return res.status(400).json({ message: "Upload limit reached. This prototype allows a maximum of 10 documents." });
    }

    const filePath = req.file.path;
    const fileType = req.file.mimetype;
    const originalFilename = req.file.originalname;
    const cleanupList: string[] = [filePath];

    try {
      let content = "";
      console.log(`Processing file: ${originalFilename} (${fileType})`);

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
        const isComplex = hasTablePatterns || hasMathSymbols || hasLowTextDensity;

        console.log(`PDF analysis: ${pageCountMatch} pages, ${Math.round(textPerPage)} chars/page, complex=${isComplex} (tables=${hasTablePatterns}, math=${hasMathSymbols}, lowDensity=${hasLowTextDensity})`);

        if (isComplex) {
          console.log("Using advanced vision-based extraction");
          const imagePaths = await convertPdfToImages(filePath);
          const imageDir = path.dirname(imagePaths[0] || "");
          if (imageDir) cleanupList.push(imageDir);

          if (imagePaths.length > 0) {
            content = await extractMarkdownFromImages(imagePaths);
          } else {
            content = rawText || "No pages found in PDF.";
          }
        } else {
          console.log("Using basic text extraction with lightweight formatting");
          if (rawText && rawText.trim().length > 0) {
            content = await formatTextToMarkdown(rawText);
          } else {
            content = "No text content could be extracted from this file.";
          }
        }
      } else {
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

      const doc = await storage.createDocument({
        title: originalFilename,
        originalFilename,
        content: content || "No content extracted.",
        fileType: getFileType(fileType),
        userId: getUserId(req),
      });

      res.status(201).json(doc);
    } catch (err) {
      console.error("Upload error:", err);
      cleanupFiles(cleanupList);
      res.status(500).json({ message: "Failed to process file" });
    }
  });

  app.delete(api.documents.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteDocument(Number(req.params.id), getUserId(req));
    res.status(204).send();
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

  app.post("/api/messages/:id/rate", isAuthenticated, async (req, res) => {
    try {
      const { rating } = req.body;
      if (!["thumbs_up", "thumbs_down"].includes(rating)) {
        return res.status(400).json({ message: "Rating must be thumbs_up or thumbs_down" });
      }
      const result = await storage.rateMessage({
        messageId: Number(req.params.id),
        rating,
        userId: getUserId(req),
      });
      res.json(result);
    } catch (error) {
      console.error("Rating error:", error);
      res.status(500).json({ message: "Failed to rate message" });
    }
  });

  app.get("/api/messages/:id/rating", isAuthenticated, async (req, res) => {
    const rating = await storage.getMessageRating(Number(req.params.id), getUserId(req));
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

    const userMsg = await storage.createMessage({
      conversationId,
      role: "user",
      content
    });

    const conversation = await storage.getConversation(conversationId, userId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    let systemContext = `You are DocuAnnexure AI — an expert document analysis assistant specializing in three key domains:

1. **Scientific & Research**: You interpret research papers, lab reports, technical specifications, and scientific publications. You understand statistical methods, experimental design, citations, and can explain complex findings clearly. When relevant, use LaTeX notation for mathematical formulas and equations (e.g., $E = mc^2$ or $$\\int_0^\\infty f(x)\\,dx$$).

2. **Health & Medical**: You analyze clinical reports, medical literature, patient documentation, pharmaceutical data, and health policy documents. You provide accurate, evidence-based interpretations while noting that your analysis is informational and not a substitute for professional medical advice.

3. **Education & Academic**: You support students, teachers, and researchers by breaking down textbooks, curricula, academic papers, and educational materials. You explain concepts at an appropriate level, highlight key takeaways, and help with comprehension and study.

Guidelines:
- Always answer based on the document content provided. Do not fabricate information not present in the documents.
- Use proper Markdown formatting: headings, bullet points, numbered lists, bold/italic text.
- Reproduce tables using Markdown table syntax when summarizing tabular data.
- Use LaTeX math notation ($ for inline, $$ for block) for formulas and equations.
- When comparing or cross-referencing multiple documents, clearly cite which document each piece of information comes from.
- If the document content is insufficient to answer a question, say so honestly rather than guessing.
- Provide structured, well-organized responses with clear sections when answering complex questions.

**Tortured Phrases Detection**:
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

      if (validDocs.length === 1) {
        systemContext += `\n\nYou are analyzing a document titled "${validDocs[0].title}".\n\nDocument Content (in Markdown):\n${validDocs[0].content.slice(0, 100000)}`;
      } else if (validDocs.length > 1) {
        systemContext += `\n\nYou are analyzing ${validDocs.length} documents. When answering, reference which document the information comes from.\n\n`;
        const maxPerDoc = Math.floor(100000 / validDocs.length);
        for (const doc of validDocs) {
          systemContext += `--- Document: "${doc.title}" ---\n${doc.content.slice(0, maxPerDoc)}\n\n`;
        }
      }
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

      res.write(`data: ${JSON.stringify({ done: true, messageId: savedMsg.id })}\n\n`);
      res.end();

    } catch (error) {
      console.error("OpenAI error:", error);
      res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
      res.end();
    }
  });

  return httpServer;
}
