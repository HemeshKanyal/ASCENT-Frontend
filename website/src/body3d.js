/**
 * The story's centrepiece: a real anatomical body (models/muscles.glb +
 * bones.glb, CC BY-SA 4.0 — see public/models/CREDITS.txt) in a smoky void.
 * Chapters drive the camera, which muscles glow red, an X-ray mode that
 * reveals the skeleton, and a "crew" of point-cloud figures. Hover (or tap)
 * any muscle to see its name.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { TA2_NAMES } from "./muscleNames.js";
import { makeProps } from "./props.js";
import { JOINTS, STATES } from "./story.js";

const RED = new THREE.Color("#e5383b");
/** Meshes that start above this height (m) belong to the head and are hidden. */
const HEAD_Y = 1.47;
/** The neck fades out between these heights (m). */
const NECK_FADE = [1.42, 1.5];
const lerp = (a, b, k) => a + (b - a) * k;

export function webglAvailable() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function mountBody({ canvas, onProgress, onReady, onHover, onCycle, reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  // ── Smoke: drifting fbm clouds behind everything (surreal void) ────────
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uAmount: { value: 0.3 }, uRed: { value: RED }, uAspect: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uAmount; uniform vec3 uRed; uniform float uAspect; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * n(p); p = p * 2.03 + 1.7; a *= 0.5; } return v; }
      void main(){
        vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.6;
        float t = uTime * 0.035;
        vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
        float s = fbm(p + 2.2 * q + vec2(t * 1.6, -t));
        float wisps = smoothstep(0.35, 0.95, s);
        vec3 col = vec3(0.012) + vec3(0.16) * wisps * uAmount;
        col += uRed * pow(wisps, 3.0) * 0.22 * uAmount * smoothstep(0.2, 0.9, q.x);
        col *= smoothstep(1.6, 0.2, length(vUv - 0.5) * 1.8);
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  // Drawn first, straight in clip space, so it always fills the screen behind the body.
  const smoke = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), smokeMat);
  smoke.frustumCulled = false;
  smoke.renderOrder = -10;

  // ── Main scene ─────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.add(smoke);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 60);
  scene.add(camera); // carries the floating props
  scene.add(new THREE.HemisphereLight("#d8d8d8", "#080808", 0.7));
  const key = new THREE.DirectionalLight("#ffffff", 2.4);
  key.position.set(2.5, 4, 3.5);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#ffffff", 2.2);
  rim.position.set(-3, 2.5, -3.5);
  scene.add(rim);
  const kicker = new THREE.PointLight(RED, 0, 4, 2);
  kicker.position.set(0, 0.2, 1.2);
  scene.add(kicker);

  // Floating gym equipment behind the body; fog dims the far ones (body materials opt out of fog).
  scene.fog = new THREE.Fog("#000000", 6, 17);
  const small = matchMedia("(max-width: 760px)").matches;
  const props = makeProps(small ? { cols: 3, rows: 5, size: 0.6, reducedMotion } : { cols: 6, rows: 4, reducedMotion });
  camera.add(props.group);

  // Dust: bright, varied, with a few red embers — readable against the smoke.
  const N = small ? 420 : 1100;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 1.2 + Math.random() * 7;
    const a = Math.random() * Math.PI * 2;
    pos.set([Math.cos(a) * r, Math.random() * 4.5 - 0.6, Math.sin(a) * r - 1], i * 3);
    const ember = Math.random() < 0.12;
    const g = 0.6 + Math.random() * 0.4;
    col.set(ember ? [0.95, 0.25, 0.27] : [g, g, g], i * 3);
    size[i] = ember ? 2.6 + Math.random() * 2 : 1.4 + Math.random() * 2.6;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  dustGeo.setAttribute("size", new THREE.BufferAttribute(size, 1));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float size; attribute vec3 color; varying vec3 vC; varying float vA; uniform float uTime; uniform float uPx;
      void main(){
        vec3 p = position; p.y = mod(p.y + uTime * (0.03 + size * 0.006) + 0.6, 4.5) - 0.6;
        p.x += sin(uTime * 0.2 + position.z) * 0.08;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = size * uPx * (3.2 / -mv.z);
        vA = smoothstep(9.0, 2.0, -mv.z);
        vC = color; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: "varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * 1.4, a * vA); }",
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(dustGeo, dustMat));

  // Platform ring under the feet.
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.432, 128), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.8, toneMapped: false, fog: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  scene.add(ring);
  const floorGlow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 64), new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uRed: { value: RED } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 uRed; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(mix(vec3(0.06), uRed * 0.25, smoothstep(0.6, 0.0, d)), smoothstep(1.0, 0.0, d) * 0.6); }",
  }));
  floorGlow.rotation.x = -Math.PI / 2;
  scene.add(floorGlow);

  // ── Materials ──────────────────────────────────────────────────────────
  const idle = new THREE.MeshStandardMaterial({ color: "#8c8c8c", roughness: 0.5, metalness: 0.08, transparent: true });
  const hot = new THREE.MeshStandardMaterial({ color: "#e5383b", emissive: "#e5383b", emissiveIntensity: 0.55, roughness: 0.4 });
  const warm = new THREE.MeshStandardMaterial({ color: "#9a3436", emissive: "#6a1618", emissiveIntensity: 0.5, roughness: 0.45, transparent: true });
  const hover = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#e5383b", emissiveIntensity: 0.9, roughness: 0.3 });
  const boneMat = new THREE.MeshStandardMaterial({ color: "#e6e6e6", roughness: 0.55, metalness: 0.05 });

  for (const m of [idle, hot, warm, hover, boneMat]) m.fog = false;

  // The neck dissolves upward (screen-door dither, so no transparency sorting)
  // instead of ending in a hard cut where the head was removed.
  for (const m of [idle, hot, warm, hover, boneMat]) {
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying float vY;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvY = (modelMatrix * vec4(transformed, 1.0)).y;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vY;\nfloat ditherHash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }")
        .replace("void main() {", `void main() {\n  if (ditherHash(gl_FragCoord.xy) < smoothstep(${NECK_FADE[0].toFixed(2)}, ${NECK_FADE[1].toFixed(2)}, vY)) discard;`);
    };
  }

  const body = new THREE.Group();
  scene.add(body);
  const muscles = [];
  const byTa2 = new Map();

  // Point-cloud "crew" — figures sampled from the real muscle surfaces.
  const crew = new THREE.Group();
  crew.visible = false;
  scene.add(crew);
  const crewMat = new THREE.PointsMaterial({ color: "#bdbdbd", size: 0.012, transparent: true, opacity: 0, depthWrite: false, fog: false });

  // Joint markers for the health chapter.
  const joints = new THREE.Group();
  for (const j of JOINTS) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 14), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0, toneMapped: false }));
    m.position.set(...j.p);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.068, 48), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false }));
    m.add(halo);
    joints.add(m);
  }
  scene.add(joints);

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const loaded = { muscles: 0, bones: 0 };
  const report = () => onProgress?.(Math.round(((loaded.muscles + loaded.bones) / 2) * 100));
  const load = (name, mat) =>
    loader.loadAsync(`/models/${name}.glb`, (e) => {
      if (e.total) loaded[name] = e.loaded / e.total;
      report();
    }).then((g) => {
      loaded[name] = 1;
      report();
      g.scene.traverse((o) => {
        if (!o.isMesh) return;
        // No head: the facial muscles and skull read as creepy, and the story is about the body.
        o.geometry.computeBoundingBox();
        if (o.geometry.boundingBox.min.y > HEAD_Y) {
          o.visible = false;
          return;
        }
        o.material = mat;
        if (name === "muscles") {
          // GLTFLoader sanitises "ta2-2231.r" to "ta2-2231r"; drop the side suffix either way.
          const ta2 = o.name.replace(/^ta2-/, "").replace(/\.?[a-z]+$/, "");
          o.userData.ta2 = ta2;
          muscles.push(o);
          if (!byTa2.has(ta2)) byTa2.set(ta2, []);
          byTa2.get(ta2).push(o);
        }
      });
      body.add(g.scene);
      return g.scene;
    });

  Promise.all([load("muscles", idle), load("bones", boneMat)]).then(([mScene]) => {
    // Sample the crew silhouettes from muscle vertices (world space).
    mScene.updateMatrixWorld(true);
    const pts = [];
    const v = new THREE.Vector3();
    for (const m of muscles) {
      const p = m.geometry.attributes.position;
      const step = Math.max(1, Math.floor(p.count / 40));
      for (let i = 0; i < p.count; i += step) pts.push(v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).toArray());
    }
    const cloud = new THREE.BufferGeometry();
    cloud.setAttribute("position", new THREE.Float32BufferAttribute(pts.flat(), 3));
    const spots = [[-1.25, -0.9, 0.5], [1.25, -0.9, -0.5], [-2.3, -2.2, 0.8], [2.3, -2.2, -0.8], [0, -2.8, 0]];
    for (const [x, z, ry] of spots) {
      const c = new THREE.Points(cloud, crewMat);
      c.position.set(x, 0, z);
      c.rotation.y = ry;
      crew.add(c);
    }
    applyState(true);
    onReady?.();
  });

  // ── State ──────────────────────────────────────────────────────────────
  let state = STATES.hero;
  let cycleIdx = 0;
  let lastCycle = 0;
  let hovered = null;
  // Portrait screens are narrow: pull the camera back so the body still fits.
  let distScale = 1;
  const look = { az: state.cam.az, el: state.cam.el, dist: state.cam.dist, y: state.cam.y };
  const mix = { dim: 1, xray: 0, smoke: 0.2, crew: 0, joints: 0 };

  function applyState(force) {
    const hotSet = new Set(state.cycle ? [...(state.hot ?? []), ...state.cycle[cycleIdx % state.cycle.length]] : state.hot ?? []);
    const warmSet = new Set(state.warm ?? []);
    if (!force && !muscles.length) return;
    for (const m of muscles) {
      const id = m.userData.ta2;
      m.material = m === hovered ? hover : hotSet.has(id) ? hot : warmSet.has(id) ? warm : idle;
    }
  }

  // ── Post-processing: a soft bloom so the red muscles glow ─────────────
  const composer = new EffectComposer(renderer);
  const rp = new RenderPass(scene, camera);
  composer.renderToScreen = true;
  composer.addPass(rp);
  // Bloom is the most expensive pass; phones and low-core machines skip it.
  const lowPower = matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
  if (!lowPower) composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.5, 0.85));
  composer.addPass(new OutputPass());

  // ── Hover (desktop) / tap (phone) a muscle to see its name ────────────
  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  function pick(clientX, clientY) {
    if (!muscles.length) return null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(muscles, false).find((h) => h.object.visible)?.object ?? null;
  }
  function setHover(obj, x, y) {
    if (obj === hovered) return;
    hovered = obj;
    applyState();
    onHover?.(obj ? { name: TA2_NAMES[obj.userData.ta2] ?? obj.userData.ta2, ta2: obj.userData.ta2, x, y } : null);
  }
  let lastPick = 0;
  addEventListener("pointermove", (e) => {
    pointer.x = e.clientX / innerWidth - 0.5;
    pointer.y = e.clientY / innerHeight - 0.5;
    if (e.pointerType !== "mouse" || performance.now() - lastPick < 50) return;
    lastPick = performance.now();
    setHover(overStage(e) ? pick(e.clientX, e.clientY) : null, e.clientX, e.clientY);
  });
  addEventListener("click", (e) => overStage(e) && setHover(pick(e.clientX, e.clientY), e.clientX, e.clientY));
  // Chapters scroll above the canvas, so "over the body" means not over text, nav or links.
  function overStage(e) {
    if (document.body.dataset.stage === "dim") return false;
    const over = document.elementFromPoint(e.clientX, e.clientY);
    return !over?.closest(".panel, .phones, .phone, .nav, .footer, a, button, summary");
  }

  const pointer = { x: 0, y: 0 };
  new ResizeObserver(resize).observe(canvas);
  resize();
  const clock = new THREE.Clock();
  let lastT = 0;
  (function loop() {
    requestAnimationFrame(loop);
    if (!document.hidden) frame(reducedMotion ? 0 : clock.getElapsedTime());
  })();

  return {
    /** Current camera angles, for the HUD readout. */
    view: () => ({ az: ((look.az % 360) + 360) % 360, el: look.el, dist: look.dist }),
    setState(key) {
      if (STATES[key] === state) return;
      state = STATES[key];
      cycleIdx = 0;
      lastCycle = performance.now();
      applyState();
      if (state.cycle) onCycle?.(0);
    },
  };

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, w < 760 ? 1.5 : 2));
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    distScale = w / h < 0.8 ? 1.3 : 1;
    // Frame the body to the right on wide screens, above the text on phones.
    if (w >= 900) camera.setViewOffset(w, h, -w * 0.2, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    camera.updateProjectionMatrix();
    smokeMat.uniforms.uAspect.value = w / h;
    dustMat.uniforms.uPx.value = renderer.getPixelRatio() * (w < 760 ? 3.5 : 5);
  }

  function frame(t) {
    // Time-based easing so the camera settles at the same speed on 30, 60 or 120 Hz screens.
    const now = performance.now() / 1000;
    const dt = Math.min(1, 1 - Math.exp(-(now - (lastT || now - 0.016)) * 3.6));
    lastT = now;
    // Cycle highlight sets (rotators, delt heads, activities).
    if (state.cycle && !reducedMotion && performance.now() - lastCycle > 1300) {
      lastCycle = performance.now();
      cycleIdx++;
      applyState();
      if (state.cycle) onCycle?.(cycleIdx % state.cycle.length);
    }
    const spin = reducedMotion ? 0 : (state.spin ?? 0.02);
    const c = state.cam;
    look.az = lerp(look.az, c.az + Math.sin(t * spin) * 18 + pointer.x * 12, dt);
    look.el = lerp(look.el, c.el - pointer.y * 6, dt);
    look.dist = lerp(look.dist, c.dist * distScale, dt);
    look.y = lerp(look.y, c.y, dt);
    const az = THREE.MathUtils.degToRad(look.az);
    const el = THREE.MathUtils.degToRad(look.el);
    camera.position.set(Math.sin(az) * Math.cos(el) * look.dist, look.y + Math.sin(el) * look.dist, Math.cos(az) * Math.cos(el) * look.dist);
    camera.lookAt(0, look.y, 0);

    mix.dim = lerp(mix.dim, state.dim ?? 1, dt);
    mix.xray = lerp(mix.xray, state.xray ?? 0, dt);
    mix.smoke = lerp(mix.smoke, state.smoke ?? 0.3, dt);
    mix.crew = lerp(mix.crew, state.crew ? 1 : 0, dt);
    mix.joints = lerp(mix.joints, state.joints ? 1 : 0, dt);
    const g = 0.34 * mix.dim;
    idle.color.setRGB(g, g, g);
    idle.opacity = 1 - mix.xray * 0.86;
    idle.depthWrite = mix.xray < 0.5;
    warm.opacity = 1 - mix.xray * 0.6;
    crewMat.opacity = mix.crew * 0.55;
    crew.visible = mix.crew > 0.02;
    joints.children.forEach((j, i) => {
      const pulse = 0.6 + 0.4 * Math.sin(t * 3 + i);
      j.material.opacity = mix.joints * pulse;
      j.children[0].material.opacity = mix.joints * (1 - ((t * 0.8 + i * 0.2) % 1));
      j.children[0].scale.setScalar(1 + ((t * 0.8 + i * 0.2) % 1) * 1.6);
      j.children[0].lookAt(camera.position);
    });
    kicker.intensity = state.hot || state.cycle ? 1.2 : 0.4;
    smokeMat.uniforms.uTime.value = t;
    smokeMat.uniforms.uAmount.value = mix.smoke;
    dustMat.uniforms.uTime.value = t;
    props.update(t, camera);

    composer.render();
  }
}

