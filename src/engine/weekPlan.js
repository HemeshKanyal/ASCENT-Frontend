/**
 * Weekly planner: decides what each training day is for.
 *
 * Inputs are already-derived intentions (the app maps goals → these):
 *  - focus: "strength" | "endurance" | "hybrid" | "mobility"  (the main goal's category)
 *  - disciplines: endurance disciplines wanted, main one first ("run", "bike", "swim", "hyrox", "conditioning")
 *  - conditioningStyle: "metcon" | "sprints" | "rounds" for conditioning
 *  - mobilityStyle: "mobility" | "yoga" | "pilates" | null
 *
 * Principles: keep ~2 strength days even for endurance athletes (injury
 * resilience), mostly easy endurance with 1–2 hard days, one long session on
 * the weekend, and never two hard endurance days back to back when avoidable.
 */

const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function counts({ focus, days, disciplines, mobilityStyle }) {
  const n = days;
  const hasEndurance = disciplines.length > 0;
  let strength;
  let endurance = 0;
  let mobility = 0;

  if (focus === "endurance") {
    strength = n <= 1 ? 0 : n <= 2 ? 1 : 2;
    endurance = n - strength;
    if (mobilityStyle && n >= 5) {
      mobility = 1;
      endurance -= 1;
    }
  } else if (focus === "hybrid") {
    strength = n <= 1 ? 0 : Math.ceil(n / 2);
    endurance = n - strength;
  } else if (focus === "mobility") {
    strength = n >= 5 ? 2 : n >= 3 ? 1 : 0;
    endurance = hasEndurance && n >= 3 ? 1 : 0;
    mobility = n - strength - endurance;
  } else {
    // Strength first; endurance and mobility fit around it.
    endurance = hasEndurance ? (n >= 5 ? 2 : n >= 3 ? 1 : 0) : 0;
    mobility = mobilityStyle && n >= 5 ? 1 : 0;
    strength = n - endurance - mobility;
  }
  if (!hasEndurance) {
    strength += endurance;
    endurance = 0;
  }
  return { strength: Math.max(0, strength), endurance: Math.max(0, endurance), mobility };
}

/** Session types for one discipline given how many sessions it gets this week. */
function typesFor(discipline, k, level, weekIndex, conditioningStyle) {
  if (k <= 0) return [];
  if (discipline === "conditioning") return Array.from({ length: k }, () => conditioningStyle ?? "metcon");
  if (discipline === "hyrox") return ["compromised", "stations", "engine"].slice(0, k).concat(Array(Math.max(0, k - 3)).fill("engine"));

  const quality = discipline === "swim" ? "intervals" : weekIndex % 2 === 0 ? "intervals" : "tempo";
  const easy = discipline === "swim" ? "technique" : "easy";
  const beginner = level === "beginner";

  if (k === 1) return [beginner ? easy : weekIndex % 2 === 0 ? quality : "long"];
  if (k === 2) return [beginner ? easy : quality, "long"];
  if (k === 3) return [beginner ? easy : quality, easy, "long"];
  const hardCount = level === "advanced" ? 2 : 1;
  const second = weekIndex % 2 === 0 ? "tempo" : "intervals";
  return [quality, ...(hardCount === 2 ? [second] : []), ...Array(k - hardCount - 1).fill(easy), "long"];
}

/**
 * @returns {{ [weekday]: { kind: "strength"|"endurance"|"mobility", discipline?, type?, style? } }}
 */
export function planWeek({
  trainingDays,
  focus = "strength",
  disciplines = [],
  conditioningStyle,
  mobilityStyle = null,
  level = "beginner",
  weekIndex = 0,
  deload = false,
  triathlon = false,
}) {
  const days = WEEK.filter((d) => trainingDays.includes(d));
  const n = days.length;
  const c = counts({ focus, days: n, disciplines, mobilityStyle });

  // Spread endurance sessions over disciplines, main one first.
  const perDiscipline = Object.fromEntries(disciplines.map((d) => [d, 0]));
  for (let i = 0; i < c.endurance; i++) perDiscipline[disciplines[i % disciplines.length]]++;

  const endurance = [];
  for (const d of disciplines) {
    for (const type of typesFor(d, perDiscipline[d], level, weekIndex, conditioningStyle)) {
      endurance.push({ kind: "endurance", discipline: d, type: deload ? (type === "long" ? "long" : d === "swim" ? "technique" : d === "hyrox" || d === "conditioning" ? type : "easy") : type });
    }
  }
  // Triathletes: every other week the long ride becomes a bike→run brick.
  if (triathlon && !deload && weekIndex % 2 === 1) {
    const longRide = endurance.find((s) => s.discipline === "bike" && s.type === "long");
    if (longRide) longRide.type = "brick";
  }

  const strength = Array.from({ length: c.strength }, () => ({ kind: "strength" }));
  const mobility = Array.from({ length: c.mobility }, () => ({ kind: "mobility", style: mobilityStyle ?? "mobility" }));

  const plan = {};
  const free = [...days];
  const take = (day, session) => {
    plan[day] = session;
    free.splice(free.indexOf(day), 1);
  };

  // Long sessions go on the weekend (or the last training day).
  const weekend = free.filter((d) => d === "sat" || d === "sun");
  for (const s of endurance.filter((e) => e.type === "long" || e.type === "brick")) {
    const day = weekend.find((d) => free.includes(d)) ?? free[free.length - 1];
    if (day) take(day, s);
  }

  const remainingEndurance = endurance.filter((e) => !Object.values(plan).includes(e));
  const hard = remainingEndurance.filter((e) => ["intervals", "tempo", "compromised", "stations", "engine", "metcon", "sprints", "rounds"].includes(e.type));
  const easy = remainingEndurance.filter((e) => !hard.includes(e));

  // Interleave: strength, hard, strength, easy, ... so hard endurance days are separated.
  const queue = [];
  const s = [...strength];
  const h = [...hard];
  const e = [...easy];
  const m = [...mobility];
  while (s.length || h.length || e.length || m.length) {
    if (s.length) queue.push(s.shift());
    if (h.length) queue.push(h.shift());
    if (s.length) queue.push(s.shift());
    if (e.length) queue.push(e.shift());
    if (m.length) queue.push(m.shift());
  }
  for (const day of [...free]) {
    const next = queue.shift();
    if (next) take(day, next);
  }
  return plan;
}
