"use client";

import React from "react";
import { GlassCard } from "@/components/GlassCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion } from "framer-motion";

// Sample static data – replace with real API call in production
const campaignData = [
  { name: "Week 1", delivered: 1200, opened: 750, converted: 120 },
  { name: "Week 2", delivered: 1500, opened: 950, converted: 180 },
  { name: "Week 3", delivered: 1300, opened: 820, converted: 150 },
  { name: "Week 4", delivered: 1700, opened: 1150, converted: 210 },
];

export default function DashboardContent() {
  return (
    <motion.main
      className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 p-8 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl font-bold mb-8 text-center">Campaign Performance</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Delivery Rate Card */}
        <GlassCard className="bg-white/5 backdrop-blur-xl">
          <h2 className="text-xl font-semibold mb-4">Delivery Rate</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={campaignData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} tick={{ fill: "#fff" }} />
              <Tooltip contentStyle={{ background: "#222", border: "none" }} />
              <Bar dataKey="delivered" fill="#00C9A7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Open Rate Card */}
        <GlassCard className="bg-white/5 backdrop-blur-xl">
          <h2 className="text-xl font-semibold mb-4">Open Rate</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={campaignData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} tick={{ fill: "#fff" }} />
              <Tooltip contentStyle={{ background: "#222", border: "none" }} />
              <Bar dataKey="opened" fill="#FFB400" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Conversion Card */}
        <GlassCard className="bg-white/5 backdrop-blur-xl md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Conversions</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={campaignData}>
              <XAxis dataKey="name" tick={{ fill: "#fff" }} />
              <YAxis tick={{ fill: "#fff" }} />
              <Tooltip contentStyle={{ background: "#222", border: "none" }} />
              <Legend />
              <Bar dataKey="delivered" stackId="a" fill="#00C9A7" />
              <Bar dataKey="opened" stackId="a" fill="#FFB400" />
              <Bar dataKey="converted" stackId="a" fill="#FF4C4C" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </motion.main>
  );
}
