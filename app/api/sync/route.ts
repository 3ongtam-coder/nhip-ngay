import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { syncStores } from "@/db/schema";

// Fallback in-memory store if D1 database is not initialized yet
const memoryStore = new Map<string, { data: string; updatedAt: number }>();

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Missing sync code" }, { status: 400 });
  }

  try {
    const db = getDb();
    if (db) {
      const records = await db.select().from(syncStores).where(eq(syncStores.code, code)).limit(1);
      if (records.length > 0) {
        const item = records[0];
        return NextResponse.json({
          code: item.code,
          data: JSON.parse(item.data),
          updatedAt: item.updatedAt,
        });
      }
    }
  } catch {
    // Failover to memoryStore
  }

  const cached = memoryStore.get(code);
  if (cached) {
    return NextResponse.json({
      code,
      data: JSON.parse(cached.data),
      updatedAt: cached.updatedAt,
    });
  }

  return NextResponse.json({ code, data: null, updatedAt: 0 });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { code?: string; data?: unknown };
    const rawCode = body.code?.trim().toUpperCase();
    if (!rawCode || !body.data) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const updatedAt = Date.now();
    const dataString = JSON.stringify(body.data);

    // Save to memoryStore fallback
    memoryStore.set(rawCode, { data: dataString, updatedAt });

    try {
      const db = getDb();
      if (db) {
        await db
          .insert(syncStores)
          .values({ code: rawCode, data: dataString, updatedAt })
          .onConflictDoUpdate({
            target: syncStores.code,
            set: { data: dataString, updatedAt },
          });
      }
    } catch {
      // Failover to memoryStore succeeded
    }

    return NextResponse.json({ ok: true, code: rawCode, updatedAt });
  } catch {
    return NextResponse.json({ error: "Failed to save sync data" }, { status: 500 });
  }
}
