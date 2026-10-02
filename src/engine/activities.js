/**
 * Every kind of training someone might do, beyond the lifting library.
 *
 *  - record:  "gps" (route + distance), "laps" (pool), "time" (timer only)
 *  - discipline: endurance discipline with generated sessions, if any
 *  - flow: flow style for guided mobility/yoga/pilates
 *  - warmup / cooldown: body areas the flows should target
 *  - drills: activity-specific warm-up drills done after the flow
 */

const a = (id, name, category, o) => ({
  id,
  name,
  category,
  record: o.record ?? "time",
  met: o.met ?? 6,
  discipline: o.discipline,
  flow: o.flow,
  warmup: o.warmup ?? ["full", "hips"],
  cooldown: o.cooldown ?? ["hips", "hamstrings"],
  drills: o.drills ?? [],
  tips: o.tips ?? [],
  technique: o.technique ?? [],
  mistakes: o.mistakes ?? [],
  safety: o.safety ?? [],
  maxSpeed: o.maxSpeed, // m/s, used to reject GPS glitches
});

export const ACTIVITY_CATEGORIES = {
  cardio: "Run, ride & swim",
  outdoor: "Outdoors",
  conditioning: "Conditioning",
  mind_body: "Yoga & mobility",
  sport: "Sports",
};

export const ACTIVITIES = [
  a("run", "Run", "cardio", {
    record: "gps",
    met: 9.8,
    discipline: "run",
    maxSpeed: 9,
    warmup: ["calves", "hamstrings", "hips", "quads"],
    cooldown: ["calves", "hamstrings", "quads", "hips"],
    drills: ["5 min brisk walk or very easy jog", "2 × 20 m A-skips", "2 × 20 m butt kicks", "4 × 15 s strides, building to quick but relaxed"],
    tips: [
      "Most runs should feel easy enough to talk in full sentences — speed comes from the few hard days.",
      "Grow weekly distance by about 10% at most, with an easier week every 4–5 weeks.",
      "Short, quick steps (around 170–180 per minute) land you under your hips and spare your knees.",
      "Run by effort on hills and in heat; pace will drop and that's fine.",
      "Replace shoes every 600–800 km.",
    ],
    technique: ["Tall posture, slight lean from the ankles", "Relaxed shoulders, arms swing forward-back not across", "Land softly under your body, not out in front"],
    mistakes: ["Running every run at the same medium-hard pace", "Big jumps in mileage after a good week", "Overstriding — heel slamming far in front of you"],
    safety: ["Sharp or worsening pain that changes your stride means stop and rest it.", "Be visible on roads at night; run against traffic."],
  }),
  a("trail_run", "Trail run", "outdoor", {
    record: "gps",
    met: 10,
    discipline: "run",
    maxSpeed: 8,
    warmup: ["calves", "hips", "quads"],
    cooldown: ["calves", "quads", "glutes"],
    drills: ["5 min easy jog", "Lateral shuffles 2 × 20 m", "Ankle hops 2 × 15"],
    tips: ["Run by effort, not pace — hills and roots slow everyone down.", "Power-hike steep climbs; it's often faster and saves your legs.", "Look 3–4 steps ahead, not at your feet."],
    technique: ["Short steps downhill, arms out for balance", "Lean into climbs, drive with your arms"],
    mistakes: ["Braking hard on descents with straight legs"],
    safety: ["Tell someone your route. Carry water and a phone."],
  }),
  a("walk", "Walk", "outdoor", {
    record: "gps",
    met: 3.5,
    maxSpeed: 4,
    warmup: ["calves", "hips"],
    tips: ["Brisk walking — slightly out of breath — counts as real cardio.", "8,000–10,000 steps a day is a great baseline for health and fat loss.", "Walk after meals to help blood sugar."],
    technique: ["Push off through your toes, swing your arms"],
  }),
  a("hike", "Hike", "outdoor", {
    record: "gps",
    met: 6,
    maxSpeed: 4,
    warmup: ["calves", "hips", "quads"],
    cooldown: ["calves", "quads", "hamstrings"],
    tips: ["Start slower than you think on climbs — keep your breathing steady.", "Poles save your knees on long descents.", "Pack water, snacks, a layer and a head torch."],
    safety: ["Check the weather and tell someone your route."],
  }),
  a("ride", "Ride", "cardio", {
    record: "gps",
    met: 7.5,
    discipline: "bike",
    maxSpeed: 25,
    warmup: ["hips", "quads"],
    cooldown: ["hips", "quads", "thoracic", "lower_back"],
    drills: ["10 min easy spinning", "3 × 30 s high cadence (100+ rpm)"],
    tips: [
      "Saddle height: knee slightly bent at the bottom of the pedal stroke.",
      "Spin at 80–95 rpm; grinding big gears tires your legs fast.",
      "Eat and drink every 30–45 minutes on rides over 90 minutes.",
    ],
    technique: ["Relaxed grip, elbows soft", "Pedal in circles — pull through the bottom"],
    mistakes: ["Starting too hard on climbs", "Riding with the saddle too low"],
    safety: ["Helmet always. Lights front and rear in low light."],
  }),
  a("indoor_ride", "Indoor ride", "cardio", {
    met: 7,
    discipline: "bike",
    warmup: ["hips", "quads"],
    cooldown: ["hips", "quads", "lower_back"],
    tips: ["Use a fan — indoor rides get hot fast.", "Structured intervals work brilliantly indoors."],
  }),
  a("swim_pool", "Pool swim", "cardio", {
    record: "laps",
    met: 7,
    discipline: "swim",
    warmup: ["shoulders", "lats", "thoracic"],
    cooldown: ["shoulders", "lats", "chest"],
    drills: ["Arm circles and band pull-aparts on deck", "100–200 m easy mixed strokes"],
    tips: [
      "Exhale steadily underwater so you only need to inhale when you turn to breathe.",
      "Technique beats fitness in the water — drills are worth the time.",
      "Breathe every 3 strokes to stay balanced, every 2 when working hard.",
    ],
    technique: ["Head neutral, eyes down", "Reach long, then catch with a high elbow", "Kick from the hips, small and fast"],
    mistakes: ["Lifting your head to breathe (your hips sink)", "Crossing the centre line with your hands"],
    safety: ["Never swim alone in open water."],
  }),
  a("swim_open", "Open-water swim", "outdoor", {
    record: "gps",
    met: 8,
    discipline: "swim",
    maxSpeed: 3,
    warmup: ["shoulders", "lats", "thoracic"],
    cooldown: ["shoulders", "lats"],
    tips: ["Sight forward every 6–10 strokes.", "A bright cap and tow float make you visible."],
    safety: ["Never swim alone. Know the water temperature and currents."],
  }),
  a("row", "Row", "conditioning", {
    met: 7,
    warmup: ["hips", "hamstrings", "thoracic"],
    cooldown: ["hamstrings", "lower_back", "lats"],
    tips: ["Power comes from the legs: legs, then lean back, then arms — reverse on the way in.", "Damper 4–6 feels most like a real boat; higher isn't harder training."],
    technique: ["Flat back, chest proud at the catch", "Handle travels in a straight line"],
    mistakes: ["Pulling with the arms first", "Bending the knees before the handle passes them on the return"],
  }),
  a("hiit", "HIIT / conditioning", "conditioning", {
    met: 8,
    discipline: "conditioning",
    tips: ["Hard means hard — work intervals should leave you unable to chat.", "Two HIIT sessions a week is plenty alongside lifting."],
    safety: ["Gentle mode? Keep it moderate — skip all-out efforts."],
  }),
  a("hyrox", "HYROX", "conditioning", {
    met: 9,
    discipline: "hyrox",
    warmup: ["hips", "quads", "shoulders", "calves"],
    cooldown: ["quads", "hips", "shoulders"],
    tips: [
      "Race = 8 × 1 km run, each followed by a station: SkiErg, sled push, sled pull, burpee broad jumps, row, farmer's carry, sandbag lunges, wall balls.",
      "Pace the first runs slower than feels right — everyone fades at the wall balls.",
      "Practise running on tired legs (compromised running).",
    ],
  }),
  a("yoga", "Yoga", "mind_body", { met: 2.8, flow: "yoga", tips: ["Breathe slowly through the nose; never force a pose.", "Consistency beats intensity — 15 minutes most days works."] }),
  a("pilates", "Pilates", "mind_body", { met: 3, flow: "pilates", tips: ["Quality over quantity: slow, controlled reps.", "Keep breathing — exhale on the effort."] }),
  a("mobility", "Mobility", "mind_body", { met: 2.5, flow: "mobility", tips: ["Little and often: 10 minutes a day beats an hour once a week."] }),
  a("breathwork", "Breathwork", "mind_body", { met: 1.5, flow: "recovery", tips: ["Long exhales calm your nervous system — try in for 4, out for 6."] }),
  a("football", "Football", "sport", { met: 7, warmup: ["hips", "adductors", "hamstrings", "calves"], cooldown: ["hamstrings", "adductors", "hips"], drills: ["Jog with direction changes", "Leg swings", "4 × 20 m build-up sprints"], tips: ["Do Nordic curls and adductor work twice a week — the best-proven injury prevention."] }),
  a("cricket", "Cricket", "sport", { met: 5, warmup: ["shoulders", "thoracic", "hips"], cooldown: ["shoulders", "lower_back"], tips: ["Fast bowlers: build workload gradually; count overs per week."] }),
  a("basketball", "Basketball", "sport", { met: 7, warmup: ["calves", "hips", "quads"], drills: ["Ankle hops", "Defensive slides"], tips: ["Land softly with knees tracking over toes."] }),
  a("tennis", "Tennis / padel", "sport", { met: 7, warmup: ["shoulders", "thoracic", "hips"], cooldown: ["shoulders", "wrists", "hips"], tips: ["Warm the shoulder up gradually before serving."] }),
  a("badminton", "Badminton", "sport", { met: 5.5, warmup: ["shoulders", "calves", "hips"], tips: ["Lunges are the main movement — train them."] }),
  a("martial_arts", "Boxing / martial arts", "sport", { met: 9, warmup: ["shoulders", "hips", "full"], cooldown: ["shoulders", "hips", "neck"], tips: ["Rounds of 3 minutes with 1 minute rest build fight fitness.", "Wrap your hands for bag work."] }),
  a("climbing", "Climbing", "sport", { met: 7.5, warmup: ["shoulders", "wrists", "lats", "hips"], cooldown: ["wrists", "shoulders", "lats"], tips: ["Warm up fingers on big holds before small ones.", "Climb with your legs; straight arms save energy."] }),
  a("dance", "Dance", "sport", { met: 5.5, warmup: ["full", "hips"], tips: ["Great cardio that doesn't feel like it."] }),
  a("jump_rope", "Jump rope", "conditioning", { met: 11, warmup: ["calves", "full"], cooldown: ["calves"], tips: ["Small bounces off the balls of your feet; turn the rope with your wrists."] }),
];

export const ACTIVITY_BY_ID = Object.fromEntries(ACTIVITIES.map((x) => [x.id, x]));

/** Default activity to record for an endurance discipline. */
export const DISCIPLINE_ACTIVITY = { run: "run", bike: "ride", swim: "swim_pool", hyrox: "hyrox", conditioning: "hiit" };

// ── Session types per activity ────────────────────────────────────────────

const t = (id, label, hint, zone) => ({ id, label, hint, zone });
const RUN_TYPES = [
  t("easy", "Easy", "Conversational pace — most of your running should feel like this.", 2),
  t("long", "Long", "Your longest run of the week, kept easy. Bring water if over 60 min.", 2),
  t("tempo", "Tempo", "Comfortably hard: you can speak in short sentences. Warm up first.", 3),
  t("intervals", "Intervals", "Hard repeats with easy recovery between. Warm up 10 min, cool down after.", 5),
  t("recovery", "Recovery", "Very easy and short — slower than feels necessary.", 1),
  t("race", "Race / time trial", "All-out effort. Start controlled, finish strong.", 4),
];
const SPORT_TYPES = [
  t("training", "Training", "Drills and practice — warm up properly first."),
  t("match", "Match / game", "Competitive play. Hydrate before and during."),
  t("casual", "Casual", "Just playing for fun."),
];

export const ACTIVITY_TYPES = {
  run: RUN_TYPES,
  trail_run: RUN_TYPES,
  walk: [t("casual", "Casual", "An easy stroll — great for recovery and steps."), t("brisk", "Brisk", "Slightly out of breath — real cardio."), t("hike_walk", "Hilly", "Choose routes with climbs to work harder.")],
  hike: [t("easy", "Easy", "Mostly flat, steady pace."), t("moderate", "Moderate", "Some climbs — keep breathing steady."), t("hard", "Hard", "Steep and long — pace yourself, eat and drink.")],
  ride: [t("easy", "Easy", "Relaxed spin, zone 2.", 2), t("long", "Long", "Steady endurance; eat every 30–45 min after the first hour.", 2), t("tempo", "Tempo", "Sustained effort just below threshold.", 3), t("intervals", "Intervals", "Hard efforts with easy spinning between.", 5), t("commute", "Commute", "Getting from A to B — still counts.")],
  indoor_ride: [t("easy", "Easy", "Relaxed spin, zone 2.", 2), t("intervals", "Intervals", "Structured efforts — great indoors.", 5)],
  swim_pool: [t("technique", "Technique", "Drill-heavy, easy effort."), t("endurance", "Endurance", "Steady continuous swimming."), t("intervals", "Intervals", "Fast repeats with rest between.")],
  swim_open: [t("endurance", "Endurance", "Steady swimming; sight every 6–10 strokes."), t("race", "Race", "Race-pace effort.")],
};

export const typesFor = (activityId) => ACTIVITY_TYPES[activityId] ?? (ACTIVITY_BY_ID[activityId]?.category === "sport" ? SPORT_TYPES : []);

/** Activities whose type can be worked out after the session. */
export const CLASSIFIABLE = ["run", "trail_run", "ride", "walk", "hike"];

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};

/**
 * Label a finished session.
 * Signals in order of trust: heart rate (with age) → effort (RPE) → pace vs your usual.
 * Uneven km splits mean intervals; unusually long + easy means a long run/ride.
 * @returns {{ type: string, reason: string }}
 */
export function classifyActivity({ activity, distanceKm = 0, movingSeconds = 0, paceSecPerKm = null, splits = [], elevationGain = 0, avgHr, age, rpe, history = [] }) {
  if (activity === "walk") {
    const speed = movingSeconds ? distanceKm / (movingSeconds / 3600) : 0;
    if (distanceKm && elevationGain / distanceKm > 40) return { type: "hike_walk", reason: "Plenty of climbing." };
    return speed >= 5.5 ? { type: "brisk", reason: `${speed.toFixed(1)} km/h is a brisk pace.` } : { type: "casual", reason: `${speed.toFixed(1)} km/h — an easy walk.` };
  }
  if (activity === "hike") {
    const perKm = distanceKm ? elevationGain / distanceKm : 0;
    if (perKm > 80 || movingSeconds > 4 * 3600) return { type: "hard", reason: `${Math.round(perKm)} m of climbing per km.` };
    if (perKm > 30 || movingSeconds > 2 * 3600) return { type: "moderate", reason: `${Math.round(perKm)} m of climbing per km.` };
    return { type: "easy", reason: "Mostly flat." };
  }

  const ride = activity === "ride";
  const past = history.filter((s) => s.activity === activity && s.movingSeconds);
  const usualPace = median(past.filter((s) => s.paceSecPerKm && ["easy", "long", undefined].includes(s.type)).map((s) => s.paceSecPerKm));
  const usualTime = median(past.map((s) => s.movingSeconds));

  // Intervals: km splits that swing a lot.
  if (splits.length >= 3) {
    const xs = splits.map((s) => s.seconds);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cv = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length) / mean;
    if (cv > 0.12) return { type: "intervals", reason: "Your km splits varied a lot — fast and easy sections." };
  }

  let intensity = null; // 1 very easy … 5 very hard
  let why = "";
  if (avgHr && age) {
    const pct = avgHr / (208 - 0.7 * age);
    intensity = pct < 0.6 ? 1 : pct < 0.72 ? 2 : pct < 0.82 ? 3 : pct < 0.9 ? 4 : 5;
    why = `Average heart rate ${avgHr} bpm (${Math.round(pct * 100)}% of max).`;
  } else if (rpe) {
    intensity = rpe <= 3 ? 1 : rpe <= 5 ? 2 : rpe <= 6 ? 3 : rpe <= 8 ? 4 : 5;
    why = `You rated it ${rpe}/10.`;
  } else if (usualPace && paceSecPerKm) {
    const diff = (usualPace - paceSecPerKm) / usualPace; // positive = faster than usual
    intensity = diff > 0.12 ? 4 : diff > 0.05 ? 3 : diff < -0.1 ? 1 : 2;
    why = `${Math.abs(Math.round(diff * 100))}% ${diff >= 0 ? "faster" : "slower"} than your usual pace.`;
  }

  const longCut = ride ? 150 * 60 : 75 * 60;
  const isLong = movingSeconds >= longCut || (usualTime && movingSeconds >= usualTime * 1.5 && movingSeconds >= (ride ? 90 : 45) * 60);
  if (isLong && (intensity == null || intensity <= 2)) return { type: "long", reason: `${Math.round(movingSeconds / 60)} minutes — longer than usual.` };
  if (intensity == null) return { type: "easy", reason: "Add heart rate or effort next time for a sharper label." };
  if (intensity >= 5 && !ride && distanceKm <= 10) return { type: "race", reason: why };
  if (intensity >= 4) return { type: "tempo", reason: why };
  if (intensity === 3) return { type: "tempo", reason: why };
  if (intensity === 1) return { type: "recovery", reason: why };
  return { type: "easy", reason: why };
}
