import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Loader2, Sparkles } from "lucide-react";
import { useConversation, useCreateConversation } from "@/hooks/use-conversations";
import { buildUrl } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface ChatInterfaceProps {
  documentId: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface({ documentId }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { mutateAsync: createConv } = useCreateConversation();

  // Initialize conversation
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

  // Fetch history if we return to existing conv
  const { data: history } = useConversation(conversationId || 0);
  
  useEffect(() => {
    if (history?.messages) {
      // Only set initial history if local state is empty to avoid overwriting streaming state
      setMessages(prev => prev.length === 0 ? history.messages.map(m => ({ 
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
      // Using direct fetch for SSE handling
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg, role: "user" }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      // Placeholder for assistant message
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

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Initializing chat...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card/50 backdrop-blur-sm rounded-xl overflow-hidden border border-border/50 shadow-sm">
      <div className="p-4 border-b border-border bg-card/80 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold">AI Assistant</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground/80">
            <Bot className="w-12 h-12 mb-4 text-primary/20" />
            <p className="font-medium">Ask me anything about this document!</p>
            <p className="text-sm mt-1 opacity-70">I can summarize key points, explain concepts, or find specific details.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div className={`
                max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed shadow-sm
                ${msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-br-none" 
                  : "bg-white dark:bg-zinc-900 border border-border/50 rounded-bl-none text-foreground"}
              `}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-background" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 justify-start">
             <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-none p-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-background border-t border-border">
        <form onSubmit={handleSubmit} className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="pr-12 py-6 rounded-xl bg-muted/50 border-border focus:bg-background transition-all shadow-inner"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()}
            className="absolute right-1.5 top-1.5 h-9 w-9 rounded-lg shadow-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
