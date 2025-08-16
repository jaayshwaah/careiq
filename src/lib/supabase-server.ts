// src/lib/supabase-server.ts
// Legacy compatibility shim so imports like "@/lib/supabase-server" keep working.
export {
  supabaseService,
  supabaseServerWithAuth,
  createClientServer,
  supabaseServer,
} from "./supabase/server";

const defaultExport = {
  supabaseService: undefined as any,
  supabaseServerWithAuth: undefined as any,
  createClientServer: undefined as any,
  supabaseServer: undefined as any,
};

// Populate default with live fns (avoids circular TS resolution complaints)
import * as live from "./supabase/server";
(defaultExport as any).supabaseService = live.supabaseService;
(defaultExport as any).supabaseServerWithAuth = live.supabaseServerWithAuth;
(defaultExport as any).createClientServer = live.createClientServer;
(defaultExport as any).supabaseServer = live.supabaseServer;

export default defaultExport;
