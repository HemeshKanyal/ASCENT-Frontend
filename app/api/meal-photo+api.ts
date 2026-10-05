/**
 * Meal estimate from a photo and/or a description, using a vision model.
 * Runs on the dev/web server so the API key never ships in the app.
 * Provider: Gemini when GEMINI_API_KEY is set (free tier), else Claude with
 * ANTHROPIC_API_KEY (see .env.example). Both return the same MealEstimate shape.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const Item = z.object({
  name: z.string().describe("Common English name, local name in brackets if different, e.g. 'Kidney bean curry (rajma)'"),
  portion: z.string().describe("Household description, e.g. '1 bowl', '3 rotis', '1 glass'"),
  grams: z.number().describe("Estimated edible weight in grams (ml for drinks)"),
  kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number(),
  confidence: z.enum(["high", "medium", "low"]),
});
const MealEstimate = z.object({
  is_food: z.boolean(),
  items: z.array(Item),
  notes: z.string().describe("One or two short sentences: assumptions made, anything hard to see"),
});

const SYSTEM = `You estimate what's in a meal and how much, for a nutrition tracker used by people without a kitchen scale.
- Identify each distinct food or drink. Name dishes the way the person would (Indian, global, home-cooked or restaurant).
- Estimate portions from visual cues: a dinner plate is about 26 cm across, a katori holds about 150 ml, a glass about 250 ml, one roti is about 40 g, one idli about 40 g.
- Count discrete items (rotis, eggs, idlis, pieces) carefully.
- Include cooking fat that is typical for the dish (ghee or oil in curries, butter on bread) inside that dish's numbers.
- Nutrition values are for the estimated portion, not per 100 g.
- If the person describes the meal, trust their description for what the foods are and their counts; use the photo for portion sizes.
- Use "low" confidence when a portion is hidden, stacked, or ambiguous, and say so in notes.
- If there is no food, set is_food to false and return no items.`;

const MAX_BASE64 = 7_000_000; // ~5 MB image

type Media = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
type Input = { image?: string; media: Media; prompt: string };
type Result = { ok: true; data: unknown } | { ok: false; error: string; status: number };

export async function POST(request: Request) {
  const provider = process.env.GEMINI_API_KEY ? estimateWithGemini : process.env.ANTHROPIC_API_KEY ? estimateWithClaude : null;
  if (!provider) return Response.json({ error: "not_configured" }, { status: 503 });
  let body: { image?: string; mediaType?: string; hint?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const { image, mediaType = "image/jpeg", hint } = body;
  if (!image && !hint?.trim()) return Response.json({ error: "bad_request" }, { status: 400 });
  if (image && image.length > MAX_BASE64) return Response.json({ error: "too_large" }, { status: 413 });
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  const media = (allowed as readonly string[]).includes(mediaType) ? (mediaType as Media) : "image/jpeg";
  const prompt = hint?.trim() ? `The person says: "${hint.trim().slice(0, 500)}"` : "Estimate this meal.";

  const result = await provider({ image, media, prompt });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result.data);
}

/** Gemini REST with a JSON schema, so no extra SDK is needed. */
async function estimateWithGemini({ image, media, prompt }: Input): Promise<Result> {
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const parts: object[] = [];
  if (image) parts.push({ inline_data: { mime_type: media, data: image } });
  parts.push({ text: prompt });
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(MealEstimate) },
      }),
    });
  } catch {
    return { ok: false, error: "failed", status: 502 };
  }
  if (res.status === 401 || res.status === 403) return { ok: false, error: "not_configured", status: 503 };
  if (res.status === 429) return { ok: false, error: "busy", status: 429 };
  if (!res.ok) return { ok: false, error: "failed", status: 502 };
  const json = await res.json();
  const candidate = json.candidates?.[0];
  if (json.promptFeedback?.blockReason || candidate?.finishReason === "SAFETY") return { ok: false, error: "refused", status: 422 };
  const text = candidate?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  try {
    const parsed = MealEstimate.safeParse(JSON.parse(text));
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: "failed", status: 502 };
  } catch {
    return { ok: false, error: "failed", status: 502 };
  }
}

async function estimateWithClaude({ image, media, prompt }: Input): Promise<Result> {
  const content: Anthropic.ContentBlockParam[] = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: media, data: image } });
  content.push({ type: "text", text: prompt });

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: process.env.ASCENT_MEAL_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: "medium", format: zodOutputFormat(MealEstimate) },
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") return { ok: false, error: "refused", status: 422 };
    if (!response.parsed_output) return { ok: false, error: "failed", status: 502 };
    return { ok: true, data: response.parsed_output };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "not_configured", status: 503 };
    if (error instanceof Anthropic.RateLimitError) return { ok: false, error: "busy", status: 429 };
    return { ok: false, error: "failed", status: 502 };
  }
}
