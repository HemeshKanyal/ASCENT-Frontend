/**
 * GPS track maths for recorded activities. Pure functions so they're testable.
 * A point is { lat, lon, t (ms), alt?, acc? (metres) }.
 */

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Should this new point be kept? Rejects poor fixes and teleport jumps.
 * @param {object} prev last accepted point (or null)
 * @param {object} next candidate
 * @param {number} maxSpeed metres/second ceiling for the activity
 */
export function acceptPoint(prev, next, maxSpeed = 12) {
  if (next.acc != null && next.acc > 30) return false;
  if (!prev) return true;
  const dt = (next.t - prev.t) / 1000;
  if (dt <= 0) return false;
  const d = haversine(prev, next);
  if (d / dt > maxSpeed * 1.5) return false;
  return true;
}

/**
 * Stats for a list of segments (each a list of points; a new segment starts after a pause).
 * Moving time ignores pauses between segments and gaps where you were standing still.
 */
export function trackStats(segments, { splitMeters = 1000 } = {}) {
  let distance = 0;
  let moving = 0;
  let gain = 0;
  const splits = [];
  let splitStartTime = null;
  let splitStartMoving = 0;
  let nextSplit = splitMeters;

  for (const seg of segments) {
    let altRef = seg[0]?.alt;
    for (let i = 1; i < seg.length; i++) {
      const a = seg[i - 1];
      const b = seg[i];
      const d = haversine(a, b);
      const dt = (b.t - a.t) / 1000;
      if (splitStartTime == null) splitStartTime = a.t;
      // Standing still (< 0.3 m/s) doesn't count as moving time.
      if (dt > 0 && d / dt >= 0.3) moving += dt;
      distance += d;
      if (b.alt != null && altRef != null) {
        // Only count climbs beyond GPS altitude noise.
        if (b.alt - altRef >= 3) {
          gain += b.alt - altRef;
          altRef = b.alt;
        } else if (b.alt < altRef) altRef = b.alt;
      }
      while (distance >= nextSplit) {
        splits.push({ km: splits.length + 1, seconds: Math.round(moving - splitStartMoving) });
        splitStartMoving = moving;
        nextSplit += splitMeters;
      }
    }
  }

  const all = segments.flat();
  const elapsed = all.length > 1 ? (all[all.length - 1].t - all[0].t) / 1000 : 0;
  return {
    distance: Math.round(distance),
    movingSeconds: Math.round(moving),
    elapsedSeconds: Math.round(elapsed),
    paceSecPerKm: distance > 50 ? Math.round(moving / (distance / 1000)) : null,
    speedKmh: moving > 0 ? Math.round((distance / moving) * 3.6 * 10) / 10 : 0,
    elevationGain: Math.round(gain),
    splits,
  };
}

/** Pace over the last `windowSeconds` (for the live display). */
export function currentPace(points, windowSeconds = 30) {
  if (points.length < 2) return null;
  const end = points[points.length - 1];
  let d = 0;
  let i = points.length - 1;
  while (i > 0 && (end.t - points[i - 1].t) / 1000 <= windowSeconds) {
    d += haversine(points[i - 1], points[i]);
    i--;
  }
  const dt = (end.t - points[i].t) / 1000;
  if (d < 10 || dt <= 0) return null;
  return Math.round(dt / (d / 1000));
}

/** Thin a long track for storage and drawing (keeps shape, drops near-duplicates). */
export function simplify(points, minMeters = 5) {
  if (points.length < 3) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    if (haversine(out[out.length - 1], points[i]) >= minMeters) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}

export const formatPace = (sec) => (sec == null ? "–:––" : `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`);

/** Normalise a route into an SVG viewbox (for drawing without a map). */
export function projectRoute(points, width, height, pad = 8) {
  if (!points.length) return [];
  const lat0 = rad(points.reduce((s, p) => s + p.lat, 0) / points.length);
  const xs = points.map((p) => p.lon * Math.cos(lat0));
  const ys = points.map((p) => p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY) || 1e-9;
  const scale = Math.min((width - 2 * pad) / span, (height - 2 * pad) / span);
  const offX = (width - (maxX - minX) * scale) / 2;
  const offY = (height - (maxY - minY) * scale) / 2;
  return points.map((p, i) => [offX + (xs[i] - minX) * scale, height - (offY + (ys[i] - minY) * scale)]);
}

/**
 * Privacy trim for sharing: drop the first and last `meters` of the whole route
 * so friends can't see where you live or work. Returns [] if nothing is left.
 */
export function hideRouteEnds(segments, meters = 200) {
  const flat = segments.flatMap((seg, s) => seg.map((p) => ({ p, s })));
  if (flat.length < 2 || meters <= 0) return segments;
  const along = [0];
  for (let i = 1; i < flat.length; i++) along.push(along[i - 1] + (flat[i].s === flat[i - 1].s ? haversine(flat[i - 1].p, flat[i].p) : 0));
  const total = along[along.length - 1];
  if (total <= meters * 2) return [];
  const out = [];
  for (let i = 0; i < flat.length; i++) {
    if (along[i] < meters || along[i] > total - meters) continue;
    const seg = (out[flat[i].s] ??= []);
    seg.push(flat[i].p);
  }
  return out.filter((seg) => seg && seg.length > 1);
}
