/**
 * Mobility, yoga and pilates: a move library and a flow builder.
 *
 * Flows target the areas you trained (or will train), rotate moves between
 * sessions, and respect health constraints:
 *  - flexion: forward bending / twisting of the spine (skipped with low bone density, pregnancy, postpartum)
 *  - supine/prone: lying on your back/front (skipped in pregnancy)
 *  - joints: loads a joint (skipped when that joint is flagged)
 */

import { createRng } from "./random.js";

export const AREAS = {
  hips: "Hips",
  hamstrings: "Hamstrings",
  quads: "Quads",
  glutes: "Glutes",
  adductors: "Inner thighs",
  calves: "Calves & ankles",
  thoracic: "Upper back",
  lower_back: "Lower back",
  shoulders: "Shoulders",
  chest: "Chest",
  lats: "Lats",
  neck: "Neck",
  wrists: "Wrists",
  core: "Core",
  full: "Full body",
  breath: "Breath",
};

const mv = (id, name, style, areas, seconds, o = {}) => ({
  id,
  name,
  style,
  areas,
  seconds,
  perSide: o.side ?? false,
  flexion: o.flex ?? false,
  supine: o.supine ?? false,
  prone: o.prone ?? false,
  joints: o.joints ?? [],
  level: o.level ?? "beginner",
  cue: o.cue ?? "",
});

export const MOVES = [
  // Dynamic (warm-ups)
  mv("jumping_jacks", "Jumping jacks", "dynamic", ["full"], 45, { cue: "Light and springy — raise your temperature." }),
  mv("arm_circles", "Arm circles", "dynamic", ["shoulders"], 30, { cue: "Small to big, forwards then backwards." }),
  mv("leg_swings_front", "Front leg swings", "dynamic", ["hips", "hamstrings"], 30, { side: true, cue: "Hold something, swing loose and tall." }),
  mv("leg_swings_side", "Side leg swings", "dynamic", ["adductors", "hips"], 30, { side: true, cue: "Swing across your body and out." }),
  mv("hip_circles", "Hip circles", "dynamic", ["hips"], 30, { cue: "Hands on hips, big slow circles both ways." }),
  mv("walking_knee_hugs", "Walking knee hugs", "dynamic", ["glutes", "hips"], 30, { cue: "Pull knee to chest, rise onto your toes." }),
  mv("worlds_greatest_stretch", "World's greatest stretch", "dynamic", ["hips", "thoracic", "hamstrings"], 45, { side: true, cue: "Lunge, elbow to instep, rotate and reach up." }),
  mv("lunge_reach", "Lunge with overhead reach", "dynamic", ["hips", "quads", "thoracic"], 40, { side: true, cue: "Squeeze the back glute, reach tall." }),
  mv("deep_squat_pry", "Deep squat pry", "dynamic", ["hips", "adductors", "calves"], 45, { cue: "Sit deep, elbows push knees out, shift side to side." }),
  mv("ankle_rocks", "Knee-to-wall ankle rocks", "dynamic", ["calves"], 30, { side: true, cue: "Heel down, drive the knee over the toes." }),
  mv("scap_push_ups", "Scapular push-ups", "dynamic", ["shoulders", "thoracic"], 30, { joints: ["wrist"], cue: "Arms straight, let the chest sink then push away." }),
  mv("wall_slides", "Wall slides", "dynamic", ["shoulders", "thoracic"], 40, { cue: "Back flat on the wall, slide arms up in a Y." }),
  mv("cat_cow", "Cat–cow", "dynamic", ["thoracic", "lower_back"], 45, { flex: true, joints: ["wrist"], cue: "Move one vertebra at a time with your breath." }),
  mv("open_books", "Open books", "dynamic", ["thoracic", "chest"], 30, { side: true, flex: true, cue: "Lie on your side, open the top arm like a book." }),
  mv("inchworms", "Inchworms", "dynamic", ["hamstrings", "shoulders", "core"], 45, { flex: true, joints: ["wrist"], cue: "Walk hands out to a plank and back." }),
  mv("glute_bridge_pulses", "Glute bridges", "dynamic", ["glutes"], 30, { supine: true, cue: "Squeeze at the top, ribs down." }),
  mv("high_knees", "High knees", "dynamic", ["full", "hips"], 30, { cue: "Quick feet, drive the knees." }),

  // Static (cool-downs)
  mv("couch_stretch", "Couch stretch", "static", ["quads", "hips"], 60, { side: true, joints: ["knee"], cue: "Back knee against a wall, squeeze the glute." }),
  mv("kneeling_hip_flexor", "Kneeling hip flexor stretch", "static", ["hips", "quads"], 45, { side: true, cue: "Tuck your pelvis, lean gently forward." }),
  mv("pigeon", "Pigeon", "static", ["glutes", "hips"], 60, { side: true, cue: "Square your hips, breathe into the stretch." }),
  mv("figure_four", "Figure-four stretch", "static", ["glutes"], 45, { side: true, supine: true, cue: "Ankle over knee, pull the thigh toward you." }),
  mv("standing_hamstring_hinge", "Standing hamstring hinge", "static", ["hamstrings"], 45, { side: true, cue: "Heel forward, hinge with a flat back." }),
  mv("strap_hamstring", "Lying hamstring stretch", "static", ["hamstrings"], 45, { side: true, supine: true, cue: "Towel around the foot, leg straight up." }),
  mv("butterfly", "Butterfly", "static", ["adductors"], 60, { cue: "Soles together, sit tall, knees fall open." }),
  mv("frog", "Frog stretch", "static", ["adductors", "hips"], 60, { prone: true, joints: ["knee"], level: "intermediate", cue: "Knees wide, rock hips back slowly." }),
  mv("calf_wall", "Calf stretch on wall", "static", ["calves"], 45, { side: true, cue: "Back heel down, leg straight." }),
  mv("doorway_chest", "Doorway chest stretch", "static", ["chest", "shoulders"], 45, { side: true, cue: "Forearm on the frame, step through gently." }),
  mv("cross_body_shoulder", "Cross-body shoulder stretch", "static", ["shoulders"], 30, { side: true, cue: "Pull the arm across, shoulder down." }),
  mv("bench_lat_stretch", "Kneeling lat stretch", "static", ["lats", "thoracic"], 45, { cue: "Elbows on a bench, sink your chest down." }),
  mv("overhead_triceps", "Overhead triceps stretch", "static", ["shoulders"], 30, { side: true, cue: "Hand down your back, gently press the elbow." }),
  mv("neck_side", "Neck side stretch", "static", ["neck"], 30, { side: true, cue: "Ear toward shoulder, opposite shoulder down." }),
  mv("wrist_stretch", "Wrist flexor stretch", "static", ["wrists"], 30, { side: true, cue: "Arm straight, gently pull the fingers back." }),
  mv("supine_twist", "Supine twist", "static", ["lower_back", "glutes"], 45, { side: true, flex: true, supine: true, cue: "Knees fall to one side, look the other way." }),

  // Yoga
  mv("mountain", "Mountain pose", "yoga", ["breath"], 30, { cue: "Stand tall, feet grounded, slow breaths." }),
  mv("sun_salutation", "Sun salutation", "yoga", ["full", "hamstrings", "shoulders"], 90, { flex: true, joints: ["wrist"], cue: "Reach, fold, plank, cobra, down dog — flow with breath." }),
  mv("down_dog", "Downward dog", "yoga", ["hamstrings", "calves", "shoulders"], 45, { joints: ["wrist"], cue: "Hips high, pedal the heels." }),
  mv("warrior_1", "Warrior I", "yoga", ["hips", "quads"], 40, { side: true, cue: "Back heel down, hips forward, arms up." }),
  mv("warrior_2", "Warrior II", "yoga", ["hips", "adductors", "shoulders"], 40, { side: true, cue: "Front knee over ankle, arms long." }),
  mv("triangle", "Triangle", "yoga", ["hamstrings", "adductors", "thoracic"], 40, { side: true, cue: "Long side body, hand to shin." }),
  mv("tree", "Tree pose", "yoga", ["hips", "core"], 40, { side: true, cue: "Foot to calf or thigh — never the knee." }),
  mv("chair", "Chair pose", "yoga", ["quads", "glutes"], 30, { cue: "Sit back, arms up, weight in the heels." }),
  mv("low_lunge", "Low lunge", "yoga", ["hips", "quads"], 45, { side: true, joints: ["knee"], cue: "Back knee down, sink the hips." }),
  mv("cobra", "Cobra", "yoga", ["thoracic", "lower_back", "chest"], 30, { prone: true, cue: "Press up gently, shoulders away from ears." }),
  mv("bridge_pose", "Bridge pose", "yoga", ["glutes", "thoracic"], 30, { supine: true, cue: "Lift the hips, roll shoulders under." }),
  mv("childs_pose", "Child's pose", "yoga", ["lower_back", "lats"], 60, { flex: true, joints: ["knee"], cue: "Knees wide, arms long, breathe into your back." }),
  mv("happy_baby", "Happy baby", "yoga", ["hips", "adductors"], 45, { supine: true, cue: "Hold the feet, rock side to side." }),
  mv("seated_twist", "Seated twist", "yoga", ["thoracic", "lower_back"], 30, { side: true, flex: true, cue: "Lengthen up, then rotate." }),
  mv("savasana", "Savasana", "yoga", ["breath"], 120, { supine: true, cue: "Lie still. Let everything go heavy." }),
  mv("seated_breath", "Seated breathing", "breath", ["breath"], 90, { cue: "Sit tall. In for 4, out for 6." }),

  // Pilates
  mv("hundred", "The hundred", "pilates", ["core"], 60, { flex: true, supine: true, level: "intermediate", cue: "Head up, pump arms, breathe 5 in, 5 out." }),
  mv("roll_up", "Roll-up", "pilates", ["core", "hamstrings"], 45, { flex: true, supine: true, level: "intermediate", cue: "Peel up one vertebra at a time." }),
  mv("single_leg_stretch", "Single-leg stretch", "pilates", ["core"], 45, { flex: true, supine: true, cue: "Head up, switch legs with control." }),
  mv("dead_bug_pilates", "Dead bug", "pilates", ["core"], 45, { supine: true, cue: "Back flat, opposite arm and leg reach away." }),
  mv("side_leg_lifts", "Side-lying leg lifts", "pilates", ["glutes", "hips"], 40, { side: true, cue: "Hips stacked, lift from the side of the hip." }),
  mv("clams", "Clamshells", "pilates", ["glutes"], 40, { side: true, cue: "Feet together, open the top knee." }),
  mv("swimming", "Swimming", "pilates", ["thoracic", "glutes", "lower_back"], 40, { prone: true, cue: "Face down, flutter opposite arm and leg." }),
  mv("shoulder_bridge", "Shoulder bridge", "pilates", ["glutes"], 40, { supine: true, cue: "Roll up through the spine, hold, roll down." }),
  mv("bird_dog", "Bird dog", "pilates", ["core", "lower_back", "glutes"], 40, { side: true, joints: ["wrist", "knee"], cue: "Long from fingertips to heel, hips level." }),
  mv("pilates_plank", "Plank", "pilates", ["core", "shoulders"], 30, { joints: ["wrist"], cue: "Long line, breathe." }),
  mv("spine_stretch", "Spine stretch forward", "pilates", ["hamstrings", "lower_back"], 30, { flex: true, cue: "Sit tall, curl forward like over a ball." }),
  mv("saw", "The saw", "pilates", ["thoracic", "hamstrings"], 40, { flex: true, cue: "Twist and reach the little finger past the foot." }),
];

export const MOVE_BY_ID = Object.fromEntries(MOVES.map((m) => [m.id, m]));

/** Which mobility areas a muscle list implies. */
const MUSCLE_AREAS = {
  chest: ["chest", "shoulders"],
  front_delts: ["shoulders"],
  side_delts: ["shoulders"],
  rear_delts: ["shoulders", "thoracic"],
  lats: ["lats", "thoracic"],
  upper_back: ["thoracic"],
  traps: ["neck"],
  biceps: ["shoulders"],
  triceps: ["shoulders"],
  forearms: ["wrists"],
  quads: ["quads", "hips"],
  hamstrings: ["hamstrings"],
  glutes: ["glutes", "hips"],
  adductors: ["adductors"],
  calves: ["calves"],
  abs: ["core"],
  obliques: ["core"],
  lower_back: ["lower_back"],
};

export const DISCIPLINE_AREAS = {
  run: ["calves", "hamstrings", "hips", "quads"],
  bike: ["hips", "quads", "thoracic", "lower_back"],
  swim: ["shoulders", "lats", "thoracic"],
  hyrox: ["hips", "quads", "shoulders", "calves"],
  conditioning: ["hips", "shoulders", "full"],
};

export function areasForMuscles(muscles = []) {
  return [...new Set(muscles.flatMap((m) => MUSCLE_AREAS[m] ?? []))];
}

const STYLE_POOLS = {
  warmup: ["dynamic"],
  cooldown: ["static", "yoga"],
  mobility: ["dynamic", "static"],
  recovery: ["static", "yoga", "breath"],
  yoga: ["yoga"],
  pilates: ["pilates"],
};

const STYLE_TITLES = {
  warmup: "Warm-up",
  cooldown: "Cool-down",
  mobility: "Mobility flow",
  recovery: "Recovery flow",
  yoga: "Yoga flow",
  pilates: "Pilates",
};

const moveSeconds = (m) => m.seconds * (m.perSide ? 2 : 1);

function allowed(m, c) {
  if (c.noSpinalFlexion && m.flexion) return false;
  if (c.noSupine && (m.supine || m.prone)) return false;
  if (c.injuries?.some((j) => m.joints.includes(j))) return false;
  if (c.level === "beginner" && m.level !== "beginner") return false;
  return true;
}

/** Ordering within a flow: activate first, stillness last. */
const STYLE_ORDER = { dynamic: 0, pilates: 1, yoga: 2, static: 3, breath: 4 };
const YOGA_PHASE = (m) =>
  m.id === "mountain"
    ? 0
    : m.id === "sun_salutation"
      ? 1
      : m.id === "savasana" || m.id === "seated_breath"
        ? 5
        : m.supine || m.prone || m.id === "childs_pose" || m.id === "seated_twist"
          ? 3
          : 2;

/**
 * Build a guided flow.
 * @param {object} p
 * @param {"warmup"|"cooldown"|"mobility"|"recovery"|"yoga"|"pilates"} p.style
 * @param {number} p.minutes
 * @param {string[]} [p.areas] areas to emphasise
 * @param {object} [p.constraints] { noSpinalFlexion, noSupine, injuries, level }
 * @param {object[]} [p.history] logged sessions (moves used recently are rotated out)
 */
export function generateFlow({ style = "mobility", minutes = 10, areas = [], constraints = {}, history = [], seed = "flow" }) {
  const rng = createRng(`${seed}:${style}:${minutes}`);
  const recent = new Set(
    [...history]
      .filter((s) => s.kind === "mobility")
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 2)
      .flatMap((s) => s.moves ?? [])
  );

  const styles = STYLE_POOLS[style] ?? STYLE_POOLS.mobility;
  let pool = MOVES.filter((m) => styles.includes(m.style) && allowed(m, constraints));
  // Pilates and yoga sessions borrow a few stretches so they're never too short.
  if (pool.length < 6) pool = MOVES.filter((m) => [...styles, "static"].includes(m.style) && allowed(m, constraints));

  const score = (m) => {
    let s = rng() * 4;
    s += 6 * m.areas.filter((a) => areas.includes(a)).length;
    if (m.areas.includes("full")) s += style === "warmup" ? 8 : 1;
    if (recent.has(m.id)) s -= 5;
    return s;
  };

  const target = minutes * 60;
  const chosen = [];
  let total = 0;

  // Yoga always opens grounded and closes still, when those are allowed.
  const bookends = style === "yoga" ? ["mountain", "savasana"] : style === "recovery" ? ["seated_breath"] : [];
  for (const id of bookends) {
    const m = MOVE_BY_ID[id];
    if (m && allowed(m, constraints)) {
      chosen.push(m);
      total += moveSeconds(m);
    }
  }
  if (style === "yoga" && !chosen.some((m) => m.id === "savasana")) {
    chosen.push(MOVE_BY_ID.seated_breath);
    total += moveSeconds(MOVE_BY_ID.seated_breath);
  }

  const ranked = pool.filter((m) => !chosen.includes(m)).sort((a, b) => score(b) - score(a));
  for (const m of ranked) {
    if (total >= target) break;
    if (total + moveSeconds(m) > target + 45 && total > target * 0.8) continue;
    chosen.push(m);
    total += moveSeconds(m);
  }

  const ordered =
    style === "yoga"
      ? [...chosen].sort((a, b) => YOGA_PHASE(a) - YOGA_PHASE(b))
      : [...chosen].sort((a, b) => STYLE_ORDER[a.style] - STYLE_ORDER[b.style] || (a.id === "seated_breath" ? 1 : 0));

  // Not enough distinct moves for a long session: hold each one longer, like a real class would.
  const stretch = style !== "warmup" && total < target * 0.9 ? Math.min(2.5, target / total) : 1;
  const hold = (m) => Math.round((m.seconds * stretch) / 5) * 5;

  const steps = ordered.flatMap((m) =>
    m.perSide
      ? [
          { kind: "move", moveId: m.id, label: `${m.name} · left`, seconds: hold(m), cue: m.cue },
          { kind: "move", moveId: m.id, label: `${m.name} · right`, seconds: hold(m), cue: m.cue },
        ]
      : [{ kind: "move", moveId: m.id, label: m.name, seconds: hold(m), cue: m.cue }]
  );

  const totalSeconds = steps.reduce((n, s) => n + s.seconds, 0);
  const focus = areas.slice(0, 3).map((a) => AREAS[a]?.toLowerCase()).filter(Boolean);
  return {
    kind: "mobility",
    style,
    title: STYLE_TITLES[style] ?? "Mobility",
    summary: `${Math.round(totalSeconds / 60)} min${focus.length ? ` · ${focus.join(", ")}` : ""}`,
    moves: ordered.map((m) => m.id),
    steps,
    totalSeconds,
  };
}
