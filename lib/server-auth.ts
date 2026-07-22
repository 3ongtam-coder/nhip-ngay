import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";

export const SESSION_COOKIE = "nhip-ngay-session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const SESSION_PREFIX = "nhip-ngay-session-v1";
const MIN_PASSWORD_LENGTH = 12;

export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const secret = await getAppPassword();
  const value = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const match = /^(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(value);
  if (!match) return false;

  const expiresAt = Number(match[1]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;

  const expected = await signSession(secret, expiresAt);
  return constantTimeEqual(match[2], expected);
}

export async function requireAppSession(request: NextRequest): Promise<void> {
  if (!(await isAuthenticated(request))) {
    throw new ApiError(401, "Bạn cần đăng nhập để đồng bộ dữ liệu.");
  }
}

export async function verifyAppPassword(candidate: string): Promise<boolean> {
  const secret = await getAppPassword();
  const [candidateDigest, secretDigest] = await Promise.all([
    sha256(candidate),
    sha256(secret),
  ]);
  return constantTimeEqual(candidateDigest, secretDigest);
}

export async function createSessionValue(): Promise<string> {
  const secret = await getAppPassword();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  return `${expiresAt}.${await signSession(secret, expiresAt)}`;
}

async function getAppPassword(): Promise<string> {
  let value = "";
  try {
    const { env } = await import("cloudflare:workers");
    value = String((env as { APP_PASSWORD?: string }).APP_PASSWORD ?? "");
  } catch {
    // Local Node-based tests do not provide the Cloudflare runtime module.
  }
  if (!value) value = process.env.APP_PASSWORD ?? "";

  if (value.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(503, "Máy chủ chưa được cấu hình mật khẩu ứng dụng.");
  }
  return value;
}

async function signSession(secret: string, expiresAt: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${SESSION_PREFIX}:${expiresAt}`),
  );
  return toBase64Url(new Uint8Array(signature));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}
