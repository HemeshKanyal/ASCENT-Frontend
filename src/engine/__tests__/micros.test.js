import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FOODS, FOOD_MICROS, NUTRIENTS, SUPPLEMENTS, entryMicros, entryNutrients, microReferences, microStatus, microTotals, supplementWarnings } from "../index.js";

describe("micronutrients", () => {
  it("has USDA data for most built-in foods with sane values", () => {
    const covered = FOODS.filter((f) => FOOD_MICROS[f.id]);
    assert.ok(covered.length >= 85, `only ${covered.length}`);
    for (const f of covered) {
      const m = FOOD_MICROS[f.id];
      if (m.sugar != null) assert.ok(m.sugar <= f.per100.carbs + 3, `${f.id}: sugar ${m.sugar} > carbs ${f.per100.carbs}`);
      if (m.satFat != null) assert.ok(m.satFat <= f.per100.fat + 1, `${f.id}: sat fat ${m.satFat} > fat ${f.per100.fat}`);
      for (const [k, v] of Object.entries(m)) assert.ok(v >= 0 && Number.isFinite(v), `${f.id}.${k}`);
    }
    // Spot checks against well-known values.
    assert.ok(FOOD_MICROS.egg.cholesterol > 350);
    assert.ok(FOOD_MICROS.salmon.vitD > 5 && FOOD_MICROS.salmon.omega3 > 1);
    assert.ok(FOOD_MICROS.spinach.vitK > 300);
    assert.ok(FOOD_MICROS.milk_whole.calcium > 100);
  });

  it("scales entries by grams or servings", () => {
    const egg = entryMicros({ foodId: "egg", grams: 50 });
    assert.ok(Math.abs(egg.cholesterol - FOOD_MICROS.egg.cholesterol / 2) < 0.01);
    const d = entryMicros({ micros: { vitD: 25 }, servings: 2 });
    assert.equal(d.vitD, 50);
    assert.deepEqual(entryNutrients({ per100: { kcal: 120, protein: 24, carbs: 3, fat: 1.5 }, servings: 2, grams: 0 }).protein, 48);
  });

  it("reports how much of the day had vitamin data", () => {
    const entries = [
      { foodId: "egg", grams: 100, kcal: 143 },
      { foodId: "mystery", grams: 100, kcal: 143 },
    ];
    const { totals, coverage } = microTotals(entries, (e) => e.kcal);
    assert.equal(coverage, 0.5);
    assert.ok(totals.cholesterol > 0);
  });

  it("adjusts references for sex, age, pregnancy and conditions", () => {
    const m = microReferences({ sex: "male", age: 30 });
    const f = microReferences({ sex: "female", age: 30 });
    const p = microReferences({ sex: "female", age: 30, conditions: ["pregnancy"] });
    assert.equal(m.iron.amount, 8);
    assert.equal(f.iron.amount, 18);
    assert.equal(p.iron.amount, 27);
    assert.equal(p.folate.amount, 600);
    assert.equal(p.caffeine.amount, 200);
    assert.equal(microReferences({ sex: "male", conditions: ["hypertension"] }).sodium.amount, 1500);
    assert.equal(microReferences({ sex: "male", conditions: ["kidney"] }).potassium.kind, "watch");
    for (const n of NUTRIENTS) assert.ok(m[n.key], `no reference for ${n.key}`);
  });

  it("classifies goals and limits", () => {
    assert.equal(microStatus(2500, { amount: 2300, kind: "limit" }), "over");
    assert.equal(microStatus(5, { amount: 15, kind: "goal" }), "low");
    assert.equal(microStatus(16, { amount: 15, kind: "goal" }), "met");
  });
});

describe("supplements", () => {
  it("warn about the right conditions", () => {
    const creatine = SUPPLEMENTS.find((x) => x.id === "creatine");
    assert.equal(supplementWarnings(creatine, []).length, 0);
    assert.equal(supplementWarnings(creatine, ["kidney"]).length, 1);
    const caffeine = SUPPLEMENTS.find((x) => x.id === "caffeine");
    assert.equal(supplementWarnings(caffeine, ["pregnancy", "hypertension"]).length, 2);
  });
  it("have unique ids", () => {
    assert.equal(new Set(SUPPLEMENTS.map((x) => x.id)).size, SUPPLEMENTS.length);
  });
});
