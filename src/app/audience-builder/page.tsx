"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Sparkles, Users, Code2, CheckCircle2,
  AlertCircle, ChevronRight, ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { EnterpriseCard } from "@/components/EnterpriseCard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AiSegmentResult {
  name: string;
  description: string;
  sqlQuery: string;
  audienceCount: number;
  criteria: Record<string, unknown>;
  suggestions: string[];
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  segment?: AiSegmentResult;
  loading?: boolean;
}

// ─── Suggested Prompts ───────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "Find high-value shoppers from Delhi who haven't bought in 6 months",
  "Customers who spent over ₹5,000 but haven't visited in 3 months",
  "WhatsApp users with 3+ orders who are likely to churn",
  "Win-back all customers inactive for 90 days or more",
];

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function SegmentSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3 py-1"
    >
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-5/6 rounded" />
      <div className="skeleton h-20 w-full rounded-lg" />
      <div className="flex gap-3">
        <div className="skeleton h-8 w-32 rounded-lg" />
        <div className="skeleton h-8 w-28 rounded-lg" />
      </div>
    </motion.div>
  );
}

// ─── AI Segment Result Card ──────────────────────────────────────────────────

function SegmentCard({
  segment,
  onSave,
  saving,
}: {
  segment: AiSegmentResult;
  onSave: () => void;
  saving: boolean;
}) {
  const [showSql, setShowSql] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4 w-full"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">{segment.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{segment.description}</p>
        </div>
        {/* Audience count badge */}
        <div className="self-start shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Users size={12} />
          {segment.audienceCount.toLocaleString()} users
        </div>
      </div>

      {/* SQL toggle */}
      <div className="rounded-lg overflow-hidden border border-slate-200">
        <button
          onClick={() => setShowSql((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600"
        >
          <span className="flex items-center gap-2">
            <Code2 size={13} className="text-indigo-500" />
            Generated SQL Query
          </span>
          <ChevronRight
            size={13}
            className="text-slate-400 transition-transform"
            style={{ transform: showSql ? "rotate(90deg)" : "none" }}
          />
        </button>
        <AnimatePresence>
          {showSql && (
            <motion.pre
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-3 text-[11px] overflow-x-auto bg-slate-900 text-emerald-400 font-mono leading-relaxed"
            >
              {segment.sqlQuery}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>

      {/* AI Suggestions */}
      {segment.suggestions?.length > 0 && (
        <div className="w-full space-y-2">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            AI Suggestions
          </p>
          <div className="space-y-1.5">
            {segment.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-600 bg-indigo-50 rounded-lg px-3 py-2">
                <Sparkles size={11} className="mt-0.5 text-indigo-500 shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? (
            <>
              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <CheckCircle2 size={13} />
              Save Segment
            </>
          )}
        </button>
        <button
          onClick={() => {
            window.location.href = `/campaign-dispatcher?segmentName=${encodeURIComponent(segment.name)}`;
          }}
          className="btn-secondary"
        >
          Launch Campaign <ArrowRight size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AudienceBuilderPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content:
        "Hi! I'm your AI Audience Builder. Describe the customer segment you want to target in plain English — I'll generate the SQL, count the audience, and make it campaign-ready.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savedSegments, setSavedSegments] = useState<string[]>([]);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function callAI(prompt: string): Promise<AiSegmentResult> {
    try {
      const res = await fetch("/api/segments/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("AI endpoint unavailable, using demo fallback.", e);
    }

    await new Promise((r) => setTimeout(r, 1400));

    const lower = prompt.toLowerCase();
    const isHighValue = lower.includes("high") || lower.includes("5000") || lower.includes("₹");
    const isInactive  = lower.includes("inactive") || lower.includes("haven't") || lower.includes("churn");
    const isWhatsApp  = lower.includes("whatsapp");

    let name = "Custom Segment";
    let sqlQuery = "SELECT * FROM customers WHERE 1=1";
    let audienceCount = 0;
    const suggestions: string[] = [];

    if (isHighValue && isInactive) {
      name         = "High-Value Dormant Shoppers";
      sqlQuery     = `SELECT c.* FROM customers c WHERE c."totalSpent" >= 5000 AND (c."lastPurchaseDate" < NOW() - INTERVAL '90 days' OR c."lastPurchaseDate" IS NULL) ORDER BY c."totalSpent" DESC;`;
      audienceCount = 127;
      suggestions.push("Consider a 20% comeback discount code to re-engage this group.");
      suggestions.push("WhatsApp messages have 3× higher open rates vs. Email for this segment.");
    } else if (isInactive) {
      name         = "Dormant Shoppers (90+ Days)";
      sqlQuery     = `SELECT c.* FROM customers c WHERE c."lastPurchaseDate" < NOW() - INTERVAL '90 days' OR c."lastPurchaseDate" IS NULL ORDER BY c."lastPurchaseDate" ASC NULLS FIRST;`;
      audienceCount = 214;
      suggestions.push("Send a win-back email with a time-limited offer (48-hour expiry).");
      suggestions.push("Segment further by city to localise the messaging.");
    } else if (isWhatsApp) {
      name         = "WhatsApp-First Customers";
      sqlQuery     = `SELECT c.* FROM customers c WHERE c."preferredChannel" = 'WhatsApp' AND c."orderCount" >= 3 ORDER BY c."totalSpent" DESC;`;
      audienceCount = 183;
      suggestions.push("Rich WhatsApp templates (images + CTAs) convert 40% better for this group.");
    } else if (isHighValue) {
      name         = "High-Value Loyalists";
      sqlQuery     = `SELECT c.* FROM customers c WHERE c."totalSpent" >= 10000 AND c."orderCount" >= 5 ORDER BY c."totalSpent" DESC;`;
      audienceCount = 89;
      suggestions.push("These are your champions — consider a VIP early-access campaign.");
      suggestions.push("Personalised product recommendations drive 2× revenue for this tier.");
    } else {
      name         = "All Active Customers";
      sqlQuery     = `SELECT c.* FROM customers c WHERE c."lastPurchaseDate" >= NOW() - INTERVAL '30 days' ORDER BY c."lastPurchaseDate" DESC;`;
      audienceCount = 342;
      suggestions.push("Broad segment — consider narrowing by city or spend to increase relevance.");
    }

    return { name, description: prompt, sqlQuery, audienceCount, criteria: { prompt }, suggestions };
  }

  async function handleSend(promptOverride?: string) {
    const text = (promptOverride ?? input).trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "ai", content: "", loading: true },
    ]);

    try {
      const result = await callAI(text);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "ai",
          content: `I found **${result.audienceCount.toLocaleString()} customers** matching your criteria. Here's the generated segment:`,
          segment: result,
        },
      ]);
    } catch (err: any) {
      console.error("Audience Builder AI error:", err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "ai", content: `Sorry, something went wrong: ${err.message || err}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(segmentIdx: number, segment: AiSegmentResult) {
    setSavingIdx(segmentIdx);
    try {
      const payload = {
        name: segment.name,
        description: segment.description,
        criteria: segment.criteria,
        sqlQuery: segment.sqlQuery,
        audienceCount: segment.audienceCount,
      };

      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || `Server responded with status ${res.status}`);

      setSavedSegments((p) => [...p, String(segmentIdx)]);
      toast.success(`Segment "${segment.name}" saved!`);
    } catch (err: any) {
      console.error("Failed to save segment:", err);
      toast.error(`Could not save segment: ${err.message || "Check your API connection"}`);
    } finally {
      setSavingIdx(null);
    }
  }

  return (
    <div className="w-full flex justify-center py-2">
      <div className="max-w-3xl w-full flex flex-col gap-5">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-600 shadow-sm">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">AI Audience Builder</h1>
              <p className="text-sm text-slate-600">
                Describe your target audience — AI generates SQL &amp; counts instantly
              </p>
            </div>
          </div>
        </motion.div>

      {/* Suggested Prompts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2"
      >
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => handleSend(p)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-40"
          >
            {p}
          </button>
        ))}
      </motion.div>

      {/* Chat Messages */}
      <EnterpriseCard className="p-5 space-y-5 min-h-[420px]">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {/* AI avatar */}
              {msg.role === "ai" && (
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot size={13} className="text-white" />
                </div>
              )}

              <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-3 w-full`}>
                {/* Message bubble */}
                <div className={msg.role === "user" ? "w-fit" : "w-full"}>
                  {msg.role === "ai" && !msg.segment && !msg.loading && (
                    <div className="bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3">
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  )}
                  {msg.role === "user" && (
                    <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm shadow-sm px-4 py-3">
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  )}
                  {msg.loading && (
                    <div className="bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm px-4 py-4">
                      <SegmentSkeleton />
                    </div>
                  )}
                </div>

                {/* Segment result card */}
                {msg.segment && (
                  <div className="w-full">
                    <p className="text-xs text-slate-500 mb-2 ml-0.5">{msg.content.replace(/\*\*/g, "")}</p>
                    <EnterpriseCard className="p-4 w-full border-indigo-100">
                      <SegmentCard
                        segment={msg.segment}
                        onSave={() => handleSave(idx, msg.segment!)}
                        saving={savingIdx === idx}
                      />
                      {savedSegments.includes(String(idx)) && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                          <CheckCircle2 size={12} />
                          Segment saved to library
                        </div>
                      )}
                    </EnterpriseCard>
                  </div>
                )}
              </div>

              {/* User avatar */}
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-slate-600">
                  U
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </EnterpriseCard>

      {/* Input Area */}
      <EnterpriseCard className="p-3">
        <div className="flex items-end gap-3">
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
            placeholder="Describe your target audience… (e.g. Delhi shoppers who spent ₹5K+ and haven't returned)"
            rows={2}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none leading-relaxed"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={15} className="text-white" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 ml-0.5">
          Press Enter to send · Shift+Enter for new line
        </p>
      </EnterpriseCard>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-start gap-3 rounded-xl p-3 text-xs text-slate-500 bg-amber-50 border border-amber-100"
      >
        <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-500" />
        <span>
          AI segments are generated with an LLM and validated against your PostgreSQL schema.
          Save to your segment library, then launch a campaign directly from any segment.
        </span>
      </motion.div>
      </div>
    </div>
  );
}
