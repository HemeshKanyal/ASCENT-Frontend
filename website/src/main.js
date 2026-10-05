/**
 * ASCENT website. Everything interactive runs on the app's own engine
 * (src/engine): the 3D hero rig, the 2D demos, the anatomy map and the
 * exercise library, so the site shows exactly what the app does.
 */
import "./style.css";

import { BODY_BACK, BODY_DETAILS, BODY_FRONT, BODY_VIEWBOX, MUSCLE_DETAILS, exerciseMuscles, muscleHighlight } from "@engine/anatomy.js";
import { MOTIONS, demoDuration, demoFrame, demoViewBox } from "@engine/demo.js";
import { EXERCISES } from "@engine/exercises.js";

import { LINKS } from "./config.js";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s) => document.querySelector(s);
const byId = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
const SVG = "http://www.w3.org/2000/svg";

// ── Links ────────────────────────────────────────────────────────────────
for (const a of document.querySelectorAll('[data-link="webapp"]')) {
  if (LINKS.webApp) a.href = LINKS.webApp;
}
if (LINKS.apk) {
  const apk = $("#apk-link");
  apk.href = LINKS.apk;
  apk.textContent = "Download the Android APK";
  apk.removeAttribute("aria-disabled");
  if (LINKS.apkNote) $("#apk-note").textContent = LINKS.apkNote;
}
$("#year").textContent = new Date().getFullYear();

// ── Hero (3D, loaded lazily so the page paints first) ────────────────────
const NAMES = { kneeR: "KNEE", hipR: "HIP", ankleR: "ANKLE", elbowR: "ELBOW", shoulderR: "SHOULDER" };
function showAngles(id, pairs) {
  $("#hud-motion").textContent = id.toUpperCase();
  $("#hud-angles").innerHTML = pairs.map(([k, a]) => `<div>${NAMES[k] ?? k} <b>${Math.round(Math.abs(a ?? 0))}°</b></div>`).join("");
}
(async () => {
  const { startHero, webglAvailable } = await import("./hero3d.js");
  if (!webglAvailable()) {
    document.querySelector(".motion-picker").hidden = true;
    return;
  }
  const hero = startHero({ canvas: $("#hero-canvas"), onAngles: showAngles, reducedMotion });
  const { startPenrose } = await import("./penrose.js");
  startPenrose($("#penrose-canvas"), reducedMotion);
  for (const b of document.querySelectorAll(".motion-picker button")) {
    b.addEventListener("click", () => {
      document.querySelectorAll(".motion-picker button").forEach((x) => x.classList.toggle("on", x === b));
      hero.setMotion(b.dataset.motion);
      hero.glitch();
    });
  }
})();

// ── 2D demos: the exact renderer the app uses ────────────────────────────
const PALETTE = {
  muscle: "#E5383B", muscleSoft: "#8A2E30", outline: "#141414", bar: "#C8C8C8", plate: "#2A2A2A", plateEdge: "#3A3A3A",
  propDark: "#333", propTop: "#4A4A4A", propSide: "#3C3C3C", cable: "#9A9A9A", band: "#777", shadow: "rgba(255,255,255,0.05)",
};
function drawDemo(svg, shapes) {
  const out = [];
  for (const s of shapes) {
    const c = PALETTE[s.color] ?? s.color;
    const op = s.opacity != null ? ` opacity="${s.opacity}"` : "";
    if (s.kind === "line") out.push(`<line x1="${s.p1[0]}" y1="${s.p1[1]}" x2="${s.p2[0]}" y2="${s.p2[1]}" stroke="${c}" stroke-width="${s.w}" stroke-linecap="round"${op}/>`);
    else if (s.kind === "circle") out.push(`<circle cx="${s.c[0]}" cy="${s.c[1]}" r="${s.r}" fill="${c}"${op}/>`);
    else if (s.kind === "ellipse") out.push(`<ellipse cx="${s.c[0]}" cy="${s.c[1]}" rx="${s.rx}" ry="${s.ry}" fill="${c}"${s.color === "plate" ? ' stroke="#bdbdbd" stroke-width="0.8"' : ""}${op} transform="rotate(${s.rot} ${s.c[0]} ${s.c[1]})"/>`);
    else out.push(`<polygon points="${s.points.map((p) => p.join(",")).join(" ")}" fill="${c}" stroke="#1a1a1a" stroke-width="0.5"${op}/>`);
  }
  svg.innerHTML = out.join("");
}

const DEFAULT_DEMOS = ["romanian_deadlift", "bulgarian_split_squat", "cable_fly", "face_pull", "nordic_curl", "pistol_squat", "incline_dumbbell_curl", "ab_wheel_rollout"];
const tiles = [];
function makeTile(id) {
  const ex = byId[id];
  const m = exerciseMuscles(ex);
  const el = document.createElement("figure");
  el.className = "demo-tile";
  el.innerHTML = `<svg viewBox="${demoViewBox(MOTIONS[id]).join(" ")}" role="img" aria-label="${ex.name} demo"></svg><figcaption class="cap"><strong>${ex.name}</strong><span class="mono">${MUSCLE_DETAILS[m.primary[0]]?.[1] ?? ""}</span></figcaption>`;
  return { el, svg: el.querySelector("svg"), motion: MOTIONS[id], levels: muscleHighlight(m.primary, m.secondary), offset: Math.random() * 3 };
}
function setDemos(ids) {
  const grid = $("#demo-grid");
  grid.innerHTML = "";
  tiles.length = 0;
  for (const id of ids) {
    const t = makeTile(id);
    tiles.push(t);
    grid.append(t.el);
    drawDemo(t.svg, demoFrame(t.motion, demoDuration(t.motion) * 0.45, t.levels));
  }
}
setDemos(DEFAULT_DEMOS);
const list = $("#demo-list");
list.innerHTML = EXERCISES.map((e) => `<option value="${e.name}"></option>`).join("");
$("#demo-input").addEventListener("change", (e) => {
  const ex = EXERCISES.find((x) => x.name.toLowerCase() === e.target.value.trim().toLowerCase());
  if (!ex) return;
  setDemos([ex.id, ...DEFAULT_DEMOS.filter((d) => d !== ex.id)].slice(0, 8));
  e.target.blur();
});

let demosVisible = false;
new IntersectionObserver(([e]) => (demosVisible = e.isIntersecting), { rootMargin: "100px" }).observe($("#demo-grid"));
let lastDemo = 0;
function demoLoop(now) {
  requestAnimationFrame(demoLoop);
  if (!demosVisible || reducedMotion || now - lastDemo < 1000 / 30) return;
  lastDemo = now;
  for (const t of tiles) drawDemo(t.svg, demoFrame(t.motion, now / 1000 + t.offset, t.levels));
}
requestAnimationFrame(demoLoop);

// ── Method: anchors stay, rotators re-pick every session ─────────────────
const SLOTS = [
  { pattern: "squat", anchor: "back_squat", label: "Quads · anchor" },
  { pattern: "horizontal_push", anchor: "barbell_bench_press", label: "Chest · anchor" },
  { pattern: "vertical_pull", label: "Lats" },
  { pattern: "hinge", label: "Hamstrings" },
  { pattern: "lateral_raise", label: "Side delts" },
  { pattern: "elbow_flexion", label: "Biceps" },
  { pattern: "knee_flexion", label: "Hamstrings · isolation" },
  { pattern: "core_anti_extension", label: "Core" },
];
const pools = Object.fromEntries(SLOTS.map((s) => [s.pattern, EXERCISES.filter((e) => e.pattern === s.pattern)]));
const picks = {};
let session = 1;
function renderRotation(flash) {
  const grid = $("#rotation-grid");
  grid.innerHTML = SLOTS.map((s) => {
    const anchor = !!s.anchor;
    if (!anchor) {
      const pool = pools[s.pattern].filter((e) => e.id !== picks[s.pattern]);
      picks[s.pattern] = pool[Math.floor(Math.random() * pool.length)].id;
    }
    const ex = byId[anchor ? s.anchor : picks[s.pattern]];
    return `<div class="slot ${anchor ? "anchor" : "rotator"}${flash && !anchor ? " flash" : ""}"><div class="mono"><span class="tag">${anchor ? "■ anchor" : "◆ rotator"}</span> · ${s.label}</div><strong>${ex.name}</strong></div>`;
  }).join("");
  $("#rotate-btn").textContent = `⟳ Generate session ${session + 1}`;
}
renderRotation(false);
$("#rotate-btn").addEventListener("click", () => {
  session++;
  renderRotation(true);
});
let methodVisible = false;
new IntersectionObserver(([e]) => (methodVisible = e.isIntersecting)).observe($("#rotation-grid"));
if (!reducedMotion)
  setInterval(() => {
    if (!methodVisible) return;
    session++;
    renderRotation(true);
  }, 3600);

// ── Anatomy: hover or tap any muscle ─────────────────────────────────────
const trainers = {};
for (const e of EXERCISES) {
  const m = exerciseMuscles(e);
  for (const id of m.primary) (trainers[id] ??= { primary: [], secondary: [] }).primary.push(e);
  for (const id of m.secondary) (trainers[id] ??= { primary: [], secondary: [] }).secondary.push(e);
}
function figure(regions, details, caption) {
  const W = BODY_VIEWBOX.width;
  const path = (r) => `<path d="${r.d}" ${r.muscle ? `data-m="${r.muscle}"` : ""} fill="${r.muscle ? "#3A3A3A" : "#2C2C2C"}" stroke="#0A0A0A" stroke-width="0.6" stroke-linejoin="round"/>`;
  const half = regions.filter((r) => !r.whole).map(path).join("") + details.map((d) => `<path d="${d}" fill="none" stroke="#0A0A0A" stroke-width="0.5"/>`).join("");
  return `<figure><svg viewBox="0 0 ${W} ${BODY_VIEWBOX.height}" role="img" aria-label="${caption} muscles">${regions.filter((r) => r.whole).map(path).join("")}<g>${half}</g><g transform="translate(${W},0) scale(-1,1)">${half}</g></svg><figcaption class="mono dim">${caption}</figcaption></figure>`;
}
$("#anatomy-figures").innerHTML = figure(BODY_FRONT, BODY_DETAILS.front, "Front") + figure(BODY_BACK, BODY_DETAILS.back, "Back");
function selectMuscle(id) {
  for (const p of document.querySelectorAll("#anatomy-figures path[data-m]")) p.setAttribute("fill", p.dataset.m === id ? "#E5383B" : "#3A3A3A");
  const [name, group] = MUSCLE_DETAILS[id];
  $("#muscle-name").textContent = name;
  $("#muscle-group").textContent = group;
  const t = trainers[id] ?? { primary: [], secondary: [] };
  const items = [...t.primary.slice(0, 10).map((e) => `<li class="target">${e.name}</li>`), ...t.secondary.slice(0, Math.max(0, 14 - t.primary.length)).map((e) => `<li>${e.name}</li>`)];
  $("#muscle-exercises").innerHTML = items.join("") || "<li>Stretched in mobility flows</li>";
}
$("#anatomy-figures").addEventListener("pointerover", (e) => e.target.dataset?.m && selectMuscle(e.target.dataset.m));
$("#anatomy-figures").addEventListener("click", (e) => e.target.dataset?.m && selectMuscle(e.target.dataset.m));
selectMuscle("pec_clavicular");

// ── Fuel: reveal the estimate line by line when the scan is on screen ────
const scanItems = [...document.querySelectorAll("#scan-out li")];
new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) return;
  scanItems.forEach((li, i) => setTimeout(() => li.classList.add("in"), reducedMotion ? 0 : 500 + i * 650));
}).observe($("#scan-out"));

// ── Streak heatmap ───────────────────────────────────────────────────────
const heat = $("#heatmap");
heat.innerHTML = Array.from({ length: 18 * 7 }, () => "<i></i>").join("");
const cells = [...heat.children];
const shades = ["#1a1a1a", "#3a3a3a", "#8a8a8a", "#e8e8e8", "#E5383B"];
function paintHeat() {
  cells.forEach((c, i) => {
    const rest = i % 7 === 6;
    const r = Math.random();
    c.style.background = shades[rest ? 0 : r > 0.93 ? 4 : r > 0.6 ? 3 : r > 0.35 ? 2 : r > 0.15 ? 1 : 0];
  });
}
paintHeat();
if (!reducedMotion) setInterval(paintHeat, 4000);

// ── Scroll reveal ────────────────────────────────────────────────────────
const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.15 });
for (const el of document.querySelectorAll(".section-head, .rotation, .demo-grid, .anatomy, .scan, .feature, .download > *")) {
  el.classList.add("reveal");
  io.observe(el);
}

// ── Cybercore tickers: real exercise data scrolling past ─────────────────
const tickerItems = EXERCISES.filter((_, i) => i % 3 === 0).map((e) => {
  const m = exerciseMuscles(e);
  return `<b>▲</b> ${e.id.toUpperCase()} <i>${(MUSCLE_DETAILS[m.primary[0]]?.[0] ?? "").toUpperCase()}</i> · ${e.pattern.toUpperCase()} &nbsp;&nbsp;`;
});
for (const [n, el] of [...document.querySelectorAll("[data-ticker]")].entries()) {
  const items = tickerItems.slice(n * 12).concat(tickerItems.slice(0, n * 12)).join("");
  el.innerHTML = items + items;
}

// ── Cards tilt toward the pointer (2.5D) ─────────────────────────────────
if (!reducedMotion && matchMedia("(hover: hover)").matches) {
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest?.(".feature, .demo-tile");
    document.querySelectorAll(".tilt").forEach((c) => c !== card && (c.style.transform = ""));
    if (!card) return;
    card.classList.add("tilt");
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 10}deg) translateZ(6px)`;
  });
}
