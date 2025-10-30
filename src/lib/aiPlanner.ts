import { randomUUID } from "crypto";
import type { AIPlannerRequest, AIPlannerResponse, BudgetLineItem, ItineraryDay } from "@/types/travel";

const aiProviderBaseUrl = process.env.AI_PROVIDER_URL ?? "";
const aiProviderApiKey = process.env.AI_PROVIDER_API_KEY ?? "";

const defaultModel = process.env.AI_PROVIDER_MODEL ?? "gpt-4o-mini";

type RawAIResponse = {
  itinerary?: unknown;
  budget?: unknown;
  tips?: unknown;
};

async function callLLM(prompt: string): Promise<RawAIResponse> {
  if (!aiProviderApiKey || !aiProviderBaseUrl) {
    throw new Error("AI provider configuration missing. Set AI_PROVIDER_URL and AI_PROVIDER_API_KEY.");
  }

  const requestUrl = `${aiProviderBaseUrl.replace(/\/$/, "")}/v1/chat/completions`;

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiProviderApiKey}`,
    },
    body: JSON.stringify({
      model: defaultModel,
      messages: [
        {
          role: "system",
          content:
            "你是一位资深中文旅行规划专家。请严格输出符合 {itinerary: ItineraryDay[], budget: BudgetLineItem[], tips: string[]} 结构的 JSON，默认使用 CNY，除非用户另有说明。所有文本字段必须使用简体中文，并尽量提供真实地点和经纬度。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI provider request failed", {
      status: response.status,
      statusText: response.statusText,
      errorText,
      requestUrl,
      model: defaultModel,
    });
    throw new Error(`AI provider error: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const rawContent = payload.choices?.[0]?.message?.content;

  const mergedContent = Array.isArray(rawContent)
    ? rawContent
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .join("\n")
    : rawContent ?? "{}";

  const normalizedContent = mergedContent
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(normalizedContent) as RawAIResponse;
  } catch (error) {
    console.error("Failed to parse AI response", error, normalizedContent);
    return { itinerary: [], budget: [], tips: [] };
  }
}

function hydrateActivities(days: unknown): ItineraryDay[] {
  const rawDays = Array.isArray(days) ? days : [];

  const normalizeActivity = (raw: unknown, fallbackDay: number, index: number): ItineraryDay["activities"][number] => {
    if (typeof raw === "string") {
      return {
        id: randomUUID(),
        day: fallbackDay,
        title: raw,
        description: "",
      };
    }

    const candidateRecord = (raw ?? {}) as Record<string, unknown>;
    const titleCandidate = candidateRecord.title ?? candidateRecord.name ?? candidateRecord.activity ?? `行程 ${index}`;
    const title = typeof titleCandidate === "string" ? titleCandidate : JSON.stringify(titleCandidate);

    const descriptionCandidate = candidateRecord.description ?? candidateRecord.details ?? candidateRecord.summary ?? "";
    const description = typeof descriptionCandidate === "string" ? descriptionCandidate : String(descriptionCandidate ?? "");

    const categoryCandidate = candidateRecord.category ?? candidateRecord.type ?? candidateRecord.kind;
    let category: string | undefined;
    if (typeof categoryCandidate === "string") {
      const normalized = categoryCandidate.trim().toLowerCase();
      const categoryMap: Record<string, string> = {
        transport: "transport",
        transportation: "transport",
        commute: "transport",
        transfer: "transport",
        flight: "transport",
        train: "transport",
        accommodation: "accommodation",
        lodging: "accommodation",
        hotel: "accommodation",
        stay: "accommodation",
        sightseeing: "sightseeing",
        attraction: "sightseeing",
        landmark: "sightseeing",
        dining: "dining",
        restaurant: "dining",
        food: "dining",
        meal: "dining",
        breakfast: "dining",
        lunch: "dining",
        dinner: "dining",
        experience: "experience",
        activity: "experience",
        culture: "experience",
        shopping: "shopping",
      };
      category = categoryMap[normalized] ?? categoryCandidate;
    }

    const locationSource = candidateRecord.location ?? candidateRecord.place;
    let location;
    if (typeof locationSource === "string") {
      location = { name: locationSource, lat: 0, lng: 0 };
    } else if (locationSource && typeof locationSource === "object") {
      const loc = locationSource as { name?: string; lat?: number; lng?: number; latitude?: number; longitude?: number };
      location = {
        name: typeof loc.name === "string" ? loc.name : "",
        lat: typeof loc.lat === "number" ? loc.lat : typeof loc.latitude === "number" ? loc.latitude : 0,
        lng: typeof loc.lng === "number" ? loc.lng : typeof loc.longitude === "number" ? loc.longitude : 0,
      };
      if (!location.name) {
        location = undefined;
      }
    }

    const startTimeCandidate = candidateRecord.startTime ?? candidateRecord.start_time ?? candidateRecord.time ?? "";
    const endTimeCandidate = candidateRecord.endTime ?? candidateRecord.end_time ?? "";
    const startTime = typeof startTimeCandidate === "string" ? startTimeCandidate : String(startTimeCandidate ?? "");
    const endTime = typeof endTimeCandidate === "string" ? endTimeCandidate : String(endTimeCandidate ?? "");

    const estimatedCostSource = candidateRecord.estimatedCost ?? candidateRecord.cost ?? candidateRecord.price;
    const estimatedCost = typeof estimatedCostSource === "number" ? estimatedCostSource : undefined;

    const bookingUrlCandidate = candidateRecord.bookingUrl ?? candidateRecord.link;
    const bookingUrl = typeof bookingUrlCandidate === "string" ? bookingUrlCandidate : undefined;

    return {
      id: typeof candidateRecord.id === "string" ? candidateRecord.id : randomUUID(),
      day: fallbackDay,
      title: title.trim() || `行程 ${index}`,
      description,
      category,
      location,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      estimatedCost,
      bookingUrl,
    };
  };

  return rawDays.map((rawDay, index) => {
    const dayRecord = (rawDay ?? {}) as Record<string, unknown>;
    const dateCandidate = dayRecord.date ?? dayRecord.day ?? `Day ${index + 1}`;
    const date = typeof dateCandidate === "string" ? dateCandidate : `Day ${index + 1}`;

    const summaryCandidate = dayRecord.summary ?? dayRecord.overview ?? dayRecord.description ?? "";
    const summary = typeof summaryCandidate === "string" && summaryCandidate.trim().length > 0
      ? summaryCandidate
      : `第${index + 1}天概览`;

    const activitiesSource = Array.isArray(dayRecord.activities)
      ? dayRecord.activities
      : Array.isArray(dayRecord.highlights)
        ? dayRecord.highlights
        : [];

    const activities = activitiesSource.map((activity, activityIndex) =>
      normalizeActivity(activity, index + 1, activityIndex + 1)
    );

    return {
      date,
      summary,
      activities,
    } satisfies ItineraryDay;
  });
}

function extractNumericAmount(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const match = raw.replace(/[,\s]/g, "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (typeof record.value === "number") {
      return record.value;
    }
    if (typeof record.amount === "number") {
      return record.amount;
    }
    if (typeof record.amount === "string") {
      return extractNumericAmount(record.amount);
    }
    if (typeof record.cost === "number") {
      return record.cost;
    }
  }
  return 0;
}

function hydrateBudget(items: unknown, currency: string): BudgetLineItem[] {
  const rawItems = Array.isArray(items) ? items : [];

  return rawItems.map((rawItem, index) => {
    if (typeof rawItem === "string") {
      return {
        id: randomUUID(),
        category: "misc",
        title: rawItem,
        amount: 0,
        currency,
      } satisfies BudgetLineItem;
    }

    const itemRecord = (rawItem ?? {}) as Record<string, unknown>;
    const categoryCandidate = itemRecord.category ?? itemRecord.type ?? "misc";
    const category = typeof categoryCandidate === "string" && categoryCandidate in {
      transport: true,
      accommodation: true,
      dining: true,
      activities: true,
      shopping: true,
      misc: true,
    }
      ? (categoryCandidate as BudgetLineItem["category"])
      : "misc";

    const titleCandidate = itemRecord.title ?? itemRecord.name ?? `预算项 ${index + 1}`;
    const title = typeof titleCandidate === "string" ? titleCandidate : String(titleCandidate ?? `预算项 ${index + 1}`);

    const amountCandidate = itemRecord.amount ?? itemRecord.cost ?? itemRecord.price ?? itemRecord.estimatedCost ?? 0;
    const amount = extractNumericAmount(amountCandidate);

    const dayCandidate = itemRecord.day ?? itemRecord.dayIndex;
    const day = typeof dayCandidate === "number" ? dayCandidate : undefined;

    const notesCandidate = itemRecord.notes ?? itemRecord.description;
    const notes = typeof notesCandidate === "string" ? notesCandidate : undefined;

    return {
      id: typeof itemRecord.id === "string" ? itemRecord.id : randomUUID(),
      category,
      title,
      amount,
      currency: typeof itemRecord.currency === "string" ? itemRecord.currency : currency,
      day,
      notes,
    } satisfies BudgetLineItem;
  });
}

function createFallbackBudget(totalBudget: number, currency: string): BudgetLineItem[] {
  if (!totalBudget || !Number.isFinite(totalBudget) || totalBudget <= 0) {
    return [];
  }

  const allocations: Array<{ category: BudgetLineItem["category"]; ratio: number; title: string }> = [
    { category: "accommodation", ratio: 0.4, title: "住宿" },
    { category: "transport", ratio: 0.15, title: "交通" },
    { category: "dining", ratio: 0.2, title: "餐饮" },
    { category: "activities", ratio: 0.2, title: "活动体验" },
    { category: "misc", ratio: 0.05, title: "其他预留" },
  ];

  const budgetItems = allocations.map((item) => ({
    id: randomUUID(),
    category: item.category,
    title: item.title,
    amount: Math.round(totalBudget * item.ratio),
    currency,
    notes: "AI 预算占位，可根据实际需要调整。",
  } satisfies BudgetLineItem));

  const assigned = budgetItems.reduce((sum, item) => sum + item.amount, 0);
  const delta = Math.round(totalBudget - assigned);
  if (delta !== 0 && budgetItems.length) {
    budgetItems[0].amount += delta;
  }

  return budgetItems;
}

export async function generateItinerary(request: AIPlannerRequest): Promise<AIPlannerResponse> {
  const paceLabel =
    ({ relaxed: "轻松", balanced: "适中", intensive: "紧凑" } as const)[request.preferences.pace] ?? request.preferences.pace;
  const transportLabel =
    ({ public: "公共交通", "self-drive": "自驾", mixed: "公共交通与自驾结合" } as const)[request.preferences.transport] ??
    request.preferences.transport;
  const accommodationLabel =
    ({ budget: "经济型", mid: "舒适型", luxury: "高端型" } as const)[request.preferences.accommodation] ??
    request.preferences.accommodation;
  const interestSummary = request.preferences.interestTags.length
    ? request.preferences.interestTags.join("、")
    : "常规观光";
  const dietarySummary = request.preferences.dietary.length
    ? request.preferences.dietary.join("、")
    : "无特殊要求";
  const noteLine = request.notes && request.notes.trim().length > 0 ? `  - 其他备注：${request.notes.trim()}\n` : "";

  const prompt = `请根据以下旅客需求规划一次旅行：
  - 目的地：${request.destination}
  - 行程日期：${request.startDate} 至 ${request.endDate}
  - 出行人数：${request.travelers} 人
  - 预算总额：${request.budget} ${request.currency ?? "CNY"}
  - 旅行节奏：${paceLabel}
  - 兴趣偏好：${interestSummary}
  - 交通偏好：${transportLabel}
  - 住宿需求：${accommodationLabel}
  - 饮食要求：${dietarySummary}
${noteLine}请严格使用【简体中文】输出以下 JSON 结构：{ itinerary: ItineraryDay[], budget: BudgetLineItem[], tips: string[] }
  - itinerary：按日期列出每日摘要 summary 及 activities。
    - 每条活动需包含 category 字段（transport、accommodation、sightseeing、dining、experience、shopping、other 之一）、时间段（如可得）、地点名称与经纬度（若未知可置 0）、详细描述（写明交通方式/住宿酒店/景点看点/餐品推荐等）、预计花费、可选的预订链接；
    - 每天至少涵盖交通衔接、住宿安排、景点体验与餐饮推荐，可额外补充购物或特色体验；
  - budget：按类别列出预算条目，包含 category、title、amount（数字）、currency（默认为 ${request.currency ?? "CNY"}）、notes；
  - tips：提供 3 条可执行的行前提示。
请确保所有文本字段均为简体中文，预算金额为数字，可结合旅客偏好给出合理建议。`;

  const raw = await callLLM(prompt);
  const itinerary: ItineraryDay[] = hydrateActivities(raw.itinerary ?? []);
  let budget: BudgetLineItem[] = hydrateBudget(raw.budget ?? [], request.currency ?? "CNY");

  if (!budget.length || budget.every((item) => !item.amount)) {
    budget = createFallbackBudget(request.budget, request.currency ?? "CNY");
  }

  return {
    itinerary,
    budget,
    tips: Array.isArray(raw.tips)
      ? (raw.tips as unknown[]).map((tip) => (typeof tip === "string" ? tip : String(tip))).filter(Boolean)
      : [],
  };
}

export function calculateBudgetSummary(budget: BudgetLineItem[]): {
  total: number;
  byCategory: Record<string, number>;
} {
  const summary = budget.reduce(
    (acc, item) => {
      acc.total += item.amount;
      acc.byCategory[item.category] = (acc.byCategory[item.category] ?? 0) + item.amount;
      return acc;
    },
    { total: 0, byCategory: {} as Record<string, number> }
  );

  return summary;
}
