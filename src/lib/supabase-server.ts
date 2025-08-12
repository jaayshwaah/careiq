import { supabaseAdmin } from "./supabase/server";

/**
 * Compatibility shim so older imports like "@/lib/supabase-server"
 * continue to work after moving the file to "@/lib/supabase/server".
 */
export { supabaseAdmin };
export default supabaseAdmin;
