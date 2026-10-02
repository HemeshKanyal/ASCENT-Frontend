/**
 * Community (friends, feed, kudos, comments, clubs, leaderboards) — talks to
 * ASCENT-Backend. Everything else in the app stays offline-first; this is the
 * only part that needs an account and a server.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { File, UploadType } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { ACTIVITY_BY_ID, hideRouteEnds, localDayKey, type GpsPoint } from "../engine";
import { getRoute } from "./routeStore";
import { updateSession, type LoggedSession } from "./trainingStore";

// ── Server address ───────────────────────────────────────────────────────

/**
 * EXPO_PUBLIC_API_URL wins (set it once the backend is hosted). Otherwise use
 * the computer running Expo on port 5000 — works on the same Wi-Fi, not over --tunnel.
 */
export function apiUrl() {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, "");
  if (Platform.OS === "web" && typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:5000`;
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${host && !host.endsWith("exp.direct") ? host : "localhost"}:5000`;
}

// ── Session (token) ──────────────────────────────────────────────────────

const TOKEN = "ascent_token";
const ME = "COMMUNITY_ME";

export type PublicUser = { id: string; name: string; handle: string; bio?: string };
export type Me = PublicUser & { email: string; friendCode: string };

async function getToken() {
  if (Platform.OS === "web") return typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN) : null;
  return SecureStore.getItemAsync(TOKEN);
}

async function setToken(token: string | null) {
  if (Platform.OS === "web") {
    if (typeof localStorage === "undefined") return;
    if (token) localStorage.setItem(TOKEN, token);
    else localStorage.removeItem(TOKEN);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN, token);
  else await SecureStore.deleteItemAsync(TOKEN);
}

export async function cachedMe(): Promise<Me | null> {
  if (!(await getToken())) return null;
  const raw = await AsyncStorage.getItem(ME);
  return raw ? (JSON.parse(raw) as Me) : null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export const OFFLINE_TEXT = "Can't reach the ASCENT server. Check your connection, or that the backend is running.";

async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(OFFLINE_TEXT, 0);
  }
  if (res.status === 401 && token) {
    await signOut();
    throw new ApiError("Your session ended — please sign in again.", 401);
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.message ?? `Request failed (${res.status})`, res.status);
  return json as T;
}

/** Absolute URL for a signed media path from the server. */
export const mediaUrl = (path: string) => (path.startsWith("http") ? path : `${apiUrl()}${path}`);

// ── Account ──────────────────────────────────────────────────────────────

async function startSession(r: { token: string; user: Me }) {
  await setToken(r.token);
  await AsyncStorage.setItem(ME, JSON.stringify(r.user));
  return r.user;
}

export const signUp = (p: { name: string; email: string; password: string; handle?: string }) =>
  api<{ token: string; user: Me }>("/api/auth/signup", { method: "POST", body: p }).then(startSession);

export const signIn = (p: { email: string; password: string }) =>
  api<{ token: string; user: Me }>("/api/auth/login", { method: "POST", body: p }).then(startSession);

export async function refreshMe() {
  const { user } = await api<{ user: Me }>("/api/auth/me");
  await AsyncStorage.setItem(ME, JSON.stringify(user));
  return user;
}

export async function updateMe(p: { name?: string; bio?: string; handle?: string }) {
  const { user } = await api<{ user: Me }>("/api/auth/me", { method: "PATCH", body: p });
  await AsyncStorage.setItem(ME, JSON.stringify(user));
  return user;
}

export async function signOut() {
  await setToken(null);
  await AsyncStorage.removeItem(ME);
}

export async function deleteAccount() {
  await api("/api/auth/me", { method: "DELETE" });
  await signOut();
}

// ── Friends ──────────────────────────────────────────────────────────────

export type FriendRow = { id: string; user: PublicUser; since: string };
export type Friends = { friends: FriendRow[]; incoming: FriendRow[]; outgoing: FriendRow[] };

export const getFriends = () => api<Friends>("/api/friends");
export const addFriend = (code: string) => api<{ status: "pending" | "accepted"; user: PublicUser }>("/api/friends/request", { method: "POST", body: { code } });
export const acceptFriend = (id: string) => api(`/api/friends/${id}/accept`, { method: "POST" });
export const removeFriend = (id: string) => api(`/api/friends/${id}`, { method: "DELETE" });

// ── Posts & feed ─────────────────────────────────────────────────────────

export type PostMedia = { type: "image" | "video"; url: string; width?: number; height?: number; durationMs?: number };
export type Post = {
  id: string;
  clientId: string;
  owner: PublicUser;
  mine: boolean;
  date: string;
  kind?: string;
  activity?: string;
  title?: string;
  caption: string;
  stats: {
    distanceKm?: number;
    movingSeconds?: number;
    durationMinutes?: number;
    paceSecPerKm?: number;
    speedKmh?: number;
    elevationGain?: number;
    calories?: number;
    sets?: number;
    volumeKg?: number;
  };
  exercises: { name: string; sets: number; best?: string }[];
  route: [number, number][][] | null;
  media: PostMedia[];
  visibility: "friends" | "private";
  clubs: string[];
  kudosCount: number;
  kudoed: boolean;
  commentCount: number;
};
export type Page = { posts: Post[]; next: string | null };

const q = (before?: string | null) => (before ? `?before=${encodeURIComponent(before)}` : "");
export const getFeed = (before?: string | null) => api<Page>(`/api/feed${q(before)}`);
export const getUserPosts = (userId: string, before?: string | null) => api<Page>(`/api/feed/user/${userId}${q(before)}`);
export const getClubFeed = (clubId: string, before?: string | null) => api<Page>(`/api/feed/club/${clubId}${q(before)}`);
export const getPost = (id: string) => api<{ post: Post; kudos: PublicUser[] }>(`/api/posts/${id}`);
export const updatePost = (id: string, p: { caption?: string; title?: string; visibility?: "friends" | "private"; clubs?: string[] }) =>
  api<{ post: Post }>(`/api/posts/${id}`, { method: "PATCH", body: p });

export async function deletePost(id: string, clientId?: string) {
  await api(`/api/posts/${id}`, { method: "DELETE" });
  if (clientId) await updateSession(clientId, { postId: undefined });
}

export const giveKudos = (id: string, on: boolean) => api<{ kudosCount: number; kudoed: boolean }>(`/api/posts/${id}/kudos`, { method: on ? "POST" : "DELETE" });

export type Comment = { id: string; text: string; date: string; author: PublicUser; mine: boolean };
export const getComments = (id: string) => api<{ comments: Comment[] }>(`/api/posts/${id}/comments`);
export const addComment = (id: string, text: string) => api<{ comment: Comment }>(`/api/posts/${id}/comments`, { method: "POST", body: { text } });
export const deleteComment = (id: string, commentId: string) => api(`/api/posts/${id}/comments/${commentId}`, { method: "DELETE" });

/** Turn a logged session into a post (route trimmed for privacy) and upload its media. */
export async function shareSession(
  s: LoggedSession,
  opts: { caption: string; visibility: "friends" | "private"; clubs: string[]; hideEnds: boolean; includeRoute: boolean; mediaUris: string[] },
  onProgress?: (text: string) => void
) {
  let route: [number, number][][] | null = null;
  if (opts.includeRoute && s.hasRoute) {
    let segments: GpsPoint[][] = await getRoute(s.id);
    if (opts.hideEnds) segments = hideRouteEnds(segments, 200);
    route = segments.map((seg) => seg.map((p) => [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lon * 1e5) / 1e5] as [number, number])).filter((seg) => seg.length > 1);
    if (!route.length) route = null;
  }
  const sets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
  const volumeKg = s.exercises.reduce((n, e) => n + e.sets.reduce((m, x) => m + x.weight * x.reps, 0), 0);
  const { post } = await api<{ post: Post }>("/api/posts", {
    method: "POST",
    body: {
      clientId: s.id,
      date: new Date(s.date).toISOString(),
      kind: s.kind,
      activity: s.activity ?? (s.kind === "strength" ? "strength" : s.style ?? s.discipline),
      title: s.title ?? s.dayName ?? ACTIVITY_BY_ID[s.activity ?? ""]?.name ?? "Workout",
      caption: opts.caption,
      stats: {
        distanceKm: s.distanceKm,
        movingSeconds: s.movingSeconds,
        durationMinutes: s.durationMinutes,
        paceSecPerKm: s.paceSecPerKm ?? undefined,
        speedKmh: s.speedKmh,
        elevationGain: s.elevationGain,
        calories: s.calories,
        sets: sets || undefined,
        volumeKg: volumeKg || undefined,
      },
      exercises: s.exercises.slice(0, 40).map((e) => {
        const top = [...e.sets].sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
        return { name: e.name, sets: e.sets.length, best: top ? (top.weight ? `${top.weight} kg × ${top.reps}` : `${top.reps} reps`) : undefined };
      }),
      route,
      visibility: opts.visibility,
      clubs: opts.clubs,
    },
  });

  // Media: upload only what isn't on the post yet (re-sharing replaces text, not files).
  let latest = post;
  const pending = post.media.length ? [] : (s.media ?? []).filter((m) => opts.mediaUris.includes(m.uri));
  for (const [i, m] of pending.entries()) {
    onProgress?.(`Uploading ${m.type === "video" ? "video" : "photo"} ${i + 1} of ${pending.length}…`);
    const token = await getToken();
    const params = new URLSearchParams();
    if (m.width) params.set("width", String(m.width));
    if (m.height) params.set("height", String(m.height));
    if (m.durationMs) params.set("durationMs", String(Math.round(m.durationMs)));
    const res = await new File(m.uri).upload(`${apiUrl()}/api/posts/${post.id}/media?${params}`, {
      httpMethod: "POST",
      uploadType: UploadType.BINARY_CONTENT,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": m.mimeType ?? (m.type === "video" ? "video/mp4" : "image/jpeg") },
    });
    if (res.status >= 300) {
      let message = `Upload failed (${res.status})`;
      try {
        message = JSON.parse(res.body).message ?? message;
      } catch {
        // keep default
      }
      throw new ApiError(message, res.status);
    }
    latest = JSON.parse(res.body).post as Post;
  }
  await updateSession(s.id, { postId: post.id });
  return latest;
}

// ── Clubs ────────────────────────────────────────────────────────────────

export type Club = { id: string; name: string; description: string; memberCount: number; owner: boolean; code: string; members?: PublicUser[] };
export const getClubs = () => api<{ clubs: Club[] }>("/api/clubs");
export const getClub = (id: string) => api<{ club: Club }>(`/api/clubs/${id}`);
export const createClub = (name: string, description: string) => api<{ club: Club }>("/api/clubs", { method: "POST", body: { name, description } });
export const joinClub = (code: string) => api<{ club: Club }>("/api/clubs/join", { method: "POST", body: { code } });
export const leaveClub = (id: string) => api(`/api/clubs/${id}/leave`, { method: "POST" });

// ── Leaderboard ──────────────────────────────────────────────────────────

export type Metric = "time" | "distance" | "sessions" | "days";
export type BoardRow = { user: PublicUser; me: boolean; value: number; distanceKm: number; minutes: number; sessions: number; activeDays: number; streakWeeks: number };

const mondayKey = (d: Date) => localDayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));
export const thisWeekKey = () => mondayKey(new Date());

export const getLeaderboard = (metric: Metric, clubId?: string, week = thisWeekKey()) =>
  api<{ rows: BoardRow[] }>(`/api/leaderboard?week=${week}&metric=${metric}${clubId ? `&club=${clubId}` : ""}`);

/** Report this week's and last week's totals (all sessions, not just shared ones). */
export async function pushWeeklyStats(sessions: LoggedSession[], streakWeeks: number) {
  if (!(await getToken())) return;
  const now = new Date();
  const weeks = [mondayKey(now), mondayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7))];
  const body = weeks.map((week) => {
    const inWeek = sessions.filter((s) => mondayKey(new Date(s.date)) === week);
    return {
      week,
      distanceKm: Math.round(inWeek.reduce((n, s) => n + (s.distanceKm ?? 0), 0) * 100) / 100,
      minutes: Math.round(inWeek.reduce((n, s) => n + (s.durationMinutes ?? (s.movingSeconds ?? 0) / 60), 0)),
      sessions: inWeek.length,
      activeDays: new Set(inWeek.map((s) => localDayKey(new Date(s.date)))).size,
      streakWeeks: week === weeks[0] ? streakWeeks : 0,
    };
  });
  await api("/api/leaderboard/stats", { method: "PUT", body: { weeks: body.filter((w, i) => i === 0 || w.sessions > 0) } });
}

// ── Notifications ────────────────────────────────────────────────────────

export type Inbox = {
  unread: number;
  items: { id: string; type: "kudos" | "comment" | "friend_request" | "friend_accept" | "club_join"; actor: PublicUser; post: string | null; club: { id: string; name: string } | null; text: string; read: boolean; date: string }[];
};
export const getInbox = () => api<Inbox>("/api/notifications");
export const getUnread = () => api<{ unread: number }>("/api/notifications/unread");
export const markInboxRead = () => api("/api/notifications/read", { method: "POST" });
