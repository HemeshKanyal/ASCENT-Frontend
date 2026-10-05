/**
 * Floating gym equipment behind the body — the cybercore/surreal layer.
 * Props are shaded grey metal in the app's palette, spread evenly over the
 * screen (one per cell of a jittered grid) and drifting at random; anything
 * that drifts off one edge comes back on the other, so the field always fills
 * whatever screen it's on. Every second or two one prop glitches: it jumps
 * and splits into red and white ghosts. Built from primitives — no downloads.
 */
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// ── Shapes (metres) ───────────────────────────────────────────────────────
const along = (g) => g.rotateZ(Math.PI / 2); // cylinders lie along x
const flat = (g) => (g.index ? g.toNonIndexed() : g); // merge needs all-indexed or none

function plate(r = 0.22, w = 0.04, hole = 0.03) {
  const pts = [[hole, -w / 2], [r, -w / 2], [r, w / 2], [hole, w / 2], [hole, -w / 2]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 32).rotateZ(Math.PI / 2);
}
function dumbbell() {
  const head = (x) => along(new THREE.CylinderGeometry(0.065, 0.065, 0.1, 6)).translate(x, 0, 0);
  return mergeGeometries([along(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 12)), head(-0.2), head(0.2)].map(flat));
}
function kettlebell() {
  const bell = new THREE.SphereGeometry(0.13, 24, 16);
  const handle = new THREE.TorusGeometry(0.075, 0.017, 10, 20, Math.PI).translate(0, 0.1, 0);
  const base = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16).translate(0, -0.125, 0);
  return mergeGeometries([bell, handle, base].map(flat));
}
function barbell() {
  const bar = along(new THREE.CylinderGeometry(0.014, 0.014, 2, 10));
  const sleeve = (x) => along(new THREE.CylinderGeometry(0.026, 0.026, 0.4, 12)).translate(x, 0, 0);
  const p = (x) => plate(0.225, 0.05).translate(x, 0, 0);
  return mergeGeometries([bar, sleeve(-0.78), sleeve(0.78), p(-0.66), p(0.66), p(-0.72), p(0.72)].map(flat));
}
function shaker() {
  const cup = new THREE.CylinderGeometry(0.06, 0.05, 0.2, 18);
  const lid = new THREE.CylinderGeometry(0.062, 0.062, 0.04, 18).translate(0, 0.12, 0);
  const cap = new THREE.CylinderGeometry(0.022, 0.022, 0.035, 12).translate(0, 0.155, 0);
  return mergeGeometries([cup, lid, cap].map(flat));
}
const medball = () => new THREE.SphereGeometry(0.17, 24, 16);

const SHAPES = [dumbbell, kettlebell, plate, barbell, shaker, medball];
// The app's greys, dark to light.
const GREYS = ["#3d3d3d", "#525252", "#686868", "#808080", "#9a9a9a", "#b5b5b5"];

// ── Field ─────────────────────────────────────────────────────────────────
/**
 * One prop per grid cell (skipping a few at random), placed in the camera's
 * view. Add the returned group to the camera.
 */
export function makeProps({ cols, rows, fill = 0.8, size = 1, reducedMotion }) {
  const group = new THREE.Group();
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const geos = new Map();
  const geo = (make) => geos.get(make) ?? geos.set(make, make()).get(make);
  const mats = GREYS.map((c, i) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.32 + (i % 3) * 0.12, metalness: 0.55 }));
  const ghostRed = new THREE.MeshBasicMaterial({ color: "#ff3b3f", transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const ghostWhite = new THREE.MeshBasicMaterial({ color: "#d8d8d8", transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

  const props = [];
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rnd() > fill) continue;
      const make = SHAPES[k++ % SHAPES.length];
      const g = geo(make);
      const mesh = new THREE.Mesh(g, mats[Math.floor(rnd() * mats.length)]);
      const red = new THREE.Mesh(g, ghostRed);
      const white = new THREE.Mesh(g, ghostWhite);
      red.visible = white.visible = false;
      group.add(mesh, red, white);
      // Normalised screen position: this cell's centre, jittered within it.
      const pos = new THREE.Vector2(((c + 0.2 + rnd() * 0.6) / cols) * 2 - 1, ((r + 0.2 + rnd() * 0.6) / rows) * 2 - 1);
      const depth = 5.5 + rnd() * 7; // always past the body
      const scale = size * (make === barbell ? 0.55 : 1) * (0.9 + rnd() * 0.9) * (depth / 8);
      mesh.scale.setScalar(scale);
      mesh.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      props.push({
        mesh, red, white, pos, depth, size: scale,
        vel: new THREE.Vector2(rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.035),
        spin: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.6),
        phase: rnd() * 10,
      });
    }
  }

  let glitch = null;
  let nextGlitch = 1;
  let lastT = 0;

  return {
    group,
    update(t, camera) {
      const dt = Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      const m = reducedMotion ? 0 : 1; // still placed with reduced motion, just not moving
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      // Push the field back when the camera pulls away, so props stay behind the body.
      const push = Math.max(0, camera.position.length() + 1 - 5.5);
      for (const p of props) {
        // Random drift; wrap around the edges so the field never empties.
        p.pos.addScaledVector(p.vel, dt * m);
        if (p.pos.x > 1.2) p.pos.x -= 2.4;
        if (p.pos.x < -1.2) p.pos.x += 2.4;
        if (p.pos.y > 1.2) p.pos.y -= 2.4;
        if (p.pos.y < -1.2) p.pos.y += 2.4;
        const depth = p.depth + push;
        const halfH = tanHalf * depth;
        p.mesh.position.set(p.pos.x * halfH * camera.aspect, p.pos.y * halfH + Math.sin(t * 0.5 + p.phase) * 0.15 * m, -depth);
        p.mesh.scale.setScalar(p.size * (depth / p.depth)); // same size on screen wherever it sits
        p.mesh.rotation.x += p.spin.x * dt * m;
        p.mesh.rotation.y += p.spin.y * dt * m;
        p.mesh.rotation.z += p.spin.z * dt * m;
      }

      // Glitch: a visible prop jumps and splits into red/white ghosts for a moment.
      if (m && !glitch && t > nextGlitch) {
        const onScreen = props.filter((p) => Math.abs(p.pos.x) < 0.9 && Math.abs(p.pos.y) < 0.9);
        const p = onScreen[Math.floor(Math.random() * onScreen.length)];
        if (p) glitch = { p, until: t + 0.38, jump: 0.5 + Math.random() * 0.5 };
        nextGlitch = t + 1 + Math.random() * 1.5;
      }
      if (glitch) {
        const { p } = glitch;
        const live = t < glitch.until;
        const unit = 0.07 * p.mesh.scale.x; // small offsets: the ghosts read as colour fringes, not copies
        for (const [ghost, dir] of [[p.red, 1], [p.white, -1]]) {
          ghost.visible = live && Math.random() < 0.85;
          ghost.position.copy(p.mesh.position);
          ghost.position.x += dir * unit * (0.6 + Math.random());
          ghost.position.y += (Math.random() - 0.5) * unit * 0.5;
          ghost.rotation.copy(p.mesh.rotation);
          ghost.scale.copy(p.mesh.scale).multiplyScalar(1 + (Math.random() - 0.5) * 0.12);
        }
        // The prop itself stutters sideways and blinks.
        if (live) p.mesh.position.x += glitch.jump * unit * 3 * (Math.random() < 0.5 ? 1 : -1);
        p.mesh.visible = !live || Math.random() > 0.25;
        if (!live) glitch = null;
      }
    },
  };
}
