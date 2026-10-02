import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ACTIVITIES, acceptPoint, hideRouteEnds, classifyActivity, typesFor, currentPace, formatPace, generateFlow, haversine, projectRoute, simplify, trackStats } from "../index.js";

// A straight line heading north: 1e-5° latitude ≈ 1.112 m.
const line = (meters, seconds, start = 0, t0 = 0, alt = () => 0) => {
  const n = Math.max(2, Math.round(seconds));
  return Array.from({ length: n + 1 }, (_, i) => ({
    lat: 51 + ((start + (meters * i) / n) / 111195),
    lon: 0,
    t: t0 + (seconds * 1000 * i) / n,
    alt: alt(i / n),
  }));
};

describe("gps", () => {
  it("measures distance", () => {
    const d = haversine({ lat: 51, lon: 0 }, { lat: 51.009, lon: 0 });
    assert.ok(Math.abs(d - 1000.8) < 2, String(d));
  });

  it("computes distance, moving time, pace and splits", () => {
    const s = trackStats([line(3005, 901.5)]); // just over 3 km at 5:00/km
    assert.ok(Math.abs(s.distance - 3005) < 5);
    assert.ok(Math.abs(s.paceSecPerKm - 300) <= 1);
    assert.equal(s.splits.length, 3);
    for (const sp of s.splits) assert.ok(Math.abs(sp.seconds - 300) <= 2);
  });

  it("ignores pauses between segments and standing still", () => {
    const a = line(1000, 300, 0, 0);
    const b = line(1000, 300, 1000, 900_000); // resumed 10 minutes later
    const s = trackStats([a, b]);
    assert.ok(Math.abs(s.movingSeconds - 600) < 3);
    const still = [{ lat: 51, lon: 0, t: 0 }, { lat: 51, lon: 0, t: 120000 }];
    assert.equal(trackStats([still]).movingSeconds, 0);
  });

  it("counts real climbs but not altitude noise", () => {
    const climb = trackStats([line(1000, 300, 0, 0, (f) => f * 50)]);
    assert.ok(Math.abs(climb.elevationGain - 50) <= 3);
    const noisy = trackStats([line(1000, 300, 0, 0, (f) => (Math.round(f * 300) % 2 ? 1.5 : 0))]);
    assert.equal(noisy.elevationGain, 0);
  });

  it("rejects bad fixes and teleports", () => {
    const p = { lat: 51, lon: 0, t: 0 };
    assert.equal(acceptPoint(null, { ...p, acc: 50 }), false);
    assert.equal(acceptPoint(p, { lat: 51.01, lon: 0, t: 1000 }, 9), false); // 1.1 km in 1 s
    assert.equal(acceptPoint(p, { lat: 51.00003, lon: 0, t: 1000 }, 9), true);
  });

  it("gives live pace from the last 30 seconds", () => {
    const pts = line(200, 60); // 200 m/min → 5:00/km
    assert.ok(Math.abs(currentPace(pts) - 300) <= 3);
    assert.equal(formatPace(305), "5:05");
  });

  it("simplifies and projects routes", () => {
    const pts = line(1000, 300);
    const s = simplify(pts, 20);
    assert.ok(s.length < pts.length && s.length > 10);
    const xy = projectRoute(s, 100, 100);
    for (const [x, y] of xy) assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100);
  });
});

describe("activities", () => {
  it("are well-formed and have usable warm-ups", () => {
    const ids = new Set();
    for (const act of ACTIVITIES) {
      assert.ok(!ids.has(act.id));
      ids.add(act.id);
      assert.ok(["gps", "laps", "time"].includes(act.record));
      if (act.record === "gps") assert.ok(act.maxSpeed, `${act.id} needs maxSpeed`);
      const f = generateFlow({ style: "warmup", minutes: 5, areas: act.warmup });
      assert.ok(f.steps.length > 0);
    }
  });
});


describe("classifying finished sessions", () => {
  const history = Array.from({ length: 6 }, () => ({ activity: "run", movingSeconds: 1800, paceSecPerKm: 360, type: "easy" }));
  const run = (o) => classifyActivity({ activity: "run", distanceKm: 5, movingSeconds: 1800, paceSecPerKm: 360, history, ...o });

  it("uses heart rate first", () => {
    assert.equal(run({ avgHr: 120, age: 30 }).type, "easy");
    assert.equal(run({ avgHr: 165, age: 30 }).type, "tempo");
  });
  it("falls back to effort, then pace vs usual", () => {
    assert.equal(run({ rpe: 3 }).type, "recovery");
    assert.equal(run({ rpe: 7 }).type, "tempo");
    assert.equal(run({ paceSecPerKm: 300 }).type, "tempo");
    assert.equal(run({ paceSecPerKm: 360 }).type, "easy");
  });
  it("spots intervals and long runs", () => {
    assert.equal(run({ splits: [240, 420, 240, 420].map((s, i) => ({ km: i + 1, seconds: s })) }).type, "intervals");
    assert.equal(run({ movingSeconds: 5400, distanceKm: 15 }).type, "long");
  });
  it("labels walks and hikes", () => {
    assert.equal(classifyActivity({ activity: "walk", distanceKm: 3, movingSeconds: 1800 }).type, "brisk");
    assert.equal(classifyActivity({ activity: "hike", distanceKm: 10, movingSeconds: 3 * 3600, elevationGain: 900 }).type, "hard");
  });
  it("gives sports training/match/casual types", () => {
    assert.deepEqual(typesFor("basketball").map((x) => x.id), ["training", "match", "casual"]);
  });
});

describe("route privacy", () => {
  // ~11 m per 0.0001° of latitude; 101 points ≈ 1.1 km straight north.
  const line = Array.from({ length: 101 }, (_, i) => ({ lat: 28.6 + i * 0.0001, lon: 77.2, t: i * 1000 }));

  it("drops the first and last stretch of the route", () => {
    const [seg] = hideRouteEnds([line], 200);
    assert.ok(seg[0].lat - line[0].lat > 0.0017, "start trimmed");
    assert.ok(line[100].lat - seg[seg.length - 1].lat > 0.0017, "end trimmed");
    assert.ok(seg.length > 50);
  });

  it("hides a route that's too short to trim", () => {
    assert.deepEqual(hideRouteEnds([line.slice(0, 20)], 200), []);
  });
});
