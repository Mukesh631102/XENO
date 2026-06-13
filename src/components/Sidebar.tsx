"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  BarChart3,
  Bot,
  Zap,
  Sparkles,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",           label: "Dashboard",       icon: LayoutDashboard },
  { href: "/copilot",             label: "Smart Assistant", icon: Sparkles        },
  { href: "/audience-builder",    label: "AI Audience",     icon: Bot             },
  { href: "/campaign-dispatcher", label: "Campaigns",       icon: Megaphone       },
  { href: "/analytics",           label: "Live Telemetry",  icon: BarChart3       },
  { href: "/customers",           label: "Customers",       icon: Users           },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
          <Zap size={15} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm leading-none tracking-wide">XENO</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">CRM Platform</p>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-6 pt-5 pb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Navigation</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="relative block group">
              {/* Active indicator slide */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-indigo-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              {/* Active left accent bar */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-bar"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-indigo-600"
                />
              )}

              <div
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 ${
                  isActive
                    ? "text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  size={16}
                  className={`shrink-0 transition-colors ${
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <span className={`text-sm ${isActive ? "font-semibold" : "font-medium"}`}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom status badge */}
      <div className="mx-3 mb-5">
        <div className="rounded-lg p-3 bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-slate-600 font-medium">BullMQ Active</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Redis queue · Workers online
          </p>
        </div>
      </div>
    </aside>
  );
}
