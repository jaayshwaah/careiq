// src/lib/logging.ts
export type LogMeta = {
  route: string;
  method?: string;
  status?: number;
  requestId?: string;
  userId?: string | null;
  duration_ms?: number;
  extra?: Record<string, unknown>;
};

export function logInfo(event: string, meta: LogMeta) {
  // Keep it minimal; never log bodies/PHI
  // You can later wire this to a provider like Datadog or Logtail
  console.log(JSON.stringify({ level: "info", event, ...meta }));
}

export function logError(event: string, meta: LogMeta & { error: string }) {
  console.error(JSON.stringify({ level: "error", event, ...meta }));
}
