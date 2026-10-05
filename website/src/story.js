/**
 * The story: which real muscles (TA2 ids in models/muscles.glb) each chapter
 * lights up, and where the camera looks. The app's own muscle ids
 * (src/engine/anatomy.js) map onto the model here, so the site and the app
 * always talk about the same muscles.
 */

/** App muscle id → TA2 ids of the meshes that make it up. */
export const TA2 = {
  sternocleidomastoid: ["2156"],
  upper_traps: ["2227"],
  middle_traps: ["2228"],
  lower_traps: ["2229"],
  pec_clavicular: ["2302"],
  pec_sternal: ["2303", "2304"],
  serratus: ["2307"],
  anterior_delt: ["2453"],
  lateral_delt: ["2454"],
  posterior_delt: ["2455"],
  rotator_cuff: ["2458", "2459"],
  teres_major: ["2462"],
  rhomboids: ["2232", "2233"],
  lats: ["2231"],
  erectors: ["2258", "2260", "2263", "2268"],
  biceps_long: ["2465"],
  biceps_short: ["2466"],
  brachialis: ["2469"],
  brachioradialis: ["2496"],
  forearm_flexors: ["2481", "2482", "2484", "2485", "2487", "2488"],
  forearm_extensors: ["2497", "2499", "2500", "2508", "2509"],
  triceps_long: ["2472"],
  triceps_lateral: ["2473"],
  triceps_medial: ["2474"],
  rectus_abdominis: ["2357"],
  obliques: ["2364", "2373"],
  hip_flexors: ["2594", "2595"],
  tfl: ["2602"],
  sartorius: ["2610"],
  rectus_femoris: ["2614"],
  vastus_lateralis: ["2618"],
  vastus_medialis: ["2620"],
  adductors: ["2628", "2629", "2635", "2627"],
  adductor_magnus: ["2630"],
  glute_max: ["2598"],
  glute_med: ["2599", "2600"],
  biceps_femoris: ["2639", "2640"],
  semis: ["2641", "2642"],
  gastrocnemius: ["2658", "2659"],
  soleus: ["2660"],
  tibialis: ["2644"],
};

const ids = (...muscles) => muscles.flatMap((m) => TA2[m] ?? [m]);

/**
 * Camera: az (deg, 0 = front, 90 = the body's left side), el (deg), dist (m),
 * y (look-at height, m). Highlights: `hot` = target red, `warm` = helper red.
 * `cycle` = several highlight sets shown in turn.
 */
export const STATES = {
  hero: {
    cam: { az: 28, el: 4, dist: 4.4, y: 0.95 },
    warm: ids("pec_sternal", "pec_clavicular", "rectus_abdominis", "rectus_femoris", "vastus_lateralis", "vastus_medialis", "anterior_delt", "lateral_delt"),
    spin: 0.1,
    smoke: 0.45,
  },
  numbers: { cam: { az: -40, el: 4, dist: 4.6, y: 0.95 }, spin: 0.14, smoke: 0.5 },
  method: {
    cam: { az: 22, el: 8, dist: 2.5, y: 1.15 },
    hot: ids("pec_sternal"),
    cycle: [ids("pec_clavicular", "pec_sternal"), ids("anterior_delt", "triceps_long", "triceps_lateral"), ids("serratus", "pec_clavicular")],
    smoke: 0.35,
  },
  chest: { cam: { az: 18, el: 8, dist: 1.9, y: 1.2 }, hot: ids("pec_clavicular"), warm: ids("pec_sternal", "anterior_delt"), smoke: 0.4 },
  shoulders: {
    cam: { az: 62, el: 10, dist: 1.8, y: 1.24 },
    cycle: [ids("anterior_delt"), ids("lateral_delt"), ids("posterior_delt")],
    smoke: 0.4,
  },
  back: { cam: { az: 180, el: 10, dist: 2.3, y: 1.12 }, hot: ids("lats", "middle_traps", "rhomboids"), warm: ids("upper_traps", "lower_traps", "teres_major", "posterior_delt"), smoke: 0.4 },
  legs: {
    cam: { az: 14, el: 4, dist: 2.3, y: 0.62 },
    cycle: [ids("rectus_femoris"), ids("vastus_lateralis"), ids("vastus_medialis"), ids("sartorius", "adductors")],
    smoke: 0.4,
  },
  coach: {
    cam: { az: -30, el: 6, dist: 4.0, y: 0.95 },
    cycle: [
      ids("glute_max", "rectus_femoris", "vastus_lateralis", "vastus_medialis", "adductor_magnus"),
      ids("lats", "middle_traps", "rhomboids", "biceps_long", "biceps_short", "posterior_delt"),
      ids("pec_sternal", "pec_clavicular", "anterior_delt", "triceps_long", "triceps_lateral"),
    ],
    smoke: 0.35,
  },
  fuel: { cam: { az: -35, el: 6, dist: 4.2, y: 0.95 }, dim: 0.7, spin: 0.12, smoke: 0.55, xray: 0.5 },
  every: {
    cam: { az: 30, el: 5, dist: 4.4, y: 0.95 },
    cycle: [
      ids("rectus_femoris", "vastus_lateralis", "vastus_medialis", "gastrocnemius", "soleus", "glute_max"),
      ids("lats", "anterior_delt", "lateral_delt", "triceps_long", "triceps_lateral"),
      ids("forearm_flexors", "brachioradialis", "lats", "biceps_long", "biceps_short"),
      ids("biceps_femoris", "semis", "glute_max", "rectus_abdominis"),
      ids("rectus_femoris", "vastus_lateralis", "lats", "rhomboids", "middle_traps"),
    ],
    cycleLabels: ["run", "swim", "climb", "yoga", "row"],
    smoke: 0.35,
  },
  health: { cam: { az: 35, el: 6, dist: 4.0, y: 0.95 }, xray: 1, joints: true, smoke: 0.5 },
  progress: {
    cam: { az: -18, el: 3, dist: 4.2, y: 0.95 },
    hot: ids("pec_sternal", "pec_clavicular", "lats", "rectus_femoris", "vastus_lateralis", "vastus_medialis", "glute_max"),
    warm: ids("anterior_delt", "lateral_delt", "biceps_long", "biceps_short", "triceps_lateral", "rectus_abdominis", "gastrocnemius", "obliques"),
    spin: 0.1,
    smoke: 0.4,
  },
  crew: { cam: { az: 0, el: 14, dist: 6.4, y: 0.95 }, crew: true, warm: ids("pec_sternal", "rectus_femoris", "lats", "lateral_delt"), smoke: 0.3 },
  faq: { cam: { az: 150, el: 6, dist: 4.6, y: 0.95 }, spin: 0.1, smoke: 0.4 },
  begin: {
    cam: { az: 8, el: 2, dist: 4.3, y: 0.95 },
    warm: ids("pec_sternal", "pec_clavicular", "rectus_abdominis", "rectus_femoris", "vastus_lateralis", "vastus_medialis", "lateral_delt", "anterior_delt", "biceps_long", "biceps_short", "obliques", "sartorius", "tibialis", "gastrocnemius"),
    smoke: 0.6,
  },
};

/** Joints the health chapter calls out (metres, model space). */
export const JOINTS = [
  { name: "Knees", p: [0.1, 0.5, 0.05] },
  { name: "Knees", p: [-0.1, 0.5, 0.05] },
  { name: "Lower back", p: [0, 1.04, -0.08] },
  { name: "Shoulders", p: [0.19, 1.42, 0] },
  { name: "Shoulders", p: [-0.19, 1.42, 0] },
];
