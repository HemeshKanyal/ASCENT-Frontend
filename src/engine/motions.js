/**
 * Keyframed demo for every exercise, written from how the lift is coached:
 * bar paths over mid-foot, depth and lockout positions, which joints move and
 * which stay still. Each motion picks a camera that shows the working joints.
 *
 * Conventions (rig.js): x forward, y up, z = the person's right; flat feet
 * put the ankles at y = 5. Frame `effort` 1 = the contracted / hardest
 * position. Limb targets given with `a` / `l` are for the right side and are
 * mirrored to the left. `local` targets are in the torso's own axes
 * [forward (chest direction), up (toward the head), right].
 *
 * Every motion is checked by tests (checkMotion): joint ranges, nothing
 * through the floor or a bench, hands and feet reaching their contact points.
 */
import { STAND_HEIGHT, solve, v } from "./rig.js";

const SH = STAND_HEIGHT;
const ANKLE = 5;

// ── Helpers ──────────────────────────────────────────────────────────────
const rad = (d) => (d * Math.PI) / 180;
/** Spine direction for a torso pitched `p` degrees (0 upright, 90 face-down, −90 face-up). */
const spineDir = (p) => [Math.sin(rad(p)), Math.cos(rad(p)), 0];

/** Feet flat on the floor (right-side values; mirrored for the left). */
const feet = (x = 0, z = 10, out = 8, pole = [1, 0, 0.15]) => ({
  to: [x, ANKLE, z],
  pole,
  foot: [Math.cos(rad(out)), 0, Math.sin(rad(out))],
});
const hangArm = { elev: 4, plane: 70, bend: 8 };

/** Shift the pelvis so a solved point lands on x (and y). Planted limbs re-solve. */
function align(pose, point, x, y) {
  let p = pose;
  for (let i = 0; i < 5; i++) {
    const j = solve(p);
    const at = j.points[point] ?? j[point];
    p = { ...p, body: { ...p.body, pos: v.add(p.body.pos, [x === undefined ? 0 : x - at[0], y === undefined ? 0 : y - at[1], 0]) } };
  }
  return p;
}

/**
 * Keep straight arms on a bar: hip height comes from the keyframes, the torso
 * angle is solved so the shoulders sit one arm-length above the bar, and the
 * hips slide so the shoulders are `x` (just ahead of / over the bar).
 */
function fitShoulders(pose, x, y) {
  let p = pose;
  for (let i = 0; i < 8; i++) {
    const j = solve(p);
    const S = j.points.shoulderR;
    const pitch = p.body.pitch ?? 0;
    const slope = 47 * Math.sin(rad(Math.max(pitch, 5)));
    const next = Math.max(-5, Math.min(88, pitch + ((S[1] - y) / slope) * (180 / Math.PI)));
    // Hips can only be as high as soft knees allow with the feet planted.
    const legTo = (p.lR ?? p.l)?.to;
    let dy = 0;
    if (legTo) {
      const reach = v.len(v.sub(j.limbs.R.hip, legTo));
      if (reach > 78.5) dy = -(reach - 78.5) * 1.1;
    }
    p = { ...p, body: { ...p.body, pitch: next, pos: v.add(p.body.pos, [x - S[0], dy, 0]) } };
  }
  return p;
}

/** Torso-local offset [forward, up, right] from a body point to a world point. */
function toLocal(pose, at, world) {
  const j = solve(pose);
  const d = v.sub(world, j.points[at]);
  return [v.dot(d, j.up.f), v.dot(d, j.up.u), v.dot(d, j.up.r)];
}

const motion = (frames, extra) => ({ frames, ...extra });

// Equipment. Boxes: { c: centre, size: [x, y, z], pitch: tilt about z (+ raises the +x end) }.
const box = (c, size, extra = {}) => ({ type: "box", c, size, ...extra });
const rod = (a, b, w = 3, color = "bar") => ({ type: "rod", a, b, w, color });
const bench = (x0 = -80, x1 = 34, top = 42, w = 27) => [
  box([(x0 + x1) / 2, top - 3, 0], [x1 - x0, 6, w], { name: "bench" }),
  box([(x0 + x1) / 2, (top - 6) / 2, 0], [Math.max(10, x1 - x0 - 34), top - 6, 8], { name: "bench frame", top: "propDark", through: true }),
];
const seat = (x = 0, top = 42, w = 34, d = 36) => [box([x, top - 3, 0], [d, 6, w], { name: "seat" }), box([x, (top - 6) / 2, 0], [10, top - 6, 10], { through: true, top: "propDark" })];
/** Back pad leaning back `lean` degrees from vertical, behind a seated pelvis at (px, py). */
const backPad = (px, py, lean, len = 62) => {
  const u = spineDir(-lean);
  const c = v.add([px, py, 0], v.add(v.mul(u, len / 2), [-(11.5 * Math.cos(rad(lean))), -(11.5 * Math.sin(rad(lean))), 0]));
  return box(c, [6, len, 30], { pitch: lean, name: "back pad" });
};
const uprights = (x, top, z = 34) => [rod([x, 0, z], [x, top, z], 3.5, "propDark"), rod([x, 0, -z], [x, top, -z], 3.5, "propDark")];
const pulley = (p) => [rod([p[0], 0, p[2]], [p[0], Math.max(p[1] + 12, 30), p[2]], 4, "propDark")];

// ═════════════════════════════════════════════════════════════════════════
// CHEST
// ═════════════════════════════════════════════════════════════════════════
// Supine on a flat bench, head toward −x: torso forward = up, torso up = toward the head.
const supine = (extra = {}) => ({
  body: { pos: [0, 53, 0], pitch: -90 },
  spine: { flex: -6 },
  head: 6,
  l: { to: [40, ANKLE, 22], pole: [0.5, 1, 0.3], foot: [1, 0, 0.2] },
  ...extra,
});
const BENCH = bench();
const onShoulder = (to, pole, wrist) => ({ at: "shoulderR", local: true, to, pole, wrist });

/** Press lying down: lockout over the shoulders, bar to the lower chest. */
function lyingPress({ lock = [50, -1, 12], bottom = [13, -15, 12], pole = [0.4, -1, 0.75], implement = "barbell", base = supine(), props = BENCH, cam = { az: 32, el: 28 }, extra = [] } = {}) {
  return motion(
    [
      { ...base, a: onShoulder(lock, pole), effort: 0.4, hold: 0.3, move: 1.5 },
      { ...base, a: onShoulder(bottom, pole), effort: 1, hold: 0.15, move: 1 },
    ],
    { cam, props: [...props, implement === "barbell" ? { type: "barbell", r: 17 } : { type: implement }, ...extra] },
  );
}

// Incline bench: torso leaning back 55° (bench at 35°). Vertical lockout over the shoulders.
const INCLINE = 55;
const inclinePose = (lean = INCLINE) => ({
  body: { pos: [0, 50, 0], pitch: -lean },
  spine: { flex: -4 },
  head: 10,
  l: { to: [44, ANKLE, 20], pole: [0.6, 1, 0.3], foot: [1, 0, 0.2] },
});
const inclineProps = (lean = INCLINE) => [...seat(4, 42, 30, 32), backPad(-2, 50, lean, 66)];
const vertical = (lean, k) => [k * Math.sin(rad(lean)), k * Math.cos(rad(lean))]; // world-up in torso axes

/** Push-up family: body pivots on the toes, hands stay planted. */
function pushUp({ handX = 46, handY = 9, handZ = 20, feetY = 12, feetX = -80, topAngle, bottomAngle, pole = [-0.6, 0.15, 0.75], props = [], foot = [0.6, -0.8, 0] } = {}) {
  const A = [feetX, feetY];
  const at = (deg) => {
    const u = [Math.cos(rad(deg)), Math.sin(rad(deg))];
    return { body: { pos: [A[0] + u[0] * 82, A[1] + u[1] * 82, 0], pitch: 90 - deg }, head: 4 };
  };
  // On the toes: ankle ~12 above the surface, foot angled down so the toes touch it.
  const legs = { to: [feetX, feetY, 10], pole: [0, -1, 0], foot };
  const arms = { to: [handX, handY, handZ], pole };
  return motion(
    [
      { ...at(topAngle), l: legs, a: arms, effort: 0.3, hold: 0.25, move: 1.2 },
      { ...at(bottomAngle), l: legs, a: arms, effort: 1, hold: 0.1, move: 0.9 },
    ],
    { cam: { az: 28, el: 14 }, props },
  );
}

/** Standing cable / band fly: arms sweep in an arc with a fixed soft elbow. */
function standingFly({ open, closed, anchor, band = false, pitch = 12 }) {
  const base = { body: { pos: [-2, SH - 2, 0], pitch }, lR: feet(-14, 10), lL: feet(16, -10) };
  const anchors = band
    ? [{ type: "band", to: anchor, both: true }]
    : [{ type: "cable", to: anchor, to2: [anchor[0], anchor[1], -anchor[2]], both: true }, ...pulley(anchor), ...pulley([anchor[0], anchor[1], -anchor[2]])];
  return motion(
    [
      { ...base, a: open, effort: 0.2, hold: 0.25, move: 1.1 },
      { ...base, a: closed, effort: 1, hold: 0.35, move: 1.4 },
    ],
    { cam: { az: 58, el: 14 }, props: anchors },
  );
}
const flyArms = (elev, plane, bend) => ({ elev, plane, bend });

// Seated machine base: back pad slightly reclined.
const seatedMachine = (lean = 8, extra = {}) => ({
  body: { pos: [0, 50, 0], pitch: -lean },
  l: { to: [40, ANKLE, 16], pole: [0.6, 1, 0.2], foot: [1, 0, 0.15] },
  ...extra,
});
const machineProps = (lean = 8) => [...seat(4, 42), backPad(-2, 50, lean, 70)];
/** Machine lever arms: from pivots beside the back pad to each handle. */
const leverArms = (pivot) => [
  rod(pivot, "handR", 5, "propDark"),
  rod([pivot[0], pivot[1], -pivot[2]], "handL", 5, "propDark"),
  rod([pivot[0], 0, pivot[2]], pivot, 4, "propDark"),
  rod([pivot[0], 0, -pivot[2]], [pivot[0], pivot[1], -pivot[2]], 4, "propDark"),
];

function chest() {
  // Landmine: the bar end travels on an arc around a floor pivot in front of you.
  const pivot = [150, 3, 2];
  const R = 181;
  const arc = (deg) => [pivot[0] - R * Math.cos(rad(deg)), pivot[1] + R * Math.sin(rad(deg)), 6];
  const lmBase = (pitch) => ({ body: { pos: [0, SH - 3, 0], pitch }, lR: feet(-16, 11), lL: feet(18, -11), aL: hangArm });
  const dipHand = { to: [2, 116, 24], pole: [-1, 0.1, 0.35] };
  const dipLegs = { elev: 8, plane: 180, bend: 80 };
  const dipTop = align({ body: { pos: [-8, 120, 0], pitch: 22 }, head: 10, a: dipHand, l: dipLegs }, "shoulderR", 0, 166);
  const dipLow = align({ body: { pos: [-8, 90, 0], pitch: 38 }, head: 12, a: dipHand, l: dipLegs }, "shoulderR", 9, 131);
  const dipBars = [rod([-30, 112, 24], [40, 112, 24], 4), rod([-30, 112, -24], [40, 112, -24], 4), rod([-26, 0, 24], [-26, 112, 24], 4, "propDark"), rod([-26, 0, -24], [-26, 112, -24], 4, "propDark")];
  return {
    barbell_bench_press: lyingPress(),
    dumbbell_bench_press: lyingPress({ lock: [50, -2, 5], bottom: [9, -11, 17], implement: "dumbbell", pole: [0.35, -1, 0.8] }),
    smith_bench_press: lyingPress({ lock: [50, -11, 12], bottom: [13, -14, 12], extra: uprights(-34, 160, 62) }),
    close_grip_bench_press: lyingPress({ lock: [50, -3, 3], bottom: [12, -18, 3], pole: [0.8, -1, 0.2] }),
    decline_dumbbell_press: lyingPress({
      base: { ...supine(), body: { pos: [0, 66, 0], pitch: -104 }, l: { to: [40, 44, 12], pole: [0.3, 1, 0.1], foot: [0.75, 0.66, 0] } },
      props: [box([-18, 46, 0], [112, 6, 27], { pitch: 14, name: "bench" }), box([-14, 22, 0], [12, 44, 8], { through: true }), rod([36, 40, -14], [36, 40, 14], 5, "propDark")],
      lock: [50, 0, 6],
      bottom: [9, -12, 17],
      implement: "dumbbell",
    }),
    dumbbell_floor_press: lyingPress({
      base: { body: { pos: [0, 10, 0], pitch: -90 }, head: 4, l: { to: [34, ANKLE, 14], pole: [0.4, 1, 0.2], foot: [1, 0, 0.1] } },
      props: [],
      lock: [51, -3, 6],
      bottom: [24, -12, 22],
      pole: [0, -0.1, 1],
      implement: "dumbbell",
    }),
    machine_chest_press: motion(
      [
        { ...seatedMachine(), a: onShoulder([14, -8, 10], [-0.2, -1, 0.6]), effort: 0.2, hold: 0.25, move: 1 },
        { ...seatedMachine(), a: onShoulder([50, -9, -1], [-0.2, -1, 0.6]), effort: 1, hold: 0.3, move: 1.4 },
      ],
      { cam: { az: 30, el: 14 }, props: [...machineProps(), ...leverArms([-10, 112, 36])] },
    ),
    incline_machine_press: motion(
      [
        { ...seatedMachine(20), a: onShoulder([12, 2, 10], [-0.1, -1, 0.6]), effort: 0.2, hold: 0.25, move: 1 },
        { ...seatedMachine(20), a: onShoulder([44, 22, 0], [-0.1, -1, 0.6]), effort: 1, hold: 0.3, move: 1.4 },
      ],
      { cam: { az: 30, el: 14 }, props: [...machineProps(20), ...leverArms([-14, 96, 36])] },
    ),
    incline_barbell_press: lyingPress({ base: inclinePose(), props: inclineProps(), lock: [...vertical(INCLINE, 50), 12], bottom: [12, 3, 12], pole: [0.3, -1, 0.75], cam: { az: 35, el: 16 }, extra: uprights(-30, 130, 64) }),
    incline_dumbbell_press: lyingPress({ base: inclinePose(), props: inclineProps(), lock: [...vertical(INCLINE, 50), 5], bottom: [9, 4, 17], pole: [0.3, -1, 0.8], implement: "dumbbell", cam: { az: 35, el: 16 } }),
    incline_smith_press: lyingPress({ base: inclinePose(), props: inclineProps(), lock: [43, 24, 12], bottom: [12, 2, 12], pole: [0.3, -1, 0.75], cam: { az: 35, el: 16 }, extra: uprights(4, 175, 62) }),
    push_up: pushUp({ topAngle: 22, bottomAngle: 6 }),
    deficit_push_up: pushUp({ handY: 15, topAngle: 24, bottomAngle: 8, props: [box([48, 4, 21], [16, 8, 14], { through: true }), box([48, 4, -21], [16, 8, 14], { through: true })] }),
    diamond_push_up: pushUp({ handX: 40, handZ: 3, topAngle: 22, bottomAngle: 7, pole: [-1, 0.25, 0.25] }),
    decline_push_up: pushUp({ feetY: 53, feetX: -84, handX: 44, topAngle: 4, bottomAngle: -10, foot: [0.3, -0.95, 0], props: bench(-112, -66, 42) }),
    chest_dip: motion([{ ...dipTop, effort: 0.3, hold: 0.25, move: 1.3 }, { ...dipLow, effort: 1, hold: 0.15, move: 1 }], { cam: { az: 28, el: 8 }, props: dipBars }),
    landmine_press: motion(
      [
        { ...lmBase(6), aR: { to: arc(45), pole: [0.2, -1, 0.5] }, effort: 0.2, hold: 0.25, move: 1 },
        { ...lmBase(12), aR: { to: arc(57), pole: [0.2, -1, 0.5] }, effort: 1, hold: 0.3, move: 1.3 },
      ],
      { cam: { az: 30, el: 8 }, props: [rod(pivot, "handR", 3)] },
    ),
    cable_fly: standingFly({ open: flyArms(82, 108, 22), closed: flyArms(80, 6, 18), anchor: [-12, 150, 80] }),
    low_to_high_cable_fly: standingFly({ open: flyArms(28, 100, 18), closed: flyArms(100, 8, 15), anchor: [-8, 16, 76] }),
    high_to_low_cable_fly: standingFly({ open: flyArms(132, 102, 20), closed: flyArms(42, 8, 15), anchor: [-8, 205, 76] }),
    band_chest_fly: standingFly({ open: flyArms(80, 102, 20), closed: flyArms(80, 6, 16), anchor: [-60, 126, 0], band: true, pitch: 6 }),
    dumbbell_fly: motion(
      [
        { ...supine(), a: flyArms(90, 0, 14), effort: 0.3, hold: 0.25, move: 1.6 },
        { ...supine(), a: flyArms(90, 102, 24), effort: 1, hold: 0.2, move: 1.1 },
      ],
      { cam: { az: 62, el: 34 }, props: [...BENCH, { type: "dumbbell", grip: "neutral" }] },
    ),
    incline_dumbbell_fly: motion(
      [
        { ...inclinePose(), a: flyArms(90, 0, 14), effort: 0.3, hold: 0.25, move: 1.6 },
        { ...inclinePose(), a: flyArms(92, 102, 24), effort: 1, hold: 0.2, move: 1.1 },
      ],
      { cam: { az: 60, el: 26 }, props: [...inclineProps(), { type: "dumbbell", grip: "neutral" }] },
    ),
    pec_deck: motion(
      [
        { ...seatedMachine(4), a: { elev: 84, plane: 102, bend: 88, rot: 85 }, effort: 0.2, hold: 0.25, move: 1.1 },
        { ...seatedMachine(4), a: { elev: 84, plane: 6, bend: 88, rot: 85 }, effort: 1, hold: 0.35, move: 1.4 },
      ],
      { cam: { az: 62, el: 26 }, props: [...machineProps(4), rod("elbowR", "handR", 7, "propDark"), rod("elbowL", "handL", 7, "propDark")] },
    ),
  };
}

// ═════════════════════════════════════════════════════════════════════════
// SHOULDERS
// ═════════════════════════════════════════════════════════════════════════
function shoulders() {
  const seatedUpright = seatedMachine(6);
  const seatedProps = [...seat(4, 42), backPad(-2, 50, 6, 78)];
  const ohpFeet = feet(0, 12, 10);
  const raiseBase = { body: { pos: [0, SH - 1, 0], pitch: 6 }, l: feet() };
  const upright = { body: { pos: [0, SH - 1, 0], pitch: 0 }, l: feet() };
  const staggered = { body: { pos: [-4, SH - 1, 0], pitch: -4 }, lR: feet(-12, 10), lL: feet(14, -10) };
  return {
    overhead_press: motion(
      [
        { body: { pos: [0, SH - 1, 0], pitch: -4 }, head: -8, l: ohpFeet, a: { to: [13, 137, 22], pole: [0.7, -1, 0.35] }, effort: 0.3, hold: 0.25, move: 1.1 },
        { body: { pos: [0, SH - 1, 0], pitch: 0 }, head: 6, l: ohpFeet, a: { to: [2, 184, 21], pole: [0.1, -0.2, 1] }, effort: 1, hold: 0.3, move: 1.4 },
      ],
      { cam: { az: 25, el: 4 }, props: [{ type: "barbell", r: 18 }] },
    ),
    seated_dumbbell_press: motion(
      [
        { ...seatedUpright, a: onShoulder([2, 13, 15], [0, -1, 0.9]), effort: 0.3, hold: 0.25, move: 1.1 },
        { ...seatedUpright, a: onShoulder([2, 50, 5], [0, -1, 0.9]), effort: 1, hold: 0.3, move: 1.4 },
      ],
      { cam: { az: 62, el: 8 }, props: [...seatedProps, { type: "dumbbell" }] },
    ),
    machine_shoulder_press: motion(
      [
        { ...seatedUpright, a: onShoulder([6, 10, 12], [0.2, -1, 0.8]), effort: 0.3, hold: 0.25, move: 1.1 },
        { ...seatedUpright, a: onShoulder([8, 49, 6], [0.2, -1, 0.8]), effort: 1, hold: 0.3, move: 1.4 },
      ],
      { cam: { az: 50, el: 8 }, props: [...seatedProps, rod("handR", "handL", 2.6), box([-20, 90, 0], [8, 180, 70], { through: true, name: "machine" })] },
    ),
    smith_overhead_press: motion(
      [
        { ...seatedUpright, head: -6, a: onShoulder([13, 9, 12], [0.6, -1, 0.4]), effort: 0.3, hold: 0.25, move: 1.1 },
        { ...seatedUpright, head: 4, a: onShoulder([9, 49, 11], [0.1, -0.3, 1]), effort: 1, hold: 0.3, move: 1.4 },
      ],
      { cam: { az: 30, el: 6 }, props: [...seatedProps, { type: "barbell", r: 16 }, ...uprights(10, 200, 62)] },
    ),
    arnold_press: motion(
      [
        { ...seatedUpright, a: { elev: 22, plane: 4, bend: 142, rot: 0 }, effort: 0.2, hold: 0.25, move: 0.8 },
        { ...seatedUpright, a: { elev: 80, plane: 80, bend: 95, rot: 80 }, effort: 0.6, hold: 0, move: 0.7 },
        { ...seatedUpright, a: { elev: 170, plane: 82, bend: 8, rot: 80 }, effort: 1, hold: 0.3, move: 0.8 },
        { ...seatedUpright, a: { elev: 80, plane: 80, bend: 95, rot: 80 }, effort: 0.6, hold: 0, move: 0.7 },
      ],
      { cam: { az: 60, el: 8 }, props: [...seatedProps, { type: "dumbbell" }] },
    ),
    pike_push_up: motion(
      [
        { body: { pos: [-7, 82, 0], pitch: 120 }, head: 10, a: { to: [44, 9, 18], pole: [-0.4, 0.4, 0.8] }, l: { to: [-40, 12, 10], pole: [1, 0.2, 0], foot: [0.6, -0.8, 0] }, effort: 0.3, hold: 0.25, move: 1.2 },
        { body: { pos: [0, 70, 0], pitch: 132 }, head: 18, a: { to: [44, 9, 18], pole: [-0.4, 0.4, 0.8] }, l: { to: [-40, 12, 10], pole: [1, 0.2, 0], foot: [0.6, -0.8, 0] }, effort: 1, hold: 0.1, move: 1 },
      ],
      { cam: { az: 22, el: 10 } },
    ),
    handstand_push_up: motion(
      [
        { body: { pos: [16, 107, 0], pitch: 180 }, head: -10, a: { to: [8, 9, 22], pole: [-0.5, 0, 0.9] }, l: { elev: 6, plane: 180, bend: 0, ankle: 30 }, effort: 0.3, hold: 0.3, move: 1.3 },
        { body: { pos: [16, 80, 0], pitch: 180 }, head: -14, a: { to: [8, 9, 22], pole: [-0.5, 0, 0.9] }, l: { elev: 6, plane: 180, bend: 0, ankle: 30 }, effort: 1, hold: 0.15, move: 1.1 },
      ],
      { cam: { az: 28, el: 8 }, props: [box([34, 110, 0], [6, 220, 90], { name: "wall", through: true }), box([-12, 2, 0], [16, 4, 20], { name: "cushion", through: true })] },
    ),
    dumbbell_lateral_raise: motion(
      [
        { ...raiseBase, a: { elev: 12, plane: 80, bend: 14 }, effort: 0, hold: 0.25, move: 1 },
        { ...raiseBase, a: { elev: 88, plane: 75, bend: 14 }, effort: 1, hold: 0.3, move: 1.5 },
      ],
      { cam: { az: 70, el: 8 }, props: [{ type: "dumbbell" }] },
    ),
    cable_lateral_raise: motion(
      [
        { ...raiseBase, aR: { elev: 10, plane: -20, bend: 10 }, aL: { to: [6, 108, -42], pole: [0, -1, -0.5] }, effort: 0, hold: 0.2, move: 1 },
        { ...raiseBase, aR: { elev: 86, plane: 78, bend: 10 }, aL: { to: [6, 108, -42], pole: [0, -1, -0.5] }, effort: 1, hold: 0.3, move: 1.5 },
      ],
      { cam: { az: 72, el: 8 }, props: [{ type: "cable", hand: "R", to: [6, 12, -46] }, rod([6, 0, -46], [6, 190, -46], 4, "propDark")] },
    ),
    lean_away_lateral_raise: motion(
      [
        { body: { pos: [0, SH - 2, 4], roll: 13 }, lR: feet(0, 10), lL: feet(0, -8), aL: { to: [4, 120, -40], pole: [0, -1, -0.3] }, aR: { elev: 14, plane: 80, bend: 12 }, effort: 0, hold: 0.2, move: 1 },
        { body: { pos: [0, SH - 2, 4], roll: 13 }, lR: feet(0, 10), lL: feet(0, -8), aL: { to: [4, 120, -40], pole: [0, -1, -0.3] }, aR: { elev: 95, plane: 78, bend: 12 }, effort: 1, hold: 0.3, move: 1.5 },
      ],
      { cam: { az: 76, el: 6 }, props: [rod([4, 0, -42], [4, 180, -42], 5, "propDark"), { type: "dumbbell", hands: ["R"] }] },
    ),
    band_lateral_raise: motion(
      [
        { ...raiseBase, a: { elev: 12, plane: 80, bend: 12 }, effort: 0, hold: 0.2, move: 1 },
        { ...raiseBase, a: { elev: 86, plane: 75, bend: 12 }, effort: 1, hold: 0.3, move: 1.4 },
      ],
      { cam: { az: 70, el: 8 }, props: [{ type: "band", from: "handR", to: "ankleR" }, { type: "band", from: "handL", to: "ankleL" }] },
    ),
    cable_upright_row: motion(
      [
        { ...raiseBase, a: { to: [11, 88, 14], pole: [0.2, 0.2, 1] }, effort: 0, hold: 0.2, move: 1 },
        { ...raiseBase, a: { to: [14, 121, 14], pole: [0, 0.6, 1] }, effort: 1, hold: 0.3, move: 1.3 },
      ],
      { cam: { az: 58, el: 8 }, props: [rod("handR", "handL", 2.6), { type: "cable", from: "handsMid", to: [24, 10, 0] }, ...pulley([24, 10, 0])] },
    ),
    incline_y_raise: motion(
      [
        { body: { pos: [-18, 78, 0], pitch: 45 }, head: 20, l: { to: [-56, ANKLE, 12], pole: [1, 0, 0.1] }, a: { elev: 45, plane: 0, bend: 4, rot: 40 }, effort: 0, hold: 0.25, move: 1.1 },
        { body: { pos: [-18, 78, 0], pitch: 45 }, head: 20, l: { to: [-56, ANKLE, 12], pole: [1, 0, 0.1] }, a: { elev: 158, plane: 32, bend: 4, rot: 40 }, effort: 1, hold: 0.35, move: 1.4 },
      ],
      { cam: { az: 50, el: 22 }, props: [box([9, 84, 0], [6, 76, 28], { pitch: -45, name: "bench", through: true }), box([-6, 30, 0], [10, 60, 10], { through: true }), { type: "dumbbell", grip: "neutral" }] },
    ),
    dumbbell_front_raise: motion(
      [
        { ...raiseBase, a: { elev: 6, plane: 4, bend: 8 }, effort: 0, hold: 0.2, move: 1 },
        { ...raiseBase, a: { elev: 92, plane: 4, bend: 8 }, effort: 1, hold: 0.3, move: 1.4 },
      ],
      { cam: { az: 25, el: 6 }, props: [{ type: "dumbbell" }] },
    ),
    reverse_pec_deck: motion(
      [
        { body: { pos: [0, 50, 0], pitch: 4 }, l: { to: [34, ANKLE, 16], pole: [0.6, 1, 0.2] }, a: { elev: 88, plane: 0, bend: 10 }, effort: 0.2, hold: 0.25, move: 1 },
        { body: { pos: [0, 50, 0], pitch: 4 }, l: { to: [34, ANKLE, 16], pole: [0.6, 1, 0.2] }, a: { elev: 88, plane: 108, bend: 10 }, effort: 1, hold: 0.35, move: 1.4 },
      ],
      { cam: { az: -48, el: 36 }, props: [...seat(-2, 42), box([16, 92, 0], [7, 46, 26], { name: "chest pad", through: true })] },
    ),
    cable_rear_delt_fly: motion(
      [
        { ...upright, a: { elev: 88, plane: -14, bend: 8 }, effort: 0.2, hold: 0.2, move: 1 },
        { ...upright, a: { elev: 88, plane: 106, bend: 8 }, effort: 1, hold: 0.35, move: 1.4 },
      ],
      { cam: { az: -50, el: 26 }, props: [{ type: "cable", hand: "R", to: [70, 135, -42] }, { type: "cable", hand: "L", to: [70, 135, 42] }, ...pulley([70, 135, 42]), ...pulley([70, 135, -42])] },
    ),
    bent_over_reverse_fly: motion(
      [
        { body: { pos: [-22, 80, 0], pitch: 72 }, head: -20, l: feet(0, 11, 8), a: { elev: 72, plane: 0, bend: 12 }, effort: 0, hold: 0.2, move: 1 },
        { body: { pos: [-22, 80, 0], pitch: 72 }, head: -20, l: feet(0, 11, 8), a: { elev: 92, plane: 96, bend: 12 }, effort: 1, hold: 0.35, move: 1.4 },
      ],
      { cam: { az: -30, el: 46 }, props: [{ type: "dumbbell" }] },
    ),
    face_pull: motion(
      [
        { ...staggered, a: { elev: 94, plane: 4, bend: 6 }, effort: 0.2, hold: 0.2, move: 1 },
        { ...staggered, a: { elev: 90, plane: 96, bend: 104, rot: 78 }, effort: 1, hold: 0.35, move: 1.4 },
      ],
      { cam: { az: -42, el: 16 }, props: [{ type: "rope" }, { type: "cable", from: "handsMid", to: [110, 150, 0] }, ...pulley([110, 150, 0])] },
    ),
    band_pull_apart: motion(
      [
        { ...upright, a: { elev: 88, plane: 6, bend: 4 }, effort: 0.2, hold: 0.2, move: 0.9 },
        { ...upright, a: { elev: 86, plane: 96, bend: 4 }, effort: 1, hold: 0.35, move: 1.2 },
      ],
      { cam: { az: -50, el: 20 }, props: [{ type: "rope" }] },
    ),
  };
}


// ═════════════════════════════════════════════════════════════════════════
// BACK
// ═════════════════════════════════════════════════════════════════════════
function back() {
  const BAR = 203;
  const hangBar = (grip, pole) => ({ to: [2, BAR - 4, grip], pole });
  const hangLegs = { elev: 12, plane: 0, bend: 12 };
  const pullBar = rod([2, BAR, -62], [2, BAR, 62], 3);
  const pullFrame = [pullBar, rod([2, 0, -62], [2, BAR, -62], 4, "propDark"), rod([2, 0, 62], [2, BAR, 62], 4, "propDark")];
  const pull = (grip, pole, extra = {}) =>
    motion(
      [
        { body: { pos: [0, 103, 0], pitch: -4 }, a: hangBar(grip, pole), l: extra.legs ?? hangLegs, effort: 0.2, hold: 0.3, move: 1.1 },
        { body: { pos: [-3, 138, 0], pitch: -14 }, head: -10, a: hangBar(grip, pole), l: extra.legs ?? hangLegs, effort: 1, hold: 0.25, move: 1.4 },
      ],
      { cam: extra.cam ?? { az: -35, el: 8 }, props: [...pullFrame, ...(extra.props ?? [])] },
    );

  // Seated pulldown station: thighs under the pad, slight lean back.
  const pdBase = (pitch = -14) => ({ body: { pos: [0, 50, 0], pitch }, l: { to: [36, ANKLE, 14], pole: [0.6, 1, 0.2] } });
  const pdProps = [...seat(0, 42), box([22, 64, 0], [12, 8, 40], { name: "thigh pad", through: true }), rod([18, 0, 0], [18, 64, 0], 4, "propDark")];
  const pulldown = (gripTop, gripLow, pole, props, cam = { az: -38, el: 10 }) =>
    motion(
      [
        { ...pdBase(-8), shrug: 4, a: { to: gripTop, pole }, effort: 0.2, hold: 0.3, move: 1 },
        { ...pdBase(-16), a: { to: gripLow, pole }, effort: 1, hold: 0.3, move: 1.4 },
      ],
      { cam, props: [...pdProps, ...props] },
    );

  // Bent-over row: hinged torso stays put; hands hang under the shoulders, then row to the lower ribs.
  const rowBase = align({ body: { pos: [-24, 72, 0], pitch: 55 }, head: -22, l: feet(0, 11, 8, [1, 0, 0.2]) }, "shoulderR", 6);
  // z offsets are from the shoulder joint (15.5 out from the spine).
  const hangFrom = (z) => ({ at: "shoulderR", to: [1, -51, z], pole: [-0.2, 0, 1] });
  const rowTo = (z, f = 11, u = -30) => ({ at: "shoulderR", local: true, to: [f, u, z], pole: [-1, 0.6, 0.4] });

  // Cable row seat: sitting on a low bench, feet on the platform.
  const crBase = (pitch) => ({ body: { pos: [0, 48, 0], pitch }, l: { to: [58, 24, 13], pole: [0.4, 1, 0.2], foot: [0.5, 0.87, 0] } });

  // One-arm row on a bench: left knee and hand on the bench, right foot on the floor.
  const oaBase = { body: { pos: [-6, 76, -6], pitch: 84 }, head: -20, lL: { to: [-40, 52, -12], pole: [0, -1, 0], foot: [-0.9, -0.3, 0] }, lR: { to: [4, ANKLE, 28], pole: [1, 0, 0.3] }, aL: { to: [44, 47, -12], pole: [-1, 0, -0.2] } };
  const oaBench = bench(-60, 56, 42);

  // Inverted row: body straight from the heels, pivoting as you pull.
  const heels = [96, 8];
  const inv = (deg) => {
    const u = [-Math.cos(rad(deg)), Math.sin(rad(deg))];
    return { body: { pos: [heels[0] + u[0] * 82 * -1 * -1 - 0, heels[1] + u[1] * 82, 0].map((x, i) => (i === 0 ? heels[0] + u[0] * 82 : x)), pitch: -(90 - deg) } };
  };
  const invArms = { to: [-14, 97, 26], pole: [0.3, -1, 0.7] };
  const invLegs = { to: [heels[0], heels[1], 10], pole: [0, 1, 0], foot: [0.3, 0.95, 0] };

  const shrugBase = { body: { pos: [0, SH - 1, 0], pitch: 3 }, l: feet(0, 11, 8) };

  return {
    pull_up: pull(34, [0.15, -1, 0.9]),
    chin_up: pull(16, [0.6, -1, 0.15], { cam: { az: -24, el: 8 } }),
    band_assisted_pull_up: pull(30, [0.15, -1, 0.85], { legs: { elev: 12, plane: 0, bend: 88 }, props: [{ type: "band", from: [2, BAR, 0], to: "kneeR" }, { type: "band", from: [2, BAR, 0], to: "kneeL" }] }),
    lat_pulldown: pulldown([2, 148, 34], [10, 113, 30], [0.2, -1, 0.9], [rod("handR", "handL", 2.4), { type: "cable", from: "handsMid", to: [4, 232, 0] }, rod([4, 232, 0], [-10, 232, 0], 4, "propDark")]),
    neutral_grip_pulldown: pulldown([4, 150, 8], [12, 112, 8], [0.7, -1, 0.3], [{ type: "handle" }, { type: "cable", from: "handsMid", to: [4, 232, 0] }], { az: -30, el: 10 }),
    single_arm_cable_pulldown: motion(
      [
        { body: { pos: [0, 50, 0], pitch: -4 }, lR: { to: [-38, 13, 12], pole: [0, -1, 0], foot: [0.45, -0.89, 0] }, lL: { to: [34, ANKLE, -12], pole: [1, 0.4, 0] }, aR: { to: [6, 146, 22], pole: [0.2, -1, 0.8] }, aL: hangArm, shrug: 3, effort: 0.2, hold: 0.3, move: 1 },
        { body: { pos: [0, 50, 0], pitch: -4 }, lR: { to: [-38, 13, 12], pole: [0, -1, 0], foot: [0.45, -0.89, 0] }, lL: { to: [34, ANKLE, -12], pole: [1, 0.4, 0] }, aR: { to: [4, 97, 26], pole: [-0.3, -1, 0.6] }, aL: hangArm, effort: 1, hold: 0.3, move: 1.4 },
      ],
      { cam: { az: -40, el: 10 }, props: [{ type: "cable", hand: "R", to: [8, 230, 30] }, rod([8, 0, 30], [8, 236, 30], 4, "propDark")] },
    ),
    band_pulldown: motion(
      [
        { body: { pos: [0, 50, 0], pitch: 4 }, l: { to: [-38, 13, 11], pole: [0, -1, 0], foot: [0.45, -0.89, 0] }, a: { to: [16, 146, 22], pole: [0.2, -1, 0.8] }, shrug: 3, effort: 0.2, hold: 0.3, move: 1 },
        { body: { pos: [0, 50, 0], pitch: -2 }, l: { to: [-38, 13, 11], pole: [0, -1, 0], foot: [0.45, -0.89, 0] }, a: { to: [10, 98, 24], pole: [-0.3, -1, 0.6] }, effort: 1, hold: 0.3, move: 1.3 },
      ],
      { cam: { az: -36, el: 10 }, props: [{ type: "band", to: [40, 210, 0], both: true }] },
    ),
    straight_arm_pulldown: motion(
      [
        { body: { pos: [-8, SH - 4, 0], pitch: 28 }, head: -10, l: feet(0, 11, 8), a: { elev: 132, plane: 4, bend: 10 }, effort: 0.2, hold: 0.25, move: 1 },
        { body: { pos: [-8, SH - 4, 0], pitch: 28 }, head: -10, l: feet(0, 11, 8), a: { elev: 16, plane: 4, bend: 10 }, effort: 1, hold: 0.35, move: 1.5 },
      ],
      { cam: { az: 20, el: 6 }, props: [rod("handR", "handL", 2.4), { type: "cable", from: "handsMid", to: [84, 196, 0] }, ...pulley([84, 196, 0])] },
    ),
    dumbbell_pullover: motion(
      [
        { ...supine(), a: { elev: 90, plane: -12, bend: 14 }, effort: 1, hold: 0.25, move: 1.6 },
        { ...supine(), a: { elev: 162, plane: -12, bend: 22 }, effort: 0.3, hold: 0.2, move: 1.2 },
      ],
      { cam: { az: 22, el: 18 }, props: [...BENCH, { type: "single", axis: "forearm" }] },
    ),
    barbell_row: motion(
      [
        { ...rowBase, a: hangFrom(6), effort: 0.2, hold: 0.2, move: 0.8 },
        { ...rowBase, a: rowTo(7), effort: 1, hold: 0.3, move: 1.3 },
      ],
      { cam: { az: 25, el: 10 }, props: [{ type: "barbell", axis: [0, 0, 1], r: 17 }] },
      // (the bar stays level, so its axis is fixed)
    ),
    t_bar_row: motion(
      [
        { ...rowBase, a: hangFrom(-8), effort: 0.2, hold: 0.2, move: 0.8 },
        { ...rowBase, a: rowTo(-8, 12, -26), effort: 1, hold: 0.3, move: 1.3 },
      ],
      { cam: { az: 25, el: 10 }, props: [rod([-140, 3, 0], "handsMid", 3), { type: "handle" }, { type: "barbell", on: "handsMid", offset: [10, 0, 0], axis: [0, 0, 1], half: 13, r: 15 }] },
    ),
    one_arm_dumbbell_row: motion(
      [
        { ...oaBase, aR: { at: "shoulderR", to: [0, -50, 4], pole: [-0.3, 0, 1] }, effort: 0.2, hold: 0.25, move: 0.9 },
        { ...oaBase, aR: { at: "shoulderR", local: true, to: [8, -32, 2], pole: [-1, 1, 0.1] }, effort: 1, hold: 0.3, move: 1.3 },
      ],
      { cam: { az: 22, el: 18 }, props: [...oaBench.map((b) => ({ ...b, c: [b.c[0], b.c[1], -12] })), { type: "dumbbell", hands: ["R"], grip: "neutral" }] },
    ),
    chest_supported_row: motion(
      [
        { body: { pos: [-18, 78, 0], pitch: 45 }, head: 10, l: { to: [-56, ANKLE, 12], pole: [1, 0, 0.1] }, a: { at: "shoulderR", to: [0, -50, 3], pole: [-0.3, 0, 1] }, effort: 0.2, hold: 0.25, move: 0.9 },
        { body: { pos: [-18, 78, 0], pitch: 45 }, head: 10, l: { to: [-56, ANKLE, 12], pole: [1, 0, 0.1] }, a: { at: "shoulderR", local: true, to: [6, -30, 4], pole: [-1, 0.8, 0.3] }, effort: 1, hold: 0.3, move: 1.3 },
      ],
      { cam: { az: 28, el: 14 }, props: [box([9, 84, 0], [6, 76, 28], { pitch: -45, name: "bench", through: true }), box([-6, 30, 0], [10, 60, 10], { through: true }), { type: "dumbbell", grip: "neutral" }] },
    ),
    seated_cable_row: motion(
      [
        { ...crBase(22), head: -6, a: { at: "shoulderR", local: true, to: [50, -10, -9], pole: [0, -1, 0.4] }, effort: 0.2, hold: 0.25, move: 1 },
        { ...crBase(-6), a: { at: "shoulderR", local: true, to: [12, -30, -9], pole: [-1, 0.2, 0.4] }, effort: 1, hold: 0.35, move: 1.4 },
      ],
      { cam: { az: 22, el: 10 }, props: [...seat(-4, 40, 30, 40), box([62, 22, 0], [5, 30, 36], { name: "platform", through: true }), { type: "handle" }, { type: "cable", from: "handsMid", to: [110, 62, 0] }, ...pulley([110, 62, 0])] },
    ),
    machine_row: motion(
      [
        { body: { pos: [0, 50, 0], pitch: 6 }, l: { to: [34, ANKLE, 14], pole: [0.6, 1, 0.2] }, a: { at: "shoulderR", local: true, to: [48, -12, -3], pole: [0, -1, 0.5] }, effort: 0.2, hold: 0.25, move: 1 },
        { body: { pos: [0, 50, 0], pitch: 6 }, l: { to: [34, ANKLE, 14], pole: [0.6, 1, 0.2] }, a: { at: "shoulderR", local: true, to: [10, -20, 0], pole: [-1, 0.2, 0.5] }, effort: 1, hold: 0.35, move: 1.4 },
      ],
      { cam: { az: 24, el: 12 }, props: [...seat(0, 42), box([20, 92, 0], [7, 44, 26], { name: "chest pad", through: true }), ...leverArms([62, 70, 30])] },
    ),
    inverted_row: motion(
      [
        { ...inv(20), l: invLegs, a: invArms, effort: 0.2, hold: 0.25, move: 1 },
        { ...inv(34), head: 6, l: invLegs, a: invArms, effort: 1, hold: 0.3, move: 1.2 },
      ],
      { cam: { az: 24, el: 10 }, props: [rod([-14, 95, -60], [-14, 95, 60], 3), ...uprights(-14, 140, 60)] },
    ),
    band_row: motion(
      [
        { body: { pos: [-4, SH - 3, 0], pitch: 4 }, l: feet(0, 12, 8, [1, 0, 0.2]), a: { at: "shoulderR", local: true, to: [50, -6, -7], pole: [0, -1, 0.5] }, effort: 0.2, hold: 0.25, move: 1 },
        { body: { pos: [-4, SH - 3, 0], pitch: 0 }, l: feet(0, 12, 8, [1, 0, 0.2]), a: { at: "shoulderR", local: true, to: [8, -24, -3], pole: [-1, 0.1, 0.4] }, effort: 1, hold: 0.35, move: 1.3 },
      ],
      { cam: { az: 24, el: 10 }, props: [{ type: "band", to: [80, 128, 0], both: true }, rod([80, 0, 0], [80, 160, 0], 5, "propDark")] },
    ),
    barbell_shrug: motion(
      [
        { ...shrugBase, a: { elev: 7, plane: 6, bend: 2 }, effort: 0, hold: 0.2, move: 0.8 },
        { ...shrugBase, shrug: 7, a: { elev: 7, plane: 6, bend: 2 }, effort: 1, hold: 0.9, move: 1 },
      ],
      { cam: { az: -50, el: 16 }, props: [{ type: "barbell", r: 17 }] },
    ),
    dumbbell_shrug: motion(
      [
        { ...shrugBase, a: { elev: 3, plane: 80, bend: 3 }, effort: 0, hold: 0.2, move: 0.8 },
        { ...shrugBase, shrug: 7, a: { elev: 3, plane: 80, bend: 3 }, effort: 1, hold: 0.9, move: 1 },
      ],
      { cam: { az: -50, el: 16 }, props: [{ type: "dumbbell", grip: "neutral" }] },
    ),
    band_shrug: motion(
      [
        { ...shrugBase, a: { elev: 4, plane: 60, bend: 3 }, effort: 0, hold: 0.2, move: 0.8 },
        { ...shrugBase, shrug: 7, a: { elev: 4, plane: 60, bend: 3 }, effort: 1, hold: 1.2, move: 1 },
      ],
      { cam: { az: -50, el: 16 }, props: [{ type: "band", from: "handR", to: "ankleR" }, { type: "band", from: "handL", to: "ankleL" }] },
    ),
  };
}

// ═════════════════════════════════════════════════════════════════════════
// HINGE & GLUTES
// ═════════════════════════════════════════════════════════════════════════
const ARM = 51; // shoulder joint to wrist with the elbow straight

/**
 * Floor pull. The bar rises straight up over mid-foot; between keyframes the
 * hips are re-solved so the arms keep hanging straight from the shoulders.
 */
function floorPull({ stance, gripZ, startPitch, startHip, kneePitch, barX = 5, implement, lockY = 83, cam = { az: 30, el: 6 }, shoulderLead = 9 }) {
  const grip = (y) => ({ to: [barX, y, gripZ], pole: [-0.2, 0, 1] });
  const start = align({ body: { pos: [startHip[0], startHip[1], 0], pitch: startPitch }, head: -25, l: stance, a: grip(24) }, "shoulderR", barX + shoulderLead, 24 + ARM);
  const knee = align({ body: { pos: [startHip[0] + 8, startHip[1] + 14, 0], pitch: kneePitch }, head: -20, l: stance, a: grip(50) }, "shoulderR", barX + shoulderLead - 2, 50 + ARM);
  // A wide stance can't stand as tall: drop the hips until the feet are in reach.
  const lockHip = SH - 1 - Math.max(0, Math.hypot(Math.abs(stance.to[2]) - 8.5, SH - 3 - ANKLE) - 79.5);
  const lock = { body: { pos: [0, lockHip, 0], pitch: -3 }, l: stance, a: grip(lockY) };
  return motion(
    [
      { ...start, effort: 0.6, hold: 0.35, move: 0.7 },
      { ...knee, effort: 0.9, hold: 0, move: 0.6 },
      { ...lock, effort: 1, hold: 0.3, move: 1.4 },
    ],
    {
      cam,
      props: implement,
      adjust: (p) => {
        const y = p.a.to[1];
        if (y > lockY - 3) return p;
        const u = Math.min(1, Math.max(0, (y - 24) / (lockY - 24)));
        return fitShoulders(p, barX + shoulderLead * (1 - u) - 2.5 * u, y + ARM);
      },
    },
  );
}

/**
 * Hip hinge from standing: hips go back, knees stay soft, back stays flat.
 * The bottom is set by the body (hip height, torso angle); the bar ends up
 * wherever straight arms put it — typically just below the knee.
 */
function hingeFromTop({ bottomPitch = 80, hipY = 79, gripZ = 20, implement, cam = { az: 28, el: 6 }, stance = feet(0, 11, 8), head = -22, barX = 5 }) {
  const grip = (y) => ({ to: [barX, y, gripZ], pole: [-0.2, 0, 1] });
  const lock = { body: { pos: [0, SH - 1, 0], pitch: -2 }, l: stance, a: grip(83) };
  const placed = align({ body: { pos: [-24, hipY, 0], pitch: bottomPitch }, head, l: stance, a: grip(40) }, "shoulderR", barX + 7);
  const bottomY = solve(placed).points.shoulderR[1] - ARM;
  const bottom = { ...placed, a: grip(bottomY) };
  return motion(
    [
      { ...lock, effort: 0.6, hold: 0.25, move: 1.6 },
      { ...bottom, effort: 1, hold: 0.2, move: 1.2 },
    ],
    {
      cam,
      props: implement,
      adjust: (p) => {
        const y = p.a.to[1];
        if (y > 80) return p;
        const u = Math.min(1, Math.max(0, (y - bottomY) / (83 - bottomY)));
        return fitShoulders(p, barX + 7 * (1 - u) - 2.5 * u, y + ARM);
      },
    },
  );
}

function hinge() {
  const hipBar = { type: "barbell", on: "pelvis", local: [13, -6], r: 17 };
  const thrustBench = box([-52, 21, 0], [30, 42, 110], { name: "bench" });
  // Hip thrust: upper back pivots on the bench edge; shins vertical at the top.
  const contact = [-40, 51];
  const thrustAt = (deg) => {
    // deg = torso angle below horizontal (0 = flat bridge at the top)
    const back = [Math.cos(rad(deg)), -Math.sin(rad(deg))];
    return { body: { pos: [contact[0] + back[0] * 40, contact[1] + back[1] * 40, 0], pitch: -90 + deg }, head: 22 - deg * 0.2 };
  };
  const thrustFeet = { to: [28, ANKLE, 16], pole: [0.4, 1, 0.3], foot: [1, 0, 0.2] };
  const thrustHands = { at: "pelvis", local: true, to: [13, 2, 25], pole: [0, 1, 1] };
  // Floor bridge: shoulders stay on the floor.
  const shoulders = [-46, 10];
  // deg = how far the hips are lifted (torso angle); the neck flexes so the head stays down.
  const bridgeAt = (deg) => ({ body: { pos: [shoulders[0] + Math.cos(rad(deg)) * 50, shoulders[1] + Math.sin(rad(deg)) * 50, 0], pitch: -90 - deg }, head: deg + 4 });
  const bridgeFeet = { to: [20, ANKLE, 12], pole: [0.4, 1, 0.2], foot: [1, 0, 0.1] };
  const floorHands = { to: [-10, 6, 26], pole: [0, 1, 0.5] };

  return {
    conventional_deadlift: floorPull({ stance: feet(0, 11, 8), gripZ: 22, startPitch: 60, startHip: [-30, 56], kneePitch: 45, implement: [{ type: "barbell", axis: [0, 0, 1] }] }),
    sumo_deadlift: floorPull({ stance: feet(0, 30, 40, [0.6, 0, 0.8]), gripZ: 13, startPitch: 38, startHip: [-14, 36], kneePitch: 30, shoulderLead: 6, implement: [{ type: "barbell", axis: [0, 0, 1] }], cam: { az: 48, el: 8 } }),
    trap_bar_deadlift: floorPull({
      stance: feet(0, 12, 8),
      gripZ: 26,
      startPitch: 44,
      startHip: [-18, 50],
      kneePitch: 32,
      barX: 1,
      shoulderLead: 4,
      cam: { az: 40, el: 10 },
      implement: [{ type: "barbell", axis: [0, 0, 1], half: 58 }, rod("handR", [30, 0, 26], 0.1, "outline")].slice(0, 1),
    }),
    romanian_deadlift: hingeFromTop({ implement: [{ type: "barbell", axis: [0, 0, 1], r: 17 }] }),
    dumbbell_rdl: hingeFromTop({ gripZ: 17, bottomPitch: 82, implement: [{ type: "dumbbell" }] }),
    good_morning: motion(
      [
        { body: { pos: [0, SH - 1, 0], pitch: 0 }, l: feet(0, 12, 8), a: { at: "neck", local: true, to: [-6, -3, 30], pole: [-0.3, -1, 0.2] }, effort: 0.4, hold: 0.25, move: 1.6 },
        align({ body: { pos: [-22, SH - 8, 0], pitch: 76 }, head: -20, l: feet(0, 12, 8), a: { at: "neck", local: true, to: [-6, -3, 30], pole: [-0.3, -1, 0.2] }, effort: 1, hold: 0.2, move: 1.2 }, "neck", 34),
      ],
      { cam: { az: 25, el: 6 }, props: [{ type: "barbell", on: "neck", local: [-8, -2], r: 17 }] },
    ),
    single_leg_rdl: motion(
      [
        { body: { pos: [0, SH - 2, 0], pitch: 0 }, lL: feet(0, -9, 8), lR: { elev: 8, plane: 180, bend: 25 }, a: { elev: 4, plane: 30, bend: 6 }, effort: 0.4, hold: 0.25, move: 1.6 },
        { body: { pos: [-14, SH - 6, 0], pitch: 82 }, head: -20, lL: feet(0, -9, 8), lR: { elev: 4, plane: 0, bend: 4, ankle: -10 }, a: { elev: 82, plane: 4, bend: 6 }, effort: 1, hold: 0.25, move: 1.4 },
      ],
      { cam: { az: 20, el: 8 }, props: [{ type: "dumbbell", hands: ["R"] }] },
    ),
    kettlebell_swing: motion(
      [
        { body: { pos: [-22, 74, 0], pitch: 62 }, head: -30, l: feet(0, 16, 15, [1, 0, 0.35]), a: { elev: 4, plane: 0, bend: 0 }, effort: 0.5, hold: 0.05, move: 0.5 },
        { body: { pos: [0, SH - 1, 0], pitch: -3 }, l: feet(0, 16, 15, [1, 0, 0.35]), a: { elev: 90, plane: -6, bend: 0 }, effort: 1, hold: 0.1, move: 0.55 },
      ],
      { cam: { az: 22, el: 6 }, props: [{ type: "kettlebell" }] },
    ),
    back_extension: motion(
      [
        { body: { pos: [10, 96, 0], pitch: 140 }, head: 10, spine: { flex: 10 }, l: { to: [-45, 40, 11], pole: [0.6, -0.8, 0], foot: [0.6, -0.8, 0] }, a: { at: "neck", local: true, to: [8, -14, -8], pole: [0, -1, 0.6] }, effort: 0.2, hold: 0.2, move: 1.2 },
        { body: { pos: [10, 96, 0], pitch: 45 }, head: -6, l: { to: [-45, 40, 11], pole: [0.6, -0.8, 0], foot: [0.6, -0.8, 0] }, a: { at: "neck", local: true, to: [8, -14, -8], pole: [0, -1, 0.6] }, effort: 1, hold: 0.4, move: 1.4 },
      ],
      { cam: { az: 24, el: 8 }, props: [box([18, 86, 0], [7, 22, 28], { pitch: -45, name: "pad", through: true }), box([-50, 34, 0], [16, 4, 30], { pitch: 45, through: true }), rod([16, 0, 0], [16, 82, 0], 5, "propDark"), rod([-50, 0, 0], [-50, 32, 0], 4, "propDark")] },
    ),
    cable_pull_through: motion(
      [
        align({ body: { pos: [-20, 76, 0], pitch: 60 }, head: -18, l: feet(0, 18, 18, [1, 0, 0.35]), a: { to: [0, 60, 3], pole: [0.3, 0, 1] }, effort: 0.3, hold: 0.2, move: 0.9 }, "pelvis", -22),
        { body: { pos: [2, SH - 1, 0], pitch: -2 }, l: feet(0, 18, 18, [1, 0, 0.35]), a: { to: [12, 82, 3], pole: [0, -1, 0.3] }, effort: 1, hold: 0.35, move: 1.2 },
      ],
      { cam: { az: 25, el: 6 }, props: [{ type: "rope" }, { type: "cable", from: "handsMid", to: [-92, 14, 0] }, ...pulley([-92, 14, 0])] },
    ),
    barbell_hip_thrust: motion(
      [
        { ...thrustAt(40), l: thrustFeet, a: thrustHands, effort: 0.3, hold: 0.15, move: 1 },
        { ...thrustAt(0), l: thrustFeet, a: thrustHands, effort: 1, hold: 0.5, move: 1.3 },
      ],
      { cam: { az: 28, el: 10 }, props: [thrustBench, hipBar] },
    ),
    smith_hip_thrust: motion(
      [
        { ...thrustAt(40), l: thrustFeet, a: thrustHands, effort: 0.3, hold: 0.15, move: 1 },
        { ...thrustAt(0), l: thrustFeet, a: thrustHands, effort: 1, hold: 0.5, move: 1.3 },
      ],
      { cam: { az: 28, el: 10 }, props: [thrustBench, hipBar, ...uprights(6, 150, 62)] },
    ),
    dumbbell_hip_thrust: motion(
      [
        { ...thrustAt(40), l: thrustFeet, a: { at: "pelvis", local: true, to: [14, -5, 8], pole: [0, 1, 1] }, effort: 0.3, hold: 0.15, move: 1 },
        { ...thrustAt(0), l: thrustFeet, a: { at: "pelvis", local: true, to: [14, -5, 8], pole: [0, 1, 1] }, effort: 1, hold: 0.5, move: 1.3 },
      ],
      { cam: { az: 28, el: 10 }, props: [thrustBench, { type: "single", axis: [0, 0, 1] }] },
    ),
    single_leg_hip_thrust: motion(
      [
        { ...thrustAt(40), lL: { ...thrustFeet, to: [28, ANKLE, -14], foot: [1, 0, -0.2] }, lR: { elev: 95, plane: 0, bend: 95, ankle: 0 }, aR: { to: [-44, 48, 34], pole: [0, 1, 0.5] }, aL: { to: [-44, 48, -34], pole: [0, 1, -0.5] }, effort: 0.3, hold: 0.15, move: 1 },
        { ...thrustAt(0), lL: { ...thrustFeet, to: [28, ANKLE, -14], foot: [1, 0, -0.2] }, lR: { elev: 95, plane: 0, bend: 95, ankle: 0 }, aR: { to: [-44, 48, 34], pole: [0, 1, 0.5] }, aL: { to: [-44, 48, -34], pole: [0, 1, -0.5] }, effort: 1, hold: 0.5, move: 1.3 },
      ],
      { cam: { az: 24, el: 10 }, props: [thrustBench] },
    ),
    glute_bridge: motion(
      [
        { ...bridgeAt(0), l: bridgeFeet, a: floorHands, effort: 0.2, hold: 0.15, move: 0.9 },
        { ...bridgeAt(27), l: bridgeFeet, a: floorHands, effort: 1, hold: 0.6, move: 1.2 },
      ],
      { cam: { az: 22, el: 12 } },
    ),
    cable_kickback: motion(
      [
        { body: { pos: [-4, SH - 6, 0], pitch: 32 }, head: -10, lL: feet(0, -8, 8), lR: { elev: 48, plane: 0, bend: 75, ankle: 10 }, a: { to: [44, 104, 14], pole: [0, -1, 0.5] }, effort: 0.2, hold: 0.15, move: 0.9 },
        { body: { pos: [-4, SH - 6, 0], pitch: 32 }, head: -10, lL: feet(0, -8, 8), lR: { elev: 18, plane: 180, bend: 6 }, a: { to: [44, 104, 14], pole: [0, -1, 0.5] }, effort: 1, hold: 0.45, move: 1.2 },
      ],
      { cam: { az: 18, el: 6 }, props: [{ type: "cable", from: "ankleR", to: [52, 12, 10] }, rod([52, 0, 10], [52, 180, 10], 4, "propDark"), rod([48, 104, -16], [48, 104, 16], 3, "propDark")] },
    ),
  };
}

// ═════════════════════════════════════════════════════════════════════════
// HAMSTRINGS
// ═════════════════════════════════════════════════════════════════════════
function hamstrings() {
  // Lying leg curl: prone (pitch 90 → head toward +x), knees just off the pad's end.
  const prone = { body: { pos: [0, 54, 0], pitch: 90 }, head: -12, a: { to: [52, 42, 18], pole: [-0.5, -1, 0.6] } };
  const lcPad = [box([22, 42, 0], [116, 6, 30], { name: "pad" }), box([22, 20, 0], [40, 40, 10], { through: true }), rod([-56, 20, 0], [-56, 40, 0], 4, "propDark")];
  const ankleRoller = { type: "rod", a: "ankleR", b: "ankleL", w: 9, color: "propDark" };
  const seatedLC = { body: { pos: [0, 50, 0], pitch: -14 }, a: { to: [30, 66, 22], pole: [0, -1, 0.5] } };
  // Nordic: knees on the pad, heels anchored; hips stay extended as you lower.
  const knee = [0, 9];
  const nordicAt = (lean) => {
    const hip = [knee[0] + Math.sin(rad(lean)) * 41, knee[1] + Math.cos(rad(lean)) * 41];
    return { body: { pos: [hip[0] + Math.sin(rad(lean)) * 2, hip[1] + Math.cos(rad(lean)) * 2, 0], pitch: lean }, head: 0 };
  };
  const nordicLegs = { to: [-37, 14, 10], pole: [0, -1, 0], foot: [0.3, -0.95, 0] };
  return {
    lying_leg_curl: motion(
      [
        { ...prone, l: { elev: 0, bend: 2, ankle: 10 }, effort: 0.2, hold: 0.2, move: 1 },
        { ...prone, l: { elev: 0, bend: 118, ankle: 0 }, effort: 1, hold: 0.35, move: 1.6 },
      ],
      { cam: { az: 20, el: 14 }, props: [...lcPad, ankleRoller] },
    ),
    seated_leg_curl: motion(
      [
        { ...seatedLC, l: { elev: 92, bend: 6, ankle: 0 }, effort: 0.2, hold: 0.2, move: 1 },
        { ...seatedLC, l: { elev: 92, bend: 112, ankle: 0 }, effort: 1, hold: 0.35, move: 1.6 },
      ],
      { cam: { az: 22, el: 10 }, props: [...machineProps(14), box([22, 70, 0], [30, 7, 34], { name: "thigh pad", through: true }), ankleRoller] },
    ),
    nordic_curl: motion(
      [
        { ...nordicAt(0), l: nordicLegs, a: { at: "neck", local: true, to: [10, -18, -6], pole: [0, -1, 0.6] }, effort: 0.3, hold: 0.25, move: 2.6 },
        { ...nordicAt(62), l: nordicLegs, a: { at: "neck", local: true, to: [32, -14, 2], pole: [0, -1, 0.6] }, effort: 1, hold: 0.1, move: 0.6 },
        { ...nordicAt(72), l: nordicLegs, a: { at: "neck", local: true, to: [38, -8, 4], pole: [0, -1, 0.6] }, effort: 0.6, hold: 0.15, move: 1.2 },
      ],
      { cam: { az: 22, el: 8 }, props: [box([-2, 2, 0], [24, 4, 30], { through: true }), rod([-38, 18, -16], [-38, 18, 16], 6, "propDark")] },
    ),
    slider_leg_curl: motion(
      [
        { body: { pos: [2, 30, 0], pitch: -113 }, head: 22, a: { to: [-8, 6, 26], pole: [0, 1, 0.5] }, l: { to: [76, 7, 11], pole: [0, 1, 0.2], foot: "neutral" }, effort: 0.3, hold: 0.15, move: 1.5 },
        { body: { pos: [2, 33, 0], pitch: -118 }, head: 26, a: { to: [-8, 6, 26], pole: [0, 1, 0.5] }, l: { to: [34, 7, 11], pole: [0.3, 1, 0.2], foot: "neutral", ankle: 10 }, effort: 1, hold: 0.25, move: 1.4 },
      ],
      { cam: { az: 22, el: 10 } },
    ),
    band_leg_curl: motion(
      [
        { body: { pos: [0, 11, 0], pitch: 90 }, head: -20, a: { to: [60, 4, 14], pole: [-0.2, 0.6, 1] }, l: { elev: 0, bend: 2, ankle: 30 }, effort: 0.2, hold: 0.2, move: 1 },
        { body: { pos: [0, 11, 0], pitch: 90 }, head: -20, a: { to: [60, 4, 14], pole: [-0.2, 0.6, 1] }, l: { elev: 0, bend: 115, ankle: 10 }, effort: 1, hold: 0.35, move: 1.5 },
      ],
      { cam: { az: 20, el: 14 }, props: [{ type: "band", from: "ankleR", to: [-120, 6, 0] }, { type: "band", from: "ankleL", to: [-120, 6, 0] }, rod([-120, 0, 0], [-120, 30, 0], 5, "propDark")] },
    ),
  };
}

// ═════════════════════════════════════════════════════════════════════════
// QUADS
// ═════════════════════════════════════════════════════════════════════════
const squatFeet = feet(0, 16, 22, [1, 0, 0.35]);
function squatMotion({ topPitch = 4, bottom, hands, props, cam = { az: 35, el: 8 }, stance = squatFeet, neckX = 6, head = -18, spine = { flex: -4 }, arms }) {
  const top = align({ body: { pos: [0, SH - 2, 0], pitch: topPitch }, l: stance, a: hands ?? arms }, "neck", neckX - 2);
  const low = align({ body: { pos: [bottom[0], bottom[1], 0], pitch: bottom[2] }, spine, head, l: stance, a: hands ?? arms }, "neck", neckX);
  return motion([{ ...top, effort: 0.1, hold: 0.3, move: 1.5 }, { ...low, effort: 1, hold: 0.15, move: 1.1 }], { cam, props });
}

function quads() {
  const backBar = { type: "barbell", on: "neck", local: [-8, -2], r: 18 };
  const backHands = { at: "neck", local: true, to: [-6, -3, 30], pole: [-0.3, -1, 0.2] };
  const frontHands = { at: "neck", local: true, to: [13, -4, 20], pole: [1, 0.25, 0.25] };
  const gobletHands = { at: "neck", local: true, to: [15, -14, 4], pole: [0.3, -1, 0.4] };
  // Split stance: right foot forward (near side), left foot back on the toes.
  // Rear foot on the ball: the ankle sits above it, so the heel→toe line is steep.
  const split = (frontX, backX, backY = 14, backFoot = [0.3, -0.95, 0]) => ({
    lR: { to: [frontX, ANKLE, 10], pole: [1, 0, 0.1] },
    lL: { to: [backX, backY, -10], pole: [0.15, -1, 0], foot: backFoot },
  });
  // 45° leg press: sled travels along the diagonal.
  const sledDir = [Math.cos(rad(45)), Math.sin(rad(45))];
  const sled = (d) => [10 + sledDir[0] * d, 40 + sledDir[1] * d];
  const lpBase = { body: { pos: [0, 40, 0], pitch: -62 }, head: 20, a: { elev: 25, plane: 40, bend: 50 } };
  const lpLeg = (d) => ({ to: [...sled(d), 14], pole: [0.3, 0.4, 0.3], foot: [-0.62, 0.78, 0.1] });
  const lpPlate = (d) => box([...sled(d + 8), 0], [6, 52, 64], { pitch: -45, name: "sled", through: true });
  // Hack squat: back on the sled pad, which slides along the rail.
  const hackU = spineDir(-34);
  const hackAt = (d) => ({ body: { pos: [-10 - hackU[0] * d, SH - 6 - hackU[1] * d, 0], pitch: -34 }, head: 12 });
  const hackFeet = { to: [24, ANKLE + 6, 14], pole: [1, 0.2, 0.3], foot: [0.97, -0.24, 0.15] };
  return {
    back_squat: squatMotion({ bottom: [-22, 46, 42], hands: backHands, props: [backBar, ...uprights(-24, 150)] }),
    smith_squat: squatMotion({ bottom: [-14, 44, 28], hands: backHands, stance: feet(12, 16, 18, [1, 0, 0.3]), neckX: 2, props: [backBar, ...uprights(-4, 210, 66)] }),
    front_squat: squatMotion({ bottom: [-14, 40, 24], hands: frontHands, neckX: 4, head: -6, props: [{ type: "barbell", on: "neck", local: [9, -3], r: 18 }] }),
    goblet_squat: squatMotion({ bottom: [-14, 40, 26], hands: gobletHands, neckX: 4, head: -8, props: [{ type: "single", axis: [0, 1, 0] }] }),
    bodyweight_squat: squatMotion({ bottom: [-18, 42, 36], arms: { elev: 90, plane: 4, bend: 4 }, neckX: 8, head: -10 }),
    hack_squat: motion(
      [
        { ...hackAt(0), l: hackFeet, a: { at: "neck", local: true, to: [4, -16, 26], pole: [0, -1, 0.3] }, effort: 0.1, hold: 0.3, move: 1.5 },
        { ...hackAt(34), l: hackFeet, a: { at: "neck", local: true, to: [4, -16, 26], pole: [0, -1, 0.3] }, effort: 1, hold: 0.15, move: 1.1 },
      ],
      { cam: { az: 28, el: 8 }, props: [box([16, 4, 0], [40, 8, 50], { pitch: 14, name: "platform", through: true }), box([-40, 70, 0], [8, 130, 40], { pitch: 34, name: "sled pad", through: true })] },
    ),
    leg_press: motion(
      [
        { ...lpBase, l: lpLeg(52), props: [lpPlate(52)], effort: 0.1, hold: 0.25, move: 1.6 },
        { ...lpBase, l: lpLeg(24), props: [lpPlate(24)], effort: 1, hold: 0.15, move: 1.2 },
      ],
      { cam: { az: 8, el: 6 }, props: [box([-18, 32, 0], [34, 6, 34], { pitch: -10, name: "seat" }), box([-40, 62, 0], [6, 60, 32], { pitch: 62, name: "back pad", through: true }), box([-10, 14, 0], [60, 28, 10], { through: true })] },
    ),
    // Cossack: very wide stance; sit over one heel (knee tracks the toes) while the other leg stays straight, toes up.
    cossack_squat: (() => {
      const bentR = { to: [0, ANKLE, 36], pole: [0.75, 0, 0.66], foot: [0.82, 0, 0.57] };
      const bentL = { to: [0, ANKLE, -36], pole: [0.75, 0, -0.66], foot: [0.82, 0, -0.57] };
      const straightR = { to: [0, 8, 36], pole: [0.1, 1, 0], foot: "neutral", ankle: -14 };
      const straightL = { to: [0, 8, -36], pole: [0.1, 1, 0], foot: "neutral", ankle: -14 };
      const mid = { body: { pos: [-4, 70, 0], pitch: 10 }, lR: bentR, lL: bentL, a: { elev: 60, plane: 0, bend: 40 }, effort: 0.2, hold: 0.25, move: 1.2 };
      return motion(
        [
          mid,
          { body: { pos: [-14, 52, 14], pitch: 30 }, lR: bentR, lL: straightL, a: { elev: 85, plane: 0, bend: 30 }, effort: 1, hold: 0.2, move: 1.2 },
          mid,
          { body: { pos: [-14, 52, -14], pitch: 30 }, lR: straightR, lL: bentL, a: { elev: 85, plane: 0, bend: 30 }, effort: 1, hold: 0.2, move: 1.2 },
        ],
        { cam: { az: 82, el: 8 } },
      );
    })(),
    split_squat: motion(
      [
        { body: { pos: [-4, 78, 0], pitch: 2 }, ...split(30, -40), a: hangArm, effort: 0.2, hold: 0.25, move: 1.3 },
        { body: { pos: [-4, 46, 0], pitch: 4 }, ...split(30, -40), a: hangArm, effort: 1, hold: 0.15, move: 1.1 },
      ],
      { cam: { az: 22, el: 6 } },
    ),
    bulgarian_split_squat: motion(
      [
        { body: { pos: [-2, 76, 0], pitch: 10 }, lR: { to: [34, ANKLE, 10], pole: [1, 0, 0.1] }, lL: { to: [-47, 50, -10], pole: [0.1, -1, 0], foot: [-0.9, -0.42, 0] }, a: hangArm, effort: 0.2, hold: 0.25, move: 1.4 },
        { body: { pos: [-4, 44, 0], pitch: 16 }, lR: { to: [34, ANKLE, 10], pole: [1, 0, 0.1] }, lL: { to: [-47, 50, -10], pole: [0.1, -1, 0], foot: [-0.9, -0.42, 0] }, a: hangArm, effort: 1, hold: 0.15, move: 1.1 },
      ],
      { cam: { az: 22, el: 6 }, props: [...bench(-76, -40, 42), { type: "dumbbell" }] },
    ),
    // Lunges: the moving foot lifts and travels through the air before it lands.
    reverse_lunge: motion(
      [
        { body: { pos: [30, SH - 1, 0] }, lR: { to: [30, ANKLE, 10], pole: [1, 0, 0.1] }, lL: { to: [30, ANKLE, -10], pole: [1, 0, -0.1] }, a: hangArm, effort: 0.2, hold: 0.25, move: 0.5 },
        { body: { pos: [24, SH - 6, 0] }, lR: { to: [30, ANKLE, 10], pole: [1, 0, 0.1] }, lL: { to: [-4, 22, -10], pole: [0.6, -0.6, 0], foot: [0.5, -0.87, 0] }, a: hangArm, effort: 0.4, hold: 0, move: 0.6 },
        { body: { pos: [8, 46, 0], pitch: 6 }, lR: { to: [30, ANKLE, 10], pole: [1, 0, 0.1] }, lL: { to: [-38, 14, -10], pole: [0.15, -1, 0], foot: [0.3, -0.95, 0] }, a: hangArm, effort: 1, hold: 0.15, move: 0.8 },
        { body: { pos: [24, SH - 6, 0] }, lR: { to: [30, ANKLE, 10], pole: [1, 0, 0.1] }, lL: { to: [-4, 22, -10], pole: [0.6, -0.6, 0], foot: [0.5, -0.87, 0] }, a: hangArm, effort: 0.6, hold: 0, move: 0.5 },
      ],
      { cam: { az: 22, el: 6 }, props: [{ type: "dumbbell" }] },
    ),
    walking_lunge: motion(
      [
        { body: { pos: [-4, 46, 0], pitch: 4 }, lR: { to: [36, ANKLE, 10], pole: [1, 0, 0.1] }, lL: { to: [-36, 14, -10], pole: [0.15, -1, 0], foot: [0.3, -0.95, 0] }, a: hangArm, effort: 1, hold: 0.1, move: 0.8 },
        { body: { pos: [30, SH - 4, 0] }, lR: { to: [36, ANKLE, 10], pole: [1, 0, 0.1] }, lL: { to: [30, 26, -10], pole: [1, 0.3, 0], foot: [0.6, -0.8, 0] }, a: hangArm, effort: 0.4, hold: 0, move: 0.7 },
        { body: { pos: [68, 46, 0], pitch: 4 }, lL: { to: [108, ANKLE, -10], pole: [1, 0, -0.1] }, lR: { to: [36, 14, 10], pole: [0.15, -1, 0], foot: [0.3, -0.95, 0] }, a: hangArm, effort: 1, hold: 0.1, move: 0.8 },
        { body: { pos: [102, SH - 4, 0] }, lL: { to: [108, ANKLE, -10], pole: [1, 0, -0.1] }, lR: { to: [102, 26, 10], pole: [1, 0.3, 0], foot: [0.6, -0.8, 0] }, a: hangArm, effort: 0.4, hold: 0, move: 0 },
      ],
      { cam: { az: 22, el: 6 }, props: [{ type: "dumbbell" }] },
    ),
    step_up: motion(
      [
        { body: { pos: [-8, 78, 0], pitch: 14 }, lR: { to: [30, 41, 10], pole: [1, 0, 0.1] }, lL: { to: [-10, ANKLE, -10], pole: [1, 0, -0.1] }, a: hangArm, effort: 0.3, hold: 0.25, move: 0.7 },
        { body: { pos: [10, 102, 0], pitch: 8 }, lR: { to: [30, 41, 10], pole: [1, 0, 0.1] }, lL: { to: [-6, 22, -10], pole: [0.6, -0.4, -0.1], foot: [0.6, -0.8, 0] }, a: hangArm, effort: 0.8, hold: 0, move: 0.6 },
        { body: { pos: [28, 122, 0], pitch: 2 }, lR: { to: [30, 41, 10], pole: [1, 0, 0.1] }, lL: { to: [16, 66, -10], pole: [1, 0.2, -0.1], foot: [0.8, -0.6, 0] }, a: hangArm, effort: 1, hold: 0.3, move: 0.7 },
        { body: { pos: [10, 102, 0], pitch: 8 }, lR: { to: [30, 41, 10], pole: [1, 0, 0.1] }, lL: { to: [-6, 22, -10], pole: [0.6, -0.4, -0.1], foot: [0.6, -0.8, 0] }, a: hangArm, effort: 0.6, hold: 0, move: 0.6 },
      ],
      { cam: { az: 24, el: 6 }, props: [box([30, 18, 0], [40, 36, 46], { name: "box" }), { type: "dumbbell" }] },
    ),
    pistol_squat: motion(
      [
        { body: { pos: [0, SH - 2, 0], pitch: 4 }, lR: feet(0, 8, 10), lL: { elev: 40, plane: 0, bend: 5 }, a: { elev: 85, plane: 4, bend: 4 }, effort: 0.2, hold: 0.25, move: 1.6 },
        { body: { pos: [-20, 34, 0], pitch: 36 }, spine: { flex: 12 }, head: -6, lR: feet(0, 8, 10), lL: { elev: 118, plane: 0, bend: 4, ankle: -5 }, a: { elev: 95, plane: 4, bend: 4 }, effort: 1, hold: 0.15, move: 1.3 },
      ],
      { cam: { az: 24, el: 8 } },
    ),
    leg_extension: motion(
      [
        { body: { pos: [0, 50, 0], pitch: -12 }, a: { to: [16, 50, 24], pole: [0, -1, 0.5] }, l: { elev: 90, bend: 90, ankle: 0 }, effort: 0.1, hold: 0.2, move: 1 },
        { body: { pos: [0, 50, 0], pitch: -12 }, a: { to: [16, 50, 24], pole: [0, -1, 0.5] }, l: { elev: 90, bend: 4, ankle: 10 }, effort: 1, hold: 0.45, move: 1.5 },
      ],
      { cam: { az: 22, el: 8 }, props: [...machineProps(12), { type: "rod", a: "ankleR", b: "ankleL", w: 9, color: "propDark" }] },
    ),
    sissy_squat: motion(
      [
        { body: { pos: [0, SH - 2, 0] }, lR: { to: [0, 12, 10], pole: [1, 0, 0.1], foot: [0.6, -0.8, 0] }, lL: { to: [0, 12, -10], pole: [1, 0, -0.1], foot: [0.6, -0.8, 0] }, aL: { to: [6, 110, -36], pole: [0, -1, -0.3] }, aR: hangArm, effort: 0.2, hold: 0.25, move: 1.5 },
        { body: { pos: [26, 50, 0], pitch: -42 }, head: 18, lR: { to: [0, 12, 10], pole: [1, 0, 0.1], foot: [0.6, -0.8, 0] }, lL: { to: [0, 12, -10], pole: [1, 0, -0.1], foot: [0.6, -0.8, 0] }, aL: { to: [6, 110, -36], pole: [0, -1, -0.3] }, aR: { elev: 70, plane: 0, bend: 10 }, effort: 1, hold: 0.15, move: 1.2 },
      ],
      { cam: { az: 20, el: 6 }, props: [rod([6, 0, -40], [6, 160, -40], 5, "propDark")] },
    ),
    reverse_nordic: motion(
      [
        { ...nordicPose(0), a: { elev: 80, plane: 0, bend: 4 }, effort: 0.2, hold: 0.25, move: 1.6 },
        { ...nordicPose(-46), head: 12, a: { elev: 80, plane: 0, bend: 4 }, effort: 1, hold: 0.2, move: 1.4 },
      ],
      { cam: { az: 22, el: 8 }, props: [box([-2, 2, 0], [24, 4, 30], { through: true })] },
    ),
  };
}

/** Kneeling tall, leaning `lean` degrees (forward +, back −) with the hips kept straight. */
function nordicPose(lean) {
  const knee = [0, 7];
  const hip = [knee[0] + Math.sin(rad(lean)) * 41, knee[1] + Math.cos(rad(lean)) * 41];
  return {
    body: { pos: [hip[0] + Math.sin(rad(lean)) * 2, hip[1] + Math.cos(rad(lean)) * 2, 0], pitch: lean },
    l: { to: [-37, 14, 10], pole: [0, -1, 0], foot: [0.3, -0.95, 0] },
  };
}

// ═════════════════════════════════════════════════════════════════════════
// HIPS
// ═════════════════════════════════════════════════════════════════════════
/**
 * Side plank on the right forearm, body facing the camera. The body is one
 * straight line; `roll` tilts it (90 = level), `hipY` sets the pelvis height
 * so the elbow sits under the shoulder on the floor.
 */
function sidePlankPose({ roll = 76, hipY = 34, topLeg, bottomLeg } = {}) {
  return {
    body: { pos: [0, hipY, 0], roll },
    head: 0,
    aR: { at: "shoulderR", to: [22, -24, 2], pole: [0, -1, 0] },
    aL: { elev: 8, plane: 85, bend: 10 },
    lR: bottomLeg ?? { elev: 0, plane: 0, bend: 0, ankle: 10 },
    lL: topLeg ?? { elev: 0, plane: 0, bend: 0, ankle: 10 },
  };
}

function hips() {
  // Seat raised so the feet rest on the machine's footrests.
  const machineSeat = { body: { pos: [0, 56, 0], pitch: -10 }, a: { to: [18, 56, 26], pole: [0, -1, 0.5] } };
  const seatedLeg = (plane) => ({ elev: 88, plane, bend: 84, ankle: 0 });
  const highSeat = [...seat(4, 48), backPad(-2, 56, 10, 70), rod([30, 8, -40], [30, 8, 40], 3, "propDark")];
  return {
    hip_adduction_machine: motion(
      [
        { ...machineSeat, l: seatedLeg(42), effort: 0.2, hold: 0.2, move: 1 },
        { ...machineSeat, l: seatedLeg(3), effort: 1, hold: 0.4, move: 1.4 },
      ],
      { cam: { az: 80, el: 28 }, props: [...highSeat, { type: "roller", on: "kneeR", offset: [0, 0, -6], r: 6 }, { type: "roller", on: "kneeL", offset: [0, 0, 6], r: 6 }] },
    ),
    hip_abduction_machine: motion(
      [
        { body: { pos: [0, 56, 0], pitch: 14 }, a: { to: [22, 58, 28], pole: [0, -1, 0.5] }, l: seatedLeg(3), effort: 0.2, hold: 0.2, move: 1 },
        { body: { pos: [0, 56, 0], pitch: 14 }, a: { to: [22, 58, 28], pole: [0, -1, 0.5] }, l: seatedLeg(42), effort: 1, hold: 0.4, move: 1.4 },
      ],
      { cam: { az: 80, el: 28 }, props: [...seat(4, 48), rod([30, 8, -40], [30, 8, 40], 3, "propDark"), { type: "roller", on: "kneeR", offset: [0, 0, 6], r: 6 }, { type: "roller", on: "kneeL", offset: [0, 0, -6], r: 6 }] },
    ),
    // Top (left) leg on the bench, body level; the hips lift until the body is straight.
    copenhagen_plank: motion(
      [
        // Solved so the elbow rests on the floor and the top ankle sits on a standard bench (top 42).
        { ...sidePlankPose({ roll: 83, hipY: 40, bottomLeg: { elev: 25, plane: 0, bend: 70, ankle: 10 }, topLeg: { to: [0, 45.8, -82.4], pole: [1, 0, 0], foot: "neutral" } }), effort: 0.6, hold: 0.5, move: 1.2 },
        { ...sidePlankPose({ roll: 86, hipY: 43, bottomLeg: { elev: 25, plane: 0, bend: 70, ankle: 10 }, topLeg: { to: [0, 45.8, -82.4], pole: [1, 0, 0], foot: "neutral" } }), effort: 1, hold: 1.4, move: 1.2 },
      ],
      { cam: { az: 90, el: 8 }, props: [box([0, 20, -86], [30, 40, 26], { name: "bench", through: true })] },
    ),
    banded_lateral_walk: motion(
      [
        { body: { pos: [-6, 76, 0], pitch: 18 }, lR: { to: [0, ANKLE, 12], pole: [1, 0, 0.3] }, lL: { to: [0, ANKLE, -12], pole: [1, 0, -0.3] }, a: { elev: 20, plane: 0, bend: 70 }, effort: 0.5, hold: 0.1, move: 0.6 },
        { body: { pos: [-6, 76, 8], pitch: 18 }, lR: { to: [0, ANKLE, 32], pole: [1, 0, 0.3] }, lL: { to: [0, ANKLE, -12], pole: [1, 0, -0.3] }, a: { elev: 20, plane: 0, bend: 70 }, effort: 1, hold: 0.1, move: 0.6 },
        { body: { pos: [-6, 76, 16], pitch: 18 }, lR: { to: [0, ANKLE, 32], pole: [1, 0, 0.3] }, lL: { to: [0, ANKLE, 8], pole: [1, 0, -0.3] }, a: { elev: 20, plane: 0, bend: 70 }, effort: 0.5, hold: 0.1, move: 0.6 },
        { body: { pos: [-6, 76, 8], pitch: 18 }, lR: { to: [0, ANKLE, 32], pole: [1, 0, 0.3] }, lL: { to: [0, ANKLE, -12], pole: [1, 0, -0.3] }, a: { elev: 20, plane: 0, bend: 70 }, effort: 1, hold: 0.1, move: 0.6 },
      ],
      { cam: { az: 80, el: 8 }, props: [{ type: "band", from: "kneeR", to: "kneeL" }] },
    ),
    cable_hip_abduction: motion(
      [
        { body: { pos: [0, SH - 1, 0], pitch: 4 }, lL: feet(0, -10, 6), lR: { elev: 18, plane: -50, bend: 24, ankle: 0 }, aL: { to: [4, 108, -40], pole: [0, -1, -0.4] }, aR: { elev: 10, plane: 60, bend: 60 }, effort: 0.1, hold: 0.2, move: 1 },
        { body: { pos: [0, SH - 1, -3], pitch: 4, roll: -4 }, lL: feet(0, -10, 6), lR: { elev: 38, plane: 90, bend: 2, ankle: 10 }, aL: { to: [4, 108, -40], pole: [0, -1, -0.4] }, aR: { elev: 10, plane: 60, bend: 60 }, effort: 1, hold: 0.4, move: 1.3 },
      ],
      { cam: { az: 86, el: 6 }, props: [{ type: "cable", from: "ankleR", to: [4, 10, -46] }, rod([4, 0, -46], [4, 180, -46], 4, "propDark")] },
    ),
  };
}

// ═════════════════════════════════════════════════════════════════════════
// CALVES
// ═════════════════════════════════════════════════════════════════════════
/**
 * Calf raise on a step: the ball of the foot stays on the edge, the ankle
 * rotates from a stretch (heel below) to full rise. Returns the ankle point
 * and foot direction for a given plantar-flexion angle.
 */
function onBall(ball, angle) {
  const c = Math.cos(rad(angle));
  const s = Math.sin(rad(angle));
  const foot = [c, -s, 0];
  // ankle sits 9 back along the foot from the ball and ~3.5 above the sole
  const ankle = [ball[0] - 9 * c - 3.5 * s, ball[1] + 9 * s + 3.5 * c, ball[2]];
  return { to: ankle, foot, pole: [1, 0, 0] };
}
function calves() {
  const step = (x = 6, top = 10) => box([x + 12, top / 2, 0], [24, top, 50], { name: "step", through: true });
  const standingRaise = (angle, extra = {}) => {
    const R = onBall([6, 10, 10], angle);
    const L = onBall([6, 10, -10], angle);
    const j = solve({ body: { pos: [0, 120, 0] }, lR: R, lL: L });
    // straight legs: pelvis sits a leg-length above the ankles
    return { body: { pos: [R.to[0] - 1, R.to[1] + 80 + 2, 0], pitch: 0 }, lR: R, lL: L, ...extra, _j: j && undefined };
  };
  const raise = (lo, hi, props, extraLo = {}, extraHi = {}, cam = { az: 22, el: 6 }) =>
    motion(
      [
        { ...standingRaise(lo, extraLo), effort: 0.4, hold: 0.6, move: 0.9 },
        { ...standingRaise(hi, extraHi), effort: 1, hold: 0.6, move: 1.3 },
      ],
      { cam, props },
    );
  // Seated: knees bent 90°, pad on the knees; only the ankles move.
  const seatedRaise = (angle) => {
    const R = onBall([40, 12, 12], angle);
    const L = onBall([40, 12, -12], angle);
    return { body: { pos: [0, 50, 0], pitch: 0 }, lR: { ...R, pole: [1, 1, 0] }, lL: { ...L, pole: [1, 1, 0] }, a: { to: [36, 66, 18], pole: [0, -1, 0.4] } };
  };
  return {
    standing_calf_raise: raise(-18, 38, [step(), box([0, 150, 0], [12, 6, 60], { through: true }), rod([-14, 0, 32], [-14, 160, 32], 4, "propDark")], { a: { at: "neck", local: true, to: [-2, 4, 28], pole: [0, -1, 0.3] } }, { a: { at: "neck", local: true, to: [-2, 4, 28], pole: [0, -1, 0.3] } }),
    smith_calf_raise: raise(-18, 38, [step(), { type: "barbell", on: "neck", local: [-8, -2], r: 17 }, ...uprights(-4, 210, 66)], { a: { at: "neck", local: true, to: [-6, -3, 30], pole: [-0.3, -1, 0.2] } }, { a: { at: "neck", local: true, to: [-6, -3, 30], pole: [-0.3, -1, 0.2] } }),
    single_leg_calf_raise: motion(
      [
        { ...standingRaise(-18), lL: { elev: 10, plane: 180, bend: 80 }, aL: { to: [40, 130, -20], pole: [0, -1, -0.3] }, aR: hangArm, effort: 0.4, hold: 0.6, move: 0.9 },
        { ...standingRaise(38), lL: { elev: 10, plane: 180, bend: 80 }, aL: { to: [40, 130, -20], pole: [0, -1, -0.3] }, aR: hangArm, effort: 1, hold: 0.6, move: 1.3 },
      ],
      { cam: { az: 22, el: 6 }, props: [step(), box([46, 110, 0], [4, 220, 80], { name: "wall", through: true })] },
    ),
    seated_calf_raise: motion(
      [
        { ...seatedRaise(-16), effort: 0.4, hold: 0.6, move: 0.9 },
        { ...seatedRaise(36), effort: 1, hold: 0.6, move: 1.3 },
      ],
      { cam: { az: -35, el: 10 }, props: [...seat(4, 42), step(34, 12), { type: "rod", a: "kneeR", b: "kneeL", w: 8, color: "propDark" }] },
    ),
    // Leg-press calf raise: legs stay straight on the 45° sled; only the ankles
    // move, pushing the plate a few centimetres along its track.
    leg_press_calf_raise: (() => {
      const along = [Math.cos(rad(45)), Math.sin(rad(45))]; // sled travel
      const up = [-along[1], along[0]]; // plate surface, toward the toes
      const frame = (ankle, push) => {
        const ball = [10 + along[0] * (70 + push) - up[0] * 4, 40 + along[1] * (70 + push) - up[1] * 4];
        // foot points up the plate when neutral; plantar-flexion tips it toward the sled direction
        const fd = [up[0] * Math.cos(rad(ankle)) + along[0] * Math.sin(rad(ankle)), up[1] * Math.cos(rad(ankle)) + along[1] * Math.sin(rad(ankle))];
        const sole = [along[0], along[1]];
        const ank = (z) => [ball[0] - fd[0] * 9 - sole[0] * 3.5, ball[1] - fd[1] * 9 - sole[1] * 3.5, z];
        return {
          body: { pos: [0, 40, 0], pitch: -62 },
          head: 20,
          a: { elev: 25, plane: 40, bend: 50 },
          lR: { to: ank(12), pole: [0.3, 0.4, 0.3], foot: [fd[0], fd[1], 0] },
          lL: { to: ank(-12), pole: [0.3, 0.4, -0.3], foot: [fd[0], fd[1], 0] },
          props: [box([10 + along[0] * (78 + push), 40 + along[1] * (78 + push), 0], [6, 52, 64], { pitch: -45, name: "sled", through: true })],
        };
      };
      return motion(
        [
          { ...frame(-14, 0), effort: 0.4, hold: 0.5, move: 0.9 },
          { ...frame(32, 8), effort: 1, hold: 0.5, move: 1.2 },
        ],
        { cam: { az: 10, el: 6 }, props: [box([-18, 32, 0], [34, 6, 34], { pitch: -10, name: "seat" }), box([-40, 62, 0], [6, 60, 32], { pitch: 62, name: "back pad", through: true }), box([-10, 14, 0], [60, 28, 10], { through: true })] },
      );
    })(),
  };
}

// ═════════════════════════════════════════════════════════════════════════
// ARMS
// ═════════════════════════════════════════════════════════════════════════
function arms() {
  const tall = { body: { pos: [0, SH - 1, 0], pitch: 2 }, l: feet(0, 11, 8) };
  // Curls: the upper arm stays at the side (drifts ~10° forward at the top); only the elbow moves.
  const curl = (implement, { base = tall, down = { elev: 3, plane: 25, bend: 6 }, up = { elev: 12, plane: 12, bend: 140 }, cam = { az: 28, el: 5 }, props = [] } = {}) =>
    motion(
      [
        { ...base, a: down, effort: 0, hold: 0.25, move: 1 },
        { ...base, a: up, effort: 1, hold: 0.35, move: 1.5 },
      ],
      { cam, props: [...(implement ? [implement] : []), ...props] },
    );
  const lowCable = [{ type: "cable", from: "handsMid", to: [44, 10, 0] }, ...pulley([44, 10, 0])];
  // Pushdown: elbows pinned at the sides, forearms go from ~90° to straight.
  const pushdown = (props) =>
    motion(
      [
        { body: { pos: [0, SH - 2, 0], pitch: 12 }, l: feet(0, 11, 8), a: { elev: 4, plane: 10, bend: 96 }, effort: 0.2, hold: 0.2, move: 0.9 },
        { body: { pos: [0, SH - 2, 0], pitch: 12 }, l: feet(0, 11, 8), a: { elev: 4, plane: 14, bend: 4 }, effort: 1, hold: 0.4, move: 1.4 },
      ],
      { cam: { az: 24, el: 6 }, props },
    );
  const inclineSeat = (lean) => ({ body: { pos: [0, 50, 0], pitch: -lean }, head: 8, l: { to: [44, ANKLE, 18], pole: [0.6, 1, 0.3], foot: [1, 0, 0.2] } });
  const proneIncline = { body: { pos: [-18, 78, 0], pitch: 45 }, head: 10, l: { to: [-56, ANKLE, 12], pole: [1, 0, 0.1] } };
  const proneBench = [box([9, 84, 0], [6, 76, 28], { pitch: -45, name: "bench", through: true }), box([-6, 30, 0], [10, 60, 10], { through: true })];
  return {
    barbell_curl: curl({ type: "barbell", r: 11, half: 50 }, { cam: { az: 55, el: 6 } }),
    ez_bar_curl: curl({ type: "barbell", r: 11, half: 44 }, { cam: { az: 55, el: 6 } }),
    reverse_curl: curl({ type: "barbell", r: 11, half: 44 }, { up: { elev: 12, plane: 12, bend: 132 }, cam: { az: 55, el: 6 } }),
    dumbbell_curl: curl({ type: "dumbbell" }),
    hammer_curl: curl({ type: "dumbbell", grip: "neutral" }, { down: { elev: 3, plane: 60, bend: 6 }, up: { elev: 10, plane: 40, bend: 135 } }),
    cable_curl: curl({ type: "handle" }, { props: lowCable }),
    band_curl: curl(null, { props: [{ type: "band", from: "handR", to: "ankleR" }, { type: "band", from: "handL", to: "ankleL" }] }),
    incline_dumbbell_curl: curl({ type: "dumbbell" }, {
      base: inclineSeat(32),
      // arms hang straight down — behind the torso on the incline
      down: { elev: 32, plane: 180, bend: 6 },
      up: { elev: 32, plane: 180, bend: 132 },
      cam: { az: 24, el: 8 },
      props: [...seat(4, 42, 30, 32), backPad(-2, 50, 32, 70)],
    }),
    preacher_curl: curl({ type: "barbell", r: 12, half: 44 }, {
      base: { body: { pos: [0, 52, 0], pitch: 12 }, l: { to: [34, ANKLE, 14], pole: [0.6, 1, 0.2] } },
      down: { elev: 48, plane: 0, bend: 22 },
      up: { elev: 48, plane: 0, bend: 140 },
      cam: { az: 24, el: 10 },
      props: [...seat(-2, 44), box([25, 94, 0], [6, 34, 40], { pitch: -45, name: "pad", through: true }), box([22, 50, 0], [8, 70, 8], { through: true })],
    }),
    concentration_curl: curl({ type: "dumbbell", hands: ["R"] }, {
      base: { body: { pos: [0, 50, 0], pitch: 40 }, head: -20, lR: { to: [36, ANKLE, 24], pole: [0.5, 1, 0.5] }, lL: { to: [36, ANKLE, -24], pole: [0.5, 1, -0.5] }, aL: { to: [34, 52, -18], pole: [0, -1, -0.5] } },
      down: { elev: 40, plane: -8, bend: 8 },
      up: { elev: 40, plane: -8, bend: 140 },
      cam: { az: 40, el: 14 },
      props: seat(-2, 42),
    }),
    spider_curl: curl({ type: "dumbbell" }, { base: proneIncline, down: { elev: 45, plane: 0, bend: 6 }, up: { elev: 45, plane: 0, bend: 140 }, cam: { az: 24, el: 8 }, props: proneBench }),
    bayesian_cable_curl: curl(null, {
      base: { body: { pos: [6, SH - 2, 0], pitch: 6 }, lR: feet(-14, 10), lL: feet(18, -10), aL: hangArm },
      down: { elev: 28, plane: 180, bend: 6 },
      up: { elev: 28, plane: 180, bend: 136 },
      cam: { az: 26, el: 6 },
      props: [{ type: "cable", hand: "R", to: [-80, 14, 12] }, ...pulley([-80, 14, 12])],
    }),
    rope_pushdown: pushdown([{ type: "rope" }, { type: "cable", from: "handsMid", to: [40, 204, 0] }, ...pulley([40, 204, 0])]),
    band_pushdown: pushdown([{ type: "band", from: "handR", to: [40, 200, 0] }, { type: "band", from: "handL", to: [40, 200, 0] }]),
    overhead_cable_extension: motion(
      [
        { body: { pos: [8, SH - 3, 0], pitch: 30 }, head: -10, lR: feet(-18, 10), lL: feet(22, -10), a: { elev: 165, plane: 4, bend: 128 }, effort: 0.3, hold: 0.2, move: 1 },
        { body: { pos: [8, SH - 3, 0], pitch: 30 }, head: -10, lR: feet(-18, 10), lL: feet(22, -10), a: { elev: 165, plane: 4, bend: 6 }, effort: 1, hold: 0.35, move: 1.5 },
      ],
      { cam: { az: 24, el: 6 }, props: [{ type: "rope" }, { type: "cable", from: "handsMid", to: [-60, 150, 0] }, ...pulley([-60, 150, 0])] },
    ),
    overhead_dumbbell_extension: motion(
      [
        { ...tall, a: { elev: 168, plane: -8, bend: 136 }, effort: 0.3, hold: 0.2, move: 1 },
        { ...tall, a: { elev: 168, plane: -8, bend: 6 }, effort: 1, hold: 0.35, move: 1.5 },
      ],
      { cam: { az: 28, el: 6 }, props: [{ type: "single", axis: "forearm" }] },
    ),
    skull_crusher: motion(
      [
        { ...supine(), a: { elev: 105, plane: 0, bend: 6 }, effort: 1, hold: 0.3, move: 1.5 },
        { ...supine(), a: { elev: 105, plane: 0, bend: 128 }, effort: 0.3, hold: 0.15, move: 1 },
      ],
      { cam: { az: 26, el: 20 }, props: [...BENCH, { type: "barbell", r: 12, half: 44 }] },
    ),
    dumbbell_kickback: motion(
      [
        { body: { pos: [-6, 76, -6], pitch: 84 }, head: -20, lL: { to: [-40, 52, -12], pole: [0, -1, 0], foot: [-0.9, -0.3, 0] }, lR: { to: [4, ANKLE, 28], pole: [1, 0, 0.3] }, aL: { to: [44, 47, -12], pole: [-1, 0, -0.2] }, aR: { elev: 12, plane: 180, bend: 96 }, effort: 0.2, hold: 0.2, move: 0.9 },
        { body: { pos: [-6, 76, -6], pitch: 84 }, head: -20, lL: { to: [-40, 52, -12], pole: [0, -1, 0], foot: [-0.9, -0.3, 0] }, lR: { to: [4, ANKLE, 28], pole: [1, 0, 0.3] }, aL: { to: [44, 47, -12], pole: [-1, 0, -0.2] }, aR: { elev: 12, plane: 180, bend: 4 }, effort: 1, hold: 0.45, move: 1.3 },
      ],
      { cam: { az: 22, el: 16 }, props: [...bench(-60, 56, 42).map((b) => ({ ...b, c: [b.c[0], b.c[1], -12] })), { type: "dumbbell", hands: ["R"], grip: "neutral" }] },
    ),
    triceps_dip: (() => {
      const hand = { to: [2, 116, 24], pole: [-1, 0, 0.12] };
      const legs = { elev: 6, plane: 180, bend: 75 };
      const top = align({ body: { pos: [-4, 120, 0], pitch: 4 }, head: 0, a: hand, l: legs }, "shoulderR", -1, 166);
      const low = align({ body: { pos: [-4, 92, 0], pitch: 8 }, head: 0, a: hand, l: legs }, "shoulderR", 1, 134);
      return motion([{ ...top, effort: 1, hold: 0.25, move: 1.3 }, { ...low, effort: 0.4, hold: 0.15, move: 1 }], { cam: { az: 26, el: 8 }, props: [rod([-30, 112, 24], [40, 112, 24], 4), rod([-30, 112, -24], [40, 112, -24], 4), rod([-26, 0, 24], [-26, 112, 24], 4, "propDark"), rod([-26, 0, -24], [-26, 112, -24], 4, "propDark")] });
    })(),
    bench_dip: motion(
      [
        { body: { pos: [6, 50, 0], pitch: 2 }, a: { to: [-6, 47, 18], pole: [-1, 0, 0.2] }, l: { to: [72, ANKLE, 12], pole: [0.2, 1, 0], foot: "neutral" }, effort: 1, hold: 0.25, move: 1.3 },
        { body: { pos: [6, 34, 0], pitch: 6 }, a: { to: [-6, 47, 18], pole: [-1, 0, 0.2] }, l: { to: [72, ANKLE, 12], pole: [0.2, 1, 0], foot: "neutral" }, effort: 0.4, hold: 0.15, move: 1 },
      ],
      { cam: { az: 26, el: 10 }, props: bench(-60, -2, 42) },
    ),
    wrist_curl: motion(
      [
        { body: { pos: [0, 50, 0], pitch: 30 }, head: -10, l: { to: [38, ANKLE, 13], pole: [0.6, 1, 0.2] }, a: { to: [44, 55, 12], pole: [-1, -0.5, 0.2], wrist: -50 }, effort: 0.2, hold: 0.2, move: 0.8 },
        { body: { pos: [0, 50, 0], pitch: 30 }, head: -10, l: { to: [38, ANKLE, 13], pole: [0.6, 1, 0.2] }, a: { to: [44, 55, 12], pole: [-1, -0.5, 0.2], wrist: 55 }, effort: 1, hold: 0.35, move: 1 },
      ],
      { cam: { az: 22, el: 12 }, props: [...seat(-2, 42), { type: "dumbbell" }] },
    ),
  };
}

// ═════════════════════════════════════════════════════════════════════════
// CORE & CARRIES
// ═════════════════════════════════════════════════════════════════════════
function core() {
  const BAR = 203;
  const hangGrip = { to: [2, BAR - 4, 22], pole: [0.2, -1, 0.6] };
  const hangBar = [rod([2, BAR, -62], [2, BAR, 62], 3), rod([2, 0, -62], [2, BAR, -62], 4, "propDark"), rod([2, 0, 62], [2, BAR, 62], 4, "propDark")];
  // Lying on the floor, head toward −x, knees bent with feet flat.
  const floorBack = (extra = {}) => ({ body: { pos: [0, 10, 0], pitch: -90 }, head: 4, l: { to: [34, ANKLE, 13], pole: [0.4, 1, 0.2], foot: [1, 0, 0.1] }, ...extra });
  const handsAtHead = { at: "neck", local: true, to: [-2, 16, 10], pole: [0, -0.2, 1] };
  // Kneeling tall (cable crunch, ab wheel): knees on the floor, toes tucked.
  const kneel = { to: [-37, 14, 10], pole: [0, -1, 0], foot: [0.3, -0.95, 0] };
  // Forearm plank: elbows under the shoulders, body straight from heels to head.
  const plankFeet = [-95, 12];
  const plankAt = (deg) => {
    const u = [Math.cos(rad(deg)), Math.sin(rad(deg))];
    return { body: { pos: [plankFeet[0] + u[0] * 82, plankFeet[1] + u[1] * 82, 0], pitch: 90 - deg }, head: 2 };
  };
  const plankLegs = { to: [plankFeet[0], plankFeet[1], 9], pole: [0, -1, 0], foot: [0.6, -0.8, 0] };
  const forearms = { at: "shoulderR", to: [22, -26, -4], pole: [0, -1, 0] };
  // Walking in place for carries: legs swing, the pelvis bobs a little.
  const step = (r, l, y) => ({ body: { pos: [0, y, 0], pitch: 1 }, lR: r, lL: l, a: { elev: 3, plane: 75, bend: 4 } });
  const swingFwd = { elev: 22, plane: 0, bend: 8, ankle: -8 };
  const swingBack = { elev: 14, plane: 180, bend: 26, ankle: 8 };
  const passing = { elev: 2, plane: 0, bend: 38, ankle: 0 };
  const plant = { elev: 4, plane: 0, bend: 4, ankle: 0 };
  return {
    farmers_carry: motion(
      [
        { ...step(swingFwd, swingBack, SH - 1), effort: 1, hold: 0, move: 0.38 },
        { ...step(plant, passing, SH - 1), effort: 1, hold: 0, move: 0.38 },
        { ...step(swingBack, swingFwd, SH - 1), effort: 1, hold: 0, move: 0.38 },
        { ...step(passing, plant, SH - 1), effort: 1, hold: 0, move: 0.38 },
      ],
      { cam: { az: 25, el: 6 }, props: [{ type: "dumbbell", grip: "neutral" }] },
    ),
    dead_hang: motion(
      [
        { body: { pos: [0, 101, 0], pitch: -2 }, a: hangGrip, l: { elev: 6, plane: 0, bend: 8 }, shrug: 5, effort: 0.6, hold: 1.2, move: 0.8 },
        { body: { pos: [0, 105, 0], pitch: -2 }, a: hangGrip, l: { elev: 6, plane: 0, bend: 8 }, shrug: -2, effort: 1, hold: 1.2, move: 0.8 },
      ],
      { cam: { az: -30, el: 8 }, props: hangBar },
    ),
    hanging_leg_raise: motion(
      [
        { body: { pos: [0, 101, 0], pitch: -2 }, a: hangGrip, l: { elev: 4, plane: 0, bend: 4 }, effort: 0.2, hold: 0.25, move: 1.2 },
        { body: { pos: [2, 104, 0], pitch: -16 }, spine: { flex: 18 }, a: hangGrip, l: { elev: 112, plane: 0, bend: 10, ankle: 10 }, effort: 1, hold: 0.3, move: 1.5 },
      ],
      { cam: { az: 20, el: 6 }, props: hangBar },
    ),
    cable_crunch: motion(
      [
        { body: { pos: [0, 50, 0], pitch: 14 }, head: 0, l: kneel, a: handsAtHead, effort: 0.2, hold: 0.25, move: 1 },
        { body: { pos: [0, 50, 0], pitch: 20 }, spine: { flex: 62 }, head: 20, l: kneel, a: handsAtHead, effort: 1, hold: 0.35, move: 1.4 },
      ],
      { cam: { az: 22, el: 8 }, props: [{ type: "rope" }, { type: "cable", from: "handsMid", to: [30, 210, 0] }, ...pulley([30, 210, 0])] },
    ),
    crunch: motion(
      [
        { ...floorBack(), a: handsAtHead, effort: 0.2, hold: 0.2, move: 0.9 },
        { ...floorBack(), spine: { flex: 34 }, head: 12, a: handsAtHead, effort: 1, hold: 0.45, move: 1.1 },
      ],
      { cam: { az: 24, el: 12 } },
    ),
    decline_sit_up: motion(
      [
        { body: { pos: [0, 66, 0], pitch: -106 }, head: 10, l: { to: [44, 66, 10], pole: [0.2, 1, 0.1], foot: [0.6, 0.8, 0] }, a: handsAtHead, effort: 0.3, hold: 0.2, move: 1.3 },
        { body: { pos: [0, 66, 0], pitch: -12 }, spine: { flex: 26 }, head: 10, l: { to: [44, 66, 10], pole: [0.2, 1, 0.1], foot: [0.6, 0.8, 0] }, a: handsAtHead, effort: 1, hold: 0.2, move: 1.8 },
      ],
      { cam: { az: 24, el: 8 }, props: [box([-14, 52, 0], [112, 6, 27], { pitch: 16, name: "bench", through: true }), box([-10, 26, 0], [12, 50, 8], { through: true }), rod([48, 60, -14], [48, 60, 14], 5, "propDark")] },
    ),
    bicycle_crunch: motion(
      [
        { ...floorBack(), spine: { flex: 26, twist: 30 }, head: 12, a: handsAtHead, lL: { elev: 105, plane: 0, bend: 105 }, lR: { elev: 30, plane: 0, bend: 2 }, effort: 1, hold: 0.15, move: 0.9 },
        { ...floorBack(), spine: { flex: 26, twist: -30 }, head: 12, a: handsAtHead, lR: { elev: 105, plane: 0, bend: 105 }, lL: { elev: 30, plane: 0, bend: 2 }, effort: 1, hold: 0.15, move: 0.9 },
      ],
      { cam: { az: 42, el: 18 } },
    ),
    ab_wheel_rollout: motion(
      [
        // Start: hips bent, arms vertical under the shoulders. Rolled out: thighs and
        // torso nearly in one line, arms reaching overhead, knees still down.
        { body: { pos: [-4, 45, 0], pitch: 68 }, spine: { flex: 14 }, head: -10, l: kneel, a: { to: [40, 10, 9], pole: [-1, 0, 0.2] }, effort: 0.3, hold: 0.25, move: 1.6 },
        { body: { pos: [36, 30, 0], pitch: 82 }, spine: { flex: 4 }, head: 2, l: kneel, a: { to: [126, 10, 9], pole: [-0.2, -1, 0.2] }, effort: 1, hold: 0.15, move: 1.3 },
      ],
      { cam: { az: 22, el: 10 }, props: [{ type: "wheel" }] },
    ),
    plank: motion(
      [
        { ...plankAt(11), l: plankLegs, a: forearms, effort: 1, hold: 1.4, move: 0.8 },
        { ...plankAt(12), l: plankLegs, a: forearms, effort: 1, hold: 1.4, move: 0.8 },
      ],
      { cam: { az: 26, el: 10 } },
    ),
    dead_bug: motion(
      [
        { ...floorBack(), aR: { elev: 90, plane: 0, bend: 4 }, aL: { elev: 90, plane: 0, bend: 4 }, lR: { elev: 90, plane: 0, bend: 90 }, lL: { elev: 90, plane: 0, bend: 90 }, effort: 0.4, hold: 0.25, move: 1.2 },
        { ...floorBack(), aR: { elev: 168, plane: 0, bend: 4 }, aL: { elev: 90, plane: 0, bend: 4 }, lR: { elev: 90, plane: 0, bend: 90 }, lL: { elev: 14, plane: 0, bend: 4 }, effort: 1, hold: 0.25, move: 1.2 },
        { ...floorBack(), aR: { elev: 90, plane: 0, bend: 4 }, aL: { elev: 90, plane: 0, bend: 4 }, lR: { elev: 90, plane: 0, bend: 90 }, lL: { elev: 90, plane: 0, bend: 90 }, effort: 0.4, hold: 0.25, move: 1.2 },
        { ...floorBack(), aL: { elev: 168, plane: 0, bend: 4 }, aR: { elev: 90, plane: 0, bend: 4 }, lL: { elev: 90, plane: 0, bend: 90 }, lR: { elev: 14, plane: 0, bend: 4 }, effort: 1, hold: 0.25, move: 1.2 },
      ],
      { cam: { az: 30, el: 16 } },
    ),
    hollow_hold: motion(
      [
        { ...floorBack(), spine: { flex: 22 }, head: 14, a: { elev: 160, plane: 0, bend: 4 }, l: { elev: 24, plane: 0, bend: 2, ankle: 30 }, effort: 1, hold: 1.4, move: 0.8 },
        { ...floorBack(), spine: { flex: 24 }, head: 15, a: { elev: 158, plane: 0, bend: 4 }, l: { elev: 26, plane: 0, bend: 2, ankle: 30 }, effort: 1, hold: 1.4, move: 0.8 },
      ],
      { cam: { az: 24, el: 10 } },
    ),
    pallof_press: motion(
      [
        { body: { pos: [0, SH - 3, 0], pitch: 2 }, l: feet(0, 14, 10), aR: { at: "shoulderR", local: true, to: [14, -16, -15], pole: [0, -1, 0.3] }, aL: { at: "shoulderL", local: true, to: [14, -16, 15], pole: [0, -1, -0.3] }, effort: 0.4, hold: 0.25, move: 0.9 },
        { body: { pos: [0, SH - 3, 0], pitch: 2 }, l: feet(0, 14, 10), aR: { at: "shoulderR", local: true, to: [50, -12, -15], pole: [0, -1, 0.3] }, aL: { at: "shoulderL", local: true, to: [50, -12, 15], pole: [0, -1, -0.3] }, effort: 1, hold: 1, move: 0.9 },
      ],
      { cam: { az: 60, el: 10 }, props: [{ type: "handle" }, { type: "cable", from: "handsMid", to: [16, 118, 84] }, ...pulley([16, 118, 84])] },
    ),
    cable_woodchop: motion(
      [
        { body: { pos: [0, SH - 3, 0], pitch: 4, yaw: 22 }, spine: { twist: 30 }, lR: feet(0, 16, 10), lL: feet(0, -16, 10), aR: { to: [26, 152, 20], pole: [0, -1, 0.4] }, aL: { to: [26, 152, 20], pole: [0, -1, 0.2] }, effort: 0.3, hold: 0.2, move: 1 },
        { body: { pos: [-2, SH - 10, 0], pitch: 14, yaw: -16 }, spine: { twist: -28 }, lR: feet(0, 16, 10), lL: feet(0, -16, 10), aR: { to: [24, 86, -24], pole: [0, -1, 0.2] }, aL: { to: [24, 86, -24], pole: [0, -1, -0.2] }, effort: 1, hold: 0.3, move: 1.3 },
      ],
      { cam: { az: 80, el: 8 }, props: [{ type: "handle" }, { type: "cable", from: "handsMid", to: [10, 205, 72] }, ...pulley([10, 205, 72])] },
    ),
    side_plank: motion(
      [
        { ...sidePlankPose({ roll: 74, hipY: 34 }), effort: 0.6, hold: 0.5, move: 1 },
        { ...sidePlankPose({ roll: 78, hipY: 37 }), aL: { elev: 172, plane: 90, bend: 6 }, effort: 1, hold: 1.4, move: 1 },
      ],
      { cam: { az: 90, el: 8 } },
    ),
  };
}

export const MOTIONS = {
  ...chest(),
  ...shoulders(),
  ...back(),
  ...hinge(),
  ...hamstrings(),
  ...quads(),
  ...hips(),
  ...calves(),
  ...arms(),
  ...core(),
};

/** Motion id for an exercise (each exercise has its own), or null. */
export function demoIdFor(exercise) {
  return MOTIONS[exercise.id] ? exercise.id : null;
}

export { align, toLocal };
