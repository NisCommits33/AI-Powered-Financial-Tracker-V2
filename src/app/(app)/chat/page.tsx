"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, Check, Copy, Lightbulb, Loader2, Mic, MessageSquare, PanelLeft, PanelLeftOpen, Pin, PinOff, Plus, Sparkles, Trash2, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionCard, type ActionCardHandle, type ChatAction, type Status } from "@/components/chat/ActionCard";
import { ChatChart, type ChatChartPayload } from "@/components/chat/ChatChart";
import { ChatTable, type ChatTablePayload } from "@/components/chat/ChatTable";
import { ChatPreferencesDialog } from "@/components/chat/ChatPreferencesDialog";
import { ChatMarkdown } from "@/components/chat/ChatMarkdown";
import { createClientComponentClient } from "@/lib/supabase/client";
import { AVAILABLE_MODELS, DEFAULT_MODEL, PROVIDER_LABELS } from "@/lib/groqModels";
import {
  defaultChatPreferences,
  loadChatPreferences,
  loadPinnedQuestions,
  saveChatPreferences,
  savePinnedQuestions,
  type ChatPreferences,
} from "@/lib/chatPreferences";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

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
  table?: ChatTablePayload;
}

interface Conversation {
  id: string;
  title: string | null;
  updated_at: string;
}

interface Insight {
  id: string;
  message: string;
}

interface SpeechRecognitionResultLike {
  0: {
    transcript: string;
  };
}

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

const DISMISSED_INSIGHTS_KEY = "chat_dismissed_insights";
const todayKey = () => new Date().toISOString().slice(0, 10);

// crypto.randomUUID requires HTTPS; fall back to Math.random-based UUID on plain HTTP (mobile dev).
function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
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

const modelLabelById = Object.fromEntries(AVAILABLE_MODELS.map((m) => [m.id, m.label]));

function formatConversationDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatPage() {
  const supabase = createClientComponentClient();
  const [suggestions, setSuggestions] = useState<string[]>(defaultSuggestions);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [preferences, setPreferences] = useState<ChatPreferences>(() =>
    typeof window === "undefined" ? defaultChatPreferences : loadChatPreferences()
  );
  const [pinnedQuestions, setPinnedQuestions] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : loadPinnedQuestions()
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [speechSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    const speechWindow = window as SpeechWindow;
    return Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition);
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [model, setModel] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_MODEL;
    const saved = localStorage.getItem("chat_model");
    return saved && AVAILABLE_MODELS.some((m) => m.id === saved) ? saved : DEFAULT_MODEL;
  });
  const [usage, setUsage] = useState<Usage | null>(null);
  const actionRefs = useRef<Map<string, ActionCardHandle>>(new Map());
  const messagesRef = useRef<ChatMessage[]>(messages);

  // Set up speech-to-text (Web Speech API) for voice input, if the browser supports it.
  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, []);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setInput("");
      recognition.start();
      setIsListening(true);
    }
  };

  const updatePreferences = (next: ChatPreferences) => {
    setPreferences(next);
    saveChatPreferences(next);
  };

  const togglePinned = (question: string) => {
    setPinnedQuestions((prev) => {
      const next = prev.includes(question) ? prev.filter((q) => q !== question) : [...prev, question];
      savePinnedQuestions(next);
      return next;
    });
  };

  const handleCopy = (m: ChatMessage) => {
    let text = m.content;
    if (m.table) {
      const header = `| ${m.table.columns.join(" | ")} |`;
      const divider = `| ${m.table.columns.map(() => "---").join(" | ")} |`;
      const rows = m.table.rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
      text += `${text ? "\n\n" : ""}**${m.table.title}**\n${header}\n${divider}\n${rows}`;
    }
    navigator.clipboard.writeText(text);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId((id) => (id === m.id ? null : id)), 1500);
  };

  useEffect(() => {
    fetch("/api/chat/suggestions")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
      })
      .catch(() => {});

    fetch("/api/chat/insights")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data.insights)) return;
        const dismissed = JSON.parse(localStorage.getItem(DISMISSED_INSIGHTS_KEY) || "{}");
        const today = todayKey();
        setInsights(data.insights.filter((i: Insight) => dismissed[i.id] !== today));
      })
      .catch(() => {});
  }, []);

  const dismissInsight = (id: string) => {
    const dismissed = JSON.parse(localStorage.getItem(DISMISSED_INSIGHTS_KEY) || "{}");
    dismissed[id] = todayKey();
    localStorage.setItem(DISMISSED_INSIGHTS_KEY, JSON.stringify(dismissed));
    setInsights((prev) => prev.filter((i) => i.id !== id));
  };

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Detect mobile and default sidebar to closed on small screens.
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
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
            chart: m.chart && m.chart.kind !== "table" ? m.chart : undefined,
            table: m.chart && m.chart.kind === "table" ? m.chart : undefined,
          }))
        : [welcomeMessage]
    );
  };

  // Load the conversation list and jump into the most recent one, if any.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    loadConversations().then((convos) => {
      if (convos.length > 0) selectConversation(convos[0].id);
    });
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

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
    // Insert under the message's own (client-generated) id so the row id is
    // stable from creation onward (no DB-id swap). Assistant messages that carry
    // action cards are instead inserted up-front in handleSend and then UPDATEd,
    // so a fast confirm/cancel can never race ahead of the row's creation.
    const { error } = await supabase.from("chat_messages").insert({
      id: message.id,
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      actions: message.actions ?? [],
      chart: message.table ? { kind: "table", ...message.table } : message.chart || null,
    });
    if (!error) touchConversation(conversationId);
    return message.id;
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
    const message = messagesRef.current.find((m) => m.id === messageId);
    const actions =
      status === "cancelled"
        ? (message?.actions || []).filter((a) => a.id !== actionId)
        : (message?.actions || []).map((a) => (a.id === actionId ? { ...a, status } : a));
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, actions } : m)));
    // Persist the new status so a confirmed/cancelled card doesn't reappear as
    // pending after reload. If the message row doesn't exist yet (still mid-insert
    // under its local id), persistMessage re-syncs these statuses after the swap.
    void supabase.from("chat_messages").update({ actions }).eq("id", messageId);
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
        const userMessage: ChatMessage = { id: randomId(), role: "user", content };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        const conversationId = await ensureConversation(content);
        persistMessage(userMessage, conversationId);
        if (acceptKeywords.has(normalized)) acceptAll(pendingMessage.id);
        else cancelAll(pendingMessage.id);
        return;
      }
    }

    const userMessage: ChatMessage = { id: randomId(), role: "user", content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    const conversationId = await ensureConversation(content);
    persistMessage(userMessage, conversationId);

    const assistantId = randomId();
    setStreamingId(assistantId);
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", actions: [] }]);

    // Persist the assistant row up-front (empty) so it exists before any action
    // card can be rendered or confirmed. Every later write — streamed content,
    // actions, and confirm/cancel status — is then an UPDATE to this stable row,
    // eliminating the insert-vs-confirm race that dropped statuses on reload.
    if (conversationId) {
      await supabase.from("chat_messages").insert({
        id: assistantId,
        conversation_id: conversationId,
        role: "assistant",
        content: "",
        actions: [],
      });
    }

    let fullContent = "";
    let actions: ChatAction[] = [];
    let chart: ChatChartPayload | undefined;
    let table: ChatTablePayload | undefined;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          model,
          preferences,
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
            let evt: { type: string; text?: string; actions?: ChatAction[]; chart?: ChatChartPayload; table?: ChatTablePayload; usage?: Usage };
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
              // Persist the (pending) actions as soon as they arrive, to the row
              // inserted up-front. Later confirm/cancel writes UPDATE the same row.
              if (conversationId) void supabase.from("chat_messages").update({ actions }).eq("id", assistantId);
            } else if (evt.type === "chart" && evt.chart) {
              chart = evt.chart;
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, chart } : m)));
            } else if (evt.type === "table" && evt.table) {
              table = evt.table;
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, table } : m)));
            } else if (evt.type === "usage" && evt.usage) {
              setUsage(evt.usage);
            }
          }
        }
      }

      // The row already exists and its actions were persisted as they arrived;
      // only the streamed content/chart need saving now (deliberately NOT actions,
      // so this can't overwrite a confirm/cancel that just happened).
      if (conversationId) {
        await supabase
          .from("chat_messages")
          .update({ content: fullContent, chart: table ? { kind: "table", ...table } : chart || null })
          .eq("id", assistantId);
        touchConversation(conversationId);
      }
    } catch {
      fullContent = "Something went wrong reaching the AI assistant.";
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)));
      if (conversationId) {
        await supabase.from("chat_messages").update({ content: fullContent }).eq("id", assistantId);
      }
    } finally {
      setStreamingId(null);
      setLoading(false);
    }
  };

  const isEmpty = messages.length === 1;

  const composer = (
    <div className="flex items-end gap-2 rounded-[1.5rem] border border-border bg-card/95 shadow-[0_12px_32px_rgba(15,23,20,0.08)] px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/25 transition-all dark:shadow-[0_14px_40px_rgba(0,0,0,0.35)]">
      <textarea
        rows={1}
        placeholder="Ask about your finances..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onInput={(e) => {
          e.currentTarget.style.height = "auto";
          e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 144)}px`;
        }}
        disabled={loading}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        className="min-h-10 flex-1 resize-none bg-transparent py-2 outline-none text-sm leading-relaxed max-h-36 placeholder:text-muted-foreground"
      />
      {speechSupported && (
        <Button
          type="button"
          size="icon"
          variant={isListening ? "default" : "outline"}
          onClick={toggleListening}
          disabled={loading}
          className="h-10 w-10 shrink-0 rounded-full"
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
          title={isListening ? "Stop voice input" : "Voice input"}
        >
          <Mic className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} />
        </Button>
      )}
      <Button
        type="button"
        size="icon"
        onClick={() => handleSend()}
        disabled={loading || !input.trim()}
        className="h-10 w-10 shrink-0 rounded-full shadow-sm"
        aria-label="Send message"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
      </Button>
    </div>
  );

  return (
    <div className="relative -mx-4 flex h-[calc(100dvh-15.75rem)] min-h-[25rem] w-[calc(100%+2rem)] overflow-hidden border-y border-border bg-card/70 text-foreground shadow-sm sm:mx-0 sm:w-full sm:rounded-2xl sm:border md:h-[calc(100dvh-8.5rem)]">
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conversation sidebar — overlay on mobile, inline on desktop */}
      <motion.div
        initial={false}
        animate={{ width: isMobile ? (sidebarOpen ? 288 : 0) : (sidebarOpen ? 240 : 0), opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={isMobile ? "fixed left-0 top-0 bottom-0 z-[70] overflow-hidden" : "shrink-0 self-stretch overflow-hidden"}
      >
        <div className="h-full w-72 md:w-60 flex flex-col border-r border-border bg-background md:bg-muted/35 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">Chats</p>
                <p className="text-[11px] text-muted-foreground">{conversations.length} saved</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="h-8 w-8 shrink-0"
              aria-label="Hide sidebar"
              title="Hide sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-3">
            <Button variant="outline" size="sm" onClick={startNewChat} className="h-9 w-full text-xs gap-1.5 justify-start bg-card">
              <Plus className="w-3.5 h-3.5" />
              New chat
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            <div className="flex flex-col gap-1">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`group flex items-start gap-2 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                    c.id === currentConversationId
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                      : "text-muted-foreground hover:bg-card/70 hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{c.title || "New conversation"}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">{formatConversationDate(c.updated_at)}</span>
                  </span>
                  <span
                    role="button"
                    onClick={(e) => deleteConversation(c.id, e)}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive transition-opacity"
                    aria-label="Delete conversation"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground px-2.5 py-2">No conversations yet.</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col flex-1 min-w-0 bg-background/70">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-card/75 px-3 py-3 backdrop-blur md:px-4">
          <div className="flex items-center gap-2 min-w-0 sm:gap-3">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="h-9 w-9 shrink-0"
                aria-label="Show sidebar"
                title="Show sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </Button>
            )}
            <div className="hidden h-9 w-9 rounded-xl bg-primary/12 text-primary sm:flex items-center justify-center shrink-0">
              <WalletCards className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">FinWise Assistant</p>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {loading ? "Working on your request" : currentConversationId ? "Conversation saved" : "New conversation"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            {usage?.remainingTokens && usage?.limitTokens && (
              <p className="hidden rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground lg:block" title="Daily token usage remaining for this model">
                {Number(usage.remainingTokens).toLocaleString()} / {Number(usage.limitTokens).toLocaleString()} tokens left
              </p>
            )}
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger
                className="h-9 w-[6.75rem] min-w-0 max-w-[34vw] gap-1.5 px-2.5 text-xs sm:w-48 sm:max-w-none [&>span]:min-w-0 [&>span]:flex-1 [&>span]:overflow-hidden"
                title={modelLabelById[model] || model}
              >
                <span className="block min-w-0 truncate text-left">{modelLabelById[model] || model}</span>
              </SelectTrigger>
              <SelectContent className="w-[min(20rem,calc(100vw-2rem))]">
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    <span className="flex min-w-0 w-full items-center gap-2">
                      <span className="min-w-0 flex-1 truncate">{m.label}</span>
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {PROVIDER_LABELS[m.provider]}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewChat}
                disabled={loading || messages.length <= 1}
                className="hidden h-9 text-xs gap-1.5 sm:inline-flex"
              >
                <Plus className="w-3.5 h-3.5" />
                New chat
              </Button>
            )}
            <ChatPreferencesDialog preferences={preferences} onChange={updatePreferences} />
          </div>
        </div>

        {/* Proactive insights */}
        {insights.length > 0 && (
          <div className="flex flex-col gap-2 border-b border-border bg-background/50 px-3 py-3 md:px-4">
            <AnimatePresence initial={false}>
              {insights.map((insight) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="w-full max-w-3xl mx-auto flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2.5 text-sm shadow-sm"
                >
                  <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <button
                    onClick={() => handleSend(`Tell me more about this: ${insight.message}`)}
                    disabled={loading}
                    className="flex-1 text-left text-foreground leading-relaxed hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {insight.message}
                  </button>
                  <button
                    onClick={() => dismissInsight(insight.id)}
                    aria-label="Dismiss insight"
                    title="Dismiss insight"
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {isEmpty ? (
          /* Empty state — centered greeting + composer, Claude-style */
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="min-h-full flex flex-col items-center justify-center gap-4 sm:gap-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shadow-sm ring-1 ring-primary/15 sm:w-14 sm:h-14">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h1 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">How can I help with your finances?</h1>
                <p className="text-xs text-muted-foreground sm:text-sm">Ask about spending, budgets, goals, debts, or account changes.</p>
              </div>
            </div>
            <div className="w-full max-w-2xl">{composer}</div>
            <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={loading}
                  className="min-h-12 rounded-xl border border-border bg-card px-3 py-2 text-left text-xs leading-relaxed text-muted-foreground shadow-sm transition-colors hover:bg-primary/10 hover:text-foreground disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            {pinnedQuestions.length > 0 && (
              <div className="flex flex-col items-center gap-2 max-w-2xl">
                <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Pinned</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {pinnedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      disabled={loading}
                      className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-foreground transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <Pin className="w-3 h-3 text-primary" />
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        ) : (
          <>
            {/* Conversation */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-6 px-3 py-5 md:px-6">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-3xl mx-auto"
                  >
                    {m.role === "user" ? (
                      <div className="flex justify-end items-center gap-1.5 group">
                        <button
                          onClick={() => togglePinned(m.content)}
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                          aria-label={pinnedQuestions.includes(m.content) ? "Unpin question" : "Pin question"}
                          title={pinnedQuestions.includes(m.content) ? "Unpin" : "Pin for quick access"}
                        >
                          {pinnedQuestions.includes(m.content) ? (
                            <PinOff className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Pin className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <div className="max-w-[86%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-primary-foreground shadow-sm sm:max-w-[78%]">
                          {m.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 group">
                        <div className="w-8 h-8 rounded-xl bg-card text-primary flex items-center justify-center shrink-0 mt-0.5 shadow-sm ring-1 ring-border">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col gap-3 flex-1 min-w-0">
                        {m.content ? (
                          <div className="relative">
                            <ChatMarkdown content={m.content} />
                            {m.id === streamingId && (
                              <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse rounded-sm translate-y-0.5 ml-0.5" />
                            )}
                          </div>
                        ) : m.id === streamingId ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Thinking...
                          </div>
                        ) : null}
                        {m.chart && <ChatChart chart={m.chart} />}
                        {m.table && <ChatTable table={m.table} />}
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
                        {m.id !== streamingId && (m.content || m.table) && (
                          <button
                            onClick={() => handleCopy(m)}
                            className="self-start opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                            aria-label="Copy response"
                            title="Copy response"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copy
                              </>
                            )}
                          </button>
                        )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Composer */}
            <div className="border-t border-border bg-background/90 px-3 py-3 backdrop-blur md:px-6">
              <div className="w-full max-w-3xl mx-auto">{composer}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
