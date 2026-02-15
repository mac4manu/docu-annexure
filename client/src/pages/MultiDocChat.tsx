import { useState, useRef, useEffect } from "react";
import { Send, Bot, Loader2, FileText, User, Plus, Trash2, History, MessageSquare, ChevronDown, Check, X, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useDocuments } from "@/hooks/use-documents";
import { useConversations, useCreateConversation, useDeleteConversation } from "@/hooks/use-conversations";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  id?: number;
}

const PROMPT_SUGGESTIONS = [
  {
    label: "Summarize core findings",
    prompt: "Summarize the core findings and key conclusions of this document in a structured format.",
  },
  {
    label: "Compare methodologies",
    prompt: "Compare the methodologies described across the selected documents. Highlight similarities and differences.",
  },
  {
    label: "Extract tables & formulas",
    prompt: "Extract and present all key data tables, mathematical formulas, and equations from this document.",
  },
  {
    label: "Explain for a student",
    prompt: "Explain the main concepts of this document in simple terms, suitable for an undergraduate student.",
  },
  {
    label: "Clinical implications",
    prompt: "What are the clinical or practical implications discussed in this document? Summarize any recommendations.",
  },
  {
    label: "List references",
    prompt: "List the key references and citations mentioned in this document, noting which claims they support.",
  },
  {
    label: "Detect tortured phrases",
    prompt: "Scan this document for tortured phrases — suspicious synonym substitutions where standard scientific terminology may have been mechanically replaced (e.g., 'deep learning' replaced with 'profound learning'). Present findings in a table with severity levels and an overall integrity assessment.",
  },
];

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
  const [showHistory, setShowHistory] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [ratings, setRatings] = useState<Record<number, string>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const docPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (documents && documents.length > 0 && !hasAutoSelected) {
      setSelectedDocIds(documents.map(d => d.id));
      setHasAutoSelected(true);
    }
  }, [documents, hasAutoSelected]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (docPickerRef.current && !docPickerRef.current.contains(e.target as Node)) {
        setShowDocPicker(false);
      }
    }
    if (showDocPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDocPicker]);

  const toggleDoc = (id: number) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
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
      setMessages(msgs.map((m: { id: number; role: string; content: string }) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      })));
      setSelectedDocIds(conv.documentIds || (conv.documentId ? [conv.documentId] : []));
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
    setInput("");
    if (documents) {
      setSelectedDocIds(documents.map(d => d.id));
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || selectedDocIds.length === 0) return;

    let activeConvId = conversationId;

    if (!activeConvId) {
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
      } catch {
        toast({ title: "Error", description: "Failed to start chat session", variant: "destructive" });
        return;
      }
    }

    const userMsg = messageText.trim();
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
      toast({ title: "Error", description: "Failed to get response from AI", variant: "destructive" });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && selectedDocIds.length > 0 && !isLoading) {
        sendMessage(input);
      }
    }
  };

  const historyConversations = conversationsList || [];
  const hasMessages = messages.length > 0;
  const docCount = documents?.length || 0;
  const selectedCount = selectedDocIds.length;

  if (docsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (docCount === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <FileText className="w-14 h-14 text-primary/10 mb-3" />
        <h2 className="text-lg font-semibold mb-1.5" data-testid="text-no-docs-title">No documents to chat with</h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Upload documents in the Documents tab first, then come back here to start asking questions.
        </p>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/"} data-testid="button-go-to-docs">
          <FileText className="w-3.5 h-3.5 mr-1.5" />
          Go to Documents
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
        <div className="relative" ref={docPickerRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDocPicker(!showDocPicker)}
            className={selectedCount > 0 ? "border-primary/40 bg-primary/5" : ""}
            data-testid="button-doc-picker"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            {selectedCount === docCount
              ? `All ${docCount} documents selected`
              : selectedCount > 0
                ? `${selectedCount} of ${docCount} documents selected`
                : "Select documents"}
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate">{selectedCount}</Badge>
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>

          {showDocPicker && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto" data-testid="dropdown-doc-picker">
              <div className="p-2 border-b border-border flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Select documents</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedCount === docCount) {
                      setSelectedDocIds([]);
                    } else {
                      setSelectedDocIds(documents!.map(d => d.id));
                    }
                  }}
                  data-testid="button-toggle-all-docs"
                >
                  {selectedCount === docCount ? "Deselect all" : "Select all"}
                </Button>
              </div>
              {documents!.map(doc => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover-elevate text-sm"
                    data-testid={`option-doc-${doc.id}`}
                  >
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary" : "border-border"}`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="truncate">{doc.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {historyConversations.length > 0 && (
            <Button
              variant={showHistory ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              data-testid="button-toggle-history"
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              History
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 no-default-hover-elevate no-default-active-elevate">{historyConversations.length}</Badge>
            </Button>
          )}
          {hasMessages && (
            <Button variant="ghost" size="sm" onClick={resetChat} data-testid="button-new-chat">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Chat
            </Button>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="flex-none border-b border-border bg-muted/20 max-h-52 overflow-y-auto">
          {convsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : historyConversations.length > 0 ? (
            <div className="p-2 space-y-0.5">
              {historyConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm group ${conversationId === conv.id ? "bg-primary/10" : "hover-elevate"}`}
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
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-muted-foreground">No chat history yet</div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" ref={scrollRef}>
        {!hasMessages ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <Bot className="w-12 h-12 text-primary/15 mb-4" />
            <h2 className="text-lg font-semibold mb-1" data-testid="text-empty-state-title">
              Ask anything about your documents
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              {selectedCount === docCount
                ? `All ${docCount} documents are selected. Type a question below or try a suggestion.`
                : `${selectedCount} document${selectedCount !== 1 ? "s" : ""} selected. Adjust using the document picker above.`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {PROMPT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.label}
                  onClick={() => sendMessage(suggestion.prompt)}
                  disabled={isLoading || selectedCount === 0}
                  className="text-left p-3 rounded-md border border-border bg-card text-sm hover-elevate active-elevate-2 transition-colors disabled:opacity-50"
                  data-testid={`button-suggestion-${suggestion.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <span className="font-medium text-foreground">{suggestion.label}</span>
                </button>
              ))}
            </div>
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

              <div className="flex flex-col gap-1 max-w-[80%]">
                <div className={`rounded-2xl p-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card border border-border/50 rounded-bl-none text-foreground"}`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-[13px] prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-table:border-collapse prose-th:border prose-th:border-border prose-th:p-1 prose-th:bg-muted/50 prose-td:border prose-td:border-border prose-td:p-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "assistant" && msg.id && msg.content && (
                  <div className="flex items-center gap-0.5 ml-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleCopy(msg.content, msg.id!)}
                      data-testid={`button-copy-${i}`}
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                    </Button>
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
        {isLoading && (
          <div className="flex gap-3 justify-start" data-testid="chat-status-indicator">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-none px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span>{messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content ? "Writing..." : "Thinking..."}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-none p-3 bg-background border-t border-border">
        {selectedCount === 0 && (
          <div className="text-center text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1.5" data-testid="text-no-docs-warning">
            <X className="w-3 h-3" />
            Select at least one document to start chatting
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedCount === 0 ? "Select documents above to start..." : "Ask a question about your documents... (Enter to send, Shift+Enter for new line)"}
            className="flex-1 resize-none bg-muted/30 max-h-[120px]"
            disabled={isLoading || selectedCount === 0}
            rows={1}
            data-testid="input-chat-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim() || selectedCount === 0}
            className="shrink-0"
            data-testid="button-send-message"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
