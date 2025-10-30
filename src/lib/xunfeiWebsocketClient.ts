import crypto from "node:crypto";
import { URL } from "node:url";

const REQUEST_LINE_METHOD = "GET";
const REQUEST_LINE_VERSION = "HTTP/1.1";
const STREAM_CHUNK_SIZE = 1280; // bytes, per official recommendation for 16k PCM
const STREAM_INTERVAL_MS = 40;
const STREAM_TIMEOUT_MS = 20000;

type XunfeiConfig = {
  url: string;
  appId: string;
  apiKey: string;
  apiSecret: string;
};

type RecognizerResult = {
  code: number;
  message: string;
  sid?: string;
  data?: {
    status: number;
    result?: {
      ws?: Array<{
        cw: Array<{ w: string }>;
      }>;
      sn?: number;
      pgs?: string;
      rg?: [number, number];
      ls?: boolean;
    };
  };
};

let cachedWebSocket: typeof import("ws") | null = null;

const ensureWebSocket = async () => {
  if (!cachedWebSocket) {
    if (!process.env.WS_NO_BUFFER_UTIL) {
      process.env.WS_NO_BUFFER_UTIL = "1";
    }
    if (!process.env.WS_NO_UTF_8_VALIDATE) {
      process.env.WS_NO_UTF_8_VALIDATE = "1";
    }
    cachedWebSocket = await import("ws");
  }

  return cachedWebSocket;
};

const aggregateResult = (
  result: NonNullable<RecognizerResult["data"]>["result"],
  segments: Map<number, string>,
): string => {
  if (!result) {
    return Array.from(segments.keys())
      .sort((a, b) => a - b)
      .map((key) => segments.get(key) ?? "")
      .join("");
  }

  const { ws = [], sn, pgs, rg } = result;
  const content = ws
    .map((node) => node.cw?.map((word) => word.w).join("") ?? "")
    .join("");

  if (typeof sn === "number") {
    if (pgs === "rpl" && Array.isArray(rg) && rg.length === 2) {
      for (let index = rg[0]; index <= rg[1]; index += 1) {
        segments.delete(index);
      }
    }
    segments.set(sn, content);
  }

  return Array.from(segments.keys())
    .sort((a, b) => a - b)
    .map((key) => segments.get(key) ?? "")
    .join("");
};

const createSignedUrl = ({ url, apiKey, apiSecret }: XunfeiConfig): { url: string; date: string; host: string } => {
  const parsed = new URL(url);
  const date = new Date().toUTCString();
  const requestLine = `${REQUEST_LINE_METHOD} ${parsed.pathname}${parsed.search || ""} ${REQUEST_LINE_VERSION}`;
  const signatureOrigin = [`host: ${parsed.host}`, `date: ${date}`, requestLine].join("\n");

  const hmac = crypto.createHmac("sha256", apiSecret);
  hmac.update(signatureOrigin);
  const signature = hmac.digest("base64");

  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin).toString("base64");

  const params = new URLSearchParams({
    authorization,
    date,
    host: parsed.host,
  });

  const signedUrl = `${parsed.origin}${parsed.pathname}${parsed.search ? `${parsed.search}&${params.toString()}` : `?${params.toString()}`}`;
  return { url: signedUrl, date, host: parsed.host };
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function transcribeWithXunfei(
  audioBuffer: ArrayBuffer,
  config: XunfeiConfig,
): Promise<string> {
  const wsModule = await ensureWebSocket();
  const WebSocket = wsModule.default;
  const { url, appId, apiKey, apiSecret } = config;
  if (!url || !appId || !apiKey || !apiSecret) {
    throw new Error("语音识别配置缺失，请检查 VOICE_API_* 环境变量。");
  }

  const { url: signedUrl } = createSignedUrl(config);
  const source = Buffer.from(audioBuffer);

  if (source.length === 0) {
    return "";
  }

  return new Promise<string>((resolve, reject) => {
    const ws = new WebSocket(signedUrl, { handshakeTimeout: STREAM_TIMEOUT_MS });
    const segments = new Map<number, string>();
    let transcript = "";
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close(1000, "timeout");
        reject(new Error("语音识别超时"));
      }
    }, STREAM_TIMEOUT_MS);

    const finalize = (text: string) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        ws.close(1000, "done");
        resolve(text.trim());
      }
    };

    const fail = (error: Error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        try {
          ws.close(1002, "error");
        } catch (closeError) {
          console.error("Failed to close websocket", closeError);
        }
        reject(error);
      }
    };

    ws.on("open", async () => {
      try {
        let offset = 0;
        let frame = 0;
        const total = source.length;

        while (offset < total) {
          const end = Math.min(offset + STREAM_CHUNK_SIZE, total);
          const chunk = source.subarray(offset, end);
          const status = frame === 0 ? 0 : end >= total ? 2 : 1;

          const payload: Record<string, unknown> = {
            data: {
              status,
              format: "audio/L16;rate=16000",
              encoding: "raw",
              audio: chunk.toString("base64"),
            },
          };

          if (frame === 0) {
            payload.common = { app_id: appId };
            payload.business = {
              language: "zh_cn",
              domain: "iat",
              accent: "mandarin",
              vad_eos: 3000,
              dwa: "wpgs",
              ptt: 1,
            };
          }

          ws.send(JSON.stringify(payload));

          offset = end;
          frame += 1;

          if (status !== 2) {
            await wait(STREAM_INTERVAL_MS);
          }
        }

        // Ensure final frame is sent even if audio length aligned with chunk boundary
        ws.send(JSON.stringify({ data: { status: 2 } }));
      } catch (error) {
        fail(error as Error);
      }
    });

    ws.on("message", (raw) => {
      try {
        const payload = JSON.parse(raw.toString()) as RecognizerResult;
        if (payload.code !== 0) {
          fail(new Error(payload.message || `语音识别失败（${payload.code}）`));
          return;
        }

        if (payload.data?.result) {
          transcript = aggregateResult(payload.data.result, segments);
        }

        if (payload.data?.status === 2 || payload.data?.result?.ls) {
          finalize(transcript);
        }
      } catch (error) {
        fail(error as Error);
      }
    });

    ws.on("error", (eventError) => {
      fail(eventError instanceof Error ? eventError : new Error(String(eventError)));
    });

    ws.on("close", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(transcript.trim());
      }
    });
  });
}
