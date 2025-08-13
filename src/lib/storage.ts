// Storage helpers that never create a server client at import time.
import { createClientServer } from "../supabase-server";
import supabaseBrowser from "../supabase-browser";

/** Server-side public URL (no auth) */
export async function getPublicUrlServer(bucket: string, path: string) {
  const supabase = createClientServer();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Browser-side public URL (uses public client) */
export function getPublicUrlBrowser(bucket: string, path: string) {
  const supabase = supabaseBrowser;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
