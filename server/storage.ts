import { db } from "./db";
import {
  documents, conversations, messages,
  type Document, type InsertDocument,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Documents
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  // Chat
  getAllConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<(Conversation & { messages: Message[] }) | undefined>;
  createConversation(conv: InsertConversation): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  createMessage(msg: InsertMessage): Promise<Message>;
  getMessages(conversationId: number): Promise<Message[]>;
}

export class DatabaseStorage implements IStorage {
  // Documents
  async getDocuments(): Promise<Document[]> {
    return db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Chat
  async getAllConversations(): Promise<Conversation[]> {
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number): Promise<(Conversation & { messages: Message[] }) | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    if (!conv) return undefined;
    
    const msgs = await db.select().from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
      
    return { ...conv, messages: msgs };
  }

  async createConversation(conv: InsertConversation): Promise<Conversation> {
    const [newConv] = await db.insert(conversations).values(conv).returning();
    return newConv;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [newMsg] = await db.insert(messages).values(msg).returning();
    return newMsg;
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }
}

export const storage = new DatabaseStorage();
