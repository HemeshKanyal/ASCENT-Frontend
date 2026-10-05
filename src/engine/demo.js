/**
 * Exercise demo animations: the 3D mannequin from rig.js, keyframed per
 * exercise (motions.js), projected through a camera chosen to show the
 * movement best, and drawn as a flat display list (capsules, discs, boxes)
 * that react-native-svg — or a plain SVG preview — paints back to front.
 *
 * Working muscles sit on the body surface where they really are and glow red
 * as they contract; a muscle on the far side of a limb is hidden, like on a
 * real body.
 */
import { DIM, jointReport, rot, solve, v } from "./rig.js";
import { MOTIONS, demoIdFor } from "./motions.js";

export { MOTIONS, demoIdFor };

// ── Timing & blending ────────────────────────────────────────────────────
const smooth = (u) => u * u * (3 - 2 * u);

function blend(a, b, u) {
  if (typeof a === "number") return typeof b === "number" ? a + (b - a) * u : a;
  if (Array.isArray(a)) return a.map((x, i) => blend(x, b?.[i], u));
  if (a && typeof a === "object") {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b ?? {})])) {
      // A planted foot with no direction is flat and forward; blend from that, don't snap.
      if (k === "foot" && Array.isArray(a[k] ?? b[k]) && (a[k] === undefined || b[k] === undefined)) {
        o[k] = blend(a[k] ?? [1, 0, 0], b[k] ?? [1, 0, 0], u);
        continue;
      }
      if (a[k] === undefined) o[k] = b[k];
      else if (b?.[k] === undefined) o[k] = a[k];
      else if (typeof a[k] === "string" || typeof a[k] === "function") o[k] = a[k];
      else o[k] = blend(a[k], b[k], u);
    }
    return o;
  }
  return a;
}

/** Seconds for one full rep. */
export function demoDuration(motion) {
  return motion.frames.reduce((t, f) => t + (f.hold ?? 0.25) + (f.move ?? 0.9), 0);
}

/**
 * Pose and effort at time t. Each frame holds for `hold` seconds, then moves
 * to the next over `move` seconds; the last frame returns to the first.
 * `effort` (0…1) per frame drives the muscle glow.
 */
export function poseAt(motion, t) {
  const r = rawPoseAt(motion, t);
  // `adjust` re-applies a constraint between keyframes (e.g. arms hang straight to the bar).
  return motion.adjust ? { ...r, pose: motion.adjust(r.pose) } : r;
}

function rawPoseAt(motion, t) {
  const frames = motion.frames;
  const total = demoDuration(motion);
  let x = ((t % total) + total) % total;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const next = frames[(i + 1) % frames.length];
    const hold = f.hold ?? 0.25;
    const move = f.move ?? 0.9;
    if (x < hold) return { pose: f, effort: f.effort ?? 0 };
    x -= hold;
    if (x < move) {
      const u = smooth(x / move);
      return { pose: blend(f, next, u), effort: (f.effort ?? 0) + ((next.effort ?? 0) - (f.effort ?? 0)) * u };
    }
    x -= move;
  }
  return { pose: frames[0], effort: frames[0].effort ?? 0 };
}

// ── Camera ───────────────────────────────────────────────────────────────
/** az 0 = side view (person faces right), 90 = front, −90 = back; el tilts the camera to look down. */
export function camera(az = 0, el = 0) {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  const toViewer = [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];
  const right = v.norm(v.cross([0, 1, 0], toViewer));
  const up = v.cross(toViewer, right);
  return { toViewer, right, up };
}
const project = (cam, p) => [+v.dot(p, cam.right).toFixed(2), +(-v.dot(p, cam.up)).toFixed(2)];
const depth = (cam, p) => v.dot(p, cam.toViewer);

// ── Muscles on the body ──────────────────────────────────────────────────
// [segment, from [t, around°], to [t, around°], width, surface scale]
// around: 0 = front of the segment, 90 = outer side, 180 = back, −90 = inner side.
// Torso segments: "lower" (pelvis → mid back), "upper" (mid back → neck).
const M = (seg, from, to, w, r = 1) => ({ seg, from, to, w, r });
const MUSCLE_SHAPES = {
  pec_clavicular: [M("upper", [0.86, 12], [0.8, 62], 7)],
  pec_sternal: [M("upper", [0.5, 10], [0.7, 55], 10)],
  serratus: [M("upper", [0.32, 75], [0.52, 85], 5)],
  rectus_abdominis: [M("lower", [0.05, 8], [0.95, 8], 7), M("upper", [0.0, 8], [0.28, 8], 7)],
  obliques: [M("lower", [0.15, 58], [0.95, 70], 7)],
  erectors: [M("lower", [0.05, 168], [1, 168], 6), M("upper", [0, 168], [0.35, 168], 5)],
  lats: [M("upper", [0.18, 132], [0.74, 106], 10)],
  teres_major: [M("upper", [0.7, 118], [0.8, 102], 5)],
  rhomboids: [M("upper", [0.6, 172], [0.84, 158], 6)],
  middle_traps: [M("upper", [0.82, 165], [0.94, 120], 6)],
  lower_traps: [M("upper", [0.42, 172], [0.72, 150], 5)],
  upper_traps: [M("upper", [0.97, 150], [1.1, 165], 7, 0.7)],
  rotator_cuff: [M("upper", [0.72, 138], [0.84, 122], 6)],
  anterior_delt: [M("upperArm", [0.0, 25], [0.32, 10], 7)],
  lateral_delt: [M("upperArm", [0.0, 90], [0.32, 90], 8)],
  posterior_delt: [M("upperArm", [0.0, 155], [0.32, 170], 7)],
  biceps_long: [M("upperArm", [0.25, 22], [0.85, 10], 4)],
  biceps_short: [M("upperArm", [0.25, -22], [0.85, -10], 4)],
  brachialis: [M("upperArm", [0.55, 60], [0.92, 45], 3.5)],
  triceps_long: [M("upperArm", [0.12, -160], [0.8, -175], 4.5)],
  triceps_lateral: [M("upperArm", [0.15, 140], [0.75, 165], 4.5)],
  triceps_medial: [M("upperArm", [0.7, 180], [0.92, 180], 4)],
  brachioradialis: [M("forearm", [0.0, 65], [0.55, 40], 4)],
  forearm_flexors: [M("forearm", [0.05, -10], [0.6, -20], 4.5)],
  forearm_extensors: [M("forearm", [0.05, 150], [0.6, 160], 4.5)],
  hip_flexors: [M("lower", [0.12, 30], [-0.06, 42], 6)],
  glute_max: [M("thigh", [-0.08, 150], [0.2, 168], 12, 0.9)],
  glute_med: [M("thigh", [-0.16, 105], [0.02, 120], 8, 0.9)],
  tfl: [M("thigh", [0.0, 60], [0.12, 78], 5)],
  rectus_femoris: [M("thigh", [0.12, 0], [0.88, 0], 6)],
  vastus_lateralis: [M("thigh", [0.18, 72], [0.86, 55], 6)],
  vastus_medialis: [M("thigh", [0.62, -45], [0.9, -30], 6)],
  sartorius: [M("thigh", [0.05, 50], [0.92, -70], 2.5, 1.05)],
  adductors: [M("thigh", [0.04, -80], [0.55, -75], 6)],
  adductor_magnus: [M("thigh", [0.1, -125], [0.7, -115], 6)],
  biceps_femoris: [M("thigh", [0.2, 150], [0.88, 140], 5)],
  semis: [M("thigh", [0.2, -155], [0.88, -150], 5)],
  gastrocnemius: [M("shin", [0.06, 155], [0.5, 172], 6), M("shin", [0.06, -155], [0.5, -172], 6)],
  soleus: [M("shin", [0.45, 175], [0.78, 180], 6, 0.95)],
  tibialis: [M("shin", [0.08, 32], [0.75, 22], 4)],
  sternocleidomastoid: [M("neck", [0, 30], [1, 10], 3)],
};

// Segment radii (half-thickness) for placing muscles on the surface.
const RADIUS = { upperArm: 4.6, forearm: 3.8, thigh: 7, shin: 5, neck: 3.6, lower: { f: 9.5, r: 12 }, upper: { f: 10.5, r: 13.5 } };
const WIDTH = { upperArm: 9.5, forearm: 7.8, thigh: 14.5, shin: 10, neck: 8, foot: 5.5, hand: 5 };

function perp(x, axis) {
  const d = v.norm(axis);
  const p = v.sub(x, v.mul(d, v.dot(x, d)));
  return v.len(p) < 1e-6 ? [0, 0, 1] : v.norm(p);
}

function segmentFrame(j, s, seg) {
  const l = j.limbs[s];
  if (seg === "upperArm") return { a: l.shoulder, b: l.elbow, ant: l.arm.ant1, lat: perp(v.mul(j.up.r, l.side), l.arm.d1) };
  if (seg === "forearm") return { a: l.elbow, b: l.wrist, ant: l.arm.ant2, lat: perp(v.mul(j.up.r, l.side), l.arm.d2) };
  if (seg === "thigh") return { a: l.hip, b: l.knee, ant: l.leg.ant1, lat: perp(v.mul(j.pel.r, l.side), l.leg.d1) };
  if (seg === "shin") return { a: l.knee, b: l.ankle, ant: l.leg.ant2, lat: perp(v.mul(j.pel.r, l.side), l.leg.d2) };
  if (seg === "neck") return { a: j.N, b: v.add(j.N, v.mul(j.headU, DIM.neck)), ant: j.headF, lat: v.mul(j.up.r, l.side) };
  const fr = seg === "lower" ? j.pel : j.up;
  const [a, b] = seg === "lower" ? [j.P, j.M] : [j.M, j.N];
  return { a, b, ant: fr.f, lat: v.mul(fr.r, l.side), torso: seg };
}

function surfacePoint(fr, t, around, scale) {
  const axis = v.sub(fr.b, fr.a);
  const base = v.add(fr.a, v.mul(axis, t));
  const c = Math.cos((around * Math.PI) / 180);
  const sn = Math.sin((around * Math.PI) / 180);
  const n = v.norm(v.add(v.mul(fr.ant, c), v.mul(fr.lat, sn)));
  if (fr.torso) {
    const R = RADIUS[fr.torso];
    return { p: v.add(base, v.add(v.mul(fr.ant, c * R.f * scale), v.mul(fr.lat, sn * R.r * scale))), n };
  }
  return { p: v.add(base, v.mul(n, RADIUS[fr.seg] * 0.6 * scale)), n };
}

function muscleShapes(j, cam, levels, effort) {
  const out = [];
  for (const [id, level] of Object.entries(levels)) {
    for (const m of MUSCLE_SHAPES[id] ?? []) {
      for (const s of ["R", "L"]) {
        const fr = { ...segmentFrame(j, s, m.seg), seg: m.seg };
        const p1 = surfacePoint(fr, m.from[0], m.from[1], m.r);
        const p2 = surfacePoint(fr, m.to[0], m.to[1], m.r);
        const facing = v.dot(v.norm(v.add(p1.n, p2.n)), cam.toViewer);
        if (facing < -0.1) continue; // on the far side of the body
        const vis = Math.min(1, (facing + 0.1) / 0.4);
        const glow = level === 2 ? 0.62 + 0.38 * effort : 0.5 + 0.2 * effort;
        out.push({
          kind: "line",
          p1: project(cam, p1.p),
          p2: project(cam, p2.p),
          w: m.w,
          color: level === 2 ? "muscle" : "muscleSoft",
          opacity: +(glow * vis).toFixed(3),
          z: (depth(cam, p1.p) + depth(cam, p2.p)) / 2 + 3,
        });
      }
    }
  }
  return out;
}

// ── Body ─────────────────────────────────────────────────────────────────
function tone(z, zmin, zmax) {
  const u = zmax > zmin ? (z - zmin) / (zmax - zmin) : 1;
  const g = Math.round(84 + 84 * Math.max(0, Math.min(1, u)));
  return `rgb(${g},${g},${g})`;
}

function bodyShapes(j, cam) {
  const caps = []; // [p1, p2, width]
  const { P, M: Mid, N, H, pel, up } = j;
  const L = j.limbs;
  // Torso from overlapping capsules: spine gives depth, hips/shoulders width.
  caps.push([P, Mid, 20], [Mid, N, 21]);
  caps.push([L.R.hip, L.L.hip, 17]);
  caps.push([L.R.shoulder, L.L.shoulder, 11]);
  for (const s of ["R", "L"]) {
    const side = L[s].side;
    caps.push([v.add(L[s].hip, v.mul(pel.u, 5)), v.add(L[s].shoulder, v.mul(up.u, -8)), 14]);
    // chest and glute volume
    const chestA = v.add(v.add(Mid, v.mul(up.u, 13)), v.add(v.mul(up.f, 3.5), v.mul(up.r, side * 6)));
    caps.push([chestA, v.add(chestA, v.mul(up.u, 8)), 15]);
    const gl = v.add(v.add(P, v.mul(pel.f, -3.5)), v.mul(pel.r, side * 6));
    caps.push([gl, v.add(gl, v.mul(pel.u, -6)), 15]);
  }
  caps.push([N, v.add(N, v.mul(j.headU, DIM.neck + 3)), WIDTH.neck]);
  for (const s of ["R", "L"]) {
    const l = L[s];
    caps.push([l.shoulder, l.elbow, WIDTH.upperArm], [l.elbow, l.wrist, WIDTH.forearm], [l.wrist, l.hand, WIDTH.hand]);
    caps.push([l.hip, l.knee, WIDTH.thigh], [l.knee, l.ankle, WIDTH.shin], [l.heel, l.toe, WIDTH.foot]);
    caps.push([l.ankle, v.lerp(l.heel, l.toe, 0.35), WIDTH.foot + 1]);
  }
  const zs = caps.flatMap(([a, b]) => [depth(cam, a), depth(cam, b)]);
  const zmin = Math.min(...zs);
  const zmax = Math.max(...zs);
  const shapes = [];
  for (const [a, b, w] of caps) {
    const z = (depth(cam, a) + depth(cam, b)) / 2;
    const p1 = project(cam, a);
    const p2 = project(cam, b);
    shapes.push({ kind: "line", p1, p2, w: w + 1.4, color: "outline", z: z - 0.05 });
    shapes.push({ kind: "line", p1, p2, w, color: tone(z, zmin, zmax), z });
  }
  // Head, with a nose so you can tell which way the person faces.
  const hz = depth(cam, H);
  const hc = project(cam, H);
  shapes.push({ kind: "circle", c: hc, r: DIM.head + 0.7, color: "outline", z: hz - 0.05 });
  shapes.push({ kind: "circle", c: hc, r: DIM.head, color: tone(hz, zmin, zmax), z: hz });
  const nose = v.add(H, v.mul(j.headF, DIM.head * 0.95));
  if (v.dot(j.headF, cam.toViewer) > -0.3) shapes.push({ kind: "circle", c: project(cam, nose), r: 2.2, color: tone(hz, zmin, zmax), z: hz + 0.1 });
  return shapes;
}

// ── Props ────────────────────────────────────────────────────────────────
function boxShapes(cam, box) {
  // box: { c: centre, size: [x, y, z], pitch?: tilt about z (deg, + raises the +x end) }
  const [sx, sy, sz] = box.size.map((s) => s / 2);
  const tilt = box.pitch ?? 0;
  const ax = [rot([1, 0, 0], [0, 0, 1], tilt), rot([0, 1, 0], [0, 0, 1], tilt), [0, 0, 1]];
  const corner = (i, k, m) => v.add(box.c, v.add(v.add(v.mul(ax[0], i * sx), v.mul(ax[1], k * sy)), v.mul(ax[2], m * sz)));
  const faces = [
    { n: ax[1], pts: [corner(-1, 1, -1), corner(1, 1, -1), corner(1, 1, 1), corner(-1, 1, 1)], color: box.top ?? "propTop" },
    { n: v.mul(ax[1], -1), pts: [corner(-1, -1, -1), corner(1, -1, -1), corner(1, -1, 1), corner(-1, -1, 1)], color: "propDark" },
    { n: ax[0], pts: [corner(1, -1, -1), corner(1, 1, -1), corner(1, 1, 1), corner(1, -1, 1)], color: box.color ?? "propDark" },
    { n: v.mul(ax[0], -1), pts: [corner(-1, -1, -1), corner(-1, 1, -1), corner(-1, 1, 1), corner(-1, -1, 1)], color: box.color ?? "propDark" },
    { n: ax[2], pts: [corner(-1, -1, 1), corner(1, -1, 1), corner(1, 1, 1), corner(-1, 1, 1)], color: box.side ?? "propSide" },
    { n: v.mul(ax[2], -1), pts: [corner(-1, -1, -1), corner(1, -1, -1), corner(1, 1, -1), corner(-1, 1, -1)], color: box.side ?? "propSide" },
  ];
  // Boxes the body rests on sit behind it; free-standing ones sort by their front face.
  const z = box.z ?? depth(cam, box.c) - Math.max(sx, sy, sz) * 0.6;
  return faces.filter((f) => v.dot(f.n, cam.toViewer) > 0.01).map((f) => ({ kind: "poly", points: f.pts.map((p) => project(cam, p)), color: f.color, z }));
}

function discShape(cam, c, n, r, color, z) {
  const nn = v.norm(n);
  const minor = Math.abs(v.dot(nn, cam.toViewer)) * r;
  const ns = [v.dot(nn, cam.right), -v.dot(nn, cam.up)];
  const angle = Math.hypot(ns[0], ns[1]) < 1e-6 ? 0 : (Math.atan2(ns[1], ns[0]) * 180) / Math.PI;
  return { kind: "ellipse", c: project(cam, c), rx: +Math.max(minor, 0.9).toFixed(2), ry: r, rot: +angle.toFixed(1), color, z: z ?? depth(cam, c) };
}

function propShapes(motion, pose, j, cam) {
  const out = [];
  const hands = { R: j.limbs.R.hand, L: j.limbs.L.hand };
  const at = (spec) => (typeof spec === "string" ? j.points[spec] : spec);
  const line = (a, b, w, color, zOff = 0) => out.push({ kind: "line", p1: project(cam, a), p2: project(cam, b), w, color, z: (depth(cam, a) + depth(cam, b)) / 2 + zOff });
  for (const p of [...(motion.props ?? []), ...(pose.props ?? [])]) {
    if (p.type === "box") out.push(...boxShapes(cam, p));
    else if (p.type === "barbell") {
      // `local` offset = [forward, up] in the upper body's axes (bar on the back follows the lean).
      const off = p.local ? v.add(v.mul(j.up.f, p.local[0]), v.mul(j.up.u, p.local[1])) : p.offset ?? [0, 0, 0];
      const c = p.on ? v.add(at(p.on), off) : v.lerp(hands.R, hands.L, 0.5);
      const axis = p.axis ?? v.norm(v.sub(hands.R, hands.L));
      const half = p.half ?? 64;
      line(v.add(c, v.mul(axis, -half)), v.add(c, v.mul(axis, half)), 2.4, "bar", 0);
      for (const sg of [-1, 1]) {
        const pc = v.add(c, v.mul(axis, sg * (half - 12)));
        out.push({ ...discShape(cam, pc, axis, p.r ?? 20, "plate"), opacity: 0.82 });
      }
    } else if (p.type === "dumbbell") {
      for (const s of p.hands ?? ["R", "L"]) {
        const c = hands[s];
        const ax = p.grip === "neutral" ? v.norm(v.sub(j.limbs[s].wrist, j.limbs[s].elbow)) : p.grip === "vertical" ? [0, 1, 0] : v.mul(perp(j.up.r, v.sub(j.limbs[s].wrist, j.limbs[s].elbow)), 1);
        const axis = p.grip === "neutral" ? v.norm(v.cross(ax, j.up.r)) : ax;
        const a = v.add(c, v.mul(axis, -8));
        const b = v.add(c, v.mul(axis, 8));
        const z = depth(cam, c) + 4;
        line(a, b, 2.4, "bar", 4);
        out.push(discShape(cam, a, axis, p.r ?? 6.5, "plate", z + 0.01));
        out.push(discShape(cam, b, axis, p.r ?? 6.5, "plate", z + 0.01));
      }
    } else if (p.type === "single") {
      // one dumbbell held by both hands (goblet, pullover, overhead extension)
      const c = v.add(v.lerp(hands.R, hands.L, 0.5), p.local ? v.add(v.mul(j.up.f, p.local[0]), v.mul(j.up.u, p.local[1])) : [0, 0, 0]);
      const axis = p.axis === "forearm" ? v.norm(v.sub(j.limbs.R.wrist, j.limbs.R.elbow)) : p.axis ?? [0, 1, 0];
      const a = v.add(c, v.mul(axis, -9));
      const b = v.add(c, v.mul(axis, 9));
      const z = depth(cam, c) + 5;
      line(a, b, 2.6, "bar", 5);
      out.push(discShape(cam, a, axis, 7.5, "plate", z + 0.01));
      out.push(discShape(cam, b, axis, 7.5, "plate", z + 0.01));
    } else if (p.type === "wheel") {
      const c = v.add(v.lerp(hands.R, hands.L, 0.5), [0, -3, 0]);
      out.push({ ...discShape(cam, c, [0, 0, 1], 9, "plate", depth(cam, c) + 6) });
      line(v.add(c, [0, 0, -12]), v.add(c, [0, 0, 12]), 2.4, "bar", 7);
    } else if (p.type === "kettlebell") {
      const c = v.add(v.lerp(hands.R, hands.L, 0.5), v.mul(v.norm(v.sub(j.limbs.R.wrist, j.limbs.R.elbow)), 9));
      out.push({ kind: "circle", c: project(cam, c), r: 9, color: "plate", z: depth(cam, c) + 2 });
    } else if (p.type === "cable") {
      const from = p.from ? at(p.from) : hands[p.hand ?? "R"];
      line(from, p.to, 1, "cable", -3);
      out.push({ kind: "circle", c: project(cam, p.to), r: 3, color: "propDark", z: depth(cam, p.to) });
      if (p.both) {
        const to2 = p.to2 ?? p.to;
        line(hands.L, to2, 1, "cable", -3);
        out.push({ kind: "circle", c: project(cam, to2), r: 3, color: "propDark", z: depth(cam, to2) });
      }
    } else if (p.type === "band") {
      line(p.from ? at(p.from) : hands.R, at(p.to), 1.8, "band", 1);
      if (p.both) line(hands.L, at(p.to2 ?? p.to), 1.8, "band", 1);
    } else if (p.type === "rod") {
      line(at(p.a), at(p.b), p.w ?? 3, p.color ?? "bar", p.zOff ?? 0);
    } else if (p.type === "handle") {
      line(v.add(hands.R, v.mul(j.up.r, 5)), v.add(hands.L, v.mul(j.up.r, -5)), 2.6, "bar", 4);
    } else if (p.type === "roller") {
      // machine pad that rides on a limb (leg curl / extension, pec deck arms)
      const c = v.add(at(p.on), p.offset ?? [0, 0, 0]);
      const axis = p.axis ?? [0, 0, 1];
      out.push(discShape(cam, c, axis, p.r ?? 5, "propDark", depth(cam, c) + (p.zOff ?? 12)));
    }
  }
  return out;
}

/**
 * Display list for one frame: shapes sorted back to front. `levels` maps
 * muscle id → 1 (helper) | 2 (target). Colors are theme keys or rgb().
 */
export function demoFrame(motion, t, levels) {
  const { pose, effort } = poseAt(motion, t);
  const j = solve(pose);
  const cam = camera(motion.cam?.az ?? 0, motion.cam?.el ?? 0);
  const shapes = [...bodyShapes(j, cam), ...muscleShapes(j, cam, levels, effort), ...propShapes(motion, pose, j, cam)];
  shapes.push(discShape(cam, [j.P[0], 0, j.P[2]], [0, 1, 0], 36, "shadow", -1e6));
  return shapes.sort((a, b) => a.z - b.z).map(({ z, ...s }) => s);
}

const boxes = new WeakMap();
/** Square viewBox [x, y, size, size] that fits the whole rep. */
export function demoViewBox(motion) {
  if (boxes.has(motion)) return boxes.get(motion);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const grow = (x, y, r = 0) => {
    x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r);
  };
  const dur = demoDuration(motion);
  for (let k = 0; k < 30; k++) {
    for (const s of demoFrame(motion, (dur * k) / 30, {})) {
      if (s.color === "shadow") continue;
      if (s.kind === "line") { grow(...s.p1, s.w / 2); grow(...s.p2, s.w / 2); }
      else if (s.kind === "circle") grow(...s.c, s.r);
      else if (s.kind === "ellipse") grow(...s.c, Math.max(s.rx, s.ry));
      else s.points.forEach((p) => grow(...p));
    }
  }
  const size = Math.max(x1 - x0, y1 - y0) + 14;
  const box = [+((x0 + x1) / 2 - size / 2).toFixed(1), +((y0 + y1) / 2 - size / 2).toFixed(1), +size.toFixed(1), +size.toFixed(1)];
  boxes.set(motion, box);
  return box;
}

// Inside the box, or closer to its top surface than `clearance` (body half-thickness).
function insideBox(p, box, clearance) {
  const tilt = (-(box.pitch ?? 0) * Math.PI) / 180;
  const d = v.sub(p, box.c);
  const x = d[0] * Math.cos(tilt) - d[1] * Math.sin(tilt);
  const y = d[0] * Math.sin(tilt) + d[1] * Math.cos(tilt);
  const [sx, sy, sz] = box.size.map((s) => s / 2);
  return Math.abs(x) < sx - 1 && y > -sy + 1 && y < sy + clearance && Math.abs(d[2]) < sz - 1;
}

/** Joint-range and contact problems across a rep (empty = anatomically valid). */
export function checkMotion(motion, samples = 24) {
  const problems = new Set();
  const dur = demoDuration(motion);
  for (let k = 0; k < samples; k++) {
    const { pose } = poseAt(motion, (dur * k) / samples);
    const j = solve(pose);
    for (const i of jointReport(j).issues) problems.add(i);
    const pts = { head: [j.H, DIM.head - 3], pelvis: [j.P, 6], "mid back": [j.M, 6], neck: [j.N, 4] };
    for (const [s, l] of Object.entries(j.limbs)) Object.assign(pts, { [`knee ${s}`]: [l.knee, 2], [`elbow ${s}`]: [l.elbow, 1], [`ankle ${s}`]: [l.ankle, 1], [`hip ${s}`]: [l.hip, 3] });
    for (const b of (motion.props ?? []).filter((p) => p.type === "box" && !p.through)) {
      for (const [name, [p, margin]] of Object.entries(pts)) if (insideBox(p, b, margin)) problems.add(`${name} passes through ${b.name ?? "equipment"}`);
    }
  }
  return [...problems];
}
