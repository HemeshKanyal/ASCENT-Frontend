/**
 * Open Food Facts — free, open database of packaged foods.
 * Used for search beyond the built-in list and for barcode lookups.
 */
import { Platform } from "react-native";

import type { Food, Micros } from "../engine";

/**
 * OFF's search endpoints don't allow browser (CORS) requests, so packaged-food
 * search works in the phone app only. Barcode lookups do allow it.
 * TODO: proxy search through ASCENT-Backend to enable it on the web.
 */
export const PACKAGED_SEARCH_AVAILABLE = Platform.OS !== "web";

const UA = "ASCENT/1.0 (github.com/HemeshKanyal/ASCENT-Frontend)";
const FIELDS = "code,product_name,brands,nutriments,serving_size,serving_quantity,allergens_tags";

const ALLERGEN_MAP: Record<string, string> = {
  "en:milk": "dairy",
  "en:eggs": "egg",
  "en:gluten": "gluten",
  "en:nuts": "nuts",
  "en:peanuts": "peanuts",
  "en:soybeans": "soy",
  "en:fish": "fish",
  "en:crustaceans": "shellfish",
  "en:molluscs": "shellfish",
};

export type RemoteFood = Food & { brand?: string; barcode?: string; source: "off"; micros?: Micros };

// OFF stores nutrients per 100 g in grams; convert to our units.
const OFF_MICROS: [string, keyof Micros, number][] = [
  ["sugars_100g", "sugar", 1],
  ["saturated-fat_100g", "satFat", 1],
  ["cholesterol_100g", "cholesterol", 1000],
  ["sodium_100g", "sodium", 1000],
  ["potassium_100g", "potassium", 1000],
  ["calcium_100g", "calcium", 1000],
  ["iron_100g", "iron", 1000],
  ["magnesium_100g", "magnesium", 1000],
  ["zinc_100g", "zinc", 1000],
  ["phosphorus_100g", "phosphorus", 1000],
  ["vitamin-a_100g", "vitA", 1e6],
  ["vitamin-c_100g", "vitC", 1000],
  ["vitamin-d_100g", "vitD", 1e6],
  ["vitamin-e_100g", "vitE", 1000],
  ["vitamin-k_100g", "vitK", 1e6],
  ["vitamin-b6_100g", "vitB6", 1000],
  ["vitamin-b12_100g", "vitB12", 1e6],
  ["folates_100g", "folate", 1e6],
  ["caffeine_100g", "caffeine", 1000],
];

function offMicros(n: Record<string, number | undefined>): Micros | undefined {
  const out: Micros = {};
  for (const [field, key, factor] of OFF_MICROS) {
    const v = n[field];
    if (v != null && Number.isFinite(Number(v))) out[key] = Math.round(Number(v) * factor * 100) / 100;
  }
  const epa = Number(n["eicosapentaenoic-acid_100g"] ?? 0);
  const dha = Number(n["docosahexaenoic-acid_100g"] ?? 0);
  if (epa || dha) out.omega3 = Math.round((epa + dha) * 1000) / 1000;
  return Object.keys(out).length ? out : undefined;
}

type OffProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, number | undefined>;
  serving_size?: string;
  serving_quantity?: number | string;
  allergens_tags?: string[];
};

function toFood(p: OffProduct): RemoteFood | null {
  const n = p.nutriments ?? {};
  const kcal = n["energy-kcal_100g"] ?? (n["energy_100g"] ? Number(n["energy_100g"]) / 4.184 : undefined);
  if (!p.product_name || kcal == null) return null;
  const servingQty = Number(p.serving_quantity);
  return {
    id: `off:${p.code}`,
    name: p.product_name,
    brand: p.brands?.split(",")[0]?.trim(),
    barcode: p.code,
    category: "packaged",
    per100: {
      kcal: Math.round(Number(kcal)),
      protein: Math.round(Number(n["proteins_100g"] ?? 0) * 10) / 10,
      carbs: Math.round(Number(n["carbohydrates_100g"] ?? 0) * 10) / 10,
      fat: Math.round(Number(n["fat_100g"] ?? 0) * 10) / 10,
      fiber: Math.round(Number(n["fiber_100g"] ?? 0) * 10) / 10,
    },
    servings: servingQty > 0 ? [[p.serving_size ?? `${servingQty} g`, servingQty]] : [],
    // Unknown for packaged foods; diet filters treat undefined as "fits".
    diet: undefined,
    allergens: (p.allergens_tags ?? []).map((t) => ALLERGEN_MAP[t]).filter(Boolean),
    purine: undefined,
    flags: [],
    aliases: [],
    sodium: n["sodium_100g"] != null ? Math.round(Number(n["sodium_100g"]) * 1000) : undefined,
    micros: offMicros(n),
    source: "off",
  };
}

async function getJson(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // OFF asks apps to identify themselves; browsers would turn the header into a CORS preflight.
    const headers = Platform.OS === "web" ? undefined : { "User-Agent": UA };
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function searchOpenFoodFacts(query: string): Promise<RemoteFood[]> {
  const q = encodeURIComponent(query.trim());
  try {
    const data = await getJson(`https://search.openfoodfacts.org/search?q=${q}&page_size=20&fields=${FIELDS}`);
    return (data.hits ?? []).map(toFood).filter(Boolean) as RemoteFood[];
  } catch {
    const data = await getJson(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&json=1&page_size=20&fields=${FIELDS}`
    );
    return (data.products ?? []).map(toFood).filter(Boolean) as RemoteFood[];
  }
}

export async function lookupBarcode(code: string): Promise<RemoteFood | null> {
  const data = await getJson(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=${FIELDS}`);
  if (data.status !== 1 || !data.product) return null;
  return toFood({ ...data.product, code });
}
