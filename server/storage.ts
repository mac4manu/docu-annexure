import { db } from "./db";
import {
  documents, conversations, messages, messageRatings,
  type Document, type InsertDocument,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type MessageRating, type InsertMessageRating
} from "@shared/schema";
import { users, allowedEmails, type AllowedEmail } from "@shared/models/auth";
import { eq, desc, sql, count, and, inArray } from "drizzle-orm";

export interface MetricsData {
  totalDocuments: number;
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  avgMessagesPerChat: number;
  documentsByType: { type: string; count: number }[];
  recentDocuments: { id: number; title: string; fileType: string; createdAt: Date }[];
  recentConversations: { id: number; title: string; createdAt: Date; messageCount: number }[];
  mostQueriedDocs: { id: number; title: string; queryCount: number }[];
  activityByDay: { date: string; documents: number; conversations: number; messages: number }[];
  uploadsThisWeek: number;
  uploadsLastWeek: number;
}

export interface AdminUserMetrics {
  userId: string;
  email: string | null;
  name: string;
  documentCount: number;
  conversationCount: number;
  messageCount: number;
  questionsAsked: number;
  aiResponses: number;
  lastActive: string | null;
  status: "active" | "logged_in_only";
}

export interface AdminMetricsData {
  totalUsers: number;
  totalDocuments: number;
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  avgMessagesPerChat: number;
  documentsByType: { type: string; count: number }[];
  activityByDay: { date: string; documents: number; conversations: number; messages: number }[];
  mostQueriedDocs: { id: number; title: string; queryCount: number }[];
  uploadsThisWeek: number;
  uploadsLastWeek: number;
  userBreakdown: AdminUserMetrics[];
}

export interface IStorage {
  getDocuments(userId: string): Promise<Document[]>;
  getDocument(id: number, userId: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: number, userId: string): Promise<void>;
  updateDocumentMetadata(id: number, metadata: { doi: string | null; docTitle: string | null; authors: string | null; journal: string | null; publishYear: number | null; abstract: string | null; keywords: string | null }): Promise<void>;

  getAllConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number, userId: string): Promise<(Conversation & { messages: Message[] }) | undefined>;
  createConversation(conv: InsertConversation): Promise<Conversation>;
  deleteConversation(id: number, userId: string): Promise<void>;
  createMessage(msg: InsertMessage): Promise<Message>;
  updateMessageConfidence(messageId: number, confidenceScore: number): Promise<void>;
  getMessages(conversationId: number): Promise<Message[]>;

  verifyMessageOwnership(messageId: number, userId: string): Promise<boolean>;
  rateMessage(rating: InsertMessageRating): Promise<MessageRating>;
  getMessageRating(messageId: number, userId: string): Promise<MessageRating | undefined>;
  getRatingMetrics(userId: string): Promise<{ thumbsUp: number; thumbsDown: number; total: number }>;
  getAdminRatingMetrics(): Promise<{ thumbsUp: number; thumbsDown: number; total: number }>;
  getConfidenceMetrics(userId: string): Promise<{ avgConfidence: number; totalScored: number }>;
  getAdminConfidenceMetrics(): Promise<{ avgConfidence: number; totalScored: number }>;

  getMetrics(userId: string): Promise<MetricsData>;
  getAdminMetrics(): Promise<AdminMetricsData>;

  getAllowedEmails(): Promise<AllowedEmail[]>;
  isEmailAllowed(email: string): Promise<boolean>;
  addAllowedEmail(email: string): Promise<AllowedEmail>;
  removeAllowedEmail(id: number): Promise<void>;
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

  async updateDocumentMetadata(id: number, metadata: { doi: string | null; docTitle: string | null; authors: string | null; journal: string | null; publishYear: number | null; abstract: string | null; keywords: string | null }): Promise<void> {
    await db.update(documents).set({
      doi: metadata.doi,
      docTitle: metadata.docTitle,
      authors: metadata.authors,
      journal: metadata.journal,
      publishYear: metadata.publishYear,
      abstract: metadata.abstract,
      keywords: metadata.keywords,
    }).where(eq(documents.id, id));
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

  async updateMessageConfidence(messageId: number, confidenceScore: number): Promise<void> {
    await db.update(messages).set({ confidenceScore }).where(eq(messages.id, messageId));
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async verifyMessageOwnership(messageId: number, userId: string): Promise<boolean> {
    const [msg] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!msg) return false;
    const [conv] = await db.select().from(conversations)
      .where(and(eq(conversations.id, msg.conversationId), eq(conversations.userId, userId)));
    return !!conv;
  }

  async rateMessage(rating: InsertMessageRating): Promise<MessageRating> {
    const existing = await db.select().from(messageRatings)
      .where(and(eq(messageRatings.messageId, rating.messageId), eq(messageRatings.userId, rating.userId!)));
    if (existing.length > 0) {
      const [updated] = await db.update(messageRatings)
        .set({ rating: rating.rating })
        .where(eq(messageRatings.id, existing[0].id))
        .returning();
      return updated;
    }
    const [newRating] = await db.insert(messageRatings).values(rating).returning();
    return newRating;
  }

  async getMessageRating(messageId: number, userId: string): Promise<MessageRating | undefined> {
    const [rating] = await db.select().from(messageRatings)
      .where(and(eq(messageRatings.messageId, messageId), eq(messageRatings.userId, userId)));
    return rating;
  }

  async getRatingMetrics(userId: string): Promise<{ thumbsUp: number; thumbsDown: number; total: number }> {
    const [up] = await db.select({ count: count() }).from(messageRatings)
      .where(and(eq(messageRatings.userId, userId), eq(messageRatings.rating, "thumbs_up")));
    const [down] = await db.select({ count: count() }).from(messageRatings)
      .where(and(eq(messageRatings.userId, userId), eq(messageRatings.rating, "thumbs_down")));
    return { thumbsUp: up.count, thumbsDown: down.count, total: up.count + down.count };
  }

  async getAdminRatingMetrics(): Promise<{ thumbsUp: number; thumbsDown: number; total: number }> {
    const [up] = await db.select({ count: count() }).from(messageRatings)
      .where(eq(messageRatings.rating, "thumbs_up"));
    const [down] = await db.select({ count: count() }).from(messageRatings)
      .where(eq(messageRatings.rating, "thumbs_down"));
    return { thumbsUp: up.count, thumbsDown: down.count, total: up.count + down.count };
  }

  async getConfidenceMetrics(userId: string): Promise<{ avgConfidence: number; totalScored: number }> {
    const userConvIds = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.userId, userId));
    const convIds = userConvIds.map(c => c.id);
    if (convIds.length === 0) return { avgConfidence: 0, totalScored: 0 };

    const result = await db.execute(sql`
      SELECT AVG(confidence_score) as avg_confidence, COUNT(confidence_score) as total_scored
      FROM messages
      WHERE conversation_id IN (${sql.join(convIds.map(id => sql`${id}`), sql`, `)})
        AND role = 'assistant'
        AND confidence_score IS NOT NULL
    `);
    const row = result.rows[0] as { avg_confidence: string | null; total_scored: string };
    return {
      avgConfidence: row.avg_confidence ? Math.round(Number(row.avg_confidence)) : 0,
      totalScored: Number(row.total_scored),
    };
  }

  async getAdminConfidenceMetrics(): Promise<{ avgConfidence: number; totalScored: number }> {
    const result = await db.execute(sql`
      SELECT AVG(confidence_score) as avg_confidence, COUNT(confidence_score) as total_scored
      FROM messages
      WHERE role = 'assistant' AND confidence_score IS NOT NULL
    `);
    const row = result.rows[0] as { avg_confidence: string | null; total_scored: string };
    return {
      avgConfidence: row.avg_confidence ? Math.round(Number(row.avg_confidence)) : 0,
      totalScored: Number(row.total_scored),
    };
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

    const totalConversations = Number(convCount.count);
    const avgMessagesPerChat = totalConversations > 0 ? Math.round((totalMsgs / totalConversations) * 10) / 10 : 0;

    const mostQueriedRows = await db.execute(sql`
      SELECT d.id, d.title, COUNT(c.id) as query_count
      FROM documents d
      INNER JOIN conversations c ON (c.document_id = d.id OR d.id = ANY(COALESCE(c.document_ids, ARRAY[]::int[])))
      WHERE d.user_id = ${userId} AND (c.document_id IS NOT NULL OR c.document_ids IS NOT NULL)
      GROUP BY d.id, d.title
      ORDER BY query_count DESC
      LIMIT 5
    `);
    const mostQueriedDocs = (mostQueriedRows.rows as Array<{ id: number; title: string; query_count: string }>).map(r => ({
      id: r.id,
      title: r.title,
      queryCount: Number(r.query_count),
    }));

    const uploadTrendRows = await db.execute(sql`
      SELECT
        COALESCE((SELECT COUNT(*) FROM documents WHERE user_id = ${userId} AND created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as this_week,
        COALESCE((SELECT COUNT(*) FROM documents WHERE user_id = ${userId} AND created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'), 0) as last_week
    `);
    const trend = uploadTrendRows.rows[0] as { this_week: string; last_week: string };

    return {
      totalDocuments: Number(docCount.count),
      totalConversations,
      totalMessages: totalMsgs,
      userMessages: userMsgs,
      aiMessages: aiMsgs,
      avgMessagesPerChat,
      documentsByType: docsByType.map(r => ({ type: r.type, count: Number(r.count) })),
      recentDocuments: recentDocs,
      recentConversations: recentConvsWithCounts,
      mostQueriedDocs,
      activityByDay,
      uploadsThisWeek: Number(trend.this_week),
      uploadsLastWeek: Number(trend.last_week),
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

    const totalConvCount = Number(convCount.count);
    const totalMsgs = Number(totalMsgCount.count);
    const avgMessagesPerChat = totalConvCount > 0 ? Math.round((totalMsgs / totalConvCount) * 10) / 10 : 0;

    const mostQueriedRows = await db.execute(sql`
      SELECT d.id, d.title, COUNT(c.id) as query_count
      FROM documents d
      INNER JOIN conversations c ON (c.document_id = d.id OR d.id = ANY(COALESCE(c.document_ids, ARRAY[]::int[])))
      WHERE (c.document_id IS NOT NULL OR c.document_ids IS NOT NULL)
      GROUP BY d.id, d.title
      ORDER BY query_count DESC
      LIMIT 5
    `);
    const mostQueriedDocs = (mostQueriedRows.rows as Array<{ id: number; title: string; query_count: string }>).map(r => ({
      id: r.id,
      title: r.title,
      queryCount: Number(r.query_count),
    }));

    const uploadTrendRows = await db.execute(sql`
      SELECT
        COALESCE((SELECT COUNT(*) FROM documents WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as this_week,
        COALESCE((SELECT COUNT(*) FROM documents WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'), 0) as last_week
    `);
    const trend = uploadTrendRows.rows[0] as { this_week: string; last_week: string };

    const allUsers = await db.select().from(users);
    const userBreakdown: AdminUserMetrics[] = await Promise.all(
      allUsers.map(async (user) => {
        const [dc] = await db.select({ count: count() }).from(documents).where(eq(documents.userId, user.id));
        const [cc] = await db.select({ count: count() }).from(conversations).where(eq(conversations.userId, user.id));
        const userConvIds = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.userId, user.id));
        const convIds = userConvIds.map(c => c.id);
        let mc = 0;
        let qa = 0;
        let ar = 0;
        if (convIds.length > 0) {
          const [msgCount] = await db.select({ count: count() }).from(messages).where(inArray(messages.conversationId, convIds));
          mc = msgCount.count;
          const [userMsgs] = await db.select({ count: count() }).from(messages).where(and(inArray(messages.conversationId, convIds), eq(messages.role, "user")));
          qa = userMsgs.count;
          const [aiMsgs] = await db.select({ count: count() }).from(messages).where(and(inArray(messages.conversationId, convIds), eq(messages.role, "assistant")));
          ar = aiMsgs.count;
        }
        const lastDoc = await db.select({ createdAt: documents.createdAt }).from(documents).where(eq(documents.userId, user.id)).orderBy(desc(documents.createdAt)).limit(1);
        const lastConv = await db.select({ createdAt: conversations.createdAt }).from(conversations).where(eq(conversations.userId, user.id)).orderBy(desc(conversations.createdAt)).limit(1);
        const dates = [lastDoc[0]?.createdAt, lastConv[0]?.createdAt].filter(Boolean) as Date[];
        const lastActive = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))).toISOString() : null;

        const docNum = Number(dc.count);
        const convNum = Number(cc.count);
        const hasActivity = docNum > 0 || convNum > 0;
        return {
          userId: user.id,
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Unknown",
          documentCount: docNum,
          conversationCount: convNum,
          messageCount: mc,
          questionsAsked: qa,
          aiResponses: ar,
          lastActive,
          status: hasActivity ? "active" as const : "logged_in_only" as const,
        };
      })
    );

    userBreakdown.sort((a, b) => (b.documentCount + b.messageCount) - (a.documentCount + a.messageCount));

    return {
      totalUsers: allUsers.length,
      totalDocuments: Number(docCount.count),
      totalConversations: totalConvCount,
      totalMessages: totalMsgs,
      userMessages: Number(userMsgCount.count),
      aiMessages: Number(aiMsgCount.count),
      avgMessagesPerChat,
      documentsByType: docsByType.map(r => ({ type: r.type, count: Number(r.count) })),
      activityByDay,
      mostQueriedDocs,
      uploadsThisWeek: Number(trend.this_week),
      uploadsLastWeek: Number(trend.last_week),
      userBreakdown,
    };
  }

  async getAllowedEmails(): Promise<AllowedEmail[]> {
    return db.select().from(allowedEmails).orderBy(desc(allowedEmails.addedAt));
  }

  async isEmailAllowed(email: string): Promise<boolean> {
    const [row] = await db.select().from(allowedEmails).where(eq(allowedEmails.email, email.toLowerCase()));
    return !!row;
  }

  async addAllowedEmail(email: string): Promise<AllowedEmail> {
    const [row] = await db.insert(allowedEmails).values({ email: email.toLowerCase() }).returning();
    return row;
  }

  async removeAllowedEmail(id: number): Promise<void> {
    await db.delete(allowedEmails).where(eq(allowedEmails.id, id));
  }
}

export const storage = new DatabaseStorage();
