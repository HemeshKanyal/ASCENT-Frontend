/**
 * Streaks and achievements. All dates are the device's local calendar days.
 *
 * Streaks are forgiving: rest days in your plan never break a streak — only a
 * planned day you skipped does. Today never breaks anything while it's still today.
 */

const WEEKDAY_IDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const localDayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

/**
 * Current and best run of days that are active or allowed rest. A run only
 * counts once it contains an active day; today never breaks a run.
 */
function chain(firstDay, today, isActive, isRest) {
  let best = 0;
  let run = 0;
  let hasActive = false;
  for (let d = firstDay; d <= today; d = addDays(d, 1)) {
    if (isActive(d)) {
      run++;
      hasActive = true;
    } else if (isRest(d)) {
      if (hasActive) run++;
    } else if (+d !== +today) {
      run = 0;
      hasActive = false;
    }
    if (hasActive) best = Math.max(best, run);
  }
  return { current: hasActive ? run : 0, best };
}

/**
 * @param {{ date: string, durationMinutes?: number }[]} sessions
 * @param {{ trainingDays?: string[], weeklyGoal?: number, foodDays?: string[], now?: Date }} opts
 */
export function streaks(sessions, { trainingDays = [], weeklyGoal = 3, foodDays = [], now = new Date() } = {}) {
  const today = startOfDay(now);
  const active = new Set(sessions.map((s) => localDayKey(new Date(s.date))));
  const rest = new Set(WEEKDAY_IDS.filter((id) => !trainingDays.includes(id)));
  const isRestDay = (d) => rest.has(WEEKDAY_IDS[d.getDay()]);
  const first = sessions.length ? startOfDay(new Date(Math.min(...sessions.map((s) => +new Date(s.date))))) : today;

  // Plan streak: days in a row where you either trained or it was a planned rest day.
  const plan = chain(first, today, (d) => active.has(localDayKey(d)), isRestDay);

  // Week streak: Monday-weeks in a row where you hit your weekly goal of active days.
  const goal = Math.max(1, Math.min(7, weeklyGoal));
  const daysInWeek = (monday) => {
    let n = 0;
    for (let i = 0; i < 7; i++) if (active.has(localDayKey(addDays(monday, i)))) n++;
    return n;
  };
  const thisMonday = mondayOf(today);
  const thisWeekDays = daysInWeek(thisMonday);
  const metThisWeek = thisWeekDays >= goal;
  let weekCurrent = metThisWeek ? 1 : 0;
  for (let m = addDays(thisMonday, -7); m >= mondayOf(first) && daysInWeek(m) >= goal; m = addDays(m, -7)) weekCurrent++;
  let weekBest = 0;
  let run = 0;
  for (let m = mondayOf(first); m <= thisMonday; m = addDays(m, 7)) {
    if (daysInWeek(m) >= goal) weekBest = Math.max(weekBest, ++run);
    else if (+m !== +thisMonday) run = 0;
  }

  // Food log streak: days in a row with anything logged.
  const food = new Set(foodDays);
  const firstFood = foodDays.length ? startOfDay(new Date(`${[...foodDays].sort()[0]}T12:00:00`)) : today;
  const log = chain(firstFood, today, (d) => food.has(localDayKey(d)), () => false);

  const todayPlanned = !isRestDay(today);
  const doneToday = active.has(localDayKey(today));
  return {
    plan,
    week: { current: weekCurrent, best: Math.max(weekBest, weekCurrent), thisWeek: thisWeekDays, goal, met: metThisWeek },
    food: log,
    /** Planned day, nothing logged yet, and a streak worth protecting. */
    atRisk: todayPlanned && !doneToday && plan.current > 0,
    doneToday,
  };
}

// ── Achievements ───────────────────────────────────────────────────────────

const RUNS = new Set(["run", "trail_run", "treadmill"]);

const MILESTONES = [
  { id: "first", group: "Sessions", title: "First step", desc: "Log your first session", need: 1, metric: "sessions" },
  { id: "s10", group: "Sessions", title: "Ten down", desc: "10 sessions", need: 10, metric: "sessions" },
  { id: "s50", group: "Sessions", title: "Half century", desc: "50 sessions", need: 50, metric: "sessions" },
  { id: "s100", group: "Sessions", title: "Centurion", desc: "100 sessions", need: 100, metric: "sessions" },
  { id: "s250", group: "Sessions", title: "Lifer", desc: "250 sessions", need: 250, metric: "sessions" },
  { id: "w4", group: "Consistency", title: "A month strong", desc: "Hit your weekly goal 4 weeks running", need: 4, metric: "weekStreak" },
  { id: "w12", group: "Consistency", title: "Quarter", desc: "12-week streak", need: 12, metric: "weekStreak" },
  { id: "w26", group: "Consistency", title: "Half a year", desc: "26-week streak", need: 26, metric: "weekStreak" },
  { id: "w52", group: "Consistency", title: "Full circle", desc: "52-week streak", need: 52, metric: "weekStreak" },
  { id: "r5k", group: "Running", title: "5K", desc: "Run 5 km in one go", need: 5, metric: "longestRun" },
  { id: "r10k", group: "Running", title: "10K", desc: "Run 10 km in one go", need: 10, metric: "longestRun" },
  { id: "rhalf", group: "Running", title: "Half marathon", desc: "Run 21.1 km in one go", need: 21.1, metric: "longestRun" },
  { id: "rfull", group: "Running", title: "Marathon", desc: "Run 42.2 km in one go", need: 42.2, metric: "longestRun" },
  { id: "d100", group: "Distance", title: "100 km club", desc: "100 km moved in total", need: 100, metric: "totalKm" },
  { id: "d500", group: "Distance", title: "500 km", desc: "500 km in total", need: 500, metric: "totalKm" },
  { id: "d1000", group: "Distance", title: "1,000 km", desc: "1,000 km in total", need: 1000, metric: "totalKm" },
  { id: "t10", group: "Strength", title: "10 tonnes", desc: "Lift 10,000 kg in total", need: 10000, metric: "tonnage" },
  { id: "t100", group: "Strength", title: "100 tonnes", desc: "Lift 100,000 kg in total", need: 100000, metric: "tonnage" },
  { id: "flow10", group: "Mobility", title: "Supple", desc: "10 yoga or mobility sessions", need: 10, metric: "flows" },
  { id: "early", group: "Fun", title: "Early bird", desc: "Train before 7 am", need: 1, metric: "early" },
  { id: "variety", group: "Fun", title: "All-rounder", desc: "Try 5 different kinds of activity", need: 5, metric: "kinds" },
  { id: "f7", group: "Nutrition", title: "Week of fuel", desc: "Log food 7 days in a row", need: 7, metric: "foodStreak" },
  { id: "f30", group: "Nutrition", title: "Fuel habit", desc: "Log food 30 days in a row", need: 30, metric: "foodStreak" },
];

/**
 * Every badge with progress; `earnedAt` is the date of the session that unlocked it
 * (streak badges use today when first seen — pass `earned` to keep earlier dates).
 */
export function achievements(sessions, { trainingDays = [], weeklyGoal = 3, foodDays = [], earned = {}, now = new Date() } = {}) {
  const sorted = [...sessions].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const m = { sessions: 0, longestRun: 0, totalKm: 0, tonnage: 0, flows: 0, early: 0, kinds: 0, weekStreak: 0, foodStreak: 0 };
  const kinds = new Set();
  const unlockedAt = {};
  const check = (date) => {
    for (const b of MILESTONES) if (!unlockedAt[b.id] && m[b.metric] >= b.need) unlockedAt[b.id] = date;
  };
  for (const s of sorted) {
    m.sessions++;
    if (s.distanceKm) m.totalKm += s.distanceKm;
    if (s.distanceKm && RUNS.has(s.activity ?? s.discipline)) m.longestRun = Math.max(m.longestRun, s.distanceKm);
    if (s.discipline === "run" && s.distanceKm) m.longestRun = Math.max(m.longestRun, s.distanceKm);
    for (const e of s.exercises ?? []) for (const set of e.sets) m.tonnage += (set.weight || 0) * (set.reps || 0);
    if (s.kind === "mobility") m.flows++;
    const start = new Date(s.startedAt ?? s.date);
    if (start.getHours() < 7 && start.getHours() >= 3) m.early = 1;
    kinds.add(s.kind === "strength" ? "strength" : (s.activity ?? s.style ?? s.discipline ?? s.kind));
    m.kinds = kinds.size;
    check(s.date);
  }
  const st = streaks(sessions, { trainingDays, weeklyGoal, foodDays, now });
  m.weekStreak = st.week.best;
  m.foodStreak = st.food.best;
  check(now.toISOString());

  return MILESTONES.map((b) => {
    const at = earned[b.id] ?? unlockedAt[b.id] ?? null;
    return { ...b, earnedAt: at, progress: Math.min(1, m[b.metric] / b.need), value: m[b.metric] };
  });
}
