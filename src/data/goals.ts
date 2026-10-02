import type { Discipline, FlowStyle } from "../engine";

/**
 * Everything someone might be training for. `engineGoal` is what the strength
 * engine optimises for; `kind` says what else the goal needs from the app.
 */
export type GoalKind = "strength" | "endurance" | "hybrid" | "mobility" | "skill" | "health";
export type EngineGoal = "hypertrophy" | "strength" | "fat_loss" | "general";

export type GoalOption = {
  id: string;
  label: string;
  hint: string;
  group: string;
  kind: GoalKind;
  engineGoal: EngineGoal;
  /** Endurance disciplines this goal needs, in priority order. */
  disciplines?: Discipline[];
  conditioningStyle?: "metcon" | "sprints" | "rounds";
  mobilityStyle?: FlowStyle;
};

export const GOAL_GROUPS = ["Look & feel", "Strength & skill", "Endurance", "Hybrid & functional", "Mind & body", "Sport"];

export const GOALS: GoalOption[] = [
  { id: "build_muscle", label: "Build muscle", hint: "Size, shape and symmetry", group: "Look & feel", kind: "strength", engineGoal: "hypertrophy" },
  { id: "lose_fat", label: "Lose fat", hint: "Lean out while keeping muscle", group: "Look & feel", kind: "strength", engineGoal: "fat_loss" },
  { id: "recomp", label: "Recomposition", hint: "Lose fat and gain muscle together", group: "Look & feel", kind: "strength", engineGoal: "hypertrophy" },
  { id: "general_fitness", label: "General fitness", hint: "Feel better, move better", group: "Look & feel", kind: "health", engineGoal: "general" },
  { id: "longevity", label: "Healthy ageing", hint: "Strength, balance and bones for the long run", group: "Look & feel", kind: "health", engineGoal: "general" },

  { id: "get_stronger", label: "Get stronger", hint: "Heavier main lifts", group: "Strength & skill", kind: "strength", engineGoal: "strength" },
  { id: "powerlifting", label: "Powerlifting", hint: "Squat, bench, deadlift", group: "Strength & skill", kind: "strength", engineGoal: "strength" },
  { id: "calisthenics", label: "Calisthenics", hint: "Pull-ups, dips, handstands, levers", group: "Strength & skill", kind: "skill", engineGoal: "general" },

  { id: "running", label: "Running", hint: "5K to marathon", group: "Endurance", kind: "endurance", engineGoal: "general", disciplines: ["run"] },
  { id: "swimming", label: "Swimming", hint: "Technique, distance, speed", group: "Endurance", kind: "endurance", engineGoal: "general", disciplines: ["swim"] },
  { id: "cycling", label: "Cycling", hint: "Road, gravel or indoor", group: "Endurance", kind: "endurance", engineGoal: "general", disciplines: ["bike"] },
  { id: "triathlon", label: "Triathlon / Ironman", hint: "Swim, bike, run", group: "Endurance", kind: "endurance", engineGoal: "general", disciplines: ["bike", "run", "swim"] },

  { id: "hybrid", label: "Hybrid athlete", hint: "Strong and fit at the same time", group: "Hybrid & functional", kind: "hybrid", engineGoal: "general", disciplines: ["run"] },
  { id: "hyrox", label: "HYROX", hint: "Running + functional stations", group: "Hybrid & functional", kind: "hybrid", engineGoal: "general", disciplines: ["hyrox", "run"] },
  { id: "crossfit", label: "CrossFit / functional", hint: "Mixed modal conditioning", group: "Hybrid & functional", kind: "hybrid", engineGoal: "general", disciplines: ["conditioning"], conditioningStyle: "metcon" },

  { id: "flexibility", label: "Flexibility & mobility", hint: "Move freely, fewer aches", group: "Mind & body", kind: "mobility", engineGoal: "general", mobilityStyle: "mobility" },
  { id: "yoga", label: "Yoga", hint: "Strength, balance, breath", group: "Mind & body", kind: "mobility", engineGoal: "general", mobilityStyle: "yoga" },
  { id: "pilates", label: "Pilates", hint: "Core control and posture", group: "Mind & body", kind: "mobility", engineGoal: "general", mobilityStyle: "pilates" },

  { id: "team_sport", label: "Team sport", hint: "Football, cricket, basketball…", group: "Sport", kind: "hybrid", engineGoal: "general", disciplines: ["conditioning"], conditioningStyle: "sprints" },
  { id: "combat", label: "Combat sport", hint: "Boxing, MMA, wrestling…", group: "Sport", kind: "hybrid", engineGoal: "general", disciplines: ["conditioning"], conditioningStyle: "rounds" },
];

export const goalById = (id: string) => GOALS.find((g) => g.id === id);

/** What the weekly planner should schedule, derived from someone's goals. */
export function planIntent(goals: string[], primaryGoal: string) {
  const ordered = [primaryGoal, ...goals.filter((g) => g !== primaryGoal)].map(goalById).filter(Boolean) as GoalOption[];
  const primary = ordered[0];
  const focus: "strength" | "endurance" | "hybrid" | "mobility" =
    primary?.kind === "endurance" ? "endurance" : primary?.kind === "hybrid" ? "hybrid" : primary?.kind === "mobility" ? "mobility" : "strength";
  const disciplines = [...new Set(ordered.flatMap((g) => g.disciplines ?? []))];
  return {
    focus,
    disciplines,
    conditioningStyle: ordered.find((g) => g.conditioningStyle)?.conditioningStyle,
    mobilityStyle: ordered.find((g) => g.mobilityStyle)?.mobilityStyle ?? null,
    triathlon: goals.includes("triathlon"),
  };
}
