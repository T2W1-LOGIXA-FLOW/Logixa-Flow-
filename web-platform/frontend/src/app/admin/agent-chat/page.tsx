"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Skeleton from "@/components/shadcn/Skeleton";
import { AIInputWithLoading } from "@/components/ui/ai-input-with-loading";
import {
  adminFetch,
  getAdminChatMessages,
  listAdminChatSessions,
  type AdminChatSession,
} from "@/components/api";
import { Home, ChevronRight, Zap, MessageCircle, Bot, Copy, Trash2 } from "lucide-react";
import { AnimatedText } from "@/components/ui/animated-shiny-text";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AdminConversationMonitor, AdminConversationMessage } from "@/components/admin/agent/AdminConversationMonitor";
import AdminAgentErrorState from "@/components/admin/agent/AdminAgentErrorState";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
  agentId?: string;
}

type TranscriptSource = "local" | "restored";

export default function AdminAgentChatPage() {
  const { token, isAuthenticated, isCheckingAuth } = useAdminAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AdminChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionListError, setSessionListError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [transcriptSource, setTranscriptSource] = useState<TranscriptSource>("local");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyRequestRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setMessages([]);
      setSessions([]);
      setSelectedSessionId("");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!token || !isAuthenticated) return;
    let cancelled = false;
    setSessionsLoading(true);
    setSessionListError(null);
    listAdminChatSessions(token)
      .then((items) => {
        if (!cancelled) setSessions(items);
      })
      .catch(() => {
        if (!cancelled) setSessionListError("Persisted session list is unavailable.");
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAgentQuery = async (message: string) => {
    if (!message.trim()) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      setLoading(true);
      
      // Call new chat API
      const response = await adminFetch("/api/chat/query", token, {
        method: "POST",
        body: JSON.stringify({
          query: message,
          ...(selectedSessionId ? { session_id: selectedSessionId } : {}),
          context: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      // Add agent response to chat
      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: data.response || "No response received",
        timestamp: new Date().toISOString(),
        agentId: data.agent_id,
      };
      setMessages(prev => [...prev, agentMessage]);
      setTranscriptSource("local");
      setError(null);
    } catch (err) {
      setError("Admin chat API unavailable");
      toast.error("Could not process your query");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Message copied to clipboard");
  };

  const handleClearChat = () => {
    setMessages([]);
    setSelectedSessionId("");
    setTranscriptSource("local");
    toast.success("Local transcript cleared");
  };

  const handleSelectSession = async (sessionId: string) => {
    if (!sessionId || sessionId === selectedSessionId) return;
    if (transcriptSource === "local" && messages.length > 0 && !window.confirm("Replace the local draft with this saved session?")) {
      return;
    }

    const requestId = historyRequestRef.current + 1;
    historyRequestRef.current = requestId;
    setSelectedSessionId(sessionId);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const history = await getAdminChatMessages(token, sessionId);
      if (historyRequestRef.current !== requestId) return;
      setMessages(history.map((message) => ({
        id: String(message.id),
        role: message.role === "user" ? "user" : "agent",
        content: message.content,
        timestamp: message.created_at,
        agentId: message.agent_id ?? undefined,
      })));
      setTranscriptSource("restored");
    } catch {
      if (historyRequestRef.current === requestId) {
        setHistoryError("This saved session is unavailable or cannot be accessed.");
        setSelectedSessionId("");
      }
    } finally {
      if (historyRequestRef.current === requestId) setHistoryLoading(false);
    }
  };

  if (isCheckingAuth || !isAuthenticated || !token) {
    return (
      <main className="page-shell">
        <div className="max-w-4xl mx-auto py-8 space-y-6">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-96 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 mb-8 text-sm">
        <Link href="/admin" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition">
          <Home className="h-4 w-4" />
          Admin
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-500" />
        <Link href="/admin/agents" className="text-slate-400 hover:text-slate-300 transition">
          Agents
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-500" />
        <span className="text-slate-300">Chat</span>
      </nav>

      <section className="agent-header mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-slate-800">
                <Bot className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="eyebrow">Interactive</p>
                <AnimatedText
                  text="Agent Chat"
                  gradientColors="linear-gradient(90deg, #0891b2, #f97316)"
                  gradientAnimationDuration={1.5}
                  hoverEffect={true}
                  textClassName="font-black text-2xl md:text-3xl"
                  className="py-0"
                />
              </div>
            </div>
            <p className="text-muted mt-3">Admin chat with a local draft and owner-scoped persisted sessions. Live monitoring is unavailable.</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Clear local transcript"
              aria-label="Clear local transcript"
            >
              <Trash2 className="h-4 w-4" />
              Clear Local Transcript
            </button>
          )}
        </div>
      </section>

      {error && <div className="mb-6"><AdminAgentErrorState kind="api" detail={error} /></div>}
      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4" aria-labelledby="saved-sessions-title">
        <div className="mb-3">
          <h2 id="saved-sessions-title" className="text-white font-semibold">Persisted sessions</h2>
          <p className="text-slate-400 text-sm">Only your active sessions can be restored. Deleted and legacy sessions are unavailable.</p>
        </div>
        {sessionListError && <p className="mb-3 text-sm text-amber-300" role="alert">{sessionListError}</p>}
        {historyError && <p className="mb-3 text-sm text-amber-300" role="alert">{historyError}</p>}
        <label htmlFor="admin-session-select" className="mb-2 block text-sm font-medium text-slate-200">Select a persisted session</label>
        <select
          id="admin-session-select"
          value={selectedSessionId}
          onChange={(event) => void handleSelectSession(event.target.value)}
          disabled={sessionsLoading || historyLoading || sessions.length === 0}
          aria-describedby="session-selection-help session-selection-status"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
        >
          <option value="">
            {sessionsLoading ? "Loading persisted sessions…" : sessions.length ? "Select a persisted session" : "No persisted sessions"}
          </option>
          {sessions.map((session) => (
            <option key={session.session_id} value={session.session_id}>
              {session.title} — {new Date(session.updated_at).toLocaleString()}
            </option>
          ))}
        </select>
        <p id="session-selection-help" className="mt-2 text-xs text-slate-500">Titles and timestamps come from your active persisted sessions.</p>
        <p id="session-selection-status" className="mt-2 text-xs text-slate-500" role="status" aria-live="polite">
          {sessionsLoading ? "Loading persisted sessions…" : historyLoading ? "Loading restored transcript…" : transcriptSource === "restored" ? "Restored transcript" : "Local draft"}
        </p>
      </section>

      {/* Chat Messages Container */}
      <AdminConversationMonitor>
      <div className="mb-6 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[500px]">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-800 w-fit mx-auto">
                  <MessageCircle className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">{transcriptSource === "restored" ? "No messages in this persisted session" : "No local draft"}</h3>
                  <p className="text-slate-400 text-sm">{transcriptSource === "restored" ? "This persisted session has no messages." : "Ask the admin chat API a question, or select a persisted session above."}</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-xs lg:max-w-md">
                  <AdminConversationMessage
                    role={msg.role}
                    content={msg.content}
                    timestamp={msg.timestamp}
                    action={
                      <button
                        onClick={() => handleCopyMessage(msg.content)}
                        className="rounded p-1 text-slate-500 transition hover:text-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                        title="Copy message"
                        aria-label="Copy message"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    }
                  />
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start" role="status" aria-live="polite">
              <div className="bg-slate-700/50 text-slate-200 px-4 py-3 rounded-lg border border-slate-600">
                <div className="flex items-center gap-2">
                  <span className="sr-only">Waiting for an admin chat response</span>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-800 bg-slate-900/50 p-4">
          <AIInputWithLoading
            onSubmit={handleAgentQuery}
            placeholder="Ask the agent something..."
            minHeight={48}
            maxHeight={150}
            loadingDuration={3000}
            className="py-0"
          />
        </div>
      </div>
      </AdminConversationMonitor>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => {
            setSelectedSessionId("");
            setTranscriptSource("local");
            setMessages(prev => [...prev, {
            id: Date.now().toString(), 
            role: "user", 
            content: "ကမ္ဘာ့ကုန်သည်ရောင်းဝယ်မှုအကြောင်း ဘာသိသလဲ",
            timestamp: new Date().toISOString()
            }]);
          }}
          className="admin-panel group hover:border-cyan-500/50 transition text-left"
        >
          <div className="flex items-start justify-between mb-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="text-xs text-slate-500 group-hover:text-slate-400">Quick Question</span>
          </div>
          <p className="text-sm text-primary group-hover:text-cyan-300 transition font-medium">Myanmar Trade</p>
          <p className="text-xs text-muted mt-1">Ask about international trade</p>
        </button>

        <button
          onClick={() => {
            setSelectedSessionId("");
            setTranscriptSource("local");
            setMessages(prev => [...prev, {
            id: Date.now().toString(), 
            role: "user", 
            content: "ကျွန်းကျွန်း ဆိုင်သည်ကို မည်သို့ လုပ်ဆောင်ရမည် နည်း",
            timestamp: new Date().toISOString()
            }]);
          }}
          className="admin-panel group hover:border-cyan-500/50 transition text-left"
        >
          <div className="flex items-start justify-between mb-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="text-xs text-slate-500 group-hover:text-slate-400">Quick Question</span>
          </div>
          <p className="text-sm text-primary group-hover:text-cyan-300 transition font-medium">Start a Business</p>
          <p className="text-xs text-muted mt-1">Learn how to begin entrepreneurship</p>
        </button>

        <button
          onClick={() => {
            setSelectedSessionId("");
            setTranscriptSource("local");
            setMessages(prev => [...prev, {
            id: Date.now().toString(), 
            role: "user", 
            content: "တည်ဆောက်ရန် လျှစ်မထည့်ရသည့် နည်းပညာများ ရှိသလား",
            timestamp: new Date().toISOString()
            }]);
          }}
          className="admin-panel group hover:border-cyan-500/50 transition text-left"
        >
          <div className="flex items-start justify-between mb-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="text-xs text-slate-500 group-hover:text-slate-400">Quick Question</span>
          </div>
          <p className="text-sm text-primary group-hover:text-cyan-300 transition font-medium">Low-Cost Tech</p>
          <p className="text-xs text-muted mt-1">Affordable technology solutions</p>
        </button>
      </div>
    </main>
  );
}
