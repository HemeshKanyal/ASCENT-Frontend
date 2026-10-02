import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import {
  ACTIVITIES,
  ACTIVITY_BY_ID,
  CLASSIFIABLE,
  ZONES,
  ageFrom,
  classifyActivity,
  formatPace,
  generateEnduranceSession,
  generateFlow,
  typesFor,
  zoneHeartRate,
  type Activity,
} from "../src/engine";
import { clearDraft, getDraft, useGpsTracker, type Draft } from "../src/hooks/useGpsTracker";
import { useScreenAwake } from "../src/hooks/useScreenAwake";
import {
  engineProfile,
  flowConstraints,
  getProfile,
  getSessions,
  logActivity,
  setGuided,
  type LoggedSession,
  type Profile,
} from "../src/services/trainingStore";
import { Button, Card, Chip, Label, Note, Row, Screen, Stat, Title, Wrap } from "../src/ui/components";
import { clock } from "../src/ui/format";
import { RouteMap } from "../src/ui/RouteMap";
import { colors, fonts, radius, space, type } from "../src/ui/theme";

const POOLS = [25, 50, 33, 20];

const partOfDay = () => {
  const h = new Date().getHours();
  return h < 12 ? "Morning" : h < 17 ? "Afternoon" : h < 21 ? "Evening" : "Night";
};

async function startGuided(activity: Activity, kind: string, profile: Profile) {
  const session = generateEnduranceSession({
    discipline: activity.discipline!,
    type: kind,
    level: profile.level,
    minutes: kind === "long" ? Math.round(profile.sessionMinutes * 1.5) : profile.sessionMinutes,
    equipment: profile.equipment,
    history: await getSessions(),
    seed: `${activity.id}:${kind}:${Date.now()}`,
  });
  await setGuided({ mode: "endurance", session, age: ageFrom(profile.body.birthYear) });
  router.push("/guided");
}

async function startActivityWarmup(activity: Activity) {
  const profile = await getProfile();
  if (!profile) return;
  const flow = generateFlow({
    style: "warmup",
    minutes: 5,
    areas: activity.warmup,
    constraints: flowConstraints(profile, engineProfile(profile)),
    seed: `${activity.id}:${Date.now()}`,
  });
  await setGuided({ mode: "warmup", session: flow, age: ageFrom(profile.body.birthYear) });
  router.push("/guided");
}

function Big({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 40, lineHeight: 46, color: colors.text }}>{value}</Text>
      <Text style={type.label}>{label}</Text>
    </View>
  );
}

export default function Record() {
  useScreenAwake("ascent-record");
  const params = useLocalSearchParams<{ activity?: string; title?: string; type?: string }>();
  const [activityId, setActivityId] = useState(params.activity && ACTIVITY_BY_ID[params.activity] ? params.activity : "run");
  const activity: Activity = ACTIVITY_BY_ID[activityId];
  const gps = activity.record === "gps";
  const tracker = useGpsTracker({ activityId, maxSpeed: activity.maxSpeed ?? 12, useGps: gps });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [pool, setPool] = useState(25);
  const [lengths, setLengths] = useState(0);
  const [finished, setFinished] = useState<null | ReturnType<typeof tracker.stop>>(null);
  const [title, setTitle] = useState("");
  const [rpe, setRpe] = useState<number | null>(null);
  const [hr, setHr] = useState("");
  const [notes, setNotes] = useState("");
  const types = typesFor(activityId);
  const classifiable = CLASSIFIABLE.includes(activityId);
  const [kind, setKind] = useState<string | null>(params.type ?? (classifiable ? "auto" : types[0]?.id ?? null));
  const [finalType, setFinalType] = useState<string | null>(null);
  const [guess, setGuess] = useState<string>("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<LoggedSession[]>([]);
  useEffect(() => {
    getProfile().then(setProfile);
    getSessions().then(setHistory);
  }, []);
  const age = ageFrom(profile?.body.birthYear);
  const typeLabel = (id: string | null) => types.find((x) => x.id === id)?.label ?? "";

  useEffect(() => {
    getDraft().then(setDraft);
  }, []);

  const started = tracker.status !== "idle";
  const isRide = activity.discipline === "bike";

  const startWarmup = () => startActivityWarmup(activity);

  const finish = () => {
    const result = tracker.stop();
    setFinished(result);
    let t = kind === "auto" ? null : kind;
    if (kind === "auto" && classifiable) {
      const s = result.stats;
      const c = classifyActivity({
        activity: activityId,
        distanceKm: s.distance / 1000,
        movingSeconds: s.movingSeconds || result.elapsedSeconds,
        paceSecPerKm: s.paceSecPerKm,
        splits: s.splits,
        elevationGain: s.elevationGain,
        avgHr: Number(hr) || undefined,
        age,
        rpe: rpe ?? undefined,
        history,
      });
      t = c.type;
      setGuess(c.reason);
    }
    setFinalType(t);
    setTitle(params.title ?? `${partOfDay()} ${t ? `${typeLabel(t).toLowerCase()} ` : ""}${activity.name.toLowerCase()}`);
  };

  const save = async () => {
    if (!finished) return;
    const s = finished.stats;
    const durationMinutes = Math.max(1, Math.round((gps ? s.movingSeconds || finished.elapsedSeconds : finished.elapsedSeconds) / 60));
    const distanceKm = gps ? s.distance / 1000 : activity.record === "laps" ? (lengths * pool) / 1000 : undefined;
    const entry = await logActivity({
      activityId,
      type: finalType ?? undefined,
      title: title.trim() || activity.name,
      durationMinutes,
      movingSeconds: gps ? s.movingSeconds : finished.elapsedSeconds,
      distanceKm: distanceKm ? Math.round(distanceKm * 100) / 100 : undefined,
      paceSecPerKm: gps ? s.paceSecPerKm : undefined,
      speedKmh: gps ? s.speedKmh : undefined,
      elevationGain: gps ? s.elevationGain : undefined,
      splits: gps ? s.splits : undefined,
      lengths: activity.record === "laps" ? lengths : undefined,
      poolLength: activity.record === "laps" ? pool : undefined,
      segments: gps ? finished.segments : undefined,
      avgHr: Number(hr) || undefined,
      rpe: rpe ?? undefined,
      notes: notes.trim() || undefined,
    });
    await clearDraft();
    router.replace({ pathname: "/activity/[id]", params: { id: entry.id } });
  };

  const discard = async () => {
    tracker.stop();
    await clearDraft();
    router.back();
  };

  const swimDistance = lengths * pool;
  const swimPace100 = swimDistance ? Math.round(tracker.elapsed / (swimDistance / 100)) : null;

  const pickable = useMemo(() => ACTIVITIES.filter((a) => !a.flow), []);

  // ── Finished: review & save ──
  if (finished) {
    const s = finished.stats;
    return (
      <Screen
        footer={
          <Row>
            <Button title="Discard" variant="danger" onPress={discard} style={{ flex: 1 }} />
            <Button title="Save activity" onPress={save} style={{ flex: 2 }} />
          </Row>
        }
      >
        <Title kicker={`${activity.name} · finished`}>Nice work.</Title>
        {gps && s.distance > 0 ? <RouteMap segments={finished.segments} height={220} /> : null}
        <Row gap={space.sm} style={{ alignItems: "stretch" }}>
          {gps ? <Stat value={(s.distance / 1000).toFixed(2)} label="km" /> : null}
          {activity.record === "laps" ? <Stat value={swimDistance} label="metres" /> : null}
          <Stat value={clock(gps ? s.movingSeconds : finished.elapsedSeconds)} label={gps ? "moving time" : "time"} />
          {gps ? <Stat value={isRide ? `${s.speedKmh}` : formatPace(s.paceSecPerKm)} label={isRide ? "km/h" : "/km"} /> : null}
        </Row>
        {types.length ? (
          <Card>
            <Label>{guess ? "Looks like" : "Session type"}</Label>
            {guess ? <Text style={type.small}>{guess}</Text> : null}
            <Wrap>
              {types.map((x) => (
                <Chip
                  key={x.id}
                  label={x.label}
                  selected={finalType === x.id}
                  onPress={() => {
                    setTitle(title.replace(new RegExp(`\\b${typeLabel(finalType).toLowerCase()}\\b ?`), "").replace(activity.name.toLowerCase(), `${x.label.toLowerCase()} ${activity.name.toLowerCase()}`));
                    setFinalType(x.id);
                  }}
                />
              ))}
            </Wrap>
          </Card>
        ) : null}
        <Card>
          <Label>Title</Label>
          <TextInput value={title} onChangeText={setTitle} style={input} placeholderTextColor={colors.faint} />
          <Label>How hard was it? (1–10)</Label>
          <Wrap>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Chip key={n} label={String(n)} selected={rpe === n} onPress={() => setRpe(n)} />
            ))}
          </Wrap>
          <Label>Average heart rate (optional)</Label>
          <TextInput value={hr} onChangeText={setHr} keyboardType="number-pad" placeholder="bpm" placeholderTextColor={colors.faint} style={input} />
          <Label>Notes</Label>
          <TextInput value={notes} onChangeText={setNotes} placeholder="How did it feel?" placeholderTextColor={colors.faint} multiline style={[input, { minHeight: 70, textAlignVertical: "top" }]} />
        </Card>
      </Screen>
    );
  }

  // ── Recording ──
  if (started) {
    const s = tracker.stats;
    const recording = tracker.status === "recording";
    return (
      <Screen
        footer={
          <Row>
            {recording ? (
              <Button title="Pause" onPress={tracker.pause} style={{ flex: 1 }} />
            ) : (
              <>
                <Button title="Resume" onPress={tracker.resume} style={{ flex: 1 }} />
                <Button title="Finish" variant="secondary" onPress={finish} style={{ flex: 1 }} />
              </>
            )}
          </Row>
        }
      >
        <Title kicker={`${activity.name} · ${recording ? "recording" : "paused"}`}>{clock(tracker.elapsed)}</Title>

        {gps ? (
          <>
            <RouteMap segments={tracker.segments} height={280} live={recording} />
            <Row style={{ alignItems: "flex-start" }}>
              <Big value={(s.distance / 1000).toFixed(2)} label="km" />
              <Big value={isRide ? `${s.speedKmh}` : formatPace(tracker.pace)} label={isRide ? "km/h" : "pace /km"} />
              <Big value={isRide ? `${s.elevationGain}` : formatPace(s.paceSecPerKm)} label={isRide ? "m climbed" : "avg /km"} />
            </Row>
            {tracker.accuracy && tracker.accuracy > 25 ? <Note>Weak GPS signal (±{Math.round(tracker.accuracy)} m) — distance may be off until it improves.</Note> : null}
            {s.splits.length ? (
              <Card>
                <Label>Splits</Label>
                {s.splits.slice(-4).map((sp) => (
                  <Row key={sp.km} style={{ justifyContent: "space-between" }}>
                    <Text style={type.body}>Km {sp.km}</Text>
                    <Text style={type.strong}>{formatPace(sp.seconds)}</Text>
                  </Row>
                ))}
              </Card>
            ) : null}
          </>
        ) : activity.record === "laps" ? (
          <>
            <Row>
              <Big value={String(lengths)} label="lengths" />
              <Big value={`${swimDistance}`} label="metres" />
              <Big value={swimPace100 ? formatPace(swimPace100) : "–:––"} label="/100 m" />
            </Row>
            <Pressable
              disabled={!recording}
              onPress={() => {
                setLengths(lengths + 1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              }}
              style={{
                height: 220,
                borderRadius: radius.lg,
                backgroundColor: recording ? colors.accent : colors.surfaceAlt,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: fonts.black, fontSize: 28, color: recording ? colors.onAccent : colors.muted }}>+1 length</Text>
              <Text style={{ fontFamily: fonts.medium, color: recording ? colors.onAccent : colors.muted }}>Tap at each wall</Text>
            </Pressable>
            <Button title="Undo last length" variant="ghost" onPress={() => setLengths(Math.max(0, lengths - 1))} />
          </>
        ) : (
          <Card>
            <Text style={type.body}>Timer running. Put the phone down and go — tap Pause when you&apos;re done.</Text>
          </Card>
        )}
      </Screen>
    );
  }

  // ── Before start ──
  return (
    <Screen
      footer={
        <Button
          title={gps && tracker.permission !== "granted" ? "Allow location & start" : "Start"}
          onPress={async () => {
            const ok = await tracker.start();
            if (ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }}
        />
      }
    >
      <Title kicker="Record">{activity.name}</Title>

      {!params.activity ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {pickable.map((a) => (
            <Chip key={a.id} label={a.name} selected={a.id === activityId} onPress={() => setActivityId(a.id)} />
          ))}
        </ScrollView>
      ) : null}

      {types.length ? (
        <Card>
          <Label>What kind of {activity.name.toLowerCase()}?</Label>
          <Wrap>
            {types.map((x) => (
              <Chip key={x.id} label={x.label} selected={kind === x.id} onPress={() => setKind(x.id)} />
            ))}
            {classifiable ? <Chip label="Not sure" selected={kind === "auto"} onPress={() => setKind("auto")} /> : null}
          </Wrap>
          {kind === "auto" ? (
            <Text style={type.small}>Just go — ASCENT will work out what kind it was from your pace and effort.</Text>
          ) : (
            (() => {
              const sel = types.find((x) => x.id === kind);
              if (!sel) return null;
              const hrRange = sel.zone ? zoneHeartRate(sel.zone, age) : null;
              return (
                <>
                  <Text style={type.body}>{sel.hint}</Text>
                  {sel.zone ? (
                    <Text style={type.small}>
                      Zone {sel.zone} · {ZONES[sel.zone - 1].name}
                      {hrRange ? ` · ${hrRange[0]}–${hrRange[1]} bpm` : ""} · {ZONES[sel.zone - 1].feel}
                    </Text>
                  ) : null}
                </>
              );
            })()
          )}
          {activity.discipline && kind && ["intervals", "tempo", "long"].includes(kind) && profile ? (
            <Button
              title={`Follow a guided ${typeLabel(kind).toLowerCase()} session`}
              variant="secondary"
              compact
              onPress={() => startGuided(activity, kind, profile)}
            />
          ) : null}
        </Card>
      ) : null}

      {draft ? (
        <Card active>
          <Text style={type.h3}>Unfinished {ACTIVITY_BY_ID[draft.activityId]?.name.toLowerCase() ?? "activity"}</Text>
          <Text style={type.small}>The app closed during a recording. Pick up where you left off?</Text>
          <Row>
            <Button
              title="Continue"
              compact
              onPress={() => {
                setActivityId(draft.activityId);
                tracker.restore(draft);
                setDraft(null);
              }}
            />
            <Button
              title="Discard"
              compact
              variant="danger"
              onPress={async () => {
                await clearDraft();
                setDraft(null);
              }}
            />
          </Row>
        </Card>
      ) : null}

      {gps ? (
        <Card>
          <Label>GPS</Label>
          <Text style={type.body}>
            {tracker.permission === "denied"
              ? "Location is off for ASCENT. Turn it on in Settings to record your route."
              : tracker.accuracy == null
                ? "Waiting for GPS… stand outside with a clear view of the sky."
                : tracker.accuracy <= 15
                  ? `Ready · ±${Math.round(tracker.accuracy)} m`
                  : `Weak signal · ±${Math.round(tracker.accuracy)} m — give it a moment`}
          </Text>
          <Text style={[type.small, { color: colors.faint }]}>Keep ASCENT open while recording — the screen stays on. Recording with the phone locked comes with the full app build.</Text>
        </Card>
      ) : null}

      {activity.record === "laps" ? (
        <Card>
          <Label>Pool length</Label>
          <Wrap>
            {POOLS.map((p) => (
              <Chip key={p} label={`${p} m`} selected={pool === p} onPress={() => setPool(p)} />
            ))}
          </Wrap>
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Label>Warm up first</Label>
            <Text style={type.small}>5-minute guided routine for {activity.name.toLowerCase()}</Text>
          </View>
          <Button title="Start" compact variant="secondary" onPress={startWarmup} />
        </Row>
        {activity.drills.length ? (
          <View style={{ gap: 2 }}>
            <Text style={type.small}>Then:</Text>
            {activity.drills.map((d) => (
              <Text key={d} style={type.body}>
                · {d}
              </Text>
            ))}
          </View>
        ) : null}
      </Card>

      {activity.tips.slice(0, 2).map((t) => (
        <Note key={t}>{t}</Note>
      ))}
      <Button title={`More about ${activity.name.toLowerCase()}`} variant="ghost" onPress={() => router.push({ pathname: "/guide/[id]", params: { id: activity.id } })} />
    </Screen>
  );
}

const input = {
  backgroundColor: colors.surfaceAlt,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  padding: space.md,
  fontSize: 16,
  fontFamily: fonts.medium,
};
