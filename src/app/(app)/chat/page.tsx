"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, Loader2, MessageSquare, PanelLeft, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionCard, type ActionCardHandle, type ChatAction, type Status } from "@/components/chat/ActionCard";
import { ChatChart, type ChatChartPayload } from "@/components/chat/ChatChart";
import { createClientComponentClient } from "@/lib/supabase/client";
import { AVAILABLE_MODELS, DEFAULT_MODEL } from "@/lib/groqModels";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Usage {
  model: string;
  limitRequests: string | null;
  remainingRequests: string | null;
  limitTokens: string | null;
  remainingTokens: string | null;
  resetTokens: string | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
  chart?: ChatChartPayload;
}

interface Conversation {
  id: string;
  title: string | null;
  updated_at: string;
}

const defaultSuggestions = [
  "How much did I spend on food this month?",
  "Am I over budget anywhere?",
  "What's my net worth right now?",
];

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I'm your FinWise assistant. Ask me anything about your spending, budgets, or net worth.",
};

export default function ChatPage() {
  const supabase = createClientComponentClient();
  const [suggestions, setSuggestions] = useState<string[]>(defaultSuggestions);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat/suggestions")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
      })
      .catch(() => {});
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [usage, setUsage] = useState<Usage | null>(null);
  const actionRefs = useRef<Map<string, ActionCardHandle>>(new Map());

  // Remember the user's model choice across sessions.
  useEffect(() => {
    const saved = localStorage.getItem("chat_model");
    if (saved && AVAILABLE_MODELS.some((m) => m.id === saved)) setModel(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("chat_model", model);
  }, [model]);

  const loadConversations = async () => {
    const { data } = await supabase.from("chat_conversations").select("*").order("updated_at", { ascending: false });
    setConversations(data || []);
    return data || [];
  };

  const selectConversation = async (id: string) => {
    setCurrentConversationId(id);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setMessages(
      data && data.length > 0
        ? data.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            actions: m.actions || [],
            chart: m.chart || undefined,
          }))
        : [welcomeMessage]
    );
  };

  // Load the conversation list and jump into the most recent one, if any.
  useEffect(() => {
    loadConversations().then((convos) => {
      if (convos.length > 0) selectConversation(convos[0].id);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Creates a conversation on first send if one isn't already selected, titled
  // from the user's first message.
  const ensureConversation = async (firstContent: string) => {
    if (currentConversationId) return currentConversationId;
    const { data } = await supabase
      .from("chat_conversations")
      .insert({ title: firstContent.slice(0, 60) })
      .select()
      .single();
    if (data?.id) {
      setCurrentConversationId(data.id);
      setConversations((prev) => [data, ...prev]);
      return data.id as string;
    }
    return null;
  };

  const touchConversation = (conversationId: string) => {
    const now = new Date().toISOString();
    supabase.from("chat_conversations").update({ updated_at: now }).eq("id", conversationId);
    setConversations((prev) =>
      [...prev.map((c) => (c.id === conversationId ? { ...c, updated_at: now } : c))].sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at)
      )
    );
  };

  const persistMessage = async (message: ChatMessage, conversationId: string | null) => {
    if (!conversationId) return undefined;
    const { data } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        actions: message.actions || [],
        chart: message.chart || null,
      })
      .select()
      .single();
    if (data?.id) {
      // Swap the locally-generated id for the DB id so later status updates
      // (confirm/cancel) can target the right row.
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, id: data.id } : m)));
      touchConversation(conversationId);
    }
    return data?.id as string | undefined;
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([welcomeMessage]);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("chat_conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) startNewChat();
  };

  // Persist a single action's status. Cancelled actions are removed from the
  // UI entirely (and from storage) so they don't reappear as "pending" on reload.
  const updateActionStatus = (messageId: string, actionId: string, status: Status) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const actions =
          status === "cancelled"
            ? (m.actions || []).filter((a) => a.id !== actionId)
            : (m.actions || []).map((a) => (a.id === actionId ? { ...a, status } : a));
        supabase.from("chat_messages").update({ actions }).eq("id", messageId);
        return { ...m, actions };
      })
    );
  };

  const acceptAll = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    (message?.actions || []).forEach((action) => {
      if ((action.status || "pending") === "pending") {
        actionRefs.current.get(`${messageId}:${action.id}`)?.confirm();
      }
    });
  };

  const cancelAll = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    (message?.actions || []).forEach((action) => {
      if ((action.status || "pending") === "pending") {
        actionRefs.current.get(`${messageId}:${action.id}`)?.cancel();
      }
    });
  };

  // The most recent assistant message that still has pending actions, if any.
  const findPendingActionsMessage = () =>
    [...messages].reverse().find((m) => (m.actions || []).some((a) => (a.status || "pending") === "pending"));

  const acceptKeywords = new Set(["accept", "accept all", "confirm", "confirm all", "yes", "approve", "approve all"]);
  const cancelKeywords = new Set(["cancel", "cancel all", "reject", "reject all", "no", "decline", "decline all"]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    // Let the user accept/cancel pending action cards by typing, without
    // round-tripping through the AI.
    const normalized = content.toLowerCase();
    if (acceptKeywords.has(normalized) || cancelKeywords.has(normalized)) {
      const pendingMessage = findPendingActionsMessage();
      if (pendingMessage) {
        const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        const conversationId = await ensureConversation(content);
        persistMessage(userMessage, conversationId);
        if (acceptKeywords.has(normalized)) acceptAll(pendingMessage.id);
        else cancelAll(pendingMessage.id);
        return;
      }
    }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    const conversationId = await ensureConversation(content);
    persistMessage(userMessage, conversationId);

    const assistantId = crypto.randomUUID();
    setStreamingId(assistantId);
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", actions: [] }]);

    let fullContent = "";
    let actions: ChatAction[] = [];
    let chart: ChatChartPayload | undefined;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          model,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        fullContent = data.error || "Something went wrong.";
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)));
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            let evt: { type: string; text?: string; actions?: ChatAction[]; chart?: ChatChartPayload; usage?: Usage };
            try {
              evt = JSON.parse(line);
            } catch {
              continue;
            }

            if (evt.type === "content" && evt.text) {
              fullContent += evt.text;
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)));
            } else if (evt.type === "actions") {
              actions = evt.actions || [];
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, actions } : m)));
            } else if (evt.type === "chart" && evt.chart) {
              chart = evt.chart;
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, chart } : m)));
            } else if (evt.type === "usage" && evt.usage) {
              setUsage(evt.usage);
            }
          }
        }
      }

      persistMessage({ id: assistantId, role: "assistant", content: fullContent, actions, chart }, conversationId);
    } catch {
      fullContent = "Something went wrong reaching the AI assistant.";
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)));
      persistMessage({ id: assistantId, role: "assistant", content: fullContent, actions, chart }, conversationId);
    } finally {
      setStreamingId(null);
      setLoading(false);
    }
  };

  const isEmpty = messages.length === 1;

  const composer = (
    <div className="flex items-end gap-2 rounded-3xl border border-border bg-card shadow-sm px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
      <textarea
        rows={1}
        placeholder="Ask about your finances..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={loading}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed max-h-32 placeholder:text-muted-foreground"
      />
      <Button
        size="icon"
        onClick={() => handleSend()}
        disabled={loading || !input.trim()}
        className="h-9 w-9 shrink-0 rounded-full"
        aria-label="Send message"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
      </Button>
    </div>
  );

  return (
    <div className="flex w-full h-[calc(100vh-12rem)] md:h-[calc(100vh-9rem)] text-foreground gap-4">
      {/* Conversation sidebar */}
      {sidebarOpen && (
        <div className="w-56 shrink-0 self-start max-h-full flex flex-col gap-1 border-r border-border pr-3 overflow-y-auto">
          <Button variant="outline" size="sm" onClick={startNewChat} className="h-8 text-xs gap-1.5 mb-2 justify-start">
            <Plus className="w-3.5 h-3.5" />
            New chat
          </Button>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-left transition-colors ${
                c.id === currentConversationId
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 truncate">{c.title || "New conversation"}</span>
              <span
                role="button"
                onClick={(e) => deleteConversation(c.id, e)}
                className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground px-2.5 py-2">No conversations yet.</p>
          )}
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen((v) => !v)}
              className="h-8 w-8"
              aria-label="Toggle conversation list"
            >
              <PanelLeft className="w-4 h-4" />
            </Button>
            <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase">FinWise Assistant</p>
          </div>
          <div className="flex items-center gap-2">
            {usage?.remainingTokens && usage?.limitTokens && (
              <p className="text-xs text-muted-foreground hidden sm:block" title="Daily token usage remaining for this model">
                {Number(usage.remainingTokens).toLocaleString()} / {Number(usage.limitTokens).toLocaleString()} tokens left
              </p>
            )}
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-8 w-auto text-xs gap-1.5 px-2.5 [&>span]:line-clamp-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={startNewChat}
              disabled={loading || messages.length <= 1}
              className="h-8 text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New chat
            </Button>
          </div>
        </div>

        {isEmpty ? (
          /* Empty state — centered greeting + composer, Claude-style */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">How can I help with your finances?</h1>
            </div>
            <div className="w-full max-w-2xl">{composer}</div>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Conversation */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-6 px-1 md:px-2">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-3xl mx-auto"
                  >
                    {m.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                          {m.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {m.content ? (
                          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                            {m.content}
                          </div>
                        ) : m.id === streamingId ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Thinking...
                          </div>
                        ) : null}
                        {m.chart && <ChatChart chart={m.chart} />}
                        {m.actions && m.actions.length > 0 && (
                          <div className="flex flex-col gap-2 w-full">
                            {m.actions.filter((a) => (a.status || "pending") === "pending").length > 1 && (
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => acceptAll(m.id)} className="h-8">
                                  Accept all
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => cancelAll(m.id)} className="h-8">
                                  Cancel all
                                </Button>
                              </div>
                            )}
                            {m.actions.map((action) => (
                              <ActionCard
                                key={action.id}
                                ref={(el) => {
                                  const refKey = `${m.id}:${action.id}`;
                                  if (el) actionRefs.current.set(refKey, el);
                                  else actionRefs.current.delete(refKey);
                                }}
                                action={action}
                                onStatusChange={(status) => updateActionStatus(m.id, action.id, status)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Composer */}
            <div className="pt-4">
              <div className="w-full max-w-3xl mx-auto">{composer}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
