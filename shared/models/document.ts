import { pgTable, serial, text, timestamp, varchar, integer, index } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(384)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .replace(/[\[\]]/g, "")
      .split(",")
      .map(Number);
  },
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  originalFilename: text("original_filename").notNull(),
  content: text("content").notNull(),
  fileType: text("file_type").notNull(),
  complexity: text("complexity").default("simple"),
  pageCount: integer("page_count"),
  userId: varchar("user_id"),
  doi: text("doi"),
  docTitle: text("doc_title"),
  authors: text("authors"),
  journal: text("journal"),
  publishYear: integer("publish_year"),
  abstract: text("abstract"),
  keywords: text("keywords"),
  documentDomain: text("document_domain"),
  propertyCity: text("property_city"),
  propertyState: text("property_state"),
  propertyZip: text("property_zip"),
  propertyType: text("property_type"),
  realEstateDocType: text("real_estate_doc_type"),
  listingPrice: text("listing_price"),
  squareFootage: text("square_footage"),
  yearBuilt: integer("year_built"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const documentChunks = pgTable("document_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  tokenCount: integer("token_count"),
  embedding: vector("embedding"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("idx_chunks_document_id").on(table.documentId),
  index("idx_chunks_embedding").using("hnsw", sql`${table.embedding} vector_cosine_ops`),
]);

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentChunkSchema = createInsertSchema(documentChunks).omit({
  id: true,
  embedding: true,
  createdAt: true,
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;
