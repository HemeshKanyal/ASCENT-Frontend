import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseMeal } from "../index.js";

const ids = (r) => r.items.map((i) => i.food.id);

describe("meal parser", () => {
  it("handles a typical Indian thali description", () => {
    const r = parseMeal("rajma chawal with some mixed salad and 3-4 rotis with lassi or chaas");
    assert.deepEqual(ids(r), ["rajma_curry", "white_rice", "salad", "roti", "lassi"]);
    const roti = r.items.find((i) => i.food.id === "roti");
    assert.equal(roti.grams, 140); // 3.5 × 40 g
    assert.ok(r.items.find((i) => i.food.id === "lassi").note.includes("chaas"));
    assert.deepEqual(r.unknown, []);
  });

  it("understands household measures and sizes", () => {
    const r = parseMeal("2 bowls dal, a small plate of rice, 1 glass milk, 2 tbsp peanut butter");
    const g = Object.fromEntries(r.items.map((i) => [i.food.id, i.grams]));
    assert.equal(g.dal_tadka, 400);
    assert.equal(g.white_rice, 175);
    assert.equal(g.milk_whole, 250);
    assert.equal(g.peanut_butter, 30);
  });

  it("counts pieces using the food's own serving", () => {
    const r = parseMeal("3 eggs, 2 bananas, 4 idlis");
    const g = Object.fromEntries(r.items.map((i) => [i.food.id, i.grams]));
    assert.equal(g.egg, 150);
    assert.equal(g.banana, 236);
    assert.equal(g.idli, 160);
  });

  it("prefers the longest name and reports what it couldn't match", () => {
    const r = parseMeal("palak paneer and unicorn pie");
    assert.deepEqual(ids(r), ["palak_paneer"]);
    assert.deepEqual(r.unknown, ["unicorn pie"]);
  });
});
