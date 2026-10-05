/**
 * ASCENT story site. One fixed 3D stage (a real anatomical body) with
 * chapters scrolling over it. Body chapters light muscles on the model;
 * app chapters dim the body and show real app screens instead.
 */
import "./style.css";

import { MUSCLE_DETAILS } from "@engine/anatomy.js";

import { LINKS } from "./config.js";
import { TA2 } from "./story.js";

const $ = (s) => document.querySelector(s);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const touch = matchMedia("(hover: none)").matches;

// ── Links (filled in config.js once the app is live) ─────────────────────
function enable(a, href, label) {
  a.href = href;
  a.textContent = label;
  a.removeAttribute("aria-disabled");
}
if (LINKS.apk) enable($("#apk-link"), LINKS.apk, "Download for Android");
if (LINKS.webApp) enable($("#webapp-link"), LINKS.webApp, "Open the web app");
if (LINKS.apkNote) $("#apk-note").textContent = LINKS.apkNote;
for (const a of document.querySelectorAll('[aria-disabled="true"]')) a.addEventListener("click", (e) => e.preventDefault());
$("#year").textContent = new Date().getFullYear();
if (touch) $("#hint").textContent = "Tap any muscle to name it";

// TA2 id → the app's plain-language group, for the hover label.
const GROUP_OF = {};
for (const [id, list] of Object.entries(TA2)) for (const t of list) GROUP_OF[t] = MUSCLE_DETAILS[id]?.[1];

// ── Chapters ─────────────────────────────────────────────────────────────
const chapters = [...document.querySelectorAll(".chapter")];
let stage = null;
let active = null;
function activate(ch) {
  if (ch === active) return;
  active = ch;
  stage?.setState(ch.dataset.state);
  document.body.dataset.stage = ch.dataset.stage ?? "on";
  $("#ci-num").textContent = ch.dataset.num;
  $("#ci-name").textContent = ch.dataset.name;
  $("#hud-ch").textContent = `ch.${ch.dataset.num} — ${ch.dataset.name.toLowerCase()}`;
}
// The chapter covering the middle of the screen is the active one.
function pickActive() {
  const mid = innerHeight / 2;
  const hit = chapters.find((ch) => {
    const r = ch.getBoundingClientRect();
    return r.top <= mid && r.bottom > mid;
  });
  activate(hit ?? (scrollY < 10 ? chapters[0] : chapters.at(-1)));
}

// Method chapter is pinned; its table fills in one week per third of the scroll.
const method = $("#method");
const sessions = $("#sessions");
function onScroll() {
  pickActive();
  const max = document.documentElement.scrollHeight - innerHeight;
  const k = max > 0 ? scrollY / max : 0;
  $("#scroll-bar").style.transform = `scaleX(${k})`;
  document.body.classList.toggle("at-end", k > 0.97); // the HUD would sit on the footer
  $("#hud-scroll").textContent = `scroll ${String(Math.round(k * 100)).padStart(3, "0")}%`;
  const r = method.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
  sessions.dataset.week = reducedMotion ? 3 : 1 + Math.min(2, Math.floor(p * 3.2));
}
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);

const reveal = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.2 });
chapters.forEach((c) => reveal.observe(c));

// Numbers count up the first time they come into view.
const counter = new IntersectionObserver(
  (es) => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      counter.unobserve(e.target);
      const el = e.target;
      const to = +el.dataset.count;
      if (reducedMotion) continue;
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 1400);
        el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      };
      el.textContent = "0";
      requestAnimationFrame(step);
    }
  },
  { threshold: 0.6 },
);
document.querySelectorAll("[data-count]").forEach((el) => counter.observe(el));

// ── Stage ────────────────────────────────────────────────────────────────
const tooltip = $("#tooltip");
const word = $("#activity-word");
// The body cycles highlight sets; the active chapter's tags (and big word) follow.
function cycleTags(i) {
  const list = active?.querySelector(".tags[data-cycle], #activity-tags");
  if (!list) return;
  const items = [...list.children];
  items.forEach((li, k) => li.classList.toggle("on", k === i % items.length));
  if (list.id === "activity-tags") {
    word.classList.remove("swap");
    void word.offsetWidth;
    word.textContent = items[i % items.length].textContent;
    word.classList.add("swap");
  }
}
(async () => {
  const { mountBody, webglAvailable } = await import("./body3d.js");
  if (!webglAvailable()) {
    document.body.classList.add("no-webgl");
    $("#loader").classList.add("done");
    return;
  }
  stage = mountBody({
    canvas: $("#stage"),
    reducedMotion,
    onProgress: (p) => {
      $("#loader-pct").textContent = `${p}%`;
      $("#loader-bar").style.width = `${p}%`;
    },
    onReady: () => {
      $("#loader").classList.add("done");
      document.body.classList.add("ready");
    },
    onCycle: cycleTags,
    onHover: (h) => {
      if (!h) return (tooltip.hidden = true);
      tooltip.hidden = false;
      tooltip.innerHTML = `<b>${h.name}</b>${GROUP_OF[h.ta2] ? `<span>${GROUP_OF[h.ta2]}</span>` : ""}`;
      tooltip.style.left = `${Math.min(h.x, innerWidth - 220)}px`;
      tooltip.style.top = `${h.y}px`;
    },
  });
  active = null;
  onScroll();
  // HUD camera readout, a few times a second.
  const pad = (n, w) => String(Math.round(n)).padStart(w, "0");
  setInterval(() => {
    const v = stage.view();
    $("#hud-cam").textContent = `az ${pad(v.az, 3)}° · el ${pad(v.el, 2)}° · ${v.dist.toFixed(1)}m`;
  }, 250);
})();
onScroll();
