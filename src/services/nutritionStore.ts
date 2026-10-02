/**
 * Food, water and body-weight logs (on device), plus today's targets.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  SUPPLEMENT_BY_ID,
  ageFrom,
  blockWeek,
  dailyTargets,
  entryNutrients,
  microReferences,
  microTotals,
  totals,
  type Food,
  type MicroRef,
  type Micros,
  type Per100,
  type PlannedDay,
  type Targets,
} from "../engine";
import { goalById, planIntent } from "../data/goals";
import { dateKey, getProfile, minutesFor, saveProfile, weekPlanFor, WEEKDAYS, type Block, type Profile } from "./trainingStore";

export type Meal = "breakfast" | "lunch" | "dinner" | "snacks";

export const MEALS: { id: Meal; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snacks", label: "Snacks" },
];

export type FoodEntry = {
  id: string;
  meal: Meal | "supplements";
  name: string;
  grams: number;
  /** Supplements count servings instead of grams (per100 then means per serving). */
  servings?: number;
  /** Vitamins & minerals snapshot for packaged/custom/supplement entries (built-in foods are looked up by id). */
  micros?: Micros;
  supplementId?: string;
  servingLabel?: string;
  per100: Per100;
  source: "local" | "off" | "custom" | "quick";
  foodId?: string;
  diet?: string;
  purine?: string;
  flags?: string[];
  allergens?: string[];
  sodium?: number;
  createdAt: string;
};

export type WeightEntry = { date: string; kg: number };

const KEYS = {
  food: "FOOD_LOG",
  water: "WATER_LOG",
  weight: "WEIGHT_LOG",
  custom: "CUSTOM_FOODS",
  recent: "RECENT_FOODS",
  stack: "SUPPLEMENT_STACK",
};

// ── Supplements ───────────────────────────────────────────────────────────

export type StackItem = { id: string; qty: number };

export const getStack = () => read<StackItem[]>(KEYS.stack, []);
export const saveStack = (stack: StackItem[]) => write(KEYS.stack, stack);

/** Mark a supplement as taken (or not) for a day. */
export async function setSupplementTaken(day: string, suppId: string, qty: number, taken: boolean) {
  const log = await read<Record<string, FoodEntry[]>>(KEYS.food, {});
  const entries = (log[day] ?? []).filter((e) => e.supplementId !== suppId);
  const supp = SUPPLEMENT_BY_ID[suppId];
  if (taken && supp) {
    entries.push({
      id: `sup_${suppId}_${Date.now()}`,
      meal: "supplements",
      name: supp.name,
      grams: 0,
      servings: qty,
      servingLabel: qty === 1 ? supp.serving : `${qty} × ${supp.serving}`,
      per100: supp.per,
      micros: supp.micros,
      supplementId: suppId,
      source: "local",
      diet: supp.diet,
      allergens: supp.allergens,
      createdAt: new Date().toISOString(),
    });
  }
  log[day] = entries;
  await write(KEYS.food, log);
}

async function read<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
const write = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value));

// ── Food log ──────────────────────────────────────────────────────────────

export async function getDayEntries(day: string): Promise<FoodEntry[]> {
  const log = await read<Record<string, FoodEntry[]>>(KEYS.food, {});
  return log[day] ?? [];
}

export async function addEntry(day: string, food: Food & { source?: string; micros?: Micros }, grams: number, meal: Meal, servingLabel?: string) {
  const log = await read<Record<string, FoodEntry[]>>(KEYS.food, {});
  const entry: FoodEntry = {
    id: `fe_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
    meal,
    name: food.name,
    grams,
    servingLabel,
    per100: food.per100,
    source: (food.source as FoodEntry["source"]) ?? "local",
    foodId: food.id,
    diet: food.diet,
    purine: food.purine,
    flags: food.flags,
    allergens: food.allergens,
    sodium: food.sodium,
    micros: food.micros,
    createdAt: new Date().toISOString(),
  };
  log[day] = [...(log[day] ?? []), entry];
  await write(KEYS.food, log);
  await rememberRecent(food);
  return entry;
}

export async function removeEntry(day: string, id: string) {
  const log = await read<Record<string, FoodEntry[]>>(KEYS.food, {});
  log[day] = (log[day] ?? []).filter((e) => e.id !== id);
  await write(KEYS.food, log);
}

/** Copy a meal from another day (e.g. "same breakfast as yesterday"). */
export async function copyMeal(fromDay: string, toDay: string, meal: Meal) {
  const log = await read<Record<string, FoodEntry[]>>(KEYS.food, {});
  const copies = (log[fromDay] ?? [])
    .filter((e) => e.meal === meal)
    .map((e) => ({ ...e, id: `fe_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, createdAt: new Date().toISOString() }));
  log[toDay] = [...(log[toDay] ?? []), ...copies];
  await write(KEYS.food, log);
  return copies.length;
}

// ── Recent & custom foods ─────────────────────────────────────────────────

export async function getRecentFoods(): Promise<Food[]> {
  return read<Food[]>(KEYS.recent, []);
}

async function rememberRecent(food: Food) {
  const recent = await getRecentFoods();
  await write(KEYS.recent, [food, ...recent.filter((f) => f.id !== food.id)].slice(0, 25));
}

export async function getCustomFoods(): Promise<Food[]> {
  return read<Food[]>(KEYS.custom, []);
}

export async function saveCustomFood(input: { name: string; servingGrams: number; kcal: number; protein: number; carbs: number; fat: number }) {
  const k = 100 / Math.max(1, input.servingGrams);
  const food: Food & { source: string } = {
    id: `custom_${Date.now()}`,
    name: input.name,
    category: "custom",
    per100: {
      kcal: Math.round(input.kcal * k),
      protein: Math.round(input.protein * k * 10) / 10,
      carbs: Math.round(input.carbs * k * 10) / 10,
      fat: Math.round(input.fat * k * 10) / 10,
      fiber: 0,
    },
    servings: [["1 serving", input.servingGrams]],
    diet: undefined,
    allergens: [],
    purine: undefined,
    flags: [],
    aliases: [],
    source: "custom",
  };
  const custom = await getCustomFoods();
  await write(KEYS.custom, [food, ...custom]);
  return food;
}

// ── Water ─────────────────────────────────────────────────────────────────

export async function getWater(day: string) {
  const log = await read<Record<string, number>>(KEYS.water, {});
  return log[day] ?? 0;
}

export async function addWater(day: string, ml: number) {
  const log = await read<Record<string, number>>(KEYS.water, {});
  log[day] = Math.max(0, (log[day] ?? 0) + ml);
  await write(KEYS.water, log);
  return log[day];
}

// ── Body weight ───────────────────────────────────────────────────────────

export async function getWeights(): Promise<WeightEntry[]> {
  const list = await read<WeightEntry[]>(KEYS.weight, []);
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** Log today's weight; it also becomes the weight targets are calculated from. */
export async function logWeight(kg: number, day = dateKey()) {
  const list = (await getWeights()).filter((w) => w.date !== day);
  list.push({ date: day, kg });
  await write(KEYS.weight, list);
  const profile = await getProfile();
  if (profile) await saveProfile({ ...profile, body: { ...profile.body, weightKg: kg } });
}

/** 7-day average and change versus the week before. */
export function weightTrend(list: WeightEntry[]) {
  if (!list.length) return null;
  const avg = (from: number, to: number) => {
    const xs = list.filter((w) => {
      const age = (Date.now() - new Date(w.date).getTime()) / 864e5;
      return age >= from && age < to;
    });
    return xs.length ? xs.reduce((a, b) => a + b.kg, 0) / xs.length : null;
  };
  const thisWeek = avg(0, 7);
  const lastWeek = avg(7, 14);
  return {
    latest: list[list.length - 1].kg,
    average: thisWeek != null ? Math.round(thisWeek * 10) / 10 : null,
    change: thisWeek != null && lastWeek != null ? Math.round((thisWeek - lastWeek) * 10) / 10 : null,
  };
}

// ── Targets ───────────────────────────────────────────────────────────────

export type DayNutrition = {
  profile: Profile;
  targets: Targets | null;
  plannedDay: PlannedDay | null;
  entries: FoodEntry[];
  eaten: ReturnType<typeof totals>;
  water: number;
  micros: { totals: Micros; coverage: number };
  refs: Record<string, MicroRef>;
};

export async function loadDay(day: string): Promise<DayNutrition | null> {
  const profile = await getProfile();
  if (!profile) return null;
  const block = JSON.parse((await AsyncStorage.getItem("TRAINING_BLOCK")) ?? "null") as Block | null;

  const date = new Date(`${day}T12:00:00`);
  let plannedDay: PlannedDay | null = null;
  let sessionMinutes = 0;
  if (block) {
    const plan = weekPlanFor(profile, block, date);
    const weekday = WEEKDAYS[(date.getDay() + 6) % 7].id;
    plannedDay = plan[weekday] ?? null;
    // Today's override (e.g. "train anyway") counts too.
    const override = JSON.parse((await AsyncStorage.getItem("TODAY_OVERRIDE")) ?? "null");
    if (override?.date === day) plannedDay = override.day;
    if (plannedDay) {
      const week = blockWeek(block, date);
      sessionMinutes = minutesFor(plannedDay, profile, block.deloadLastWeek && week === block.weeks);
    }
  }

  const { weightKg, heightCm, sex, birthYear } = profile.body;
  const kinds = profile.goals.map((g) => goalById(g)?.kind);
  const targets =
    weightKg && heightCm && birthYear
      ? dailyTargets({
          body: { sex, weightKg, heightCm, age: ageFrom(birthYear) },
          goal: profile.goal,
          goalIds: profile.goals,
          enduranceFocus: planIntent(profile.goals, profile.primaryGoal).focus === "endurance" || kinds.includes("endurance"),
          health: profile.health,
          session: plannedDay,
          sessionMinutes,
        })
      : null;

  const entries = await getDayEntries(day);
  const age = ageFrom(birthYear);
  return {
    profile,
    targets,
    plannedDay,
    entries,
    eaten: totals(entries),
    water: await getWater(day),
    micros: microTotals(entries, (e) => entryNutrients(e).kcal),
    refs: microReferences({ sex, age: age ?? 30, kcal: targets?.kcal ?? 2000, conditions: profile.health.conditions }),
  };
}

export type DaySummary = { day: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number; water: number; micros: Micros; coverage: number; logged: boolean };

/** One summary per day for the last `n` days (oldest first) — for charts and the doctor report. */
export async function daySummaries(n: number): Promise<DaySummary[]> {
  const food = await read<Record<string, FoodEntry[]>>(KEYS.food, {});
  const water = await read<Record<string, number>>(KEYS.water, {});
  const out: DaySummary[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const day = dateKey(d);
    const entries = food[day] ?? [];
    const t = totals(entries);
    const m = microTotals(entries, (e) => entryNutrients(e).kcal);
    out.push({ day, ...t, water: water[day] ?? 0, micros: m.totals, coverage: m.coverage, logged: entries.length > 0 });
  }
  return out;
}

/** Days (YYYY-MM-DD) with at least one food entry — for the logging streak. */
export async function loggedFoodDays(): Promise<string[]> {
  const food = await read<Record<string, FoodEntry[]>>(KEYS.food, {});
  return Object.keys(food).filter((d) => food[d]?.length);
}
