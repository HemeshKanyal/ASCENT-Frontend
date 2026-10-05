/**
 * Step-by-step technique and common mistakes for every exercise in the
 * library (src/engine/exercises.js). Shown on the exercise screen under the
 * demo; the one-line `cue` in the engine stays as the in-workout reminder.
 * A test checks every exercise id has an entry here.
 */

export type HowTo = { steps: string[]; mistakes: string[] };

const h = (steps: string[], mistakes: string[]): HowTo => ({ steps, mistakes });

export const EXERCISE_HOWTO: Record<string, HowTo> = {
  // ── Chest ──────────────────────────────────────────────────────────────
  barbell_bench_press: h(
    ["Lie with eyes under the bar, feet flat and firmly planted.", "Grip slightly wider than shoulders, squeeze shoulder blades together and down.", "Unrack, lower the bar under control to your lower chest, elbows about 45–70° from your body.", "Press up and slightly back over your shoulders, keeping your back and glutes on the bench."],
    ["Bouncing the bar off your chest.", "Flaring elbows straight out to 90°, which strains the shoulders.", "Lifting your hips off the bench to finish a rep."],
  ),
  dumbbell_bench_press: h(
    ["Sit with dumbbells on your thighs, lie back and kick them up to your chest.", "Start with arms straight over your chest, shoulder blades pinched back.", "Lower until you feel a deep chest stretch, elbows slightly tucked.", "Press up and slightly inward until the dumbbells nearly touch."],
    ["Stopping halfway down and missing the stretch.", "Letting the dumbbells drift out wide over your face or belly."],
  ),
  machine_chest_press: h(
    ["Set the seat so the handles line up with your mid-chest.", "Sit with your back on the pad and shoulder blades pulled back.", "Press the handles forward until your arms are nearly straight.", "Return slowly until you feel a stretch across the chest."],
    ["Seat too high or low, shifting work to the shoulders.", "Letting the weight stack slam between reps."],
  ),
  smith_bench_press: h(
    ["Position the bench so the bar lines up with your lower chest.", "Grip just wider than shoulders and pinch your shoulder blades.", "Unhook the bar and lower it under control to your chest.", "Press up to straight arms and re-hook at the end of the set."],
    ["Bench in the wrong spot, so the bar lands on your neck or belly.", "Forgetting to engage the safety hooks when you finish."],
  ),
  decline_dumbbell_press: h(
    ["Set a slight decline and hook your feet under the pads.", "Hold the dumbbells over your lower chest with arms straight.", "Lower them to the sides of your lower chest with a full stretch.", "Press back up toward your lower chest line."],
    ["Using a steep decline that shortens the range.", "Dropping the dumbbells to the floor from a decline instead of bringing them to your chest first."],
  ),
  dumbbell_floor_press: h(
    ["Lie on the floor, knees bent, dumbbells over your chest.", "Lower until your upper arms touch the floor.", "Pause there for a second with no bounce.", "Press back up to straight arms."],
    ["Bouncing elbows off the floor.", "Letting the wrists bend back under the weight."],
  ),
  push_up: h(
    ["Hands just wider than shoulders, body in one straight line from head to heels.", "Brace your abs and squeeze your glutes.", "Lower until your chest almost touches the floor, elbows about 45° from your body.", "Push the floor away to return to the top."],
    ["Hips sagging or piking up.", "Only going halfway down.", "Head dropping toward the floor."],
  ),
  deficit_push_up: h(
    ["Put your hands on plates, blocks or books.", "Set your body in a straight plank line.", "Lower until your chest dips below hand level for a deep stretch.", "Press back up without losing the plank."],
    ["Using a deficit so high it pains the shoulders.", "Hips sagging as you tire."],
  ),
  chest_dip: h(
    ["Support yourself on the bars with straight arms.", "Lean your torso forward and let your legs trail slightly behind.", "Lower until you feel a deep chest stretch, upper arms around parallel.", "Press back up while keeping the forward lean."],
    ["Staying upright, which turns it into a triceps dip.", "Dropping too deep too fast and stressing the shoulders."],
  ),
  incline_barbell_press: h(
    ["Set the bench to 30–45° and lie with eyes under the bar.", "Grip slightly wider than shoulders, shoulder blades pinned.", "Lower the bar to your upper chest, just below the collarbones.", "Press straight up over your shoulders."],
    ["Bench too steep, turning it into a shoulder press.", "Arching your back so much the incline disappears."],
  ),
  incline_dumbbell_press: h(
    ["Set a bench to about 30° and kick the dumbbells up.", "Start over your upper chest, shoulder blades back.", "Lower to a deep stretch beside your upper chest.", "Press up and slightly in."],
    ["Too steep an incline.", "Clashing the dumbbells at the top and losing tension."],
  ),
  incline_smith_press: h(
    ["Place an incline bench so the bar meets your upper chest.", "Grip just wider than shoulders, elbows about 45° from your torso.", "Lower the bar to your upper chest under control.", "Press up to full arm extension."],
    ["Bench placed so the bar lands on your neck.", "Elbows flaring straight out."],
  ),
  incline_machine_press: h(
    ["Set the seat low so the handles start at upper-chest height.", "Sit back with your chest up and shoulder blades pulled back.", "Press up and out until your arms are nearly straight.", "Return slowly for a full stretch."],
    ["Seat too high, so it hits mostly shoulders.", "Shrugging your shoulders toward your ears."],
  ),
  decline_push_up: h(
    ["Put your feet on a bench and hands on the floor.", "Brace so your body is a straight line.", "Lower your chest toward the floor.", "Press back up, keeping hips level."],
    ["Hips sagging toward the floor.", "Elbows flaring straight out."],
  ),
  landmine_press: h(
    ["Hold the end of a landmine bar at shoulder height in one hand.", "Stagger your stance and brace your core.", "Press the bar up and forward until your arm is straight.", "Reach a little at the top, then lower under control."],
    ["Leaning back to push the weight.", "Twisting your torso to finish the rep."],
  ),
  cable_fly: h(
    ["Set the pulleys at shoulder height and step forward with a staggered stance.", "Keep a soft bend in your elbows, arms open wide.", "Bring your hands together in a wide arc, like hugging a big tree.", "Let the cables pull your arms back to a full stretch."],
    ["Bending the elbows more and turning it into a press.", "Going so far back that it pinches the shoulders."],
  ),
  low_to_high_cable_fly: h(
    ["Set the pulleys low and stand between them.", "Start with arms down and out, elbows soft.", "Sweep up and in to chin height.", "Squeeze, then lower slowly."],
    ["Shrugging as you lift.", "Using momentum from the legs."],
  ),
  high_to_low_cable_fly: h(
    ["Set the pulleys high and step forward.", "Start with arms up and out, elbows soft.", "Sweep down and in toward your hips.", "Squeeze, then return slowly to the stretch."],
    ["Leaning too far forward and pulling with body weight.", "Bending the elbows into a pushdown."],
  ),
  dumbbell_fly: h(
    ["Lie on a flat bench with dumbbells over your chest, palms facing.", "Keep a slight, fixed bend in your elbows.", "Open your arms in a wide arc until you feel a strong stretch.", "Bring them back together along the same arc."],
    ["Lowering past a comfortable stretch.", "Straight, locked elbows that strain the joint."],
  ),
  incline_dumbbell_fly: h(
    ["Set a bench to about 30°.", "Start with dumbbells over your upper chest, elbows soft.", "Lower slowly in a wide arc to a stretch.", "Squeeze back up along the same path."],
    ["Using weights so heavy the arc becomes a press.", "Rushing the stretch at the bottom."],
  ),
  pec_deck: h(
    ["Set the seat so the handles are at chest height.", "Sit tall with your back on the pad.", "Squeeze the handles together in front of your chest.", "Return slowly until you feel a stretch."],
    ["Letting the weight yank your arms back.", "Pushing with the hands instead of squeezing with the chest."],
  ),
  band_chest_fly: h(
    ["Anchor a band behind you at chest height and hold an end in each hand.", "Step forward until there's tension, arms open wide.", "Bring your hands together in front of your chest.", "Open back up slowly."],
    ["Standing too close, so the band goes slack.", "Shrugging the shoulders."],
  ),

  // ── Shoulders ──────────────────────────────────────────────────────────
  overhead_press: h(
    ["Unrack the bar at your collarbones, grip just outside shoulders.", "Squeeze your glutes and brace your abs.", "Press the bar straight up, moving your head back slightly so the bar passes close to your face.", "Lock out overhead with the bar over your mid-foot, then lower to your collarbones."],
    ["Leaning back and turning it into an incline press.", "Pressing the bar out in front instead of straight up."],
  ),
  seated_dumbbell_press: h(
    ["Set a bench near upright and sit with dumbbells at shoulder height.", "Keep your back against the pad and ribs down.", "Press up until your arms are straight over your shoulders.", "Lower back to about ear level."],
    ["Arching the lower back off the pad.", "Cutting the range short at the bottom."],
  ),
  machine_shoulder_press: h(
    ["Adjust the seat so the handles start around ear height.", "Sit tall with your back on the pad.", "Press up to nearly straight arms.", "Lower slowly to the start."],
    ["Seat too low or high for your shoulders.", "Arching away from the backrest."],
  ),
  smith_overhead_press: h(
    ["Place an upright bench under the Smith bar.", "Grip just wider than shoulders.", "Unhook and lower the bar to chin level.", "Press up to straight arms."],
    ["Bench too far forward so the bar hits your face.", "Lowering behind the neck."],
  ),
  arnold_press: h(
    ["Sit upright holding dumbbells in front of your shoulders, palms facing you.", "As you press up, rotate your palms to face forward.", "Finish with arms straight overhead.", "Reverse the rotation on the way down."],
    ["Rushing the rotation.", "Arching the lower back."],
  ),
  pike_push_up: h(
    ["Start in a push-up position, then walk your feet in and push your hips high.", "Hands about shoulder-width apart.", "Bend your elbows and lower the top of your head toward a spot just in front of your hands.", "Press back up to straight arms."],
    ["Letting the hips drop so it becomes a push-up.", "Elbows flaring straight out."],
  ),
  handstand_push_up: h(
    ["Kick up into a handstand facing a wall, hands shoulder-width.", "Put a cushion under your head.", "Lower until your head lightly touches, hands and head forming a triangle.", "Press back up to straight arms."],
    ["Trying it before you can hold a wall handstand.", "Letting the back arch heavily against the wall."],
  ),
  dumbbell_lateral_raise: h(
    ["Stand tall with dumbbells at your sides, slight bend in the elbows.", "Raise the dumbbells out to the sides, leading with your elbows.", "Stop at shoulder height.", "Lower slowly."],
    ["Swinging the weights up with your body.", "Shrugging so the traps take over."],
  ),
  cable_lateral_raise: h(
    ["Set the pulley low and stand side-on, cable crossing in front of or behind you.", "Hold the handle with the far hand.", "Raise your arm out to the side to shoulder height.", "Lower under control."],
    ["Leaning away and jerking the cable.", "Raising above shoulder height with a shrug."],
  ),
  lean_away_lateral_raise: h(
    ["Hold a post with one hand and lean away from it.", "Hold a dumbbell in the other hand by your side.", "Raise it out to the side to shoulder height.", "Lower slowly, keeping the lean."],
    ["Standing upright, which removes the benefit.", "Using a weight too heavy to control."],
  ),
  band_lateral_raise: h(
    ["Stand on the middle of a band, holding an end in each hand.", "Keep a soft bend in your elbows.", "Raise your arms out to the sides to shoulder height.", "Lower slowly against the band."],
    ["Letting the band snap your arms down.", "Shrugging the shoulders."],
  ),
  cable_upright_row: h(
    ["Attach a bar to a low pulley and take a wide grip.", "Stand tall close to the stack.", "Pull your elbows up and out to shoulder height.", "Lower under control."],
    ["Using a narrow grip, which can pinch the shoulders.", "Pulling the elbows above shoulder height."],
  ),
  incline_y_raise: h(
    ["Lie chest-down on an incline bench with light dumbbells.", "Let your arms hang straight, thumbs up.", "Raise your arms up and out into a Y shape.", "Lower slowly."],
    ["Using weights too heavy for the small muscles involved.", "Lifting your chest off the bench."],
  ),
  dumbbell_front_raise: h(
    ["Stand tall with dumbbells in front of your thighs.", "Keep a slight bend in your elbows.", "Raise the dumbbells forward to eye level.", "Lower slowly."],
    ["Swinging with the hips.", "Leaning back to lift."],
  ),
  reverse_pec_deck: h(
    ["Sit facing the pec deck pad, handles at shoulder height.", "Grip the handles with a slight bend in your elbows.", "Sweep your arms out and back.", "Return slowly."],
    ["Squeezing the shoulder blades hard so the upper back takes over.", "Jerking the weight."],
  ),
  cable_rear_delt_fly: h(
    ["Set two pulleys at shoulder height and cross the cables, left hand on right cable.", "Stand in the middle with arms in front.", "Pull your arms out and back in a wide arc.", "Return slowly to crossed arms."],
    ["Bending the elbows into a row.", "Leaning back to move the weight."],
  ),
  bent_over_reverse_fly: h(
    ["Hinge forward with a flat back, dumbbells hanging under your chest.", "Keep a slight bend in your elbows.", "Raise the dumbbells out to the sides.", "Lower slowly."],
    ["Standing up as you lift.", "Using momentum."],
  ),
  face_pull: h(
    ["Set a rope at head height and grip with thumbs toward you.", "Step back so there's tension.", "Pull the rope toward your forehead, spreading the ends apart.", "Finish with your thumbs pointing back, then return slowly."],
    ["Pulling to your chest instead of your face.", "Leaning back and using body weight."],
  ),
  band_pull_apart: h(
    ["Hold a band in front of your chest with straight arms.", "Pull the band apart by moving your hands out to the sides.", "Bring it to your chest.", "Return slowly."],
    ["Bending the elbows.", "Arching the lower back."],
  ),

  // ── Back ───────────────────────────────────────────────────────────────
  pull_up: h(
    ["Hang from the bar with an overhand grip a bit wider than shoulders.", "Pull your shoulder blades down to start.", "Pull until your chin is over the bar, chest toward it.", "Lower all the way to a dead hang."],
    ["Kicking or swinging.", "Half reps without a full hang."],
  ),
  chin_up: h(
    ["Hang with palms facing you, hands shoulder-width.", "Set your shoulders down and back.", "Drive your elbows down to pull your chin over the bar.", "Lower all the way down."],
    ["Craning the neck to get the chin over.", "Not lowering fully."],
  ),
  band_assisted_pull_up: h(
    ["Loop a band over the bar and put a knee or foot in it.", "Hang with straight arms.", "Pull up until your chin clears the bar.", "Lower slowly to a full hang."],
    ["Using a band so strong you barely work.", "Letting the band bounce you up."],
  ),
  lat_pulldown: h(
    ["Sit with thighs under the pads, grip a bit wider than shoulders.", "Lean back slightly.", "Pull the bar to your upper chest, driving elbows down.", "Let it rise until your arms are fully stretched."],
    ["Pulling behind the neck.", "Leaning way back and rowing."],
  ),
  neutral_grip_pulldown: h(
    ["Attach a neutral (palms-facing) handle and sit under it.", "Start with arms fully stretched.", "Pull elbows down toward your hips.", "Return to a full stretch."],
    ["Cutting the stretch at the top.", "Using body momentum."],
  ),
  single_arm_cable_pulldown: h(
    ["Kneel beside a high pulley, holding the handle in one hand.", "Start with your arm stretched up.", "Pull your elbow down to your side.", "Return slowly to the stretch."],
    ["Twisting your torso to pull.", "Short range."],
  ),
  band_pulldown: h(
    ["Anchor a band high and kneel or sit facing it.", "Hold the ends with arms stretched up.", "Pull your elbows down toward your ribs.", "Let your arms rise slowly."],
    ["Too little tension at the top.", "Shrugging the shoulders."],
  ),
  straight_arm_pulldown: h(
    ["Face a high pulley with a bar or rope, arms straight in front.", "Hinge slightly at the hips.", "Sweep the bar down to your thighs, arms straight.", "Return slowly to the stretch."],
    ["Bending the elbows.", "Rocking the body."],
  ),
  dumbbell_pullover: h(
    ["Lie on a bench holding one dumbbell over your chest with both hands.", "Keep a slight bend in the elbows.", "Lower the dumbbell behind your head to a deep stretch.", "Pull it back over your chest."],
    ["Going deeper than your shoulders allow.", "Bending the elbows a lot, turning it into a triceps move."],
  ),
  barbell_row: h(
    ["Hinge to about 45° with a flat back, bar hanging at arm's length.", "Brace your core.", "Row the bar to your belly button.", "Lower under control."],
    ["Standing up as you row.", "Rounding the lower back."],
  ),
  one_arm_dumbbell_row: h(
    ["Put one hand and knee on a bench, back flat.", "Hold a dumbbell hanging below your shoulder.", "Pull it toward your hip, elbow close to your body.", "Lower to a full stretch."],
    ["Twisting the torso to lift.", "Pulling to the chest instead of the hip."],
  ),
  chest_supported_row: h(
    ["Lie chest-down on an incline bench with dumbbells hanging.", "Row both dumbbells up.", "Squeeze your shoulder blades together.", "Lower fully."],
    ["Lifting the chest off the pad.", "Shrugging instead of rowing."],
  ),
  seated_cable_row: h(
    ["Sit with feet on the platform and knees soft.", "Reach forward with a tall chest for a stretch.", "Row the handle to your stomach.", "Return slowly."],
    ["Rocking far back and forth.", "Rounding the back."],
  ),
  machine_row: h(
    ["Set the chest pad so you can reach the handles at full stretch.", "Keep your chest on the pad.", "Drive your elbows back.", "Return slowly."],
    ["Coming off the pad.", "Shortening the range."],
  ),
  t_bar_row: h(
    ["Straddle the bar with a hinge and a flat back.", "Grip the handle.", "Row it to your chest.", "Lower under control."],
    ["Rounding the back.", "Standing up too much."],
  ),
  inverted_row: h(
    ["Set a bar at waist height and hang underneath, body straight.", "Grip about shoulder-width.", "Pull your chest up to the bar.", "Lower to straight arms."],
    ["Hips sagging.", "Not pulling all the way up."],
  ),
  band_row: h(
    ["Anchor a band at chest height.", "Step back for tension.", "Row your hands to your ribs.", "Return slowly."],
    ["Leaning back to pull.", "Shrugging."],
  ),
  barbell_shrug: h(
    ["Hold a barbell in front of your thighs, arms straight.", "Lift your shoulders straight up toward your ears.", "Pause.", "Lower slowly."],
    ["Rolling the shoulders.", "Bending the elbows."],
  ),
  dumbbell_shrug: h(
    ["Hold dumbbells at your sides.", "Shrug straight up.", "Hold the top for a second.", "Lower slowly."],
    ["Rolling the shoulders.", "Bouncing."],
  ),
  band_shrug: h(
    ["Stand on a band, holding the ends at your sides.", "Shrug up.", "Hold two seconds.", "Lower slowly."],
    ["Bending the elbows.", "Too little band tension."],
  ),

  // ── Hinge & glutes ─────────────────────────────────────────────────────
  conventional_deadlift: h(
    ["Stand with the bar over your mid-foot, feet hip-width.", "Hinge down and grip just outside your legs, shins touching the bar.", "Flatten your back, brace, and push the floor away.", "Stand tall, then lower by pushing hips back first."],
    ["Rounding the lower back.", "Jerking the bar off the floor.", "Bar drifting away from the legs."],
  ),
  sumo_deadlift: h(
    ["Take a wide stance with toes turned out.", "Grip inside your knees, chest up.", "Push your knees out and drive through the floor.", "Lock out with hips and knees together."],
    ["Knees caving in.", "Hips shooting up first."],
  ),
  trap_bar_deadlift: h(
    ["Stand in the middle of the trap bar.", "Hinge and grip the handles.", "Brace and push through the floor.", "Stand tall, then lower."],
    ["Rounding the back.", "Squatting too low."],
  ),
  romanian_deadlift: h(
    ["Hold the bar at your hips, knees soft.", "Push your hips back, sliding the bar down your thighs.", "Stop when your hamstrings are stretched, back still flat.", "Drive your hips forward to stand."],
    ["Bending the knees into a squat.", "Rounding the back to reach lower."],
  ),
  dumbbell_rdl: h(
    ["Hold dumbbells in front of your thighs.", "Push your hips back, dumbbells close to your legs.", "Lower to a hamstring stretch.", "Stand by squeezing your glutes."],
    ["Letting the dumbbells drift forward.", "Rounding the back."],
  ),
  single_leg_rdl: h(
    ["Stand on one leg with a dumbbell in the opposite hand.", "Hinge forward and reach the free leg back.", "Keep hips square to the floor.", "Return to standing."],
    ["Opening the hips toward the side.", "Rushing and losing balance."],
  ),
  good_morning: h(
    ["Bar on your upper back, knees soft.", "Push your hips back and lower your chest.", "Stop at a hamstring stretch with a flat back.", "Drive hips forward to stand."],
    ["Rounding the back.", "Going too heavy."],
  ),
  kettlebell_swing: h(
    ["Hike the kettlebell back between your legs.", "Snap your hips forward to swing it to chest height.", "Let your arms stay loose like ropes.", "Let it fall back and repeat."],
    ["Squatting instead of hinging.", "Lifting with the arms."],
  ),
  back_extension: h(
    ["Set the pad just below your hips.", "Lower your torso toward the floor.", "Raise up until your body is straight.", "Don't hyperextend."],
    ["Swinging up fast.", "Over-arching at the top."],
  ),
  cable_pull_through: h(
    ["Face away from a low pulley holding a rope between your legs.", "Hinge back until your hamstrings stretch.", "Snap your hips forward to stand.", "Squeeze the glutes."],
    ["Pulling with the arms.", "Squatting instead of hinging."],
  ),
  barbell_hip_thrust: h(
    ["Sit with upper back on a bench and the bar over your hip crease.", "Feet flat, shins vertical at the top.", "Drive through your heels, chin tucked, ribs down.", "Lock out with glutes, then lower."],
    ["Arching the lower back to finish.", "Feet too far or too close."],
  ),
  smith_hip_thrust: h(
    ["Set the bench under the Smith bar.", "Bar over your hip crease.", "Drive up and pause at the top.", "Lower under control."],
    ["Arching the back.", "Rushing the reps."],
  ),
  dumbbell_hip_thrust: h(
    ["Upper back on a bench, dumbbell on your hips.", "Feet flat.", "Drive through your heels.", "Squeeze at the top and lower."],
    ["Pushing through the toes.", "Over-arching."],
  ),
  glute_bridge: h(
    ["Lie on your back, knees bent, feet close.", "Brace your abs.", "Push your hips up and squeeze.", "Lower slowly."],
    ["Arching the lower back.", "Pushing through the toes."],
  ),
  single_leg_hip_thrust: h(
    ["Upper back on a bench, one foot planted.", "Lift the other leg.", "Drive up through the planted heel.", "Lower slowly."],
    ["Hips tilting to one side.", "Rushing the reps."],
  ),
  cable_kickback: h(
    ["Attach a cuff to your ankle at a low pulley.", "Hold the machine and hinge slightly.", "Kick back and slightly out.", "Return slowly."],
    ["Arching the lower back.", "Swinging the leg."],
  ),

  // ── Hamstrings ─────────────────────────────────────────────────────────
  seated_leg_curl: h(
    ["Set the back pad so your knees line up with the machine's pivot and the leg pad sits just above your heels.", "Lock the thigh pad down and lean your torso forward slightly for extra hamstring stretch.", "Curl your heels down and under the seat as far as you can.", "Let the pad rise slowly until your legs are almost straight."],
    ["Knees not lined up with the pivot, which strains the joint.", "Letting the weight drop back fast and losing the stretch."],
  ),
  lying_leg_curl: h(
    ["Lie face down with your knees just off the bench edge and the pad above your heels.", "Hold the handles and press your hips into the pad.", "Curl your heels toward your glutes.", "Lower slowly until your legs are nearly straight."],
    ["Hips lifting off the pad to cheat the weight up.", "Jerking the first part of the rep."],
  ),
  nordic_curl: h(
    ["Kneel on a pad with your heels anchored under something solid or held by a partner.", "Keep a straight line from knees to shoulders and squeeze your glutes.", "Lean forward as slowly as you can, fighting the fall with your hamstrings.", "Catch yourself with your hands, push lightly off the floor and pull back up."],
    ["Bending at the hips, which takes the hamstrings out of it.", "Dropping quickly instead of fighting the lowering."],
  ),
  slider_leg_curl: h(
    ["Lie on your back with your heels on sliders or a towel on a smooth floor.", "Lift your hips into a bridge.", "Keeping hips up, slide your heels in toward your glutes.", "Slide them back out slowly to almost straight legs."],
    ["Hips dropping as the legs straighten.", "Rushing the slide back out, which is the hardest and most useful part."],
  ),
  band_leg_curl: h(
    ["Anchor a band low and loop it around your ankles.", "Lie face down with enough distance for tension when legs are straight.", "Curl your heels toward your glutes.", "Lower slowly against the band."],
    ["Lifting the hips off the floor.", "Lying too close, so there's no tension at the start."],
  ),

  // ── Quads ──────────────────────────────────────────────────────────────
  back_squat: h(
    ["Set the bar across your upper back, not your neck, and step back with feet about shoulder-width.", "Take a big breath and brace your abs like you're about to be punched.", "Sit down between your hips, knees tracking over your toes, to at least thighs parallel.", "Drive up through your whole foot, keeping your chest up."],
    ["Knees caving inward on the way up.", "Heels lifting off the floor.", "Losing your brace and rounding at the bottom."],
  ),
  front_squat: h(
    ["Rest the bar on the front of your shoulders, fingertips under it, elbows pointing forward and high.", "Brace your core and keep your chest tall.", "Squat straight down, staying as upright as possible.", "Drive up, leading with your elbows."],
    ["Elbows dropping, which rolls the bar forward.", "Leaning forward like a back squat."],
  ),
  goblet_squat: h(
    ["Hold a dumbbell vertically against your chest.", "Stand with feet shoulder-width, toes slightly out.", "Squat down between your legs, elbows brushing the inside of your knees.", "Stand up tall, squeezing your glutes at the top."],
    ["Letting the dumbbell pull your chest forward.", "Heels lifting at the bottom."],
  ),
  hack_squat: h(
    ["Step in with your back flat on the pad and shoulders under the pads.", "Place feet shoulder-width, lower on the platform for more quads.", "Release the safety handles and lower until your thighs are at least parallel.", "Drive back up without locking your knees hard."],
    ["Cutting the depth short.", "Forgetting to re-engage the safeties."],
  ),
  leg_press: h(
    ["Sit with your back flat and feet shoulder-width in the middle of the platform.", "Release the safeties and hold the handles.", "Lower the platform until your knees are deeply bent, stopping before your lower back starts to curl.", "Press back up, keeping a slight bend at the top."],
    ["Locking the knees hard at the top.", "Lowering so deep your hips roll off the seat."],
  ),
  smith_squat: h(
    ["Set the bar on your upper back with your feet slightly in front of you.", "Unhook the bar and brace.", "Sit straight down, knees tracking over toes.", "Drive back up and re-hook at the end of the set."],
    ["Feet directly under the bar, which pushes the knees far forward.", "Not engaging the hooks after the set."],
  ),
  bodyweight_squat: h(
    ["Stand with feet shoulder-width, toes slightly out.", "Reach your arms forward for balance.", "Sit down to full depth, slowly.", "Stand up and squeeze your glutes."],
    ["Heels lifting.", "Knees caving inward."],
  ),
  cossack_squat: h(
    ["Take a very wide stance with toes slightly out.", "Shift your weight to one side, bending that knee deeply.", "Keep the other leg straight with its toes pointing up.", "Push back through the middle and shift to the other side."],
    ["Lifting the heel of the bent leg.", "Rounding your back to get lower."],
  ),
  bulgarian_split_squat: h(
    ["Stand about two feet in front of a bench and rest the top of your rear foot on it.", "Hold dumbbells at your sides.", "Drop straight down until your rear knee nearly touches the floor.", "Drive up through your front foot."],
    ["Front foot too close to the bench, cramping the knee.", "Pushing up with the back leg."],
  ),
  walking_lunge: h(
    ["Hold dumbbells at your sides and stand tall.", "Take a long step forward.", "Lower your back knee toward the floor, front knee over your foot.", "Drive up through the front foot and step through into the next lunge."],
    ["Front knee caving inward.", "Short, choppy steps that load only the knees."],
  ),
  reverse_lunge: h(
    ["Stand tall holding dumbbells.", "Step one foot back.", "Lower your back knee toward the floor, front shin staying near vertical.", "Push through the front heel to return."],
    ["Leaning far forward over the front leg.", "Front knee drifting inward."],
  ),
  step_up: h(
    ["Stand facing a knee-height bench holding dumbbells.", "Place your whole foot on the bench.", "Drive through that foot to stand up on top.", "Step down slowly with the other foot."],
    ["Pushing off the bottom foot to cheat.", "Using a bench so high your hip drops."],
  ),
  split_squat: h(
    ["Take a long staggered stance, back heel lifted.", "Keep your torso tall.", "Lower until your back knee lightly taps the floor.", "Drive up through the front foot."],
    ["Front knee caving in.", "Stance too short."],
  ),
  pistol_squat: h(
    ["Stand on one leg with the other straight out in front.", "Hold a doorframe or post at first.", "Sit back and down slowly on the standing leg.", "Drive back up to standing."],
    ["Heel lifting off the floor.", "Dropping into the bottom without control."],
  ),
  leg_extension: h(
    ["Set the back pad so your knees line up with the pivot and the pad sits above your ankles.", "Sit back, or lean back slightly for more stretch on the front of the thigh.", "Extend your legs until straight and squeeze.", "Lower slowly."],
    ["Swinging the weight up.", "Letting it crash down."],
  ),
  sissy_squat: h(
    ["Hold onto something solid for balance.", "Rise onto your toes and push your knees forward.", "Lean back so your knees, hips and shoulders stay in a line.", "Return by driving your knees back."],
    ["Bending at the hips.", "Going too deep before your knees are ready."],
  ),
  reverse_nordic: h(
    ["Kneel tall on a pad, knees hip-width.", "Squeeze your glutes so your hips stay straight.", "Lean back slowly as one unit.", "Pull back up with your thighs."],
    ["Bending at the hips.", "Leaning back further than you can return from."],
  ),

  // ── Hips ───────────────────────────────────────────────────────────────
  hip_adduction_machine: h(
    ["Sit with the pads against the inside of your knees, starting at a comfortable wide stretch.", "Sit tall and hold the handles.", "Squeeze your knees together.", "Open back up slowly."],
    ["Starting wider than your hips comfortably allow.", "Letting the pads snap back open."],
  ),
  copenhagen_plank: h(
    ["Lie on your side and rest your top foot or knee on a bench.", "Prop up on your forearm.", "Lift your hips so your body is a straight line.", "Hold, then switch sides."],
    ["Hips sagging.", "Starting with the full-leg version before the knee version."],
  ),
  hip_abduction_machine: h(
    ["Sit with the pads on the outside of your knees.", "Lean forward slightly for more upper glute.", "Push your knees out as far as you can.", "Return slowly."],
    ["Using momentum.", "Only moving partway."],
  ),
  banded_lateral_walk: h(
    ["Loop a band around your knees or ankles.", "Sit into a half squat.", "Step sideways wide, then bring the other foot only partway.", "Keep tension on the band the whole time."],
    ["Standing up tall.", "Letting the feet snap together."],
  ),
  cable_hip_abduction: h(
    ["Attach an ankle cuff to a low pulley and stand side-on, cuffed leg furthest away.", "Hold the machine for balance.", "Sweep your leg out to the side.", "Return slowly."],
    ["Leaning the torso to lift the leg.", "Swinging."],
  ),

  // ── Calves ─────────────────────────────────────────────────────────────
  standing_calf_raise: h(
    ["Put your shoulders under the pads and the balls of your feet on the edge.", "Lower your heels to a deep stretch.", "Pause two seconds at the bottom.", "Rise as high as you can and squeeze."],
    ["Bouncing out of the bottom.", "Bending the knees to help."],
  ),
  seated_calf_raise: h(
    ["Sit with the pad on your lower thighs and balls of feet on the edge.", "Release the lock and lower your heels.", "Rise as high as you can.", "Pause at the top."],
    ["Bouncing.", "Short range."],
  ),
  leg_press_calf_raise: h(
    ["Sit in the leg press with the balls of your feet on the bottom edge.", "Keep your knees straight but not locked.", "Let the platform push your toes back for a stretch.", "Press the platform away with your toes."],
    ["Bending the knees.", "Feet slipping off the edge — go slowly."],
  ),
  smith_calf_raise: h(
    ["Stand on a plate under the Smith bar, balls of feet on the edge.", "Unhook the bar.", "Lower your heels to a stretch.", "Rise all the way up and pause."],
    ["Bouncing.", "Bending the knees."],
  ),
  single_leg_calf_raise: h(
    ["Stand on one foot on a step, lightly holding something for balance.", "Lower your heel all the way.", "Rise all the way onto your toes.", "Repeat, then switch."],
    ["Short range.", "Leaning heavily on the support."],
  ),

  // ── Arms ───────────────────────────────────────────────────────────────
  barbell_curl: h(
    ["Hold the bar at your thighs, palms forward, hands shoulder-width.", "Pin your elbows at your sides.", "Curl the bar up to your shoulders.", "Lower slowly to straight arms."],
    ["Swinging the body.", "Elbows drifting forward."],
  ),
  ez_bar_curl: h(
    ["Grip the angled sections of the EZ bar.", "Keep your elbows at your sides.", "Curl up to your shoulders.", "Lower slowly."],
    ["Swinging.", "Stopping short of straight arms."],
  ),
  dumbbell_curl: h(
    ["Hold dumbbells at your sides, palms in.", "Curl up while turning your palms to face up, pinky higher.", "Squeeze at the top.", "Lower slowly."],
    ["Swinging.", "Elbows moving forward."],
  ),
  incline_dumbbell_curl: h(
    ["Sit back on a bench set to 45–60°.", "Let your arms hang straight down behind your body.", "Curl up without moving your elbows forward.", "Lower to a full stretch."],
    ["Shoulders rolling forward off the bench.", "Short range at the bottom."],
  ),
  hammer_curl: h(
    ["Hold dumbbells at your sides with palms facing in.", "Keep your elbows at your sides.", "Curl up, thumbs leading.", "Lower slowly."],
    ["Swinging.", "Rotating the wrists."],
  ),
  preacher_curl: h(
    ["Sit at the preacher bench with the backs of your upper arms on the pad.", "Lower until your arms are nearly straight.", "Curl up.", "Lower under control without bouncing."],
    ["Bouncing out of the bottom.", "Lifting your elbows off the pad."],
  ),
  cable_curl: h(
    ["Face a low pulley holding a bar.", "Keep your elbows at your sides.", "Curl up.", "Squeeze at the top and lower slowly."],
    ["Leaning back.", "Elbows moving forward."],
  ),
  bayesian_cable_curl: h(
    ["Face away from a low pulley, handle in one hand, arm behind your body.", "Step forward until you feel a biceps stretch.", "Curl up, keeping your elbow back.", "Return slowly to the stretch."],
    ["Letting the elbow swing forward.", "Short range."],
  ),
  concentration_curl: h(
    ["Sit and brace the back of your elbow against your inner thigh.", "Let the dumbbell hang.", "Curl up and squeeze hard.", "Lower slowly."],
    ["Using the shoulder to lift.", "Rushing."],
  ),
  spider_curl: h(
    ["Lie chest-down on an incline bench.", "Let your arms hang straight down.", "Curl up, keeping your upper arms still.", "Lower slowly."],
    ["Swinging.", "Elbows moving."],
  ),
  band_curl: h(
    ["Stand on a band, holding the ends.", "Keep your elbows at your sides.", "Curl up.", "Lower slowly — the band pulls hardest at the top."],
    ["Fast negatives.", "Swinging."],
  ),
  reverse_curl: h(
    ["Hold the bar palms down, hands shoulder-width.", "Keep your wrists straight.", "Curl up.", "Lower slowly."],
    ["Wrists bending.", "Swinging."],
  ),
  close_grip_bench_press: h(
    ["Lie under the bar and grip about shoulder-width.", "Keep your elbows tucked close to your sides.", "Lower the bar to your lower chest.", "Press up to straight arms."],
    ["Grip too narrow, straining the wrists.", "Flaring the elbows."],
  ),
  triceps_dip: h(
    ["Support yourself on dip bars with straight arms.", "Stay upright, legs under you.", "Lower with your elbows pointing straight back.", "Press up to straight arms."],
    ["Leaning forward, which shifts to chest.", "Going deeper than the shoulders tolerate."],
  ),
  rope_pushdown: h(
    ["Grip a rope on a high pulley, elbows at your sides.", "Push down until your arms are straight.", "Spread the rope ends apart at the bottom.", "Return slowly to about 90°."],
    ["Elbows moving forward and back.", "Leaning over the rope to push with body weight."],
  ),
  overhead_cable_extension: h(
    ["Face away from a cable, rope behind your head, staggered stance.", "Keep your elbows by your ears.", "Extend your arms forward and up.", "Return slowly to a deep stretch."],
    ["Elbows flaring out.", "Arching your lower back."],
  ),
  skull_crusher: h(
    ["Lie on a bench holding the bar over your shoulders.", "Bend only at the elbows, lowering the bar behind your head.", "Extend back up.", "Keep your upper arms still."],
    ["Lowering to the forehead.", "Elbows flaring wide."],
  ),
  overhead_dumbbell_extension: h(
    ["Hold one dumbbell with both hands overhead.", "Lower it behind your head, elbows pointing up.", "Extend back up.", "Keep your elbows in."],
    ["Elbows flaring.", "Arching the back."],
  ),
  dumbbell_kickback: h(
    ["Hinge forward with a flat back, upper arm parallel to the floor.", "Extend your arm straight back.", "Lock out and squeeze.", "Return slowly."],
    ["Upper arm dropping as you tire.", "Swinging the weight."],
  ),
  bench_dip: h(
    ["Put your hands behind you on a bench, legs out in front.", "Lower with your elbows pointing straight back.", "Press up to straight arms.", "Keep your hips close to the bench."],
    ["Shoulders rolling forward.", "Going too deep."],
  ),
  diamond_push_up: h(
    ["Put your hands together under your chest, thumbs and index fingers touching.", "Set your body in a straight line.", "Lower your chest to your hands.", "Press up."],
    ["Hips sagging.", "Elbows flaring out wide."],
  ),
  band_pushdown: h(
    ["Anchor a band high.", "Keep your elbows at your sides.", "Push down to straight arms.", "Lock out at the bottom, then return slowly."],
    ["Elbows moving.", "Leaning over the band."],
  ),
  wrist_curl: h(
    ["Sit and rest your forearms on your thighs, wrists past your knees.", "Hold a dumbbell palm up.", "Curl your wrist up.", "Lower slowly to a stretch."],
    ["Lifting the forearms off the thighs.", "Using a weight too heavy to control."],
  ),

  // ── Carries & core ─────────────────────────────────────────────────────
  farmers_carry: h(
    ["Deadlift a pair of heavy dumbbells to your sides.", "Stand tall, shoulders back and down.", "Walk with short, controlled steps.", "Set the weights down with a flat back."],
    ["Leaning to one side.", "Shrugging the shoulders up."],
  ),
  dead_hang: h(
    ["Grab a bar with an overhand grip, shoulder-width.", "Hang with straight arms and slightly active shoulders.", "Breathe and hold as long as you can.", "Step down rather than dropping."],
    ["Shoulders completely limp up by your ears.", "Swinging."],
  ),
  cable_crunch: h(
    ["Kneel facing a high pulley, holding a rope beside your head.", "Keep your hips still.", "Curl your ribs down toward your hips.", "Return slowly."],
    ["Pulling with the arms.", "Bending at the hips instead of the spine."],
  ),
  hanging_leg_raise: h(
    ["Hang from a bar with straight arms.", "Curl your pelvis up as you raise your legs.", "Lift until your legs are at least parallel.", "Lower slowly without swinging."],
    ["Swinging.", "Only lifting the legs with no pelvic curl."],
  ),
  crunch: h(
    ["Lie on your back, knees bent, hands lightly by your head.", "Curl your shoulders off the floor.", "Exhale hard at the top.", "Lower slowly."],
    ["Pulling on the neck.", "Sitting all the way up."],
  ),
  decline_sit_up: h(
    ["Hook your feet under the pads of a decline bench.", "Lower back slowly.", "Sit up, curling your spine.", "Control the way down."],
    ["Dropping fast.", "Pulling on your neck."],
  ),
  bicycle_crunch: h(
    ["Lie on your back with hands by your head, legs lifted.", "Bring one elbow toward the opposite knee, extending the other leg.", "Switch sides.", "Go slowly and deliberately."],
    ["Rushing.", "Pulling the head forward."],
  ),
  ab_wheel_rollout: h(
    ["Kneel holding the wheel under your shoulders.", "Tuck your ribs down and squeeze your glutes.", "Roll forward only as far as you can keep your back flat.", "Pull back to the start."],
    ["Hips sagging.", "Rolling further than you can control."],
  ),
  plank: h(
    ["Forearms on the floor, elbows under shoulders.", "Body in a straight line from head to heels.", "Squeeze your glutes and push the floor away.", "Hold and breathe."],
    ["Hips sagging.", "Hips piked high."],
  ),
  dead_bug: h(
    ["Lie on your back, arms up and knees bent at 90°.", "Press your lower back flat into the floor.", "Slowly extend the opposite arm and leg.", "Return and switch."],
    ["Lower back arching off the floor.", "Rushing."],
  ),
  hollow_hold: h(
    ["Lie on your back and press your lower back down.", "Lift your shoulders and legs off the floor.", "Reach your arms overhead.", "Hold."],
    ["Lower back arching.", "Holding your breath."],
  ),
  pallof_press: h(
    ["Stand side-on to a cable at chest height, handle at your chest.", "Brace your core.", "Press straight out in front.", "Resist the twist, then bring it back."],
    ["Rotating toward the cable.", "Leaning away."],
  ),
  cable_woodchop: h(
    ["Set the cable high and stand side-on.", "Hold the handle with both hands.", "Rotate through your torso to pull diagonally down.", "Return slowly."],
    ["Pulling with the arms.", "Rushing."],
  ),
  side_plank: h(
    ["Lie on your side on one forearm.", "Lift your hips.", "Keep your body in one line.", "Hold, then switch sides."],
    ["Hips sagging.", "Rolling forward."],
  ),
};
