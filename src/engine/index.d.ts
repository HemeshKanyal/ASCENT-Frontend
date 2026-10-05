/** Typed public API of the training engine (implementation is plain JS so it runs under `node --test`). */

export type MuscleId = keyof typeof MUSCLES;
export type Bias = "lengthened" | "mid" | "shortened";
export type LevelId = "beginner" | "intermediate" | "advanced";

export interface Exercise {
  id: string;
  name: string;
  pattern: string;
  primary: string[];
  secondary: string[];
  equipment: string[];
  mechanics: "compound" | "isolation";
  bias: Bias;
  emphasis: string[];
  fatigue: number;
  skill: number;
  level: LevelId;
  anchor: boolean;
  regression: boolean;
  spinalFlexion: boolean;
  joints: string[];
  unilateral: boolean;
  bodyweight: boolean;
  cue: string;
}

export interface SplitDay {
  name: string;
  muscles: string[];
}

export interface Split {
  id: string;
  name: string;
  daysPerWeek: number;
  levels: LevelId[];
  days: SplitDay[];
}

export interface EngineProfile {
  level: LevelId;
  goal: string;
  equipment: string[];
  injuries?: string[];
  disliked?: string[];
  favorites?: string[];
  /** Minutes available per session; caps sets and exercises. */
  sessionMinutes?: number;
  /** Health-driven: no max-effort lifts, 2–3 reps in reserve, moderate rep ranges. */
  conservative?: boolean;
  /** Avoid loaded crunching/twisting (low bone density, postpartum). */
  noSpinalFlexion?: boolean;
  /** Also training for endurance; trims lifting volume to protect recovery. */
  concurrent?: boolean;
  /** Calisthenics focus: favour bodyweight movements. */
  preferBodyweight?: boolean;
}

export interface Context {
  equipment?: string[];
  level?: LevelId;
  injuries?: string[];
  excluded?: string[];
  favorites?: string[];
  unavailable?: string[];
  maxFatigue?: number;
  noSpinalFlexion?: boolean;
}

export interface EngineBlock {
  number: number;
  splitId: string;
  startedAt: string;
  weeks: number;
  deloadLastWeek: boolean;
  anchors: Record<string, string>;
}

export interface HistorySession {
  date: string;
  dayName?: string;
  exercises: {
    exerciseId: string;
    name?: string;
    repRange?: [number, number];
    sets: { reps: number | string; weight: number | string; completed: boolean }[];
  }[];
}

export interface PlannedExercise {
  exerciseId: string;
  name: string;
  role: "anchor" | "rotator" | "custom";
  anchorKey?: string;
  substitutedFor?: string;
  primary: string[];
  sets: number;
  repRange: [number, number];
  restSeconds: number;
  rir: string;
  suggestedWeight: number | null;
  loadNote: string;
  cue: string;
  why: string;
  technique?: { id: string; label: string };
  tempo?: string;
}

export interface GeneratedWorkout {
  id: string;
  createdAt: string;
  seed: string | null;
  splitId: string;
  splitName: string;
  dayName: string;
  muscles: string[];
  blockNumber: number;
  blockWeek: number;
  deload: boolean;
  targets: Record<string, number>;
  planned: Record<string, number>;
  uncovered: string[];
  exercises: PlannedExercise[];
}

export interface Alternative {
  exercise: Exercise;
  score: number;
  reasons: string[];
}

// taxonomy
export const MUSCLES: {
  chest: string; front_delts: string; side_delts: string; rear_delts: string; lats: string; upper_back: string;
  traps: string; biceps: string; triceps: string; forearms: string; quads: string; hamstrings: string;
  glutes: string; adductors: string; calves: string; abs: string; obliques: string; lower_back: string;
};
export const MUSCLE_GROUPS: Record<"chest" | "back" | "shoulders" | "arms" | "legs" | "core", string[]>;
export const WEEKLY_SET_TARGETS: Record<string, number>;
export const LEVEL_VOLUME_SCALE: Record<string, number>;
export const ANCHOR_MUSCLES: string[];
export const LEVELS: LevelId[];
export const EQUIPMENT: Record<string, string>;
export const EQUIPMENT_PRESETS: Record<string, { label: string; equipment: string[] }>;
export const JOINTS: Record<string, string>;
export function levelRank(level: string): number;

// exercises
export const EXERCISES: Exercise[];
export const EXERCISE_BY_ID: Record<string, Exercise>;
export function getExercise(id: string): Exercise | undefined;

// splits
export const SPLITS: Record<string, Split>;
export function recommendSplit(p: { daysPerWeek: number; level?: string }): Split;
export function muscleFrequency(split: Split): Record<string, number>;
export function nextDay(split: Split, lastDayName?: string): SplitDay;

// substitution
export const SWAP_REASONS: Record<"equipment" | "pain" | "too_hard" | "dislike", string>;
export const PATTERN_LABELS: Record<string, string>;
export function isAllowed(exercise: Exercise, ctx?: Context): boolean;
export function similarity(original: Exercise, candidate: Exercise): { score: number; reasons: string[] };
export function findAlternatives(
  exerciseId: string,
  ctx?: Context,
  options?: { reason?: string; unavailable?: string[]; excludeIds?: string[]; limit?: number; library?: Exercise[] }
): Alternative[];

// progression
export function estimate1RM(weight: number, reps: number): number;
export function anchorRepRange(p: {
  goal: string;
  level: string;
  blockNumber?: number;
  exercise?: Exercise;
  conservative?: boolean;
}): [number, number];
export function rotatorRepRange(p: { goal: string; exercise: Exercise; rng: () => number }): [number, number];
export function restSeconds(p: { exercise: Exercise; goal: string }): number;
export function targetRIR(p: { role: string; level: string; exercise: Exercise; conservative?: boolean }): string;
export function lastPerformance(
  exerciseId: string,
  sessions?: HistorySession[]
): { date: string; repRange?: [number, number]; sets: { reps: number; weight: number }[] } | null;
export function suggestLoad(p: { exercise: Exercise; repRange: [number, number]; sessions?: HistorySession[] }): {
  weight: number | null;
  note: string;
};

// generator
export function profileContext(profile: EngineProfile, unavailable?: string[]): Context;
export function sessionTargets(split: Split, day: SplitDay, profile: EngineProfile): Record<string, number>;
export function createBlock(p: {
  split: Split;
  profile: EngineProfile;
  previousBlock?: EngineBlock | null;
  now?: Date;
  seed?: string;
  library?: Exercise[];
}): EngineBlock;
export function blockWeek(block: EngineBlock, now?: Date): number;
export function weeklyTargets(profile: EngineProfile): Record<string, number>;
export type VolumeStatus = "under" | "on_track" | "over";
export function volumeCheck(p: {
  targets: Record<string, number>;
  done: Record<string, number>;
  today?: Record<string, number>;
  /** Direct (primary-mover) sets only; when given, "over" is judged on these. */
  doneDirect?: Record<string, number>;
  todayDirect?: Record<string, number>;
  remainingSessions?: number;
  sessionsPerWeek?: number;
  muscles?: string[];
}): { muscle: string; done: number; today: number; target: number; projected: number; status: VolumeStatus }[];
export function workoutMuscleSets(exercises: { exerciseId: string; sets: number }[], opts?: { direct?: boolean }): Record<string, number>;
export function addToWorkout<W extends { id: string; blockWeek: number; deload: boolean; exercises: PlannedExercise[] }>(p: {
  workout: W;
  exerciseId: string;
  profile: EngineProfile;
  block: EngineBlock;
  history?: HistorySession[];
  sets?: number;
}): W;
export function removeFromWorkout<W extends { exercises: PlannedExercise[] }>(workout: W, index: number): W;
export function ensureBlock(p: { block: EngineBlock | null; split: Split; profile: EngineProfile; now?: Date; library?: Exercise[] }): EngineBlock;
export function replaceAnchor(block: EngineBlock, key: string, exerciseId: string): EngineBlock;
export function generateWorkout(p: {
  split: Split;
  day: SplitDay;
  profile: EngineProfile;
  block: EngineBlock;
  history?: HistorySession[];
  unavailable?: string[];
  seed?: string;
  now?: Date;
  library?: Exercise[];
}): GeneratedWorkout;
export function swapInWorkout<W extends { id: string; blockWeek: number; deload: boolean; exercises: PlannedExercise[] }>(p: {
  workout: W;
  index: number;
  newExerciseId: string;
  profile: EngineProfile;
  block: EngineBlock;
  history?: HistorySession[];
  seed?: string;
}): W;

// progress
export function weekKey(date: string | Date): string;
export function weeklyMuscleSets(sessions?: HistorySession[], opts?: { direct?: boolean }): Record<string, Record<string, number>>;
export function exerciseTimeline(sessions?: HistorySession[]): Record<string, { date: string; e1rm: number; bestReps: number }[]>;
export function sessionHighlights(
  session: HistorySession,
  previous?: HistorySession[]
): { name: string; kind: "pr" | "up" | "first"; text: string }[];

// ── Endurance ─────────────────────────────────────────────────────────────
export type Discipline = "run" | "bike" | "swim" | "hyrox" | "conditioning";
export interface EnduranceStep {
  kind: "warmup" | "work" | "rest" | "steady" | "cooldown" | "drill" | "station";
  label: string;
  seconds?: number;
  meters?: number;
  rest?: number;
  zone?: number;
  note?: string;
}
export interface EnduranceSession {
  kind: "endurance";
  discipline: Discipline;
  type: string;
  format: string;
  title: string;
  summary: string;
  steps: EnduranceStep[];
  totalSeconds: number;
  totalMeters?: number;
  why: string;
}
export const ZONES: { id: number; name: string; hr: [number, number]; rpe: string; feel: string }[];
export const DISCIPLINES: Record<Discipline, { label: string; verb: string }>;
export const SESSION_TYPES: Record<string, string>;
export const HYROX_STATIONS: { id: string; name: string; amount: number; unit: string; needs: string[] }[];
export function maxHeartRate(age: number | null | undefined): number | null;
export function zoneHeartRate(zoneId: number, age: number | null | undefined): [number, number] | null;
export function isHardSession(type: string): boolean;
export function stationFor(station: object, equipment: string[], level: string): { name: string; amount: number; unit: string; substituted?: string };
export function generateEnduranceSession(p: {
  discipline: Discipline;
  type: string;
  level?: string;
  minutes?: number;
  blockWeek?: number;
  equipment?: string[];
  history?: object[];
  seed?: string;
}): EnduranceSession;

// ── Mobility ──────────────────────────────────────────────────────────────
export type FlowStyle = "warmup" | "cooldown" | "mobility" | "recovery" | "yoga" | "pilates";
export interface Move {
  id: string;
  name: string;
  style: string;
  areas: string[];
  seconds: number;
  perSide: boolean;
  flexion: boolean;
  supine: boolean;
  prone: boolean;
  joints: string[];
  level: string;
  cue: string;
}
export interface Flow {
  kind: "mobility";
  style: FlowStyle;
  title: string;
  summary: string;
  moves: string[];
  steps: { kind: "move"; moveId: string; label: string; seconds: number; cue: string }[];
  totalSeconds: number;
}
export const AREAS: Record<string, string>;
export const MOVES: Move[];
export const MOVE_BY_ID: Record<string, Move>;
export const DISCIPLINE_AREAS: Record<string, string[]>;
export function areasForMuscles(muscles?: string[]): string[];
export function generateFlow(p: {
  style?: FlowStyle;
  minutes?: number;
  areas?: string[];
  constraints?: { noSpinalFlexion?: boolean; noSupine?: boolean; injuries?: string[]; level?: string };
  history?: object[];
  seed?: string;
}): Flow;

// ── Week plan ─────────────────────────────────────────────────────────────
export type PlannedDay =
  | { kind: "strength" }
  | { kind: "endurance"; discipline: Discipline; type: string }
  | { kind: "mobility"; style: FlowStyle };
export function planWeek(p: {
  trainingDays: string[];
  focus?: "strength" | "endurance" | "hybrid" | "mobility";
  disciplines?: Discipline[];
  conditioningStyle?: string;
  mobilityStyle?: FlowStyle | null;
  level?: string;
  weekIndex?: number;
  deload?: boolean;
  triathlon?: boolean;
}): Record<string, PlannedDay>;

// ── Foods & nutrition ─────────────────────────────────────────────────────
export interface Per100 {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}
export interface Food {
  id: string;
  name: string;
  category: string;
  per100: Per100;
  servings: [string, number][];
  /** Unknown (undefined) for packaged/custom foods. */
  diet?: "plant" | "dairy" | "egg" | "fish" | "meat";
  allergens: string[];
  purine?: "low" | "moderate" | "high";
  flags: string[];
  aliases: string[];
  sodium?: number;
}
export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  waterMl: number;
  sodiumMg: number;
  trainingKcal: number;
  bmr: number;
  notes: string[];
}
export const FOODS: Food[];
export const FOOD_BY_ID: Record<string, Food>;
export const DIET_TYPES: Record<string, string>;
export const ALLERGENS: Record<string, string>;
export function searchFoods(query: string, foods?: Food[]): Food[];
export function ageFrom(birthYear?: number | null, now?: Date): number | null;
export function bmr(body: { sex?: string; weightKg?: number; heightCm?: number; age?: number | null }): number | null;
export function sessionCalories(session: { kind: string; discipline?: string; type?: string } | null, minutes: number, weightKg: number): number;
export function dailyTargets(p: {
  body: { sex?: string; weightKg: number; heightCm: number; age: number | null };
  goal?: string;
  goalIds?: string[];
  enduranceFocus?: boolean;
  health?: { conditions: string[]; proteinLimitG?: number };
  session?: { kind: string; discipline?: string; type?: string } | null;
  sessionMinutes?: number;
}): Targets | null;
export function fitsDiet(food: { diet?: string; allergens?: string[] }, dietType?: string, allergies?: string[]): boolean;
export function foodWarnings(food: Partial<Food>, conditions?: string[]): string[];
export function entryNutrients(entry: { grams: number; per100: Per100; servings?: number }): Required<Per100>;
export function totals(entries?: { grams: number; per100: Per100; servings?: number }[]): Required<Per100>;
export function suggestFoods(p: {
  remaining: { protein: number; kcal: number };
  dietType?: string;
  allergies?: string[];
  conditions?: string[];
  foods?: Food[];
  limit?: number;
}): { food: Food; grams: number; protein: number; kcal: number }[];

// ── Activities & GPS ──────────────────────────────────────────────────────
export interface Activity {
  id: string;
  name: string;
  category: "cardio" | "outdoor" | "conditioning" | "mind_body" | "sport";
  record: "gps" | "laps" | "time";
  met: number;
  discipline?: Discipline;
  flow?: FlowStyle;
  warmup: string[];
  cooldown: string[];
  drills: string[];
  tips: string[];
  technique: string[];
  mistakes: string[];
  safety: string[];
  maxSpeed?: number;
}
export const ACTIVITY_CATEGORIES: Record<Activity["category"], string>;
export const ACTIVITIES: Activity[];
export const ACTIVITY_BY_ID: Record<string, Activity>;
export const DISCIPLINE_ACTIVITY: Record<Discipline, string>;

export interface GpsPoint {
  lat: number;
  lon: number;
  t: number;
  alt?: number | null;
  acc?: number | null;
}
export interface TrackStats {
  distance: number;
  movingSeconds: number;
  elapsedSeconds: number;
  paceSecPerKm: number | null;
  speedKmh: number;
  elevationGain: number;
  splits: { km: number; seconds: number }[];
}
export function haversine(a: GpsPoint, b: GpsPoint): number;
export function acceptPoint(prev: GpsPoint | null, next: GpsPoint, maxSpeed?: number): boolean;
export function hideRouteEnds(segments: GpsPoint[][], meters?: number): GpsPoint[][];
export function trackStats(segments: GpsPoint[][], opts?: { splitMeters?: number }): TrackStats;
export function currentPace(points: GpsPoint[], windowSeconds?: number): number | null;
export function simplify(points: GpsPoint[], minMeters?: number): GpsPoint[];
export function formatPace(sec: number | null | undefined): string;
export function projectRoute(points: GpsPoint[], width: number, height: number, pad?: number): [number, number][];

// ── Micronutrients & supplements ──────────────────────────────────────────
export type Micros = Partial<Record<
  "sugar" | "satFat" | "sodium" | "cholesterol" | "caffeine" | "calcium" | "iron" | "magnesium" | "potassium" | "zinc" | "phosphorus" |
  "vitA" | "vitC" | "vitD" | "vitE" | "vitK" | "vitB6" | "vitB12" | "folate" | "omega3",
  number
>>;
export interface NutrientDef {
  key: keyof Micros;
  label: string;
  unit: string;
  group: "limit" | "mineral" | "vitamin";
}
export interface MicroRef {
  amount: number;
  kind: "goal" | "limit" | "watch";
  note?: string;
}
export const NUTRIENTS: NutrientDef[];
export const NUTRIENT_BY_KEY: Record<string, NutrientDef>;
export const FOOD_MICROS: Record<string, Micros>;
export function microReferences(p: { sex?: string; age?: number | null; kcal?: number; conditions?: string[] }): Record<string, MicroRef>;
export function microsOf(item: { micros?: Micros | null; foodId?: string; id?: string }): Micros | null;
export function entryMicros(entry: { micros?: Micros | null; foodId?: string; grams?: number; servings?: number }): Micros | null;
export function microTotals<E>(entries?: E[], kcalOf?: (e: E) => number): { totals: Micros; coverage: number };
export function microStatus(amount: number, ref?: MicroRef): "over" | "near" | "ok" | "met" | "close" | "low" | "info" | "unknown";

export interface Supplement {
  id: string;
  name: string;
  serving: string;
  category: string;
  per: Per100;
  micros: Micros;
  diet: Food["diet"];
  allergens: string[];
  about: string;
  cautions: Record<string, string>;
  general?: string;
}
export const SUPPLEMENTS: Supplement[];
export const SUPPLEMENT_BY_ID: Record<string, Supplement>;
export function supplementWarnings(supp: Supplement, conditions?: string[]): string[];

export interface ActivityType {
  id: string;
  label: string;
  hint: string;
  zone?: number;
}
export const ACTIVITY_TYPES: Record<string, ActivityType[]>;
export const CLASSIFIABLE: string[];
export function typesFor(activityId: string): ActivityType[];
export function classifyActivity(p: {
  activity: string;
  distanceKm?: number;
  movingSeconds?: number;
  paceSecPerKm?: number | null;
  splits?: { km: number; seconds: number }[];
  elevationGain?: number;
  avgHr?: number;
  age?: number | null;
  rpe?: number;
  history?: { activity?: string; movingSeconds?: number; paceSecPerKm?: number | null; type?: string }[];
}): { type: string; reason: string };

export function parseMeal(text: string, foods?: Food[]): { items: { food: Food; grams: number; label: string; text: string; note?: string }[]; unknown: string[] };

export interface StreakRun {
  current: number;
  best: number;
}
export interface Streaks {
  plan: StreakRun;
  week: StreakRun & { thisWeek: number; goal: number; met: boolean };
  food: StreakRun;
  atRisk: boolean;
  doneToday: boolean;
}
export function localDayKey(d: Date): string;
export function streaks(
  sessions: { date: string }[],
  opts?: { trainingDays?: string[]; weeklyGoal?: number; foodDays?: string[]; now?: Date }
): Streaks;
export interface Achievement {
  id: string;
  group: string;
  title: string;
  desc: string;
  need: number;
  metric: string;
  earnedAt: string | null;
  progress: number;
  value: number;
}
export function achievements(
  sessions: object[],
  opts?: { trainingDays?: string[]; weeklyGoal?: number; foodDays?: string[]; earned?: Record<string, string>; now?: Date }
): Achievement[];

// ── Anatomy ───────────────────────────────────────────────────────────────
export interface BodyRegion {
  muscle: string | null;
  d: string;
  whole: boolean;
}
export const MUSCLE_DETAILS: Record<string, [name: string, group: string]>;
export const GROUP_MUSCLES: Record<string, string[]>;
export const MUSCLE_GROUP: Record<string, string>;
export function musclesFromGroups(primary?: string[], secondary?: string[]): { primary: string[]; secondary: string[] };
export function exerciseMuscles(exercise: Pick<Exercise, "id" | "primary" | "secondary" | "emphasis">): { primary: string[]; secondary: string[] };
export function muscleLabel(id: string): string;
export const BODY_VIEWBOX: { width: number; height: number };
export const BODY_FRONT: BodyRegion[];
export const BODY_BACK: BodyRegion[];
export const BODY_DETAILS: { front: string[]; back: string[] };
export const AREA_MUSCLES: Record<string, string[]>;
export const ACTIVITY_MUSCLES: Record<string, { primary: string[]; secondary: string[] }>;
export function muscleHighlight(primary?: string[], secondary?: string[]): Record<string, 1 | 2>;

// ── Exercise demo animation ──────────────────────────────────────────────
/** Theme colour key, or a literal colour (body shading uses rgb()). */
export type DemoColor = "muscle" | "muscleSoft" | "outline" | "bar" | "plate" | "plateEdge" | "propDark" | "propTop" | "propSide" | "cable" | "band" | "shadow" | (string & {});
export type DemoShape =
  | { kind: "line"; p1: [number, number]; p2: [number, number]; w: number; color: DemoColor; opacity?: number }
  | { kind: "circle"; c: [number, number]; r: number; color: DemoColor; opacity?: number }
  | { kind: "ellipse"; c: [number, number]; rx: number; ry: number; rot: number; color: DemoColor; opacity?: number }
  | { kind: "poly"; points: [number, number][]; color: DemoColor; opacity?: number };
export interface DemoMotion {
  frames: object[];
  props?: object[];
  cam?: { az?: number; el?: number };
  adjust?: (pose: object) => object;
}
export const MOTIONS: Record<string, DemoMotion>;
export function demoFrame(motion: DemoMotion, t: number, levels: Record<string, 1 | 2>): DemoShape[];
export function demoViewBox(motion: DemoMotion): [number, number, number, number];
export function demoDuration(motion: DemoMotion): number;
export function demoIdFor(exercise: Pick<Exercise, "id">): string | null;
export function checkMotion(motion: DemoMotion, samples?: number): string[];
