/**
 * Anatomy: individual muscles (with their anatomical names), the training
 * groups they belong to, front/back body maps split into those muscles, and
 * which muscles each exercise, move or activity works.
 *
 * Exercises are described in training groups (taxonomy.js MUSCLES: chest,
 * quads…). `exerciseMuscles()` refines that into individual muscles and heads
 * using the exercise's emphasis (upper chest → clavicular head, seated calf
 * raise → soleus) plus a few per-exercise extras.
 *
 * Map paths are drawn for the figure's left half (right side of the picture,
 * x ≥ 60 in a 120 × 260 box) and mirrored by the renderer, except `whole`
 * regions (head, neck) drawn once. `muscle: null` regions are skin/bone.
 */

/** Individual muscles: [anatomical name, plain-language group]. */
export const MUSCLE_DETAILS = {
  sternocleidomastoid: ["Sternocleidomastoid", "Neck"],
  upper_traps: ["Trapezius, upper fibres", "Traps"],
  middle_traps: ["Trapezius, middle fibres", "Mid back"],
  lower_traps: ["Trapezius, lower fibres", "Mid back"],
  pec_clavicular: ["Pectoralis major, clavicular head", "Upper chest"],
  pec_sternal: ["Pectoralis major, sternocostal head", "Mid & lower chest"],
  serratus: ["Serratus anterior", "Side of ribs"],
  anterior_delt: ["Deltoid, anterior head", "Front shoulder"],
  lateral_delt: ["Deltoid, lateral head", "Side shoulder"],
  posterior_delt: ["Deltoid, posterior head", "Rear shoulder"],
  rotator_cuff: ["Infraspinatus & teres minor", "Rotator cuff"],
  teres_major: ["Teres major", "Upper back"],
  rhomboids: ["Rhomboid major & minor", "Upper back, under trapezius"],
  lats: ["Latissimus dorsi", "Lats"],
  erectors: ["Erector spinae", "Lower back"],
  biceps_long: ["Biceps brachii, long head", "Biceps, outer"],
  biceps_short: ["Biceps brachii, short head", "Biceps, inner"],
  brachialis: ["Brachialis", "Upper arm, under biceps"],
  brachioradialis: ["Brachioradialis", "Forearm, thumb side"],
  forearm_flexors: ["Wrist & finger flexors", "Forearm, palm side"],
  forearm_extensors: ["Wrist & finger extensors", "Forearm, back"],
  triceps_long: ["Triceps brachii, long head", "Triceps, inner"],
  triceps_lateral: ["Triceps brachii, lateral head", "Triceps, outer"],
  triceps_medial: ["Triceps brachii, medial head", "Triceps, above elbow"],
  rectus_abdominis: ["Rectus abdominis", "Abs"],
  obliques: ["External & internal obliques", "Obliques"],
  hip_flexors: ["Iliopsoas", "Hip flexors"],
  tfl: ["Tensor fasciae latae", "Outer hip"],
  sartorius: ["Sartorius", "Front of thigh"],
  rectus_femoris: ["Rectus femoris", "Quads, centre"],
  vastus_lateralis: ["Vastus lateralis", "Quads, outer"],
  vastus_medialis: ["Vastus medialis", "Quads, inner teardrop"],
  adductors: ["Adductor longus, brevis & gracilis", "Inner thigh"],
  adductor_magnus: ["Adductor magnus", "Inner thigh, back"],
  glute_max: ["Gluteus maximus", "Glutes"],
  glute_med: ["Gluteus medius & minimus", "Side glutes"],
  biceps_femoris: ["Biceps femoris", "Hamstrings, outer"],
  semis: ["Semitendinosus & semimembranosus", "Hamstrings, inner"],
  gastrocnemius: ["Gastrocnemius", "Calves"],
  soleus: ["Soleus", "Calves, deep"],
  tibialis: ["Tibialis anterior", "Shin"],
};

/** Training group → the muscles it means by default. */
export const GROUP_MUSCLES = {
  chest: ["pec_clavicular", "pec_sternal"],
  front_delts: ["anterior_delt"],
  side_delts: ["lateral_delt"],
  rear_delts: ["posterior_delt"],
  lats: ["lats", "teres_major"],
  upper_back: ["rhomboids", "middle_traps"],
  traps: ["upper_traps"],
  biceps: ["biceps_long", "biceps_short", "brachialis"],
  triceps: ["triceps_long", "triceps_lateral", "triceps_medial"],
  forearms: ["forearm_flexors", "brachioradialis"],
  quads: ["rectus_femoris", "vastus_lateralis", "vastus_medialis"],
  hamstrings: ["biceps_femoris", "semis"],
  glutes: ["glute_max"],
  adductors: ["adductors", "adductor_magnus"],
  calves: ["gastrocnemius", "soleus"],
  abs: ["rectus_abdominis"],
  obliques: ["obliques"],
  lower_back: ["erectors"],
};

/** Group a muscle belongs to (for the demo figure and filters). */
export const MUSCLE_GROUP = Object.fromEntries(
  Object.entries(GROUP_MUSCLES).flatMap(([g, ms]) => ms.map((m) => [m, g])),
);
Object.assign(MUSCLE_GROUP, {
  sternocleidomastoid: "traps",
  lower_traps: "upper_back",
  serratus: "chest",
  rotator_cuff: "rear_delts",
  forearm_extensors: "forearms",
  hip_flexors: "abs",
  tfl: "glutes",
  sartorius: "quads",
  glute_med: "glutes",
  tibialis: "calves",
});

// Emphasis tags on exercises (exercises.js `emphasis`) → [primary, secondary] muscles
// that replace the group defaults for that group.
const EMPHASIS = {
  upper_chest: ["chest", ["pec_clavicular"], ["pec_sternal"]],
  lower_chest: ["chest", ["pec_sternal"], ["pec_clavicular"]],
  mid_chest: ["chest", ["pec_sternal", "pec_clavicular"], []],
  long_head: [null, null, null], // resolved per group below
  short_head: ["biceps", ["biceps_short"], ["biceps_long", "brachialis"]],
  brachialis: ["biceps", ["brachialis", "brachioradialis"], ["biceps_long", "biceps_short"]],
  lateral_head: ["triceps", ["triceps_lateral", "triceps_medial"], ["triceps_long"]],
  // Knee-extension work hits all quad heads; the tag only reorders so rectus femoris leads.
  rectus_femoris: ["quads", ["rectus_femoris", "vastus_lateralis", "vastus_medialis"], []],
  glute_med: ["glutes", ["glute_med", "tfl"], ["glute_max"]],
  gastrocnemius: ["calves", ["gastrocnemius"], ["soleus"]],
  soleus: ["calves", ["soleus"], ["gastrocnemius"]],
  lower_lats: ["lats", ["lats"], ["teres_major"]],
};
const LONG_HEAD = {
  biceps: [["biceps_long"], ["biceps_short", "brachialis"]],
  triceps: [["triceps_long"], ["triceps_lateral", "triceps_medial"]],
};

// Muscles the group tags can't express. [extra primary, extra secondary].
const EXTRAS = {
  push_up: [[], ["serratus"]],
  deficit_push_up: [[], ["serratus"]],
  decline_push_up: [[], ["serratus"]],
  diamond_push_up: [[], ["serratus"]],
  dumbbell_pullover: [[], ["serratus", "pec_sternal"]],
  ab_wheel_rollout: [[], ["serratus", "hip_flexors"]],
  dumbbell_lateral_raise: [[], ["upper_traps", "serratus"]],
  cable_upright_row: [[], ["upper_traps"]],
  incline_y_raise: [["lower_traps"], ["lateral_delt", "serratus"]],
  face_pull: [["rotator_cuff"], ["middle_traps", "lower_traps"]],
  band_pull_apart: [[], ["rotator_cuff", "middle_traps"]],
  reverse_pec_deck: [[], ["rotator_cuff"]],
  cable_rear_delt_fly: [[], ["rotator_cuff"]],
  bent_over_reverse_fly: [[], ["rotator_cuff"]],
  barbell_row: [[], ["teres_major", "erectors"]],
  t_bar_row: [[], ["teres_major", "erectors"]],
  pull_up: [[], ["lower_traps", "teres_major"]],
  chin_up: [[], ["lower_traps"]],
  barbell_shrug: [[], ["middle_traps"]],
  dumbbell_shrug: [[], ["middle_traps"]],
  conventional_deadlift: [[], ["adductor_magnus", "lats"]],
  sumo_deadlift: [["adductor_magnus"], []],
  trap_bar_deadlift: [[], ["vastus_lateralis"]],
  romanian_deadlift: [[], ["adductor_magnus"]],
  back_squat: [[], ["adductor_magnus", "erectors"]],
  front_squat: [[], ["erectors"]],
  hanging_leg_raise: [["hip_flexors"], []],
  decline_sit_up: [[], ["hip_flexors"]],
  dead_bug: [[], ["hip_flexors", "obliques"]],
  hollow_hold: [[], ["hip_flexors"]],
  plank: [[], ["serratus", "glute_max", "rectus_femoris"]],
  side_plank: [[], ["glute_med", "tfl"]],
  copenhagen_plank: [[], ["glute_med"]],
  cable_kickback: [[], ["glute_med"]],
  banded_lateral_walk: [[], ["tfl"]],
  sissy_squat: [[], ["hip_flexors"]],
  reverse_nordic: [[], ["hip_flexors"]],
  single_leg_calf_raise: [[], ["tibialis"]],
  farmers_carry: [[], ["forearm_extensors", "glute_med"]],
  reverse_curl: [["forearm_extensors"], []],
  dead_hang: [[], ["teres_major", "lower_traps"]],
  kettlebell_swing: [[], ["forearm_flexors"]],
  pallof_press: [[], ["serratus"]],
  cable_woodchop: [[], ["serratus"]],
};

const uniq = (xs) => [...new Set(xs)];

/** Expand training groups into individual muscles. */
export function musclesFromGroups(primary = [], secondary = []) {
  const p = uniq(primary.flatMap((g) => GROUP_MUSCLES[g] ?? (MUSCLE_DETAILS[g] ? [g] : [])));
  const s = uniq(secondary.flatMap((g) => GROUP_MUSCLES[g] ?? (MUSCLE_DETAILS[g] ? [g] : []))).filter((m) => !p.includes(m));
  return { primary: p, secondary: s };
}

/** Individual muscles an exercise trains: { primary, secondary } muscle ids. */
export function exerciseMuscles(exercise) {
  const replaced = new Map(); // group → [primary, secondary]
  for (const tag of exercise.emphasis ?? []) {
    if (tag === "long_head") {
      for (const g of ["biceps", "triceps"]) if ([...exercise.primary, ...exercise.secondary].includes(g)) replaced.set(g, LONG_HEAD[g]);
    } else if (EMPHASIS[tag]) {
      const [g, p, s] = EMPHASIS[tag];
      if ([...exercise.primary, ...exercise.secondary].includes(g)) replaced.set(g, [p, s]);
    }
  }
  const primary = [];
  const secondary = [];
  for (const g of exercise.primary) {
    if (replaced.has(g)) {
      primary.push(...replaced.get(g)[0]);
      secondary.push(...replaced.get(g)[1]);
    } else primary.push(...(GROUP_MUSCLES[g] ?? []));
  }
  for (const g of exercise.secondary) secondary.push(...(replaced.get(g)?.flat() ?? GROUP_MUSCLES[g] ?? []));
  const [xp, xs] = EXTRAS[exercise.id] ?? [[], []];
  const p = uniq([...primary, ...xp]);
  return { primary: p, secondary: uniq([...secondary, ...xs]).filter((m) => !p.includes(m)) };
}

/** "Pectoralis major, clavicular head (Upper chest)". */
export function muscleLabel(id) {
  const d = MUSCLE_DETAILS[id];
  return d ? `${d[0]} (${d[1]})` : id;
}

// ── Body map ─────────────────────────────────────────────────────────────

export const BODY_VIEWBOX = { width: 120, height: 260 };

const r = (muscle, d, whole = false) => ({ muscle, d, whole });
const HEAD = "M60,7 C68,7 72,13 72,21 C72,29 67,35 60,35 C53,35 48,29 48,21 C48,13 52,7 60,7 Z";
const NECK = "M54,31 L66,31 L67,44 L53,44 Z";

/** Front view, figure's left half. Later regions draw on top. */
export const BODY_FRONT = [
  r(null, NECK, true),
  r(null, HEAD, true),
  r("sternocleidomastoid", "M63.6,30 C65.6,34 64.6,39.5 61.6,44 L60.4,43 C62.2,38.6 63,34 62.3,30.5 Z"),
  r("upper_traps", "M65.6,35 C69.5,40 75,43 82,45 L72,46.5 C69,45.6 67,44.6 66,43.5 Z"),
  r("pec_clavicular", "M61,47.6 L73,46.4 C77,46.6 80,48.2 82,51 C76,52.4 69,54.4 61,56.4 Z"),
  r("pec_sternal", "M61,56.4 C69,54.4 76,52.4 82,51 C83.6,56 83.6,62 82.4,67 C78.6,74 70.6,78 61.4,78.4 Z"),
  r("serratus", "M80.6,69.5 C82.4,71.5 83.6,75 83.8,80.5 L80.6,82 C80.4,78 80,74 78.6,71.5 Z"),
  r("lateral_delt", "M80,44.4 C88.4,43.4 94.4,48 95.2,56 C95.6,62 93.6,67.6 90,72.2 L86.2,70.2 C88,63 88.6,56 87.6,50 C86.2,46 83.4,44.6 80,44.4 Z"),
  r("anterior_delt", "M77.6,46 C82,44.4 86.2,46 87.6,50 C88.6,56 88,63 86.2,70.2 C84,64 82.4,57 81.6,51.4 C80.8,49 79.4,47.4 77.6,46 Z"),
  r("biceps_short", "M84,70.4 C86.6,70.6 88.4,71.4 89.4,73 C89.8,81 89.6,90 89,98.6 C87.4,98.8 86.4,97.6 85.8,95 C84.2,87 83.6,78 84,70.4 Z"),
  r("biceps_long", "M89.4,73 C91.4,74.4 93.2,76.6 94,79.4 C95.2,86 94.6,93 92,98.2 L89,98.6 C89.6,90 89.8,81 89.4,73 Z"),
  r("brachialis", "M94,80 C96.2,85 96.6,92 94.8,99 L92.2,98.4 C94.6,93 95.2,86 94,80 Z"),
  r(null, "M85.8,96 C88,99.6 92,99.8 94.8,99 L95.4,103.4 L88,104.4 Z"), // elbow
  r("brachioradialis", "M92.4,99.6 C96.4,101.4 99.4,107 100.4,115 C98.6,117 96.4,117.4 95,116.4 C93.4,110 91.4,104.4 89.6,100.6 Z"),
  r("forearm_flexors", "M88,104.4 L89.6,100.6 C91.4,104.4 93.4,110 95,116.4 C96.4,117.4 98.6,117 100.4,115 C101.8,121 102.2,127 101.8,133 L97,135.2 C93,125 89.4,114.4 88,104.4 Z"),
  r(null, "M97,135.2 L101.8,133 C105,137.4 107,144 106,150 C104,155 99,155 98,149 C97,144 96,139 97,135.2 Z"), // hand
  r("rectus_abdominis", "M61,79.4 C65,79.4 68.6,80.2 70.6,82 L71.6,116 C69,121 65,124.8 61,126.4 Z"),
  r("obliques", "M71,82.4 C74,80.6 77.2,80.6 79,82.2 C80.4,83.4 82,83 83.4,82.2 C83.8,93 83.2,103 81.2,111 L72.2,119.2 Z"),
  r("hip_flexors", "M61,127.2 C66,125.2 69.6,122.4 72.2,119.6 L74.6,123.2 C71,128.4 67,132.4 63,135.6 L61,137 Z"),
  r("tfl", "M81.2,111.4 C83.2,117 84.2,123 83.8,129.4 L79.4,133 C78,128.4 76.4,125.4 74.8,123.2 L72.6,119.4 Z"),
  r("adductors", "M61,137.6 L63.2,135.8 C67.2,132.4 71.2,128.2 74.6,123.4 L76.8,124.8 C73,135 70.2,150 69.2,165 L67.6,170.4 C64,166 62,158 61,148 Z"),
  r("vastus_lateralis", "M79.6,131 C84,138 86.6,150 86.2,162 C85.8,170 83.2,177 80.2,181.4 L77.6,172 C81.4,160 82.4,148 81,136.4 Z"),
  r("rectus_femoris", "M73.8,133.6 C76.8,130.8 79.8,131.6 81,136.4 C82.4,148 81.4,160 77.6,172 L73.8,172 C71.8,160 71.8,146 73.8,133.6 Z"),
  r("vastus_medialis", "M72,165 C72.8,168 73.2,170 73.8,172 L77.6,172 L80.2,181.4 C77,184.2 72,184.2 69.4,181 C68.4,176 69.8,170 72,165 Z"),
  r("sartorius", "M76.8,124.8 L79.4,128.6 C75.6,145 72.2,163 70.2,180 L67.6,179.4 C69,162 72,145 76.8,124.8 Z"),
  r(null, "M68.4,182.4 C71.4,185.4 77.4,185.4 80.4,181 C81.4,186.4 80.4,191 78.4,193.4 L69.4,193.4 C67.4,190.4 67.4,186.4 68.4,182.4 Z"), // knee
  r(null, "M69.6,194 L78.6,194 C78.6,208 77.4,222 76.4,236 L71.2,236 C71,222 70.4,208 69.6,194 Z"), // shin
  r("tibialis", "M72.6,194.4 C75.6,194.4 77.6,195.6 78.4,198 C78,210 76.6,222 75.2,232 L73.6,232 C73,220 72.4,206 72.6,194.4 Z"),
  r("gastrocnemius", "M67.4,195 L69.8,194.2 C70.8,205 71,216 70.2,226 L68,226 C65.4,215 65,204 67.4,195 Z"),
  r("soleus", "M78.4,198.4 C81,204 81.6,214 79.2,224.6 L76.6,226.4 C77.6,216 78.4,206 78.4,198.4 Z"),
  r(null, "M70.2,236 L77,236 C79,241 81,246 81,250 L68,250 C68,246 69,240 70.2,236 Z"), // foot
];

/** Back view, figure's left half (the figure's left is still on the picture's right). */
export const BODY_BACK = [
  r(null, NECK, true),
  r(null, HEAD, true),
  r("upper_traps", "M60,31.6 L64.6,31.6 C66,39 72,43 81,45 C76,46.6 71,47.6 67,48.2 L60,48.2 Z"),
  r("posterior_delt", "M80,44.6 C88.4,43.6 94.4,48.4 95.2,56.4 C95.4,62.4 93.4,67.6 90,72 C87,65 84,58.6 79.2,53.2 C79,50.2 79.4,47.2 80,44.6 Z"),
  r("rotator_cuff", "M69.6,54 C74,52.6 77.4,52.6 79.2,53.2 C83,57 85.4,61.6 86.4,65.4 C80.4,66.4 74.4,66 68.2,64.2 C68.6,60.4 69,57 69.6,54 Z"),
  r("teres_major", "M68.2,64.2 C74.4,66 80.4,66.4 86.4,65.4 C87.2,68 87.2,70.2 86.8,72.2 C80.4,73.4 73.4,73.4 66.2,72.4 C66.6,69.4 67.2,66.6 68.2,64.2 Z"),
  r("lats", "M64.2,74.4 C74,74.4 82.4,73.6 87,72.4 C86.2,81 84.2,90 80.2,98 C75,106 69,111 64.6,115 L62.6,104 C62,94 62.6,84 64.2,74.4 Z"),
  r("middle_traps", "M60,48.2 L67,48.2 C71,47.6 76,46.6 81,45 C79,49 75.4,52 70.4,54 C66,56 63,58.2 60,60.4 Z"),
  r("rhomboids", "M62.6,56.6 C65,55.4 67.4,54.6 69.6,54 C69,57 68.6,60.4 68.2,64.2 L66.2,72.4 C64.8,67 63.6,61.6 62.6,56.6 Z"),
  r("lower_traps", "M60,60.4 C63,58.2 66,56 70.4,54 C69,57 68.4,60.6 68,64 C65.4,71 62.6,78.4 60,86 Z"),
  r("erectors", "M60,86 C61.4,82 62.6,78 63.6,75 L63.8,88 C63.6,96 64,106 64.6,115 C64,119 63,122 61.6,124.4 L60,124.4 Z"),
  r("obliques", "M80.2,98 C84,92 86,84.4 87,78.4 C87,90 86,102 83,112 L70,112 C74,108 77.6,103 80.2,98 Z"),
  r("triceps_long", "M86,70.4 C88.6,70.4 90,73 90.2,78 C90.2,85 89.8,90 89,93 L86.6,93.4 C85.6,87 85.2,79 86,70.4 Z"),
  r("triceps_lateral", "M90.2,72.4 C93.2,73.2 95.6,76 96.2,81 C96.6,86 95.6,90 94,93 L89,93 C89.8,90 90.2,85 90.2,78 C90.2,75.6 90.2,73.6 90.2,72.4 Z"),
  r("triceps_medial", "M86.6,93.4 L94,93 C93.6,95 93,96.4 92.4,97.4 L87.4,97.6 C87,96.4 86.8,95 86.6,93.4 Z"),
  r(null, "M87.4,97.6 L92.4,97.4 L95.4,103.4 L88,104.4 Z"), // elbow
  r("brachioradialis", "M92.4,97.6 C96.2,100 99.2,105.6 100.4,113 C99.4,114.6 98,115 97,114.6 C95.6,108.6 93.8,103.4 91.4,100 Z"),
  r("forearm_extensors", "M88,104.4 L91.4,100 C93.8,103.4 95.6,108.6 97,114.6 C98,115 99.4,114.6 100.4,113 C101.8,120 102.2,127 101.8,133 L97,135.2 C93,125 89.4,114.4 88,104.4 Z"),
  r(null, "M97,135.2 L101.8,133 C105,137.4 107,144 106,150 C104,155 99,155 98,149 C97,144 96,139 97,135.2 Z"), // hand
  r("glute_med", "M63.6,118.4 C70,114.4 77,111.6 83,112.4 C85,116 85.6,120.4 85.2,124.4 C78,122.4 70.4,122.4 62.6,124.6 Z"),
  r("glute_max", "M60,124.8 C68,121.8 77,121.8 85.2,124.4 C86.2,132 85.2,140 82.2,145.4 C76,149.4 67,150.2 60,148.4 Z"),
  r("adductor_magnus", "M60,148.8 L65,150.2 C64.6,158 65,166 66.6,173 L62,170 C61,163 60,156 60,148.8 Z"),
  r("semis", "M65,150.2 C68,151 70.6,151.2 73,151.2 C74,162 74.8,172 76,182 C73,182.2 70,181.4 68,179.4 C66,171 64.6,160 65,150.2 Z"),
  r("biceps_femoris", "M73,151.2 C77,150.4 80.6,148.4 82.8,146 C85.8,155 86,166 83,176 C81,179.4 78.4,181.4 76,182 C74.8,172 74,162 73,151.2 Z"),
  r(null, "M68,182.4 C71,184.6 77,184.6 81,178.6 C81.2,184.6 80.2,189.4 78.2,192.6 L69,192.6 C67,189.4 67,186.4 68,182.4 Z"), // knee
  r("soleus", "M68,214 C69.6,222 71.6,225 74,222.6 C76.6,222.6 79.4,220 81,214 C80.6,222 78.4,229.6 77,235 L71,235 C70,229 68.8,221 68,214 Z"),
  r("gastrocnemius", "M67.6,193 L73,193 C73.6,203 73.4,213 72.4,221.4 C69.4,221.6 67.2,214 66.6,205 C66.2,200 66.6,196 67.6,193 Z"),
  r("gastrocnemius", "M73,193 L79.4,193 C82.4,199 83,207 81.4,214 C80,219.4 76.8,222.4 74,222.6 C73.8,213 73.8,203 73,193 Z"),
  r(null, "M71,235 L77,235 C78,241 79,246 79,250 L69,250 C69,246 69.6,240 71,235 Z"), // heel
];

/** Lines that suggest tendons and separations (drawn, never filled). */
export const BODY_DETAILS = {
  front: ["M61,92 L71.2,92", "M61,103.4 L71.4,103.4", "M61,114.4 L71.6,114.4", "M61,46.6 L73,46"],
  back: ["M60,38 L60,124"],
};

/** Mobility areas (src/engine/mobility.js) → muscles to light up. */
export const AREA_MUSCLES = {
  hips: ["glute_max", "glute_med", "hip_flexors", "adductors"],
  hamstrings: ["biceps_femoris", "semis"],
  quads: ["rectus_femoris", "vastus_lateralis", "vastus_medialis"],
  glutes: ["glute_max", "glute_med"],
  adductors: ["adductors", "adductor_magnus"],
  calves: ["gastrocnemius", "soleus"],
  thoracic: ["erectors", "rhomboids", "middle_traps"],
  lower_back: ["erectors"],
  shoulders: ["anterior_delt", "lateral_delt", "posterior_delt", "rotator_cuff"],
  chest: ["pec_clavicular", "pec_sternal"],
  lats: ["lats", "teres_major"],
  neck: ["upper_traps", "sternocleidomastoid"],
  wrists: ["forearm_flexors", "forearm_extensors"],
  core: ["rectus_abdominis", "obliques"],
  full: ["rectus_femoris", "glute_max", "pec_sternal", "lats", "rectus_abdominis", "anterior_delt", "biceps_femoris"],
  breath: ["rectus_abdominis", "obliques"],
};

const g = (primary, secondary = []) => musclesFromGroups(primary, secondary);

/** What each activity mostly works: primary drives it, secondary supports it. */
export const ACTIVITY_MUSCLES = {
  run: g(["quads", "calves", "glutes", "hip_flexors"], ["hamstrings", "abs", "tibialis"]),
  trail_run: g(["quads", "calves", "glutes"], ["hamstrings", "abs", "obliques", "glute_med", "tibialis"]),
  walk: g(["calves", "glutes"], ["quads", "hamstrings", "tibialis"]),
  hike: g(["quads", "glutes", "calves"], ["hamstrings", "lower_back", "glute_med"]),
  ride: g(["quads", "glutes"], ["hamstrings", "calves", "hip_flexors"]),
  indoor_ride: g(["quads", "glutes"], ["hamstrings", "calves", "hip_flexors"]),
  swim_pool: g(["lats", "front_delts", "side_delts"], ["triceps", "chest", "abs", "glutes", "rotator_cuff"]),
  swim_open: g(["lats", "front_delts", "side_delts"], ["triceps", "chest", "abs", "glutes", "rotator_cuff"]),
  row: g(["quads", "lats", "upper_back"], ["glutes", "hamstrings", "biceps", "lower_back", "posterior_delt"]),
  hiit: g(["quads", "glutes"], ["chest", "abs", "calves", "front_delts"]),
  hyrox: g(["quads", "glutes", "calves"], ["lats", "upper_back", "forearms", "abs"]),
  yoga: g(["hamstrings", "glutes", "abs"], ["front_delts", "lower_back", "quads", "serratus"]),
  pilates: g(["abs", "obliques"], ["glutes", "lower_back", "adductors", "hip_flexors"]),
  mobility: g(["glutes", "hamstrings"], ["upper_back", "front_delts", "adductors", "hip_flexors"]),
  breathwork: g(["abs", "obliques"], []),
  football: g(["quads", "hamstrings", "glutes"], ["calves", "adductors", "abs", "hip_flexors"]),
  cricket: g(["obliques", "glutes", "quads"], ["front_delts", "forearms", "lower_back", "rotator_cuff"]),
  basketball: g(["quads", "calves", "glutes"], ["front_delts", "abs", "hamstrings"]),
  tennis: g(["obliques", "front_delts", "quads"], ["forearms", "forearm_extensors", "calves", "glutes", "rotator_cuff"]),
  badminton: g(["quads", "calves", "front_delts"], ["obliques", "forearms", "glutes", "rotator_cuff"]),
  martial_arts: g(["obliques", "glutes", "quads"], ["front_delts", "abs", "hamstrings", "calves", "hip_flexors"]),
  climbing: g(["lats", "forearms", "biceps"], ["upper_back", "abs", "calves", "teres_major"]),
  dance: g(["calves", "quads", "glutes"], ["abs", "obliques", "hamstrings", "glute_med", "hip_flexors"]),
  jump_rope: g(["calves"], ["quads", "front_delts", "forearms", "tibialis"]),
};

/**
 * Highlight level per muscle: 2 = target (primary), 1 = helper (secondary).
 * A muscle listed in both counts as a target.
 */
export function muscleHighlight(primary = [], secondary = []) {
  /** @type {Record<string, 1 | 2>} */
  const out = {};
  for (const m of secondary) out[m] = 1;
  for (const m of primary) out[m] = 2;
  return out;
}
