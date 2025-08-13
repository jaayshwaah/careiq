// Keep this file for compatibility with existing imports in components.
export { getBrowserSupabase as supabase } from "./supabase-browser";
// If some code does `import { supabase } from "@/lib/supabaseClient"`
// change it to `import { supabase } from "@/lib/supabaseClient"` (this still works)
