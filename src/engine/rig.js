/**
 * 3D mannequin rig for exercise demos.
 *
 * World: x = forward (the way the person faces when yaw = 0), y = up,
 * z = the person's right. Floor at y = 0. Units ≈ 1.1 cm.
 *
 * A pose:
 *   body:  { pos: pelvis [x,y,z], pitch (lean forward +), yaw (turn right +), roll (lean right +) }
 *   spine: { flex (round forward +), twist (rotate right +), side (bend right +) }   upper back vs pelvis
 *   head:  pitch (chin down +) relative to the upper back
 *   shrug, protract: shoulder-blade elevation / reach forward
 *   aR, aL, a (both): arm — angles { elev, plane, bend, rot } or a target { to, pole, at }; either takes `wrist`
 *   lR, lL, l (both): leg — angles { elev, plane, bend, ankle } or a target { to, pole, foot, at }
 *
 * Angles (degrees):
 *   elev  — how far the limb is raised from hanging straight down (0…180)
 *   plane — which way it is raised: 0 forward, 90 out to the side, 180 backward, −30 across the body
 *   bend  — elbow / knee flexion (0 = straight)
 *   rot   — humeral rotation, external +  (90 turns a bent forearm from pointing forward to pointing up)
 *   ankle — plantar-flexion (toes pointed) +, dorsiflexion −
 * Targets: `to` = wrist / ankle position (world, or relative to a body point `at`,
 * in the torso's own [forward, up, right] axes when `local`);
 * `pole` = direction the elbow / knee should point. With `a` / `l` the target
 * is given for the right side and mirrored for the left.
 */

export const DIM = {
  lowerSpine: 22,
  upperSpine: 28,
  neck: 7,
  head: 9.5,
  shoulderHalf: 15.5,
  hipHalf: 8.5,
  upperArm: 28,
  forearm: 25,
  thigh: 41,
  shin: 39,
  ankleHeight: 5,
  footBack: 4,
  footFront: 13,
};

/** Pelvis height when standing tall with straight legs. */
export const STAND_HEIGHT = DIM.thigh + DIM.shin + DIM.ankleHeight + 2;

// ── Vector maths ─────────────────────────────────────────────────────────
export const v = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u],
};
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

/** Rodrigues rotation of vector p about unit axis k by `a` degrees (right-hand rule). */
export function rot(p, k, a) {
  const c = Math.cos(rad(a));
  const s = Math.sin(rad(a));
  const kxp = v.cross(k, p);
  const kd = v.dot(k, p);
  return [p[0] * c + kxp[0] * s + k[0] * kd * (1 - c), p[1] * c + kxp[1] * s + k[1] * kd * (1 - c), p[2] * c + kxp[2] * s + k[2] * kd * (1 - c)];
}

const perpTo = (x, axis) => v.norm(v.sub(x, v.mul(axis, v.dot(x, axis))));
const angleBetween = (a, b) => deg(Math.acos(Math.max(-1, Math.min(1, v.dot(v.norm(a), v.norm(b))))));

/** Orthonormal frame {f, u, r} after yaw → pitch → roll (see header). */
function frame(yaw = 0, pitch = 0, roll = 0, base = { f: [1, 0, 0], u: [0, 1, 0], r: [0, 0, 1] }) {
  let { f, u, r } = base;
  // roll about forward
  u = rot(u, f, roll);
  r = rot(r, f, roll);
  // pitch: tip up-axis toward forward, about the right axis
  f = rot(f, r, -pitch);
  u = rot(u, r, -pitch);
  // yaw about the frame's original up
  const up = base.u;
  f = rot(f, up, -yaw);
  u = rot(u, up, -yaw);
  r = rot(r, up, -yaw);
  return { f, u, r };
}

// ── Limbs ────────────────────────────────────────────────────────────────

/** Limb from angles. Returns segment directions and anterior references. */
function limbFromAngles(spec, fr, side, isLeg) {
  const lat = v.mul(fr.r, side);
  const down = v.mul(fr.u, -1);
  const plane = rad(spec.plane ?? 0);
  const w = v.norm(v.add(v.mul(fr.f, Math.cos(plane)), v.mul(lat, Math.sin(plane))));
  const elev = spec.elev ?? 0;
  const d1 = v.norm(v.add(v.mul(down, Math.cos(rad(elev))), v.mul(w, Math.sin(rad(elev)))));
  // Anterior of the limb travels with the elevation rotation.
  const k = v.norm(v.cross(down, w));
  let ant = elev ? rot(fr.f, k, elev) : fr.f;
  if (!isLeg && spec.rot) ant = rot(ant, d1, side * spec.rot);
  ant = perpTo(ant, d1);
  // Elbow flexes toward the anterior side; the knee toward the posterior.
  const toward = isLeg ? v.mul(ant, -1) : ant;
  const bend = spec.bend ?? 0;
  const d2 = v.norm(v.add(v.mul(d1, Math.cos(rad(bend))), v.mul(toward, Math.sin(rad(bend)))));
  const ant2 = perpTo(isLeg ? rot(ant, v.norm(v.cross(d1, toward)), bend) : ant, d2);
  return { d1, d2, ant1: ant, ant2 };
}

/** Two-bone IK in 3D: middle joint placed toward `pole`. */
function ik(root, target, l1, l2, pole) {
  const d = v.sub(target, root);
  const dist = v.len(d);
  const D = Math.min(Math.max(dist, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const e = v.norm(d);
  const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const pp = perpTo(pole, e);
  const mid = v.add(v.add(root, v.mul(e, a)), v.mul(pp, h));
  return { mid, end: v.add(root, v.mul(e, D)), reachGap: dist - (l1 + l2) };
}

const reflect = (p, origin, n) => v.sub(p, v.mul(n, 2 * v.dot(v.sub(p, origin), n)));
const reflectDir = (p, n) => v.sub(p, v.mul(n, 2 * v.dot(p, n)));

/**
 * Solve a pose to joints, segment frames and diagnostics.
 */
export function solve(pose) {
  const body = pose.body ?? {};
  const P = body.pos ?? [0, STAND_HEIGHT, 0];
  const pel = frame(body.yaw, body.pitch, body.roll);
  const sp = pose.spine ?? {};
  // Upper back: flex about pelvis right axis, side-bend about forward, twist about its own up.
  let up = { f: rot(pel.f, pel.r, -(sp.flex ?? 0)), u: rot(pel.u, pel.r, -(sp.flex ?? 0)), r: pel.r };
  up = { f: up.f, u: rot(up.u, up.f, sp.side ?? 0), r: rot(up.r, up.f, sp.side ?? 0) };
  up = { f: rot(up.f, up.u, -(sp.twist ?? 0)), u: up.u, r: rot(up.r, up.u, -(sp.twist ?? 0)) };
  // The lower spine takes about a third of the flexion so the back curves.
  const midU = v.norm(v.add(v.mul(pel.u, 2), up.u));
  const M = v.add(P, v.mul(midU, DIM.lowerSpine));
  const N = v.add(M, v.mul(up.u, DIM.upperSpine));
  const headU = rot(up.u, up.r, -(pose.head ?? 0));
  const headF = rot(up.f, up.r, -(pose.head ?? 0));
  const H = v.add(N, v.mul(headU, DIM.neck + DIM.head));

  const points = { pelvis: P, mid: M, neck: N, head: H, chest: v.add(v.add(M, v.mul(up.u, 16)), v.mul(up.f, 10)) };
  const out = { pose, pel, up, P, M, N, H, headF, headU, limbs: {}, issues: [] };

  for (const [s, side] of [["R", 1], ["L", -1]]) {
    // shoulders
    const S = v.add(v.add(v.add(N, v.mul(up.u, -3 + (pose.shrug ?? 0))), v.mul(up.r, side * DIM.shoulderHalf)), v.mul(up.f, pose.protract ?? 0));
    const Hp = v.add(v.add(P, v.mul(pel.r, side * DIM.hipHalf)), v.mul(pel.u, -2));
    points[`shoulder${s}`] = S;
    points[`hip${s}`] = Hp;

    const arm = resolveLimb(pose[`a${s}`] ?? pose.a ?? { elev: 0 }, s, false);
    const leg = resolveLimb(pose[`l${s}`] ?? pose.l ?? { elev: 0 }, s, true);

    const A = buildLimb(arm, S, up, side, false, DIM.upperArm, DIM.forearm, points, P, pel);
    const L = buildLimb(leg, Hp, pel, side, true, DIM.thigh, DIM.shin, points, P, pel);
    if (A.reachGap > 1.5) out.issues.push(`${s} hand can't reach its grip (${A.reachGap.toFixed(1)} short)`);
    if (L.reachGap > 1.5) out.issues.push(`${s} foot can't reach its spot (${L.reachGap.toFixed(1)} short)`);

    // Foot: given direction, else flat and forward along the pelvis.
    let footDir;
    if (leg.foot === "neutral") {
      // Foot at a right angle to the shin (± `ankle`), e.g. resting on the heel.
      const ankle = leg.ankle ?? 0;
      footDir = v.norm(v.add(v.mul(L.ant2, Math.cos(rad(ankle))), v.mul(L.d2, Math.sin(rad(ankle)))));
    } else if (leg.foot) footDir = v.norm(leg.foot);
    else if (leg.to) footDir = v.norm([pel.f[0], 0, pel.f[2]].map((x, i) => (i === 1 ? 0 : x)));
    else {
      const ankle = leg.ankle ?? 0;
      footDir = v.norm(v.add(v.mul(L.ant2, Math.cos(rad(ankle))), v.mul(L.d2, Math.sin(rad(ankle)))));
    }
    if (v.len([footDir[0], 0, footDir[2]]) < 1e-6 && leg.to) footDir = [1, 0, 0];
    const sole = v.mul(perpTo(v.mul(L.d2, -1), footDir), -1); // toward the sole
    const heel = v.add(v.add(L.end, v.mul(footDir, -DIM.footBack)), v.mul(sole, DIM.ankleHeight - 1.5));
    const toe = v.add(v.add(L.end, v.mul(footDir, DIM.footFront)), v.mul(sole, DIM.ankleHeight - 1.5));
    // Wrist: flexion (+) tips the hand toward the palm side, extension (−) back.
    const w = arm.wrist ?? 0;
    const handDir = v.norm(v.add(v.mul(A.d2, Math.cos(rad(w))), v.mul(A.ant2, Math.sin(rad(w)))));
    const hand = v.add(A.end, v.mul(handDir, 4));

    out.limbs[s] = {
      side,
      shoulder: S,
      elbow: A.mid,
      wrist: A.end,
      hand,
      hip: Hp,
      knee: L.mid,
      ankle: L.end,
      heel,
      toe,
      footDir,
      arm: A,
      leg: L,
    };
    Object.assign(points, { [`hand${s}`]: hand, [`elbow${s}`]: A.mid, [`knee${s}`]: L.mid, [`ankle${s}`]: L.end });
    if (s === "R") points.handsMid = hand;
    else points.handsMid = v.lerp(points.handsMid, hand, 0.5);
  }
  out.points = points;
  return out;

  function resolveLimb(spec, s, isLeg) {
    const both = !(pose[`${isLeg ? "l" : "a"}${s}`]);
    if (!spec.to || !both || s === "R") return spec;
    // Mirror the right-side target and pole across the body's midline.
    const n = isLeg ? pel.r : up.r;
    return {
      ...spec,
      at: spec.at?.endsWith("R") ? `${spec.at.slice(0, -1)}L` : spec.at,
      to: spec.local ? [spec.to[0], spec.to[1], -spec.to[2]] : spec.at ? reflectDir(spec.to, n) : reflect(spec.to, P, n),
      pole: spec.pole ? reflectDir(spec.pole, n) : undefined,
      foot: Array.isArray(spec.foot) ? reflectDir(spec.foot, n) : spec.foot,
    };
  }
}

function buildLimb(spec, root, fr, side, isLeg, l1, l2, points, P, pel) {
  if (spec.to) {
    const base = spec.at ? points[spec.at] ?? P : null;
    // `local`: offset given in the torso's own axes [forward, up, right].
    const off = spec.local ? v.add(v.add(v.mul(fr.f, spec.to[0]), v.mul(fr.u, spec.to[1])), v.mul(fr.r, spec.to[2])) : spec.to;
    const target = base ? v.add(base, off) : spec.to;
    const pole = spec.pole ?? (isLeg ? pel.f : v.mul(fr.u, -1));
    const { mid, end, reachGap } = ik(root, target, l1, l2, pole);
    const d1 = v.norm(v.sub(mid, root));
    const d2 = v.norm(v.sub(end, mid));
    // Anterior: elbow flexes toward anterior, knee toward posterior.
    const bendDir = perpTo(d2, d1);
    const straight = angleBetween(d1, d2) < 4;
    const fallback = perpTo(isLeg ? pel.f : fr.f, d1);
    const ant1 = straight ? fallback : isLeg ? v.mul(bendDir, -1) : bendDir;
    const ant2 = perpTo(straight ? ant1 : isLeg ? rot(ant1, v.norm(v.cross(d1, d2)), angleBetween(d1, d2)) : ant1, d2);
    return { mid, end, d1, d2, ant1, ant2, reachGap, ik: true };
  }
  const { d1, d2, ant1, ant2 } = limbFromAngles(spec, fr, side, isLeg);
  const mid = v.add(root, v.mul(d1, l1));
  const end = v.add(mid, v.mul(d2, l2));
  return { mid, end, d1, d2, ant1, ant2, reachGap: 0 };
}

// ── Anatomical checks ────────────────────────────────────────────────────

/**
 * Joint ranges a healthy adult can reach. Used by tests so no demo shows a
 * knee bending backward or a hand floating off its bar.
 */
export function jointReport(j) {
  const issues = [...j.issues];
  const ang = {};
  for (const s of ["R", "L"]) {
    const l = j.limbs[s];
    // Elbow: 0…155 flexion, always toward the front of the arm.
    const elbow = angleBetween(l.arm.d1, l.arm.d2);
    ang[`elbow${s}`] = elbow;
    if (elbow > 155) issues.push(`${s} elbow flexed ${elbow.toFixed(0)}° (max 155)`);
    // Knee: 0…160, always toward the back of the leg.
    const knee = angleBetween(l.leg.d1, l.leg.d2);
    ang[`knee${s}`] = knee;
    if (knee > 160) issues.push(`${s} knee flexed ${knee.toFixed(0)}° (max 160)`);
    if (knee > 8) {
      // A bent knee points to the front of the thigh as the hip places it.
      // Hip rotation lets it turn out (sumo, knees over turned-out toes), but
      // a knee pointing backward is a knee bending the wrong way.
      const down = v.mul(j.pel.u, -1);
      const elev = angleBetween(down, l.leg.d1);
      const ant = elev < 2 ? j.pel.f : rot(j.pel.f, v.norm(v.cross(down, perpTo(l.leg.d1, down))), elev);
      const axis = v.norm(v.sub(l.ankle, l.hip));
      const offset = v.sub(l.knee, v.add(l.hip, v.mul(axis, v.dot(v.sub(l.knee, l.hip), axis))));
      if (v.dot(v.norm(offset), perpTo(ant, l.leg.d1)) < -0.3) issues.push(`${s} knee bends the wrong way`);
    }
    // Hip: flexion up to 140, extension to 30, abduction to 66 (clinical norm is
    // 45°; trained people reach ~60–65° in moves like the Cossack squat).
    const thigh = l.leg.d1;
    const flexComp = v.dot(thigh, j.pel.f);
    const abdComp = v.dot(thigh, v.mul(j.pel.r, l.side));
    const fromDown = angleBetween(thigh, v.mul(j.pel.u, -1));
    ang[`hip${s}`] = flexComp >= 0 ? fromDown : -fromDown;
    if (flexComp < 0 && Math.abs(abdComp) < 0.7 && fromDown > 32) issues.push(`${s} hip extended ${fromDown.toFixed(0)}° (max 30)`);
    if (flexComp >= 0 && fromDown > 140) issues.push(`${s} hip flexed ${fromDown.toFixed(0)}° (max 140)`);
    if (abdComp > 0 && deg(Math.asin(Math.min(1, abdComp))) > 66) issues.push(`${s} hip abducted beyond 66°`);
    if (abdComp < -0.45) issues.push(`${s} leg crosses the midline too far`);
    // Shoulder: extension behind the body ≤ 65°.
    const arm = l.arm.d1;
    const back = v.dot(arm, j.up.f);
    const fromHang = angleBetween(arm, v.mul(j.up.u, -1));
    ang[`shoulder${s}`] = fromHang;
    if (back < 0 && Math.abs(v.dot(arm, v.mul(j.up.r, l.side))) < 0.6 && fromHang > 65 && v.dot(arm, j.up.u) < 0.5)
      issues.push(`${s} shoulder extended ${fromHang.toFixed(0)}° behind the body (max 65)`);
    // Horizontal adduction lets an arm reach well across (woodchop, cross-body), not behind the far shoulder.
    if (v.dot(arm, v.mul(j.up.r, l.side)) < -0.8) issues.push(`${s} arm crosses the body too far`);
    // Ankle: dorsiflexion ≤ 40, plantar-flexion ≤ 55.
    const footVsShin = angleBetween(l.footDir, l.leg.d2);
    // Shin tilting forward over a flat foot opens the foot–shin angle past 90.
    const dorsi = footVsShin - 90; // >0 = toes pulled toward the shin
    ang[`ankle${s}`] = dorsi;
    if (dorsi > 42) issues.push(`${s} ankle dorsiflexed ${dorsi.toFixed(0)}° (max 40)`);
    if (-dorsi > 60) issues.push(`${s} ankle pointed ${(-dorsi).toFixed(0)}° (max 55)`);
  }
  const sp = j.pose.spine ?? {};
  if ((sp.flex ?? 0) > 75 || (sp.flex ?? 0) < -30) issues.push(`spine flexion ${sp.flex}° out of range`);
  if (Math.abs(sp.twist ?? 0) > 50) issues.push(`spine twist ${sp.twist}° out of range`);
  if ((j.pose.head ?? 0) > 60 || (j.pose.head ?? 0) < -55) issues.push(`neck ${j.pose.head}° out of range`);
  // Nothing under the floor.
  const low = [j.H, j.P, j.M, j.N, ...Object.values(j.limbs).flatMap((l) => [l.elbow, l.wrist, l.knee, l.heel, l.toe, l.ankle])];
  if (j.H[1] - DIM.head < -1.5) issues.push("head below the floor");
  for (const p of low) if (p[1] < -1.5) {
    issues.push("body below the floor");
    break;
  }
  return { issues, angles: ang };
}
