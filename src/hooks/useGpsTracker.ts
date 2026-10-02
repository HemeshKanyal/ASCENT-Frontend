/**
 * Live GPS recording: segments (split on pause), filtered points, stats,
 * a km-split buzz and a crash-safe draft in storage.
 *
 * Expo Go records while the app is open (the record screen keeps the screen
 * awake). Background recording with the phone locked needs a development build.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

import { acceptPoint, currentPace, trackStats, type GpsPoint, type TrackStats } from "../engine";

export type TrackerStatus = "idle" | "recording" | "paused";

const DRAFT_KEY = "RECORDING_DRAFT";

export type Draft = { activityId: string; segments: GpsPoint[][]; startedAt: number; pausedMs: number };

export async function getDraft(): Promise<Draft | null> {
  const raw = await AsyncStorage.getItem(DRAFT_KEY);
  return raw ? (JSON.parse(raw) as Draft) : null;
}
export const clearDraft = () => AsyncStorage.removeItem(DRAFT_KEY);

const EMPTY: TrackStats = { distance: 0, movingSeconds: 0, elapsedSeconds: 0, paceSecPerKm: null, speedKmh: 0, elevationGain: 0, splits: [] };

export function useGpsTracker({ activityId, maxSpeed = 12, useGps = true }: { activityId: string; maxSpeed?: number; useGps?: boolean }) {
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [segments, setSegments] = useState<GpsPoint[][]>([]);
  const [stats, setStats] = useState<TrackStats>(EMPTY);
  const [pace, setPace] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const segRef = useRef<GpsPoint[][]>([]);
  const sub = useRef<Location.LocationSubscription | null>(null);
  const startedAt = useRef<number | null>(null);
  const pausedMs = useRef(0);
  const pausedAt = useRef<number | null>(null);
  const splitsSeen = useRef(0);
  const lastDraft = useRef(0);

  // Wall-clock timer that excludes paused time.
  useEffect(() => {
    if (status !== "recording") return;
    const id = setInterval(() => {
      if (startedAt.current) setElapsed(Math.round((Date.now() - startedAt.current - pausedMs.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [status]);

  const persist = useCallback(async (force = false) => {
    if (!startedAt.current) return;
    if (!force && Date.now() - lastDraft.current < 5000) return;
    lastDraft.current = Date.now();
    const draft: Draft = { activityId, segments: segRef.current, startedAt: startedAt.current, pausedMs: pausedMs.current };
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [activityId]);

  const onLocation = useCallback(
    (loc: Location.LocationObject) => {
      setAccuracy(loc.coords.accuracy ?? null);
      const p: GpsPoint = { lat: loc.coords.latitude, lon: loc.coords.longitude, t: loc.timestamp, alt: loc.coords.altitude, acc: loc.coords.accuracy };
      const seg = segRef.current[segRef.current.length - 1];
      if (!seg) return;
      if (!acceptPoint(seg[seg.length - 1] ?? null, p, maxSpeed)) return;
      seg.push(p);
      const s = trackStats(segRef.current);
      setSegments([...segRef.current.map((x) => [...x])]);
      setStats(s);
      setPace(currentPace(seg));
      if (s.splits.length > splitsSeen.current) {
        splitsSeen.current = s.splits.length;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      persist();
    },
    [maxSpeed, persist]
  );

  const requestPermission = useCallback(async () => {
    if (!useGps) return true;
    const res = await Location.requestForegroundPermissionsAsync();
    setPermission(res.granted ? "granted" : "denied");
    return res.granted;
  }, [useGps]);

  const watch = useCallback(async () => {
    if (!useGps) return;
    sub.current?.remove();
    sub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 2 },
      onLocation
    );
  }, [onLocation, useGps]);

  const start = useCallback(async () => {
    if (useGps && !(await requestPermission())) return false;
    startedAt.current = Date.now();
    pausedMs.current = 0;
    segRef.current = [[]];
    splitsSeen.current = 0;
    setSegments([[]]);
    setStatus("recording");
    await watch();
    persist(true);
    return true;
  }, [persist, requestPermission, useGps, watch]);

  const pause = useCallback(() => {
    sub.current?.remove();
    sub.current = null;
    pausedAt.current = Date.now();
    setStatus("paused");
    persist(true);
  }, [persist]);

  const resume = useCallback(async () => {
    if (pausedAt.current) pausedMs.current += Date.now() - pausedAt.current;
    pausedAt.current = null;
    segRef.current.push([]);
    setStatus("recording");
    await watch();
  }, [watch]);

  /** Continue a recording that was interrupted (app closed or crashed). */
  const restore = useCallback((draft: Draft) => {
    segRef.current = draft.segments.length ? draft.segments : [[]];
    startedAt.current = draft.startedAt;
    pausedMs.current = draft.pausedMs;
    pausedAt.current = Date.now();
    const s = trackStats(segRef.current);
    splitsSeen.current = s.splits.length;
    setSegments(segRef.current);
    setStats(s);
    setElapsed(Math.round((Date.now() - draft.startedAt - draft.pausedMs) / 1000));
    setStatus("paused");
  }, []);

  const stop = useCallback(() => {
    sub.current?.remove();
    sub.current = null;
    if (pausedAt.current) pausedMs.current += Date.now() - pausedAt.current;
    pausedAt.current = null;
    setStatus("idle");
    return { segments: segRef.current, stats: trackStats(segRef.current), elapsedSeconds: elapsed };
  }, [elapsed]);

  // Warm up the GPS before Start so the first metres aren't lost.
  useEffect(() => {
    if (!useGps) return;
    let warm: Location.LocationSubscription | null = null;
    (async () => {
      const res = await Location.getForegroundPermissionsAsync();
      if (!res.granted) return;
      setPermission("granted");
      warm = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 2000 }, (l) => setAccuracy(l.coords.accuracy ?? null));
    })().catch(() => {});
    return () => warm?.remove();
  }, [useGps]);

  useEffect(() => () => sub.current?.remove(), []);

  return { status, permission, accuracy, segments, stats, pace, elapsed, start, pause, resume, stop, restore, requestPermission };
}
