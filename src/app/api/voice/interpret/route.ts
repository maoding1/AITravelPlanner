import { NextResponse } from "next/server";
import { interpretVoiceTranscript } from "@/lib/voiceInterpreter";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { transcript?: unknown };
    if (typeof body.transcript !== "string" || !body.transcript.trim()) {
      return NextResponse.json({ message: "缺少有效的语音文本" }, { status: 400 });
    }

    const intent = await interpretVoiceTranscript(body.transcript);
    return NextResponse.json(intent);
  } catch (error) {
    console.error("Voice interpretation error", error);
    return NextResponse.json({ message: (error as Error).message ?? "解析语音失败" }, { status: 500 });
  }
}
