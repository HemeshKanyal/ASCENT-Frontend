/**
 * Streaks and badges for the app: wraps the engine with stored data and
 * remembers when each badge was first earned so new ones can be celebrated.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { achievements, streaks, type Achievement, type Streaks } from "../engine";
import { loggedFoodDays } from "./nutritionStore";
import { getProfile, getSessions } from "./trainingStore";

const EARNED_KEY = "ACHIEVEMENTS_EARNED";
const SEEN_KEY = "ACHIEVEMENTS_SEEN";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export type Progress = { streaks: Streaks; badges: Achievement[]; fresh: Achievement[] };

export async function loadProgress(): Promise<Progress | null> {
  const [profile, sessions, foodDays, earned, seen] = await Promise.all([
    getProfile(),
    getSessions(),
    loggedFoodDays(),
    readJson<Record<string, string>>(EARNED_KEY, {}),
    readJson<string[] | null>(SEEN_KEY, null),
  ]);
  if (!profile) return null;
  const opts = { trainingDays: profile.trainingDays, weeklyGoal: profile.trainingDays.length || profile.daysPerWeek, foodDays };
  const badges = achievements(sessions, { ...opts, earned });

  // Persist unlock dates so streak badges keep the day they were earned.
  const nextEarned = { ...earned };
  for (const b of badges) if (b.earnedAt && !nextEarned[b.id]) nextEarned[b.id] = b.earnedAt;
  if (Object.keys(nextEarned).length !== Object.keys(earned).length) await AsyncStorage.setItem(EARNED_KEY, JSON.stringify(nextEarned));

  // First run: everything already earned counts as seen, so nobody gets 10 popups at once.
  const unlocked = badges.filter((b) => b.earnedAt);
  if (seen === null) await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(unlocked.map((b) => b.id)));
  const fresh = seen === null ? [] : unlocked.filter((b) => !seen.includes(b.id));

  return { streaks: streaks(sessions, opts), badges, fresh };
}

export async function markBadgesSeen(ids: string[]) {
  const seen = await readJson<string[]>(SEEN_KEY, []);
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...seen, ...ids])]));
}

export const resetStreakData = () => AsyncStorage.multiRemove([EARNED_KEY, SEEN_KEY]);
