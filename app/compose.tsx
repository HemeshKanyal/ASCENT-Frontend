import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { ACTIVITY_BY_ID } from "../src/engine";
import { cachedMe, createPost, getClubs, type Club, type PostKind, type UploadItem } from "../src/services/community";
import { getSessions, type LoggedSession } from "../src/services/trainingStore";
import { Badge, Button, Card, Chip, Empty, Label, Loading, Note, Row, Screen, Title, Wrap } from "../src/ui/components";
import { MediaStrip } from "../src/ui/MediaStrip";
import { Input } from "../src/ui/social";
import { colors, space, type } from "../src/ui/theme";

const KINDS: { id: "workout" | PostKind; label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; prompt: string }[] = [
  { id: "workout", label: "A workout", icon: "barbell", prompt: "" },
  { id: "food", label: "Food", icon: "nutrition", prompt: "What are you eating?" },
  { id: "progress", label: "Progress", icon: "body", prompt: "How's it going?" },
  { id: "photo", label: "Anything", icon: "images", prompt: "Say something…" },
];

const MAX_MEDIA = 8;

const sessionLabel = (s: LoggedSession) => s.title ?? s.dayName ?? ACTIVITY_BY_ID[s.activity ?? ""]?.name ?? "Workout";

export default function Compose() {
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("workout");
  const [sessions, setSessions] = useState<LoggedSession[] | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<UploadItem[]>([]);
  const [visibility, setVisibility] = useState<"friends" | "private">("friends");
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!(await cachedMe())) {
        router.replace({ pathname: "/account", params: { mode: "signup" } });
        return;
      }
      const all = await getSessions();
      setSessions([...all].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 30));
      getClubs()
        .then((r) => setClubs(r.clubs))
        .catch(() => {});
    })();
  }, []);

  if (!sessions) return <Loading />;

  const addMedia = async (source: "camera" | "library") => {
    setError("");
    const room = MAX_MEDIA - media.length;
    if (room <= 0) return;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images", "videos"],
      quality: 0.8,
      videoMaxDuration: 60,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      allowsMultipleSelection: source === "library",
      selectionLimit: room,
    };
    try {
      if (source === "camera" && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        return setError("Camera access is off — allow it in Settings.");
      }
      const r = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (r.canceled) return;
      const next = r.assets
        .filter((a) => a.type !== "video" || !a.duration || a.duration <= 61_000)
        .map<UploadItem>((a) => ({
          uri: a.uri,
          type: a.type === "video" ? "video" : "image",
          mimeType: a.mimeType ?? undefined,
          width: a.width,
          height: a.height,
          durationMs: a.type === "video" ? (a.duration ?? undefined) : undefined,
        }));
      if (next.length < r.assets.length) setError("Clips longer than 60 seconds were left out.");
      setMedia([...media, ...next].slice(0, MAX_MEDIA));
    } catch {
      setError("Couldn't open your photos — try again.");
    }
  };

  const post = async () => {
    if (kind === "workout") return;
    if (!caption.trim() && !media.length) return setError("Add a photo, a video or a few words.");
    setError("");
    setBusy("Posting…");
    try {
      const p = await createPost({ kind, caption: caption.trim(), visibility, clubs: picked, media }, setBusy);
      router.replace({ pathname: "/post/[id]", params: { id: p.id } });
    } catch (e) {
      setError((e as Error).message);
      setBusy("");
    }
  };

  const current = KINDS.find((k) => k.id === kind)!;

  return (
    <Screen
      footer={
        <Row>
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} disabled={!!busy} />
          {kind !== "workout" ? <Button title={busy || "Post"} onPress={post} style={{ flex: 2 }} disabled={!!busy} /> : null}
        </Row>
      }
    >
      <Title kicker="Crew">New post</Title>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {KINDS.map((k) => (
          <Pressable
            key={k.id}
            onPress={() => setKind(k.id)}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 6,
              paddingVertical: space.md,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: kind === k.id ? colors.accent : colors.border,
              backgroundColor: kind === k.id ? colors.raised : colors.surface,
            }}
          >
            <Ionicons name={k.icon} size={22} color={colors.text} />
            <Text style={[type.small, { color: colors.text }]}>{k.label}</Text>
          </Pressable>
        ))}
      </View>

      {kind === "workout" ? (
        sessions.length ? (
          <>
            <Text style={type.small}>Pick a session to share — its stats, map and photos come with it.</Text>
            {sessions.map((s) => (
              <Card key={s.id} onPress={() => router.push({ pathname: "/share/[id]", params: { id: s.id } })}>
                <Row style={{ justifyContent: "space-between" }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={type.strong}>{sessionLabel(s)}</Text>
                    <Text style={type.small}>
                      {new Date(s.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                      {s.distanceKm ? ` · ${s.distanceKm.toFixed(1)} km` : ""}
                      {s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}
                      {s.media?.length ? ` · ${s.media.length} 📷` : ""}
                    </Text>
                  </View>
                  {s.postId ? <Badge label="Posted" /> : <Text style={[type.h3, { color: colors.faint }]}>›</Text>}
                </Row>
              </Card>
            ))}
          </>
        ) : (
          <Empty title="No sessions yet" body="Log a workout, run or flow first — or post something else." />
        )
      ) : (
        <>
          <Input
            value={caption}
            onChangeText={setCaption}
            placeholder={current.prompt}
            multiline
            maxLength={2000}
            style={{ minHeight: 100, textAlignVertical: "top" }}
          />
          {media.length ? (
            <>
              <MediaStrip media={media} size={90} onOpen={(m) => setMedia(media.filter((x) => x.uri !== m.uri))} />
              <Text style={type.small}>Tap a photo or clip to remove it.</Text>
            </>
          ) : null}
          {media.length < MAX_MEDIA ? (
            <Row>
              {Platform.OS !== "web" ? <Button title="Camera" variant="secondary" onPress={() => addMedia("camera")} style={{ flex: 1 }} /> : null}
              <Button title="Photos & videos" variant="secondary" onPress={() => addMedia("library")} style={{ flex: 1 }} />
            </Row>
          ) : null}

          <Card>
            <Label>Who can see it</Label>
            <Wrap>
              <Chip label="Friends" selected={visibility === "friends"} onPress={() => setVisibility("friends")} />
              <Chip label="Only me" selected={visibility === "private"} onPress={() => setVisibility("private")} />
            </Wrap>
            {visibility === "friends" && clubs.length ? (
              <>
                <Text style={type.small}>Also post to:</Text>
                <Wrap>
                  {clubs.map((c) => (
                    <Chip
                      key={c.id}
                      label={c.name}
                      selected={picked.includes(c.id)}
                      onPress={() => setPicked(picked.includes(c.id) ? picked.filter((x) => x !== c.id) : [...picked, c.id])}
                    />
                  ))}
                </Wrap>
              </>
            ) : null}
          </Card>
        </>
      )}
      {error ? <Note>{error}</Note> : null}
    </Screen>
  );
}
