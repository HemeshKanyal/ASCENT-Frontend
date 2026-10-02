/**
 * Shared vocabulary for the training engine: muscles, equipment, levels.
 * Every exercise, split and generated workout is described in these terms.
 */

export const MUSCLES = {
  chest: "Chest",
  front_delts: "Front Delts",
  side_delts: "Side Delts",
  rear_delts: "Rear Delts",
  lats: "Lats",
  upper_back: "Upper Back",
  traps: "Traps",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  adductors: "Adductors",
  calves: "Calves",
  abs: "Abs",
  obliques: "Obliques",
  lower_back: "Lower Back",
};

// Friendly groups people think in ("back day") → precise muscles.
export const MUSCLE_GROUPS = {
  chest: ["chest"],
  back: ["lats", "upper_back"],
  shoulders: ["front_delts", "side_delts", "rear_delts"],
  arms: ["biceps", "triceps"],
  legs: ["quads", "hamstrings", "glutes", "calves"],
  core: ["abs", "obliques"],
};

/**
 * Hard sets per week for an intermediate lifter. Secondary involvement
 * counts as half a set, so pressing already covers most front-delt work.
 */
export const WEEKLY_SET_TARGETS = {
  chest: 12,
  front_delts: 4,
  side_delts: 10,
  rear_delts: 6,
  lats: 10,
  upper_back: 10,
  traps: 4,
  biceps: 8,
  triceps: 8,
  forearms: 3,
  quads: 12,
  hamstrings: 10,
  glutes: 8,
  adductors: 4,
  calves: 8,
  abs: 6,
  obliques: 4,
  lower_back: 3,
};

export const LEVEL_VOLUME_SCALE = {
  beginner: 0.7,
  intermediate: 1,
  advanced: 1.3,
};

// Muscles big enough to own a stable, progressively overloaded anchor lift.
export const ANCHOR_MUSCLES = [
  "chest",
  "lats",
  "upper_back",
  "quads",
  "hamstrings",
  "glutes",
  "front_delts",
];

export const LEVELS = ["beginner", "intermediate", "advanced"];

export const EQUIPMENT = {
  barbell: "Barbell",
  ez_bar: "EZ Bar",
  trap_bar: "Trap Bar",
  dumbbell: "Dumbbells",
  kettlebell: "Kettlebell",
  bench: "Bench",
  rack: "Squat Rack",
  landmine: "Landmine",
  cable: "Cable Station",
  smith: "Smith Machine",
  pullup_bar: "Pull-up Bar",
  dip_bars: "Dip Bars",
  band: "Resistance Band",
  ab_wheel: "Ab Wheel",
  leg_press: "Leg Press",
  hack_squat: "Hack Squat",
  leg_extension: "Leg Extension",
  leg_curl: "Leg Curl",
  chest_press_machine: "Chest Press Machine",
  pec_deck: "Pec Deck",
  shoulder_press_machine: "Shoulder Press Machine",
  lat_pulldown: "Lat Pulldown",
  row_machine: "Row Machine",
  preacher_bench: "Preacher Bench",
  hip_ab_ad_machine: "Hip Abductor/Adductor",
  calf_machine: "Standing Calf Machine",
  seated_calf_machine: "Seated Calf Machine",
  back_extension: "Back Extension Bench",
  // Cardio & conditioning
  treadmill: "Treadmill",
  rower: "Rowing Machine",
  ski_erg: "SkiErg",
  air_bike: "Air / Assault Bike",
  bike_trainer: "Bike or Indoor Trainer",
  sled: "Sled",
  wall_ball: "Wall Ball / Med Ball",
  sandbag: "Sandbag",
  jump_rope: "Jump Rope",
  pool: "Swimming Pool",
};

export const EQUIPMENT_PRESETS = {
  commercial_gym: {
    label: "Full gym",
    equipment: Object.keys(EQUIPMENT),
  },
  home_gym: {
    label: "Home gym",
    equipment: ["barbell", "dumbbell", "bench", "rack", "pullup_bar", "band", "ez_bar"],
  },
  dumbbells_only: {
    label: "Dumbbells + bench",
    equipment: ["dumbbell", "bench"],
  },
  bodyweight: {
    label: "Bodyweight",
    equipment: ["pullup_bar", "band"],
  },
};

export const JOINTS = {
  shoulder: "Shoulder",
  elbow: "Elbow",
  wrist: "Wrist",
  lower_back: "Lower Back",
  knee: "Knee",
  hip: "Hip",
};

export const levelRank = (level) => Math.max(0, LEVELS.indexOf(level));
