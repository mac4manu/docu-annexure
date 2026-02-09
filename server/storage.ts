import { db } from "./db";
import {
  documents, conversations, messages,
  type Document, type InsertDocument,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage
} from "@shared/schema";
import { eq, desc, sql, count } from "drizzle-orm";

export interface MetricsData {
  totalDocuments: number;
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  documentsByType: { type: string; count: number }[];
  recentDocuments: { id: number; title: string; fileType: string; createdAt: Date }[];
  recentConversations: { id: number; title: string; createdAt: Date; messageCount: number }[];
  activityByDay: { date: string; documents: number; conversations: number; messages: number }[];
}

export interface IStorage {
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  getAllConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<(Conversation & { messages: Message[] }) | undefined>;
  createConversation(conv: InsertConversation): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  createMessage(msg: InsertMessage): Promise<Message>;
  getMessages(conversationId: number): Promise<Message[]>;

  getMetrics(): Promise<MetricsData>;
}

export class DatabaseStorage implements IStorage {
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

  async getMetrics(): Promise<MetricsData> {
    const [docCount] = await db.select({ count: count() }).from(documents);
    const [convCount] = await db.select({ count: count() }).from(conversations);
    const [msgCount] = await db.select({ count: count() }).from(messages);
    const [userMsgCount] = await db.select({ count: count() }).from(messages).where(eq(messages.role, "user"));
    const [aiMsgCount] = await db.select({ count: count() }).from(messages).where(eq(messages.role, "assistant"));

    const docsByType = await db
      .select({ type: documents.fileType, count: count() })
      .from(documents)
      .groupBy(documents.fileType);

    const recentDocs = await db
      .select({
        id: documents.id,
        title: documents.title,
        fileType: documents.fileType,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .orderBy(desc(documents.createdAt))
      .limit(5);

    const recentConvs = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .orderBy(desc(conversations.createdAt))
      .limit(5);

    const recentConvsWithCounts = await Promise.all(
      recentConvs.map(async (conv) => {
        const [mc] = await db.select({ count: count() }).from(messages).where(eq(messages.conversationId, conv.id));
        return { ...conv, messageCount: mc.count };
      })
    );

    const activityRows = await db.execute(sql`
      SELECT 
        d::date as date,
        COALESCE((SELECT COUNT(*) FROM documents WHERE created_at::date = d::date), 0) as documents,
        COALESCE((SELECT COUNT(*) FROM conversations WHERE created_at::date = d::date), 0) as conversations,
        COALESCE((SELECT COUNT(*) FROM messages WHERE created_at::date = d::date), 0) as messages
      FROM generate_series(
        CURRENT_DATE - INTERVAL '6 days',
        CURRENT_DATE,
        '1 day'::interval
      ) AS d
      ORDER BY d::date ASC
    `);

    const activityByDay = (activityRows.rows as Array<{ date: string; documents: string; conversations: string; messages: string }>).map(row => ({
      date: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      documents: Number(row.documents),
      conversations: Number(row.conversations),
      messages: Number(row.messages),
    }));

    return {
      totalDocuments: Number(docCount.count),
      totalConversations: Number(convCount.count),
      totalMessages: Number(msgCount.count),
      userMessages: Number(userMsgCount.count),
      aiMessages: Number(aiMsgCount.count),
      documentsByType: docsByType.map(r => ({ type: r.type, count: Number(r.count) })),
      recentDocuments: recentDocs,
      recentConversations: recentConvsWithCounts,
      activityByDay,
    };
  }
}

export const storage = new DatabaseStorage();
