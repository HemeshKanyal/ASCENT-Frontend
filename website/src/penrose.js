/**
 * Download-section finale: an impossible (Penrose) triangle in chrome,
 * slowly turning in the void. From one angle the three beams join into a
 * closed loop that can't exist — a surreal echo of the ▲ mark and of a climb
 * that never ends.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export function startPenrose(canvas, reducedMotion) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);

  // Three beams along x, y, z of a cube corner; seen along the diagonal they
  // close into a triangle (the illusion), turning away reveals the trick.
  const L = 3;
  const w = 0.5;
  const metal = new THREE.MeshStandardMaterial({ color: "#d9d9d9", metalness: 1, roughness: 0.18 });
  const dark = new THREE.MeshStandardMaterial({ color: "#151515", metalness: 0.6, roughness: 0.4 });
  const edge = new THREE.LineBasicMaterial({ color: "#e5383b" });
  const group = new THREE.Group();
  const beam = (size, pos, mat) => {
    const g = new THREE.BoxGeometry(...size);
    const m = new THREE.Mesh(g, mat);
    m.position.set(...pos);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edge));
    group.add(m);
  };
  // A: origin → +x, B: up from A's end, C: from B's top along +z. Seen exactly
  // along (1,1,1), C's far end lands on the origin — the loop "closes".
  beam([L, w, w], [L / 2 - w / 2, 0, 0], metal);
  beam([w, L, w], [L - w, L / 2 - w / 2, 0], dark);
  beam([w, w, L], [L - w, L - w, L / 2 - w / 2], metal);
  group.position.set(-(L - w) * 0.66, -(L - w) * 0.66, -(L - w) * 0.33);
  const pivot = new THREE.Group();
  pivot.add(group);
  scene.add(pivot);
  scene.add(new THREE.DirectionalLight("#ffffff", 2).translateX(3).translateY(4).translateZ(5));

  const view = new THREE.Vector3(1, 1, 1).normalize();
  function resize() {
    const wv = canvas.clientWidth;
    const hv = canvas.clientHeight;
    renderer.setSize(wv, hv, false);
    const a = wv / hv;
    const s = 7;
    Object.assign(camera, { left: -s * a, right: s * a, top: s, bottom: -s });
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  let visible = false;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  const pointer = { x: 0, y: 0 };
  canvas.parentElement.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = (e.clientX - r.left) / r.width - 0.5;
    pointer.y = (e.clientY - r.top) / r.height - 0.5;
  });
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    // Drift around the "impossible" viewpoint; the pointer nudges it.
    // Mostly hold the impossible view; occasionally drift far enough to reveal the trick.
    const yaw = Math.sin(t * 0.22) * Math.sin(t * 0.07) * 0.45 + pointer.x * 0.5;
    const pitch = Math.sin(t * 0.17) * 0.12 + pointer.y * 0.3;
    const dir = view.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    camera.position.copy(dir.multiplyScalar(12));
    camera.lookAt(0, 0, 0);
    camera.position.y += 0;
    pivot.position.y = 3.2 + Math.sin(t * 0.6) * 0.15;
    renderer.render(scene, camera);
  }
  frame();
}
