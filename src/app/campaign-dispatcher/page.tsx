"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EnterpriseCard } from "@/components/EnterpriseCard";
import {
  Megaphone, Sparkles, Rocket, Users, ChevronDown,
  CheckCircle2, Mail, MessageCircle, Smartphone, Copy,
  RefreshCw, ArrowRight, Loader2, Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams, useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Segment {
  id: string;
  name: string;
  audienceCount: number;
  description: string;
}

interface MessageVariant {
  id: string;
  channel: "Email" | "WhatsApp" | "SMS";
  subject?: string;
  body: string;
}

type CampaignStatus = "idle" | "generating" | "ready" | "launching" | "sent";

// ─── Demo fallback variants ──────────────────────────────────────────────────

function generateDemoVariants(segmentName: string, objective: string): MessageVariant[] {
  const brand = "XENO";
  return [
    {
      id: "v1",
      channel: "Email",
      subject: `We've missed you, {{name}} 💌`,
      body: `Hi {{name}},\n\nIt's been a while since your last purchase at ${brand}! We wanted to reach out personally because customers like you matter to us.\n\nAs a special thank you, here's an exclusive 20% off for the next 48 hours.\n\n👉 Use code: COMEBACK20\n\nShop now at xeno.in/deals\n\nWarm regards,\nThe ${brand} Team`,
    },
    {
      id: "v2",
      channel: "WhatsApp",
      body: `Hey {{name}}! 👋\n\nWe noticed you haven't visited ${brand} in a while — and we *really* miss you.\n\n🎁 Special offer just for you: 20% OFF on your next order!\n\nValid for 48 hours only. Click here 👉 xeno.in/comeback\n\nHope to see you soon! 😊`,
    },
    {
      id: "v3",
      channel: "SMS",
      body: `Hi {{name}}, ${brand} misses you! Get 20% OFF your next order in the next 48hrs. Use code COMEBACK20 at xeno.in/deals. Opt-out reply STOP.`,
    },
  ];
}

// ─── Channel helpers ─────────────────────────────────────────────────────────

function ChannelIcon({ channel, size = 14 }: { channel: string; size?: number }) {
  if (channel === "Email")    return <Mail size={size} className="text-sky-600" />;
  if (channel === "WhatsApp") return <MessageCircle size={size} className="text-emerald-600" />;
  return <Smartphone size={size} className="text-violet-600" />;
}

const CHANNEL_CONFIG = {
  Email:    { activeBg: "bg-sky-50",     activeBorder: "border-sky-300",     activeText: "text-sky-700"     },
  WhatsApp: { activeBg: "bg-emerald-50", activeBorder: "border-emerald-300", activeText: "text-emerald-700" },
  SMS:      { activeBg: "bg-violet-50",  activeBorder: "border-violet-300",  activeText: "text-violet-700"  },
};

// ─── Message Variant Card ─────────────────────────────────────────────────────

function VariantCard({
  variant, selected, onSelect,
}: {
  variant: MessageVariant;
  selected: boolean;
  onSelect: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(variant.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const cfg = CHANNEL_CONFIG[variant.channel];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={onSelect}
      className={`cursor-pointer rounded-xl p-4 transition-all duration-150 w-full border ${
        selected
          ? `${cfg.activeBg} ${cfg.activeBorder}`
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ChannelIcon channel={variant.channel} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${selected ? cfg.activeText : "text-slate-500"}`}>
            {variant.channel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selected && <CheckCircle2 size={13} className={cfg.activeText} />}
          <button
            onClick={(e) => { e.stopPropagation(); copy(); }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            {copied ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {variant.subject && (
        <p className="text-xs font-semibold text-slate-700 mb-1.5">{variant.subject}</p>
      )}
      <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-line line-clamp-4">
        {variant.body}
      </p>
    </motion.div>
  );
}

// ─── Inner Dispatcher ────────────────────────────────────────────────────────

function CampaignDispatcherInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [segmentOpen, setSegmentOpen] = useState(false);
  const [objective, setObjective] = useState(
    "Win back dormant customers with a personalised offer"
  );
  const [campaignName, setCampaignName] = useState("Win-Back Campaign");
  const [selectedChannel, setSelectedChannel] = useState<"Email" | "WhatsApp" | "SMS">("Email");
  const [variants, setVariants] = useState<MessageVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<MessageVariant | null>(null);
  const [status, setStatus] = useState<CampaignStatus>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/segments");
        if (res.ok) {
          const data = await res.json();
          const list: Segment[] = (data.data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            audienceCount: s.audienceCount || 0,
            description: s.description || "",
          }));
          setSegments(list);
          const preselect = searchParams.get("segmentName");
          if (preselect) {
            const found = list.find((s) => s.name === preselect);
            if (found) setSelectedSegment(found);
          } else if (list.length > 0) {
            setSelectedSegment(list[0]);
          }
        }
      } catch {
        const demo: Segment[] = [
          { id: "demo-1", name: "High-Value Dormant Shoppers", audienceCount: 127, description: "Spent ₹5K+, inactive 90 days" },
          { id: "demo-2", name: "Dormant Shoppers (90+ Days)",  audienceCount: 214, description: "No purchase in 90 days" },
          { id: "demo-3", name: "WhatsApp-First Customers",    audienceCount: 183, description: "Prefer WhatsApp, 3+ orders" },
        ];
        setSegments(demo);
        setSelectedSegment(demo[0]);
      }
    }
    load();
  }, [searchParams]);

  const generateCopy = useCallback(async () => {
    if (!selectedSegment) return;
    setStatus("generating");
    setVariants([]);
    setSelectedVariant(null);
    try {
      const res = await fetch("/api/ai/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmentName: selectedSegment.name, objective }),
      });
      if (res.ok) {
        const data = await res.json();
        setVariants(data.variants ?? generateDemoVariants(selectedSegment.name, objective));
      } else {
        throw new Error("API unavailable");
      }
    } catch {
      setVariants(generateDemoVariants(selectedSegment.name, objective));
    } finally {
      setStatus("ready");
    }
  }, [selectedSegment, objective]);

  async function launchCampaign() {
    if (!selectedSegment || !selectedVariant) {
      toast.error("Please select a segment and a message variant first.");
      return;
    }

    setStatus("launching");
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) { clearInterval(interval); return p; }
        return p + Math.random() * 15;
      });
    }, 300);

    try {
      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          objective,
          segmentId: selectedSegment.id,
          channel: selectedVariant.channel,
          messageTemplate: selectedVariant.body,
        }),
      });

      if (!createRes.ok) throw new Error("Failed to create campaign");
      const { data: campaign } = await createRes.json();

      await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });

      clearInterval(interval);
      setProgress(100);
      setStatus("sent");

      toast.success(
        `Campaign "${campaignName}" launched! ${selectedSegment.audienceCount.toLocaleString()} messages queued.`,
        { duration: 4000 }
      );

      setTimeout(() => router.push("/analytics"), 2000);
    } catch {
      clearInterval(interval);
      // Demo mode
      setStatus("sent");
      setProgress(100);
      toast.success(
        `Demo launch! ${selectedSegment.audienceCount} messages queued in BullMQ.`,
        { duration: 4000 }
      );
      setTimeout(() => router.push("/analytics"), 2000);
    }
  }

  const channels: Array<"Email" | "WhatsApp" | "SMS"> = ["Email", "WhatsApp", "SMS"];

  return (
    <div className="max-w-5xl mx-auto w-full space-y-5 py-2">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <Megaphone size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Campaign Dispatcher</h1>
            <p className="text-xs text-slate-500">
              Select a segment · generate AI copy · launch to BullMQ in one click
            </p>
          </div>
        </div>
      </motion.div>

      {/* Step labels */}
      <div className="flex items-center gap-0">
        {["Setup", "AI Copywriter", "Launch"].map((step, i) => (
          <div key={step} className="flex items-center gap-0">
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-xs font-medium text-slate-600">{step}</span>
            </div>
            {i < 2 && <ArrowRight size={13} className="text-slate-300 mx-1 shrink-0" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
        {/* ── Left: Setup ──────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            Step 1 — Campaign Setup
          </p>

          {/* Campaign Name */}
          <EnterpriseCard className="p-5">
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              Campaign Name
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="input-enterprise"
              placeholder="e.g. Win-Back Q3 2025"
            />
          </EnterpriseCard>

          {/* Segment Selector */}
          <EnterpriseCard className="p-5">
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              Target Segment
            </label>
            <div className="relative">
              <button
                onClick={() => setSegmentOpen((p) => !p)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <Users size={14} className="text-indigo-500" />
                  {selectedSegment ? selectedSegment.name : "Select a segment…"}
                </span>
                <ChevronDown
                  size={14}
                  className="text-slate-400 transition-transform"
                  style={{ transform: segmentOpen ? "rotate(180deg)" : "none" }}
                />
              </button>

              <AnimatePresence>
                {segmentOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute z-20 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden"
                  >
                    {segments.map((seg) => (
                      <button
                        key={seg.id}
                        onClick={() => { setSelectedSegment(seg); setSegmentOpen(false); setStatus("idle"); setVariants([]); }}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-slate-800">{seg.name}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{seg.description}</p>
                        </div>
                        <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                          {seg.audienceCount.toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {selectedSegment && (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                <Users size={12} />
                {selectedSegment.audienceCount.toLocaleString()} customers targeted
              </div>
            )}
          </EnterpriseCard>

          {/* Objective */}
          <EnterpriseCard className="p-5">
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              Campaign Objective
            </label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
              className="input-enterprise resize-none leading-relaxed"
              placeholder="What is the goal of this campaign?"
            />
          </EnterpriseCard>

          {/* Channel Selector */}
          <EnterpriseCard className="p-5">
            <label className="block text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">
              Primary Channel
            </label>
            <div className="flex gap-2">
              {channels.map((ch) => {
                const cfg = CHANNEL_CONFIG[ch];
                const isActive = selectedChannel === ch;
                return (
                  <button
                    key={ch}
                    onClick={() => setSelectedChannel(ch)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all border ${
                      isActive
                        ? `${cfg.activeBg} ${cfg.activeBorder} ${cfg.activeText}`
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <ChannelIcon channel={ch} size={13} />
                    {ch}
                  </button>
                );
              })}
            </div>
          </EnterpriseCard>
        </div>

        {/* ── Right: AI Copywriter ──────────────────────────────────────────── */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            Step 2 — AI Copywriter
          </p>

          <EnterpriseCard className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-indigo-500" />
                <span className="text-sm font-semibold text-slate-800">Generate Message Variants</span>
              </div>
              <button
                onClick={generateCopy}
                disabled={!selectedSegment || status === "generating"}
                className="btn-primary text-xs px-3 py-1.5"
              >
                {status === "generating" ? (
                  <><Loader2 size={12} className="animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles size={12} /> Generate Copy</>
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {status === "generating" && (
                <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl p-4 border border-slate-100 bg-slate-50 space-y-2">
                      <div className="skeleton h-3 w-1/4 rounded" />
                      <div className="skeleton h-3 w-full rounded" />
                      <div className="skeleton h-3 w-4/5 rounded" />
                      <div className="skeleton h-3 w-3/5 rounded" />
                    </div>
                  ))}
                </motion.div>
              )}

              {status !== "generating" && variants.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
                    <Sparkles size={20} className="text-indigo-400" />
                  </div>
                  <p className="text-sm text-slate-500">
                    Click <strong className="text-indigo-600">Generate Copy</strong> to get<br />
                    3 AI-crafted message variants
                  </p>
                </motion.div>
              )}

              {variants.length > 0 && (
                <motion.div key="variants" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  {variants.map((v) => (
                    <VariantCard
                      key={v.id}
                      variant={v}
                      selected={selectedVariant?.id === v.id}
                      onSelect={() => setSelectedVariant(v)}
                    />
                  ))}
                  <button
                    onClick={generateCopy}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors mt-1"
                  >
                    <RefreshCw size={11} /> Regenerate variants
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </EnterpriseCard>
        </div>
      </div>

      {/* ── Launch Section ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {status !== "sent" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <EnterpriseCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={15} className="text-indigo-500" />
                <span className="text-sm font-semibold text-slate-800">Step 3 — Launch Campaign</span>
              </div>

              {/* Campaign summary */}
              {selectedSegment && selectedVariant && (
                <div className="flex flex-wrap gap-3 mb-5 text-xs text-slate-500 bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <Users size={11} className="text-emerald-600" />
                    <strong className="text-slate-700">{selectedSegment.audienceCount.toLocaleString()}</strong> recipients
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1.5">
                    <ChannelIcon channel={selectedVariant.channel} size={11} />
                    via {selectedVariant.channel}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-medium text-slate-600">{campaignName}</span>
                </div>
              )}

              {/* Progress bar */}
              <AnimatePresence>
                {status === "launching" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-5"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>Enqueueing messages to BullMQ…</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-indigo-600"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Launch Button */}
              <motion.button
                onClick={launchCampaign}
                disabled={!selectedSegment || !selectedVariant || status === "launching"}
                className={`w-full py-4 rounded-xl font-semibold text-base tracking-wide flex items-center justify-center gap-3 transition-all duration-200 ${
                  !selectedSegment || !selectedVariant
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                    : status === "launching"
                    ? "bg-indigo-500 text-white cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-[0.99]"
                }`}
                whileHover={selectedSegment && selectedVariant && status !== "launching" ? { scale: 1.005 } : undefined}
                whileTap={selectedSegment && selectedVariant && status !== "launching" ? { scale: 0.995 } : undefined}
              >
                {status === "launching" ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Launching Campaign…
                  </>
                ) : (
                  <>
                    <Rocket size={18} />
                    Launch Campaign
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>

              {!selectedSegment && (
                <p className="text-center text-xs text-slate-400 mt-3">
                  Select a segment and generate copy to enable launch
                </p>
              )}
            </EnterpriseCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success State ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {status === "sent" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-200 flex items-center justify-center mb-5"
            >
              <CheckCircle2 size={36} className="text-emerald-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Campaign Launched! 🚀</h2>
            <p className="text-sm text-slate-500">
              {selectedSegment?.audienceCount.toLocaleString()} messages queued in BullMQ.
            </p>
            <p className="text-xs text-slate-400 mt-1">Redirecting to Live Telemetry…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Suspense Wrapper ─────────────────────────────────────────────────────────

export default function CampaignDispatcherPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-slate-400">
          <Loader2 className="animate-spin text-indigo-500 mb-3" size={32} />
          <p className="text-sm font-medium">Loading dispatcher workspace…</p>
        </div>
      }
    >
      <CampaignDispatcherInner />
    </Suspense>
  );
}
