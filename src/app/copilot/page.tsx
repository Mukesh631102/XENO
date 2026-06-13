"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Sparkles, Copy, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import toast from "react-hot-toast";
import { EnterpriseCard } from "@/components/EnterpriseCard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  loading?: boolean;
}

// ─── Typing indicator ────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-5 px-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Quick prompt chips ───────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "Write a win-back email",
  "Suggest segment criteria",
  "Draft a WhatsApp template",
  "Improve campaign open rates",
];

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: "init",
        role: "ai",
        content:
          "Hello! I am XENO Copilot, your AI marketing assistant.\n\nI can help you:\n- **Brainstorm campaign ideas**\n- **Draft engaging email, SMS, or WhatsApp copy**\n- **Analyze your audience segments**\n- **Provide strategies to improve conversion rates**\n\nHow can I help you today?",
      },
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(promptText = input) {
    const text = promptText.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);

    const userMsgId = Date.now().toString();
    const aiMsgId = (Date.now() + 1).toString();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: text },
      { id: aiMsgId, role: "ai", content: "", loading: true },
    ]);

    try {
      const history = messages
        .filter((m) => m.id !== "init" && !m.loading)
        .map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        }));

      const conversationContext = [...history, { role: "user", content: text }];

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationContext }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      if (!res.body) throw new Error("API response did not return a stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, loading: false } : m))
      );

      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, content: accumulatedContent } : m
          )
        );
      }
    } catch (err: any) {
      console.error("AI Copilot Chat error:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                loading: false,
                content: `Error: ${err.message || "Could not communicate with the Copilot server. Please check your GROQ_API_KEY config in .env."}`,
              }
            : m
        )
      );
      toast.error("Copilot stream disconnected.");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Response copied to clipboard!");
  };

  return (
    <div className="w-full flex justify-center py-2">
      <div className="max-w-4xl w-full flex-1 flex flex-col gap-5">
        {/* Page Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">AI Campaign Copilot</h1>
              <p className="text-sm text-slate-600">
                Your creative retail copywriter &amp; campaign strategist · Powered by Groq
              </p>
            </div>
          </div>
        </motion.div>

      {/* Chat Area */}
      <EnterpriseCard className="flex-1 flex flex-col overflow-hidden p-0 min-h-[500px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 max-h-[58vh] min-h-[380px]">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* AI Avatar */}
                {msg.role === "ai" && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot size={15} className="text-white" />
                  </div>
                )}

                <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
                  {/* Bubble */}
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-sm"
                        : "bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {msg.loading ? (
                      <TypingDots />
                    ) : (
                      <div className={`prose prose-slate max-w-none ${msg.role === "user" ? "prose-invert" : ""} prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-emerald-400 prose-pre:border prose-pre:border-slate-700 prose-pre:p-4 prose-pre:rounded-xl`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {/* Copy button for AI responses */}
                  {msg.role === "ai" && !msg.loading && msg.id !== "init" && (
                    <button
                      onClick={() => handleCopy(msg.content)}
                      className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors px-1"
                    >
                      <Copy size={10} /> Copy response
                    </button>
                  )}
                </div>

                {/* User Avatar */}
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-slate-600">
                    U
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          {/* Quick prompt chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {QUICK_PROMPTS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSend(suggestion)}
                disabled={isLoading}
                className="text-[11px] px-2.5 py-1 rounded-full text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 bg-white border border-slate-200 hover:border-indigo-200 transition-colors disabled:opacity-40"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Text input row */}
          <div className="flex items-end gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-400 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Copilot to write a Diwali campaign for dormant shoppers..."
              rows={2}
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none leading-relaxed py-0.5"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={15} className="text-white ml-0.5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 ml-1">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </EnterpriseCard>
      </div>
    </div>
  );
}
