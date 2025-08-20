// src/lib/audit.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supa = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });

export type AuditEvent = {
  user_id?: string | null;
  action: string; // e.g., 'message.create', 'model.infer'
  resource_type?: string | null; // 'message', 'chat'
  resource_id?: string | null;
  route?: string | null;
  request_id?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, any>;
};

export async function recordAudit(e: AuditEvent) {
  try {
    await supa.from("audit_logs").insert({
      user_id: e.user_id ?? null,
      action: e.action,
      resource_type: e.resource_type ?? null,
      resource_id: e.resource_id ?? null,
      route: e.route ?? null,
      request_id: e.request_id ?? null,
      ip: e.ip ?? null,
      user_agent: e.user_agent ?? null,
      metadata: e.metadata ?? {},
    });
  } catch {
    // never throw from audit path
  }
}
