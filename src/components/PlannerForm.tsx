"use client";

import { CalendarDays, Loader2, MapPinned, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { AIPlannerRequest, TravelPreference } from "@/types/travel";
import {
  createPlannerFormState,
  createPlannerPreference,
  type PlannerFormState,
} from "@/lib/plannerDefaults";
import type { VoiceIntent } from "@/lib/voiceInterpreter";

export type PlannerFormProps = {
  onSubmit: (payload: AIPlannerRequest) => Promise<void>;
  defaultPreferences?: TravelPreference;
  initialState?: Partial<PlannerFormState>;
  voiceIntent?: VoiceIntent;
};

const buildPreferenceState = (preferences?: TravelPreference) => createPlannerPreference(preferences);

export function PlannerForm({ onSubmit, defaultPreferences, initialState, voiceIntent }: PlannerFormProps) {
  const [formState, setFormState] = useState<PlannerFormState>(() => createPlannerFormState(initialState));
  const [preferences, setPreferences] = useState<TravelPreference>(() => buildPreferenceState(defaultPreferences));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interestText = useMemo(() => preferences.interestTags.join("、"), [preferences.interestTags]);
  const dietaryText = useMemo(() => preferences.dietary.join("、"), [preferences.dietary]);

  const memoizedInitialFormState = useMemo(
    () => createPlannerFormState(initialState),
    [initialState],
  );

  useEffect(() => {
    setFormState(memoizedInitialFormState);
  }, [memoizedInitialFormState]);

  const memoizedPreferenceState = useMemo(
    () => buildPreferenceState(defaultPreferences),
    [defaultPreferences],
  );

  useEffect(() => {
    setPreferences(memoizedPreferenceState);
  }, [memoizedPreferenceState]);


  useEffect(() => {
    if (!voiceIntent) {
      return;
    }

    setFormState((prev: PlannerFormState) => {
      const next = { ...prev };
      const form = voiceIntent.form ?? {};

      if (typeof form.destination === "string" && form.destination.trim()) {
        next.destination = form.destination.trim();
      }

      if (typeof form.startDate === "string" && form.startDate.trim()) {
        next.startDate = form.startDate.trim();
      }

      if (typeof form.endDate === "string" && form.endDate.trim()) {
        next.endDate = form.endDate.trim();
      }

      if (typeof form.travelers === "number" && Number.isFinite(form.travelers) && form.travelers > 0) {
        next.travelers = form.travelers;
      }

      if (typeof form.budget === "number" && Number.isFinite(form.budget) && form.budget > 0) {
        next.budget = form.budget;
      }

      if (typeof form.notes === "string" && form.notes.trim()) {
        next.notes = form.notes.trim();
      } else if (voiceIntent.transcript) {
        next.notes = voiceIntent.transcript.trim();
      }

      return next;
    });

    if (voiceIntent.preferences) {
      setPreferences((prev: TravelPreference) => {
        const next = { ...prev };
        const prefs = voiceIntent.preferences!;

        if (prefs.pace) {
          next.pace = prefs.pace;
        }

        if (prefs.transport) {
          next.transport = prefs.transport;
        }

        if (prefs.accommodation) {
          next.accommodation = prefs.accommodation;
        }

        if (prefs.interestTags && prefs.interestTags.length) {
          next.interestTags = [...prefs.interestTags];
        }

        if (prefs.dietary && prefs.dietary.length) {
          next.dietary = [...prefs.dietary];
        }

        return next;
      });
    }
  }, [voiceIntent]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        destination: formState.destination,
        startDate: formState.startDate,
        endDate: formState.endDate,
        travelers: formState.travelers,
        budget: formState.budget,
        currency: "CNY",
        preferences,
        notes: formState.notes,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700 flex items-center gap-2"><MapPinned className="h-4 w-4" />目的地</span>
          <input
            value={formState.destination}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFormState((prev: PlannerFormState) => ({ ...prev, destination: event.target.value }))
            }
            required
            placeholder="例如：日本 东京"
            className="rounded-lg border border-slate-200 px-3 py-2 focus:border-cyan-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700 flex items-center gap-2"><Users className="h-4 w-4" />同行人数</span>
          <input
            type="number"
            min={1}
            value={formState.travelers}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFormState((prev: PlannerFormState) => ({ ...prev, travelers: Number(event.target.value) }))
            }
            className="rounded-lg border border-slate-200 px-3 py-2 focus:border-cyan-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700 flex items-center gap-2"><CalendarDays className="h-4 w-4" />开始日期</span>
          <input
            type="date"
            value={formState.startDate}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFormState((prev: PlannerFormState) => ({ ...prev, startDate: event.target.value }))
            }
            className="rounded-lg border border-slate-200 px-3 py-2 focus:border-cyan-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700 flex items-center gap-2"><CalendarDays className="h-4 w-4" />结束日期</span>
          <input
            type="date"
            value={formState.endDate}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFormState((prev: PlannerFormState) => ({ ...prev, endDate: event.target.value }))
            }
            className="rounded-lg border border-slate-200 px-3 py-2 focus:border-cyan-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">预算 (元)</span>
          <input
            type="number"
            min={1000}
            step={500}
            value={formState.budget}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFormState((prev: PlannerFormState) => ({ ...prev, budget: Number(event.target.value) }))
            }
            className="rounded-lg border border-slate-200 px-3 py-2 focus:border-cyan-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">补充需求</span>
          <textarea
            value={formState.notes}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setFormState((prev: PlannerFormState) => ({ ...prev, notes: event.target.value }))
            }
            rows={3}
            className="rounded-lg border border-slate-200 px-3 py-2 focus:border-cyan-500 focus:outline-none"
          />
        </label>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">旅行偏好</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-500">旅行节奏</span>
            <select
              value={preferences.pace}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setPreferences((prev: TravelPreference) => ({
                  ...prev,
                  pace: event.target.value as TravelPreference["pace"],
                }))
              }
              className="rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value="relaxed">轻松</option>
              <option value="balanced">均衡</option>
              <option value="intensive">紧凑</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-500">交通方式</span>
            <select
              value={preferences.transport}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setPreferences((prev: TravelPreference) => ({
                  ...prev,
                  transport: event.target.value as TravelPreference["transport"],
                }))
              }
              className="rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value="public">公共交通优先</option>
              <option value="self-drive">自驾</option>
              <option value="mixed">灵活组合</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-500">住宿档次</span>
            <select
              value={preferences.accommodation}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setPreferences((prev: TravelPreference) => ({
                  ...prev,
                  accommodation: event.target.value as TravelPreference["accommodation"],
                }))
              }
              className="rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value="budget">经济型</option>
              <option value="mid">舒适型</option>
              <option value="luxury">高端型</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-500">风格标签</span>
            <input
              value={interestText}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setPreferences((prev: TravelPreference) => ({
                  ...prev,
                  interestTags: event.target.value.split(/[、,，\s]+/).filter(Boolean),
                }))
              }
              className="rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-cyan-500 focus:outline-none"
              placeholder="美食、亲子、户外"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-500">饮食偏好</span>
            <input
              value={dietaryText}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setPreferences((prev: TravelPreference) => ({
                  ...prev,
                  dietary: event.target.value.split(/[、,，\s]+/).filter(Boolean),
                }))
              }
              className="rounded-lg border border-slate-200 px-2 py-2 text-sm focus:border-cyan-500 focus:outline-none"
              placeholder="清真、素食、无麸质"
            />
          </label>
        </div>
      </section>

      {error && <p className="text-sm text-rose-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        生成智能行程
      </button>
    </form>
  );
}
