/**
 * Progress that still makes sense when exercises rotate:
 *  - weekly hard sets per muscle (are you actually training everything?)
 *  - per-exercise bests, compared each time an exercise comes back around
 */

import { getExercise } from "./exercises.js";
import { estimate1RM } from "./progression.js";

const completedSets = (entry) =>
  (entry.sets ?? []).filter((s) => s.completed && Number(s.reps) > 0);

/** Monday-based week key in local time, e.g. "2026-09-28" (an early-Monday session belongs to that Monday). */
export function weekKey(date) {
  const d = new Date(date);
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

/** { [weekKey]: { [muscle]: sets } } — primary = 1 set, secondary = 0.5 (or 0 with { direct: true }). */
export function weeklyMuscleSets(sessions = [], { direct = false } = {}) {
  const weeks = {};
  for (const session of sessions) {
    const wk = (weeks[weekKey(session.date)] ??= {});
    for (const entry of session.exercises ?? []) {
      const exercise = getExercise(entry.exerciseId);
      if (!exercise) continue;
      const n = completedSets(entry).length;
      for (const m of exercise.primary) wk[m] = (wk[m] ?? 0) + n;
      if (!direct) for (const m of exercise.secondary) wk[m] = (wk[m] ?? 0) + n * 0.5;
    }
  }
  return weeks;
}

/** Best estimated 1RM (or best reps for bodyweight) per exercise, per session, oldest → newest. */
export function exerciseTimeline(sessions = []) {
  const timeline = {};
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  for (const session of sorted) {
    for (const entry of session.exercises ?? []) {
      const sets = completedSets(entry);
      if (!sets.length) continue;
      const best = Math.max(...sets.map((s) => estimate1RM(Number(s.weight) || 0, Number(s.reps))));
      const bestReps = Math.max(...sets.map((s) => Number(s.reps)));
      (timeline[entry.exerciseId] ??= []).push({ date: session.date, e1rm: Math.round(best * 10) / 10, bestReps });
    }
  }
  return timeline;
}

/**
 * Compare a just-finished session with the last time each exercise appeared.
 * Returns highlights like { name, kind: "pr" | "up" | "first", text }.
 */
export function sessionHighlights(session, previousSessions = []) {
  const timeline = exerciseTimeline(previousSessions);
  const highlights = [];

  for (const entry of session.exercises ?? []) {
    const sets = completedSets(entry);
    if (!sets.length) continue;
    const name = entry.name ?? getExercise(entry.exerciseId)?.name ?? entry.exerciseId;
    const e1rm = Math.max(...sets.map((s) => estimate1RM(Number(s.weight) || 0, Number(s.reps))));
    const bestReps = Math.max(...sets.map((s) => Number(s.reps)));
    const past = timeline[entry.exerciseId];

    if (!past) {
      highlights.push({ name, kind: "first", text: `First time logging ${name}.` });
      continue;
    }

    const allTime = Math.max(...past.map((p) => p.e1rm));
    const last = past[past.length - 1];
    if (e1rm > 0 && e1rm > allTime) {
      highlights.push({ name, kind: "pr", text: `New best on ${name} (est. max ${Math.round(e1rm)}).` });
    } else if (e1rm > 0 && e1rm > last.e1rm) {
      highlights.push({ name, kind: "up", text: `${name} up since last time.` });
    } else if (e1rm === 0 && bestReps > last.bestReps) {
      highlights.push({ name, kind: "up", text: `${name}: ${bestReps} reps, up from ${last.bestReps}.` });
    }
  }
  return highlights;
}
