"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Skeleton from "@/components/shadcn/Skeleton";
import { AIInputWithLoading } from "@/components/ui/ai-input-with-loading";
import { adminFetch } from "@/components/api";
import { Home, ChevronRight, Zap, MessageCircle, Bot } from "lucide-react";
import { AnimatedText } from "@/components/ui/animated-shiny-text";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
  agentId?: string;
}

export default function AdminAgentChatPage() {
  const { token, isAuthenticated, isCheckingAuth } = useAdminAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setMessages([]);
    }
  }, [isAuthenticated]);

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
      setError(null);
    } catch (err) {
      setError("Failed to get agent response");
      toast.error("Could not process your query");
      console.error(err);
    } finally {
      setLoading(false);
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
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Bot className="h-6 w-6 text-cyan-400" />
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
          <p className="text-muted mt-3">Chat with AI agents and get real-time responses</p>
        </div>
      </section>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="mb-6 bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden flex flex-col h-[500px]">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-cyan-500/20 w-fit mx-auto">
                  <MessageCircle className="h-8 w-8 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-primary font-semibold mb-2">Start a conversation</h3>
                  <p className="text-muted text-sm">Ask the AI agent anything about your business</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    msg.role === "user"
                      ? "bg-cyan-500/30 border border-cyan-500/50 text-cyan-100"
                      : "bg-slate-800/50 border border-slate-700/50 text-slate-200"
                  }`}
                >
                  <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                  <p className="text-xs opacity-60 mt-2">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 border border-slate-700/50 text-slate-200 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700/50 bg-slate-900/30 p-4">
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: "user", 
            content: "ကမ္ဘာ့ကုန်သည်ရောင်းဝယ်မှုအကြောင်း ဘာသိသလဲ",
            timestamp: new Date().toISOString()
          }])}
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
          onClick={() => setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: "user", 
            content: "ကျွန်းကျွန်း ဆိုင်သည်ကို မည်သို့ လုပ်ဆောင်ရမည် နည်း",
            timestamp: new Date().toISOString()
          }])}
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
          onClick={() => setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: "user", 
            content: "တည်ဆောက်ရန် လျှစ်မထည့်ရသည့် နည်းပညာများ ရှိသလား",
            timestamp: new Date().toISOString()
          }])}
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
