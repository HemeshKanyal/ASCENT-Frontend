/**
 * Progressive overload: rep ranges, rest, effort targets and load suggestions.
 *
 * Anchors keep ONE rep range for a whole block so progress is measurable
 * (double progression). Rotators vary rep ranges session to session.
 */

import { pick } from "./random.js";

const LOWER_BODY_PATTERNS = ["squat", "hinge", "hip_thrust", "single_leg"];

// Epley; unreliable past ~12 reps, so higher-rep sets are capped there.
export const estimate1RM = (weight, reps) =>
  weight > 0 && reps > 0 ? weight * (1 + Math.min(reps, 12) / 30) : 0;

const ANCHOR_RANGES = {
  strength: [[3, 5], [4, 6], [5, 8]],
  hypertrophy: [[6, 10], [8, 12], [5, 8]],
  fat_loss: [[8, 12], [6, 10], [10, 15]],
  general: [[8, 12], [6, 10], [10, 15]],
};
const BEGINNER_ANCHOR_RANGES = [[8, 12], [6, 10]];

export function anchorRepRange({ goal, level, blockNumber = 1, exercise, conservative = false }) {
  if (exercise?.bodyweight) return [8, 20];
  // Conservative (health) mode avoids heavy low-rep grinders and the breath-holding they invite.
  const ranges = level === "beginner" || conservative ? BEGINNER_ANCHOR_RANGES : ANCHOR_RANGES[goal] ?? ANCHOR_RANGES.general;
  return ranges[(blockNumber - 1) % ranges.length];
}

export function rotatorRepRange({ goal, exercise, rng }) {
  if (exercise.bodyweight) return pick(rng, [[8, 15], [10, 20], [12, 25]]);
  if (exercise.mechanics === "compound") {
    return goal === "strength"
      ? pick(rng, [[5, 8], [6, 10], [8, 12]])
      : pick(rng, [[6, 10], [8, 12], [10, 15]]);
  }
  return pick(rng, [[8, 12], [10, 15], [12, 20]]);
}

export function restSeconds({ exercise, goal }) {
  let rest = exercise.fatigue >= 4 ? 180 : exercise.mechanics === "compound" ? 120 : 75;
  if (goal === "strength" && exercise.mechanics === "compound") rest += 30;
  return rest;
}

/** Reps in reserve: how many more reps you could have done. */
export function targetRIR({ role, level, exercise, conservative = false }) {
  if (level === "beginner" || conservative) return "2–3";
  if (role === "anchor" || exercise.fatigue >= 4) return "1–2";
  return exercise.mechanics === "isolation" ? "0–1" : "1–2";
}

function loadStep(exercise) {
  const step = exercise.equipment.includes("dumbbell") ? 2 : 2.5;
  const bigLower =
    LOWER_BODY_PATTERNS.includes(exercise.pattern) &&
    exercise.mechanics === "compound" &&
    !exercise.equipment.includes("dumbbell");
  return { step, increment: bigLower ? 5 : step };
}

const roundTo = (value, step) => Math.round(value / step) * step;

/** Most recent logged performance of an exercise (sessions in any order). */
export function lastPerformance(exerciseId, sessions = []) {
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  for (const session of sorted) {
    const entry = session.exercises?.find((e) => e.exerciseId === exerciseId);
    const sets = entry?.sets?.filter((s) => s.completed && Number(s.reps) > 0) ?? [];
    if (sets.length) {
      return {
        date: session.date,
        repRange: entry.repRange,
        sets: sets.map((s) => ({ reps: Number(s.reps), weight: Number(s.weight) || 0 })),
      };
    }
  }
  return null;
}

/**
 * Suggest today's working weight (or reps, for bodyweight moves).
 * Returns { weight, note } — weight is null when there's nothing to base it on.
 */
export function suggestLoad({ exercise, repRange, sessions }) {
  const last = lastPerformance(exercise.id, sessions);
  const [lo, hi] = repRange;

  if (!last) {
    return { weight: null, note: "First time — pick a weight you could do ~2 more reps with." };
  }

  const topWeight = Math.max(...last.sets.map((s) => s.weight));
  const bestReps = Math.max(...last.sets.map((s) => s.reps));

  if (topWeight === 0) {
    return bestReps >= hi
      ? { weight: null, note: `Last time ${bestReps} reps — slow the lowering to 3s or add load.` }
      : { weight: null, note: `Last time ${bestReps} reps — beat it by one.` };
  }

  const { step, increment } = loadStep(exercise);
  const topSets = last.sets.filter((s) => s.weight === topWeight);
  const sameRange = last.repRange && last.repRange[0] === lo && last.repRange[1] === hi;

  if (sameRange) {
    if (topSets.every((s) => s.reps >= hi)) {
      return {
        weight: topWeight + increment,
        note: `You hit ${hi} reps on every set at ${topWeight} — go up to ${topWeight + increment}.`,
      };
    }
    const repsText = topSets.map((s) => s.reps).join("/");
    return { weight: topWeight, note: `Same weight as last time (${repsText} reps) — add a rep somewhere.` };
  }

  // Rep range changed: convert via estimated max, aiming for the middle of the range with ~2 RIR.
  const e1rm = Math.max(...last.sets.map((s) => estimate1RM(s.weight, s.reps)));
  const targetReps = Math.round((lo + hi) / 2) + 2;
  const weight = Math.max(step, roundTo(e1rm / (1 + targetReps / 30), step));
  return { weight, note: `New rep range — estimated from your last ${topWeight}×${bestReps}.` };
}
