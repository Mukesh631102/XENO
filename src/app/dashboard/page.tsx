"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EnterpriseCard } from "@/components/EnterpriseCard";
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from "recharts";
import {
  Users, ShoppingBag, Megaphone, TrendingUp, TrendingDown,
  Zap, Activity
} from "lucide-react";
import { formatCompact } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Overview {
  totalCustomers: number;
  totalOrders: number;
  totalCampaigns: number;
  totalMessages: number;
  totalRevenue: number;
  activeShoppers: number;
}

interface DayTrend {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
}

// ─── Demo data ──────────────────────────────────────────────────────────────

const DEMO_OVERVIEW: Overview = {
  totalCustomers: 612,
  totalOrders: 1794,
  totalCampaigns: 7,
  totalMessages: 2134,
  totalRevenue: 3820450,
  activeShoppers: 289,
};

const DEMO_TREND: DayTrend[] = [
  { date: "Mon", sent: 310, delivered: 291, opened: 128 },
  { date: "Tue", sent: 245, delivered: 228, opened: 101 },
  { date: "Wed", sent: 420, delivered: 391, opened: 172 },
  { date: "Thu", sent: 290, delivered: 271, opened: 119 },
  { date: "Fri", sent: 380, delivered: 354, opened: 156 },
  { date: "Sat", sent: 180, delivered: 167, opened: 74  },
  { date: "Sun", sent: 309, delivered: 283, opened: 124 },
];

const MESSAGE_STATUS_DATA = [
  { name: "Delivered", value: 1845, color: "#10b981" },
  { name: "Opened", value: 824, color: "#4f46e5" },
  { name: "Failed", value: 120, color: "#ef4444" },
];

const MOCK_TERMINAL_LOGS = [
  { time: "10:42:01", level: "INFO", message: "Campaign 'Win-Back Promo' dispatched successfully." },
  { time: "10:42:15", level: "WARN", message: "Rate limit threshold approaching on gateway 2." },
  { time: "10:43:05", level: "INFO", message: "Webhook received: 45 messages delivered." },
  { time: "10:44:12", level: "INFO", message: "Audience segment 'Inactive 30d' synced (1,240 records)." },
  { time: "10:45:00", level: "ERROR", message: "Failed to deliver message to +198****123 (Invalid number)." },
  { time: "10:45:30", level: "INFO", message: "Campaign 'VIP Early Access' scheduled for 12:00 PM." },
  { time: "10:46:10", level: "INFO", message: "Webhook received: 12 messages opened." },
];

// ─── Corporate Chart Tooltip ────────────────────────────────────────────────

function EnterpriseTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg space-y-1.5 min-w-[130px]">
      {label && (
        <p className="text-xs text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">{label}</p>
      )}
      {payload.map((e: any) => (
        <div key={e.name} className="flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: e.color || e.payload.fill || e.payload.color }} />
            <span className="text-slate-500">{e.name}:</span>
          </div>
          <span className="text-slate-800 font-semibold">{e.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend: string;
  trendUp: boolean;
  delay: number;
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, trend, trendUp, delay }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="col-span-1 lg:col-span-4"
    >
      <EnterpriseCard className="p-5 h-full">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-slate-500 tracking-tight">{label}</p>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: iconBg }}
          >
            <Icon size={15} style={{ color: iconColor }} />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight mb-2">{value}</p>
        <div className={`flex items-center gap-1 text-xs font-semibold ${trendUp ? "text-emerald-600" : "text-rose-600"}`}>
          {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {trend}
          <span className="text-slate-400 font-normal ml-1">vs last month</span>
        </div>
      </EnterpriseCard>
    </motion.div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview>(DEMO_OVERVIEW);
  const [trend, setTrend] = useState<DayTrend[]>(DEMO_TREND);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        setOverview(d.data.overview);
        if (d.data.dailyTrend?.length) setTrend(d.data.dailyTrend);
      })
      .catch(() => {}); // keep demo data on error
  }, []);

  const kpis: KpiCardProps[] = [
    {
      label: "Total Customers",
      value: formatCompact(overview.totalCustomers),
      icon: Users,
      iconBg: "#eef2ff",
      iconColor: "#4f46e5",
      trend: "↑ 12.4%",
      trendUp: true,
      delay: 0,
    },
    {
      label: "Total Orders",
      value: formatCompact(overview.totalOrders),
      icon: ShoppingBag,
      iconBg: "#f0fdf4",
      iconColor: "#16a34a",
      trend: "↑ 8.1%",
      trendUp: true,
      delay: 0.05,
    },
    {
      label: "Campaigns Sent",
      value: String(overview.totalCampaigns),
      icon: Megaphone,
      iconBg: "#fef3c7",
      iconColor: "#d97706",
      trend: "↑ 3 new",
      trendUp: true,
      delay: 0.1,
    },
  ];

  return (
    <div className="w-full py-2">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-1 mb-6"
      >
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-1.5 h-5 rounded-full bg-indigo-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        </div>
        <p className="text-sm text-slate-500 ml-3.5">
          Performance overview · campaign health · audience metrics
        </p>
      </motion.div>

      {/* 12-Column Grid Bento Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* Top Row: KPIs (3 cards, 4 cols each) */}
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}

        {/* Middle Row: Charts */}
        {/* Main Line Chart (8 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="col-span-1 lg:col-span-8"
        >
          <EnterpriseCard className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Campaign Delivery Timeline</h2>
                <p className="text-xs text-slate-400 mt-0.5">7-day message performance</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Zap size={12} className="text-indigo-500" />
                Last 7 days
              </div>
            </div>
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ left: -15, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<EnterpriseTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 12 }}
                    iconType="circle"
                    iconSize={7}
                  />
                  <Line type="monotone" dataKey="sent"      stroke="#4f46e5" strokeWidth={2} dot={false} name="Sent"      />
                  <Line type="monotone" dataKey="delivered" stroke="#9333ea" strokeWidth={2} dot={false} name="Delivered" />
                  <Line type="monotone" dataKey="opened"    stroke="#0ea5e9" strokeWidth={2} dot={false} name="Opened" strokeDasharray="5 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </EnterpriseCard>
        </motion.div>

        {/* Message Status Donut Chart (4 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="col-span-1 lg:col-span-4"
        >
          <EnterpriseCard className="p-6 h-full flex flex-col">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-slate-800">Message Status</h2>
              <p className="text-xs text-slate-400 mt-0.5">Overall delivery breakdown</p>
            </div>
            <div className="flex-1 min-h-[250px] relative flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={MESSAGE_STATUS_DATA}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {MESSAGE_STATUS_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<EnterpriseTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, color: "#64748b" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </EnterpriseCard>
        </motion.div>

        {/* Bottom Row: Live Terminal Webhook feed (12 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="col-span-1 lg:col-span-12"
        >
          <div className="rounded-2xl p-0 overflow-hidden flex flex-col border border-slate-800 bg-slate-900 shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-emerald-400" />
                <h2 className="text-sm font-semibold text-white tracking-wide">Live Terminal Webhook Feed</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs text-slate-400 font-mono">Connected</span>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto font-mono text-xs text-slate-300 space-y-2 bg-slate-900">
              {MOCK_TERMINAL_LOGS.map((log, i) => (
                <div key={i} className="flex items-start gap-4 hover:bg-slate-800/50 p-1 -mx-1 rounded transition-colors">
                  <span className="text-slate-500 shrink-0 w-16">{log.time}</span>
                  <span className={`shrink-0 w-12 font-semibold ${
                    log.level === 'INFO' ? 'text-sky-400' :
                    log.level === 'WARN' ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    [{log.level}]
                  </span>
                  <span className="flex-1 text-slate-300 break-words">{log.message}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 text-slate-500">
                <span className="animate-pulse">_</span>
                <span>Waiting for incoming webhooks...</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
