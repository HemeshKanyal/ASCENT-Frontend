/**
 * Hero scene: the app's own 3D mannequin (src/engine rig + motions) doing
 * real reps in a surreal void — a spiral staircase of floating blocks rising
 * into the dark, a liquid-chrome moon, drifting weights — framed by
 * cybercore touches: a wireframe grid floor, bloom on the working muscles,
 * scanlines and a live joint-angle readout.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { exerciseMuscles, muscleHighlight } from "@engine/anatomy.js";
import { MOTIONS, demoDuration, scene3D } from "@engine/demo.js";
import { EXERCISES } from "@engine/exercises.js";

const S = 0.01; // rig units (~1.1 cm) → metres-ish
const RED = new THREE.Color("#e5383b");
const ANGLE_KEYS = {
  back_squat: ["kneeR", "hipR", "ankleR"],
  conventional_deadlift: ["hipR", "kneeR", "shoulderR"],
  barbell_bench_press: ["elbowR", "shoulderR"],
  pull_up: ["elbowR", "shoulderR"],
  barbell_hip_thrust: ["hipR", "kneeR"],
  dumbbell_lateral_raise: ["shoulderR", "elbowR"],
  kettlebell_swing: ["hipR", "kneeR", "shoulderR"],
};

export function startHero({ canvas, onAngles, reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  const mobile = matchMedia("(max-width: 900px)").matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#000");
  scene.fog = new THREE.FogExp2("#000", 0.075);
  // A dim studio reflection so chrome, plates and bars read as metal, not black.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  // On phones the figure sits in the top half, above the copy.
  camera.position.set(mobile ? 1.8 : 2.6, mobile ? 0.6 : 1.35, mobile ? 6.6 : 5.2);
  const target = new THREE.Vector3(mobile ? 0 : -0.55, mobile ? -0.15 : 0.95, 0);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI * 0.28;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.35;

  // ── Light: cold key, rim from behind, a red kicker from below ──────────
  scene.add(new THREE.HemisphereLight("#cfcfcf", "#050505", 0.55));
  const key = new THREE.DirectionalLight("#ffffff", 2.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#ffffff", 2.6);
  rim.position.set(-4, 3, -5);
  scene.add(rim);
  const under = new THREE.PointLight(RED, 2.5, 3, 2);
  under.position.set(0, 0.08, 0);
  scene.add(under);

  // ── Floor: infinite-feeling wireframe grid that fades into fog ─────────
  const grid = new THREE.GridHelper(80, 160, "#3a3a3a", "#161616");
  grid.material.transparent = true;
  grid.material.opacity = 0.8;
  scene.add(grid);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.9, 64), new THREE.MeshBasicMaterial({ color: "#0d0d0d" }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.002;
  scene.add(disc);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 0.915, 96), new THREE.MeshBasicMaterial({ color: RED, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.004;
  scene.add(ring);

  // ── Surreal: a staircase of floating blocks spiralling up into the void ─
  const stairs = new THREE.Group();
  const stepGeo = new THREE.BoxGeometry(0.9, 0.12, 0.42);
  const stepMat = new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.6, metalness: 0.3 });
  const edgeMat = new THREE.LineBasicMaterial({ color: "#5a5a5a" });
  const edgeGeo = new THREE.EdgesGeometry(stepGeo);
  // Centred behind the figure so no step ever crosses it.
  for (let i = 0; i < 40; i++) {
    const a = i * 0.38 + 1.2;
    const r = 2.6 + Math.sin(i * 0.7) * 0.2;
    const step = new THREE.Mesh(stepGeo, stepMat);
    step.add(new THREE.LineSegments(edgeGeo, edgeMat));
    step.position.set(Math.cos(a) * r + 1.4, 0.1 + i * 0.24, Math.sin(a) * r - 6.2);
    step.rotation.y = -a;
    step.userData = { base: step.position.y, phase: i * 0.5 };
    stairs.add(step);
  }
  scene.add(stairs);

  // Liquid-chrome moon: a sphere whose surface slowly breathes (vertex noise + fresnel).
  const moonMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uRed: { value: RED } },
    vertexShader: /* glsl */ `
      uniform float uTime; varying vec3 vN; varying vec3 vView;
      float n3(vec3 p){ return sin(p.x*2.1+uTime*0.6)*sin(p.y*2.7-uTime*0.45)*sin(p.z*1.9+uTime*0.5); }
      void main(){
        vec3 p = position + normal * n3(position*1.3) * 0.18;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        vN = normalize(normalMatrix * normal); vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uRed; varying vec3 vN; varying vec3 vView;
      void main(){
        float f = pow(1.0 - max(dot(vN, vView), 0.0), 2.4);
        float bands = 0.5 + 0.5 * sin(vN.y * 18.0 + vN.x * 6.0);
        vec3 chrome = mix(vec3(0.015), vec3(0.55), f) + bands * 0.04;
        gl_FragColor = vec4(chrome + uRed * pow(f, 6.0) * 0.9, 1.0);
      }`,
  });
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 48), moonMat);
  moon.position.set(-0.6, 5.6, -16);
  scene.add(moon);

  // Drifting weights: plates and dumbbells floating at impossible angles.
  const floaters = new THREE.Group();
  const darkMetal = new THREE.MeshStandardMaterial({ color: "#2a2a2a", roughness: 0.3, metalness: 0.9 });
  const brightMetal = new THREE.MeshStandardMaterial({ color: "#bdbdbd", roughness: 0.25, metalness: 1 });
  const plateGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.06, 48);
  const bellBar = new THREE.CylinderGeometry(0.02, 0.02, 0.36, 12);
  const bellHead = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 24);
  const spots = [[-3.2, 2.6, -1.5], [3.6, 3.4, -2.4], [-2.2, 4.4, -5.2], [4.6, 1.6, -4.2], [-4.6, 1.2, -3.4], [1.4, 3.9, -6.8]];
  spots.forEach((p, i) => {
    let m;
    if (i % 2 === 0) {
      m = new THREE.Mesh(plateGeo, darkMetal);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(plateGeo, 30), edgeMat));
    } else {
      m = new THREE.Group();
      m.add(new THREE.Mesh(bellBar, brightMetal));
      for (const y of [-0.17, 0.17]) {
        const h = new THREE.Mesh(bellHead, darkMetal);
        h.position.y = y;
        m.add(h);
      }
    }
    m.position.set(...p);
    m.rotation.set(i, i * 0.7, i * 1.3);
    m.userData = { base: p[1], phase: i * 1.7, spin: 0.15 + (i % 3) * 0.08 };
    floaters.add(m);
  });
  scene.add(floaters);

  // Dust rising — the "ascent".
  const dustCount = mobile ? 350 : 800;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 22;
    dustPos[i * 3 + 1] = Math.random() * 12;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 22 - 3;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: "#bbbbbb", size: 0.025, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(dust);

  // ── The mannequin, rebuilt every frame from the engine's 3D scene ──────
  const MAX = 140;
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true);
  const sphGeo = new THREE.SphereGeometry(1, 20, 14);
  const bodyMat = new THREE.MeshStandardMaterial({ color: "#8f8f8f", roughness: 0.42, metalness: 0.25 });
  const propMat = new THREE.MeshStandardMaterial({ color: "#d0d0d0", roughness: 0.25, metalness: 0.9 });
  const muscleMat = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
  const mk = (geo, mat) => {
    const m = new THREE.InstancedMesh(geo, mat, MAX);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    scene.add(m);
    return m;
  };
  const bodyCyl = mk(cylGeo, bodyMat);
  const bodySph = mk(sphGeo, bodyMat);
  const propCyl = mk(cylGeo, propMat);
  const propSph = mk(sphGeo, propMat);
  const musCyl = mk(cylGeo, muscleMat);
  const musSph = mk(sphGeo, muscleMat);
  const plates = mk(new THREE.CylinderGeometry(1, 1, 1, 40), darkMetal);
  musCyl.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
  musSph.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
  const equipment = new THREE.Group();
  scene.add(equipment);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const col = new THREE.Color();
  const toV = (p, out) => out.set(p[0] * S, p[1] * S, p[2] * S);

  function placeCapsule(cyl, sph, idx, a, b, r) {
    toV(a, va);
    toV(b, vb);
    dir.subVectors(vb, va);
    const len = Math.max(dir.length(), 1e-4);
    q.setFromUnitVectors(up, dir.normalize());
    m4.compose(va.clone().add(vb).multiplyScalar(0.5), q, scl.set(r * S, len, r * S));
    cyl.setMatrixAt(idx.c++, m4);
    m4.compose(va, q.identity(), scl.set(r * S, r * S, r * S));
    sph.setMatrixAt(idx.s++, m4);
    m4.compose(vb, q, scl);
    sph.setMatrixAt(idx.s++, m4);
  }

  let motionId = "back_squat";
  let motion = MOTIONS[motionId];
  let levels = {};
  let offset = [0, 0, 0];
  function setMotion(id) {
    motionId = id;
    motion = MOTIONS[id];
    const ex = EXERCISES.find((e) => e.id === id);
    const m = exerciseMuscles(ex);
    levels = muscleHighlight(m.primary, m.secondary);
    // Centre the figure over the platform.
    const s = scene3D(motion, 0, {});
    const xs = s.caps.filter((c) => c.kind === "body").flatMap((c) => [c.a[0], c.b[0]]);
    const zs = s.caps.filter((c) => c.kind === "body").flatMap((c) => [c.a[2], c.b[2]]);
    offset = [-(Math.min(...xs) + Math.max(...xs)) / 2, 0, -(Math.min(...zs) + Math.max(...zs)) / 2];
    // Static equipment (benches, racks) as dark blocks with bright edges.
    equipment.clear();
    for (const b of s.boxes) {
      const g = new THREE.BoxGeometry(b.size[0] * S, b.size[1] * S, b.size[2] * S);
      const mesh = new THREE.Mesh(g, stepMat);
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat));
      mesh.position.set((b.c[0] + offset[0]) * S, b.c[1] * S, (b.c[2] + offset[2]) * S);
      mesh.rotation.z = (b.pitch * Math.PI) / 180;
      equipment.add(mesh);
    }
  }
  setMotion(motionId);

  const shift = (p) => [p[0] + offset[0], p[1], p[2] + offset[2]];
  let lastAngles = 0;
  function updateFigure(t) {
    const s = scene3D(motion, t, levels);
    const bi = { c: 0, s: 0 };
    const pi = { c: 0, s: 0 };
    const mi = { c: 0, s: 0 };
    for (const c of s.caps) {
      const a = shift(c.a);
      const b = shift(c.b);
      if (c.kind === "body") placeCapsule(bodyCyl, bodySph, bi, a, b, c.r);
      else if (c.kind === "prop") {
        // Skip tall rack/frame uprights in the hero: they'd cut across the figure.
        if (Math.abs(c.a[1] - c.b[1]) > 120 && Math.abs(c.a[0] - c.b[0]) < 1) continue;
        placeCapsule(propCyl, propSph, pi, a, b, c.r);
      }
      else {
        const k = mi.c;
        placeCapsule(musCyl, musSph, mi, a, b, c.r);
        col.copy(RED).multiplyScalar(c.level === 2 ? 0.9 + 1.2 * (c.glow ?? 1) : 0.45);
        musCyl.setColorAt(k, col);
        musSph.setColorAt(k * 2, col);
        musSph.setColorAt(k * 2 + 1, col);
      }
    }
    for (const sp of s.spheres) {
      m4.compose(toV(shift(sp.c), va), q.identity(), scl.set(sp.r * S, sp.r * S, sp.r * S));
      bodySph.setMatrixAt(bi.s++, m4);
    }
    let di = 0;
    for (const d of s.discs) {
      toV(shift(d.c), va);
      q.setFromUnitVectors(up, dir.set(...d.n).normalize());
      m4.compose(va, q, scl.set(d.r * S, d.thick * S, d.r * S));
      plates.setMatrixAt(di++, m4);
    }
    for (const [mesh, n] of [[bodyCyl, bi.c], [bodySph, bi.s], [propCyl, pi.c], [propSph, pi.s], [musCyl, mi.c], [musSph, mi.s], [plates, di]]) {
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    under.intensity = 1.2 + 2.8 * s.effort;
    if (onAngles && performance.now() - lastAngles > 120) {
      lastAngles = performance.now();
      onAngles(motionId, (ANGLE_KEYS[motionId] ?? ["kneeR", "hipR"]).map((k) => [k, s.joints[k]]));
    }
  }

  // ── Post-processing: bloom for the red, then grain/scanlines/aberration ─
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.45, 0.88);
  composer.addPass(bloom);
  const crt = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGlitch: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform float uTime; uniform float uGlitch; varying vec2 vUv;
      float rnd(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        float band = step(0.985, rnd(vec2(floor(uv.y * 40.0), floor(uTime * 8.0)))) * uGlitch;
        uv.x += band * 0.03;
        float ab = 0.0012 + uGlitch * 0.004;
        vec3 c = vec3(texture2D(tDiffuse, uv + vec2(ab, 0.0)).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - vec2(ab, 0.0)).b);
        c *= 0.92 + 0.08 * sin(uv.y * 900.0);
        c += (rnd(uv * uTime) - 0.5) * 0.035;
        float v = smoothstep(1.15, 0.35, length(uv - 0.5));
        gl_FragColor = vec4(c * v, 1.0);
      }`,
  });
  composer.addPass(crt);
  composer.addPass(new OutputPass());

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Pause when the hero is off screen or the tab is hidden.
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  const clock = new THREE.Clock();
  let glitchUntil = 0;
  let nextGlitch = 4;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    updateFigure(reducedMotion ? demoDuration(motion) * 0.45 : t);
    if (!reducedMotion) {
      stairs.children.forEach((s) => (s.position.y = s.userData.base + Math.sin(t * 0.5 + s.userData.phase) * 0.05));
      stairs.rotation.y = t * 0.02;
      floaters.children.forEach((f) => {
        f.position.y = f.userData.base + Math.sin(t * 0.6 + f.userData.phase) * 0.25;
        f.rotation.x += 0.003 * f.userData.spin * 10;
        f.rotation.y += 0.002 * f.userData.spin * 10;
      });
      const p = dust.geometry.attributes.position;
      for (let i = 0; i < dustCount; i++) {
        let y = p.getY(i) + 0.004;
        if (y > 12) y = 0;
        p.setY(i, y);
      }
      p.needsUpdate = true;
      if (t > nextGlitch) {
        glitchUntil = t + 0.18;
        nextGlitch = t + 4 + Math.random() * 5;
      }
    }
    moonMat.uniforms.uTime.value = t;
    crt.uniforms.uTime.value = t;
    crt.uniforms.uGlitch.value = t < glitchUntil ? 1 : 0;
    controls.update();
    composer.render();
  }
  frame();

  return {
    setMotion,
    glitch() {
      glitchUntil = clock.getElapsedTime() + 0.25;
    },
  };
}

export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
  } catch {
    return false;
  }
}
