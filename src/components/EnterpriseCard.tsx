"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface EnterpriseCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  /** If true, card lifts subtly on hover */
  hoverable?: boolean;
  /** Optional top-border accent stripe */
  accent?: "indigo" | "emerald" | "rose" | "sky" | "none";
}

const ACCENT_CLASS: Record<string, string> = {
  indigo:  "border-t-2 border-t-indigo-500",
  emerald: "border-t-2 border-t-emerald-500",
  rose:    "border-t-2 border-t-rose-500",
  sky:     "border-t-2 border-t-sky-500",
  none:    "",
};

export function EnterpriseCard({
  children,
  className,
  hoverable = false,
  accent = "none",
  ...rest
}: EnterpriseCardProps) {
  return (
    <motion.div
      className={cn(
        "w-full bg-white border border-slate-200 rounded-xl shadow-sm transition-shadow duration-200",
        ACCENT_CLASS[accent],
        hoverable && "hover:shadow-md cursor-pointer",
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
