"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecorderState = "idle" | "recording" | "processing" | "error";

export function useVoiceRecorder(onTranscript: (text: string) => void) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [error, setError] = useState<string | null>(null);

  const convertToPCM16 = useCallback(async (blob: Blob): Promise<ArrayBuffer> => {
    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const OfflineAudioContextCtor = window.OfflineAudioContext ?? (window as typeof window & { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;

    if (!AudioContextCtor || !OfflineAudioContextCtor) {
      throw new Error("当前浏览器不支持音频格式转换");
    }

    const originalContext = new AudioContextCtor();
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const decodedBuffer = await originalContext.decodeAudioData(arrayBuffer.slice(0));

      const targetSampleRate = 16000;
      const frameCount = Math.ceil(decodedBuffer.duration * targetSampleRate);
      const offlineContext = new OfflineAudioContextCtor(1, frameCount, targetSampleRate);

      const source = offlineContext.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(offlineContext.destination);
      source.start(0);

      const rendered = await offlineContext.startRendering();
      const channelData = rendered.getChannelData(0);
      const pcmBuffer = new ArrayBuffer(channelData.length * 2);
      const view = new DataView(pcmBuffer);

      for (let index = 0; index < channelData.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, channelData[index]));
        view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      }

      return pcmBuffer;
    } finally {
      await originalContext.close();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setState("processing");
        try {
          const pcmBuffer = await convertToPCM16(blob);
          const formData = new FormData();
          formData.append("file", new Blob([pcmBuffer], { type: "application/octet-stream" }), "recording.pcm");

          const response = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          const data = (await response.json()) as { transcript: string };
          onTranscript(data.transcript);
          setState("idle");
        } catch (err) {
          console.error(err);
          setError((err as Error).message);
          setState("error");
        }
      };

      recorder.start();
      setState("recording");
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
      setState("error");
    }
  }, [convertToPCM16, onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }
  }, []);

  return {
    state,
    error,
    startRecording,
    stopRecording,
  };
}
