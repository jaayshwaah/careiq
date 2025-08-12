import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";

/** Drizzle client bound to Vercel Postgres */
export const db = drizzle(sql);
export { sql } from "@vercel/postgres";
