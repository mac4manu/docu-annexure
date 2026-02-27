import { pgTable, serial, integer, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  userName: varchar("user_name").notNull(),
  userImage: varchar("user_image"),
  role: varchar("role"),
  content: text("content").notNull(),
  rating: integer("rating").notNull(),
  approved: boolean("approved").default(false).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  id: true,
  approved: true,
  createdAt: true,
});

export const submitTestimonialSchema = z.object({
  content: z.string().min(10, "Testimonial must be at least 10 characters").max(500, "Testimonial must be under 500 characters"),
  rating: z.number().min(1).max(5),
  role: z.string().max(100).optional(),
});

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
