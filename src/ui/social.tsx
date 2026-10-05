import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";

import { ACTIVITY_BY_ID, formatPace, type GpsPoint } from "../engine";
import { giveKudos, mediaUrl, type Post } from "../services/community";
import { Card, Row } from "./components";
import { clock } from "./format";
import { MediaStrip, MediaViewer, type MediaItem } from "./MediaStrip";
import { RouteSvg } from "./RouteSvg";
import { colors, fonts, radius, space, type } from "./theme";

export const inputStyle = {
  backgroundColor: colors.surfaceAlt,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  padding: space.md,
  fontSize: 15,
  fontFamily: fonts.regular,
};

export const Input = forwardRef<TextInput, TextInputProps>(function Input(props, ref) {
  return <TextInput ref={ref} placeholderTextColor={colors.faint} autoCorrect={false} {...props} style={[inputStyle, props.style]} />;
});

export function Avatar({ name, size = 40, uri }: { name: string; size?: number; uri?: string | null }) {
  if (uri) {
    return (
      <Image
        source={{ uri: mediaUrl(uri) }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.borderStrong }}
        contentFit="cover"
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.raised,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.38, color: colors.text }}>{initials || "?"}</Text>
    </View>
  );
}

export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - +new Date(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The 2–3 numbers that matter for this kind of activity. */
export function postStats(p: Post): [string, string][] {
  const s = p.stats;
  const out: [string, string][] = [];
  if (s.distanceKm) out.push([s.distanceKm.toFixed(2), "km"]);
  const secs = s.movingSeconds ?? (s.durationMinutes ?? 0) * 60;
  if (secs) out.push([clock(secs), "time"]);
  if (s.paceSecPerKm && p.activity !== "ride" && p.activity !== "indoor_ride") out.push([formatPace(s.paceSecPerKm), "/km"]);
  else if (s.speedKmh) out.push([String(s.speedKmh), "km/h"]);
  if (s.sets) out.push([String(s.sets), "sets"]);
  if (s.volumeKg) out.push([s.volumeKg >= 1000 ? `${(s.volumeKg / 1000).toFixed(1)} t` : `${Math.round(s.volumeKg)} kg`, "lifted"]);
  if (s.elevationGain) out.push([`${s.elevationGain} m`, "climb"]);
  return out.slice(0, 4);
}

const toSegments = (route: [number, number][][]): GpsPoint[][] => route.map((seg) => seg.map(([lat, lon]) => ({ lat, lon, t: 0 })));

export function PostCard({ post, onOpen, onOpenUser, now }: { post: Post; onOpen?: () => void; onOpenUser?: () => void; now: number }) {
  const [kudos, setKudos] = useState({ on: post.kudoed, count: post.kudosCount });
  const [viewing, setViewing] = useState<MediaItem | null>(null);
  const media: MediaItem[] = post.media.map((m) => ({ uri: mediaUrl(m.url), type: m.type, durationMs: m.durationMs }));
  const kindName: Record<string, string> = { strength: "Strength", mobility: "Mobility", food: "Food", progress: "Progress", photo: "Post" };
  const activityName = ACTIVITY_BY_ID[post.activity ?? ""]?.name ?? kindName[post.kind ?? ""] ?? "Workout";
  const stats = postStats(post);

  const toggleKudos = async () => {
    if (post.mine) return;
    const next = !kudos.on;
    setKudos({ on: next, count: kudos.count + (next ? 1 : -1) });
    try {
      const r = await giveKudos(post.id, next);
      setKudos({ on: r.kudoed, count: r.kudosCount });
    } catch {
      setKudos(kudos);
    }
  };

  return (
    <Card onPress={onOpen}>
      <Pressable onPress={onOpenUser}>
        <Row gap={space.md}>
          <Avatar name={post.owner.name} uri={post.owner.avatarUrl} />
          <View style={{ flex: 1 }}>
            <Text style={type.strong}>{post.mine ? "You" : post.owner.name}</Text>
            <Text style={type.small}>
              {activityName} · {timeAgo(post.date, now)}
              {post.visibility === "private" ? " · only you" : ""}
            </Text>
          </View>
        </Row>
      </Pressable>
      {post.title ? <Text style={type.h2}>{post.title}</Text> : null}
      {post.caption ? <Text style={type.body}>{post.caption}</Text> : null}
      {stats.length ? (
        <Row gap={0}>
          {stats.map(([v, l]) => (
            <View key={l} style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.serif, fontSize: 24, color: colors.text }}>{v}</Text>
              <Text style={[type.small, { fontSize: 11 }]}>{l}</Text>
            </View>
          ))}
        </Row>
      ) : null}
      {post.route?.length ? (
        <View style={{ alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: space.sm }}>
          <RouteSvg segments={toSegments(post.route)} width={300} height={150} />
        </View>
      ) : null}
      {media.length ? <MediaStrip media={media} size={110} onOpen={setViewing} /> : null}
      {!post.route?.length && !media.length && post.exercises.length ? (
        <Text style={type.small} numberOfLines={2}>
          {post.exercises.map((e) => e.name).join(" · ")}
        </Text>
      ) : null}
      <Row gap={space.lg}>
        <Pressable onPress={toggleKudos} hitSlop={8} disabled={post.mine}>
          <Row gap={6}>
            <Ionicons name={kudos.on ? "thumbs-up" : "thumbs-up-outline"} size={20} color={kudos.on ? colors.accent : colors.muted} />
            <Text style={[type.small, kudos.on && { color: colors.text }]}>{kudos.count || (post.mine ? 0 : "Kudos")}</Text>
          </Row>
        </Pressable>
        <Pressable onPress={onOpen} hitSlop={8}>
          <Row gap={6}>
            <Ionicons name="chatbubble-outline" size={19} color={colors.muted} />
            <Text style={type.small}>{post.commentCount || "Comment"}</Text>
          </Row>
        </Pressable>
      </Row>
      <MediaViewer item={viewing} onClose={() => setViewing(null)} />
    </Card>
  );
}
