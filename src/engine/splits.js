/**
 * Splits only say WHICH muscles a day trains. The generator decides HOW
 * (exercises, order, reps), so any split — including a user's custom one —
 * gets rotation for free.
 */

export const SPLITS = {
  full_body_3: {
    id: "full_body_3",
    name: "Full Body",
    daysPerWeek: 3,
    levels: ["beginner", "intermediate"],
    days: [
      { name: "Full Body A", muscles: ["chest", "lats", "quads", "hamstrings", "side_delts", "triceps", "abs"] },
      { name: "Full Body B", muscles: ["upper_back", "chest", "glutes", "quads", "rear_delts", "biceps", "calves"] },
      { name: "Full Body C", muscles: ["lats", "upper_back", "hamstrings", "glutes", "side_delts", "biceps", "triceps", "calves"] },
    ],
  },
  upper_lower_4: {
    id: "upper_lower_4",
    name: "Upper / Lower",
    daysPerWeek: 4,
    levels: ["beginner", "intermediate", "advanced"],
    days: [
      { name: "Upper A", muscles: ["chest", "lats", "upper_back", "side_delts", "triceps", "biceps"] },
      { name: "Lower A", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
      { name: "Upper B", muscles: ["upper_back", "chest", "lats", "rear_delts", "side_delts", "biceps", "triceps"] },
      { name: "Lower B", muscles: ["hamstrings", "glutes", "quads", "adductors", "calves", "obliques"] },
    ],
  },
  ppl_3: {
    id: "ppl_3",
    name: "Push / Pull / Legs",
    daysPerWeek: 3,
    levels: ["beginner", "intermediate"],
    days: [
      { name: "Push", muscles: ["chest", "front_delts", "side_delts", "triceps"] },
      { name: "Pull", muscles: ["lats", "upper_back", "rear_delts", "biceps", "traps"] },
      { name: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
    ],
  },
  ppl_6: {
    id: "ppl_6",
    name: "Push / Pull / Legs ×2",
    daysPerWeek: 6,
    levels: ["intermediate", "advanced"],
    days: [
      { name: "Push A", muscles: ["chest", "side_delts", "triceps"] },
      { name: "Pull A", muscles: ["lats", "upper_back", "rear_delts", "biceps"] },
      { name: "Legs A", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
      { name: "Push B", muscles: ["front_delts", "chest", "side_delts", "triceps"] },
      { name: "Pull B", muscles: ["upper_back", "lats", "rear_delts", "biceps", "traps", "forearms"] },
      { name: "Legs B", muscles: ["hamstrings", "glutes", "quads", "adductors", "calves", "obliques"] },
    ],
  },
  bro_5: {
    id: "bro_5",
    name: "Body Part Split",
    daysPerWeek: 5,
    levels: ["intermediate", "advanced"],
    days: [
      { name: "Chest", muscles: ["chest", "abs"] },
      { name: "Back", muscles: ["lats", "upper_back", "traps", "lower_back"] },
      { name: "Shoulders", muscles: ["front_delts", "side_delts", "rear_delts", "obliques"] },
      { name: "Arms", muscles: ["biceps", "triceps", "forearms"] },
      { name: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves", "adductors"] },
    ],
  },
};

/** Pick a sensible default split for a profile. */
export function recommendSplit({ daysPerWeek, level = "beginner" }) {
  const days = Number(daysPerWeek) || 3;
  if (days <= 3) return level === "beginner" ? SPLITS.full_body_3 : SPLITS.ppl_3;
  if (days === 4) return SPLITS.upper_lower_4;
  if (days === 5) return level === "beginner" ? SPLITS.upper_lower_4 : SPLITS.bro_5;
  return SPLITS.ppl_6;
}

/** How many days per split-week each muscle is trained (for spreading weekly volume). */
export function muscleFrequency(split) {
  const freq = {};
  for (const day of split.days) {
    for (const m of day.muscles) freq[m] = (freq[m] || 0) + 1;
  }
  return freq;
}

/** Which day comes next, given the name of the last completed day. */
export function nextDay(split, lastDayName) {
  const idx = split.days.findIndex((d) => d.name === lastDayName);
  return split.days[(idx + 1) % split.days.length];
}
