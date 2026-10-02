/**
 * Endurance session generator: run, bike, swim, HYROX and conditioning.
 *
 * Mostly-easy, some-hard ("polarised") weekly structure. Easy and long sessions
 * stay simple and steady; the hard sessions rotate through formats so no two
 * quality days in a row feel the same — the same idea as strength rotators.
 */

import { createRng, pick, shuffle } from "./random.js";

// ── Zones ─────────────────────────────────────────────────────────────────

export const ZONES = [
  { id: 1, name: "Recovery", hr: [0.5, 0.6], rpe: "2–3", feel: "Very easy — you could do this all day" },
  { id: 2, name: "Easy", hr: [0.6, 0.7], rpe: "3–4", feel: "Conversational — full sentences, nose-breathing possible" },
  { id: 3, name: "Tempo", hr: [0.7, 0.8], rpe: "5–6", feel: "Comfortably hard — short sentences" },
  { id: 4, name: "Threshold", hr: [0.8, 0.9], rpe: "7–8", feel: "Hard — a few words at a time" },
  { id: 5, name: "VO₂ max", hr: [0.9, 1], rpe: "9", feel: "Very hard — no talking" },
];

/** Tanaka formula; null when age is unknown (the UI falls back to feel/RPE). */
export const maxHeartRate = (age) => (age ? Math.round(208 - 0.7 * age) : null);

export function zoneHeartRate(zoneId, age) {
  const max = maxHeartRate(age);
  const zone = ZONES[zoneId - 1];
  if (!max || !zone) return null;
  return [Math.round(zone.hr[0] * max), Math.round(zone.hr[1] * max)];
}

export const DISCIPLINES = {
  run: { label: "Run", verb: "Run" },
  bike: { label: "Ride", verb: "Ride" },
  swim: { label: "Swim", verb: "Swim" },
  hyrox: { label: "HYROX", verb: "HYROX" },
  conditioning: { label: "Conditioning", verb: "Conditioning" },
};

export const SESSION_TYPES = {
  easy: "Easy",
  long: "Long",
  intervals: "Intervals",
  tempo: "Tempo",
  recovery: "Recovery",
  technique: "Technique",
  brick: "Brick",
  compromised: "Compromised running",
  stations: "Station work",
  engine: "Engine",
  metcon: "MetCon",
  sprints: "Repeat sprints",
  rounds: "Fight rounds",
};

const HARD_TYPES = ["intervals", "tempo", "compromised", "stations", "engine", "metcon", "sprints", "rounds"];
export const isHardSession = (type) => HARD_TYPES.includes(type);

const LEVEL_SCALE = { beginner: 0.6, intermediate: 1, advanced: 1.3 };
const scaleReps = (n, level) => Math.max(2, Math.round(n * (LEVEL_SCALE[level] ?? 1)));

// ── Step builders ─────────────────────────────────────────────────────────

const step = (kind, label, seconds, zone, note) => ({ kind, label, seconds: Math.round(seconds), zone, note });
const mins = (m) => m * 60;

function repeat(n, work, rest, label = "Rep") {
  const out = [];
  for (let i = 1; i <= n; i++) {
    out.push(step("work", `${label} ${i}/${n} · ${work.label}`, work.seconds, work.zone, work.note));
    if (rest && i < n) out.push(step("rest", rest.label, rest.seconds, rest.zone));
  }
  return out;
}

const warmup = (minutes = 10) => [
  step("warmup", "Warm-up · build from very easy to easy", mins(minutes - 2), 2),
  step("warmup", "4 × 15 s strides, easy between", mins(2), 3, "Quick, relaxed — not a sprint"),
];
const cooldown = (minutes = 5) => [step("cooldown", "Cool-down · very easy", mins(minutes), 1)];

// ── Interval & tempo formats (run, bike, row, ski, air bike) ─────────────

const INTERVAL_FORMATS = [
  {
    id: "vo2_3min",
    name: "5 × 3 min",
    build: (lv) => repeat(scaleReps(5, lv), { label: "hard", seconds: 180, zone: 5 }, { label: "Easy recovery", seconds: 120, zone: 1 }),
  },
  {
    id: "vo2_2min",
    name: "6 × 2 min",
    build: (lv) => repeat(scaleReps(6, lv), { label: "hard", seconds: 120, zone: 5 }, { label: "Easy recovery", seconds: 120, zone: 1 }),
  },
  {
    id: "minute_on",
    name: "10 × 1 min on / 1 min off",
    build: (lv) => repeat(scaleReps(10, lv), { label: "hard", seconds: 60, zone: 5 }, { label: "Easy", seconds: 60, zone: 1 }),
  },
  {
    id: "norwegian_4x4",
    name: "4 × 4 min",
    build: (lv) => repeat(lv === "beginner" ? 3 : 4, { label: "hard but even", seconds: 240, zone: 4 }, { label: "Easy recovery", seconds: 180, zone: 1 }),
  },
  {
    id: "pyramid",
    name: "Pyramid 1-2-3-2-1",
    build: (lv) => {
      const ladder = lv === "advanced" ? [1, 2, 3, 4, 3, 2, 1] : lv === "beginner" ? [1, 2, 1] : [1, 2, 3, 2, 1];
      return ladder.flatMap((m, i) => [
        step("work", `${m} min hard`, mins(m), 5),
        ...(i < ladder.length - 1 ? [step("rest", "Easy recovery", mins(Math.max(1, m / 2)), 1)] : []),
      ]);
    },
  },
  {
    id: "thirty_thirty",
    name: "30/30s",
    build: (lv) => {
      const sets = lv === "beginner" ? 2 : 3;
      const out = [];
      for (let s = 1; s <= sets; s++) {
        out.push(...repeat(8, { label: "30 s fast", seconds: 30, zone: 5 }, { label: "30 s easy", seconds: 30, zone: 2 }, `Set ${s} ·`));
        if (s < sets) out.push(step("rest", "Set break · easy", mins(3), 1));
      }
      return out;
    },
  },
];

const TEMPO_FORMATS = [
  { id: "steady_tempo", name: "Continuous tempo", build: (lv) => [step("work", "Steady tempo", mins(lv === "beginner" ? 12 : lv === "advanced" ? 30 : 20), 3)] },
  {
    id: "cruise",
    name: "Cruise intervals",
    build: (lv) => repeat(scaleReps(4, lv), { label: "threshold", seconds: 360, zone: 4 }, { label: "Easy jog/spin", seconds: 60, zone: 2 }),
  },
  {
    id: "threshold_2x",
    name: "2 × threshold blocks",
    build: (lv) => repeat(2, { label: "threshold", seconds: mins(lv === "beginner" ? 8 : lv === "advanced" ? 15 : 12), zone: 4 }, { label: "Easy", seconds: 180, zone: 2 }),
  },
  {
    id: "progression",
    name: "Progression",
    build: (lv) => {
      const m = lv === "beginner" ? 6 : lv === "advanced" ? 12 : 9;
      return [step("work", "Easy", mins(m), 2), step("work", "Tempo", mins(m), 3), step("work", "Threshold", mins(m), 4)];
    },
  },
];

const RUN_ONLY = [
  {
    id: "hills",
    name: "Hill repeats",
    type: "intervals",
    build: (lv) => repeat(scaleReps(8, lv), { label: "45 s hard uphill", seconds: 45, zone: 5, note: "Drive knees, short quick steps" }, { label: "Walk/jog back down", seconds: 90, zone: 1 }),
  },
  {
    id: "fartlek",
    name: "Fartlek",
    type: "tempo",
    build: (lv) => repeat(scaleReps(6, lv), { label: "2 min strong", seconds: 120, zone: 4 }, { label: "2 min easy", seconds: 120, zone: 2 }, "Surge"),
  },
];

const BIKE_ONLY = [
  {
    id: "over_unders",
    name: "Over-unders",
    type: "tempo",
    build: (lv) => {
      const sets = lv === "beginner" ? 2 : 3;
      const out = [];
      for (let s = 1; s <= sets; s++) {
        out.push(...repeat(3, { label: "2 min under + 1 min over", seconds: 180, zone: 4 }, null, `Set ${s} ·`));
        if (s < sets) out.push(step("rest", "Easy spin", mins(4), 1));
      }
      return out;
    },
  },
  {
    id: "sweet_spot",
    name: "Sweet spot",
    type: "tempo",
    build: (lv) => repeat(lv === "beginner" ? 2 : 3, { label: "sweet spot", seconds: mins(10), zone: 4, note: "Just below threshold — steady" }, { label: "Easy spin", seconds: 180, zone: 1 }),
  },
  {
    id: "spin_ups",
    name: "Cadence spin-ups",
    type: "intervals",
    build: (lv) => repeat(scaleReps(8, lv), { label: "1 min high cadence (100+ rpm)", seconds: 60, zone: 3 }, { label: "1 min easy", seconds: 60, zone: 2 }),
  },
];

/** Recently used format ids for a discipline, newest first. */
function recentFormats(history, discipline) {
  return [...history]
    .filter((s) => s.kind === "endurance" && s.discipline === discipline && s.format)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((s) => s.format);
}

/** Pick a format avoiding the last few used — rotation for conditioning work. */
function rotate(rng, formats, recent, avoid = 2) {
  const fresh = formats.filter((f) => !recent.slice(0, avoid).includes(f.id));
  return pick(rng, fresh.length ? fresh : formats);
}

// ── HYROX ─────────────────────────────────────────────────────────────────

export const HYROX_STATIONS = [
  { id: "ski", name: "SkiErg", amount: 1000, unit: "m", needs: ["ski_erg"], alt: { name: "Band pulldowns + burpees", amount: 3, unit: "rounds of 20 + 10" } },
  { id: "sled_push", name: "Sled push", amount: 50, unit: "m", needs: ["sled"], alt: { name: "Heavy dumbbell walking lunges", amount: 40, unit: "steps" } },
  { id: "sled_pull", name: "Sled pull", amount: 50, unit: "m", needs: ["sled"], alt: { name: "Heavy dumbbell rows", amount: 3, unit: "sets of 15" } },
  { id: "burpee_broad_jump", name: "Burpee broad jumps", amount: 80, unit: "m", needs: [] },
  { id: "row", name: "Row", amount: 1000, unit: "m", needs: ["rower"], alt: { name: "Air bike or hard run", amount: 4, unit: "min" } },
  { id: "farmers_carry", name: "Farmer's carry", amount: 200, unit: "m", needs: ["kettlebell|dumbbell"], alt: { name: "Loaded backpack carry", amount: 200, unit: "m" } },
  { id: "sandbag_lunges", name: "Sandbag lunges", amount: 100, unit: "m", needs: ["sandbag"], alt: { name: "Dumbbell walking lunges", amount: 100, unit: "m" } },
  { id: "wall_balls", name: "Wall balls", amount: 100, unit: "reps", needs: ["wall_ball"], alt: { name: "Dumbbell thrusters", amount: 75, unit: "reps" } },
];

const HYROX_SCALE = { beginner: 0.5, intermediate: 0.75, advanced: 1 };

const hasNeed = (need, equipment) => need.split("|").some((n) => equipment.includes(n));

/** A station as you'll do it today: the real thing, or its substitute. */
export function stationFor(station, equipment, level) {
  const scale = HYROX_SCALE[level] ?? 0.75;
  const available = station.needs.every((n) => hasNeed(n, equipment));
  const base = available || !station.alt ? station : { ...station, ...station.alt, substituted: station.name };
  const amount = base.unit.startsWith("rounds") || base.unit.startsWith("sets") ? base.amount : Math.round((base.amount * scale) / 5) * 5;
  return { name: base.name, amount, unit: base.unit, substituted: base.substituted };
}

const stationLabel = (s) => `${s.name} · ${s.amount} ${s.unit}${s.substituted ? ` (instead of ${s.substituted})` : ""}`;

// ── Conditioning ──────────────────────────────────────────────────────────

const METCON_MOVES = [
  { name: "Burpees", reps: 10, needs: [] },
  { name: "Air squats", reps: 20, needs: [] },
  { name: "Push-ups", reps: 12, needs: [] },
  { name: "Jumping lunges", reps: 16, needs: [] },
  { name: "Mountain climbers", reps: 30, needs: [] },
  { name: "Sit-ups", reps: 15, needs: [] },
  { name: "Kettlebell swings", reps: 15, needs: ["kettlebell"] },
  { name: "Dumbbell thrusters", reps: 12, needs: ["dumbbell"] },
  { name: "Dumbbell snatches (alt.)", reps: 12, needs: ["dumbbell"] },
  { name: "Jump rope", reps: 60, needs: ["jump_rope"] },
  { name: "Row (calories)", reps: 12, needs: ["rower"] },
  { name: "Air bike (calories)", reps: 10, needs: ["air_bike"] },
  { name: "Wall balls", reps: 15, needs: ["wall_ball"] },
  { name: "Pull-ups", reps: 8, needs: ["pullup_bar"] },
  { name: "Box step-ups", reps: 16, needs: ["bench"] },
];

function metconMoves(rng, equipment, n) {
  const ok = METCON_MOVES.filter((m) => m.needs.every((q) => equipment.includes(q)));
  return shuffle(rng, ok).slice(0, n);
}

// ── Swim ──────────────────────────────────────────────────────────────────

const SWIM_DRILLS = [
  { name: "Catch-up drill", note: "One arm waits out front until the other arrives" },
  { name: "Fingertip drag", note: "High elbow recovery, fingertips skim the water" },
  { name: "Side kick", note: "Lie on your side, one arm extended, breathe easy" },
  { name: "Fist drill", note: "Swim with closed fists to feel your forearm catch" },
  { name: "Kick with board", note: "Kick from the hips, small fast kicks" },
  { name: "Sculling", note: "Hands in front, small figure-eights, feel the water" },
  { name: "6-1-6", note: "6 kicks on side, 1 stroke, 6 kicks on other side" },
];

const SWIM_MAIN = [
  { id: "hundreds", name: "100s", build: (m) => ({ reps: Math.max(3, Math.round(m / 100)), dist: 100, rest: 20, zone: 3 }) },
  { id: "two_hundreds", name: "200s", build: (m) => ({ reps: Math.max(2, Math.round(m / 200)), dist: 200, rest: 30, zone: 3 }) },
  { id: "fast_fifties", name: "Fast 50s", build: (m) => ({ reps: Math.max(4, Math.round(m / 50)), dist: 50, rest: 30, zone: 4 }) },
  { id: "pull_set", name: "Pull buoy 100s", build: (m) => ({ reps: Math.max(3, Math.round(m / 100)), dist: 100, rest: 20, zone: 3, note: "Pull buoy between thighs, focus on the catch" }) },
  { id: "pyramid_swim", name: "Pyramid", pyramid: true },
];

// Pace per 100 m (seconds) to estimate duration.
const SWIM_PACE = { beginner: 150, intermediate: 120, advanced: 100 };

const swimStep = (kind, label, meters, zone, rest = 0, note) => ({ kind, label, meters, rest, zone, note });

function buildSwim({ type, level, minutes, rng, recent }) {
  const pace = SWIM_PACE[level] ?? 120;
  // Roughly 75% of time spent swimming, the rest resting/drills.
  const total = Math.max(400, Math.round(((minutes * 60 * 0.75) / pace) * 100 / 50) * 50);
  const warm = Math.round((total * 0.2) / 50) * 50 || 100;
  const cool = level === "beginner" ? 100 : 200;
  const drillCount = type === "technique" ? 4 : 2;
  const drills = shuffle(rng, SWIM_DRILLS).slice(0, drillCount);
  const drillDist = level === "beginner" ? 25 : 50;
  const drillMeters = drills.length * 2 * drillDist;
  const mainMeters = Math.max(200, total - warm - cool - drillMeters);

  const steps = [swimStep("warmup", "Easy mixed strokes", warm, 2)];
  for (const d of drills) steps.push(swimStep("drill", `2 × ${drillDist} m ${d.name}`, drillDist * 2, 2, 15, d.note));

  let format;
  if (type === "technique" || type === "easy" || type === "recovery") {
    format = { id: "steady_swim", name: "Steady swim" };
    steps.push(swimStep("work", `${mainMeters} m steady, focus on long strokes`, mainMeters, 2));
  } else if (type === "long") {
    format = { id: "long_swim", name: "Long steady" };
    const blocks = Math.max(2, Math.round(mainMeters / 400));
    const each = Math.round(mainMeters / blocks / 50) * 50;
    for (let i = 1; i <= blocks; i++) steps.push(swimStep("work", `Block ${i}/${blocks} · ${each} m steady`, each, 2, 30));
  } else {
    format = rotate(rng, SWIM_MAIN, recent);
    if (format.pyramid) {
      const ladder = level === "beginner" ? [50, 100, 50] : [50, 100, 150, 200, 150, 100, 50];
      for (const d of ladder) steps.push(swimStep("work", `${d} m strong`, d, 3, 20));
    } else {
      const set = format.build(mainMeters);
      for (let i = 1; i <= set.reps; i++) {
        steps.push(swimStep("work", `${i}/${set.reps} · ${set.dist} m ${set.zone >= 4 ? "fast" : "strong"}`, set.dist, set.zone, set.rest, set.note));
      }
    }
  }
  steps.push(swimStep("cooldown", "Easy cool-down", cool, 1));

  const meters = steps.reduce((n, s) => n + s.meters, 0);
  const seconds = steps.reduce((n, s) => n + (s.meters / 100) * pace + s.rest, 0);
  return { steps, format, totalMeters: meters, totalSeconds: Math.round(seconds) };
}

// ── Main entry ────────────────────────────────────────────────────────────

/**
 * @param {object} p
 * @param {"run"|"bike"|"swim"|"hyrox"|"conditioning"} p.discipline
 * @param {string} p.type  key of SESSION_TYPES
 * @param {string} p.level
 * @param {number} p.minutes target duration
 * @param {number} [p.blockWeek] week within the training block (run/walk progression)
 * @param {string[]} [p.equipment]
 * @param {object[]} [p.history] logged sessions (for format rotation)
 * @param {string} [p.style] conditioning flavour: "metcon" | "sprints" | "rounds"
 */
export function generateEnduranceSession({
  discipline,
  type,
  level = "beginner",
  minutes = 45,
  blockWeek = 1,
  equipment = [],
  history = [],
  seed = "endurance",
}) {
  const rng = createRng(`${seed}:${discipline}:${type}`);
  const recent = recentFormats(history, discipline);
  const title = `${SESSION_TYPES[type] ?? type} ${DISCIPLINES[discipline]?.label.toLowerCase() ?? discipline}`;

  if (discipline === "swim") {
    const swim = buildSwim({ type, level, minutes, rng, recent });
    return {
      kind: "endurance",
      discipline,
      type,
      format: swim.format.id,
      title: type === "intervals" ? `Swim · ${swim.format.name}` : `${SESSION_TYPES[type]} swim`,
      summary: `${swim.totalMeters} m · ~${Math.round(swim.totalSeconds / 60)} min`,
      steps: swim.steps,
      totalSeconds: swim.totalSeconds,
      totalMeters: swim.totalMeters,
      why: whyFor(type, discipline),
    };
  }

  let steps = [];
  let format = { id: type, name: SESSION_TYPES[type] };

  const fillSteady = (zone, label) => {
    const used = steps.reduce((n, s) => n + s.seconds, 0);
    const left = Math.max(mins(10), mins(minutes) - used - mins(5));
    return step("steady", label, left, zone);
  };

  if (discipline === "hyrox") {
    if (type === "compromised") {
      const rounds = level === "beginner" ? 3 : level === "advanced" ? 6 : 4;
      const runM = level === "beginner" ? 500 : 1000;
      const stations = shuffle(rng, HYROX_STATIONS).slice(0, rounds);
      format = { id: `compromised_${stations.map((s) => s.id).join("_")}`, name: "Compromised running" };
      steps = [...warmup(10)];
      stations.forEach((st, i) => {
        steps.push(step("work", `Round ${i + 1}/${rounds} · Run ${runM} m`, (runM / 1000) * 300, 4, "Race pace you could hold for the whole race"));
        steps.push(step("station", stationLabel(stationFor(st, equipment, level)), 240, 4));
      });
      steps.push(...cooldown(5));
    } else if (type === "stations") {
      const picked = shuffle(rng, HYROX_STATIONS).slice(0, 4);
      const rounds = level === "beginner" ? 2 : 3;
      format = { id: `stations_${picked.map((s) => s.id).join("_")}`, name: "Station circuit" };
      steps = [...warmup(8)];
      for (let r = 1; r <= rounds; r++) {
        for (const st of picked) steps.push(step("station", `Round ${r}/${rounds} · ${stationLabel(stationFor(st, equipment, level))}`, 180, 4));
        if (r < rounds) steps.push(step("rest", "Rest", 120, 1));
      }
      steps.push(...cooldown(5));
    } else {
      // Engine: machine intervals on whatever is available.
      const machine = ["rower", "ski_erg", "air_bike"].find((m) => equipment.includes(m));
      const fmt = rotate(rng, INTERVAL_FORMATS, recent);
      format = { id: fmt.id, name: `${machine ? { rower: "Row", ski_erg: "Ski", air_bike: "Air bike" }[machine] : "Run"} · ${fmt.name}` };
      steps = [...warmup(8), ...fmt.build(level), ...cooldown(5)];
    }
  } else if (discipline === "conditioning") {
    const style = type === "sprints" || type === "rounds" ? type : "metcon";
    if (style === "sprints") {
      const reps = scaleReps(10, level);
      format = { id: "repeat_sprints", name: `${reps} × 15 s sprints` };
      steps = [...warmup(10), ...repeat(reps, { label: "15 s all-out sprint", seconds: 15, zone: 5 }, { label: "45 s walk", seconds: 45, zone: 1 }), ...cooldown(5)];
    } else if (style === "rounds") {
      const rounds = level === "beginner" ? 3 : 5;
      const moves = metconMoves(rng, equipment, 3);
      format = { id: "fight_rounds", name: `${rounds} × 3 min rounds` };
      steps = [...warmup(8)];
      for (let r = 1; r <= rounds; r++) {
        steps.push(step("work", `Round ${r}/${rounds} · 1 min shadow boxing, then ${moves.map((m) => m.name.toLowerCase()).join(", ")}`, 180, 4));
        if (r < rounds) steps.push(step("rest", "Rest — breathe through your nose", 60, 1));
      }
      steps.push(...cooldown(5));
    } else {
      const moves = metconMoves(rng, equipment, 4);
      const kind = pick(rng, ["amrap", "emom"]);
      const len = level === "beginner" ? 12 : level === "advanced" ? 20 : 16;
      if (kind === "amrap") {
        format = { id: "amrap", name: `${len}-min AMRAP` };
        steps = [...warmup(8), step("work", `AMRAP ${len} min: ${moves.map((m) => `${scaleReps(m.reps, level)} ${m.name.toLowerCase()}`).join(" · ")}`, mins(len), 4, "As many rounds as possible, steady pace"), ...cooldown(5)];
      } else {
        format = { id: "emom", name: `${len}-min EMOM` };
        steps = [...warmup(8)];
        for (let i = 0; i < len; i++) {
          const m = moves[i % moves.length];
          steps.push(step("work", `Minute ${i + 1}/${len} · ${scaleReps(m.reps, level)} ${m.name.toLowerCase()}`, 60, 4, "Rest for what's left of the minute"));
        }
        steps.push(...cooldown(5));
      }
    }
  } else {
    // Run & bike.
    const beginnerRun = discipline === "run" && level === "beginner";
    if (type === "easy" || type === "recovery") {
      if (beginnerRun && type === "easy") {
        // Run/walk that progresses through the block.
        const plans = [[1, 2], [2, 2], [3, 1.5], [4, 1], [5, 1]];
        const [run, walk] = plans[Math.min(plans.length - 1, blockWeek - 1)];
        const reps = Math.max(4, Math.floor((minutes - 10) / (run + walk)));
        format = { id: `run_walk_${run}_${walk}`, name: `Run ${run} min / walk ${walk} min` };
        steps = [step("warmup", "Brisk walk", mins(5), 1), ...repeat(reps, { label: `run ${run} min`, seconds: mins(run), zone: 2 }, { label: `Walk ${walk} min`, seconds: mins(walk), zone: 1 }), ...cooldown(5)];
      } else {
        steps = [step("warmup", "Start very easy", mins(5), 1)];
        steps.push(fillSteady(type === "recovery" ? 1 : 2, type === "recovery" ? "Very easy" : "Easy, conversational"));
        steps.push(...cooldown(5));
      }
    } else if (type === "long") {
      const fastFinish = level !== "beginner" && rng() < 0.4;
      format = { id: fastFinish ? "long_fast_finish" : "long_steady", name: fastFinish ? "Long with fast finish" : "Long steady" };
      steps = [step("warmup", "Start very easy", mins(5), 1)];
      if (fastFinish) {
        steps.push(step("steady", "Easy, conversational", mins(minutes - 20), 2));
        steps.push(step("work", "Fast finish · tempo", mins(10), 3));
      } else {
        steps.push(fillSteady(2, "Easy, conversational — stay patient"));
      }
      steps.push(...cooldown(5));
    } else if (type === "brick") {
      const bikeMin = Math.round(minutes * 0.65);
      format = { id: "brick", name: "Bike → run" };
      steps = [
        step("warmup", "Easy spin", mins(10), 1),
        step("steady", "Ride steady", mins(bikeMin - 10), 2),
        step("rest", "Quick change to run shoes", 120, 1),
        step("work", "Run off the bike · settle into rhythm", mins(Math.max(10, minutes - bikeMin)), 3, "Legs feel heavy at first — that's the point"),
      ];
    } else {
      const pool = type === "intervals" ? INTERVAL_FORMATS : TEMPO_FORMATS;
      const extras = (discipline === "run" ? RUN_ONLY : BIKE_ONLY).filter((f) => f.type === type);
      const fmt = rotate(rng, [...pool, ...extras], recent);
      format = fmt;
      steps = [...warmup(10), ...fmt.build(level), ...cooldown(discipline === "bike" ? 10 : 5)];
    }
  }

  const totalSeconds = steps.reduce((n, s) => n + s.seconds, 0);
  return {
    kind: "endurance",
    discipline,
    type,
    format: format.id,
    title: HARD_TYPES.includes(type) && format.name ? `${DISCIPLINES[discipline].label} · ${format.name}` : title.charAt(0).toUpperCase() + title.slice(1),
    summary: `~${Math.round(totalSeconds / 60)} min`,
    steps,
    totalSeconds,
    why: whyFor(type, discipline),
  };
}

function whyFor(type, discipline) {
  const map = {
    easy: "Easy aerobic work builds your engine with little fatigue. Most of your weekly volume should feel like this.",
    recovery: "Very easy movement to help you recover from harder days.",
    long: "Your longest session of the week — builds endurance and fat-burning capacity. Keep it easy.",
    intervals: "Short, hard efforts raise your VO₂ max. Hard sessions rotate formats so your body keeps adapting.",
    tempo: "Sustained 'comfortably hard' work raises the pace you can hold for a long time.",
    technique: "Drill-heavy session — better technique is free speed in the water.",
    brick: "Bike straight into a run teaches your legs to switch, just like race day.",
    compromised: "Running on tired legs after stations — the defining skill of HYROX.",
    stations: "Station strength-endurance so the sleds, lunges and wall balls don't break you.",
    engine: "Machine intervals to build the aerobic engine HYROX demands.",
    metcon: "Mixed conditioning — a new combination every time.",
    sprints: "Repeat sprints build the speed and recovery your sport needs.",
    rounds: "Fight-style rounds: work hard, recover fast.",
  };
  return map[type] ?? `${DISCIPLINES[discipline]?.label} session.`;
}
