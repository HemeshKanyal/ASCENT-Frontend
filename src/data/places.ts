import { EQUIPMENT } from "../engine";

export type Place = { id: string; label: string; hint: string; equipment: string[] };

const ALL = Object.keys(EQUIPMENT);

export const PLACES: Place[] = [
  { id: "commercial_gym", label: "Full gym", hint: "Machines, cables, barbells, cardio — the works", equipment: ALL.filter((e) => e !== "pool") },
  { id: "pool", label: "Pool", hint: "For swim sessions", equipment: ["pool"] },
  { id: "home_gym", label: "Home gym", hint: "Barbell, rack, dumbbells, pull-up bar", equipment: ["barbell", "dumbbell", "bench", "rack", "pullup_bar", "band", "ez_bar"] },
  { id: "crossfit_box", label: "CrossFit / functional box", hint: "Barbells, kettlebells, rowers, sleds", equipment: ["barbell", "rack", "dumbbell", "kettlebell", "bench", "pullup_bar", "band", "ab_wheel", "trap_bar", "rower", "ski_erg", "air_bike", "sled", "wall_ball", "sandbag", "jump_rope"] },
  { id: "hotel_gym", label: "Hotel / small gym", hint: "Dumbbells, a bench, treadmill, maybe a cable", equipment: ["dumbbell", "bench", "cable", "treadmill", "bike_trainer"] },
  { id: "dumbbells_only", label: "Dumbbells at home", hint: "A pair of dumbbells and a bench", equipment: ["dumbbell", "bench"] },
  { id: "outdoor_park", label: "Park / outdoor", hint: "Pull-up bar, dip bars, a bench", equipment: ["pullup_bar", "dip_bars", "bench"] },
  { id: "travel", label: "Travelling", hint: "Just a resistance band", equipment: ["band"] },
  { id: "no_equipment", label: "No equipment", hint: "Floor and bodyweight only", equipment: [] },
];

export const placeById = (id: string) => PLACES.find((p) => p.id === id);

/** Short explanations so people know what to tick. */
export const EQUIPMENT_INFO: Record<string, { group: string; info: string }> = {
  barbell: { group: "Free weights", info: "Long bar with plates — squats, presses, deadlifts." },
  ez_bar: { group: "Free weights", info: "Short wavy bar; easier on wrists for curls and extensions." },
  trap_bar: { group: "Free weights", info: "Hexagon bar you stand inside — friendlier deadlifts." },
  dumbbell: { group: "Free weights", info: "Pairs of hand weights. The most versatile tool." },
  kettlebell: { group: "Free weights", info: "Cannonball with a handle — swings and goblet squats." },
  landmine: { group: "Free weights", info: "Barbell anchored in a corner or a pivot — angled presses and rows." },
  bench: { group: "Stations", info: "Flat or adjustable bench." },
  rack: { group: "Stations", info: "Squat/power rack with safety bars." },
  pullup_bar: { group: "Stations", info: "Any bar you can hang from." },
  dip_bars: { group: "Stations", info: "Parallel bars for dips (parks often have them)." },
  back_extension: { group: "Stations", info: "45° bench for back and glute extensions." },
  preacher_bench: { group: "Stations", info: "Angled pad for preacher curls." },
  cable: { group: "Machines", info: "Tower with an adjustable pulley and handles." },
  smith: { group: "Machines", info: "Barbell fixed on rails." },
  leg_press: { group: "Machines", info: "Sled you push with your legs." },
  hack_squat: { group: "Machines", info: "Angled squat machine with shoulder pads." },
  leg_extension: { group: "Machines", info: "Seated, kick your legs up — quads." },
  leg_curl: { group: "Machines", info: "Lying or seated, curl your heels in — hamstrings." },
  chest_press_machine: { group: "Machines", info: "Seated pressing machine for chest." },
  pec_deck: { group: "Machines", info: "Fly machine; also does reverse flys for rear delts." },
  shoulder_press_machine: { group: "Machines", info: "Seated overhead pressing machine." },
  lat_pulldown: { group: "Machines", info: "Seated pull-down bar for back." },
  row_machine: { group: "Machines", info: "Chest-supported or seated row machine." },
  hip_ab_ad_machine: { group: "Machines", info: "Seated machine — squeeze legs in or push out." },
  calf_machine: { group: "Machines", info: "Standing calf raise with shoulder pads." },
  seated_calf_machine: { group: "Machines", info: "Knee-pad calf raise machine." },
  band: { group: "Small gear", info: "Resistance bands — great for travel and warm-ups." },
  ab_wheel: { group: "Small gear", info: "Wheel with handles for rollouts." },
  jump_rope: { group: "Small gear", info: "Skipping rope — cheap, brutal conditioning." },
  treadmill: { group: "Cardio & conditioning", info: "Indoor running; also great for incline walks." },
  rower: { group: "Cardio & conditioning", info: "Rowing machine (Concept2-style) — a HYROX station." },
  ski_erg: { group: "Cardio & conditioning", info: "Standing pull-down ski machine — a HYROX station." },
  air_bike: { group: "Cardio & conditioning", info: "Fan bike that gets harder the harder you push." },
  bike_trainer: { group: "Cardio & conditioning", info: "Road bike, spin bike or smart trainer." },
  sled: { group: "Cardio & conditioning", info: "Push/pull sled on turf — two HYROX stations." },
  wall_ball: { group: "Cardio & conditioning", info: "Soft medicine ball thrown to a target." },
  sandbag: { group: "Cardio & conditioning", info: "Sandbag for carries and lunges." },
  pool: { group: "Cardio & conditioning", info: "Lap pool access for swim sessions." },
};

export const EQUIPMENT_GROUPS = ["Free weights", "Stations", "Machines", "Cardio & conditioning", "Small gear"];
