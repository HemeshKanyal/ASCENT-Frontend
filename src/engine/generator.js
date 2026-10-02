/**
 * Workout generator — "Anchors + Rotators".
 *
 *  - Anchors: 1 big compound per major muscle, fixed for a training block
 *    (4–6 weeks) so overload is measurable. New block → new anchors.
 *  - Rotators: every other slot is re-picked each session, favouring
 *    exercises you haven't done lately and angles/stretch positions not
 *    already covered today.
 *  - Coverage: every target muscle gets its set budget; nothing is skipped
 *    just to make the session "different".
 */

import { ANCHOR_MUSCLES, LEVEL_VOLUME_SCALE, MUSCLES, WEEKLY_SET_TARGETS } from "./taxonomy.js";
import { EXERCISES, getExercise } from "./exercises.js";
import { createRng, shuffle } from "./random.js";
import { muscleFrequency } from "./splits.js";
import { findAlternatives, isAllowed, PATTERN_LABELS } from "./substitution.js";
import {
  anchorRepRange,
  restSeconds,
  rotatorRepRange,
  suggestLoad,
  targetRIR,
} from "./progression.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const LIMITS = {
  beginner: { maxSets: 16, maxExercises: 6, setsPerExercise: 3, anchorFatigue: 7, fatigue: 14, blockWeeks: 6 },
  intermediate: { maxSets: 22, maxExercises: 7, setsPerExercise: 4, anchorFatigue: 9, fatigue: 18, blockWeeks: 5 },
  advanced: { maxSets: 26, maxExercises: 8, setsPerExercise: 4, anchorFatigue: 10, fatigue: 22, blockWeeks: 5 },
};

const GOAL_VOLUME_SCALE = { strength: 0.85, fat_loss: 0.9 };

// Concurrent endurance training competes for recovery (mostly legs), so lift a bit less.
const CONCURRENT_VOLUME_SCALE = 0.8;

// Rough sets / exercises that fit in a session of N minutes, warm-up included.
const TIME_LIMITS = [
  { minutes: 30, maxSets: 10, maxExercises: 4 },
  { minutes: 45, maxSets: 14, maxExercises: 5 },
  { minutes: 60, maxSets: 20, maxExercises: 6 },
  { minutes: 75, maxSets: 24, maxExercises: 7 },
  { minutes: 90, maxSets: 28, maxExercises: 8 },
];

const TECHNIQUES = [
  { id: "drop_set", label: "Drop set: after the last set, drop ~25% weight and go again." },
  { id: "myo_reps", label: "Myo-reps: after the last set, rest 15s and do 3–4 more reps, 3 times." },
  { id: "lengthened_partials", label: "Lengthened partials: after the last set, add 4–6 half reps in the stretch." },
  { id: "pause_reps", label: "Pause 2s in the stretched position on every rep." },
];

const BIAS_LABEL = { lengthened: "stretch-focused", mid: "mid-range", shortened: "squeeze-focused" };

const intersect = (a = [], b = []) => a.filter((x) => b.includes(x));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const roundHalf = (v) => Math.round(v * 2) / 2;

function limitsFor(profile) {
  const base = LIMITS[profile.level] ?? LIMITS.beginner;
  if (!profile.sessionMinutes) return base;
  const time = TIME_LIMITS.find((t) => profile.sessionMinutes <= t.minutes) ?? TIME_LIMITS[TIME_LIMITS.length - 1];
  return {
    ...base,
    maxSets: Math.min(base.maxSets, time.maxSets),
    maxExercises: Math.min(base.maxExercises, time.maxExercises),
  };
}

export const profileContext = (profile, unavailable = []) => ({
  equipment: profile.equipment,
  level: profile.level,
  injuries: profile.injuries ?? [],
  excluded: profile.disliked ?? [],
  favorites: profile.favorites ?? [],
  maxFatigue: profile.conservative ? 4 : undefined,
  noSpinalFlexion: profile.noSpinalFlexion ?? false,
  unavailable,
});

/** Hard sets per muscle per week for this person. */
export function weeklyTargets(profile) {
  const scale =
    (LEVEL_VOLUME_SCALE[profile.level] ?? 1) *
    (GOAL_VOLUME_SCALE[profile.goal] ?? 1) *
    (profile.concurrent ? CONCURRENT_VOLUME_SCALE : 1);
  return Object.fromEntries(Object.entries(WEEKLY_SET_TARGETS).map(([m, t]) => [m, Math.round(t * scale)]));
}

/**
 * Is each muscle on track this week, given what's been done, what today adds,
 * and how many strength sessions are still to come?
 *
 * @param {object} p
 * @param {Record<string, number>} p.targets   weekly targets (weeklyTargets)
 * @param {Record<string, number>} p.done      sets already logged this week
 * @param {Record<string, number>} [p.today]   sets in today's (possibly edited) workout
 * @param {number} [p.remainingSessions]       strength sessions left this week after today
 * @param {number} [p.sessionsPerWeek]         strength sessions in a normal week
 * @param {string[]} [p.muscles]               muscles to report on (defaults to all with a target)
 */
export function volumeCheck({ targets, done, today = {}, doneDirect, todayDirect, remainingSessions = 0, sessionsPerWeek = 3, muscles }) {
  const list = muscles ?? Object.keys(targets);
  return list.map((m) => {
    const target = targets[m] ?? 0;
    const d = done[m] ?? 0;
    const t = today[m] ?? 0;
    // Expect future sessions to cover the muscle at its average per-session share.
    const projected = d + t + (target / Math.max(1, sessionsPerWeek)) * remainingSessions;
    let status = "on_track";
    // "Over" counts only direct work — pressing hitting the front delts isn't overtraining them.
    const direct = doneDirect || todayDirect ? (doneDirect?.[m] ?? 0) + (todayDirect?.[m] ?? 0) : d + t;
    if (target && direct > target * 1.35) status = "over";
    else if (target && projected < target * 0.7) status = "under";
    return { muscle: m, done: d, today: t, target, projected: Math.round(projected * 2) / 2, status };
  });
}

/** Sets per muscle in a workout (primary 1, secondary 0.5 — or 0 with { direct: true }). */
export function workoutMuscleSets(exercises, { direct = false } = {}) {
  const out = {};
  for (const e of exercises) {
    const ex = getExercise(e.exerciseId);
    if (!ex) continue;
    for (const m of ex.primary) out[m] = (out[m] ?? 0) + e.sets;
    if (!direct) for (const m of ex.secondary) out[m] = (out[m] ?? 0) + e.sets * 0.5;
  }
  return out;
}

/** Sets per target muscle for one session of this day. */
export function sessionTargets(split, day, profile) {
  const freq = muscleFrequency(split);
  const scale =
    (LEVEL_VOLUME_SCALE[profile.level] ?? 1) *
    (GOAL_VOLUME_SCALE[profile.goal] ?? 1) *
    (profile.concurrent ? CONCURRENT_VOLUME_SCALE : 1);

  const targets = {};
  for (const m of day.muscles) {
    targets[m] = clamp(roundHalf(((WEEKLY_SET_TARGETS[m] ?? 4) * scale) / (freq[m] || 1)), 2, 10);
  }

  const { maxSets } = limitsFor(profile);
  const total = Object.values(targets).reduce((a, b) => a + b, 0);
  if (total > maxSets) {
    const k = maxSets / total;
    for (const m of Object.keys(targets)) targets[m] = Math.max(2, roundHalf(targets[m] * k));
  }
  return targets;
}

// ── Blocks & anchors ──────────────────────────────────────────────────────

const anchorKey = (day, muscle) => `${day.name}:${muscle}`;

function chooseAnchorsForDay({ split, day, profile, rng, usedByMuscle, previous, library }) {
  const ctx = profileContext(profile);
  const limits = limitsFor(profile);
  const targets = sessionTargets(split, day, profile);

  const muscles = day.muscles
    .filter((m) => ANCHOR_MUSCLES.includes(m))
    .sort((a, b) => targets[b] - targets[a]);

  const anchors = {};
  const covered = new Set();
  const patterns = new Set();
  let fatigue = 0;

  for (const m of muscles) {
    if (covered.has(m)) continue;

    const candidates = library.filter(
      (e) =>
        e.anchor &&
        e.mechanics === "compound" &&
        e.primary.includes(m) &&
        isAllowed(e, ctx) &&
        !patterns.has(e.pattern) &&
        fatigue + e.fatigue <= limits.anchorFatigue &&
        !(usedByMuscle[m] ?? []).includes(e.id)
    );
    if (!candidates.length) continue;

    // Prefer something other than last block's anchor for this slot.
    const fresh = candidates.filter((e) => e.id !== previous[anchorKey(day, m)]);
    const pool = fresh.length ? fresh : candidates;

    const weights = pool.map((e) => {
      let w = 1;
      if (e.primary[0] === m) w += 1;
      if (profile.level === "beginner" && e.skill === 1) w += 1.5;
      // Experienced lifters outgrow load-limited lifts (goblet squat, push-ups) as anchors.
      if (profile.level !== "beginner" && (e.fatigue <= 2 || e.bodyweight)) w *= 0.4;
      if (profile.level !== "beginner" && e.regression) w *= 0.05;
      if (profile.preferBodyweight && e.bodyweight) w *= 3;
      if (profile.favorites?.includes(e.id)) w += 2;
      return w;
    });
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    let chosen = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        chosen = pool[i];
        break;
      }
    }

    anchors[anchorKey(day, m)] = chosen.id;
    (usedByMuscle[m] ??= []).push(chosen.id);
    chosen.primary.forEach((p) => covered.add(p));
    patterns.add(chosen.pattern);
    fatigue += chosen.fatigue;
  }
  return anchors;
}

export function createBlock({ split, profile, previousBlock = null, now = new Date(), seed, library = EXERCISES }) {
  const number = (previousBlock?.number ?? 0) + 1;
  const rng = createRng(seed ?? `${split.id}:block:${number}:${now.toISOString().slice(0, 10)}`);
  const previous = previousBlock?.anchors ?? {};
  const usedByMuscle = {};

  const anchors = {};
  for (const day of split.days) {
    Object.assign(anchors, chooseAnchorsForDay({ split, day, profile, rng, usedByMuscle, previous, library }));
  }

  const { blockWeeks } = limitsFor(profile);
  return {
    number,
    splitId: split.id,
    startedAt: now.toISOString(),
    weeks: blockWeeks,
    deloadLastWeek: profile.level !== "beginner",
    anchors,
  };
}

export function blockWeek(block, now = new Date()) {
  return Math.floor((now - new Date(block.startedAt)) / (7 * DAY_MS)) + 1;
}

/** Returns the current block, starting a new one when it's finished or the split changed. */
export function ensureBlock({ block, split, profile, now = new Date(), library = EXERCISES }) {
  if (!block || block.splitId !== split.id || blockWeek(block, now) > block.weeks) {
    return createBlock({ split, profile, previousBlock: block, now, library });
  }
  return block;
}

/** Permanently swap an anchor for the rest of the block (pain, dislike). */
export function replaceAnchor(block, key, exerciseId) {
  return { ...block, anchors: { ...block.anchors, [key]: exerciseId } };
}

// ── History ───────────────────────────────────────────────────────────────

/** For each exercise: how many sessions ago it was done, and whether it was in the last session of this day. */
export function recencyIndex(history = [], dayName) {
  const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
  const sessionsAgo = {};
  sorted.forEach((s, i) => {
    for (const e of s.exercises ?? []) {
      if (!(e.exerciseId in sessionsAgo)) sessionsAgo[e.exerciseId] = i;
    }
  });
  const lastSameDay = sorted.find((s) => s.dayName === dayName);
  const inLastSameDay = new Set((lastSameDay?.exercises ?? []).map((e) => e.exerciseId));
  return { sessionsAgo, inLastSameDay, hasHistory: sorted.length > 0 };
}

// ── Generation ────────────────────────────────────────────────────────────

function addCoverage(remaining, exercise, sets) {
  for (const m of exercise.primary) if (m in remaining) remaining[m] -= sets;
  for (const m of exercise.secondary) if (m in remaining) remaining[m] -= sets * 0.5;
}

function rotatorScore({ candidate, sets, remaining, direct, chosen, recency, otherAnchors, profile, fatigueLeft, rng }) {
  let score = 0;

  // Every target muscle deserves at least one exercise aimed at it.
  for (const m of candidate.primary) if (m in remaining && !direct.has(m)) score += 10;

  // Coverage gain, penalising junk volume on muscles already done.
  for (const m of candidate.primary) {
    if (!(m in remaining)) continue;
    if (remaining[m] > 0) score += 6 * Math.min(remaining[m], sets);
    else if (direct.has(m)) score -= 4;
  }
  for (const m of candidate.secondary) {
    if (m in remaining && remaining[m] > 0) score += 3 * Math.min(remaining[m], sets * 0.5);
  }

  // Novelty: the core of "never the same workout twice".
  if (recency.inLastSameDay.has(candidate.id)) score -= 25;
  const ago = recency.sessionsAgo[candidate.id];
  if (ago === undefined) score += recency.hasHistory ? 6 : 0;
  else if (ago < 2) score -= 8;
  else score += Math.min(ago, 6);

  // Variety within today's session for the same muscle.
  for (const item of chosen) {
    if (!intersect(item.exercise.primary, candidate.primary).length) continue;
    if (item.exercise.pattern === candidate.pattern) score -= 10;
    score += item.exercise.bias === candidate.bias ? -6 : 4;
    if (intersect(item.exercise.emphasis, candidate.emphasis).length) score -= 3;
  }

  if (candidate.fatigue >= 4) score -= 5;
  if (candidate.regression && profile.level !== "beginner") score -= 20;
  if (profile.preferBodyweight && candidate.bodyweight) score += 6;
  if (candidate.fatigue > fatigueLeft) score -= 15;
  if (otherAnchors.has(candidate.id)) score -= 4;
  if (profile.favorites?.includes(candidate.id)) score += 4;

  return score + rng() * 8;
}

function describeRotator(exercise, recency) {
  const ago = recency.sessionsAgo[exercise.id];
  const freshness =
    ago === undefined ? "new for you" : ago === 0 ? "repeat from last session" : `last done ${ago + 1} sessions ago`;
  const emphasis = exercise.emphasis[0] ? `, ${exercise.emphasis[0].replace(/_/g, " ")}` : "";
  return `Rotation: ${BIAS_LABEL[exercise.bias]} ${PATTERN_LABELS[exercise.pattern] ?? exercise.pattern}${emphasis} — ${freshness}.`;
}

function prescribe({ item, profile, block, week, history, rng, deload }) {
  const { exercise, role } = item;
  const repRange =
    role === "anchor"
      ? anchorRepRange({ goal: profile.goal, level: profile.level, blockNumber: block.number, exercise, conservative: profile.conservative })
      : rotatorRepRange({ goal: profile.goal, exercise, rng });
  const load = suggestLoad({ exercise, repRange, sessions: history });

  return {
    exerciseId: exercise.id,
    name: exercise.name,
    role,
    anchorKey: item.anchorKey,
    substitutedFor: item.substitutedFor,
    primary: exercise.primary,
    sets: deload ? Math.max(1, Math.round(item.sets * 0.6)) : item.sets,
    repRange,
    restSeconds: restSeconds({ exercise, goal: profile.goal }),
    rir: deload ? "3–4" : targetRIR({ role, level: profile.level, exercise, conservative: profile.conservative }),
    suggestedWeight: deload && load.weight ? Math.round(load.weight * 0.9 * 2) / 2 : load.weight,
    loadNote: load.note,
    cue: exercise.cue,
    why:
      role === "anchor"
        ? `Anchor for ${MUSCLES[item.anchorMuscle]} — same lift all block (week ${week}/${block.weeks}) so you can add weight.`
        : item.why,
  };
}

/**
 * Build one session.
 *
 * @returns workout object ready for display / logging
 */
export function generateWorkout({
  split,
  day,
  profile,
  block,
  history = [],
  unavailable = [],
  seed,
  now = new Date(),
  library = EXERCISES,
}) {
  const rng = createRng(seed ?? `${day.name}:${now.toISOString().slice(0, 10)}`);
  const ctx = profileContext(profile, unavailable);
  const limits = limitsFor(profile);
  const targets = sessionTargets(split, day, profile);
  const remaining = { ...targets };
  const recency = recencyIndex(history, day.name);
  const week = blockWeek(block, now);
  const deload = block.deloadLastWeek && week === block.weeks;

  const chosen = [];
  const chosenIds = new Set();
  const direct = new Set(); // muscles hit as a primary mover by something today
  let fatigue = 0;

  const add = (item) => {
    chosen.push(item);
    chosenIds.add(item.exercise.id);
    item.exercise.primary.forEach((m) => direct.add(m));
    addCoverage(remaining, item.exercise, item.sets);
    fatigue += item.exercise.fatigue;
  };

  // 1) Anchors (swapped for today only if not doable).
  const dayAnchors = Object.entries(block.anchors).filter(([key]) => key.startsWith(`${day.name}:`));
  const otherAnchors = new Set(
    Object.entries(block.anchors).filter(([key]) => !key.startsWith(`${day.name}:`)).map(([, id]) => id)
  );

  for (const [key, id] of dayAnchors) {
    let exercise = getExercise(id);
    let substitutedFor;
    if (!exercise || !isAllowed(exercise, ctx)) {
      const alt = findAlternatives(id, ctx, { reason: "equipment", excludeIds: [...chosenIds], limit: 1, library })[0];
      if (!alt) continue;
      substitutedFor = id;
      exercise = alt.exercise;
    }
    const muscle = key.split(":")[1];
    const sets = clamp(Math.round(targets[muscle] ?? 3), 3, limits.setsPerExercise);
    add({ exercise, role: "anchor", sets, anchorKey: key, anchorMuscle: muscle, substitutedFor });
  }

  // 2) Rotators fill the remaining volume.
  const unreachable = new Set();
  while (chosen.length < limits.maxExercises) {
    const needy = Object.keys(remaining).filter(
      (m) => (remaining[m] >= 1.5 || !direct.has(m)) && !unreachable.has(m)
    );
    if (!needy.length) break;

    const candidates = library.filter((e) => {
      if (chosenIds.has(e.id) || !isAllowed(e, ctx)) return false;
      if (!intersect(e.primary, needy).length) return false;
      // On-target: its main muscle, or at least half its primary muscles, are trained today.
      return (
        day.muscles.includes(e.primary[0]) ||
        intersect(e.primary, day.muscles).length >= Math.ceil(e.primary.length / 2)
      );
    });

    if (!candidates.length) {
      needy.forEach((m) => unreachable.add(m));
      continue;
    }

    let best = null;
    for (const candidate of candidates) {
      const main = intersect(candidate.primary, needy).sort((a, b) => remaining[b] - remaining[a])[0];
      const sets = clamp(Math.round(remaining[main]), 2, limits.setsPerExercise);
      const score = rotatorScore({
        candidate,
        sets,
        remaining,
        direct,
        chosen,
        recency,
        otherAnchors,
        profile,
        fatigueLeft: limits.fatigue - fatigue,
        rng,
      });
      if (!best || score > best.score) best = { candidate, sets, score };
    }

    add({
      exercise: best.candidate,
      role: "rotator",
      sets: best.sets,
      why: describeRotator(best.candidate, recency),
    });
  }

  // 3) Order: anchors → heavy compounds → isolation → core. Shuffle within tiers for variety.
  const tier = (item) => {
    const ex = item.exercise;
    if (item.role === "anchor") return 0;
    if (ex.pattern.startsWith("core_")) return 3;
    return ex.mechanics === "compound" ? 1 : 2;
  };
  const ordered = [0, 1, 2, 3].flatMap((t) => {
    const group = chosen.filter((item) => tier(item) === t);
    return t === 0
      ? group.sort((a, b) => b.exercise.fatigue - a.exercise.fatigue)
      : shuffle(rng, group).sort((a, b) => b.exercise.fatigue - a.exercise.fatigue);
  });

  // 4) Prescriptions + a little intensity variety.
  const exercises = ordered.map((item) => prescribe({ item, profile, block, week, history, rng, deload }));

  if (!deload && profile.level !== "beginner" && profile.goal !== "strength" && rng() < 0.5) {
    const isoIdx = exercises
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => getExercise(e.exerciseId).mechanics === "isolation" && e.role === "rotator");
    if (isoIdx.length) {
      const { i } = isoIdx[Math.floor(rng() * isoIdx.length)];
      exercises[i].technique = TECHNIQUES[Math.floor(rng() * TECHNIQUES.length)];
    }
  }
  for (const e of exercises) {
    if (e.role === "rotator" && !e.technique && rng() < 0.25) e.tempo = "3s lowering";
  }

  const planned = {};
  for (const m of Object.keys(targets)) planned[m] = roundHalf(targets[m] - remaining[m]);

  return {
    id: `wo_${now.getTime()}_${Math.floor(rng() * 1e6)}`,
    createdAt: now.toISOString(),
    seed: seed ?? null,
    splitId: split.id,
    splitName: split.name,
    dayName: day.name,
    muscles: day.muscles,
    blockNumber: block.number,
    blockWeek: week,
    deload,
    targets,
    planned,
    uncovered: Object.keys(remaining).filter((m) => remaining[m] >= 1.5),
    exercises,
  };
}

/**
 * Swap one exercise in a generated workout, keeping its slot (role, sets).
 */
/** Add an exercise the person chose themselves. */
export function addToWorkout({ workout, exerciseId, profile, block, history = [], sets = 3 }) {
  const exercise = getExercise(exerciseId);
  if (!exercise) return workout;
  const rng = createRng(`${workout.id}:add:${exerciseId}`);
  const added = prescribe({
    item: { exercise, role: "custom", sets, why: "Added by you." },
    profile,
    block,
    week: workout.blockWeek,
    history,
    rng,
    deload: workout.deload,
  });
  return { ...workout, exercises: [...workout.exercises, added] };
}

export function removeFromWorkout(workout, index) {
  return { ...workout, exercises: workout.exercises.filter((_, i) => i !== index) };
}

export function swapInWorkout({ workout, index, newExerciseId, profile, block, history = [], seed }) {
  const old = workout.exercises[index];
  const exercise = getExercise(newExerciseId);
  const rng = createRng(seed ?? `${workout.id}:swap:${index}:${newExerciseId}`);
  const item = {
    exercise,
    role: old.role,
    sets: old.sets,
    anchorKey: old.anchorKey,
    anchorMuscle: old.anchorKey?.split(":")[1],
    substitutedFor: old.substitutedFor ?? old.exerciseId,
    why: `Swapped in for ${old.name}.`,
  };
  const replacement = prescribe({
    item,
    profile,
    block,
    week: workout.blockWeek,
    history,
    rng,
    deload: workout.deload,
  });
  const exercises = [...workout.exercises];
  exercises[index] = replacement;
  return { ...workout, exercises };
}
