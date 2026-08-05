"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bot, CornerRightUp, Globe2, Loader2, MessageSquareText, ShieldCheck, Sparkles, Zap } from "lucide-react";

import PageBackground from "@/components/PageBackground";
import { publicChatQuery } from "@/components/api";

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
}

const quickPrompts = [
  "What should a Myanmar importer check before choosing a supplier?",
  "How can a small business reduce delivery delays?",
  "Explain supply chain risk in simple terms.",
];

export default function PublicAgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      content:
        "Hi, I am Logixa Flow AI. Ask me about logistics, sourcing, procurement, delivery planning, or Myanmar business operations.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const context = useMemo(
    () =>
      messages
        .filter((message) => message.id !== "welcome")
        .slice(-6)
        .map((message) => ({ role: message.role, content: message.content })),
    [messages]
  );

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setIsSending(true);

    try {
      const response = await publicChatQuery({
        query: trimmed,
        context,
        agent_id: "public-agent",
      });

      setMessages((current) => [
        ...current,
        {
          id: `agent-${Date.now()}`,
          role: "agent",
          content: response.response,
        },
      ]);
    } catch {
      setError("The AI agent could not respond right now. Please try again in a moment.");
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <PageBackground overlayOpacity={0.88}>
      <main className="min-h-screen px-4 py-8 text-white sm:px-6 sm:py-10 lg:px-8">
        <section className="mx-auto grid max-w-7xl gap-5 sm:gap-6 lg:grid-cols-[0.9fr_1.4fr] lg:items-stretch">
          <aside className="logixa-card flex flex-col justify-between p-5 sm:p-6 md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Public AI Agent</p>
              <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                Ask Logixa Flow about supply chain decisions.
              </h1>
              <p className="mt-5 text-sm leading-7 text-slate-300 sm:text-base">
                Get practical guidance for logistics, procurement, sourcing, delivery planning, and Myanmar business operations.
              </p>
            </div>

            <div className="mt-8 grid gap-3">
              <div className="rounded-lg border border-cyan-400/15 bg-slate-950/40 p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-cyan-300" />
                  <p className="font-semibold">Public-safe assistant</p>
                </div>
                <p className="mt-2 text-sm text-slate-400">No admin login is required for this page.</p>
              </div>
              <div className="rounded-lg border border-cyan-400/15 bg-slate-950/40 p-4">
                <div className="flex items-center gap-3">
                  <Globe2 className="h-5 w-5 text-orange-300" />
                  <p className="font-semibold">Myanmar-ready context</p>
                </div>
                <p className="mt-2 text-sm text-slate-400">Built for operators, importers, SMEs, and logistics teams.</p>
              </div>
            </div>

            <Link
              href="/contact"
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/30 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/10"
            >
              Talk to Logixa Flow
              <CornerRightUp className="h-4 w-4" />
            </Link>
          </aside>

          <section className="logixa-card overflow-hidden p-0">
            <div className="border-b border-cyan-400/10 bg-slate-950/45 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-cyan-400/10 p-3 text-cyan-300">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Live Chat</p>
                  <h2 className="text-xl font-bold">Logixa AI Assistant</h2>
                </div>
              </div>
            </div>

            <div className="flex h-[560px] max-h-[72vh] min-h-[500px] flex-col sm:h-[620px] sm:max-h-none">
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[86%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg sm:max-w-[72%] ${
                        message.role === "user"
                          ? "border border-cyan-300/30 bg-cyan-500/20 text-cyan-50"
                          : "border border-white/10 bg-slate-950/60 text-slate-100"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {isSending ? (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                      Thinking...
                    </div>
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="mx-4 mb-3 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 sm:mx-6">
                  {error}
                </div>
              ) : null}

              <div className="border-t border-cyan-400/10 bg-slate-950/45 p-4 sm:p-6">
                <div className="mb-4 grid gap-2 sm:grid-cols-3">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="min-h-[72px] rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-300 transition hover:border-cyan-300/40 hover:text-white"
                    >
                      <Zap className="mb-1 h-3.5 w-3.5 text-cyan-300" />
                      {prompt}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="flex gap-3">
                  <label className="sr-only" htmlFor="public-agent-input">
                    Ask the AI agent
                  </label>
                  <textarea
                    id="public-agent-input"
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage(input);
                      }
                    }}
                    placeholder="Ask about suppliers, shipping delays, sourcing, or operating plans..."
                    rows={2}
                    className="max-h-40 min-h-[56px] flex-1 resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !input.trim()}
                    className="inline-flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45"
                    aria-label="Send message"
                  >
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquareText className="h-5 w-5" />}
                  </button>
                </form>
              </div>
            </div>
          </section>
        </section>

        <section className="mx-auto mt-8 grid max-w-7xl gap-4 md:grid-cols-3">
          {["Practical answers", "Operational next steps", "English and Myanmar support"].map((item) => (
            <div key={item} className="rounded-xl border border-cyan-400/10 bg-slate-950/40 p-5 text-sm text-slate-300">
              <Sparkles className="mb-3 h-5 w-5 text-cyan-300" />
              <p className="font-semibold text-white">{item}</p>
            </div>
          ))}
        </section>
      </main>
    </PageBackground>
  );
}
