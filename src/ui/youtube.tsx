/**
 * "Watch on YouTube" links. We link to a search rather than a fixed video so
 * links never go dead and always show current, popular tutorials; add a video
 * id to CURATED to pin a specific one you trust.
 */
import { Linking } from "react-native";

import { Button } from "./components";

const CURATED: Record<string, string> = {};

const MOVE_SUFFIX: Record<string, string> = {
  dynamic: "warm up exercise how to",
  static: "stretch how to",
  yoga: "yoga pose for beginners",
  pilates: "pilates exercise how to",
  breath: "breathing exercise guided",
};

const ACTIVITY_QUERY: Record<string, string> = {
  dance: "dance workout for beginners follow along",
  breathwork: "guided breathwork for beginners",
  yoga: "yoga for beginners full class",
  pilates: "pilates for beginners full class",
  mobility: "full body mobility routine follow along",
  hiit: "beginner hiit workout follow along",
  martial_arts: "martial arts basics for beginners",
  swim_pool: "freestyle swimming technique for beginners",
  swim_open: "open water swimming tips for beginners",
};

export function youtubeQuery(kind: "exercise" | "move" | "activity", name: string, extra?: string): string {
  if (kind === "exercise") return `${name} proper form tutorial`;
  if (kind === "move") return `${name} ${MOVE_SUFFIX[extra ?? ""] ?? "how to"}`;
  return ACTIVITY_QUERY[extra ?? ""] ?? `${name.toLowerCase()} technique for beginners`;
}

export function youtubeUrl(id: string, query: string): string {
  if (CURATED[id]) return `https://www.youtube.com/watch?v=${CURATED[id]}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function WatchButton({ id, query, title = "Watch on YouTube ›" }: { id: string; query: string; title?: string }) {
  return <Button title={title} variant="secondary" onPress={() => Linking.openURL(youtubeUrl(id, query))} />;
}
