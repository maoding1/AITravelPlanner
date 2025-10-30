"use client";

import { useState } from "react";
import { PlannerForm } from "@/components/PlannerForm";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { BudgetSummary } from "@/components/BudgetSummary";
import { ItineraryTimeline } from "@/components/ItineraryTimeline";
import type { AIPlannerRequest, BudgetLineItem, ItineraryDay, TravelPreference } from "@/types/travel";
import type { PlannerFormState } from "@/lib/plannerDefaults";
import type { VoiceIntent } from "@/lib/voiceInterpreter";

export type PlannerWorkspaceProps = {
  initialItinerary?: ItineraryDay[];
  initialBudget?: BudgetLineItem[];
  initialFormState?: Partial<PlannerFormState>;
  initialPreferences?: TravelPreference;
};

export function PlannerWorkspace({
  initialItinerary = [],
  initialBudget = [],
  initialFormState,
  initialPreferences,
}: PlannerWorkspaceProps) {
  const [itinerary, setItinerary] = useState<ItineraryDay[]>(initialItinerary);
  const [budget, setBudget] = useState<BudgetLineItem[]>(initialBudget);
  const [tips, setTips] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceIntent, setVoiceIntent] = useState<VoiceIntent | null>(null);
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const handlePlan = async (payload: AIPlannerRequest) => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const errorPayload = (await response.json()) as { message?: string };
          throw new Error(errorPayload.message ?? "生成行程失败");
        }
        throw new Error(await response.text());
      }

      const data = (await response.json()) as {
        itinerary: { plan_days: ItineraryDay[]; budget_items: BudgetLineItem[] };
        tips: string[];
      };

      setItinerary(data.itinerary.plan_days);
      setBudget(data.itinerary.budget_items);
      setTips(data.tips);
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  const handleTranscript = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setVoiceError(null);
    setVoiceParsing(true);

    try {
      const response = await fetch("/api/voice/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: trimmed }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "解析语音失败");
      }

      const intent = (await response.json()) as VoiceIntent;
      setVoiceIntent({ ...intent, transcript: trimmed });
    } catch (err) {
      console.error("Failed to interpret voice input", err);
      setVoiceIntent({ transcript: trimmed, form: { notes: trimmed } });
      setVoiceError((err as Error).message ?? "解析语音失败");
    } finally {
      setVoiceParsing(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
      <aside className="space-y-6">
        <PlannerForm
          onSubmit={handlePlan}
          initialState={initialFormState}
          defaultPreferences={initialPreferences}
          voiceIntent={voiceIntent ?? undefined}
        />
        <VoiceRecorder onTranscript={handleTranscript} />
        {voiceParsing && <p className="text-xs text-cyan-600">语音内容解析中，请稍候…</p>}
        {voiceIntent?.transcript && !voiceParsing && !voiceError && (
          <p className="text-xs text-slate-500">已识别语音：“{voiceIntent.transcript}”</p>
        )}
        {voiceError && <p className="text-xs text-rose-500">{voiceError}</p>}
        {error && <p className="text-sm text-rose-500">{error}</p>}
        {tips.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">AI 行前提示</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              {tips.map((tip: string, index: number) => (
                <li key={`${tip}-${index}`}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </aside>
      <section className="space-y-6">
        {pending && <p className="text-sm text-cyan-600">AI 正在生成行程，请稍候…</p>}
        <ItineraryTimeline days={itinerary} />
        <BudgetSummary items={budget} />
      </section>
    </div>
  );
}
