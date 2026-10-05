/**
 * Local reminders (no server, no push account). Workout and streak reminders are
 * one-off notifications for the next 7 days, rebuilt whenever Today loads, so they
 * can name the planned session and skip days you've already trained. Everything
 * with fixed text (meals, water, supplements, weigh-in) repeats on its own.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

import type { PlannedDay, Streaks } from "../engine";
import { dayLabel } from "../ui/sessionMeta";
import { WEEKDAYS, type Weekday } from "./trainingStore";

// Expo Go on Android throws as soon as expo-notifications is imported (SDK 53+),
// so it's loaded lazily and only where it works: iOS Expo Go and real builds.
const ANDROID_EXPO_GO = Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const REMINDERS_SUPPORTED = Platform.OS !== "web" && !ANDROID_EXPO_GO;
export const REMINDERS_UNAVAILABLE_TEXT = ANDROID_EXPO_GO
  ? "Reminders on Android need the installed ASCENT app — Expo Go for Android can't schedule them. They work in Expo Go on iPhone."
  : "Reminders work in the phone app. Your choices here are saved and apply on your phone.";

type NotificationsModule = typeof import("expo-notifications");
let mod: NotificationsModule | null = null;
function N(): NotificationsModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod ??= require("expo-notifications") as NotificationsModule;
  return mod;
}

export type Reminders = {
  workout: { on: boolean; time: string };
  streak: { on: boolean; time: string };
  meals: { on: boolean; breakfast: string; lunch: string; dinner: string };
  water: { on: boolean; from: string; to: string; everyHours: number };
  supplements: { on: boolean; time: string };
  weighIn: { on: boolean; day: Weekday; time: string };
};

export const DEFAULT_REMINDERS: Reminders = {
  workout: { on: true, time: "07:00" },
  streak: { on: true, time: "20:00" },
  meals: { on: false, breakfast: "09:00", lunch: "13:30", dinner: "20:30" },
  water: { on: false, from: "10:00", to: "20:00", everyHours: 2 },
  supplements: { on: false, time: "09:30" },
  weighIn: { on: false, day: "mon", time: "07:30" },
};

const KEY = "REMINDERS";

export async function getReminders(): Promise<Reminders> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<Reminders>) : {};
    return Object.fromEntries(
      Object.entries(DEFAULT_REMINDERS).map(([k, v]) => [k, { ...v, ...(saved[k as keyof Reminders] ?? {}) }])
    ) as Reminders;
  } catch {
    return DEFAULT_REMINDERS;
  }
}

export const saveReminders = (r: Reminders) => AsyncStorage.setItem(KEY, JSON.stringify(r));

const hm = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return { hour: h || 0, minute: m || 0 };
};

let handlerSet = false;
function ensureHandler() {
  if (handlerSet || !REMINDERS_SUPPORTED) return;
  handlerSet = true;
  N().setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function permissionStatus(): Promise<"granted" | "denied" | "undetermined" | "unsupported"> {
  if (!REMINDERS_SUPPORTED) return "unsupported";
  return (await N().getPermissionsAsync()).status;
}

export async function requestPermission() {
  if (!REMINDERS_SUPPORTED) return false;
  ensureHandler();
  if (Platform.OS === "android") {
    await N().setNotificationChannelAsync("reminders", { name: "Reminders", importance: N().AndroidImportance.DEFAULT });
  }
  const { status } = await N().requestPermissionsAsync();
  return status === "granted";
}

type Context = { weekPlan: Record<string, PlannedDay>; trainingDays: Weekday[]; streaks?: Streaks | null; doneToday: boolean };

/** Rebuild every scheduled reminder from settings + this week's plan. Safe to call often. */
export async function syncReminders(ctx: Context) {
  if (!REMINDERS_SUPPORTED) return;
  ensureHandler();
  if ((await N().getPermissionsAsync()).status !== "granted") return;
  const r = await getReminders();
  await N().cancelAllScheduledNotificationsAsync();
  const channelId = Platform.OS === "android" ? "reminders" : undefined;
  const now = new Date();
  const jobs: Promise<string>[] = [];
  const at = (title: string, body: string, date: Date, url: string) =>
    jobs.push(
      N().scheduleNotificationAsync({
        content: { title, body, data: { url } },
        trigger: { type: N().SchedulableTriggerInputTypes.DATE, date, channelId },
      })
    );
  const daily = (title: string, body: string, time: string, url: string) =>
    jobs.push(
      N().scheduleNotificationAsync({
        content: { title, body, data: { url } },
        trigger: { type: N().SchedulableTriggerInputTypes.DAILY, ...hm(time), channelId },
      })
    );

  const streak = ctx.streaks?.plan.current ?? 0;
  for (let i = 0; i < 7; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const wd = WEEKDAYS[(day.getDay() + 6) % 7].id;
    if (!ctx.trainingDays.includes(wd)) continue;
    if (i === 0 && ctx.doneToday) continue;
    // Days in this Mon–Sun week use the real plan; next week's just say "training day".
    const planned = i < 7 - ((now.getDay() + 6) % 7) ? ctx.weekPlan[wd] : undefined;
    const what = planned ? dayLabel(planned) : "Training";

    if (r.workout.on) {
      const when = new Date(day);
      when.setHours(hm(r.workout.time).hour, hm(r.workout.time).minute, 0, 0);
      if (when > now) at(`${what} today`, "Your session is ready — open ASCENT to start.", when, "/");
    }
    if (r.streak.on) {
      const when = new Date(day);
      when.setHours(hm(r.streak.time).hour, hm(r.streak.time).minute, 0, 0);
      // Logging anything opens the app, which re-syncs and drops that day's reminder.
      if (when > now) {
        if (i === 0 && streak > 0) at("Keep your streak alive", `${streak} days on plan. Even 15 minutes counts today.`, when, "/");
        else at(`${what} still on the plan`, "Still time today — even 15 minutes keeps your streak going.", when, "/");
      }
    }
  }

  if (r.meals.on) {
    daily("Breakfast?", "Snap your plate — ASCENT estimates the rest.", r.meals.breakfast, "/fuel");
    daily("Log lunch", "A quick photo keeps your protein on track.", r.meals.lunch, "/fuel");
    daily("Log dinner", "Last meal of the day — snap it before you eat.", r.meals.dinner, "/fuel");
  }
  if (r.water.on) {
    const from = hm(r.water.from).hour;
    const to = hm(r.water.to).hour;
    for (let h = from; h <= to; h += Math.max(1, r.water.everyHours)) {
      daily("Water break", "Have a glass of water and tap +250 ml.", `${h}:00`, "/fuel");
    }
  }
  if (r.supplements.on) daily("Supplements", "Time for your stack — tap to tick it off.", r.supplements.time, "/supplements");
  if (r.weighIn.on) {
    const wd = WEEKDAYS.findIndex((d) => d.id === r.weighIn.day); // 0 = Monday
    jobs.push(
      N().scheduleNotificationAsync({
        content: { title: "Weekly weigh-in", body: "Same time, same scale, before breakfast.", data: { url: "/fuel" } },
        trigger: { type: N().SchedulableTriggerInputTypes.WEEKLY, weekday: ((wd + 1) % 7) + 1, ...hm(r.weighIn.time), channelId },
      })
    );
  }
  await Promise.all(jobs);
}

/** Open the screen a tapped reminder points to. */
export function onReminderTap(open: (url: string) => void) {
  if (!REMINDERS_SUPPORTED) return () => {};
  const sub = N().addNotificationResponseReceivedListener((res) => {
    const url = res.notification.request.content.data?.url;
    if (typeof url === "string") open(url);
  });
  return () => sub.remove();
}

export async function sendTestReminder() {
  if (!REMINDERS_SUPPORTED) return;
  ensureHandler();
  await N().scheduleNotificationAsync({
    content: { title: "Reminders are on", body: "This is what an ASCENT reminder looks like.", data: { url: "/reminders" } },
    trigger: { type: N().SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: Platform.OS === "android" ? "reminders" : undefined },
  });
}
