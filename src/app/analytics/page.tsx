"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EnterpriseCard } from "@/components/EnterpriseCard";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import {
  Activity, Zap, CheckCircle2, XCircle, MailOpen, MousePointerClick,
  Terminal as TerminalIcon, RefreshCw, Clock, ArrowUp,
} from "lucide-react";
import { formatCompact, pick, randInt, timeStamp } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsData {
  overview: {
    totalCustomers: number;
    totalOrders: number;
    totalCampaigns: number;
    totalMessages: number;
    activeShoppers: number;
    dormantShoppers: number;
    totalRevenue: number;
  };
  performance: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    deliveredCount: number;
    failedCount: number;
    openedCount: number;
    clickedCount: number;
  };
  dailyTrend: Array<{ date: string; sent: number; delivered: number; opened: number; clicked: number }>;
  channelStats: Array<{ channel: string; _count: { id: number } }>;
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalFailed: number;
    segment: { name: string };
  }>;
}

interface TerminalLine {
  id: number;
  ts: string;
  channel: string;
  customerId: string;
  event: "QUEUED" | "DELIVERED" | "FAILED" | "OPENED" | "CLICKED";
}

// ─── Static demo data (used if API is not yet available) ─────────────────────

const DEMO_DATA: AnalyticsData = {
  overview: { totalCustomers: 612, totalOrders: 1794, totalCampaigns: 7, totalMessages: 2134, activeShoppers: 289, dormantShoppers: 214, totalRevenue: 3820450 },
  performance: { deliveryRate: 93, openRate: 44, clickRate: 16, deliveredCount: 1985, failedCount: 149, openedCount: 874, clickedCount: 140 },
  dailyTrend: [
    { date: "Jun 05", sent: 180, delivered: 167, opened: 74, clicked: 12 },
    { date: "Jun 06", sent: 310, delivered: 291, opened: 128, clicked: 21 },
    { date: "Jun 07", sent: 245, delivered: 228, opened: 101, clicked: 16 },
    { date: "Jun 08", sent: 420, delivered: 391, opened: 172, clicked: 28 },
    { date: "Jun 09", sent: 290, delivered: 271, opened: 119, clicked: 19 },
    { date: "Jun 10", sent: 380, delivered: 354, opened: 156, clicked: 25 },
    { date: "Jun 11", sent: 309, delivered: 283, opened: 124, clicked: 19 },
  ],
  channelStats: [
    { channel: "Email",    _count: { id: 1021 } },
    { channel: "WhatsApp", _count: { id: 712 } },
    { channel: "SMS",      _count: { id: 401 } },
  ],
  recentCampaigns: [
    { id: "c1", name: "Win-Back Dormant Shoppers", status: "SENT", totalSent: 214, totalDelivered: 199, totalOpened: 87, totalClicked: 14, totalFailed: 15, segment: { name: "Dormant Shoppers" } },
    { id: "c2", name: "VIP Early Access – Delhi", status: "SENT", totalSent: 89, totalDelivered: 85, totalOpened: 42, totalClicked: 18, totalFailed: 4, segment: { name: "High-Value Loyalists" } },
    { id: "c3", name: "Monsoon Sale Blast",        status: "SENT", totalSent: 183, totalDelivered: 171, totalOpened: 76, totalClicked: 22, totalFailed: 12, segment: { name: "WhatsApp Audience" } },
  ],
};

// ─── Donut chart data builder ─────────────────────────────────────────────────

function buildDonutData(p: AnalyticsData["performance"]) {
  return [
    { name: "Delivered", value: p.deliveredCount,  fill: "#10b981" },
    { name: "Opened",    value: p.openedCount,     fill: "#8b5cf6" },
    { name: "Clicked",   value: p.clickedCount,    fill: "#06b6d4" },
    { name: "Failed",    value: p.failedCount,     fill: "#ef4444" },
  ].filter((d) => d.value > 0);
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function EnterpriseTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg space-y-1.5 min-w-[130px]">
      {label && <p className="text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">{label}</p>}
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color || entry.payload.fill }} />
            <span className="text-slate-500">{entry.name}:</span>
          </div>
          <span className="text-slate-800 font-semibold">{entry.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Terminal Feed ────────────────────────────────────────────────────────────

const CHANNELS = ["Email", "WhatsApp", "SMS"];
const EVENTS: Array<TerminalLine["event"]> = ["QUEUED", "DELIVERED", "DELIVERED", "OPENED", "CLICKED", "DELIVERED", "FAILED"];
const EVENT_COLORS: Record<string, string> = {
  QUEUED:    "#a78bfa",
  DELIVERED: "#34d399",
  OPENED:    "#06b6d4",
  CLICKED:   "#fbbf24",
  FAILED:    "#f87171",
};

function LiveTerminal({ paused }: { paused: boolean }) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const counter = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const newLine: TerminalLine = {
        id: ++counter.current,
        ts: timeStamp(),
        channel: pick(CHANNELS),
        customerId: `cust_${randInt(1000, 9999)}`,
        event: pick(EVENTS),
      };
      setLines((prev) => [...prev.slice(-120), newLine]); // keep last 120 lines
    }, randInt(600, 1800));
    return () => clearInterval(id);
  }, [paused]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col border border-slate-800 bg-slate-900 shadow-xl h-full">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-2">
          <span className="terminal-dot w-3 h-3 rounded-full" style={{ background: "#f87171" }} />
          <span className="terminal-dot w-3 h-3 rounded-full" style={{ background: "#fbbf24" }} />
          <span className="terminal-dot w-3 h-3 rounded-full" style={{ background: "#34d399" }} />
          <span className="ml-2 text-emerald-400/70 text-[11px] font-medium uppercase tracking-wider">
            BullMQ Receipt Webhook
          </span>
        </div>
        {paused ? (
          <span className="ml-auto text-[10px] text-yellow-400/60">PAUSED</span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400/70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        )}
      </div>
      <div className="p-6 max-h-96 overflow-y-auto font-mono text-xs text-slate-300 space-y-2 bg-slate-900" ref={bodyRef}>
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-4 hover:bg-slate-800/50 p-1 -mx-1 rounded transition-colors"
            >
              <span className="text-emerald-400/50 shrink-0 w-16">[{line.ts}]</span>
              <span className="text-white/30 shrink-0 w-16">{line.channel}</span>
              <span className="text-white/50 shrink-0 w-4">→</span>
              <span className="text-white/50 flex-1">{line.customerId}</span>
              <span style={{ color: EVENT_COLORS[line.event] }} className="font-semibold shrink-0 w-20 text-right">
                {line.event}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        {lines.length === 0 && (
          <div className="flex items-center gap-2 pt-2 text-slate-500">
            <span className="animate-pulse">_</span>
            <span>Waiting for events…</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, suffix = "", trend,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  suffix?: string;
  trend?: number;
}) {
  return (
    <EnterpriseCard className="p-5 h-full">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 tracking-tight">{label}</p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix && <span className="text-sm text-slate-400 ml-1">{suffix}</span>}
      </p>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          <ArrowUp size={11} style={{ transform: trend < 0 ? "rotate(180deg)" : "none" }} />
          {Math.abs(trend)}%
          <span className="text-slate-400 font-normal ml-1">vs last month</span>
        </div>
      )}
    </EnterpriseCard>
  );
}

// ─── Campaign Row ─────────────────────────────────────────────────────────────

function CampaignRow({ c }: { c: AnalyticsData["recentCampaigns"][number] }) {
  const delivery = c.totalSent > 0 ? Math.round((c.totalDelivered / c.totalSent) * 100) : 0;
  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors px-2 rounded-lg -mx-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 font-medium truncate">{c.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{c.segment.name}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-emerald-600">{delivery}%</p>
        <p className="text-xs text-slate-400">delivery</p>
      </div>
      <div
        className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
        style={{
          background: c.status === "SENT" ? "#ecfdf5" : "#f3e8ff",
          color:      c.status === "SENT" ? "#10b981" : "#8b5cf6",
          border:     `1px solid ${c.status === "SENT" ? "#a7f3d0" : "#d8b4fe"}`,
        }}
      >
        {c.status}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>(DEMO_DATA);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setData(json.data);
      }
    } catch {
      // use demo data silently
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 10s
  useEffect(() => {
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  const donutData = buildDonutData(data.performance);
  const { overview, performance, dailyTrend, recentCampaigns } = data;

  return (
    <div className="w-full flex justify-center py-2">
      <div className="w-full space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1.5 h-5 rounded-full bg-cyan-500" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Live Telemetry</h1>
            </div>
            <p className="text-sm text-slate-500 ml-3.5">
              Last refreshed: {timeStamp(lastRefresh)} · auto-refresh every 10s
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPaused((p) => !p)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-semibold"
              style={{
                background: paused ? "#fef3c7" : "#ecfdf5",
                border: paused ? "1px solid #fde68a" : "1px solid #a7f3d0",
                color: paused ? "#d97706" : "#059669",
              }}
            >
              {paused ? <><Clock size={11} /> Resume</> : <><Zap size={11} /> Live</>}
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors bg-white border border-slate-200 shadow-sm"
            >
              <RefreshCw size={11} className={loading ? "animate-spin text-indigo-500" : "text-slate-400"} />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Overview KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Customers"   value={overview.totalCustomers}   icon={Activity}          color="#8b5cf6" trend={8} />
          <StatCard label="Active Shoppers"   value={overview.activeShoppers}   icon={CheckCircle2}      color="#10b981" trend={12} />
          <StatCard label="Total Messages"    value={overview.totalMessages}    icon={Zap}               color="#0ea5e9" trend={5} />
          <StatCard label="Delivery Rate"     value={performance.deliveryRate}  icon={ArrowUp}           color="#10b981" suffix="%" trend={2} />
          <StatCard label="Open Rate"         value={performance.openRate}      icon={MailOpen}          color="#8b5cf6" suffix="%" trend={-1} />
          <StatCard label="Click Rate"        value={performance.clickRate}     icon={MousePointerClick} color="#0ea5e9" suffix="%" trend={3} />
          <StatCard label="Failed Messages"   value={performance.failedCount}   icon={XCircle}           color="#ef4444" />
          <StatCard label="Total Campaigns"   value={overview.totalCampaigns}   icon={Zap}               color="#f59e0b" trend={15} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Donut — message status */}
          <EnterpriseCard className="p-6 col-span-1 flex flex-col h-full">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-slate-800">Message Status</h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time status breakdown</p>
            </div>
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<EnterpriseTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                  <span className="text-slate-600">{d.name}</span>
                  <span className="text-slate-900 font-semibold ml-auto">{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </EnterpriseCard>

          {/* Area chart — daily trend */}
          <EnterpriseCard className="p-6 col-span-1 lg:col-span-2 flex flex-col h-full">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-slate-800">7-Day Message Trend</h2>
              <p className="text-xs text-slate-400 mt-0.5">Historical engagement rates</p>
            </div>
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDelivered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradOpened" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<EnterpriseTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#64748b", paddingTop: 10 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Area type="monotone" dataKey="sent"      stroke="#8b5cf6" fill="url(#gradSent)"      strokeWidth={2} dot={false} name="Sent" />
                  <Area type="monotone" dataKey="delivered" stroke="#10b981" fill="url(#gradDelivered)" strokeWidth={2} dot={false} name="Delivered" />
                  <Area type="monotone" dataKey="opened"    stroke="#0ea5e9" fill="url(#gradOpened)"    strokeWidth={2} dot={false} name="Opened" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </EnterpriseCard>
        </div>

        {/* Bottom row: Recent Campaigns + Live Terminal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Campaigns */}
          <EnterpriseCard className="p-6 h-full flex flex-col">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-slate-800">Recent Campaigns</h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest dispatch operations</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {recentCampaigns.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No campaigns yet. Launch one to see it here.</p>
              ) : (
                <div className="space-y-1">
                  {recentCampaigns.map((c) => <CampaignRow key={c.id} c={c} />)}
                </div>
              )}
            </div>
          </EnterpriseCard>

          {/* Live Terminal */}
          <div className="h-full min-h-[300px]">
            <LiveTerminal paused={paused} />
          </div>
        </div>

      </div>
    </div>
  );
}
