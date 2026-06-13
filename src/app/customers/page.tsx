"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { EnterpriseCard } from "@/components/EnterpriseCard";
import { Users, Search, Mail, Phone, MapPin, ShoppingBag, TrendingUp } from "lucide-react";
import { formatINR } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  preferredChannel: string;
  totalSpent: number;
  orderCount: number;
  lastPurchaseDate: string | null;
}

const CHANNEL_COLORS: Record<string, string> = {
  Email:    "#0ea5e9",
  WhatsApp: "#10b981",
  SMS:      "#8b5cf6",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "40",
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/customers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.data ?? []);
        setTotal(data.pagination?.total ?? 0);
      }
    } catch {
      // demo mode — empty list is fine
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="w-full flex justify-center py-2">
      <div className="w-full space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-100 shadow-sm">
              <Users size={18} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Customer Data</h1>
              <p className="text-sm text-slate-500">{total.toLocaleString()} customers in your CRM</p>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <EnterpriseCard className="p-4 w-full">
          <div className="flex items-center gap-3">
            <Search size={16} className="text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email…"
              className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
            {loading && (
              <span className="text-xs text-slate-400 animate-pulse font-medium bg-slate-100 px-2 py-1 rounded-md">Loading...</span>
            )}
          </div>
        </EnterpriseCard>

        {/* Table */}
        <EnterpriseCard className="overflow-hidden p-0 w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  {["Customer", "Contact", "City", "Channel", "Spent", "Orders", "Last Purchase"].map((h) => (
                    <th key={h} className="px-6 py-4 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.01, duration: 0.2 }}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm"
                          style={{ background: `hsl(${(c.name.charCodeAt(0) * 47) % 360}, 65%, 50%)` }}
                        >
                          {c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-slate-900 font-semibold">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Mail size={12} className="text-slate-400" /> {c.email}
                        </div>
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone size={12} className="text-slate-400" /> {c.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin size={12} className="text-slate-400" /> {c.city ?? "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2.5 py-1 rounded-md text-[11px] font-semibold"
                        style={{
                          background: `${CHANNEL_COLORS[c.preferredChannel] ?? "#64748b"}15`,
                          color: CHANNEL_COLORS[c.preferredChannel] ?? "#475569",
                          border: `1px solid ${CHANNEL_COLORS[c.preferredChannel] ?? "#cbd5e1"}40`,
                        }}
                      >
                        {c.preferredChannel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                        <TrendingUp size={13} className="text-emerald-500" />
                        {formatINR(Number(c.totalSpent))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                        <ShoppingBag size={12} className="text-slate-400" /> {c.orderCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">
                      {c.lastPurchaseDate
                        ? new Date(c.lastPurchaseDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
                        : "Never"}
                    </td>
                  </motion.tr>
                ))}
                {!loading && customers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm text-slate-500 bg-slate-50/50">
                      No customers found. Run the seed script to populate demo data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 40 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
              <span className="text-xs font-medium text-slate-500">
                Showing {(page - 1) * 40 + 1}–{Math.min(page * 40, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 40 >= total}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-300 disabled:opacity-50 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </EnterpriseCard>

      </div>
    </div>
  );
}
