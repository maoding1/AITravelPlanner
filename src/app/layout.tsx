import Link from "next/link";
import type { Metadata } from "next";
import { UserBadge } from "@/components/UserBadge";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Travel Planner",
  description: "Voice-first AI travel planning assistant with Supabase sync and budget insights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY;

  return (
    <html lang="zh-Hans">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
              <Link href="/" className="text-base font-semibold text-slate-900">
                AI Travel Planner
              </Link>
              <UserBadge />
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
        {amapKey ? (
          <script
            src={`https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.PlaceSearch`}
            async
          />
        ) : null}
      </body>
    </html>
  );
}
