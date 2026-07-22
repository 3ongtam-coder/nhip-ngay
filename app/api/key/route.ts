import { type NextRequest } from "next/server";
import {
  apiErrorResponse,
  deleteUserApiKey,
  getUserStore,
  requireOwnerId,
  saveUserApiKey,
} from "@/lib/server-store";

export async function GET(request: NextRequest) {
  try {
    const ownerId = await requireOwnerId(request);
    const store = await getUserStore(ownerId);
    return Response.json({ hasKey: Boolean(store?.apiKey) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = await requireOwnerId(request);
    const { key } = (await request.json()) as { key?: unknown };
    const cleanKey = typeof key === "string" ? key.trim() : "";
    if (cleanKey.length < 10 || cleanKey.length > 500) {
      return Response.json({ error: "API key không hợp lệ." }, { status: 400 });
    }
    await saveUserApiKey(ownerId, cleanKey);
    return Response.json({ ok: true, hasKey: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ownerId = await requireOwnerId(request);
    await deleteUserApiKey(ownerId);
    return Response.json({ ok: true, hasKey: false });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
