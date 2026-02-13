import { db } from "./db";
import {
  documents, conversations, messages,
  type Document, type InsertDocument,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage
} from "@shared/schema";
import { users } from "@shared/models/auth";
import { eq, desc, sql, count, and, inArray } from "drizzle-orm";

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

export interface AdminUserMetrics {
  userId: string;
  email: string | null;
  name: string;
  documentCount: number;
  conversationCount: number;
  messageCount: number;
  lastActive: string | null;
}

export interface AdminMetricsData {
  totalUsers: number;
  totalDocuments: number;
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  documentsByType: { type: string; count: number }[];
  activityByDay: { date: string; documents: number; conversations: number; messages: number }[];
  userBreakdown: AdminUserMetrics[];
}

export interface IStorage {
  getDocuments(userId: string): Promise<Document[]>;
  getDocument(id: number, userId: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: number, userId: string): Promise<void>;

  getAllConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number, userId: string): Promise<(Conversation & { messages: Message[] }) | undefined>;
  createConversation(conv: InsertConversation): Promise<Conversation>;
  deleteConversation(id: number, userId: string): Promise<void>;
  createMessage(msg: InsertMessage): Promise<Message>;
  getMessages(conversationId: number): Promise<Message[]>;

  getMetrics(userId: string): Promise<MetricsData>;
  getAdminMetrics(): Promise<AdminMetricsData>;
}

export class DatabaseStorage implements IStorage {
  async getDocuments(userId: string): Promise<Document[]> {
    return db.select().from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number, userId: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
    return doc;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async deleteDocument(id: number, userId: string): Promise<void> {
    await db.delete(documents).where(and(eq(documents.id, id), eq(documents.userId, userId)));
  }

  async getAllConversations(userId: string): Promise<Conversation[]> {
    return db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number, userId: string): Promise<(Conversation & { messages: Message[] }) | undefined> {
    const [conv] = await db.select().from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
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

  async deleteConversation(id: number, userId: string): Promise<void> {
    await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
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

  async getMetrics(userId: string): Promise<MetricsData> {
    const userFilter = eq(documents.userId, userId);
    const convFilter = eq(conversations.userId, userId);

    const [docCount] = await db.select({ count: count() }).from(documents).where(userFilter);
    const [convCount] = await db.select({ count: count() }).from(conversations).where(convFilter);

    const userConvIds = await db.select({ id: conversations.id }).from(conversations).where(convFilter);
    const convIdList = userConvIds.map(c => c.id);

    let totalMsgs = 0;
    let userMsgs = 0;
    let aiMsgs = 0;
    if (convIdList.length > 0) {
      const convIdFilter = inArray(messages.conversationId, convIdList);
      const [mc] = await db.select({ count: count() }).from(messages).where(convIdFilter);
      totalMsgs = mc.count;
      const [umc] = await db.select({ count: count() }).from(messages).where(and(convIdFilter, eq(messages.role, "user")));
      userMsgs = umc.count;
      const [amc] = await db.select({ count: count() }).from(messages).where(and(convIdFilter, eq(messages.role, "assistant")));
      aiMsgs = amc.count;
    }

    const docsByType = await db
      .select({ type: documents.fileType, count: count() })
      .from(documents)
      .where(userFilter)
      .groupBy(documents.fileType);

    const recentDocs = await db
      .select({
        id: documents.id,
        title: documents.title,
        fileType: documents.fileType,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(userFilter)
      .orderBy(desc(documents.createdAt))
      .limit(5);

    const recentConvs = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(convFilter)
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
        COALESCE((SELECT COUNT(*) FROM documents WHERE created_at::date = d::date AND user_id = ${userId}), 0) as documents,
        COALESCE((SELECT COUNT(*) FROM conversations WHERE created_at::date = d::date AND user_id = ${userId}), 0) as conversations,
        COALESCE((SELECT COUNT(*) FROM messages WHERE created_at::date = d::date AND conversation_id IN (SELECT id FROM conversations WHERE user_id = ${userId})), 0) as messages
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
      totalMessages: totalMsgs,
      userMessages: userMsgs,
      aiMessages: aiMsgs,
      documentsByType: docsByType.map(r => ({ type: r.type, count: Number(r.count) })),
      recentDocuments: recentDocs,
      recentConversations: recentConvsWithCounts,
      activityByDay,
    };
  }
  async getAdminMetrics(): Promise<AdminMetricsData> {
    const [docCount] = await db.select({ count: count() }).from(documents);
    const [convCount] = await db.select({ count: count() }).from(conversations);
    const [totalMsgCount] = await db.select({ count: count() }).from(messages);
    const [userMsgCount] = await db.select({ count: count() }).from(messages).where(eq(messages.role, "user"));
    const [aiMsgCount] = await db.select({ count: count() }).from(messages).where(eq(messages.role, "assistant"));

    const docsByType = await db
      .select({ type: documents.fileType, count: count() })
      .from(documents)
      .groupBy(documents.fileType);

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

    const allUsers = await db.select().from(users);
    const userBreakdown: AdminUserMetrics[] = await Promise.all(
      allUsers.map(async (user) => {
        const [dc] = await db.select({ count: count() }).from(documents).where(eq(documents.userId, user.id));
        const [cc] = await db.select({ count: count() }).from(conversations).where(eq(conversations.userId, user.id));
        const userConvIds = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.userId, user.id));
        const convIds = userConvIds.map(c => c.id);
        let mc = 0;
        if (convIds.length > 0) {
          const [msgCount] = await db.select({ count: count() }).from(messages).where(inArray(messages.conversationId, convIds));
          mc = msgCount.count;
        }
        const lastDoc = await db.select({ createdAt: documents.createdAt }).from(documents).where(eq(documents.userId, user.id)).orderBy(desc(documents.createdAt)).limit(1);
        const lastConv = await db.select({ createdAt: conversations.createdAt }).from(conversations).where(eq(conversations.userId, user.id)).orderBy(desc(conversations.createdAt)).limit(1);
        const dates = [lastDoc[0]?.createdAt, lastConv[0]?.createdAt].filter(Boolean) as Date[];
        const lastActive = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString() : null;

        return {
          userId: user.id,
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown",
          documentCount: dc.count,
          conversationCount: cc.count,
          messageCount: mc,
          lastActive,
        };
      })
    );

    userBreakdown.sort((a, b) => (b.documentCount + b.messageCount) - (a.documentCount + a.messageCount));

    return {
      totalUsers: allUsers.length,
      totalDocuments: Number(docCount.count),
      totalConversations: Number(convCount.count),
      totalMessages: Number(totalMsgCount.count),
      userMessages: Number(userMsgCount.count),
      aiMessages: Number(aiMsgCount.count),
      documentsByType: docsByType.map(r => ({ type: r.type, count: Number(r.count) })),
      activityByDay,
      userBreakdown,
    };
  }
}

export const storage = new DatabaseStorage();
