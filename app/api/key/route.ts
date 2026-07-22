import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "nhip-ngay-api-key";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function GET() {
  const jar = await cookies();
  const key = jar.get(COOKIE_NAME)?.value ?? "";
  return NextResponse.json({ key });
}

export async function POST(req: NextRequest) {
  const { key } = (await req.json()) as { key?: string };
  if (typeof key !== "string" || !key.trim()) {
    return NextResponse.json({ error: "invalid key" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, key.trim(), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: ONE_YEAR,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return res;
}
