import { type NextRequest } from "next/server";
import {
  apiErrorResponse,
  getUserStore,
  parseServerData,
  requireOwnerId,
  saveUserData,
  validateServerData,
} from "@/lib/server-store";

export async function GET(request: NextRequest) {
  try {
    const ownerId = await requireOwnerId(request);
    const store = await getUserStore(ownerId);
    const data = store ? parseServerData(store.data) : null;
    return Response.json({
      data,
      updatedAt: data ? store?.updatedAt ?? 0 : 0,
      hasApiKey: Boolean(store?.apiKey),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ownerId = await requireOwnerId(request);
    const body = (await request.json()) as { data?: unknown; expectedUpdatedAt?: unknown };
    const data = validateServerData(body.data);
    const expectedUpdatedAt = Number(body.expectedUpdatedAt);
    if (!Number.isSafeInteger(expectedUpdatedAt) || expectedUpdatedAt < 0) {
      return Response.json({ error: "Phiên bản dữ liệu không hợp lệ." }, { status: 400 });
    }

    const result = await saveUserData(ownerId, data, expectedUpdatedAt);
    const response = {
      data: parseServerData(result.store.data),
      updatedAt: result.store.updatedAt,
      hasApiKey: Boolean(result.store.apiKey),
    };
    return Response.json(response, { status: result.conflict ? 409 : 200 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
