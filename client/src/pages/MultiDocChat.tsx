import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send, User, Bot, Loader2, Sparkles, FileText, Check } from "lucide-react";
import { useDocuments } from "@/hooks/use-documents";
import { useCreateConversation } from "@/hooks/use-conversations";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function MultiDocChat() {
  const { data: documents, isLoading: docsLoading } = useDocuments();
  const { mutateAsync: createConv } = useCreateConversation();
  const { toast } = useToast();

  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleDoc = (id: number) => {
    if (chatStarted) return;
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (chatStarted || !documents) return;
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map(d => d.id));
    }
  };

  const startChat = async () => {
    if (selectedDocIds.length === 0) {
      toast({ title: "Select documents", description: "Pick at least one document to chat with.", variant: "destructive" });
      return;
    }

    try {
      const selectedNames = documents
        ?.filter(d => selectedDocIds.includes(d.id))
        .map(d => d.title)
        .slice(0, 3)
        .join(", ");
      const title = selectedDocIds.length === 1
        ? `Chat: ${selectedNames}`
        : `Chat: ${selectedNames}${selectedDocIds.length > 3 ? "..." : ""}`;

      const conv = await createConv({
        title,
        documentIds: selectedDocIds,
      });
      setConversationId(conv.id);
      setChatStarted(true);
    } catch {
      toast({ title: "Error", description: "Failed to start chat session", variant: "destructive" });
    }
  };

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
      toast({ title: "Error", description: "Failed to get response from AI", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <header className="flex-none h-14 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center gap-4 z-10">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Button>
        </Link>
        <Sparkles className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-lg" data-testid="text-page-title">Multi-Document Chat</h1>
        {chatStarted && (
          <Badge variant="secondary" className="ml-2" data-testid="badge-doc-count">
            {selectedDocIds.length} document{selectedDocIds.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 lg:w-80 flex-none border-r border-border bg-muted/20 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <h2 className="font-semibold text-sm" data-testid="text-select-heading">Select Documents</h2>
            {documents && documents.length > 0 && !chatStarted && (
              <Button variant="ghost" size="sm" onClick={selectAll} data-testid="button-select-all">
                {selectedDocIds.length === documents.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {docsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : documents && documents.length > 0 ? (
              documents.map(doc => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className={`
                      flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors
                      ${isSelected ? "bg-primary/10 border border-primary/30" : "hover-elevate border border-transparent"}
                      ${chatStarted ? "cursor-default" : ""}
                    `}
                    data-testid={`card-document-${doc.id}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={chatStarted}
                      className="mt-0.5"
                      data-testid={`checkbox-document-${doc.id}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" data-testid={`text-doc-title-${doc.id}`}>{doc.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {doc.fileType.toUpperCase()}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No documents uploaded yet
              </div>
            )}
          </div>

          {!chatStarted && (
            <div className="p-3 border-t border-border">
              <Button
                className="w-full"
                disabled={selectedDocIds.length === 0}
                onClick={startChat}
                data-testid="button-start-chat"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start Chat ({selectedDocIds.length} selected)
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {!chatStarted ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Bot className="w-16 h-16 text-primary/15 mb-4" />
              <h2 className="text-xl font-semibold mb-2" data-testid="text-empty-state-title">Chat across your documents</h2>
              <p className="text-muted-foreground max-w-md">
                Select one or more documents from the sidebar, then start a chat. The AI will have access to all selected documents and can answer questions referencing any of them.
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground/80">
                    <Bot className="w-12 h-12 mb-4 text-primary/20" />
                    <p className="font-medium">Ask me anything about your selected documents!</p>
                    <p className="text-sm mt-1 opacity-70">
                      I can compare, summarize, or find details across {selectedDocIds.length} document{selectedDocIds.length !== 1 ? "s" : ""}.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      data-testid={`message-${msg.role}-${i}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}

                      <div className={`
                        max-w-[80%] rounded-2xl p-3.5 text-sm leading-relaxed shadow-sm
                        ${msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-white dark:bg-zinc-900 border border-border/50 rounded-bl-none text-foreground"}
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
                    placeholder="Ask a question across your documents..."
                    className="pr-12 py-6 rounded-md bg-muted/50 border-border focus:bg-background transition-all shadow-inner"
                    disabled={isLoading}
                    data-testid="input-chat-message"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-1.5 top-1.5 h-9 w-9 rounded-md shadow-sm"
                    data-testid="button-send-message"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
