import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
const officeParser = require("officeparser");

import OpenAI from "openai";
import fs from "fs";
import path from "path";

const upload = multer({ dest: "uploads/" });

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Documents
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

    try {
      let content = "";
      const filePath = req.file.path;
      const fileType = req.file.mimetype;
      const originalFilename = req.file.originalname;

      console.log(`Processing file: ${originalFilename} (${fileType})`);

      if (fileType === "application/pdf") {
        const dataBuffer = fs.readFileSync(filePath);
        // Standard pdf-parse usually works like this with require
        const parse = require("pdf-parse");
        const data = await parse(dataBuffer);
        content = data.text;
      } else if (
        fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" || 
        fileType === "application/vnd.ms-powerpoint" ||
        fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileType === "application/msword"
      ) {
        // PPTX or DOCX
        // officeparser.parseOfficeAsync is the method
        content = await officeParser.parseOfficeAsync(filePath);
      } else {
        // Try generic parse or fail
        try {
           content = await officeParser.parseOfficeAsync(filePath);
        } catch (e) {
           // Fallback to reading as text?
           content = fs.readFileSync(filePath, "utf-8");
        }
      }

      // Cleanup
      fs.unlinkSync(filePath);

      const doc = await storage.createDocument({
        title: originalFilename,
        originalFilename,
        content: content || "No text content extracted.",
        fileType: fileType.includes("pdf") ? "pdf" : "ppt",
      });

      res.status(201).json(doc);
    } catch (err) {
      console.error("Upload error:", err);
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

    // 1. Save user message
    const userMsg = await storage.createMessage({
      conversationId,
      role: "user",
      content
    });

    // 2. Get context
    const conversation = await storage.getConversation(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    let systemContext = "You are a helpful AI assistant.";
    if (conversation.documentId) {
      const doc = await storage.getDocument(conversation.documentId);
      if (doc) {
        systemContext += `\n\nYou are analyzing a document titled "${doc.title}".\n\nContent:\n${doc.content.slice(0, 100000)}...`; // Limit context if needed
      }
    }

    // 3. Stream response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-5.1",
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

      // 4. Save assistant message
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
