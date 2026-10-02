import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EQUIPMENT,
  EQUIPMENT_PRESETS,
  EXERCISES,
  JOINTS,
  LEVELS,
  MUSCLES,
  PATTERN_LABELS,
  SPLITS,
  createBlock,
  findAlternatives,
  generateWorkout,
  getExercise,
  sessionHighlights,
  suggestLoad,
  swapInWorkout,
  weeklyMuscleSets,
  addToWorkout,
  removeFromWorkout,
  weeklyTargets,
  volumeCheck,
  workoutMuscleSets,
} from "../index.js";

const DAY = 24 * 60 * 60 * 1000;
const START = new Date("2026-10-05T08:00:00Z");

const profile = (over = {}) => ({
  level: "intermediate",
  goal: "hypertrophy",
  equipment: EQUIPMENT_PRESETS.commercial_gym.equipment,
  injuries: [],
  disliked: [],
  favorites: [],
  ...over,
});

/** Turn a generated workout into a logged session (all sets done at top of range). */
const logWorkout = (workout, date) => ({
  id: workout.id,
  date: date.toISOString(),
  dayName: workout.dayName,
  exercises: workout.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    name: e.name,
    repRange: e.repRange,
    sets: Array.from({ length: e.sets }, () => ({ reps: e.repRange[1], weight: e.suggestedWeight ?? 20, completed: true })),
  })),
});

/** Train a split for n sessions, returning workouts in order. */
function simulate({ split, prof, sessions }) {
  const block = createBlock({ split, profile: prof, now: START, seed: "test-block" });
  const history = [];
  const workouts = [];
  for (let i = 0; i < sessions; i++) {
    const now = new Date(START.getTime() + i * 2 * DAY);
    const day = split.days[i % split.days.length];
    const w = generateWorkout({ split, day, profile: prof, block, history, now, seed: `s${i}` });
    workouts.push(w);
    history.push(logWorkout(w, now));
  }
  return { block, workouts, history };
}

describe("exercise library", () => {
  it("has unique ids and only known muscles, equipment, joints and patterns", () => {
    const ids = new Set();
    for (const e of EXERCISES) {
      assert.ok(!ids.has(e.id), `duplicate id ${e.id}`);
      ids.add(e.id);
      for (const m of [...e.primary, ...e.secondary]) assert.ok(MUSCLES[m], `${e.id}: unknown muscle ${m}`);
      for (const q of e.equipment) assert.ok(EQUIPMENT[q], `${e.id}: unknown equipment ${q}`);
      for (const j of e.joints) assert.ok(JOINTS[j], `${e.id}: unknown joint ${j}`);
      assert.ok(PATTERN_LABELS[e.pattern], `${e.id}: unlabelled pattern ${e.pattern}`);
      assert.ok(LEVELS.includes(e.level), `${e.id}: bad level`);
      assert.ok(["lengthened", "mid", "shortened"].includes(e.bias), `${e.id}: bad bias`);
      assert.ok(e.primary.length > 0, `${e.id}: no primary muscle`);
    }
  });

  it("can train every muscle with bodyweight-level equipment", () => {
    const ctxEquip = EQUIPMENT_PRESETS.bodyweight.equipment;
    for (const m of Object.keys(MUSCLES)) {
      const ok = EXERCISES.some((e) => e.primary.includes(m) && e.equipment.every((q) => ctxEquip.includes(q)));
      // Lower back and adductors legitimately need some kit or skill; everything else must be trainable.
      if (!["lower_back", "adductors"].includes(m)) assert.ok(ok, `no bodyweight option for ${m}`);
    }
  });
});

describe("generator", () => {
  for (const split of Object.values(SPLITS)) {
    for (const level of LEVELS) {
      for (const [presetId, preset] of Object.entries(EQUIPMENT_PRESETS)) {
        it(`${split.id} / ${level} / ${presetId}: valid, covered, within limits`, () => {
          const prof = profile({ level, equipment: preset.equipment });
          const { workouts } = simulate({ split, prof, sessions: split.days.length * 2 });
          for (const w of workouts) {
            const ids = w.exercises.map((e) => e.exerciseId);
            assert.equal(new Set(ids).size, ids.length, "duplicate exercise in a session");
            assert.ok(w.exercises.length > 0, "empty workout");
            for (const e of w.exercises) {
              const ex = getExercise(e.exerciseId);
              assert.ok(ex.equipment.every((q) => preset.equipment.includes(q)), `${ex.id} needs missing equipment`);
              assert.ok(LEVELS.indexOf(ex.level) <= LEVELS.indexOf(level), `${ex.id} too advanced`);
              assert.ok(e.sets >= 1 && e.repRange[0] < e.repRange[1]);
            }
            if (presetId === "commercial_gym") {
              assert.deepEqual(w.uncovered, [], `${w.dayName} left muscles uncovered: ${w.uncovered}`);
            }
          }
        });
      }
    }
  }

  it("keeps anchors fixed but rotates the rest between same-day sessions", () => {
    const split = SPLITS.upper_lower_4;
    const { workouts } = simulate({ split, prof: profile(), sessions: 12 });

    for (const dayName of split.days.map((d) => d.name)) {
      const sameDay = workouts.filter((w) => w.dayName === dayName);
      const anchorSets = sameDay.map((w) => w.exercises.filter((e) => e.role === "anchor").map((e) => e.exerciseId).sort().join());
      assert.equal(new Set(anchorSets).size, 1, `${dayName}: anchors changed within a block`);
      assert.ok(anchorSets[0].length > 0, `${dayName}: no anchors`);

      for (let i = 1; i < sameDay.length; i++) {
        const prev = new Set(sameDay[i - 1].exercises.filter((e) => e.role === "rotator").map((e) => e.exerciseId));
        const cur = sameDay[i].exercises.filter((e) => e.role === "rotator").map((e) => e.exerciseId);
        const repeats = cur.filter((id) => prev.has(id)).length;
        assert.ok(repeats <= 1, `${dayName}: ${repeats} rotators repeated from the last ${dayName}`);
      }
    }
  });

  it("picks different anchors in the next block", () => {
    const split = SPLITS.ppl_6;
    const prof = profile();
    const b1 = createBlock({ split, profile: prof, now: START, seed: "b1" });
    const b2 = createBlock({ split, profile: prof, previousBlock: b1, now: START, seed: "b2" });
    const changed = Object.keys(b1.anchors).filter((k) => b2.anchors[k] && b2.anchors[k] !== b1.anchors[k]);
    assert.ok(changed.length >= Object.keys(b1.anchors).length - 1, "most anchors should change between blocks");
  });

  it("is deterministic for the same seed", () => {
    const split = SPLITS.ppl_3;
    const prof = profile();
    const block = createBlock({ split, profile: prof, now: START, seed: "x" });
    const a = generateWorkout({ split, day: split.days[0], profile: prof, block, now: START, seed: "same" });
    const b = generateWorkout({ split, day: split.days[0], profile: prof, block, now: START, seed: "same" });
    assert.deepEqual(a.exercises, b.exercises);
  });

  it("routes around injured joints", () => {
    const prof = profile({ injuries: ["shoulder", "lower_back"] });
    const { workouts } = simulate({ split: SPLITS.upper_lower_4, prof, sessions: 8 });
    for (const w of workouts) {
      for (const e of w.exercises) {
        const joints = getExercise(e.exerciseId).joints;
        assert.ok(!joints.includes("shoulder") && !joints.includes("lower_back"), `${e.exerciseId} stresses an injured joint`);
      }
    }
  });

  it("substitutes an anchor for the day when its equipment is busy", () => {
    const split = SPLITS.upper_lower_4;
    const prof = profile();
    const block = createBlock({ split, profile: prof, now: START, seed: "busy" });
    const lowerA = split.days[1];
    const normal = generateWorkout({ split, day: lowerA, profile: prof, block, now: START, seed: "d" });
    const anchor = getExercise(normal.exercises.find((e) => e.role === "anchor").exerciseId);
    const busy = anchor.equipment.filter((q) => q !== "bench");

    const w = generateWorkout({ split, day: lowerA, profile: prof, block, now: START, seed: "d", unavailable: busy });
    const replaced = w.exercises.find((e) => e.substitutedFor === anchor.id);
    assert.ok(replaced, "anchor should be substituted");
    assert.ok(!getExercise(replaced.exerciseId).equipment.some((q) => busy.includes(q)));
  });

  it("deloads in the last week of an intermediate block", () => {
    const split = SPLITS.ppl_3;
    const prof = profile();
    const block = createBlock({ split, profile: prof, now: START, seed: "dl" });
    const lastWeek = new Date(START.getTime() + (block.weeks - 1) * 7 * DAY + DAY);
    const w = generateWorkout({ split, day: split.days[0], profile: prof, block, now: lastWeek });
    assert.equal(w.deload, true);
    assert.ok(w.exercises.every((e) => e.rir === "3–4"));
  });
});

describe("substitution", () => {
  const ctx = { equipment: EQUIPMENT_PRESETS.commercial_gym.equipment, level: "intermediate" };

  it("suggests squat-pattern moves when the leg press is busy", () => {
    const alts = findAlternatives("leg_press", ctx, { reason: "equipment" });
    assert.ok(alts.length >= 3);
    assert.ok(alts.every((a) => !a.exercise.equipment.includes("leg_press")));
    assert.equal(alts[0].exercise.pattern, "squat");
    assert.ok(alts[0].reasons.length > 0);
  });

  it("avoids the painful joint", () => {
    const alts = findAlternatives("barbell_bench_press", ctx, { reason: "pain" });
    assert.ok(alts.length > 0);
    assert.ok(alts.every((a) => !a.exercise.joints.includes("shoulder")));
  });

  it("offers easier options when too hard", () => {
    const original = getExercise("back_squat");
    const alts = findAlternatives("back_squat", ctx, { reason: "too_hard" });
    assert.ok(alts.length > 0);
    assert.ok(alts.every((a) => a.exercise.skill <= original.skill && a.exercise.fatigue <= original.fatigue));
  });

  it("only offers what you own", () => {
    const home = { equipment: EQUIPMENT_PRESETS.dumbbells_only.equipment, level: "advanced" };
    const alts = findAlternatives("lat_pulldown", home, { reason: "equipment", limit: 10 });
    assert.ok(alts.length > 0, "dumbbell users still need a lat option");
    assert.ok(alts.every((a) => a.exercise.equipment.every((q) => home.equipment.includes(q))));
  });

  it("swapInWorkout keeps role and set count", () => {
    const split = SPLITS.ppl_3;
    const prof = profile();
    const block = createBlock({ split, profile: prof, now: START, seed: "sw" });
    const w = generateWorkout({ split, day: split.days[0], profile: prof, block, now: START });
    const target = w.exercises[0];
    const alt = findAlternatives(target.exerciseId, ctx, { excludeIds: w.exercises.map((e) => e.exerciseId) })[0];
    const swapped = swapInWorkout({ workout: w, index: 0, newExerciseId: alt.exercise.id, profile: prof, block });
    assert.equal(swapped.exercises[0].exerciseId, alt.exercise.id);
    assert.equal(swapped.exercises[0].role, target.role);
    assert.equal(swapped.exercises[0].sets, target.sets);
    assert.equal(swapped.exercises[0].substitutedFor, target.exerciseId);
  });
});

describe("progression", () => {
  const bench = getExercise("barbell_bench_press");
  const session = (reps, weight, repRange = [6, 10]) => ({
    date: "2026-10-01",
    exercises: [{ exerciseId: bench.id, repRange, sets: reps.map((r) => ({ reps: r, weight, completed: true })) }],
  });

  it("adds weight once every set hits the top of the range", () => {
    const s = suggestLoad({ exercise: bench, repRange: [6, 10], sessions: [session([10, 10, 10], 60)] });
    assert.equal(s.weight, 62.5);
  });

  it("holds weight until the top of the range is reached", () => {
    const s = suggestLoad({ exercise: bench, repRange: [6, 10], sessions: [session([10, 9, 8], 60)] });
    assert.equal(s.weight, 60);
  });

  it("re-estimates when the rep range changes", () => {
    const s = suggestLoad({ exercise: bench, repRange: [3, 5], sessions: [session([10, 10, 10], 60, [8, 12])] });
    assert.ok(s.weight > 60 && s.weight < 80, `got ${s.weight}`);
  });

  it("uses bigger jumps for heavy lower-body barbell lifts", () => {
    const squat = getExercise("back_squat");
    const sessions = [{ date: "2026-10-01", exercises: [{ exerciseId: squat.id, repRange: [6, 10], sets: [{ reps: 10, weight: 100, completed: true }] }] }];
    assert.equal(suggestLoad({ exercise: squat, repRange: [6, 10], sessions }).weight, 105);
  });
});

describe("progress", () => {
  it("counts weekly sets per muscle with half credit for secondary", () => {
    const sessions = [
      { date: "2026-10-05T12:00:00", exercises: [{ exerciseId: "barbell_bench_press", sets: [1, 2, 3].map(() => ({ reps: 8, weight: 60, completed: true })) }] },
    ];
    const weeks = weeklyMuscleSets(sessions);
    const wk = weeks["2026-10-05"];
    assert.equal(wk.chest, 3);
    assert.equal(wk.triceps, 1.5);
  });

  it("flags a new best when an exercise comes back around", () => {
    const prev = [{ date: "2026-10-01", exercises: [{ exerciseId: "dumbbell_curl", sets: [{ reps: 10, weight: 12, completed: true }] }] }];
    const now = { date: "2026-10-15", exercises: [{ exerciseId: "dumbbell_curl", name: "Dumbbell Curl", sets: [{ reps: 10, weight: 14, completed: true }] }] };
    const h = sessionHighlights(now, prev);
    assert.equal(h[0].kind, "pr");
  });
});

describe("regressions", () => {
  it("keeps beginner stepping-stones out of intermediate plans when better options exist", () => {
    const prof = profile();
    for (let i = 0; i < 20; i++) {
      const split = SPLITS.upper_lower_4;
      const block = createBlock({ split, profile: prof, now: START, seed: `r${i}` });
      for (const day of split.days) {
        const w = generateWorkout({ split, day, profile: prof, block, now: START, seed: `r${i}` });
        for (const e of w.exercises) assert.ok(!getExercise(e.exerciseId).regression, `${e.exerciseId} planned for intermediate`);
      }
    }
  });
});

describe("profile modifiers", () => {
  const run = (over) => {
    const prof = profile(over);
    const { workouts } = simulate({ split: SPLITS.upper_lower_4, prof, sessions: 8 });
    return workouts;
  };

  it("fits short sessions", () => {
    for (const w of run({ sessionMinutes: 30 })) {
      assert.ok(w.exercises.length <= 4, `${w.exercises.length} exercises in 30 min`);
      assert.ok(w.exercises.reduce((n, e) => n + e.sets, 0) <= 14);
    }
  });

  it("conservative mode drops max-effort lifts and keeps reps in reserve", () => {
    for (const w of run({ conservative: true })) {
      for (const e of w.exercises) {
        assert.ok(getExercise(e.exerciseId).fatigue <= 4, `${e.exerciseId} too taxing`);
        if (!w.deload) assert.equal(e.rir, "2–3");
        if (e.role === "anchor") assert.ok(e.repRange[0] >= 6);
      }
    }
  });

  it("avoids loaded spinal flexion when asked", () => {
    for (const w of run({ noSpinalFlexion: true })) {
      for (const e of w.exercises) assert.ok(!getExercise(e.exerciseId).spinalFlexion, e.exerciseId);
    }
  });

  it("trims volume for concurrent endurance training", () => {
    const split = SPLITS.upper_lower_4;
    const base = createBlock({ split, profile: profile(), now: START, seed: "c" });
    const normal = generateWorkout({ split, day: split.days[1], profile: profile(), block: base, now: START, seed: "c" });
    const hybrid = generateWorkout({ split, day: split.days[1], profile: profile({ concurrent: true }), block: base, now: START, seed: "c" });
    const total = (w) => Object.values(w.targets).reduce((a, b) => a + b, 0);
    assert.ok(total(hybrid) < total(normal));
  });

  it("leans bodyweight for calisthenics", () => {
    const count = (over) =>
      run(over).flatMap((w) => w.exercises).filter((e) => getExercise(e.exerciseId).bodyweight).length;
    assert.ok(count({ preferBodyweight: true }) > count({}));
  });
});

describe("editing workouts & weekly balance", () => {
  const prof = profile();

  it("adds and removes exercises the user picks", () => {
    const split = SPLITS.ppl_3;
    const block = createBlock({ split, profile: prof, now: START, seed: "edit" });
    const w = generateWorkout({ split, day: split.days[0], profile: prof, block, now: START });
    const added = addToWorkout({ workout: w, exerciseId: "dumbbell_curl", profile: prof, block });
    assert.equal(added.exercises.length, w.exercises.length + 1);
    const last = added.exercises[added.exercises.length - 1];
    assert.equal(last.role, "custom");
    assert.equal(last.sets, 3);
    assert.equal(removeFromWorkout(added, 0).exercises.length, w.exercises.length);
  });

  it("flags muscles that are over or under for the week", () => {
    const targets = weeklyTargets(prof);
    const res = volumeCheck({
      targets,
      done: { biceps: 14, hamstrings: 0, chest: 6 },
      today: { chest: 4 },
      remainingSessions: 0,
      muscles: ["biceps", "hamstrings", "chest"],
    });
    const by = Object.fromEntries(res.map((r) => [r.muscle, r.status]));
    assert.equal(by.biceps, "over");
    assert.equal(by.hamstrings, "under");
    assert.equal(by.chest, "on_track");
  });

  it("doesn't call a muscle under early in the week when sessions remain", () => {
    const targets = weeklyTargets(prof);
    const [r] = volumeCheck({ targets, done: {}, today: {}, remainingSessions: 3, sessionsPerWeek: 3, muscles: ["quads"] });
    assert.equal(r.status, "on_track");
  });

  it("counts sets per muscle with half credit for secondary movers", () => {
    const sets = workoutMuscleSets([{ exerciseId: "barbell_bench_press", sets: 4 }]);
    assert.equal(sets.chest, 4);
    assert.equal(sets.triceps, 2);
  });
});

describe("balance uses direct work for 'over'", () => {
  it("doesn't flag front delts from pressing alone", () => {
    const targets = { front_delts: 4 };
    const [r] = volumeCheck({ targets, done: { front_delts: 10 }, doneDirect: { front_delts: 0 }, muscles: ["front_delts"] });
    assert.notEqual(r.status, "over");
    const [r2] = volumeCheck({ targets, done: { front_delts: 10 }, doneDirect: { front_delts: 8 }, muscles: ["front_delts"] });
    assert.equal(r2.status, "over");
  });
});
