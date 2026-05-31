export type ApiEnvelope<T = unknown> = {
  api_result: number;
  api_result_msg: string;
  api_data: T;
};

export type ResponseFormat = "json" | "svdata";

export function apiOk<T>(api_data: T): ApiEnvelope<T> {
  return {
    api_result: 1,
    api_result_msg: "成功",
    api_data
  };
}

export function apiError(api_result_msg: string, api_result = 500, api_data: Record<string, never> = {}): ApiEnvelope {
  return {
    api_result,
    api_result_msg,
    api_data
  };
}

export function serializeApiResponse(payload: unknown, format: ResponseFormat = "json"): string {
  const json = JSON.stringify(payload);
  return format === "svdata" ? `svdata=${json}` : json;
}

export function parseApiPayload(payload: unknown): unknown {
  if (payload == null || payload === "") return {};
  if (typeof payload === "object") return payload;
  if (typeof payload !== "string") return {};

  const trimmed = payload.trim();
  if (!trimmed) return {};

  if (trimmed.startsWith("svdata=")) {
    return JSON.parse(trimmed.slice("svdata=".length));
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }

  return Object.fromEntries(new URLSearchParams(trimmed));
}
