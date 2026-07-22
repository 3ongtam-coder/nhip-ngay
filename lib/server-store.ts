import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { userStores } from "@/db/schema";

export type ServerData = {
  tasks: unknown[];
  reflection: { win: string; improve: string; tomorrow: string };
  history: Record<string, { total: number; done: number }>;
};

export type UserStore = {
  ownerId: string;
  data: string;
  apiKey: string;
  createdAt: number;
  updatedAt: number;
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const MAX_DATA_BYTES = 1_500_000;

export async function requireOwnerId(request: NextRequest): Promise<string> {
  const email = request.headers.get(USER_EMAIL_HEADER)?.trim().toLowerCase();
  if (!email) {
    if (process.env.NODE_ENV !== "production") return "local-development-user";
    throw new ApiError(401, "Bạn cần đăng nhập để đồng bộ dữ liệu.");
  }

  const bytes = new TextEncoder().encode(email);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getUserStore(ownerId: string): Promise<UserStore | null> {
  const db = await requireDb();
  const rows = await db.select().from(userStores).where(eq(userStores.ownerId, ownerId)).limit(1);
  return rows[0] ?? null;
}

export async function saveUserData(
  ownerId: string,
  data: ServerData,
  expectedUpdatedAt: number,
): Promise<{ store: UserStore; conflict: boolean }> {
  const db = await requireDb();
  const current = await getUserStore(ownerId);
  const currentHasData = current ? Boolean(parseServerData(current.data)) : false;
  if (current && currentHasData && current.updatedAt !== expectedUpdatedAt) {
    return { store: current, conflict: true };
  }
  if (!current && expectedUpdatedAt !== 0) {
    throw new ApiError(409, "Dữ liệu trên máy chủ đã thay đổi.");
  }

  const now = Math.max(Date.now(), (current?.updatedAt ?? 0) + 1);
  const dataString = JSON.stringify(data);
  if (current) {
    const currentVersion = currentHasData ? expectedUpdatedAt : current.updatedAt;
    const updated = await db
      .update(userStores)
      .set({ data: dataString, updatedAt: now })
      .where(and(eq(userStores.ownerId, ownerId), eq(userStores.updatedAt, currentVersion)))
      .returning();
    if (updated.length === 0) {
      const latest = await getUserStore(ownerId);
      if (!latest) throw new Error("Dữ liệu máy chủ biến mất trong lúc lưu.");
      return { store: latest, conflict: true };
    }
  } else {
    try {
      await db.insert(userStores).values({ ownerId, data: dataString, apiKey: "", createdAt: now, updatedAt: now });
    } catch (error) {
      const latest = await getUserStore(ownerId);
      if (latest) return { store: latest, conflict: true };
      throw error;
    }
  }

  const saved = await getUserStore(ownerId);
  if (!saved) throw new Error("Không thể đọc lại dữ liệu vừa lưu.");
  return { store: saved, conflict: false };
}

export async function saveUserApiKey(ownerId: string, apiKey: string): Promise<void> {
  const db = await requireDb();
  const now = Date.now();
  await db
    .insert(userStores)
    .values({ ownerId, data: "{}", apiKey, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: userStores.ownerId,
      set: { apiKey },
    });
}

export async function deleteUserApiKey(ownerId: string): Promise<void> {
  const db = await requireDb();
  await db.update(userStores).set({ apiKey: "" }).where(eq(userStores.ownerId, ownerId));
}

export function parseServerData(value: string): ServerData | null {
  try {
    return validateServerData(JSON.parse(value));
  } catch {
    return null;
  }
}

export function validateServerData(value: unknown): ServerData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "Dữ liệu đồng bộ không hợp lệ.");
  }
  const candidate = value as Partial<ServerData>;
  if (!Array.isArray(candidate.tasks) || candidate.tasks.length > 5000) {
    throw new ApiError(400, "Danh sách công việc không hợp lệ.");
  }
  for (const task of candidate.tasks) {
    if (!isValidTask(task)) throw new ApiError(400, "Có công việc chứa dữ liệu không hợp lệ.");
  }
  if (!candidate.reflection || typeof candidate.reflection !== "object") {
    throw new ApiError(400, "Nhật ký không hợp lệ.");
  }
  if (!candidate.history || typeof candidate.history !== "object" || Array.isArray(candidate.history)) {
    throw new ApiError(400, "Lịch sử không hợp lệ.");
  }
  if (Object.keys(candidate.history).length > 5000) {
    throw new ApiError(400, "Lịch sử vượt quá giới hạn.");
  }
  for (const record of Object.values(candidate.history)) {
    if (
      !record ||
      typeof record !== "object" ||
      !Number.isSafeInteger(record.total) ||
      !Number.isSafeInteger(record.done) ||
      record.total < 0 ||
      record.done < 0 ||
      record.done > record.total
    ) {
      throw new ApiError(400, "Lịch sử chứa dữ liệu không hợp lệ.");
    }
  }

  const data: ServerData = {
    tasks: candidate.tasks,
    reflection: {
      win: String(candidate.reflection.win ?? ""),
      improve: String(candidate.reflection.improve ?? ""),
      tomorrow: String(candidate.reflection.tomorrow ?? ""),
    },
    history: candidate.history,
  };
  if (new TextEncoder().encode(JSON.stringify(data)).byteLength > MAX_DATA_BYTES) {
    throw new ApiError(413, "Dữ liệu đồng bộ vượt quá giới hạn 1.5 MB.");
  }
  return data;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const messages: string[] = [];
  let current: unknown = error;
  while (current instanceof Error && messages.length < 4) {
    messages.push(current.message);
    current = current.cause;
  }
  const combined = messages.join("\n");
  const databaseMissing = combined.includes("no such table") || combined.includes("Database unavailable");
  const publicMessage = databaseMissing ? "Kho dữ liệu máy chủ chưa được khởi tạo." : "Không thể xử lý dữ liệu máy chủ.";
  return Response.json(
    { error: publicMessage },
    { status: 503 },
  );
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db;
}

function isValidTask(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const task = value as Record<string, unknown>;
  const category = ["work", "health", "growth", "home", "finance", "other"];
  const levels = ["high", "medium", "low"];
  return (
    typeof task.id === "string" && task.id.length > 0 &&
    typeof task.title === "string" && task.title.length > 0 &&
    category.includes(String(task.category)) &&
    typeof task.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.date) &&
    typeof task.time === "string" && (task.time === "" || /^\d{2}:\d{2}$/.test(task.time)) &&
    typeof task.duration === "number" && Number.isFinite(task.duration) && task.duration >= 0 &&
    levels.includes(String(task.priority)) &&
    levels.includes(String(task.energy)) &&
    typeof task.outcome === "string" &&
    typeof task.note === "string" &&
    Array.isArray(task.preparation) && task.preparation.every(isValidCheckItem) &&
    Array.isArray(task.steps) && task.steps.every(isValidCheckItem) &&
    typeof task.done === "boolean" &&
    typeof task.createdAt === "number" && Number.isFinite(task.createdAt)
  );
}

function isValidCheckItem(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.text === "string" && typeof item.done === "boolean";
}
