import assert from "node:assert/strict";
import { test } from "node:test";

import { ACTIVITIES } from "../activities.js";
import { ACTIVITY_MUSCLES, AREA_MUSCLES, BODY_BACK, BODY_FRONT, GROUP_MUSCLES, MUSCLE_DETAILS, exerciseMuscles } from "../anatomy.js";
import { MOTIONS, checkMotion, demoFrame, demoIdFor } from "../demo.js";
import { EXERCISES } from "../exercises.js";
import { AREAS } from "../mobility.js";
import { MUSCLES } from "../taxonomy.js";

const drawn = new Set([...BODY_FRONT, ...BODY_BACK].map((r) => r.muscle).filter(Boolean));

test("every individual muscle is drawn on the anatomy map", () => {
  for (const m of Object.keys(MUSCLE_DETAILS)) assert.ok(drawn.has(m), `${m} missing from BODY_FRONT/BODY_BACK`);
  for (const m of drawn) assert.ok(MUSCLE_DETAILS[m], `${m} drawn but has no name`);
});

test("every training group maps to named muscles", () => {
  for (const g of Object.keys(MUSCLES)) {
    assert.ok(GROUP_MUSCLES[g]?.length, `${g} has no muscles`);
    for (const m of GROUP_MUSCLES[g]) assert.ok(MUSCLE_DETAILS[m], `${g} → unknown ${m}`);
  }
});

test("every exercise lists real muscles, with at least one target", () => {
  for (const e of EXERCISES) {
    const { primary, secondary } = exerciseMuscles(e);
    assert.ok(primary.length, `${e.id} has no target muscle`);
    for (const m of [...primary, ...secondary]) assert.ok(MUSCLE_DETAILS[m], `${e.id} → unknown ${m}`);
    assert.ok(!primary.some((m) => secondary.includes(m)), `${e.id} lists a muscle as both target and helper`);
  }
});

test("emphasis picks the right heads", () => {
  const ex = (id) => exerciseMuscles(EXERCISES.find((e) => e.id === id));
  assert.deepEqual(ex("incline_dumbbell_press").primary, ["pec_clavicular"]);
  assert.ok(ex("seated_calf_raise").primary.includes("soleus"));
  assert.ok(ex("hammer_curl").primary.includes("brachialis"));
  assert.ok(ex("overhead_cable_extension").primary.includes("triceps_long"));
  assert.ok(ex("hip_abduction_machine").primary.includes("glute_med"));
});

test("every activity and mobility area maps to drawn muscles", () => {
  for (const a of ACTIVITIES) {
    const m = ACTIVITY_MUSCLES[a.id];
    assert.ok(m?.primary.length, `${a.id} has no muscles`);
    for (const x of [...m.primary, ...m.secondary]) assert.ok(drawn.has(x), `${a.id}: ${x}`);
  }
  for (const area of Object.keys(AREAS)) {
    assert.ok(AREA_MUSCLES[area]?.length, `${area} not mapped`);
    for (const x of AREA_MUSCLES[area]) assert.ok(drawn.has(x), `${area}: ${x}`);
  }
});

test("every exercise has its own demo", () => {
  for (const e of EXERCISES) assert.equal(demoIdFor(e), e.id, `${e.id} has no demo`);
});

// The core accuracy guard: no backward knees or elbows, joints within healthy
// ranges, nothing through the floor or a bench, hands and feet reaching their
// bar / handle / floor contact through the whole rep.
for (const e of EXERCISES) {
  test(`demo is anatomically valid: ${e.id}`, () => {
    assert.deepEqual(checkMotion(MOTIONS[e.id]), []);
  });
}

test("every demo renders finite shapes with its muscles visible somewhere in the rep", () => {
  for (const e of EXERCISES) {
    const { primary, secondary } = exerciseMuscles(e);
    const levels = Object.fromEntries([...secondary.map((m) => [m, 1]), ...primary.map((m) => [m, 2])]);
    let red = 0;
    for (const t of [0, 0.5, 1, 1.5, 2, 2.5, 3]) {
      const shapes = demoFrame(MOTIONS[e.id], t, levels);
      assert.ok(shapes.length > 20, `${e.id} drew too little`);
      assert.ok(!JSON.stringify(shapes).includes("NaN"), `${e.id} produced NaN at t=${t}`);
      red += shapes.filter((s) => s.color === "muscle").length;
    }
    assert.ok(red > 0, `${e.id}: target muscles never visible from its camera`);
  }
});
