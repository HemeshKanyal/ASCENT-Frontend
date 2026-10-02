/**
 * Turn a plain description ("rajma chawal with salad, 3-4 rotis and chaas")
 * into foods + estimated grams. Rule-based and offline: dish names and
 * aliases, counts and ranges, household measures and sizes.
 */
import { FOODS } from "./foods.js";

// Dishes people name as one thing but log as parts.
const COMBOS = {
  "rajma chawal": [["rajma_curry", "1 bowl"], ["white_rice", "1 plate"]],
  "dal chawal": [["dal_tadka", "1 bowl"], ["white_rice", "1 plate"]],
  "chole chawal": [["chole", "1 bowl"], ["white_rice", "1 plate"]],
  "curd rice": [["curd", "1 katori"], ["white_rice", "1 plate"]],
  "dal roti": [["dal_tadka", "1 bowl"], ["roti", 2]],
  "chole bhature": [["chole", "1 bowl"], ["paratha", 2]],
  "paneer roti": [["paneer_butter_masala", "1 bowl"], ["roti", 2]],
  "egg bhurji": [["egg", 2]],
  "omelette": [["egg", 2], ["olive_oil", "1 tsp"]],
  "idli sambar": [["idli", 3], ["sambar", "1 bowl"]],
  "masala dosa": [["dosa", 1], ["potato", "1 katori"]],
};

// Grams (or ml ≈ g) for household measures.
const UNITS = {
  bowl: 200, bowls: 200, katori: 150, katoris: 150, plate: 250, plates: 250,
  cup: 240, cups: 240, glass: 250, glasses: 250, mug: 300,
  tbsp: 15, tablespoon: 15, tablespoons: 15, spoon: 10, spoons: 10, tsp: 5, teaspoon: 5,
  handful: 30, handfuls: 30, scoop: 30, scoops: 30, slice: 30, slices: 30,
  piece: null, pieces: null, pc: null, pcs: null, g: 1, gm: 1, gms: 1, gram: 1, grams: 1, ml: 1,
};
const SIZE = { small: 0.7, little: 0.7, half: 0.5, medium: 1, large: 1.4, big: 1.4, full: 1, heaped: 1.3 };
const WORD_NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, couple: 2, few: 3, some: 1, half: 0.5 };
const FILLER = /\b(some|of|with|the|my|and|plus|little|bit)\b/g;

const plural = (w) => [w, `${w}s`, `${w}es`, w.replace(/y$/, "ies")];

// Name fragments too generic to identify a food on their own.
const GENERIC = new Set(["cooked", "raw", "plain", "whole", "dry", "canned", "fresh", "home-style", "home style", "non-fat", "skim", "toned", "sweet", "firm", "fast food", "boiled", "baked", "unsweetened", "70%"]);

/** name/alias → food, longest names first so "palak paneer" beats "paneer". */
function buildIndex(foods) {
  const entries = [];
  for (const f of foods) {
    const names = new Set([f.name.toLowerCase().split(",")[0].trim(), ...f.aliases.map((a) => a.toLowerCase())]);
    // Short forms: "Roti / chapati, whole wheat" → "roti", "chapati"
    for (const part of f.name.toLowerCase().split(/[,/()]/)) {
      const p = part.trim();
      if (p.length > 2 && !GENERIC.has(p)) names.add(p);
    }
    names.add(f.id.replace(/_/g, " "));
    for (const n of names) for (const v of plural(n)) entries.push([v, f]);
  }
  return entries.sort((a, b) => b[0].length - a[0].length);
}

function parseQuantity(text) {
  const range = text.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/);
  if (range) return { qty: (Number(range[1]) + Number(range[2])) / 2, rest: text.replace(range[0], " ") };
  const frac = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (frac) return { qty: Number(frac[1]) / Number(frac[2]), rest: text.replace(frac[0], " ") };
  const num = text.match(/(\d+(?:\.\d+)?)/);
  if (num) return { qty: Number(num[1]), rest: text.replace(num[0], " ") };
  const word = text.match(new RegExp(`\\b(${Object.keys(WORD_NUM).join("|")})\\b`));
  if (word) return { qty: WORD_NUM[word[1]], rest: text, word: word[1] };
  return { qty: null, rest: text };
}

function grams(food, qty, unit, size) {
  const k = SIZE[size] ?? 1;
  const perPiece = food.servings[0]?.[1] ?? 100;
  if (unit && UNITS[unit] != null) return Math.round((qty ?? 1) * UNITS[unit] * k);
  // A bare count ("3 rotis") or no quantity → the food's own serving.
  return Math.round((qty ?? 1) * perPiece * k);
}

const label = (food, qty, unit, size) => {
  const serving = food.servings[0]?.[0] ?? "100 g";
  const n = qty == null ? null : Number.isInteger(qty) ? qty : qty.toFixed(1);
  if (unit) return `${n ?? 1} ${size ? `${size} ` : ""}${unit}`;
  if (n == null || n === 1) return `${size ? `${size} ` : ""}${serving}`;
  return `${n} × ${serving.replace(/^1 /, "")}`;
};

/**
 * @returns {{ items: {food, grams, label, text, note?}[], unknown: string[] }}
 */
export function parseMeal(text, foods = FOODS) {
  const index = buildIndex(foods);
  const byId = Object.fromEntries(foods.map((f) => [f.id, f]));
  const items = [];
  const unknown = [];

  const chunks = text
    .toLowerCase()
    .replace(/[.;]/g, ",")
    .split(/,|\n|\bwith\b|\band\b|\+|&/)
    .map((c) => c.trim())
    .filter(Boolean);

  for (const raw of chunks) {
    // "lassi or chaas" → take the first, mention the other.
    const [chunk, ...alts] = raw.split(/\bor\b/).map((c) => c.trim());
    let rest = chunk;

    const combo = Object.keys(COMBOS).find((c) => rest.includes(c));
    if (combo) {
      for (const [id, amount] of COMBOS[combo]) {
        const f = byId[id];
        if (!f) continue;
        const g = typeof amount === "number" ? grams(f, amount) : grams(f, Number(amount.split(" ")[0]), amount.split(" ")[1]);
        items.push({ food: f, grams: g, label: typeof amount === "number" ? label(f, amount) : amount, text: combo });
      }
      rest = rest.replace(combo, " ");
      if (!rest.replace(FILLER, "").trim()) continue;
    }

    const { qty, rest: afterQty, word } = parseQuantity(rest);
    const unit = afterQty.split(/\s+/).find((w) => w in UNITS);
    const size = afterQty.split(/\s+/).find((w) => w in SIZE && w !== word);
    const hit = index.find(([name]) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(afterQty));
    if (!hit) {
      const leftover = afterQty.replace(FILLER, " ").replace(/\s+/g, " ").trim();
      if (leftover && !(leftover in UNITS)) unknown.push(leftover);
      continue;
    }
    const food = hit[1];
    const q = word === "some" ? null : qty;
    items.push({
      food,
      grams: grams(food, q, unit, size),
      label: label(food, q, unit, size),
      text: chunk,
      note: alts.length ? `You said "${chunk} or ${alts.join(" or ")}" — counted ${food.name.toLowerCase()}.` : undefined,
    });
  }
  return { items, unknown };
}
