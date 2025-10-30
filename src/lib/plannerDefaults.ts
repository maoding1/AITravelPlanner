import type { TravelPreference } from "@/types/travel";

export type PlannerFormState = {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  notes: string;
};

const PLANNER_FORM_DEFAULT_TEMPLATE: PlannerFormState = {
  destination: "日本 东京",
  startDate: "2025-04-01",
  endDate: "2025-04-05",
  travelers: 2,
  budget: 10000,
  notes: "想体验动漫文化和带孩子亲子活动",
};

const PLANNER_PREFERENCE_DEFAULT_TEMPLATE: TravelPreference = {
  pace: "balanced",
  transport: "mixed",
  accommodation: "mid",
  interestTags: ["美食", "文化"],
  dietary: ["无特别要求"],
};

export const createPlannerFormState = (overrides?: Partial<PlannerFormState>): PlannerFormState => ({
  ...PLANNER_FORM_DEFAULT_TEMPLATE,
  ...overrides,
});

export const createPlannerPreference = (overrides?: Partial<TravelPreference>): TravelPreference => ({
  pace: overrides?.pace ?? PLANNER_PREFERENCE_DEFAULT_TEMPLATE.pace,
  transport: overrides?.transport ?? PLANNER_PREFERENCE_DEFAULT_TEMPLATE.transport,
  accommodation: overrides?.accommodation ?? PLANNER_PREFERENCE_DEFAULT_TEMPLATE.accommodation,
  interestTags: overrides?.interestTags ? [...overrides.interestTags] : [...PLANNER_PREFERENCE_DEFAULT_TEMPLATE.interestTags],
  dietary: overrides?.dietary ? [...overrides.dietary] : [...PLANNER_PREFERENCE_DEFAULT_TEMPLATE.dietary],
});

export const plannerFormDefaults = (): PlannerFormState => createPlannerFormState();
export const plannerPreferenceDefaults = (): TravelPreference => createPlannerPreference();
