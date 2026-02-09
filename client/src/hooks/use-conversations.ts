import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

// GET /api/conversations
export function useConversations() {
  return useQuery({
    queryKey: [api.conversations.list.path],
    queryFn: async () => {
      const res = await fetch(api.conversations.list.path);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return api.conversations.list.responses[200].parse(await res.json());
    },
  });
}

// GET /api/conversations/:id
export function useConversation(id: number) {
  return useQuery({
    queryKey: [api.conversations.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.conversations.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return api.conversations.get.responses[200].parse(await res.json());
    },
    enabled: !!id && !isNaN(id),
  });
}

// POST /api/conversations (Create new chat, optionally linked to doc)
export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, documentId }: { title?: string; documentId?: number }) => {
      const validated = api.conversations.create.input.parse({ title, documentId });
      const res = await fetch(api.conversations.create.path, {
        method: api.conversations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return api.conversations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    },
  });
}

// POST /api/conversations/:id/messages
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number; content: string }) => {
      const url = buildUrl(api.messages.create.path, { id: conversationId });
      const validated = api.messages.create.input.parse({ content });

      // Note: This endpoint streams SSE, but for standard mutation we just need to initiate it.
      // However, usually we handle SSE separately. 
      // If the backend returns a stream, useMutation might wait until it closes.
      // Assuming for now it handles the request initiation.
      
      const res = await fetch(url, {
        method: api.messages.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      
      if (!res.ok) throw new Error("Failed to send message");
      
      // If the response is a stream, we can't easily parse JSON here.
      // The implementation will likely handle reading the stream in the UI component
      // This hook is mainly for the initial POST if not using a custom fetch loop.
      return res; 
    },
    onSuccess: (_, variables) => {
      // Invalidate conversation to show new messages if they are persisted
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, variables.conversationId] });
    },
  });
}
