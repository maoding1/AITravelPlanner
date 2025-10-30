import type { TravelPreference } from "@/types/travel";
import { createPlannerPreference, type PlannerFormState } from "@/lib/plannerDefaults";

const aiProviderBaseUrl = process.env.AI_PROVIDER_URL ?? "";
const aiProviderApiKey = process.env.AI_PROVIDER_API_KEY ?? "";
const defaultModel = process.env.AI_PROVIDER_MODEL ?? "gpt-4o-mini";

export type VoiceIntent = {
  transcript: string;
  form?: Partial<PlannerFormState>;
  preferences?: Partial<TravelPreference>;
};

type RawVoiceIntent = {
  form?: Partial<PlannerFormState> & { currency?: string };
  preferences?: Partial<TravelPreference>;
};

const normalizeDate = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  const normalized = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  return new Date(timestamp).toISOString().slice(0, 10);
};

const normalizePositiveInt = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const numeric = parseInt(value, 10);
    if (Number.isInteger(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return undefined;
};

const normalizeBudget = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[\u4e00-\u9fa5\s,，元块人民币]/g, "");
    const match = cleaned.match(/\d+(?:\.\d+)?/);
    if (match) {
      return Math.round(Number(match[0]));
    }
  }
  return undefined;
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
};

const normalizeStringList = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const list = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return list.length ? Array.from(new Set(list)) : undefined;
  }

  if (typeof value === "string") {
    const list = value
      .split(/[、,，\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return list.length ? Array.from(new Set(list)) : undefined;
  }

  return undefined;
};

const normalizePace = (value: unknown): TravelPreference["pace"] | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (["relaxed", "balanced", "intensive"].includes(normalized)) {
    return normalized as TravelPreference["pace"];
  }
  const mapping: Record<string, TravelPreference["pace"]> = {
    轻松: "relaxed",
    慢速: "relaxed",
    放松: "relaxed",
    休闲: "relaxed",
    适中: "balanced",
    均衡: "balanced",
    标准: "balanced",
    正常: "balanced",
    紧凑: "intensive",
    赶场: "intensive",
    高密度: "intensive",
  };
  return mapping[normalized] ?? undefined;
};

const normalizeTransport = (value: unknown): TravelPreference["transport"] | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (["public", "self-drive", "mixed"].includes(normalized)) {
    return normalized as TravelPreference["transport"];
  }
  const mapping: Record<string, TravelPreference["transport"]> = {
    公共交通: "public",
    地铁: "public",
    火车: "public",
    巴士: "public",
    大众交通: "public",
    自驾: "self-drive",
    自驾游: "self-drive",
    自驾车: "self-drive",
    包车: "self-drive",
    混合: "mixed",
    灵活: "mixed",
    综合: "mixed",
    结合: "mixed",
  };
  return mapping[normalized] ?? undefined;
};

const normalizeAccommodation = (value: unknown): TravelPreference["accommodation"] | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (["budget", "mid", "luxury"].includes(normalized)) {
    return normalized as TravelPreference["accommodation"];
  }
  const mapping: Record<string, TravelPreference["accommodation"]> = {
    经济型: "budget",
    青旅: "budget",
    性价比: "budget",
    舒适型: "mid",
    商务型: "mid",
    四星: "mid",
    高端型: "luxury",
    豪华: "luxury",
    五星: "luxury",
  };
  return mapping[normalized] ?? undefined;
};

const sanitizeVoiceIntent = (transcript: string, raw: RawVoiceIntent): VoiceIntent => {
  const form = raw.form ?? {};
  const preferences = raw.preferences ?? {};
  const sanitizedForm: Partial<PlannerFormState> = {};

  const destination = normalizeString(form.destination);
  if (destination) sanitizedForm.destination = destination;

  const startDate = normalizeDate(form.startDate);
  if (startDate) sanitizedForm.startDate = startDate;

  const endDate = normalizeDate(form.endDate);
  if (endDate) sanitizedForm.endDate = endDate;

  const travelers = normalizePositiveInt(form.travelers);
  if (travelers) sanitizedForm.travelers = travelers;

  const budget = normalizeBudget(form.budget);
  if (budget) sanitizedForm.budget = budget;

  const notes = normalizeString(form.notes);
  if (notes) sanitizedForm.notes = notes;

  const sanitizedPreferences: Partial<TravelPreference> = {};
  const pace = normalizePace(preferences.pace);
  if (pace) sanitizedPreferences.pace = pace;

  const transport = normalizeTransport(preferences.transport);
  if (transport) sanitizedPreferences.transport = transport;

  const accommodation = normalizeAccommodation(preferences.accommodation);
  if (accommodation) sanitizedPreferences.accommodation = accommodation;

  const interestTags = normalizeStringList(preferences.interestTags);
  if (interestTags) sanitizedPreferences.interestTags = interestTags;

  const dietary = normalizeStringList(preferences.dietary);
  if (dietary) sanitizedPreferences.dietary = dietary;

  return {
    transcript,
    form: Object.keys(sanitizedForm).length ? sanitizedForm : undefined,
    preferences: Object.keys(sanitizedPreferences).length ? sanitizedPreferences : undefined,
  };
};

async function requestVoiceIntent(transcript: string): Promise<RawVoiceIntent> {
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
            "你是旅行规划助手，负责把用户的中文语音需求解析为结构化表单。请仅输出 JSON，且字段均使用简体中文含义。",
        },
        {
          role: "user",
          content: `请将下面的旅行需求解析成 JSON：\n"${transcript}"\n严格输出如下结构：{\n  "form": {\n    "destination": string?,\n    "startDate": string?,\n    "endDate": string?,\n    "travelers": number?,\n    "budget": number?,\n    "notes": string?\n  },\n  "preferences": {\n    "pace": "relaxed"|"balanced"|"intensive"?,\n    "transport": "public"|"self-drive"|"mixed"?,\n    "accommodation": "budget"|"mid"|"luxury"?,\n    "interestTags": string[]?,\n    "dietary": string[]?\n  }\n}\n- 所有缺失字段省略。\n- 日期请输出 ISO 格式 (YYYY-MM-DD)。\n- 金额输出为数字。\n- 若未提及预算或日期可省略。\n- interestTags/dietary 为数组。\n- notes 请保留原始需求摘要（若有）。`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Voice interpreter error: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const rawContent = payload.choices?.[0]?.message?.content;
  const merged = Array.isArray(rawContent)
    ? rawContent
      .map((item) => (typeof item === "string" ? item : item?.text ?? ""))
      .join("\n")
    : rawContent ?? "{}";

  const normalizedContent = merged
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(normalizedContent) as RawVoiceIntent;
  } catch (error) {
    console.error("Failed to parse voice interpreter response", error, normalizedContent);
    return {};
  }
}

export async function interpretVoiceTranscript(transcript: string): Promise<VoiceIntent> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return { transcript: "" };
  }

  try {
    const rawIntent = await requestVoiceIntent(trimmed);
    const intent = sanitizeVoiceIntent(trimmed, rawIntent ?? {});
    if (!intent.form) {
      intent.form = { notes: trimmed };
    } else if (!intent.form.notes) {
      intent.form.notes = trimmed;
    }
    if (!intent.preferences) {
      intent.preferences = createPlannerPreference();
    } else {
      const base = createPlannerPreference();
      intent.preferences = {
        ...base,
        ...intent.preferences,
        interestTags: intent.preferences.interestTags ?? base.interestTags,
        dietary: intent.preferences.dietary ?? base.dietary,
      };
    }
    return intent;
  } catch (error) {
    console.error("Voice interpretation failed", error);
    return {
      transcript: trimmed,
      form: { notes: trimmed },
    };
  }
}
