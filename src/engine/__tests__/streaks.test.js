import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { achievements, localDayKey, streaks } from "../index.js";

// Wednesday 15 Oct 2025, midday local time.
const NOW = new Date(2025, 9, 15, 12);
const at = (daysAgo, hour = 18, extra = {}) => ({ date: new Date(2025, 9, 15 - daysAgo, hour).toISOString(), exercises: [], ...extra });
const MWF = ["mon", "wed", "fri"];

describe("streaks", () => {
  it("planned rest days don't break the plan streak, skipped training days do", () => {
    // Fri 10, Mon 13 trained; Sat/Sun/Tue are rest days; today (Wed) not done yet.
    const s = streaks([at(5), at(2)], { trainingDays: MWF, weeklyGoal: 3, now: NOW });
    assert.equal(s.plan.current, 5); // Fri..Tue
    assert.equal(s.atRisk, true);
    assert.equal(s.doneToday, false);

    // Skipping Monday breaks it: only Fri..Sun remain, and the chain ended.
    const broken = streaks([at(5)], { trainingDays: MWF, now: NOW });
    assert.equal(broken.plan.current, 0);
    assert.equal(broken.plan.best, 3);
  });

  it("today counts once you've trained", () => {
    const s = streaks([at(2), at(0)], { trainingDays: MWF, now: NOW });
    assert.equal(s.plan.current, 3);
    assert.equal(s.atRisk, false);
    assert.equal(s.doneToday, true);
  });

  it("week streak counts weeks that hit the goal, and an unfinished week doesn't break it", () => {
    // Two full weeks of 3 sessions before this week; this week has 1 so far.
    const sessions = [at(15), at(13), at(11), at(8), at(6), at(4), at(2)];
    const s = streaks(sessions, { trainingDays: MWF, weeklyGoal: 3, now: NOW });
    assert.equal(s.week.current, 2);
    assert.equal(s.week.thisWeek, 1);
    assert.equal(s.week.met, false);
    const met = streaks([...sessions, at(1), at(0)], { trainingDays: MWF, weeklyGoal: 3, now: NOW });
    assert.equal(met.week.current, 3);
  });

  it("food streak counts consecutive logged days, today pending", () => {
    const days = [3, 2, 1].map((n) => localDayKey(new Date(2025, 9, 15 - n)));
    assert.deepEqual(streaks([], { foodDays: days, now: NOW }).food, { current: 3, best: 3 });
    const gap = [5, 4, 2, 1].map((n) => localDayKey(new Date(2025, 9, 15 - n)));
    assert.deepEqual(streaks([], { foodDays: gap, now: NOW }).food, { current: 2, best: 2 });
  });

  it("is empty for a new user", () => {
    const s = streaks([], { trainingDays: MWF, now: NOW });
    assert.equal(s.plan.current, 0);
    assert.equal(s.week.current, 0);
    assert.equal(s.atRisk, false);
  });
});

describe("achievements", () => {
  it("unlocks milestones on the session that crossed them", () => {
    const sessions = [
      at(10, 6, { kind: "endurance", activity: "run", discipline: "run", distanceKm: 4.2 }),
      at(5, 18, { kind: "endurance", activity: "run", discipline: "run", distanceKm: 10.3 }),
      at(1, 18, { kind: "strength", exercises: [{ sets: [{ reps: 10, weight: 100 }, { reps: 8, weight: 100 }] }] }),
    ];
    const list = achievements(sessions, { now: NOW });
    const by = Object.fromEntries(list.map((a) => [a.id, a]));
    assert.equal(by.first.earnedAt, sessions[0].date);
    assert.equal(by.r5k.earnedAt, sessions[1].date);
    assert.equal(by.r10k.earnedAt, sessions[1].date);
    assert.equal(by.rhalf.earnedAt, null);
    assert.ok(Math.abs(by.rhalf.progress - 10.3 / 21.1) < 1e-9);
    assert.equal(by.early.earnedAt, sessions[0].date);
    assert.equal(by.t10.value, 1800);
  });

  it("keeps earlier unlock dates that were saved", () => {
    const list = achievements([], { earned: { first: "2024-01-01T00:00:00.000Z" }, now: NOW });
    assert.equal(list.find((a) => a.id === "first").earnedAt, "2024-01-01T00:00:00.000Z");
  });
});
