import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { DashboardItineraryList } from "@/components/DashboardItineraryList";

type ItineraryRow = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const client = createSupabaseServerClient();

  if (!client) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Supabase 未配置</h1>
        <p className="text-sm text-slate-600">
          请在运行环境中提供 <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> 与
          <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 以加载个人行程。
        </p>
      </div>
    );
  }

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-12">
        <h1 className="text-2xl font-semibold text-slate-900">请登录后查看行程</h1>
        <p className="text-sm text-slate-600">使用 Supabase Auth 登录后即可同步云端行程和偏好设置。</p>
        <Link
          href="/auth"
          className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-cyan-700"
        >
          去登录
        </Link>
      </div>
    );
  }

  const { data: itineraries } = await client
    .from("itineraries")
    .select("id, title, destination, start_date, end_date, budget, currency, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">我的行程</h1>
          <p className="text-sm text-slate-500">云端保存的历史计划，可随时回顾和调整。</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          返回规划器
        </Link>
      </header>

      <DashboardItineraryList items={(itineraries as ItineraryRow[] | null) ?? []} />
    </div>
  );
}
