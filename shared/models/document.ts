import { pgTable, serial, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  originalFilename: text("original_filename").notNull(),
  content: text("content").notNull(),
  fileType: text("file_type").notNull(),
  userId: varchar("user_id"),
  doi: text("doi"),
  docTitle: text("doc_title"),
  authors: text("authors"),
  journal: text("journal"),
  publishYear: integer("publish_year"),
  abstract: text("abstract"),
  keywords: text("keywords"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
