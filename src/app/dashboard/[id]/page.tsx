import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { MapView } from "@/components/MapView";
import { ItineraryTimeline } from "@/components/ItineraryTimeline";
import { BudgetSummary } from "@/components/BudgetSummary";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import type { BudgetLineItem, ItineraryDay, TravelPreference } from "@/types/travel";

export const dynamic = "force-dynamic";

type DetailParams = {
  params: {
    id: string;
  };
};

type ItineraryRecord = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  travelers: number;
  budget: number;
  currency: string;
  preferences: TravelPreference | null;
  plan_days: ItineraryDay[] | null;
  budget_items: BudgetLineItem[] | null;
};

export default async function ItineraryDetailPage({ params }: DetailParams) {
  const client = createSupabaseServerClient();
  if (!client) {
    notFound();
  }

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session) {
    redirect("/auth");
  }

  const { data, error } = await client
    .from("itineraries")
    .select(
      "id, title, destination, start_date, end_date, travelers, budget, currency, preferences, plan_days, budget_items"
    )
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const itinerary = data as ItineraryRecord;
  const days = itinerary.plan_days ?? [];
  const budgetItems = itinerary.budget_items ?? [];

  const replanParams = new URLSearchParams({
    destination: itinerary.destination,
    startDate: itinerary.start_date,
    endDate: itinerary.end_date,
    travelers: String(itinerary.travelers),
    budget: String(Math.max(0, itinerary.budget)),
  });

  if (itinerary.preferences) {
    const { pace, transport, accommodation, interestTags, dietary } = itinerary.preferences;
    replanParams.set("pace", pace);
    replanParams.set("transport", transport);
    replanParams.set("accommodation", accommodation);
    if (interestTags?.length) {
      replanParams.set("interestTags", interestTags.join(","));
    }
    if (dietary?.length) {
      replanParams.set("dietary", dietary.join(","));
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-cyan-600">智能行程详情</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{itinerary.title}</h1>
          <p className="text-sm text-slate-500">
            {itinerary.destination} · {itinerary.start_date} - {itinerary.end_date} · {itinerary.travelers} 人同行
          </p>
          <p className="mt-2 text-xs text-slate-500">
            预算：{itinerary.currency} {itinerary.budget.toFixed(0)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            返回列表
          </Link>
          <Link
            href={`/?${replanParams.toString()}`}
            className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-cyan-700"
          >
            重新规划
          </Link>
        </div>
      </header>

      {itinerary.preferences && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">旅客偏好</h2>
          <dl className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">旅行节奏</dt>
              <dd>{itinerary.preferences.pace}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">兴趣标签</dt>
              <dd>{itinerary.preferences.interestTags.join("、") || "未指定"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">交通偏好</dt>
              <dd>{itinerary.preferences.transport}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">住宿层级</dt>
              <dd>{itinerary.preferences.accommodation}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">饮食要求</dt>
              <dd>{itinerary.preferences.dietary.join("、") || "无特殊要求"}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900">地图路线预览</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Suspense fallback={<p className="text-sm text-slate-500">地图加载中…</p>}>
            <MapView days={days} />
          </Suspense>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ItineraryTimeline days={days} />
        <BudgetSummary items={budgetItems} />
      </section>
    </div>
  );
}
