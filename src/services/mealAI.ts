/** Client for the meal-photo AI route (app/api/meal-photo+api.ts). */
import Constants from "expo-constants";
import { Platform } from "react-native";

import { parseMeal, type Food } from "../engine";

export type AIItem = {
  name: string;
  portion: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  confidence: "high" | "medium" | "low";
};
export type AIResult = { is_food: boolean; items: AIItem[]; notes: string };
export type AIError = "not_configured" | "offline" | "refused" | "busy" | "too_large" | "failed";

/** The server that serves the app also serves the API route (dev server or tunnel). */
function apiBase() {
  if (Platform.OS === "web") return "";
  const host = Constants.expoConfig?.hostUri ?? "";
  if (!host) return "";
  return `${host.includes("exp.direct") ? "https" : "http"}://${host}`;
}

export async function analyzeMeal(input: { image?: string; mediaType?: string; hint?: string }): Promise<{ ok: true; result: AIResult } | { ok: false; error: AIError }> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/meal-photo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, error: "offline" };
  }
  if (res.ok) return { ok: true, result: (await res.json()) as AIResult };
  const body = await res.json().catch(() => ({}));
  const known: AIError[] = ["not_configured", "refused", "busy", "too_large"];
  return { ok: false, error: known.includes(body.error) ? body.error : "failed" };
}

export const AI_ERROR_TEXT: Record<AIError, string> = {
  not_configured: "Photo analysis isn't set up yet — it needs an Anthropic API key on the server (ANTHROPIC_API_KEY in .env.local).",
  offline: "Couldn't reach the ASCENT server. Check your connection and that the app server is running.",
  refused: "The AI couldn't analyse this photo. Try another angle or describe the meal instead.",
  busy: "The AI is busy right now — try again in a minute.",
  too_large: "That photo is too large — try again with a smaller one.",
  failed: "Something went wrong analysing the photo. Try again, or describe the meal instead.",
};

/**
 * Turn AI items into foods to log. If the dish matches our USDA-backed list, use that
 * food's nutrition (it carries vitamins & minerals) with the AI's portion; otherwise
 * use the AI's own numbers.
 */
export function toLoggable(items: AIItem[]): { food: Food & { source?: string }; grams: number; label: string; note?: string }[] {
  return items
    .filter((i) => i.grams > 0)
    .map((i) => {
      const local = parseMeal(i.name.replace(/\(.*?\)/g, " ") + " " + (i.name.match(/\((.*?)\)/)?.[1] ?? "")).items[0]?.food;
      const note = i.confidence === "low" ? "Low confidence — check the portion." : undefined;
      if (local) return { food: local, grams: Math.round(i.grams), label: i.portion, note };
      const k = 100 / i.grams;
      const food: Food & { source: string } = {
        id: `ai_${i.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        name: i.name,
        category: "ai",
        per100: {
          kcal: Math.round(i.kcal * k),
          protein: Math.round(i.protein_g * k * 10) / 10,
          carbs: Math.round(i.carbs_g * k * 10) / 10,
          fat: Math.round(i.fat_g * k * 10) / 10,
          fiber: Math.round(i.fiber_g * k * 10) / 10,
        },
        servings: [[i.portion, Math.round(i.grams)]],
        allergens: [],
        flags: [],
        aliases: [],
        source: "custom",
      };
      return { food, grams: Math.round(i.grams), label: i.portion, note };
    });
}
