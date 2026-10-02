import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { ACTIVITY_BY_ID, formatPace, type GpsPoint } from "../../src/engine";
import { MAX_MEDIA, MEDIA_SUPPORTED, addMedia, deleteSessionMedia, removeMedia } from "../../src/services/mediaStore";
import { getRoute } from "../../src/services/routeStore";
import { deleteSession, getSession, type LoggedSession } from "../../src/services/trainingStore";
import { Button, Card, Empty, Label, Loading, Note, Row, Screen, Stat, Title } from "../../src/ui/components";
import { clock } from "../../src/ui/format";
import { MediaStrip, MediaViewer, type MediaItem } from "../../src/ui/MediaStrip";
import { RouteMap } from "../../src/ui/RouteMap";
import { RouteSvg } from "../../src/ui/RouteSvg";
import { colors, fonts, space, type } from "../../src/ui/theme";

function ShareCard({ s, segments }: { s: LoggedSession; segments: GpsPoint[][] }) {
  const isRide = s.discipline === "bike";
  const stats: [string, string][] = [
    ...(s.distanceKm ? ([[`${s.distanceKm.toFixed(2)}`, "km"]] as [string, string][]) : []),
    [clock(s.movingSeconds ?? (s.durationMinutes ?? 0) * 60), "time"],
    ...(s.paceSecPerKm && !isRide ? ([[formatPace(s.paceSecPerKm), "/km"]] as [string, string][]) : []),
    ...(isRide && s.speedKmh ? ([[`${s.speedKmh}`, "km/h"]] as [string, string][]) : []),
    ...(s.elevationGain ? ([[`${s.elevationGain} m`, "climb"]] as [string, string][]) : []),
  ];
  return (
    <LinearGradient colors={["#262626", "#000000"]} style={{ width: 320, padding: 22, gap: 14, borderRadius: 20 }}>
      <Text style={{ fontFamily: fonts.heavy, fontSize: 11, letterSpacing: 2, color: colors.muted }}>
        {(ACTIVITY_BY_ID[s.activity ?? ""]?.name ?? "Activity").toUpperCase()} · {new Date(s.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }).toUpperCase()}
      </Text>
      <Text style={{ fontFamily: fonts.serif, fontSize: 32, lineHeight: 36, color: colors.text }}>{s.title}</Text>
      {segments.flat().length > 1 ? (
        <View style={{ alignItems: "center" }}>
          <RouteSvg segments={segments} width={276} height={200} stroke="#FFFFFF" />
        </View>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 10 }}>
        {stats.map(([v, l]) => (
          <View key={l} style={{ width: "50%" }}>
            <Text style={{ fontFamily: fonts.serif, fontSize: 30, color: colors.text }}>{v}</Text>
            <Text style={{ fontFamily: fonts.heavy, fontSize: 10, letterSpacing: 1.5, color: colors.muted }}>{l.toUpperCase()}</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontFamily: fonts.serif, fontSize: 18, color: colors.muted, textAlign: "right" }}>Ascent</Text>
    </LinearGradient>
  );
}

export default function ActivityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<LoggedSession | null | undefined>(undefined);
  const [segments, setSegments] = useState<GpsPoint[][]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [viewing, setViewing] = useState<MediaItem | null>(null);
  const [mediaMsg, setMediaMsg] = useState("");
  const card = useRef<View>(null);

  useFocusEffect(
    useCallback(() => {
      getSession(id).then(async (s) => {
        setSession(s);
        if (s?.hasRoute) setSegments(await getRoute(id));
      });
    }, [id])
  );

  if (session === undefined) return <Loading />;
  if (!session) {
    return (
      <Screen>
        <Empty title="Activity not found" action={<Button title="Back" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const s = session;
  const activity = ACTIVITY_BY_ID[s.activity ?? ""];
  const isRide = s.discipline === "bike";
  const splitTimes = s.splits?.map((x) => x.seconds) ?? [];
  const fastest = Math.min(...splitTimes);
  const slowest = Math.max(...splitTimes);

  const media = s.media ?? [];
  const attach = async (source: "library" | "camera") => {
    setMediaMsg("");
    try {
      const next = await addMedia(s.id, source);
      if (next) setSession({ ...s, media: next });
    } catch (e) {
      setMediaMsg(e instanceof Error && e.message === "camera_denied" ? "Camera access is off — allow it in Settings." : "Couldn't add that — try again.");
    }
  };
  const shareFile = async (m: MediaItem) => {
    if (Platform.OS === "web" || !(await Sharing.isAvailableAsync())) return;
    await Sharing.shareAsync(m.uri, { mimeType: m.type === "video" ? "video/mp4" : "image/jpeg" });
  };

  const share = async () => {
    if (Platform.OS === "web" || !(await Sharing.isAvailableAsync())) {
      setShareMsg("Sharing works in the phone app.");
      return;
    }
    const uri = await captureRef(card, { format: "png", quality: 1, result: "tmpfile" });
    await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your activity" });
  };

  return (
    <Screen
      footer={
        <Row>
          <Button title="Done" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} style={{ flex: 1 }} />
          <Button
            title={s.postId ? "View post" : "Post to friends"}
            onPress={() =>
              s.postId
                ? router.push({ pathname: "/post/[id]", params: { id: s.postId } })
                : router.push({ pathname: "/share/[id]", params: { id: s.id } })
            }
            style={{ flex: 2 }}
          />
        </Row>
      }
    >
      <Title kicker={`${activity?.name ?? "Activity"} · ${new Date(s.date).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}>
        {s.title ?? activity?.name ?? "Activity"}
      </Title>

      {segments.flat().length > 1 ? <RouteMap segments={segments} height={260} /> : null}

      <Row gap={space.sm} style={{ alignItems: "stretch" }}>
        {s.distanceKm ? <Stat value={s.distanceKm.toFixed(2)} label="km" /> : null}
        <Stat value={clock(s.movingSeconds ?? (s.durationMinutes ?? 0) * 60)} label="moving time" />
        {s.paceSecPerKm && !isRide ? <Stat value={formatPace(s.paceSecPerKm)} label="avg /km" /> : null}
        {isRide && s.speedKmh ? <Stat value={s.speedKmh} label="km/h" /> : null}
      </Row>
      <Row gap={space.sm} style={{ alignItems: "stretch" }}>
        {s.elevationGain ? <Stat value={`${s.elevationGain}`} label="m climbed" /> : null}
        {s.lengths ? <Stat value={s.lengths} label={`× ${s.poolLength} m lengths`} /> : null}
        {s.calories ? <Stat value={s.calories} label="kcal (est.)" /> : null}
        {s.avgHr ? <Stat value={s.avgHr} label="avg bpm" /> : null}
        {s.rpe ? <Stat value={s.rpe} label="effort /10" /> : null}
      </Row>

      {splitTimes.length ? (
        <Card>
          <Label>Splits</Label>
          {s.splits!.map((sp) => {
            const w = slowest === fastest ? 1 : 0.35 + 0.65 * ((slowest - sp.seconds) / (slowest - fastest));
            return (
              <Row key={sp.km} gap={space.md}>
                <Text style={[type.small, { width: 34 }]}>Km {sp.km}</Text>
                <View style={{ flex: 1, height: 18, justifyContent: "center" }}>
                  <View style={{ width: `${w * 100}%`, height: 10, borderRadius: 5, backgroundColor: sp.seconds === fastest ? colors.accent : colors.borderStrong }} />
                </View>
                <Text style={[type.strong, { width: 48, textAlign: "right" }]}>{formatPace(sp.seconds)}</Text>
              </Row>
            );
          })}
        </Card>
      ) : null}

      {s.exercises.length ? (
        <Card>
          <Label>Exercises</Label>
          {s.exercises.map((e, i) => (
            <Row key={`${e.exerciseId}${i}`} style={{ justifyContent: "space-between" }}>
              <Text style={[type.body, { flex: 1 }]}>{e.name}</Text>
              <Text style={type.small}>{e.sets.map((x) => (x.weight ? `${x.weight}×${x.reps}` : `${x.reps}`)).join("  ")}</Text>
            </Row>
          ))}
        </Card>
      ) : null}

      <Card>
        <Label>Photos & videos</Label>
        {media.length ? <MediaStrip media={media} onOpen={setViewing} /> : null}
        {MEDIA_SUPPORTED ? (
          media.length < MAX_MEDIA ? (
            <Row>
              <Button title="Camera" variant="secondary" onPress={() => attach("camera")} style={{ flex: 1 }} />
              <Button title="From library" variant="secondary" onPress={() => attach("library")} style={{ flex: 1 }} />
            </Row>
          ) : null
        ) : (
          <Text style={type.small}>Add photos and clips (up to 60 s) from the phone app.</Text>
        )}
        {mediaMsg ? <Text style={type.small}>{mediaMsg}</Text> : null}
      </Card>

      {s.notes ? (
        <Card>
          <Label>Notes</Label>
          <Text style={type.body}>{s.notes}</Text>
        </Card>
      ) : null}

      <Label>Share card</Label>
      <View style={{ alignItems: "center" }}>
        <View ref={card} collapsable={false}>
          <ShareCard s={s} segments={segments} />
        </View>
      </View>
      <Button title="Share image to Instagram, WhatsApp…" variant="secondary" onPress={share} />
      {shareMsg ? <Note>{shareMsg}</Note> : null}

      <Button
        title={confirmDelete ? "Tap again to delete" : "Delete activity"}
        variant="danger"
        onPress={async () => {
          if (!confirmDelete) return setConfirmDelete(true);
          deleteSessionMedia(s);
          await deleteSession(s.id);
          router.back();
        }}
      />
      <MediaViewer
        item={viewing}
        onClose={() => setViewing(null)}
        actions={
          viewing ? (
            <Row>
              {MEDIA_SUPPORTED ? <Button title="Share" variant="secondary" onPress={() => shareFile(viewing)} style={{ flex: 1 }} /> : null}
              <Button
                title="Remove"
                variant="danger"
                style={{ flex: 1 }}
                onPress={async () => {
                  const next = await removeMedia(s.id, viewing.uri);
                  setSession({ ...s, media: next });
                  setViewing(null);
                }}
              />
            </Row>
          ) : null
        }
      />
    </Screen>
  );
}
