import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Loader2, Sparkles, Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { useConversation, useCreateConversation } from "@/hooks/use-conversations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface ChatInterfaceProps {
  documentId: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id?: number;
}

export function ChatInterface({ documentId }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<number, string>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { mutateAsync: createConv } = useCreateConversation();

  useEffect(() => {
    if (!conversationId) {
      createConv({
        title: `Chat about Document ${documentId}`,
        documentId
      }).then((conv) => {
        setConversationId(conv.id);
      }).catch(() => {
        toast({
          title: "Error",
          description: "Failed to initialize chat session",
          variant: "destructive",
        });
      });
    }
  }, [documentId, conversationId, createConv, toast]);

  const { data: history } = useConversation(conversationId || 0);

  useEffect(() => {
    if (history?.messages) {
      setMessages(prev => prev.length === 0 ? history.messages.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content
      })) : prev);
    }
  }, [history]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg, role: "user" }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No stream available");

      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.userMessageId) {
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const userIdx = newMsgs.length - 2;
                  if (userIdx >= 0 && newMsgs[userIdx].role === "user") {
                    newMsgs[userIdx] = { ...newMsgs[userIdx], id: data.userMessageId };
                  }
                  return newMsgs;
                });
              }
              if (data.content) {
                assistantContent += data.content;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const lastMsg = newMsgs[newMsgs.length - 1];
                  if (lastMsg.role === "assistant") {
                    lastMsg.content = assistantContent;
                  }
                  return newMsgs;
                });
              }
              if (data.done && data.messageId) {
                setMessages(prev => {
                  const newMsgs = [...prev];
                  const lastMsg = newMsgs[newMsgs.length - 1];
                  if (lastMsg.role === "assistant") {
                    newMsgs[newMsgs.length - 1] = { ...lastMsg, id: data.messageId };
                  }
                  return newMsgs;
                });
              }
            } catch (e) {
              console.error("Error parsing SSE", e);
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to get response from AI",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (conversationId && messages.length > 0) {
      const assistantMsgIds = messages.filter(m => m.role === "assistant" && m.id).map(m => m.id!);
      if (assistantMsgIds.length === 0) return;
      Promise.all(
        assistantMsgIds.map(async (id) => {
          try {
            const res = await fetch(`/api/messages/${id}/rating`);
            if (res.ok) {
              const data = await res.json();
              if (data.rating) {
                setRatings(prev => ({ ...prev, [id]: data.rating }));
              }
            }
          } catch {}
        })
      );
    }
  }, [conversationId, messages.length]);

  const handleCopy = async (content: string, msgId?: number) => {
    await navigator.clipboard.writeText(content);
    if (msgId) {
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleRate = async (messageId: number, rating: string) => {
    const current = ratings[messageId];
    if (current === rating) return;
    try {
      const res = await fetch(`/api/messages/${messageId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error("Failed");
      setRatings(prev => ({ ...prev, [messageId]: rating }));
    } catch {
      toast({ title: "Error", description: "Failed to save rating", variant: "destructive" });
    }
  };

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Initializing chat...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">AI Assistant</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground/80">
            <Bot className="w-10 h-10 mb-3 text-primary/20" />
            <p className="font-medium text-sm">Ask me anything about this document</p>
            <p className="text-xs mt-1 opacity-70">I can summarize, explain, or find details.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`message-${msg.role}-${i}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}

              <div className="flex flex-col gap-1 max-w-[85%]">
                <div className={`
                  rounded-2xl p-3 text-sm leading-relaxed
                  ${msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-card border border-border/50 rounded-bl-none text-foreground"}
                `}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-table:border-collapse prose-th:border prose-th:border-border prose-th:p-1 prose-th:bg-muted/50 prose-td:border prose-td:border-border prose-td:p-1">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "assistant" && msg.content && (
                  <div className="flex items-center gap-0.5 ml-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleCopy(msg.content, msg.id || i)}
                      data-testid={`button-copy-${i}`}
                    >
                      {copiedId === (msg.id || i) ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                    </Button>
                    {msg.id && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-7 w-7 ${ratings[msg.id] === "thumbs_up" ? "text-green-500" : "text-muted-foreground"}`}
                          onClick={() => handleRate(msg.id!, "thumbs_up")}
                          data-testid={`button-thumbsup-${i}`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-7 w-7 ${ratings[msg.id] === "thumbs_down" ? "text-red-500" : "text-muted-foreground"}`}
                          onClick={() => handleRate(msg.id!, "thumbs_down")}
                          data-testid={`button-thumbsdown-${i}`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-background" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-none p-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-background border-t border-border">
        <form onSubmit={handleSubmit} className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="pr-10 bg-muted/30 border-border"
            disabled={isLoading}
            data-testid="input-chat-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2"
            data-testid="button-send-message"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
