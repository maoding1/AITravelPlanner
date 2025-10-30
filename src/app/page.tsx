import { Suspense } from "react";
import Link from "next/link";
import { PlannerWorkspace } from "@/components/PlannerWorkspace";
import { MapView } from "@/components/MapView";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { createPlannerPreference, type PlannerFormState } from "@/lib/plannerDefaults";
import type { TravelPreference } from "@/types/travel";
import type { BudgetLineItem, ItineraryDay } from "@/types/travel";

async function loadLatestItinerary(): Promise<{ days: ItineraryDay[]; budget: BudgetLineItem[] }> {
  try {
    const client = createSupabaseServerClient();
    if (!client) {
      return { days: [], budget: [] };
    }
    const {
      data: { session },
    } = await client.auth.getSession();

    if (!session) {
      return { days: [], budget: [] };
    }

    const { data } = await client
      .from("itineraries")
      .select("plan_days, budget_items")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      days: (data?.plan_days as ItineraryDay[]) ?? [],
      budget: (data?.budget_items as BudgetLineItem[]) ?? [],
    };
  } catch (error) {
    console.error("Failed to load cached itinerary", error);
    return { days: [], budget: [] };
  }
}

type PageSearchParams = Record<string, string | string[]>;

const normalizeParam = (value: string | string[] | undefined): string | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

const splitListParam = (value: string | undefined): string[] | undefined => {
  if (!value) return undefined;
  return value
    .split(/[、,，\s]+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

const parsePlannerDefaults = (
  searchParams?: PageSearchParams,
): { formDefaults?: Partial<PlannerFormState>; preferenceDefaults?: TravelPreference } => {
  if (!searchParams) {
    return {};
  }

  const destination = normalizeParam(searchParams.destination);
  const startDate = normalizeParam(searchParams.startDate);
  const endDate = normalizeParam(searchParams.endDate);
  const travelersRaw = normalizeParam(searchParams.travelers);
  const budgetRaw = normalizeParam(searchParams.budget);
  const notes = normalizeParam(searchParams.notes);

  const formDefaults: Partial<PlannerFormState> = {};

  if (destination) formDefaults.destination = destination;
  if (startDate) formDefaults.startDate = startDate;
  if (endDate) formDefaults.endDate = endDate;

  if (travelersRaw) {
    const travelers = Number.parseInt(travelersRaw, 10);
    if (!Number.isNaN(travelers) && travelers > 0) {
      formDefaults.travelers = travelers;
    }
  }

  if (budgetRaw) {
    const budget = Number.parseInt(budgetRaw, 10);
    if (!Number.isNaN(budget) && budget > 0) {
      formDefaults.budget = budget;
    }
  }

  if (notes) {
    formDefaults.notes = notes;
  }

  const pace = normalizeParam(searchParams.pace) as TravelPreference["pace"] | undefined;
  const transport = normalizeParam(searchParams.transport) as TravelPreference["transport"] | undefined;
  const accommodation = normalizeParam(searchParams.accommodation) as TravelPreference["accommodation"] | undefined;
  const interestTags = splitListParam(normalizeParam(searchParams.interestTags));
  const dietary = splitListParam(normalizeParam(searchParams.dietary));

  const hasPreferenceOverride =
    pace || transport || accommodation || (interestTags && interestTags.length) || (dietary && dietary.length);

  const preferenceDefaults = hasPreferenceOverride
    ? createPlannerPreference({
      pace,
      transport,
      accommodation,
      interestTags,
      dietary,
    })
    : undefined;

  return {
    formDefaults: Object.keys(formDefaults).length > 0 ? formDefaults : undefined,
    preferenceDefaults,
  };
};

export default async function HomePage({ searchParams }: { searchParams?: PageSearchParams }) {
  const { days, budget } = await loadLatestItinerary();
  const { formDefaults, preferenceDefaults } = parsePlannerDefaults(searchParams);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10">
      <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-600 p-10 text-white shadow-lg">
        <p className="text-sm uppercase tracking-wide">AI Travel Planner</p>
        <h1 className="text-3xl font-bold md:text-4xl">语音驱动的智能旅行规划师</h1>
        <p className="max-w-2xl text-sm md:text-base text-cyan-50">
          用中文语音描述您的旅行梦想，AI 将自动生成包含路线、预算、地图与实时调整的全方位旅行计划。
          支持 Supabase 云端同步，多设备随时查看。
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/dashboard"
            className="rounded-full bg-white/15 px-4 py-2 font-medium text-white backdrop-blur hover:bg-white/25"
          >
            管理我的行程
          </Link>
          <span className="rounded-full bg-white/10 px-4 py-2">语音输入 · 地图可视化 · 预算助手</span>
        </div>
      </header>

      <Suspense fallback={<p className="text-sm text-slate-500">加载历史计划…</p>}>
        <PlannerWorkspace
          initialItinerary={days}
          initialBudget={budget}
          initialFormState={formDefaults}
          initialPreferences={preferenceDefaults}
        />
      </Suspense>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">地图探索</h2>
        <p className="text-sm text-slate-500">结合高德地图 API 查看每日行程聚集区域，实时调整动线。</p>
        <MapView days={days} />
      </section>
    </div>
  );
}
