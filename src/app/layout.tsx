import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "XENO CRM", template: "%s | XENO CRM" },
  description: "AI-Native Mini CRM for retail brands — powered by BullMQ, Prisma & Next.js.",
  keywords: ["CRM", "marketing", "campaigns", "AI", "segmentation"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
        {/* Sidebar */}
        <Sidebar />

        {/* Main scrollable content region */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <main className="w-full max-w-7xl mx-auto p-6 lg:p-8 flex flex-col justify-start">
            {children}
          </main>
        </div>

        {/* Global toast provider — enterprise style */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#ffffff",
              color: "#0f172a",
              border: "1px solid #e2e8f0",
              fontSize: "0.875rem",
              borderRadius: "0.75rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.05)",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#ffffff" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
            },
          }}
        />
      </body>
    </html>
  );
}
