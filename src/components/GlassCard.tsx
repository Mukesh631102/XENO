"use client";

/**
 * GlassCard — backward-compatibility shim.
 * All former glassmorphism consumers now render an EnterpriseCard.
 * The old `tier`, `glow`, and `hoverable` props are accepted but
 * mapped to the new design system instead of applying glass effects.
 */

import { EnterpriseCard } from "@/components/EnterpriseCard";
import { type HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  /** @deprecated — kept for API compatibility; no longer applies blur */
  tier?: "default" | "heavy" | "sm";
  /** @deprecated — kept for API compatibility; now maps to EnterpriseCard accent */
  glow?: "violet" | "emerald" | "cyan" | "none";
  /** If true, card lifts subtly on hover */
  hoverable?: boolean;
}

const GLOW_TO_ACCENT: Record<string, "indigo" | "emerald" | "sky" | "none"> = {
  violet:  "indigo",
  emerald: "emerald",
  cyan:    "sky",
  none:    "none",
};

export function GlassCard({
  children,
  className,
  tier: _tier,
  glow = "none",
  hoverable = false,
  ...rest
}: GlassCardProps) {
  return (
    <EnterpriseCard
      className={className}
      accent={GLOW_TO_ACCENT[glow]}
      hoverable={hoverable}
      {...rest}
    >
      {children}
    </EnterpriseCard>
  );
}
