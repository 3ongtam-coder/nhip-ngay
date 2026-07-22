import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export async function getDb() {
  try {
    const { env } = await import("cloudflare:workers");
    const cfEnv = env as { DB?: D1Database };
    if (!cfEnv?.DB) return null;
    return drizzle(cfEnv.DB, { schema });
  } catch {
    return null;
  }
}
