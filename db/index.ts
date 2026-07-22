import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  try {
    const cfEnv = env as { DB?: D1Database };
    if (!cfEnv?.DB) return null;
    return drizzle(cfEnv.DB, { schema });
  } catch {
    return null;
  }
}
