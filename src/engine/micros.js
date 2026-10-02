/**
 * Vitamins, minerals and "limit" nutrients: reference amounts and totals.
 *
 * References: US National Academies Dietary Reference Intakes (RDA/AI) for
 * adults; limits from the Dietary Guidelines (sat fat & added sugar < 10% of
 * energy, sodium 2300 mg) and FDA caffeine guidance. They're for healthy
 * adults — conditions adjust some, and a doctor's advice always wins.
 */

import { FOOD_MICROS } from "./foodMicros.js";

export const NUTRIENTS = [
  // Limits — stay under
  { key: "sugar", label: "Sugar (total)", unit: "g", group: "limit" },
  { key: "satFat", label: "Saturated fat", unit: "g", group: "limit" },
  { key: "sodium", label: "Sodium", unit: "mg", group: "limit" },
  { key: "cholesterol", label: "Cholesterol", unit: "mg", group: "limit" },
  { key: "caffeine", label: "Caffeine", unit: "mg", group: "limit" },
  // Minerals
  { key: "calcium", label: "Calcium", unit: "mg", group: "mineral" },
  { key: "iron", label: "Iron", unit: "mg", group: "mineral" },
  { key: "magnesium", label: "Magnesium", unit: "mg", group: "mineral" },
  { key: "potassium", label: "Potassium", unit: "mg", group: "mineral" },
  { key: "zinc", label: "Zinc", unit: "mg", group: "mineral" },
  { key: "phosphorus", label: "Phosphorus", unit: "mg", group: "mineral" },
  // Vitamins
  { key: "vitA", label: "Vitamin A", unit: "µg", group: "vitamin" },
  { key: "vitC", label: "Vitamin C", unit: "mg", group: "vitamin" },
  { key: "vitD", label: "Vitamin D", unit: "µg", group: "vitamin" },
  { key: "vitE", label: "Vitamin E", unit: "mg", group: "vitamin" },
  { key: "vitK", label: "Vitamin K", unit: "µg", group: "vitamin" },
  { key: "vitB6", label: "Vitamin B6", unit: "mg", group: "vitamin" },
  { key: "vitB12", label: "Vitamin B12", unit: "µg", group: "vitamin" },
  { key: "folate", label: "Folate", unit: "µg", group: "vitamin" },
  { key: "omega3", label: "Omega-3 (EPA+DHA)", unit: "g", group: "vitamin" },
];

export const NUTRIENT_BY_KEY = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n]));

const pickSex = (sex, male, female) => (sex === "male" ? male : sex === "female" ? female : (male + female) / 2);

/**
 * Daily reference per nutrient: { amount, kind: "goal" | "limit", note? }.
 */
export function microReferences({ sex, age = 30, kcal = 2000, conditions = [] }) {
  const has = (c) => conditions.includes(c);
  const pregnant = has("pregnancy");
  const older = age >= 51;
  const r = {};
  const goal = (key, amount, note) => (r[key] = { amount: Math.round(amount * 10) / 10, kind: "goal", note });
  const limit = (key, amount, note) => (r[key] = { amount: Math.round(amount), kind: "limit", note });

  limit("sugar", (kcal * 0.1) / 4, "Guideline is for added sugar; this total includes natural sugar from fruit and milk.");
  limit("satFat", (kcal * 0.1) / 9);
  limit("sodium", has("hypertension") ? 1500 : 2300);
  limit("cholesterol", 300);
  limit("caffeine", pregnant ? 200 : 400);

  goal("calcium", (sex === "female" && older) || age >= 71 ? 1200 : 1000);
  goal("iron", pregnant ? 27 : pickSex(sex, 8, older ? 8 : 18));
  goal("magnesium", pregnant ? 350 : age >= 31 ? pickSex(sex, 420, 320) : pickSex(sex, 400, 310));
  goal("potassium", pickSex(sex, 3400, 2600));
  goal("zinc", pregnant ? 11 : pickSex(sex, 11, 8));
  goal("phosphorus", 700);
  goal("vitA", pregnant ? 770 : pickSex(sex, 900, 700));
  goal("vitC", pregnant ? 85 : pickSex(sex, 90, 75));
  goal("vitD", age >= 71 ? 20 : 15);
  goal("vitE", 15);
  goal("vitK", pickSex(sex, 120, 90));
  goal("vitB6", pregnant ? 1.9 : older ? pickSex(sex, 1.7, 1.5) : 1.3);
  goal("vitB12", pregnant ? 2.6 : 2.4);
  goal("folate", pregnant ? 600 : 400);
  goal("omega3", 0.25, "No official RDA; 250–500 mg EPA+DHA a day is the common guideline (about two portions of oily fish a week).");

  if (has("kidney")) {
    for (const k of ["potassium", "phosphorus"]) r[k] = { amount: r[k].amount, kind: "watch", note: "With kidney disease your doctor sets this — shown for your records, not as a target." };
  }
  return r;
}

/** Micros per 100 g (or per serving for supplements) for a food or log entry. */
export function microsOf(item) {
  return item.micros ?? FOOD_MICROS[item.foodId ?? item.id] ?? null;
}

/** Micros contributed by one logged entry. */
export function entryMicros(entry) {
  const base = microsOf(entry);
  if (!base) return null;
  const k = entry.servings != null ? entry.servings : (entry.grams ?? 0) / 100;
  return Object.fromEntries(Object.entries(base).map(([key, v]) => [key, v * k]));
}

/**
 * Totals across entries, plus how much of the day's calories had vitamin data
 * (so the UI can say "based on 80% of what you ate").
 */
export function microTotals(entries = [], kcalOf = (e) => 0) {
  const totals = {};
  let kcalWith = 0;
  let kcalAll = 0;
  for (const e of entries) {
    const kcal = kcalOf(e);
    kcalAll += kcal;
    const m = entryMicros(e);
    if (!m) continue;
    kcalWith += kcal;
    for (const [k, v] of Object.entries(m)) totals[k] = (totals[k] ?? 0) + v;
  }
  for (const k of Object.keys(totals)) totals[k] = totals[k] < 10 ? Math.round(totals[k] * 100) / 100 : Math.round(totals[k]);
  return { totals, coverage: kcalAll ? kcalWith / kcalAll : entries.length ? 0 : 1 };
}

/** Status of one nutrient against its reference. */
export function microStatus(amount, ref) {
  if (!ref) return "unknown";
  const pct = amount / ref.amount;
  if (ref.kind === "limit") return pct > 1 ? "over" : pct > 0.85 ? "near" : "ok";
  if (ref.kind === "watch") return "info";
  return pct >= 1 ? "met" : pct >= 0.67 ? "close" : "low";
}
