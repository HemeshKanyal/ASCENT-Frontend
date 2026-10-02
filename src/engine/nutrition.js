/**
 * Nutrition targets and guidance.
 *
 * - Energy: Mifflin–St Jeor BMR × light daily activity + today's planned
 *   training (MET-based), then a goal adjustment. Training days get more
 *   food than rest days, mostly as carbohydrate.
 * - Protein: per kg by goal, always capped by a doctor-set limit (and kept
 *   moderate for kidney disease without a number).
 * - Health rules: no crash deficits with gout or during pregnancy/postpartum;
 *   purine, sugary-drink, alcohol and sodium warnings.
 */

import { FOODS } from "./foods.js";

export const ageFrom = (birthYear, now = new Date()) => (birthYear ? now.getFullYear() - birthYear : null);

export function bmr({ sex, weightKg, heightCm, age }) {
  if (!weightKg || !heightCm || !age) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : sex === "female" ? base - 161 : base - 78);
}

// Metabolic equivalents for planned sessions (minus 1 MET already in resting burn).
const MET = {
  strength: 5,
  mobility: 2.8,
  run: { easy: 8.3, recovery: 6, long: 8.5, intervals: 10.5, tempo: 10 },
  bike: { easy: 6.8, recovery: 5, long: 7, intervals: 9.5, tempo: 9, brick: 8.5 },
  swim: { technique: 6, easy: 6.5, long: 7, intervals: 8.5 },
  hyrox: 9,
  conditioning: 8.5,
};

export function sessionCalories(session, minutes, weightKg) {
  if (!session || !weightKg || !minutes) return 0;
  let met = MET[session.kind] ?? 5;
  if (session.kind === "endurance") {
    const d = MET[session.discipline];
    met = typeof d === "number" ? d : d?.[session.type] ?? 7;
  }
  return Math.round((met - 1) * weightKg * (minutes / 60));
}

const PROTEIN_PER_KG = {
  hypertrophy: 1.8,
  strength: 1.8,
  fat_loss: 2.0,
  general: 1.4,
};

const GOAL_ENERGY = {
  fat_loss: -0.2,
  hypertrophy: 0.1,
  strength: 0.05,
  general: 0,
};

/**
 * @param {object} p
 * @param {{sex, weightKg, heightCm, age}} p.body
 * @param {string} p.goal engine goal (hypertrophy | strength | fat_loss | general)
 * @param {string[]} [p.goalIds] full goal ids (recomp, endurance goals…)
 * @param {boolean} [p.enduranceFocus]
 * @param {{conditions: string[], proteinLimitG?: number}} [p.health]
 * @param {{kind, discipline?, type?}|null} [p.session] today's planned session
 * @param {number} [p.sessionMinutes]
 */
export function dailyTargets({ body, goal = "general", goalIds = [], enduranceFocus = false, health = { conditions: [] }, session = null, sessionMinutes = 0 }) {
  const notes = [];
  const base = bmr(body);
  if (!base) return null;
  const weight = body.weightKg;
  const has = (c) => health.conditions?.includes(c);

  const training = sessionCalories(session, sessionMinutes, weight);
  let maintenance = Math.round(base * 1.35 + training);

  let adjust = GOAL_ENERGY[goal] ?? 0;
  if (goalIds.includes("recomp")) adjust = -0.05;
  if (enduranceFocus && adjust > 0) adjust = 0;
  if (adjust < 0 && has("uric_acid")) {
    adjust = Math.max(adjust, -0.1);
    notes.push("Gentle deficit only — fast weight loss raises uric acid.");
  }
  if ((has("pregnancy") || has("postpartum")) && adjust < 0) {
    adjust = 0;
    notes.push("No calorie deficit during pregnancy or postpartum — check targets with your doctor or midwife.");
  }
  let kcal = Math.round(maintenance * (1 + adjust));
  if (adjust < 0) kcal = Math.max(kcal, maintenance - 600, base);

  // Protein
  let perKg = PROTEIN_PER_KG[goal] ?? 1.4;
  if (enduranceFocus) perKg = Math.min(perKg, 1.6);
  if (body.age >= 65) perKg = Math.max(perKg, 1.2);
  let protein = Math.round(perKg * weight);
  if (has("kidney") && !health.proteinLimitG) {
    protein = Math.min(protein, Math.round(0.8 * weight));
    notes.push("Protein kept moderate for kidney health — your doctor's number replaces this.");
  }
  if (health.proteinLimitG) {
    if (protein > health.proteinLimitG) notes.push(`Protein capped at your doctor's limit of ${health.proteinLimitG} g.`);
    protein = Math.min(protein, health.proteinLimitG);
  }

  // When protein is capped, let fat take a little more of the energy instead of piling it all on carbs.
  const capped = protein < Math.round(perKg * weight);
  const fat = Math.max(Math.round((kcal * (capped ? 0.32 : 0.27)) / 9), Math.round(0.6 * weight));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.round((kcal / 1000) * 14);

  let waterMl = Math.round((weight * 35 + (sessionMinutes ? (sessionMinutes / 60) * 500 : 0)) / 50) * 50;
  if (has("uric_acid") && !has("kidney")) {
    waterMl = Math.max(waterMl, 2500);
    notes.push("Aim for plenty of water — it helps clear uric acid.");
  }
  if (has("kidney")) notes.push("Fluid needs vary with kidney disease — follow your doctor's guidance.");

  const sodiumMg = has("hypertension") ? 1500 : 2300;
  if (has("hypertension")) notes.push("Sodium target lowered for blood pressure.");
  if (has("diabetes")) notes.push("Spread carbs across meals and pair them with protein or fibre.");

  return {
    kcal,
    protein,
    carbs,
    fat,
    fiber,
    waterMl,
    sodiumMg,
    trainingKcal: training,
    bmr: base,
    notes,
  };
}

// ── Diet filters & warnings ───────────────────────────────────────────────

const DIET_ALLOWS = {
  none: ["plant", "dairy", "egg", "fish", "meat"],
  pescatarian: ["plant", "dairy", "egg", "fish"],
  eggetarian: ["plant", "dairy", "egg"],
  vegetarian: ["plant", "dairy"],
  vegan: ["plant"],
};

export const DIET_TYPES = {
  none: "No restrictions",
  pescatarian: "Pescatarian",
  eggetarian: "Eggetarian",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
};

export const ALLERGENS = {
  dairy: "Dairy",
  egg: "Eggs",
  gluten: "Gluten",
  nuts: "Tree nuts",
  peanuts: "Peanuts",
  soy: "Soy",
  fish: "Fish",
  shellfish: "Shellfish",
};

export function fitsDiet(food, dietType = "none", allergies = []) {
  const allows = DIET_ALLOWS[dietType] ?? DIET_ALLOWS.none;
  if (food.diet && !allows.includes(food.diet)) return false;
  if (food.allergens?.some((a) => allergies.includes(a))) return false;
  return true;
}

export function foodWarnings(food, conditions = []) {
  const w = [];
  const gout = conditions.includes("uric_acid");
  if (gout) {
    if (food.purine === "high") w.push("High in purines — best avoided with high uric acid.");
    else if (food.purine === "moderate" && ["meat", "fish"].includes(food.diet)) w.push("Moderate purines — keep portions small.");
    if (food.flags?.includes("fructose")) w.push("Sugary drinks raise uric acid.");
    if (food.flags?.includes("alcohol")) w.push("Alcohol, especially beer, raises uric acid.");
  }
  if (conditions.includes("hypertension") && (food.sodium ?? 0) >= 400) w.push("High in sodium.");
  return w;
}

// ── Logging maths ─────────────────────────────────────────────────────────

/** Nutrients in a logged entry: per 100 g × grams, or per serving × servings (supplements). */
export function entryNutrients(entry) {
  const k = entry.servings != null ? entry.servings : (entry.grams ?? 0) / 100;
  const p = entry.per100;
  return {
    kcal: Math.round(p.kcal * k),
    protein: Math.round(p.protein * k * 10) / 10,
    carbs: Math.round(p.carbs * k * 10) / 10,
    fat: Math.round(p.fat * k * 10) / 10,
    fiber: Math.round((p.fiber ?? 0) * k * 10) / 10,
  };
}

export function totals(entries = []) {
  return entries.reduce(
    (t, e) => {
      const n = entryNutrients(e);
      return {
        kcal: t.kcal + n.kcal,
        protein: Math.round((t.protein + n.protein) * 10) / 10,
        carbs: Math.round((t.carbs + n.carbs) * 10) / 10,
        fat: Math.round((t.fat + n.fat) * 10) / 10,
        fiber: Math.round((t.fiber + n.fiber) * 10) / 10,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

/**
 * Foods that close today's protein gap without blowing calories, filtered by
 * diet, allergies and health (low-purine first with gout).
 */
export function suggestFoods({ remaining, dietType = "none", allergies = [], conditions = [], foods = FOODS, limit = 3 }) {
  if (!remaining || remaining.protein < 5) return [];
  const gout = conditions.includes("uric_acid");
  const kcalRoom = Math.max(150, remaining.kcal + 100);

  return foods
    .filter((x) => x.per100.protein >= 8 && fitsDiet(x, dietType, allergies) && x.category !== "meal")
    .filter((x) => !(gout && (x.purine === "high" || x.flags.includes("organ"))))
    .map((x) => {
      const density = x.per100.protein / (x.per100.kcal / 100); // g protein per 100 kcal
      const ideal = (remaining.protein / x.per100.protein) * 100;
      const serving = x.servings[0]?.[1] ?? 100;
      const grams = Math.round(Math.min(ideal, serving * 2, (kcalRoom / x.per100.kcal) * 100) / 5) * 5;
      const protein = Math.round((x.per100.protein * grams) / 100);
      const kcal = Math.round((x.per100.kcal * grams) / 100);
      let score = density * 2 + Math.min(protein, remaining.protein);
      if (gout && x.purine === "moderate" && ["meat", "fish"].includes(x.diet)) score -= 15;
      if (gout && x.diet === "dairy") score += 5; // low-fat dairy is associated with lower uric acid
      return { food: x, grams, protein, kcal, score };
    })
    .filter((s) => s.grams >= 10 && s.protein >= 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...rest }) => rest);
}
