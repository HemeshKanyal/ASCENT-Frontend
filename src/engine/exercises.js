/**
 * Exercise library.
 *
 * Fields the engine relies on:
 *  - pattern:   movement pattern; the strongest signal for "is this a fair swap?"
 *  - primary / secondary: muscles trained (secondary counts as half a set)
 *  - equipment: ALL items required ([] = nothing needed)
 *  - bias:      where the movement is hardest — "lengthened" | "mid" | "shortened".
 *               Rotating bias trains a muscle through its whole range over a week.
 *  - emphasis:  region of the muscle favoured (upper chest, long head, …)
 *  - fatigue:   1–5 systemic cost; keeps sessions from stacking five heavy lifts
 *  - skill:     1–3 technical demand
 *  - anchor:    stable, loadable lift suitable for week-to-week overload
 *  - joints:    joints under notable stress, used to route around pain
 *  - spinalFlexion: loaded crunching/twisting of the spine (avoided with low bone density, postpartum)
 *  - regression: an easier stepping-stone version; only planned for beginners
 *               (still offered as a swap when something is "too hard")
 */

const ex = (id, name, pattern, primary, secondary, equipment, o = {}) => ({
  id,
  name,
  pattern,
  primary,
  secondary,
  equipment,
  mechanics: o.iso ? "isolation" : "compound",
  bias: o.bias ?? "mid",
  emphasis: o.emph ?? [],
  fatigue: o.fatigue ?? (o.iso ? 1 : 3),
  skill: o.skill ?? 1,
  level: o.level ?? "beginner",
  anchor: o.anchor ?? false,
  regression: o.regression ?? false,
  spinalFlexion: o.flex ?? false,
  joints: o.joints ?? [],
  unilateral: o.uni ?? false,
  bodyweight: equipment.every((e) => ["pullup_bar", "dip_bars", "bench"].includes(e)) && !o.loaded,
  cue: o.cue ?? "",
});

export const EXERCISES = [
  // ── Chest: horizontal press ────────────────────────────────────────────
  ex("barbell_bench_press", "Barbell Bench Press", "horizontal_push", ["chest"], ["triceps", "front_delts"], ["barbell", "bench", "rack"], { fatigue: 4, skill: 2, anchor: true, joints: ["shoulder"], emph: ["mid_chest"], loaded: true, cue: "Shoulder blades pinned, bar to lower chest, drive feet into floor." }),
  ex("dumbbell_bench_press", "Dumbbell Bench Press", "horizontal_push", ["chest"], ["triceps", "front_delts"], ["dumbbell", "bench"], { bias: "lengthened", anchor: true, emph: ["mid_chest"], loaded: true, cue: "Let the dumbbells sink deep for a full stretch, press up and slightly in." }),
  ex("machine_chest_press", "Machine Chest Press", "horizontal_push", ["chest"], ["triceps", "front_delts"], ["chest_press_machine"], { fatigue: 2, anchor: true, emph: ["mid_chest"], cue: "Handles at mid-chest height, control the return." }),
  ex("smith_bench_press", "Smith Machine Bench Press", "horizontal_push", ["chest"], ["triceps", "front_delts"], ["smith", "bench"], { anchor: true, emph: ["mid_chest"], cue: "Set the bench so the bar touches your lower chest." }),
  ex("decline_dumbbell_press", "Decline Dumbbell Press", "horizontal_push", ["chest"], ["triceps"], ["dumbbell", "bench"], { emph: ["lower_chest"], level: "intermediate", loaded: true, cue: "Slight decline, press toward your lower chest line." }),
  ex("dumbbell_floor_press", "Dumbbell Floor Press", "horizontal_push", ["chest"], ["triceps"], ["dumbbell"], { bias: "shortened", fatigue: 2, emph: ["mid_chest"], cue: "Pause when elbows touch the floor, then press." }),
  ex("push_up", "Push-up", "horizontal_push", ["chest"], ["triceps", "front_delts", "abs"], [], { fatigue: 2, anchor: true, emph: ["mid_chest"], cue: "Body in one straight line, chest touches the floor." }),
  ex("deficit_push_up", "Deficit Push-up", "horizontal_push", ["chest"], ["triceps", "front_delts"], [], { bias: "lengthened", fatigue: 2, level: "intermediate", emph: ["mid_chest"], cue: "Hands on plates or books so your chest dips below hand level." }),
  ex("chest_dip", "Chest Dip", "horizontal_push", ["chest", "triceps"], ["front_delts"], ["dip_bars"], { bias: "lengthened", level: "intermediate", anchor: true, joints: ["shoulder"], emph: ["lower_chest"], cue: "Lean forward, lower until a deep chest stretch." }),

  // ── Chest: incline press ───────────────────────────────────────────────
  ex("incline_barbell_press", "Incline Barbell Press", "incline_push", ["chest"], ["front_delts", "triceps"], ["barbell", "bench", "rack"], { fatigue: 4, skill: 2, anchor: true, joints: ["shoulder"], emph: ["upper_chest"], loaded: true, cue: "30–45° bench, bar to upper chest." }),
  ex("incline_dumbbell_press", "Incline Dumbbell Press", "incline_push", ["chest"], ["front_delts", "triceps"], ["dumbbell", "bench"], { bias: "lengthened", anchor: true, emph: ["upper_chest"], loaded: true, cue: "30° incline, deep stretch at the bottom." }),
  ex("incline_smith_press", "Incline Smith Press", "incline_push", ["chest"], ["front_delts", "triceps"], ["smith", "bench"], { anchor: true, emph: ["upper_chest"], cue: "Bar path to upper chest, elbows ~45° from torso." }),
  ex("incline_machine_press", "Incline Machine Press", "incline_push", ["chest"], ["front_delts", "triceps"], ["chest_press_machine"], { fatigue: 2, emph: ["upper_chest"], cue: "Set seat low so handles start at upper-chest height." }),
  ex("decline_push_up", "Feet-Elevated Push-up", "incline_push", ["chest"], ["front_delts", "triceps"], [], { fatigue: 2, emph: ["upper_chest"], cue: "Feet on a bench, keep hips from sagging." }),
  ex("landmine_press", "Landmine Press", "incline_push", ["front_delts", "chest"], ["triceps"], ["barbell", "landmine"], { uni: true, emph: ["upper_chest"], loaded: true, cue: "Press up and forward, reach at the top." }),

  // ── Chest: fly ─────────────────────────────────────────────────────────
  ex("cable_fly", "Cable Fly", "chest_fly", ["chest"], ["front_delts"], ["cable"], { iso: true, emph: ["mid_chest"], cue: "Soft elbows, hug a big tree." }),
  ex("low_to_high_cable_fly", "Low-to-High Cable Fly", "chest_fly", ["chest"], ["front_delts"], ["cable"], { iso: true, bias: "shortened", emph: ["upper_chest"], cue: "Sweep up to chin height, squeeze." }),
  ex("high_to_low_cable_fly", "High-to-Low Cable Fly", "chest_fly", ["chest"], [], ["cable"], { iso: true, emph: ["lower_chest"], cue: "Sweep down toward your hips." }),
  ex("dumbbell_fly", "Dumbbell Fly", "chest_fly", ["chest"], ["front_delts"], ["dumbbell", "bench"], { iso: true, bias: "lengthened", joints: ["shoulder"], emph: ["mid_chest"], cue: "Wide arc, stop at a strong stretch, not pain." }),
  ex("incline_dumbbell_fly", "Incline Dumbbell Fly", "chest_fly", ["chest"], ["front_delts"], ["dumbbell", "bench"], { iso: true, bias: "lengthened", joints: ["shoulder"], emph: ["upper_chest"], cue: "30° incline, slow stretch at the bottom." }),
  ex("pec_deck", "Pec Deck", "chest_fly", ["chest"], [], ["pec_deck"], { iso: true, bias: "shortened", emph: ["mid_chest"], cue: "Squeeze handles together, slow return." }),
  ex("band_chest_fly", "Band Chest Fly", "chest_fly", ["chest"], [], ["band"], { iso: true, bias: "shortened", emph: ["mid_chest"], cue: "Anchor behind you, squeeze hands together." }),

  // ── Shoulders: vertical press ──────────────────────────────────────────
  ex("overhead_press", "Standing Overhead Press", "vertical_push", ["front_delts"], ["triceps", "side_delts", "abs"], ["barbell", "rack"], { fatigue: 4, skill: 2, anchor: true, joints: ["shoulder", "lower_back"], loaded: true, cue: "Glutes tight, bar travels close to your face." }),
  ex("seated_dumbbell_press", "Seated Dumbbell Shoulder Press", "vertical_push", ["front_delts"], ["triceps", "side_delts"], ["dumbbell", "bench"], { anchor: true, joints: ["shoulder"], loaded: true, cue: "Bench near upright, press without arching." }),
  ex("machine_shoulder_press", "Machine Shoulder Press", "vertical_push", ["front_delts"], ["triceps", "side_delts"], ["shoulder_press_machine"], { fatigue: 2, anchor: true, cue: "Handles start around ear height." }),
  ex("smith_overhead_press", "Smith Machine Shoulder Press", "vertical_push", ["front_delts"], ["triceps", "side_delts"], ["smith", "bench"], { anchor: true, joints: ["shoulder"], cue: "Seated, bar lowers to chin level." }),
  ex("arnold_press", "Arnold Press", "vertical_push", ["front_delts"], ["side_delts", "triceps"], ["dumbbell", "bench"], { skill: 2, level: "intermediate", loaded: true, cue: "Rotate palms out as you press." }),
  ex("pike_push_up", "Pike Push-up", "vertical_push", ["front_delts"], ["triceps", "side_delts"], [], { fatigue: 2, level: "intermediate", anchor: true, cue: "Hips high, head travels in front of your hands." }),
  ex("handstand_push_up", "Wall Handstand Push-up", "vertical_push", ["front_delts"], ["triceps", "side_delts", "traps"], [], { skill: 3, level: "advanced", anchor: true, joints: ["shoulder", "wrist"], cue: "Head to a cushion, tripod position." }),

  // ── Shoulders: raises ──────────────────────────────────────────────────
  ex("dumbbell_lateral_raise", "Dumbbell Lateral Raise", "lateral_raise", ["side_delts"], ["traps"], ["dumbbell"], { iso: true, bias: "shortened", cue: "Lead with elbows, stop at shoulder height." }),
  ex("cable_lateral_raise", "Cable Lateral Raise", "lateral_raise", ["side_delts"], [], ["cable"], { iso: true, bias: "lengthened", uni: true, cue: "Cable from behind your body, raise out to the side." }),
  ex("lean_away_lateral_raise", "Lean-Away Lateral Raise", "lateral_raise", ["side_delts"], [], ["dumbbell"], { iso: true, bias: "lengthened", uni: true, cue: "Hold a post, lean away, raise the far arm." }),
  ex("band_lateral_raise", "Band Lateral Raise", "lateral_raise", ["side_delts"], [], ["band"], { iso: true, bias: "shortened", cue: "Stand on the band, raise to shoulder height." }),
  ex("cable_upright_row", "Cable Upright Row", "lateral_raise", ["side_delts", "traps"], ["biceps"], ["cable"], { iso: true, joints: ["shoulder"], cue: "Wide grip, elbows up to shoulder height." }),
  ex("incline_y_raise", "Incline Y-Raise", "lateral_raise", ["side_delts"], ["rear_delts", "traps"], ["dumbbell", "bench"], { iso: true, bias: "shortened", cue: "Chest on incline bench, raise into a Y." }),
  ex("dumbbell_front_raise", "Dumbbell Front Raise", "front_raise", ["front_delts"], [], ["dumbbell"], { iso: true, cue: "Raise to eye level, no swinging." }),

  // ── Shoulders / upper back: rear delt ──────────────────────────────────
  ex("reverse_pec_deck", "Reverse Pec Deck", "rear_delt_fly", ["rear_delts"], ["upper_back"], ["pec_deck"], { iso: true, cue: "Arms wide, sweep back with a slight bend." }),
  ex("cable_rear_delt_fly", "Cable Rear Delt Fly", "rear_delt_fly", ["rear_delts"], ["upper_back"], ["cable"], { iso: true, bias: "lengthened", cue: "Cross cables, pull out and back." }),
  ex("bent_over_reverse_fly", "Bent-Over Reverse Fly", "rear_delt_fly", ["rear_delts"], ["upper_back"], ["dumbbell"], { iso: true, bias: "shortened", cue: "Hinge forward, raise out to the sides." }),
  ex("face_pull", "Face Pull", "rear_delt_fly", ["rear_delts", "upper_back"], ["traps"], ["cable"], { iso: true, cue: "Rope to forehead, thumbs back." }),
  ex("band_pull_apart", "Band Pull-Apart", "rear_delt_fly", ["rear_delts"], ["upper_back"], ["band"], { iso: true, bias: "shortened", cue: "Arms straight, pull the band to your chest." }),

  // ── Back: vertical pull ────────────────────────────────────────────────
  ex("pull_up", "Pull-up", "vertical_pull", ["lats"], ["biceps", "upper_back", "rear_delts"], ["pullup_bar"], { skill: 2, level: "intermediate", anchor: true, cue: "Dead hang start, chest toward the bar." }),
  ex("chin_up", "Chin-up", "vertical_pull", ["lats", "biceps"], ["upper_back"], ["pullup_bar"], { skill: 2, level: "intermediate", anchor: true, cue: "Palms facing you, elbows drive down." }),
  ex("band_assisted_pull_up", "Band-Assisted Pull-up", "vertical_pull", ["lats"], ["biceps", "upper_back"], ["pullup_bar", "band"], { fatigue: 2, anchor: true, regression: true, cue: "Use the lightest band that allows full range." }),
  ex("lat_pulldown", "Lat Pulldown", "vertical_pull", ["lats"], ["biceps", "upper_back"], ["lat_pulldown"], { fatigue: 2, anchor: true, cue: "Pull to upper chest, slight lean back." }),
  ex("neutral_grip_pulldown", "Neutral-Grip Pulldown", "vertical_pull", ["lats"], ["biceps"], ["lat_pulldown"], { fatigue: 2, bias: "lengthened", anchor: true, emph: ["lower_lats"], cue: "Elbows toward your hips, full stretch at top." }),
  ex("single_arm_cable_pulldown", "Single-Arm Cable Pulldown", "vertical_pull", ["lats"], ["biceps"], ["cable"], { fatigue: 2, bias: "lengthened", uni: true, emph: ["lower_lats"], cue: "Kneel, pull elbow down to your side." }),
  ex("band_pulldown", "Band Lat Pulldown", "vertical_pull", ["lats"], ["biceps"], ["band"], { fatigue: 1, bias: "shortened", cue: "Anchor high, pull elbows to your ribs." }),

  // ── Back: lat isolation ────────────────────────────────────────────────
  ex("straight_arm_pulldown", "Straight-Arm Pulldown", "shoulder_extension", ["lats"], [], ["cable"], { iso: true, emph: ["lower_lats"], cue: "Arms straight, sweep the bar to your thighs." }),
  ex("dumbbell_pullover", "Dumbbell Pullover", "shoulder_extension", ["lats"], ["chest", "triceps"], ["dumbbell", "bench"], { iso: true, bias: "lengthened", joints: ["shoulder"], cue: "Lower behind your head to a deep stretch." }),

  // ── Back: horizontal pull ──────────────────────────────────────────────
  ex("barbell_row", "Barbell Row", "horizontal_pull", ["upper_back", "lats"], ["biceps", "rear_delts", "lower_back"], ["barbell"], { fatigue: 4, skill: 2, anchor: true, joints: ["lower_back"], loaded: true, cue: "Hinge to ~45°, row to your belly button." }),
  ex("one_arm_dumbbell_row", "One-Arm Dumbbell Row", "horizontal_pull", ["lats", "upper_back"], ["biceps", "rear_delts"], ["dumbbell", "bench"], { fatigue: 2, bias: "lengthened", uni: true, anchor: true, loaded: true, cue: "Let the shoulder stretch down, pull to your hip." }),
  ex("chest_supported_row", "Chest-Supported Dumbbell Row", "horizontal_pull", ["upper_back"], ["lats", "rear_delts", "biceps"], ["dumbbell", "bench"], { fatigue: 2, anchor: true, loaded: true, cue: "Chest on incline bench, squeeze shoulder blades." }),
  ex("seated_cable_row", "Seated Cable Row", "horizontal_pull", ["upper_back", "lats"], ["biceps", "rear_delts"], ["cable"], { fatigue: 2, bias: "lengthened", anchor: true, cue: "Reach forward for a stretch, row to your stomach." }),
  ex("machine_row", "Machine Row", "horizontal_pull", ["upper_back"], ["lats", "biceps", "rear_delts"], ["row_machine"], { fatigue: 2, anchor: true, cue: "Chest on pad, drive elbows back." }),
  ex("t_bar_row", "T-Bar Row", "horizontal_pull", ["upper_back", "lats"], ["biceps", "lower_back"], ["barbell", "landmine"], { fatigue: 4, skill: 2, anchor: true, joints: ["lower_back"], loaded: true, cue: "Flat back, pull handle to chest." }),
  ex("inverted_row", "Inverted Row", "horizontal_pull", ["upper_back"], ["lats", "biceps", "rear_delts"], ["rack", "barbell"], { fatigue: 2, anchor: true, cue: "Body straight under a bar, pull chest up to it." }),
  ex("band_row", "Band Row", "horizontal_pull", ["upper_back"], ["lats", "biceps"], ["band"], { fatigue: 1, bias: "shortened", cue: "Anchor at chest height, squeeze shoulder blades." }),

  // ── Traps ──────────────────────────────────────────────────────────────
  ex("barbell_shrug", "Barbell Shrug", "shrug", ["traps"], ["forearms"], ["barbell"], { iso: true, loaded: true, cue: "Shoulders straight up to your ears, pause." }),
  ex("dumbbell_shrug", "Dumbbell Shrug", "shrug", ["traps"], ["forearms"], ["dumbbell"], { iso: true, loaded: true, cue: "Hold the top for a second." }),
  ex("band_shrug", "Band Shrug", "shrug", ["traps"], [], ["band"], { iso: true, cue: "Stand on the band, shrug and hold 2s." }),

  // ── Hinge ──────────────────────────────────────────────────────────────
  ex("conventional_deadlift", "Conventional Deadlift", "hinge", ["hamstrings", "glutes", "lower_back"], ["upper_back", "traps", "forearms", "quads"], ["barbell"], { fatigue: 5, skill: 3, level: "intermediate", anchor: true, joints: ["lower_back"], loaded: true, cue: "Bar over midfoot, push the floor away." }),
  ex("sumo_deadlift", "Sumo Deadlift", "hinge", ["glutes", "adductors", "hamstrings"], ["quads", "lower_back", "traps"], ["barbell"], { fatigue: 5, skill: 3, level: "intermediate", anchor: true, joints: ["lower_back", "hip"], loaded: true, cue: "Wide stance, knees out, chest up." }),
  ex("trap_bar_deadlift", "Trap Bar Deadlift", "hinge", ["glutes", "quads", "hamstrings"], ["lower_back", "traps", "forearms"], ["trap_bar"], { fatigue: 4, skill: 2, anchor: true, joints: ["lower_back"], loaded: true, cue: "Stand in the middle, push through the floor." }),
  ex("romanian_deadlift", "Romanian Deadlift", "hinge", ["hamstrings", "glutes"], ["lower_back", "forearms"], ["barbell"], { fatigue: 4, skill: 2, bias: "lengthened", anchor: true, joints: ["lower_back"], loaded: true, cue: "Soft knees, push hips back until hamstrings stretch." }),
  ex("dumbbell_rdl", "Dumbbell Romanian Deadlift", "hinge", ["hamstrings", "glutes"], ["lower_back"], ["dumbbell"], { bias: "lengthened", anchor: true, joints: ["lower_back"], loaded: true, cue: "Dumbbells slide down your thighs, hips back." }),
  ex("single_leg_rdl", "Single-Leg Romanian Deadlift", "hinge", ["hamstrings", "glutes"], ["lower_back"], ["dumbbell"], { fatigue: 2, skill: 2, bias: "lengthened", uni: true, cue: "Hips square, reach the free leg back." }),
  ex("good_morning", "Good Morning", "hinge", ["hamstrings", "lower_back"], ["glutes"], ["barbell", "rack"], { skill: 2, level: "intermediate", bias: "lengthened", joints: ["lower_back"], loaded: true, cue: "Bar on upper back, hinge with a flat back." }),
  ex("kettlebell_swing", "Kettlebell Swing", "hinge", ["glutes", "hamstrings"], ["lower_back", "abs"], ["kettlebell"], { skill: 2, cue: "Snap hips forward, arms are just ropes." }),
  ex("back_extension", "45° Back Extension", "hinge", ["lower_back", "glutes", "hamstrings"], [], ["back_extension"], { fatigue: 2, cue: "Round slightly for back, stay flat for glutes." }),
  ex("cable_pull_through", "Cable Pull-Through", "hinge", ["glutes", "hamstrings"], [], ["cable"], { fatigue: 2, cue: "Face away from cable, snap hips through." }),

  // ── Hip extension (glutes) ─────────────────────────────────────────────
  ex("barbell_hip_thrust", "Barbell Hip Thrust", "hip_thrust", ["glutes"], ["hamstrings"], ["barbell", "bench"], { bias: "shortened", anchor: true, loaded: true, cue: "Chin tucked, ribs down, lock out with glutes." }),
  ex("smith_hip_thrust", "Smith Machine Hip Thrust", "hip_thrust", ["glutes"], ["hamstrings"], ["smith", "bench"], { bias: "shortened", anchor: true, cue: "Bar over hip crease, pause at the top." }),
  ex("dumbbell_hip_thrust", "Dumbbell Hip Thrust", "hip_thrust", ["glutes"], ["hamstrings"], ["dumbbell", "bench"], { fatigue: 2, bias: "shortened", loaded: true, cue: "Dumbbell on hips, drive through heels." }),
  ex("glute_bridge", "Glute Bridge", "hip_thrust", ["glutes"], ["hamstrings"], [], { fatigue: 1, bias: "shortened", cue: "Feet close, squeeze hard at the top." }),
  ex("single_leg_hip_thrust", "Single-Leg Hip Thrust", "hip_thrust", ["glutes"], ["hamstrings"], ["bench"], { fatigue: 2, bias: "shortened", uni: true, cue: "Back on bench, one foot planted." }),
  ex("cable_kickback", "Cable Glute Kickback", "hip_thrust", ["glutes"], [], ["cable"], { iso: true, uni: true, cue: "Kick back and slightly out, don't arch." }),

  // ── Knee flexion (hamstrings) ──────────────────────────────────────────
  ex("seated_leg_curl", "Seated Leg Curl", "knee_flexion", ["hamstrings"], [], ["leg_curl"], { iso: true, bias: "lengthened", cue: "Lean forward for extra hamstring stretch." }),
  ex("lying_leg_curl", "Lying Leg Curl", "knee_flexion", ["hamstrings"], ["calves"], ["leg_curl"], { iso: true, cue: "Hips pinned to the pad." }),
  ex("nordic_curl", "Nordic Curl", "knee_flexion", ["hamstrings"], [], [], { iso: true, fatigue: 3, skill: 2, level: "advanced", bias: "lengthened", joints: ["knee"], cue: "Anchor your heels, lower as slowly as you can." }),
  ex("slider_leg_curl", "Slider Leg Curl", "knee_flexion", ["hamstrings"], ["glutes"], [], { iso: true, cue: "Hips up, slide heels in on a towel." }),
  ex("band_leg_curl", "Band Leg Curl", "knee_flexion", ["hamstrings"], [], ["band"], { iso: true, bias: "shortened", cue: "Lie face down, curl heels to glutes." }),

  // ── Squat ──────────────────────────────────────────────────────────────
  ex("back_squat", "Barbell Back Squat", "squat", ["quads", "glutes"], ["adductors", "lower_back"], ["barbell", "rack"], { fatigue: 5, skill: 3, anchor: true, joints: ["knee", "lower_back"], loaded: true, cue: "Brace, sit between your hips, knees track over toes." }),
  ex("front_squat", "Front Squat", "squat", ["quads"], ["glutes", "upper_back", "abs"], ["barbell", "rack"], { fatigue: 4, skill: 3, level: "intermediate", anchor: true, joints: ["knee", "wrist"], loaded: true, cue: "Elbows high, stay upright." }),
  ex("goblet_squat", "Goblet Squat", "squat", ["quads", "glutes"], ["adductors", "abs"], ["dumbbell"], { fatigue: 2, anchor: true, loaded: true, cue: "Dumbbell at chest, elbows inside knees." }),
  ex("hack_squat", "Hack Squat", "squat", ["quads"], ["glutes"], ["hack_squat"], { bias: "lengthened", anchor: true, joints: ["knee"], cue: "Feet low on the platform for more quads." }),
  ex("leg_press", "Leg Press", "squat", ["quads", "glutes"], ["adductors"], ["leg_press"], { anchor: true, cue: "Lower until hips start to curl, then drive." }),
  ex("smith_squat", "Smith Machine Squat", "squat", ["quads", "glutes"], ["adductors"], ["smith"], { anchor: true, joints: ["knee"], cue: "Feet slightly forward, sit straight down." }),
  ex("bodyweight_squat", "Bodyweight Squat", "squat", ["quads", "glutes"], [], [], { fatigue: 1, regression: true, cue: "Full depth, slow tempo makes it harder." }),
  ex("cossack_squat", "Cossack Squat", "squat", ["adductors", "quads"], ["glutes"], [], { fatigue: 2, skill: 2, level: "intermediate", bias: "lengthened", uni: true, joints: ["knee", "hip"], cue: "Shift side to side, straight leg toes up." }),

  // ── Single leg ─────────────────────────────────────────────────────────
  ex("bulgarian_split_squat", "Bulgarian Split Squat", "single_leg", ["quads", "glutes"], ["adductors"], ["dumbbell", "bench"], { fatigue: 4, skill: 2, bias: "lengthened", uni: true, anchor: true, loaded: true, cue: "Rear foot on bench, drop straight down." }),
  ex("walking_lunge", "Walking Lunge", "single_leg", ["quads", "glutes"], ["adductors"], ["dumbbell"], { fatigue: 3, uni: true, loaded: true, cue: "Long steps for glutes, short for quads." }),
  ex("reverse_lunge", "Reverse Lunge", "single_leg", ["glutes", "quads"], ["hamstrings"], ["dumbbell"], { uni: true, loaded: true, cue: "Step back, front shin stays vertical." }),
  ex("step_up", "Dumbbell Step-up", "single_leg", ["glutes", "quads"], [], ["dumbbell", "bench"], { uni: true, loaded: true, cue: "Drive through the top foot only." }),
  ex("split_squat", "Split Squat", "single_leg", ["quads", "glutes"], [], [], { fatigue: 2, uni: true, cue: "Back knee lightly taps the floor." }),
  ex("pistol_squat", "Pistol Squat", "single_leg", ["quads", "glutes"], ["abs"], [], { fatigue: 3, skill: 3, level: "advanced", uni: true, joints: ["knee"], cue: "Hold something at first, sit back slowly." }),

  // ── Knee extension (quads) ─────────────────────────────────────────────
  ex("leg_extension", "Leg Extension", "knee_extension", ["quads"], [], ["leg_extension"], { iso: true, bias: "shortened", emph: ["rectus_femoris"], cue: "Lean back to stretch rectus femoris, squeeze at top." }),
  ex("sissy_squat", "Sissy Squat", "knee_extension", ["quads"], [], [], { iso: true, skill: 2, level: "advanced", bias: "lengthened", joints: ["knee"], emph: ["rectus_femoris"], cue: "Knees forward, body leans back in a line." }),
  ex("reverse_nordic", "Reverse Nordic", "knee_extension", ["quads"], [], [], { iso: true, level: "intermediate", bias: "lengthened", joints: ["knee"], emph: ["rectus_femoris"], cue: "Kneel tall, lean back with straight hips." }),

  // ── Adductors / abductors ──────────────────────────────────────────────
  ex("hip_adduction_machine", "Hip Adduction Machine", "hip_adduction", ["adductors"], [], ["hip_ab_ad_machine"], { iso: true, bias: "lengthened", cue: "Start wide, squeeze knees together." }),
  ex("copenhagen_plank", "Copenhagen Plank", "hip_adduction", ["adductors"], ["obliques"], ["bench"], { iso: true, level: "intermediate", cue: "Top leg on bench, lift hips in line." }),
  ex("hip_abduction_machine", "Hip Abduction Machine", "hip_abduction", ["glutes"], [], ["hip_ab_ad_machine"], { iso: true, emph: ["glute_med"], cue: "Lean forward slightly to hit upper glutes." }),
  ex("banded_lateral_walk", "Banded Lateral Walk", "hip_abduction", ["glutes"], [], ["band"], { iso: true, emph: ["glute_med"], cue: "Half squat, step wide, keep tension." }),
  ex("cable_hip_abduction", "Cable Hip Abduction", "hip_abduction", ["glutes"], [], ["cable"], { iso: true, uni: true, emph: ["glute_med"], cue: "Cuff on ankle, sweep leg out to the side." }),

  // ── Calves ─────────────────────────────────────────────────────────────
  ex("standing_calf_raise", "Standing Calf Raise", "calf_raise", ["calves"], [], ["calf_machine"], { iso: true, bias: "lengthened", emph: ["gastrocnemius"], cue: "Pause 2s in the bottom stretch." }),
  ex("seated_calf_raise", "Seated Calf Raise", "calf_raise", ["calves"], [], ["seated_calf_machine"], { iso: true, emph: ["soleus"], cue: "Knees bent targets the soleus." }),
  ex("leg_press_calf_raise", "Leg Press Calf Raise", "calf_raise", ["calves"], [], ["leg_press"], { iso: true, bias: "lengthened", emph: ["gastrocnemius"], cue: "Balls of feet on the edge, full stretch." }),
  ex("smith_calf_raise", "Smith Machine Calf Raise", "calf_raise", ["calves"], [], ["smith"], { iso: true, emph: ["gastrocnemius"], cue: "Stand on a plate for extra range." }),
  ex("single_leg_calf_raise", "Single-Leg Calf Raise", "calf_raise", ["calves"], [], [], { iso: true, bias: "lengthened", uni: true, emph: ["gastrocnemius"], cue: "Off a step, all the way down and up." }),

  // ── Biceps ─────────────────────────────────────────────────────────────
  ex("barbell_curl", "Barbell Curl", "elbow_flexion", ["biceps"], ["forearms"], ["barbell"], { iso: true, loaded: true, cue: "Elbows stay at your sides." }),
  ex("ez_bar_curl", "EZ-Bar Curl", "elbow_flexion", ["biceps"], ["forearms"], ["ez_bar"], { iso: true, joints: [], loaded: true, cue: "Easier on wrists than a straight bar." }),
  ex("dumbbell_curl", "Dumbbell Curl", "elbow_flexion", ["biceps"], ["forearms"], ["dumbbell"], { iso: true, loaded: true, cue: "Supinate (turn pinky up) as you curl." }),
  ex("incline_dumbbell_curl", "Incline Dumbbell Curl", "elbow_flexion", ["biceps"], [], ["dumbbell", "bench"], { iso: true, bias: "lengthened", emph: ["long_head"], loaded: true, cue: "Arms hang behind you for a deep stretch." }),
  ex("hammer_curl", "Hammer Curl", "elbow_flexion", ["biceps", "forearms"], [], ["dumbbell"], { iso: true, emph: ["brachialis"], loaded: true, cue: "Neutral grip, thumbs up." }),
  ex("preacher_curl", "Preacher Curl", "elbow_flexion", ["biceps"], [], ["ez_bar", "preacher_bench"], { iso: true, bias: "lengthened", emph: ["short_head"], loaded: true, cue: "Don't bounce out of the bottom." }),
  ex("cable_curl", "Cable Curl", "elbow_flexion", ["biceps"], ["forearms"], ["cable"], { iso: true, cue: "Constant tension, squeeze at the top." }),
  ex("bayesian_cable_curl", "Bayesian Cable Curl", "elbow_flexion", ["biceps"], [], ["cable"], { iso: true, bias: "lengthened", uni: true, emph: ["long_head"], cue: "Face away from cable, arm behind you." }),
  ex("concentration_curl", "Concentration Curl", "elbow_flexion", ["biceps"], [], ["dumbbell"], { iso: true, bias: "shortened", uni: true, emph: ["short_head"], loaded: true, cue: "Elbow on inner thigh, hard squeeze." }),
  ex("spider_curl", "Spider Curl", "elbow_flexion", ["biceps"], [], ["dumbbell", "bench"], { iso: true, bias: "shortened", emph: ["short_head"], loaded: true, cue: "Chest on incline bench, arms hang straight down." }),
  ex("band_curl", "Band Curl", "elbow_flexion", ["biceps"], [], ["band"], { iso: true, bias: "shortened", cue: "Stand on band, slow negatives." }),
  ex("reverse_curl", "Reverse-Grip Curl", "elbow_flexion", ["forearms", "biceps"], [], ["ez_bar"], { iso: true, emph: ["brachialis"], loaded: true, cue: "Palms down, wrists straight." }),

  // ── Triceps ────────────────────────────────────────────────────────────
  ex("close_grip_bench_press", "Close-Grip Bench Press", "elbow_extension", ["triceps", "chest"], ["front_delts"], ["barbell", "bench", "rack"], { fatigue: 3, skill: 2, joints: ["elbow", "wrist"], loaded: true, cue: "Shoulder-width grip, elbows tucked." }),
  ex("triceps_dip", "Triceps Dip", "elbow_extension", ["triceps"], ["chest", "front_delts"], ["dip_bars"], { fatigue: 3, level: "intermediate", joints: ["shoulder", "elbow"], cue: "Stay upright, elbows back." }),
  ex("rope_pushdown", "Rope Pushdown", "elbow_extension", ["triceps"], [], ["cable"], { iso: true, bias: "shortened", emph: ["lateral_head"], cue: "Spread the rope at the bottom." }),
  ex("overhead_cable_extension", "Overhead Cable Extension", "elbow_extension", ["triceps"], [], ["cable"], { iso: true, bias: "lengthened", emph: ["long_head"], cue: "Face away, elbows by your ears." }),
  ex("skull_crusher", "EZ-Bar Skull Crusher", "elbow_extension", ["triceps"], [], ["ez_bar", "bench"], { iso: true, bias: "lengthened", joints: ["elbow"], emph: ["long_head"], loaded: true, cue: "Lower behind your head, not to your forehead." }),
  ex("overhead_dumbbell_extension", "Overhead Dumbbell Extension", "elbow_extension", ["triceps"], [], ["dumbbell"], { iso: true, bias: "lengthened", joints: ["elbow"], emph: ["long_head"], loaded: true, cue: "Both hands on one dumbbell, deep stretch." }),
  ex("dumbbell_kickback", "Dumbbell Kickback", "elbow_extension", ["triceps"], [], ["dumbbell"], { iso: true, bias: "shortened", emph: ["lateral_head"], loaded: true, cue: "Upper arm parallel to floor, lock out." }),
  ex("bench_dip", "Bench Dip", "elbow_extension", ["triceps"], ["front_delts"], ["bench"], { iso: true, regression: true, joints: ["shoulder"], cue: "Hands behind you on a bench, elbows straight back." }),
  ex("diamond_push_up", "Diamond Push-up", "elbow_extension", ["triceps", "chest"], ["front_delts"], [], { fatigue: 2, level: "intermediate", joints: ["wrist"], cue: "Hands together under your chest." }),
  ex("band_pushdown", "Band Pushdown", "elbow_extension", ["triceps"], [], ["band"], { iso: true, bias: "shortened", emph: ["lateral_head"], cue: "Anchor high, lock out at the bottom." }),

  // ── Forearms / grip ────────────────────────────────────────────────────
  ex("wrist_curl", "Dumbbell Wrist Curl", "wrist_flexion", ["forearms"], [], ["dumbbell"], { iso: true, cue: "Forearms on thighs, curl the wrist only." }),
  ex("farmers_carry", "Farmer's Carry", "carry", ["forearms", "traps"], ["obliques", "abs"], ["dumbbell"], { fatigue: 3, loaded: true, cue: "Heavy, tall posture, short steps." }),
  ex("dead_hang", "Dead Hang", "carry", ["forearms"], ["lats"], ["pullup_bar"], { iso: true, cue: "Hang as long as you can, shoulders active." }),

  // ── Core ───────────────────────────────────────────────────────────────
  ex("cable_crunch", "Cable Crunch", "core_flexion", ["abs"], [], ["cable"], { iso: true, flex: true, cue: "Curl your ribs toward your hips." }),
  ex("hanging_leg_raise", "Hanging Leg Raise", "core_flexion", ["abs"], ["obliques", "forearms"], ["pullup_bar"], { iso: true, flex: true, fatigue: 2, level: "intermediate", cue: "Curl your pelvis up, don't swing." }),
  ex("crunch", "Crunch", "core_flexion", ["abs"], [], [], { iso: true, flex: true, cue: "Short range, exhale hard at the top." }),
  ex("decline_sit_up", "Decline Sit-up", "core_flexion", ["abs"], [], ["bench"], { iso: true, flex: true, bias: "lengthened", cue: "Control the way down." }),
  ex("bicycle_crunch", "Bicycle Crunch", "core_rotation", ["abs", "obliques"], [], [], { iso: true, flex: true, cue: "Slow and deliberate, elbow to opposite knee." }),
  ex("ab_wheel_rollout", "Ab Wheel Rollout", "core_anti_extension", ["abs"], ["lats"], ["ab_wheel"], { iso: true, fatigue: 2, level: "intermediate", bias: "lengthened", joints: ["lower_back"], cue: "Ribs down, roll only as far as you can hold." }),
  ex("plank", "Plank", "core_anti_extension", ["abs"], ["obliques"], [], { iso: true, cue: "Squeeze glutes, push the floor away." }),
  ex("dead_bug", "Dead Bug", "core_anti_extension", ["abs"], [], [], { iso: true, cue: "Lower back flat, extend opposite arm and leg." }),
  ex("hollow_hold", "Hollow Hold", "core_anti_extension", ["abs"], [], [], { iso: true, level: "intermediate", cue: "Lower back glued down, arms overhead." }),
  ex("pallof_press", "Pallof Press", "core_rotation", ["obliques", "abs"], [], ["cable"], { iso: true, cue: "Press out and resist the twist." }),
  ex("cable_woodchop", "Cable Woodchop", "core_rotation", ["obliques"], ["abs"], ["cable"], { iso: true, flex: true, cue: "Rotate through your torso, arms stay long." }),
  ex("side_plank", "Side Plank", "core_rotation", ["obliques"], ["glutes"], [], { iso: true, cue: "Hips high, body in one line." }),
];

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const getExercise = (id) => EXERCISE_BY_ID[id];
