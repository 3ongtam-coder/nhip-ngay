import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api-error";
import {
  createSessionValue,
  isAuthenticated,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifyAppPassword,
} from "@/lib/server-auth";
import { apiErrorResponse } from "@/lib/server-store";

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ authenticated: await isAuthenticated(request) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: unknown };
    const password = typeof body.password === "string" ? body.password : "";
    if (!(await verifyAppPassword(password))) {
      throw new ApiError(401, "Mật khẩu không đúng.");
    }

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(SESSION_COOKIE, await createSessionValue(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
