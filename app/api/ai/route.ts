import { type NextRequest } from "next/server";
import { apiErrorResponse, getUserStore, requireOwnerId } from "@/lib/server-store";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  try {
    const ownerId = await requireOwnerId(request);
    const { text, today } = (await request.json()) as { text?: unknown; today?: unknown };
    const cleanText = typeof text === "string" ? text.trim() : "";
    const todayString = typeof today === "string" && DATE_PATTERN.test(today) ? today : "";
    if (!cleanText || cleanText.length > 10_000 || !todayString) {
      return Response.json({ error: "Nội dung phân tích không hợp lệ." }, { status: 400 });
    }

    const store = await getUserStore(ownerId);
    if (!store?.apiKey) {
      return Response.json({ error: "Bạn chưa lưu Mistral API key trên máy chủ.", code: "API_KEY_REQUIRED" }, { status: 409 });
    }

    const systemPrompt = "You are a strict task extraction assistant. Respond ONLY with a single valid JSON object. No explanation, no markdown fences, no extra text whatsoever.";
    const userPrompt = `Extract ALL tasks from the following Vietnamese text. Return a JSON object with a "tasks" array.
If the text mentions multiple tasks, return multiple items. If only one task, return one item.

Each task object MUST have these fields:
{
  "title": "short task name in Vietnamese",
  "category": "work|health|growth|home|finance|other",
  "priority": "high|medium|low",
  "energy": "high|medium|low",
  "date": "YYYY-MM-DD (use ${todayString} if not mentioned)",
  "time": "HH:MM if explicitly mentioned, or \"\" if time is unclear or not mentioned",
  "duration": <integer minutes, infer from context or use 30>,
  "outcome": "1-2 sentence success criteria in Vietnamese",
  "preparation": ["item1"],
  "steps": ["step1", "step2"],
  "note": "extra context or empty string"
}

IMPORTANT: Set "time" to empty string "" when the time cannot be clearly determined. Do NOT guess a time.
Return format: { "tasks": [ {...}, {...} ] }

Text: ${JSON.stringify(cleanText)}`;

    const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${store.apiKey}` },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!mistralResponse.ok) {
      return Response.json(
        { error: mistralResponse.status === 401 ? "Mistral API key không hợp lệ." : "Mistral tạm thời không phản hồi." },
        { status: mistralResponse.status === 401 ? 422 : 502 },
      );
    }

    const result = (await mistralResponse.json()) as { choices?: { message?: { content?: string } }[] };
    const content = result.choices?.[0]?.message?.content;
    if (!content) return Response.json({ error: "Mistral trả về dữ liệu rỗng." }, { status: 502 });
    return Response.json({ content });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
