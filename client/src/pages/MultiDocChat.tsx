import { useState, useRef, useEffect } from "react";
import { Send, Bot, Loader2, Sparkles, FileText, User, Plus, Trash2, History, MessageSquare } from "lucide-react";
import { useDocuments } from "@/hooks/use-documents";
import { useConversations, useCreateConversation, useDeleteConversation } from "@/hooks/use-conversations";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { buildUrl } from "@shared/routes";
import { api } from "@shared/routes";
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
  const { data: conversationsList, isLoading: convsLoading } = useConversations();
  const { mutateAsync: createConv } = useCreateConversation();
  const { mutateAsync: deleteConv } = useDeleteConversation();
  const { toast } = useToast();

  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [needsNewConversation, setNeedsNewConversation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleDoc = (id: number) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
    if (chatStarted) {
      setConversationId(null);
      setNeedsNewConversation(true);
    }
  };

  const selectAll = () => {
    if (!documents) return;
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map(d => d.id));
    }
    if (chatStarted) {
      setConversationId(null);
      setNeedsNewConversation(true);
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
      setShowHistory(false);
    } catch {
      toast({ title: "Error", description: "Failed to start chat session", variant: "destructive" });
    }
  };

  const loadConversation = async (convId: number) => {
    try {
      const url = buildUrl(api.conversations.get.path, { id: convId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load conversation");
      const data = await res.json();
      const conv = data.conversation || data;
      const msgs = data.messages || [];

      setConversationId(convId);
      setMessages(msgs.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })));
      setSelectedDocIds(conv.documentIds || (conv.documentId ? [conv.documentId] : []));
      setChatStarted(true);
      setNeedsNewConversation(false);
      setShowHistory(false);
    } catch {
      toast({ title: "Error", description: "Failed to load conversation", variant: "destructive" });
    }
  };

  const handleDeleteConversation = async (convId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConv(convId);
      if (conversationId === convId) {
        resetChat();
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete conversation", variant: "destructive" });
    }
  };

  const resetChat = () => {
    setConversationId(null);
    setMessages([]);
    setChatStarted(false);
    setNeedsNewConversation(false);
    setSelectedDocIds([]);
    setInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || selectedDocIds.length === 0) return;

    let activeConvId = conversationId;

    if (needsNewConversation || !activeConvId) {
      try {
        const selectedNames = documents
          ?.filter(d => selectedDocIds.includes(d.id))
          .map(d => d.title)
          .slice(0, 3)
          .join(", ");
        const title = selectedDocIds.length === 1
          ? `Chat: ${selectedNames}`
          : `Chat: ${selectedNames}${selectedDocIds.length > 3 ? "..." : ""}`;

        const conv = await createConv({ title, documentIds: selectedDocIds });
        activeConvId = conv.id;
        setConversationId(conv.id);
        setNeedsNewConversation(false);
      } catch {
        toast({ title: "Error", description: "Failed to start chat session", variant: "destructive" });
        return;
      }
    }

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/conversations/${activeConvId}/messages`, {
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

  const historyConversations = conversationsList || [];

  return (
    <div className="h-full flex overflow-hidden">
      <div className="w-64 flex-none border-r border-border bg-muted/10 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              variant={showHistory ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              data-testid="button-toggle-history"
              className="toggle-elevate"
            >
              <History className="w-3.5 h-3.5" />
            </Button>
            <h2 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground" data-testid="text-select-heading">
              {showHistory ? "History" : "Documents"}
            </h2>
          </div>
          {!showHistory && documents && documents.length > 0 && (
            <Button variant="ghost" size="sm" onClick={selectAll} data-testid="button-select-all">
              {selectedDocIds.length === documents.length ? "None" : "All"}
            </Button>
          )}
          {showHistory && chatStarted && (
            <Button variant="ghost" size="icon" onClick={resetChat} data-testid="button-new-chat">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {showHistory ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {convsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : historyConversations.length > 0 ? (
              historyConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`
                    flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm group
                    ${conversationId === conv.id ? "bg-primary/10" : "hover-elevate"}
                  `}
                  data-testid={`card-history-${conv.id}`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1" data-testid={`text-history-title-${conv.id}`}>{conv.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 invisible group-hover:visible"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    data-testid={`button-delete-history-${conv.id}`}
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                <History className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                No chat history yet
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {docsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : documents && documents.length > 0 ? (
              documents.map(doc => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className={`
                      flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-colors text-sm
                      ${isSelected ? "bg-primary/10" : "hover-elevate"}
                    `}
                    data-testid={`card-document-${doc.id}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="shrink-0"
                      data-testid={`checkbox-document-${doc.id}`}
                    />
                    <span className="truncate" data-testid={`text-doc-title-${doc.id}`}>{doc.title}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-muted-foreground">
                <FileText className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                No documents yet
              </div>
            )}
          </div>
        )}

        {!showHistory && (
          <div className="p-2 border-t border-border space-y-1.5">
            {!chatStarted ? (
              <Button
                className="w-full"
                size="sm"
                disabled={selectedDocIds.length === 0}
                onClick={startChat}
                data-testid="button-start-chat"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Chat ({selectedDocIds.length})
              </Button>
            ) : (
              <>
                <Badge variant="secondary" className="w-full justify-center text-xs" data-testid="badge-doc-count">
                  {selectedDocIds.length} document{selectedDocIds.length !== 1 ? "s" : ""} selected
                </Badge>
                {needsNewConversation && selectedDocIds.length > 0 && (
                  <p className="text-[10px] text-muted-foreground text-center" data-testid="text-selection-changed">
                    Selection changed — next message uses updated docs
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!chatStarted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <Bot className="w-14 h-14 text-primary/10 mb-3" />
            <h2 className="text-lg font-semibold mb-1.5" data-testid="text-empty-state-title">Chat across your documents</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Select documents from the left, then start a chat. The AI can answer questions referencing all selected files.
            </p>
            {historyConversations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowHistory(true)}
                data-testid="button-view-history"
              >
                <History className="w-3.5 h-3.5 mr-1.5" />
                View chat history ({historyConversations.length})
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground/80">
                  <Bot className="w-10 h-10 mb-3 text-primary/20" />
                  <p className="font-medium text-sm">Ask me anything about your selected documents</p>
                  <p className="text-xs mt-1 opacity-70">
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
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}

                    <div className={`
                      max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed
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

                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-background" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3 justify-start">
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
                  placeholder={selectedDocIds.length === 0 ? "Select documents to start asking questions..." : "Ask a question across your documents..."}
                  className="pr-10 bg-muted/30 border-border"
                  disabled={isLoading || selectedDocIds.length === 0}
                  data-testid="input-chat-message"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !input.trim() || selectedDocIds.length === 0}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  data-testid="button-send-message"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
