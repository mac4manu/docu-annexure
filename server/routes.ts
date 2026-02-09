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
    await execFileAsync("pdftoppm", ["-png", "-r", "150", resolvedPath, outputPrefix], {
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
        content: `You are a document content extraction expert. Convert the provided document page images into well-structured Markdown.

Rules:
- Extract ALL text content faithfully
- Reproduce tables using proper Markdown table syntax (| col1 | col2 |)
- For mathematical formulas, use LaTeX notation wrapped in $ for inline and $$ for block
- For images/charts/diagrams, describe them in detail within an image block like: ![Description of image/chart](image)
- Preserve headings, bullet points, numbered lists
- Keep the document structure and hierarchy intact
- Separate pages with a horizontal rule (---)
- Do NOT add any commentary - just output the extracted markdown`,
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.documents.list.path, async (req, res) => {
    const docs = await storage.getDocuments();
    res.json(docs);
  });

  app.get(api.documents.get.path, async (req, res) => {
    const doc = await storage.getDocument(Number(req.params.id));
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json(doc);
  });

  app.post(api.documents.upload.path, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

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
          console.log("Using basic text extraction");
          if (rawText && rawText.trim().length > 0) {
            const response = await openai.chat.completions.create({
              model: "gpt-5.2",
              max_completion_tokens: 8192,
              messages: [
                {
                  role: "system",
                  content: `You are a document formatting expert. Convert the following extracted document text into well-structured Markdown.

Rules:
- Structure the content with proper headings, lists, and paragraphs
- If you detect table-like data, format it as a proper Markdown table
- If you detect mathematical expressions, format them with LaTeX ($ inline, $$ block)
- Preserve the document's logical structure
- Do NOT add commentary - just output the formatted markdown`,
                },
                {
                  role: "user",
                  content: `Format this extracted document content into clean Markdown:\n\n${rawText.slice(0, 100000)}`,
                },
              ],
            });
            content = response.choices[0]?.message?.content || rawText;
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
          const response = await openai.chat.completions.create({
            model: "gpt-5.2",
            max_completion_tokens: 8192,
            messages: [
              {
                role: "system",
                content: `You are a document formatting expert. Convert the following extracted document text into well-structured Markdown.

Rules:
- Structure the content with proper headings, lists, and paragraphs
- If you detect table-like data, format it as a proper Markdown table
- If you detect mathematical expressions, format them with LaTeX ($ inline, $$ block)
- Preserve the document's logical structure
- Do NOT add commentary - just output the formatted markdown`,
              },
              {
                role: "user",
                content: `Format this extracted document content into clean Markdown:\n\n${rawText.slice(0, 100000)}`,
              },
            ],
          });
          content = response.choices[0]?.message?.content || rawText;
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
      });

      res.status(201).json(doc);
    } catch (err) {
      console.error("Upload error:", err);
      cleanupFiles(cleanupList);
      res.status(500).json({ message: "Failed to process file" });
    }
  });

  app.delete(api.documents.delete.path, async (req, res) => {
    await storage.deleteDocument(Number(req.params.id));
    res.status(204).send();
  });

  // Chat
  app.get(api.conversations.list.path, async (req, res) => {
    const convs = await storage.getAllConversations();
    res.json(convs);
  });

  app.get(api.conversations.get.path, async (req, res) => {
    const conv = await storage.getConversation(Number(req.params.id));
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    res.json({ conversation: conv, messages: conv.messages });
  });

  app.post(api.conversations.create.path, async (req, res) => {
    const input = api.conversations.create.input.parse(req.body);
    const conv = await storage.createConversation({
      title: input.title || "New Conversation",
      documentId: input.documentId
    });
    res.status(201).json(conv);
  });

  app.post(api.messages.create.path, async (req, res) => {
    const conversationId = Number(req.params.id);
    const { content } = req.body;

    const userMsg = await storage.createMessage({
      conversationId,
      role: "user",
      content
    });

    const conversation = await storage.getConversation(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    let systemContext = "You are a helpful AI assistant that answers questions about documents. Use Markdown formatting in your responses including tables and LaTeX formulas when relevant.";
    if (conversation.documentId) {
      const doc = await storage.getDocument(conversation.documentId);
      if (doc) {
        systemContext += `\n\nYou are analyzing a document titled "${doc.title}".\n\nDocument Content (in Markdown):\n${doc.content.slice(0, 100000)}`;
      }
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

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

      await storage.createMessage({
        conversationId,
        role: "assistant",
        content: fullResponse
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

    } catch (error) {
      console.error("OpenAI error:", error);
      res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
      res.end();
    }
  });

  return httpServer;
}
