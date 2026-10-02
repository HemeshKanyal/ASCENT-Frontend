import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FOODS,
  HYROX_STATIONS,
  MOVES,
  MOVE_BY_ID,
  bmr,
  dailyTargets,
  fitsDiet,
  foodWarnings,
  generateEnduranceSession,
  generateFlow,
  isHardSession,
  planWeek,
  stationFor,
  suggestFoods,
  totals,
  zoneHeartRate,
} from "../index.js";

const ALL_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const daysOf = (n) => ({ 1: ["wed"], 2: ["mon", "thu"], 3: ["mon", "wed", "fri"], 4: ["mon", "tue", "thu", "sat"], 5: ["mon", "tue", "wed", "fri", "sat"], 6: ALL_DAYS.slice(0, 6), 7: ALL_DAYS }[n]);
const kinds = (plan) => Object.values(plan).map((d) => d.kind);
const count = (plan, kind) => kinds(plan).filter((k) => k === kind).length;

describe("week planner", () => {
  it("fills every training day and nothing else", () => {
    for (let n = 1; n <= 7; n++) {
      for (const focus of ["strength", "endurance", "hybrid", "mobility"]) {
        const plan = planWeek({ trainingDays: daysOf(n), focus, disciplines: ["run"], mobilityStyle: "yoga", level: "intermediate" });
        assert.deepEqual(Object.keys(plan).sort(), [...daysOf(n)].sort(), `${focus} ${n} days`);
      }
    }
  });

  it("is all strength without endurance or mobility goals", () => {
    const plan = planWeek({ trainingDays: daysOf(4), focus: "strength" });
    assert.equal(count(plan, "strength"), 4);
  });

  it("keeps two strength days for endurance athletes", () => {
    const plan = planWeek({ trainingDays: daysOf(6), focus: "endurance", disciplines: ["run"], level: "intermediate" });
    assert.equal(count(plan, "strength"), 2);
    assert.equal(count(plan, "endurance"), 4);
  });

  it("puts the long session on the weekend and keeps hard days limited", () => {
    for (let week = 0; week < 4; week++) {
      const plan = planWeek({ trainingDays: daysOf(6), focus: "endurance", disciplines: ["run"], level: "intermediate", weekIndex: week });
      const long = Object.entries(plan).find(([, d]) => d.type === "long");
      assert.ok(long && long[0] === "sat", `week ${week}: long on ${long?.[0]}`);
      const hard = Object.values(plan).filter((d) => d.kind === "endurance" && isHardSession(d.type));
      assert.ok(hard.length <= 1, "intermediate gets one hard endurance day");
    }
  });

  it("never puts two hard endurance days back to back when it can avoid it", () => {
    const plan = planWeek({ trainingDays: ALL_DAYS, focus: "endurance", disciplines: ["run"], level: "advanced" });
    const seq = ALL_DAYS.map((d) => plan[d]);
    for (let i = 1; i < seq.length; i++) {
      const both = [seq[i - 1], seq[i]].every((d) => d.kind === "endurance" && isHardSession(d.type));
      assert.ok(!both, `hard days back to back at ${ALL_DAYS[i]}`);
    }
  });

  it("splits triathlon across all three sports and adds bricks", () => {
    const plans = [0, 1].map((w) => planWeek({ trainingDays: daysOf(6), focus: "endurance", disciplines: ["bike", "run", "swim"], level: "intermediate", weekIndex: w, triathlon: true }));
    for (const p of plans) {
      const disc = new Set(Object.values(p).filter((d) => d.kind === "endurance").map((d) => d.discipline));
      assert.deepEqual([...disc].sort(), ["bike", "run", "swim"]);
    }
    assert.ok(Object.values(plans[1]).some((d) => d.type === "brick"));
  });

  it("makes deload weeks easy", () => {
    const plan = planWeek({ trainingDays: daysOf(5), focus: "endurance", disciplines: ["run"], level: "advanced", deload: true });
    for (const d of Object.values(plan)) if (d.kind === "endurance") assert.ok(!isHardSession(d.type), d.type);
  });

  it("gives HYROX athletes station work and running", () => {
    const plan = planWeek({ trainingDays: daysOf(5), focus: "hybrid", disciplines: ["hyrox", "run"], level: "intermediate" });
    const disc = Object.values(plan).filter((d) => d.kind === "endurance").map((d) => d.discipline);
    assert.ok(disc.includes("hyrox") && disc.includes("run"));
  });
});

describe("endurance sessions", () => {
  const combos = [
    ["run", ["easy", "long", "intervals", "tempo", "recovery"]],
    ["bike", ["easy", "long", "intervals", "tempo", "brick"]],
    ["swim", ["technique", "easy", "long", "intervals"]],
    ["hyrox", ["compromised", "stations", "engine"]],
    ["conditioning", ["metcon", "sprints", "rounds"]],
  ];

  for (const [discipline, types] of combos) {
    for (const type of types) {
      for (const level of ["beginner", "intermediate", "advanced"]) {
        it(`${discipline}/${type}/${level} is well-formed`, () => {
          const s = generateEnduranceSession({ discipline, type, level, minutes: 50, equipment: ["dumbbell", "kettlebell", "rower"] });
          assert.ok(s.steps.length >= 2);
          assert.ok(s.totalSeconds > 10 * 60, `too short: ${s.totalSeconds}s`);
          if (["easy", "long", "technique", "recovery"].includes(type)) {
            assert.ok(s.totalSeconds < 50 * 60 * 1.4, `easy session runs long: ${Math.round(s.totalSeconds / 60)} min`);
          }
          for (const st of s.steps) assert.ok(st.label && (st.seconds > 0 || st.meters > 0));
        });
      }
    }
  }

  it("keeps easy runs easy", () => {
    const s = generateEnduranceSession({ discipline: "run", type: "easy", level: "intermediate", minutes: 40 });
    assert.ok(s.steps.every((st) => (st.zone ?? 1) <= 3));
  });

  it("starts beginner runners with run/walk that progresses through the block", () => {
    const w1 = generateEnduranceSession({ discipline: "run", type: "easy", level: "beginner", minutes: 30, blockWeek: 1 });
    const w4 = generateEnduranceSession({ discipline: "run", type: "easy", level: "beginner", minutes: 30, blockWeek: 4 });
    assert.match(w1.format, /run_walk_1/);
    assert.match(w4.format, /run_walk_4/);
  });

  it("rotates interval formats instead of repeating the last one", () => {
    const history = [];
    let repeats = 0;
    for (let i = 0; i < 12; i++) {
      const s = generateEnduranceSession({ discipline: "run", type: "intervals", level: "intermediate", history, seed: `w${i}` });
      if (history.length && history[history.length - 1].format === s.format) repeats++;
      history.push({ kind: "endurance", discipline: "run", format: s.format, date: new Date(2026, 0, 1 + i).toISOString() });
    }
    assert.equal(repeats, 0);
  });

  it("substitutes HYROX stations when equipment is missing", () => {
    const sled = HYROX_STATIONS.find((s) => s.id === "sled_push");
    assert.equal(stationFor(sled, ["sled"], "advanced").name, "Sled push");
    const alt = stationFor(sled, [], "advanced");
    assert.notEqual(alt.name, "Sled push");
    assert.equal(alt.substituted, "Sled push");
    assert.equal(stationFor(HYROX_STATIONS.find((s) => s.id === "wall_balls"), ["wall_ball"], "beginner").amount, 50);
  });

  it("computes heart-rate zones from age", () => {
    assert.deepEqual(zoneHeartRate(2, 30), [112, 131]); // max 187
    assert.equal(zoneHeartRate(2, null), null);
  });
});

describe("mobility flows", () => {
  it("roughly matches the requested length", () => {
    for (const style of ["warmup", "cooldown", "mobility", "recovery", "yoga", "pilates"]) {
      for (const minutes of style === "warmup" ? [5, 10] : [5, 10, 20, 30]) {
        const f = generateFlow({ style, minutes, constraints: { level: "intermediate" } });
        assert.ok(f.totalSeconds >= minutes * 60 * 0.75, `${style} ${minutes}: ${f.totalSeconds}s`);
        assert.ok(f.totalSeconds <= minutes * 60 + 150, `${style} ${minutes}: ${f.totalSeconds}s`);
      }
    }
  });

  it("targets the requested areas", () => {
    const f = generateFlow({ style: "cooldown", minutes: 10, areas: ["hamstrings", "hips"] });
    const hits = f.moves.filter((id) => MOVE_BY_ID[id].areas.some((a) => ["hamstrings", "hips"].includes(a)));
    assert.ok(hits.length >= f.moves.length / 2);
  });

  it("respects bone-density and pregnancy constraints", () => {
    for (const style of ["yoga", "pilates", "mobility", "cooldown"]) {
      const f = generateFlow({ style, minutes: 20, constraints: { noSpinalFlexion: true, noSupine: true } });
      for (const id of f.moves) {
        const m = MOVE_BY_ID[id];
        assert.ok(!m.flexion && !m.supine && !m.prone, `${style}: ${id}`);
      }
    }
  });

  it("opens and closes yoga in stillness", () => {
    const f = generateFlow({ style: "yoga", minutes: 20 });
    assert.equal(f.moves[0], "mountain");
    assert.equal(f.moves[f.moves.length - 1], "savasana");
  });

  it("uses only known moves", () => {
    const ids = new Set(MOVES.map((m) => m.id));
    assert.equal(ids.size, MOVES.length);
  });
});

describe("nutrition", () => {
  const body = { sex: "male", weightKg: 80, heightCm: 180, age: 30 };

  it("computes BMR with Mifflin–St Jeor", () => {
    assert.equal(bmr(body), 1780);
    assert.equal(bmr({ ...body, sex: "female" }), 1614);
    assert.equal(bmr({ sex: "male" }), null);
  });

  it("feeds training days more than rest days", () => {
    const rest = dailyTargets({ body, goal: "hypertrophy" });
    const longRun = dailyTargets({ body, goal: "hypertrophy", session: { kind: "endurance", discipline: "run", type: "long" }, sessionMinutes: 90 });
    assert.ok(longRun.kcal > rest.kcal + 500);
    assert.ok(longRun.carbs > rest.carbs);
  });

  it("caps protein at the doctor's limit", () => {
    const t = dailyTargets({ body, goal: "hypertrophy", health: { conditions: ["uric_acid"], proteinLimitG: 60 } });
    assert.equal(t.protein, 60);
    assert.ok(t.notes.some((n) => n.includes("doctor")));
  });

  it("keeps kidney protein moderate and avoids crash diets with gout", () => {
    assert.equal(dailyTargets({ body, goal: "hypertrophy", health: { conditions: ["kidney"] } }).protein, 64);
    const normal = dailyTargets({ body, goal: "fat_loss" });
    const gout = dailyTargets({ body, goal: "fat_loss", health: { conditions: ["uric_acid"] } });
    assert.ok(gout.kcal > normal.kcal);
    assert.ok(gout.waterMl >= 2500);
  });

  it("never goes below BMR or into a deficit while pregnant", () => {
    const t = dailyTargets({ body: { ...body, sex: "female", weightKg: 50, heightCm: 150 }, goal: "fat_loss" });
    assert.ok(t.kcal >= t.bmr);
    const p = dailyTargets({ body: { ...body, sex: "female" }, goal: "fat_loss", health: { conditions: ["pregnancy"] } });
    const m = dailyTargets({ body: { ...body, sex: "female" }, goal: "general" });
    assert.equal(p.kcal, m.kcal);
  });

  it("macros add up to the calorie target", () => {
    const t = dailyTargets({ body, goal: "fat_loss" });
    const kcal = t.protein * 4 + t.carbs * 4 + t.fat * 9;
    assert.ok(Math.abs(kcal - t.kcal) < 20);
  });

  it("filters foods by diet and allergies", () => {
    const veg = FOODS.filter((x) => fitsDiet(x, "vegetarian", []));
    assert.ok(veg.every((x) => ["plant", "dairy"].includes(x.diet)));
    assert.ok(!FOODS.filter((x) => fitsDiet(x, "none", ["peanuts"])).some((x) => x.allergens.includes("peanuts")));
  });

  it("suggests low-purine, diet-appropriate protein", () => {
    const s = suggestFoods({ remaining: { protein: 40, kcal: 500 }, dietType: "none", conditions: ["uric_acid"] });
    assert.equal(s.length, 3);
    for (const x of s) assert.notEqual(x.food.purine, "high");
    const vegan = suggestFoods({ remaining: { protein: 40, kcal: 500 }, dietType: "vegan" });
    assert.ok(vegan.every((x) => x.food.diet === "plant"));
  });

  it("warns about purines, sugary drinks and alcohol with gout", () => {
    const beer = FOODS.find((x) => x.id === "beer");
    assert.ok(foodWarnings(beer, ["uric_acid"]).length >= 2);
    assert.equal(foodWarnings(beer, []).length, 0);
  });

  it("totals logged entries", () => {
    const egg = FOODS.find((x) => x.id === "egg");
    const t = totals([{ grams: 100, per100: egg.per100 }, { grams: 50, per100: egg.per100 }]);
    assert.equal(t.kcal, 215);
    assert.equal(t.protein, 18.9);
  });

  it("has sane food data", () => {
    for (const x of FOODS) {
      const { kcal, protein, carbs, fat } = x.per100;
      const est = protein * 4 + carbs * 4 + fat * 9;
      assert.ok(Math.abs(est - kcal) <= Math.max(40, kcal * 0.2), `${x.id}: ${kcal} kcal vs ${Math.round(est)} from macros`);
    }
  });
});
