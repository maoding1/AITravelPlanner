"use client";

import { Mic, Square, Waves } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

export type VoiceRecorderProps = {
  onTranscript: (input: string) => void;
};

export function VoiceRecorder({ onTranscript }: VoiceRecorderProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const { state, error, startRecording, stopRecording } = useVoiceRecorder(onTranscript);

  useEffect(() => {
    if (state === "recording") {
      const timer = window.setInterval(() => {
        setElapsedSeconds((prev: number) => prev + 1);
      }, 1000);
      return () => window.clearInterval(timer);
    }
    setElapsedSeconds(0);
    return undefined;
  }, [state]);

  const toggleRecording = useCallback(() => {
    if (state === "idle" || state === "error") {
      startRecording();
    } else if (state === "recording") {
      stopRecording();
    }
  }, [startRecording, state, stopRecording]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">语音快速输入</h2>
          <p className="text-sm text-slate-500">长按按钮或点击一次即可开始录音，将需求讲给 AI。</p>
        </div>
        <Waves className={`h-6 w-6 text-cyan-500 transition ${state === "recording" ? "animate-pulse" : "opacity-40"}`} />
      </header>
      <div className="mt-6 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={toggleRecording}
          disabled={state === "processing"}
          className={`flex h-24 w-24 items-center justify-center rounded-full text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed ${state === "recording" ? "bg-rose-500 hover:bg-rose-600 focus-visible:outline-rose-600" : "bg-cyan-600 hover:bg-cyan-700 focus-visible:outline-cyan-700"}`}
        >
          {state === "recording" ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
        </button>
        <p className="text-sm text-slate-600">
          {state === "recording" && `正在录音… ${elapsedSeconds.toString().padStart(2, "0")} 秒`}
          {state === "processing" && "AI 正在识别语音…"}
          {(state === "idle" || state === "error") && "点击开始录音，或者直接使用文本输入。"}
        </p>
        {error && <p className="text-sm text-rose-500">{error}</p>}
      </div>
    </section>
  );
}
