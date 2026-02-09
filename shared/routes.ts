import { z } from "zod";
import { insertDocumentSchema, documents } from "./schema";
import { insertConversationSchema, insertMessageSchema, conversations, messages } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  documents: {
    list: {
      method: "GET" as const,
      path: "/api/documents" as const,
      responses: {
        200: z.array(z.custom<typeof documents.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/documents/:id" as const,
      responses: {
        200: z.custom<typeof documents.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    upload: {
      method: "POST" as const,
      path: "/api/documents" as const,
      // Input is FormData, not easily typed here, handled in route
      responses: {
        201: z.custom<typeof documents.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/documents/:id" as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  conversations: {
    list: {
      method: "GET" as const,
      path: "/api/conversations" as const,
      responses: {
        200: z.array(z.custom<typeof conversations.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/conversations/:id" as const,
      responses: {
        200: z.object({
          conversation: z.custom<typeof conversations.$inferSelect>(),
          messages: z.array(z.custom<typeof messages.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/conversations" as const,
      input: z.object({
        title: z.string().optional(),
        documentId: z.number().optional(),
        documentIds: z.array(z.number()).optional(),
      }),
      responses: {
        201: z.custom<typeof conversations.$inferSelect>(),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/conversations/:id" as const,
      responses: {
        204: z.void(),
      },
    },
  },
  messages: {
    create: {
      method: "POST" as const,
      path: "/api/conversations/:id/messages" as const,
      input: z.object({
        content: z.string(),
        role: z.enum(["user", "assistant"]).optional(), // Default user
      }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
