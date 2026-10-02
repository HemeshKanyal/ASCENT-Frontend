/**
 * App-side state for training: profile, current block, today's plan,
 * the in-progress session and logged history. Everything lives on the
 * device (AsyncStorage) so the app works offline in the gym.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  SPLITS,
  type Split,
  createBlock,
  ensureBlock,
  generateWorkout,
  nextDay,
  recommendSplit,
  replaceAnchor,
  sessionHighlights,
  swapInWorkout,
  addToWorkout,
  removeFromWorkout,
  volumeCheck,
  weekKey,
  weeklyMuscleSets,
  weeklyTargets,
  workoutMuscleSets,
  type VolumeStatus,
  ageFrom,
  areasForMuscles,
  blockWeek,
  DISCIPLINE_AREAS,
  generateEnduranceSession,
  generateFlow,
  planWeek,
  type EngineProfile,
  type GpsPoint,
  ACTIVITY_BY_ID,
  simplify,
  type EnduranceSession,
  type Flow,
  type PlannedDay,
} from "../engine";
import { goalById, planIntent, type EngineGoal } from "../data/goals";
import { EMPTY_HEALTH, healthModifiers, type HealthProfile } from "../data/health";
import { placeById } from "../data/places";
import { saveRoute } from "./routeStore";
import { EXERCISES } from "../engine";

const EXERCISE_PRIMARY: Record<string, string[]> = Object.fromEntries(EXERCISES.map((e) => [e.id, e.primary]));

export type Level = "beginner" | "intermediate" | "advanced";
export type Goal = EngineGoal;
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const WEEKDAYS: { id: Weekday; short: string; label: string }[] = [
  { id: "mon", short: "M", label: "Monday" },
  { id: "tue", short: "T", label: "Tuesday" },
  { id: "wed", short: "W", label: "Wednesday" },
  { id: "thu", short: "T", label: "Thursday" },
  { id: "fri", short: "F", label: "Friday" },
  { id: "sat", short: "S", label: "Saturday" },
  { id: "sun", short: "S", label: "Sunday" },
];

const DEFAULT_DAYS: Record<number, Weekday[]> = {
  1: ["wed"],
  2: ["mon", "thu"],
  3: ["mon", "wed", "fri"],
  4: ["mon", "tue", "thu", "fri"],
  5: ["mon", "tue", "wed", "fri", "sat"],
  6: ["mon", "tue", "wed", "thu", "fri", "sat"],
  7: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
};

export const defaultTrainingDays = (n: number) => DEFAULT_DAYS[Math.min(7, Math.max(1, n))];

export const todayWeekday = (date = new Date()): Weekday => WEEKDAYS[(date.getDay() + 6) % 7].id;

export type Sex = "male" | "female" | "other";

export type Body = { sex?: Sex; birthYear?: number; heightCm?: number; weightKg?: number };

export type FoodPrefs = { dietType: string; allergies: string[] };

export type Profile = {
  level: Level;
  body: Body;
  food: FoodPrefs;
  /** Everything they're training for; `primaryGoal` drives programming. */
  goals: string[];
  primaryGoal: string;
  /** Derived engine goal (kept for the engine and old data). */
  goal: Goal;
  /** Places they train, each with its own equipment. */
  places: string[];
  activePlace: string;
  placeEquipment: Record<string, string[]>;
  /** Equipment at the active place (derived). */
  equipment: string[];
  trainingDays: Weekday[];
  daysPerWeek: number;
  sessionMinutes: number;
  injuries: string[];
  health: HealthProfile;
  disliked: string[];
  favorites: string[];
  splitId: string;
  createdAt: string;
  updatedAt?: string;
};

const V1_GOAL_IDS: Record<string, string> = {
  hypertrophy: "build_muscle",
  strength: "get_stronger",
  fat_loss: "lose_fat",
  general: "general_fitness",
};

/** Fill in fields added after a profile was first saved, and re-derive computed ones. */
export function normalizeProfile(raw: Partial<Profile> & { location?: string }): Profile {
  const goals = raw.goals?.length ? raw.goals : [V1_GOAL_IDS[raw.goal ?? "hypertrophy"] ?? "build_muscle"];
  const primaryGoal = raw.primaryGoal && goals.includes(raw.primaryGoal) ? raw.primaryGoal : goals[0];
  const places = raw.places?.length ? raw.places : [raw.location ?? "commercial_gym"];
  const activePlace = raw.activePlace && places.includes(raw.activePlace) ? raw.activePlace : places[0];
  const placeEquipment = { ...(raw.placeEquipment ?? {}) };
  for (const id of places) {
    placeEquipment[id] ??= id === raw.location && raw.equipment ? raw.equipment : placeById(id)?.equipment ?? [];
  }
  const trainingDays = raw.trainingDays?.length ? raw.trainingDays : defaultTrainingDays(raw.daysPerWeek ?? 3);
  const level = raw.level ?? "beginner";
  return {
    level,
    body: { ...(raw.body ?? {}) },
    food: { dietType: raw.food?.dietType ?? "none", allergies: raw.food?.allergies ?? [] },
    goals,
    primaryGoal,
    goal: goalById(primaryGoal)?.engineGoal ?? "general",
    places,
    activePlace,
    placeEquipment,
    equipment: placeEquipment[activePlace],
    trainingDays,
    daysPerWeek: trainingDays.length,
    sessionMinutes: raw.sessionMinutes ?? 60,
    injuries: raw.injuries ?? [],
    health: { ...EMPTY_HEALTH, ...(raw.health ?? {}) },
    disliked: raw.disliked ?? [],
    favorites: raw.favorites ?? [],
    splitId: raw.splitId ?? defaultSplitId(trainingDays.length, level),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt,
  };
}

/** What the training engine needs to know, derived from the full profile. */
export function engineProfile(p: Profile): EngineProfile {
  const kinds = p.goals.map((g) => goalById(g)?.kind);
  const health = healthModifiers(p.health);
  return {
    level: p.level,
    goal: p.goal,
    equipment: p.equipment,
    injuries: [...new Set([...p.injuries, ...health.joints])],
    disliked: p.disliked,
    favorites: p.favorites,
    sessionMinutes: p.sessionMinutes,
    conservative: health.conservative,
    noSpinalFlexion: health.noSpinalFlexion,
    concurrent: kinds.some((k) => k === "endurance" || k === "hybrid"),
    preferBodyweight: p.goals.includes("calisthenics"),
  };
}

export type WorkoutExercise = {
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
};

export type Workout = {
  id: string;
  createdAt: string;
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
  exercises: WorkoutExercise[];
};

export type Block = {
  number: number;
  splitId: string;
  startedAt: string;
  weeks: number;
  deloadLastWeek: boolean;
  anchors: Record<string, string>;
};

export type SetLog = { weight: string; reps: string; completed: boolean };
export type ActiveExercise = WorkoutExercise & { log: SetLog[] };
export type ActiveSession = Omit<Workout, "exercises"> & { startedAt: string; exercises: ActiveExercise[] };

export type SessionKind = "strength" | "endurance" | "mobility";

export type SessionMedia = { uri: string; type: "image" | "video"; width?: number; height?: number; durationMs?: number; mimeType?: string };

export type LoggedSession = {
  id: string;
  date: string;
  kind?: SessionKind;
  title?: string;
  // Endurance
  discipline?: string;
  type?: string;
  format?: string;
  distanceKm?: number;
  avgHr?: number;
  rpe?: number;
  notes?: string;
  // Recorded activities
  activity?: string;
  movingSeconds?: number;
  paceSecPerKm?: number | null;
  speedKmh?: number;
  elevationGain?: number;
  splits?: { km: number; seconds: number }[];
  lengths?: number;
  poolLength?: number;
  hasRoute?: boolean;
  calories?: number;
  /** Photos and videos attached after the session. */
  media?: SessionMedia[];
  /** Set once the session has been posted to friends. */
  postId?: string;
  // Mobility
  style?: string;
  moves?: string[];
  startedAt?: string;
  durationMinutes?: number;
  splitId?: string;
  dayName?: string;
  blockNumber?: number;
  exercises: {
    exerciseId: string;
    name: string;
    role?: string;
    repRange?: [number, number];
    sets: { reps: number; weight: number; completed: boolean }[];
  }[];
};

export type SwapReason = "equipment" | "pain" | "too_hard" | "dislike";

const KEYS = {
  profile: "USER_PROFILE",
  block: "TRAINING_BLOCK",
  sessions: "WORKOUT_SESSIONS",
  planned: "PLANNED_WORKOUT",
  active: "ACTIVE_WORKOUT_SESSION",
  todaySession: "TODAY_SESSION",
  override: "TODAY_OVERRIDE",
  guided: "GUIDED_SESSION",
};

export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function read<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

const write = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value));

// ── Profile ───────────────────────────────────────────────────────────────

export async function getProfile(): Promise<Profile | null> {
  const p = await read<Profile>(KEYS.profile);
  // Profiles from the very first prototype lack these fields; treat them as missing.
  return p && p.level && p.splitId ? normalizeProfile(p) : null;
}

export async function saveProfile(profile: Profile) {
  await write(KEYS.profile, normalizeProfile({ ...profile, updatedAt: new Date().toISOString() }));
  // Equipment, injuries or split may have changed — plan again next time.
  await AsyncStorage.removeItem(KEYS.planned);
}

export function defaultSplitId(daysPerWeek: number, level: Level) {
  return recommendSplit({ daysPerWeek, level }).id;
}

// ── History ───────────────────────────────────────────────────────────────

export async function getSessions(): Promise<LoggedSession[]> {
  return (await read<LoggedSession[]>(KEYS.sessions)) ?? [];
}

// ── Today ─────────────────────────────────────────────────────────────────

export type Today = {
  profile: Profile;
  engine: EngineProfile;
  split: Split;
  block: Block;
  /** Strength workout for the next split day (used on strength days and "train anyway"). */
  workout: Workout;
  active: ActiveSession | null;
  sessions: LoggedSession[];
  /** What each training day of this week is for. */
  weekPlan: Record<string, PlannedDay>;
  /** Today's plan (null on rest days), after any override. */
  todayPlan: PlannedDay | null;
  overridden: boolean;
  /** Generated endurance session or flow for non-strength days. */
  session: EnduranceSession | Flow | null;
  sessionMinutes: number;
  warmup: Flow;
  cooldown: Flow | null;
  age: number | null;
  doneToday: LoggedSession[];
  /** Muscles that are over or under for the week, counting today's workout. */
  balance: BalanceItem[];
};

export type BalanceItem = { muscle: string; done: number; today: number; target: number; projected: number; status: VolumeStatus };

/** Weekly per-muscle check. `todayExercises` is the workout as it stands (planned or in progress). */
export function computeBalance(
  ctx: { profile: Profile; engine: EngineProfile; sessions: LoggedSession[]; block: Block },
  todayExercises: { exerciseId: string; sets: number }[],
  now = new Date()
): BalanceItem[] {
  const plan = weekPlanFor(ctx.profile, ctx.block, now);
  const order = WEEKDAYS.map((d) => d.id);
  const todayIdx = order.indexOf(todayWeekday(now));
  const strengthDays = order.filter((d) => plan[d]?.kind === "strength");
  const remaining = strengthDays.filter((d) => order.indexOf(d) > todayIdx).length;
  const done = (weeklyMuscleSets(ctx.sessions) as Record<string, Record<string, number>>)[weekKey(now)] ?? {};
  const doneDirect = (weeklyMuscleSets(ctx.sessions, { direct: true }) as Record<string, Record<string, number>>)[weekKey(now)] ?? {};
  const muscles = [...new Set(SPLITS[ctx.profile.splitId]?.days.flatMap((d) => d.muscles) ?? [])];
  return volumeCheck({
    targets: weeklyTargets(ctx.engine),
    done,
    today: workoutMuscleSets(todayExercises),
    doneDirect,
    todayDirect: workoutMuscleSets(todayExercises, { direct: true }),
    remainingSessions: remaining,
    sessionsPerWeek: Math.max(1, strengthDays.length),
    muscles,
  });
}

/** The planner's view of this week. */
export function weekPlanFor(profile: Profile, block: Block, now = new Date()) {
  const intent = planIntent(profile.goals, profile.primaryGoal);
  const week = blockWeek(block, now);
  return planWeek({
    trainingDays: profile.trainingDays,
    ...intent,
    level: profile.level,
    weekIndex: week - 1,
    deload: block.deloadLastWeek && week === block.weeks,
  });
}

export function minutesFor(day: PlannedDay, profile: Profile, deload = false) {
  const m = profile.sessionMinutes;
  let out = m;
  if (day.kind === "endurance") {
    if (day.type === "long" || day.type === "brick") out = Math.min(Math.round(m * (profile.level === "beginner" ? 1.25 : 1.5)), 150);
    else if (["easy", "technique", "recovery"].includes(day.type)) out = Math.round(m * 0.8);
  } else if (day.kind === "mobility") {
    // A full-length flow when mobility is the main goal; a shorter one otherwise.
    out = Math.min(m, planIntent(profile.goals, profile.primaryGoal).focus === "mobility" ? 60 : 30);
  }
  return Math.round(deload ? out * 0.7 : out);
}

export function flowConstraints(profile: Profile, engine: EngineProfile) {
  return {
    noSpinalFlexion: engine.noSpinalFlexion,
    noSupine: profile.health.conditions.includes("pregnancy"),
    injuries: engine.injuries,
    level: profile.level,
  };
}

/** Areas worth loosening, based on what was trained most recently. */
function recentAreas(sessions: LoggedSession[]) {
  const last = [...sessions].sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
  if (!last) return ["hips", "thoracic", "hamstrings"];
  if (last.kind === "endurance" && last.discipline) return DISCIPLINE_AREAS[last.discipline] ?? [];
  if (last.kind === "mobility") return ["hips", "thoracic", "shoulders"];
  return areasForMuscles(last.exercises.flatMap((e) => getExerciseMuscles(e.exerciseId)));
}

function getExerciseMuscles(id: string): string[] {
  return EXERCISE_PRIMARY[id] ?? [];
}

type Ctx = NonNullable<Awaited<ReturnType<typeof currentContext>>>;

function buildSession(ctx: Ctx, day: PlannedDay, key: string): EnduranceSession | Flow | null {
  const { profile, engine, block, sessions } = ctx;
  const week = blockWeek(block, new Date());
  const deload = block.deloadLastWeek && week === block.weeks;
  const minutes = minutesFor(day, profile, deload);
  if (day.kind === "endurance") {
    return generateEnduranceSession({
      discipline: day.discipline,
      type: day.type,
      level: profile.level,
      minutes,
      blockWeek: week,
      equipment: profile.equipment,
      history: sessions,
      seed: key,
    });
  }
  if (day.kind === "mobility") {
    return generateFlow({
      style: day.style,
      minutes,
      areas: recentAreas(sessions),
      constraints: flowConstraints(profile, engine),
      history: sessions,
      seed: key,
    });
  }
  return null;
}

async function currentContext() {
  const profile = await getProfile();
  if (!profile) return null;
  const split = SPLITS[profile.splitId] ?? recommendSplit(profile);
  const engine = engineProfile(profile);
  const sessions = await getSessions();
  const stored = await read<Block>(KEYS.block);
  const block = ensureBlock({ block: stored, split, profile: engine }) as Block;
  if (block !== stored) {
    await write(KEYS.block, block);
    await AsyncStorage.removeItem(KEYS.planned);
  }
  return { profile, engine, split, sessions, block };
}

function plan(ctx: NonNullable<Awaited<ReturnType<typeof currentContext>>>, dayName?: string): Workout {
  const { split, engine, block, sessions } = ctx;
  const lastHere = [...sessions]
    .filter((s) => s.splitId === split.id)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
  const day = dayName
    ? split.days.find((d) => d.name === dayName) ?? split.days[0]
    : nextDay(split, lastHere?.dayName);
  return generateWorkout({
    split,
    day,
    profile: engine,
    block,
    history: sessions,
    seed: `${day.name}:${Date.now()}`,
  }) as Workout;
}

export async function loadToday(): Promise<Today | null> {
  const ctx = await currentContext();
  if (!ctx) return null;
  let workout = await read<Workout>(KEYS.planned);
  if (!workout || workout.splitId !== ctx.split.id || workout.blockNumber !== ctx.block.number) {
    workout = plan(ctx);
    await write(KEYS.planned, workout);
  }
  const active = await read<ActiveSession>(KEYS.active);

  const now = new Date();
  const dk = dateKey(now);
  const weekPlan = weekPlanFor(ctx.profile, ctx.block, now);
  const override = await read<{ date: string; day: PlannedDay | null }>(KEYS.override);
  const overridden = override?.date === dk;
  const todayPlan = overridden ? override!.day : weekPlan[todayWeekday(now)] ?? null;

  let session: EnduranceSession | Flow | null = null;
  if (todayPlan && todayPlan.kind !== "strength") {
    const key = `${dk}:${JSON.stringify(todayPlan)}:${ctx.profile.activePlace}:${ctx.profile.updatedAt ?? ""}`;
    const cached = await read<{ key: string; session: EnduranceSession | Flow }>(KEYS.todaySession);
    if (cached?.key === key) session = cached.session;
    else {
      session = buildSession(ctx, todayPlan, key);
      await write(KEYS.todaySession, { key, session });
    }
  }

  const week = blockWeek(ctx.block, now);
  const deload = ctx.block.deloadLastWeek && week === ctx.block.weeks;
  const constraints = flowConstraints(ctx.profile, ctx.engine);
  const areas = areasForMuscles(workout.muscles);
  const warmup = generateFlow({ style: "warmup", minutes: 5, areas, constraints, history: ctx.sessions, seed: workout.id });
  const intent = planIntent(ctx.profile.goals, ctx.profile.primaryGoal);
  const cooldown = intent.mobilityStyle
    ? generateFlow({ style: "cooldown", minutes: 8, areas, constraints, history: ctx.sessions, seed: `${workout.id}:cool` })
    : null;

  return {
    ...ctx,
    workout,
    active,
    weekPlan,
    todayPlan,
    overridden,
    session,
    sessionMinutes: todayPlan ? minutesFor(todayPlan, ctx.profile, deload) : ctx.profile.sessionMinutes,
    warmup,
    cooldown,
    age: ageFrom(ctx.profile.body.birthYear),
    doneToday: ctx.sessions.filter((s) => dateKey(new Date(s.date)) === dk),
    // Once today's lifting is logged, the next planned workout isn't "today" any more.
    balance: computeBalance(
      ctx,
      active ? active.exercises : ctx.sessions.some((s) => s.kind === "strength" && dateKey(new Date(s.date)) === dk) ? [] : workout.exercises,
      now
    ),
  };
}

/** Balance for the screens that edit a workout (picker, logger). */
export async function currentBalance(inSession?: boolean) {
  const ctx = await currentContext();
  if (!ctx) return [];
  const source = inSession ? await read<ActiveSession>(KEYS.active) : await read<Workout>(KEYS.planned);
  return computeBalance(ctx, source?.exercises ?? []);
}

/** Add an exercise you chose to today's plan or the running session. */
export async function addExercise(exerciseId: string, inSession?: boolean) {
  const ctx = await currentContext();
  if (!ctx) return;
  if (inSession) {
    const active = await read<ActiveSession>(KEYS.active);
    if (!active) return;
    const next = addToWorkout({ workout: active as unknown as Workout, exerciseId, profile: ctx.engine, block: ctx.block, history: ctx.sessions });
    const added = next.exercises[next.exercises.length - 1];
    active.exercises.push({ ...added, log: emptyLog(added) });
    await write(KEYS.active, active);
  } else {
    const workout = await read<Workout>(KEYS.planned);
    if (!workout) return;
    await write(KEYS.planned, addToWorkout({ workout, exerciseId, profile: ctx.engine, block: ctx.block, history: ctx.sessions }));
  }
}

export async function removeExercise(index: number, inSession?: boolean) {
  if (inSession) {
    const active = await read<ActiveSession>(KEYS.active);
    if (active) await write(KEYS.active, removeFromWorkout(active, index));
  } else {
    const workout = await read<Workout>(KEYS.planned);
    if (workout) await write(KEYS.planned, removeFromWorkout(workout, index));
  }
}

/** Swap what today is for ("train anyway", or a different session than planned). */
export async function setTodayOverride(day: PlannedDay | null) {
  await write(KEYS.override, { date: dateKey(), day });
  await AsyncStorage.removeItem(KEYS.todaySession);
}

export async function clearTodayOverride() {
  await AsyncStorage.removeItem(KEYS.override);
  await AsyncStorage.removeItem(KEYS.todaySession);
}

/** A recovery flow for rest days. */
export async function recoveryFlow(minutes = 15) {
  const ctx = await currentContext();
  if (!ctx) return null;
  return generateFlow({
    style: "recovery",
    minutes,
    areas: recentAreas(ctx.sessions),
    constraints: flowConstraints(ctx.profile, ctx.engine),
    history: ctx.sessions,
    seed: `${dateKey()}:recovery`,
  });
}

// ── Guided sessions (endurance timer, flows) ─────────────────────────────

export type GuidedMode = "endurance" | "mobility" | "warmup" | "cooldown";
export type Guided = { mode: GuidedMode; session: EnduranceSession | Flow; age: number | null };

export const setGuided = (g: Guided) => write(KEYS.guided, g);
export const getGuided = () => read<Guided>(KEYS.guided);

export async function logEndurance(
  session: EnduranceSession,
  log: { durationMinutes: number; distanceKm?: number; avgHr?: number; rpe?: number; notes?: string }
) {
  const sessions = await getSessions();
  const entry: LoggedSession = {
    id: `end_${Date.now()}`,
    date: new Date().toISOString(),
    kind: "endurance",
    title: session.title,
    discipline: session.discipline,
    type: session.type,
    format: session.format,
    ...log,
    exercises: [],
  };
  await write(KEYS.sessions, [...sessions, entry]);
  return entry;
}

/** Save a recorded activity (GPS, laps or timer). The route is stored separately. */
export async function logActivity(input: {
  activityId: string;
  title: string;
  discipline?: string;
  type?: string;
  format?: string;
  durationMinutes: number;
  movingSeconds?: number;
  distanceKm?: number;
  paceSecPerKm?: number | null;
  speedKmh?: number;
  elevationGain?: number;
  splits?: { km: number; seconds: number }[];
  lengths?: number;
  poolLength?: number;
  segments?: GpsPoint[][];
  avgHr?: number;
  rpe?: number;
  notes?: string;
}) {
  const sessions = await getSessions();
  const profile = await getProfile();
  const activity = ACTIVITY_BY_ID[input.activityId];
  const weight = profile?.body.weightKg;
  const id = `act_${Date.now()}`;
  const { segments, ...rest } = input;
  const entry: LoggedSession = {
    id,
    date: new Date().toISOString(),
    kind: activity?.flow ? "mobility" : "endurance",
    activity: input.activityId,
    ...rest,
    discipline: input.discipline ?? activity?.discipline ?? input.activityId,
    hasRoute: !!segments?.flat().length,
    calories: weight && activity ? Math.round((activity.met - 1) * weight * (input.durationMinutes / 60)) : undefined,
    exercises: [],
  };
  if (segments?.flat().length) await saveRoute(id, segments.map((s) => simplify(s, 3)));
  await write(KEYS.sessions, [...sessions, entry]);
  return entry;
}

export async function deleteSession(id: string) {
  const sessions = await getSessions();
  await write(KEYS.sessions, sessions.filter((s) => s.id !== id));
  await AsyncStorage.removeItem(`ROUTE_${id}`);
}

export async function updateSession(id: string, patch: Partial<LoggedSession>) {
  const sessions = await getSessions();
  await write(KEYS.sessions, sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)));
}

export async function getSession(id: string) {
  return (await getSessions()).find((s) => s.id === id) ?? null;
}

export async function logFlow(flow: Flow, durationMinutes: number) {
  const sessions = await getSessions();
  const entry: LoggedSession = {
    id: `mob_${Date.now()}`,
    date: new Date().toISOString(),
    kind: "mobility",
    title: flow.title,
    style: flow.style,
    moves: flow.moves,
    durationMinutes,
    exercises: [],
  };
  await write(KEYS.sessions, [...sessions, entry]);
  return entry;
}

/** New rotation for the given (or current) day. Anchors stay. */
export async function reshuffle(dayName?: string) {
  const ctx = await currentContext();
  if (!ctx) return;
  await write(KEYS.planned, plan(ctx, dayName));
}

export async function startNewBlock() {
  const ctx = await currentContext();
  if (!ctx) return;
  const block = createBlock({ split: ctx.split, profile: ctx.engine, previousBlock: ctx.block });
  await write(KEYS.block, block);
  await AsyncStorage.removeItem(KEYS.planned);
}

// ── Swapping ──────────────────────────────────────────────────────────────

/**
 * Swap exercise `index` in today's plan, or in the running session when `inSession`.
 * Pain/dislike/too-hard on an anchor replaces it for the rest of the block;
 * a busy machine only affects today.
 */
export async function swapExercise({
  index,
  newExerciseId,
  reason,
  inSession,
}: {
  index: number;
  newExerciseId: string;
  reason: SwapReason;
  inSession?: boolean;
}) {
  const ctx = await currentContext();
  if (!ctx) return;
  const { profile, engine, block, sessions } = ctx;

  const source = inSession ? await read<ActiveSession>(KEYS.active) : await read<Workout>(KEYS.planned);
  if (!source) return;
  const old = source.exercises[index];

  const swapped = swapInWorkout({ workout: source, index, newExerciseId, profile: engine, block, history: sessions }) as Workout;

  if (inSession) {
    const replacement = swapped.exercises[index];
    const active = source as ActiveSession;
    active.exercises[index] = { ...replacement, log: emptyLog(replacement) };
    await write(KEYS.active, active);
  } else {
    await write(KEYS.planned, swapped);
  }

  if (reason === "dislike" && !profile.disliked.includes(old.exerciseId)) {
    await write(KEYS.profile, { ...profile, disliked: [...profile.disliked, old.exerciseId] });
  }
  if (old.role === "anchor" && old.anchorKey && reason !== "equipment") {
    await write(KEYS.block, replaceAnchor(block, old.anchorKey, newExerciseId));
  }
}

// ── Session logging ───────────────────────────────────────────────────────

const emptyLog = (e: WorkoutExercise): SetLog[] =>
  Array.from({ length: e.sets }, () => ({
    weight: e.suggestedWeight != null ? String(e.suggestedWeight) : "",
    reps: "",
    completed: false,
  }));

export async function startWorkout(): Promise<ActiveSession | null> {
  const existing = await read<ActiveSession>(KEYS.active);
  if (existing) return existing;
  const workout = await read<Workout>(KEYS.planned);
  if (!workout) return null;
  const active: ActiveSession = {
    ...workout,
    startedAt: new Date().toISOString(),
    exercises: workout.exercises.map((e) => ({ ...e, log: emptyLog(e) })),
  };
  await write(KEYS.active, active);
  return active;
}

export const getActiveSession = () => read<ActiveSession>(KEYS.active);
export const saveActiveSession = (session: ActiveSession) => write(KEYS.active, session);
export const discardActiveSession = () => AsyncStorage.removeItem(KEYS.active);

export async function finishWorkout(active: ActiveSession) {
  const now = new Date();
  const session: LoggedSession = {
    id: active.id,
    date: now.toISOString(),
    kind: "strength",
    title: active.dayName,
    startedAt: active.startedAt,
    durationMinutes: Math.round((+now - +new Date(active.startedAt)) / 60000),
    splitId: active.splitId,
    dayName: active.dayName,
    blockNumber: active.blockNumber,
    exercises: active.exercises
      .map((e) => ({
        exerciseId: e.exerciseId,
        name: e.name,
        role: e.role,
        repRange: e.repRange,
        sets: e.log
          .filter((s) => s.completed && Number(s.reps) > 0)
          .map((s) => ({ reps: Number(s.reps), weight: Number(s.weight) || 0, completed: true })),
      }))
      .filter((e) => e.sets.length > 0),
  };

  const sessions = await getSessions();
  const highlights = sessionHighlights(session, sessions) as { name: string; kind: string; text: string }[];
  await write(KEYS.sessions, [...sessions, session]);
  await AsyncStorage.multiRemove([KEYS.active, KEYS.planned]);
  const ctx = await currentContext();
  const balance = ctx ? computeBalance(ctx, []) : [];
  return { session, highlights, balance };
}

/** Switch where you're training today; the plan is rebuilt for that equipment. */
export async function setActivePlace(placeId: string) {
  const profile = await getProfile();
  if (!profile || !profile.places.includes(placeId)) return;
  await saveProfile({ ...profile, activePlace: placeId });
}

export async function resetAllData() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
