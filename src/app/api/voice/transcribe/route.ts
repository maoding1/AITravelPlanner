import { NextResponse } from "next/server";
import { transcribeWithXunfei } from "@/lib/xunfeiWebsocketClient";

const voiceApiUrl = process.env.VOICE_API_URL;
const voiceAppId = process.env.VOICE_API_APP_ID;
const voiceApiKey = process.env.VOICE_API_KEY;
const voiceApiSecret = process.env.VOICE_API_SECRET;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ message: "缺少音频文件" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const transcript = await transcribeWithXunfei(buffer, {
      url: voiceApiUrl ?? "",
      appId: voiceAppId ?? "",
      apiKey: voiceApiKey ?? "",
      apiSecret: voiceApiSecret ?? "",
    });

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: (error as Error).message }, { status: 500 });
  }
}
