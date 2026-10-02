/**
 * Alternatives for when an exercise can't be done today:
 * machine busy, equipment missing, it hurts, too hard, or simply disliked.
 */

import { EQUIPMENT, MUSCLES, levelRank } from "./taxonomy.js";
import { EXERCISES, getExercise } from "./exercises.js";

export const SWAP_REASONS = {
  equipment: "Machine busy / no equipment",
  pain: "Hurts or feels uncomfortable",
  too_hard: "Too hard right now",
  dislike: "Just don't like it",
};

export const PATTERN_LABELS = {
  horizontal_push: "flat press",
  incline_push: "incline press",
  vertical_push: "overhead press",
  chest_fly: "chest fly",
  lateral_raise: "lateral raise",
  front_raise: "front raise",
  rear_delt_fly: "rear-delt fly",
  vertical_pull: "vertical pull",
  shoulder_extension: "straight-arm lat",
  horizontal_pull: "row",
  shrug: "shrug",
  hinge: "hip hinge",
  hip_thrust: "hip thrust",
  knee_flexion: "leg curl",
  squat: "squat",
  single_leg: "single-leg",
  knee_extension: "knee extension",
  hip_adduction: "adduction",
  hip_abduction: "abduction",
  calf_raise: "calf raise",
  elbow_flexion: "curl",
  elbow_extension: "triceps extension",
  wrist_flexion: "wrist curl",
  carry: "carry/grip",
  core_flexion: "ab flexion",
  core_anti_extension: "anti-extension core",
  core_rotation: "rotational core",
};

// Patterns that train the same muscles through a similar line of pull.
const RELATED_PATTERNS = {
  horizontal_push: ["incline_push", "chest_fly"],
  incline_push: ["horizontal_push", "vertical_push", "chest_fly"],
  vertical_push: ["incline_push"],
  chest_fly: ["horizontal_push", "incline_push"],
  vertical_pull: ["shoulder_extension", "horizontal_pull"],
  shoulder_extension: ["vertical_pull"],
  horizontal_pull: ["vertical_pull", "rear_delt_fly"],
  rear_delt_fly: ["horizontal_pull"],
  lateral_raise: ["vertical_push"],
  hinge: ["hip_thrust", "knee_flexion"],
  hip_thrust: ["hinge", "single_leg"],
  knee_flexion: ["hinge"],
  squat: ["single_leg", "knee_extension"],
  single_leg: ["squat", "hip_thrust"],
  knee_extension: ["squat", "single_leg"],
  core_flexion: ["core_anti_extension"],
  core_anti_extension: ["core_flexion"],
  core_rotation: ["core_flexion"],
};

// Equipment so common that "the X is busy" never means the bench.
const GENERIC_EQUIPMENT = new Set(["bench"]);

const intersect = (a = [], b = []) => a.filter((x) => b.includes(x));

/**
 * Can this person do this exercise at all today?
 * ctx: { equipment, level, injuries, excluded, unavailable, maxFatigue, noSpinalFlexion }
 */
export function isAllowed(exercise, ctx = {}) {
  const owned = ctx.equipment ?? Object.keys(EQUIPMENT);
  const unavailable = ctx.unavailable ?? [];
  if (!exercise.equipment.every((e) => owned.includes(e) && !unavailable.includes(e))) return false;
  if (ctx.level && levelRank(exercise.level) > levelRank(ctx.level)) return false;
  if (ctx.injuries?.length && intersect(exercise.joints, ctx.injuries).length) return false;
  if (ctx.excluded?.includes(exercise.id)) return false;
  if (ctx.maxFatigue && exercise.fatigue > ctx.maxFatigue) return false;
  if (ctx.noSpinalFlexion && exercise.spinalFlexion) return false;
  return true;
}

/** Similarity between an original exercise and a candidate, with human reasons. */
export function similarity(original, candidate) {
  const reasons = [];
  let score = 0;

  const sharedPrimary = intersect(candidate.primary, original.primary);
  score += (30 * sharedPrimary.length) / original.primary.length;
  if (sharedPrimary.length) {
    reasons.push(`Trains ${sharedPrimary.map((m) => MUSCLES[m]).join(" & ")}`);
  }

  if (candidate.pattern === original.pattern) {
    score += 35;
    reasons.push(`Same movement (${PATTERN_LABELS[original.pattern] ?? original.pattern})`);
  } else if (RELATED_PATTERNS[original.pattern]?.includes(candidate.pattern)) {
    score += 15;
  }

  if (candidate.bias === original.bias) score += 8;

  const sharedEmphasis = intersect(candidate.emphasis, original.emphasis);
  if (sharedEmphasis.length) {
    score += 8;
    reasons.push(`Also hits ${sharedEmphasis[0].replace(/_/g, " ")}`);
  }

  if (candidate.mechanics === original.mechanics) score += 6;
  score += Math.min(6, 2 * intersect(candidate.secondary, original.secondary).length);
  score -= 3 * Math.abs(candidate.fatigue - original.fatigue);
  if (candidate.unilateral !== original.unilateral) score -= 2;

  return { score, reasons };
}

/**
 * Rank alternatives for `exerciseId`.
 *
 * options:
 *  - reason:      key of SWAP_REASONS; shapes which candidates are valid
 *  - unavailable: equipment that is busy/missing (defaults to the original's
 *                 non-generic equipment when reason is "equipment")
 *  - excludeIds:  exercises already in today's session
 *  - limit
 */
export function findAlternatives(exerciseId, ctx = {}, options = {}) {
  const original = getExercise(exerciseId);
  if (!original) return [];

  const { reason = "equipment", excludeIds = [], limit = 5, library = EXERCISES } = options;

  const unavailable = [...(ctx.unavailable ?? []), ...(options.unavailable ?? [])];
  if (reason === "equipment" && !options.unavailable) {
    unavailable.push(...original.equipment.filter((e) => !GENERIC_EQUIPMENT.has(e)));
  }
  const injuries = [...(ctx.injuries ?? [])];
  if (reason === "pain") injuries.push(...original.joints);

  const effectiveCtx = { ...ctx, unavailable, injuries };

  const results = [];
  for (const candidate of library) {
    if (candidate.id === original.id || excludeIds.includes(candidate.id)) continue;
    if (!intersect(candidate.primary, original.primary).length) continue;
    if (!isAllowed(candidate, effectiveCtx)) continue;
    if (reason === "too_hard" && (candidate.skill > original.skill || candidate.fatigue > original.fatigue)) continue;

    let { score, reasons } = similarity(original, candidate);

    if (reason === "pain") {
      if (!candidate.joints.length) {
        score += 5;
        reasons.push("Joint-friendly");
      }
      if (candidate.fatigue < original.fatigue) score += 3;
    }
    if (reason === "too_hard") {
      if (candidate.skill < original.skill) {
        score += 10;
        reasons.push("Easier to learn");
      }
      if (candidate.fatigue < original.fatigue) score += 5;
    }
    if (ctx.favorites?.includes(candidate.id)) {
      score += 5;
      reasons.push("One of your favourites");
    }

    results.push({ exercise: candidate, score: Math.round(score), reasons });
  }

  return results
    .sort((a, b) => b.score - a.score || a.exercise.id.localeCompare(b.exercise.id))
    .slice(0, limit);
}
