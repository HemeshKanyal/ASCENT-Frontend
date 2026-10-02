import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

import { ACTIVITY_BY_ID, DISCIPLINE_ACTIVITY, ZONES, formatPace, zoneHeartRate, type EnduranceSession, type EnduranceStep, type Flow } from "../src/engine";
import { getGuided, logActivity, logEndurance, logFlow, type Guided } from "../src/services/trainingStore";
import { useGpsTracker } from "../src/hooks/useGpsTracker";
import { useScreenAwake } from "../src/hooks/useScreenAwake";
import { RouteMap } from "../src/ui/RouteMap";
import { Button, Card, Chip, Label, Loading, Note, ProgressBar, Row, Screen, Stat, Title, Wrap } from "../src/ui/components";
import { clock } from "../src/ui/format";
import { colors, fonts, radius, space, type } from "../src/ui/theme";

type Step = (EnduranceStep | Flow["steps"][number]) & { zone?: number; note?: string; cue?: string; meters?: number; rest?: number };

/** Steps without a fixed time (swim distances, HYROX stations) advance when you tap Done. */
const isManual = (s: Step) => s.kind === "station" || (!!s.meters && !s.seconds);

function stepTarget(s: Step) {
  if (s.meters) return `${s.meters} m${s.rest ? ` · ${s.rest}s rest` : ""}`;
  return clock(s.seconds ?? 0);
}

export default function GuidedScreen() {
  useScreenAwake("ascent-guided");
  const [guided, setGuidedState] = useState<Guided | null>(null);
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [stepElapsed, setStepElapsed] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);
  const last = useRef<number | null>(null);

  // Log form (endurance)
  const [minutes, setMinutes] = useState("");
  const [distance, setDistance] = useState("");
  const [hr, setHr] = useState("");
  const [rpe, setRpe] = useState<number | null>(null);

  // Optional GPS for outdoor runs and rides, recorded alongside the guided steps.
  const discipline = guided?.mode === "endurance" ? (guided.session as EnduranceSession).discipline : undefined;
  const gpsCapable = discipline === "run" || discipline === "bike";
  const [gpsWanted, setGpsWanted] = useState(Platform.OS !== "web");
  const gpsOn = gpsCapable && gpsWanted;
  const actId = discipline ? DISCIPLINE_ACTIVITY[discipline] : "run";
  const tracker = useGpsTracker({ activityId: actId, maxSpeed: ACTIVITY_BY_ID[actId]?.maxSpeed ?? 12, useGps: gpsOn });
  const [track, setTrack] = useState<null | ReturnType<typeof tracker.stop>>(null);
  const onEnd = useRef<() => void>(() => {});
  useEffect(() => {
    onEnd.current = () => {
      if (gpsOn && tracker.status !== "idle") setTrack(tracker.stop());
    };
  });

  useEffect(() => {
    getGuided().then(setGuidedState);
  }, []);

  const steps = (guided?.session.steps ?? []) as Step[];
  const step = steps[idx];

  const advance = useCallback(
    (to: number) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStepElapsed(0);
      if (to >= steps.length) {
        setRunning(false);
        setFinished(true);
        onEnd.current();
      } else setIdx(Math.max(0, to));
    },
    [steps.length]
  );

  // Timer: one tick handles elapsed time, the last-3-seconds buzz and auto-advance.
  const stepElapsedRef = useRef(0);
  useEffect(() => {
    if (!running) {
      last.current = null;
      return;
    }
    const id = setInterval(() => {
      const now = Date.now();
      const dt = last.current ? (now - last.current) / 1000 : 0;
      last.current = now;
      const prev = stepElapsedRef.current;
      const next = prev + dt;
      stepElapsedRef.current = next;
      setStepElapsed(next);
      setTotalElapsed((e) => e + dt);

      if (step && !isManual(step)) {
        const total = step.seconds ?? 0;
        if (next >= total) {
          stepElapsedRef.current = 0;
          advance(idx + 1);
        } else if (total - next <= 3 && Math.ceil(total - next) !== Math.ceil(total - prev)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, step, idx, advance]);

  const jump = (to: number) => {
    stepElapsedRef.current = 0;
    advance(to);
  };

  if (!guided) return <Loading />;
  const { session, mode, age } = guided;
  const isEndurance = mode === "endurance";

  const toggleRun = async () => {
    if (!running && gpsOn) {
      if (tracker.status === "idle") await tracker.start();
      else if (tracker.status === "paused") await tracker.resume();
    } else if (running && tracker.status === "recording") tracker.pause();
    setRunning(!running);
  };

  const finishEarly = () => {
    setRunning(false);
    setFinished(true);
    onEnd.current();
  };

  const save = async () => {
    const es = session as EnduranceSession;
    if (isEndurance && track && track.stats.distance > 20) {
      const s = track.stats;
      const entry = await logActivity({
        activityId: actId,
        title: es.title,
        discipline: es.discipline,
        type: es.type,
        format: es.format,
        durationMinutes: Number(minutes) || Math.max(1, Math.round(totalElapsed / 60)),
        movingSeconds: s.movingSeconds,
        distanceKm: Math.round(s.distance / 10) / 100,
        paceSecPerKm: s.paceSecPerKm,
        speedKmh: s.speedKmh,
        elevationGain: s.elevationGain,
        splits: s.splits,
        segments: track.segments,
        avgHr: Number(hr) || undefined,
        rpe: rpe ?? undefined,
      });
      router.replace({ pathname: "/activity/[id]", params: { id: entry.id } });
      return;
    }
    if (isEndurance) {
      await logEndurance(session as EnduranceSession, {
        durationMinutes: Number(minutes) || Math.max(1, Math.round(totalElapsed / 60)),
        distanceKm: Number(distance.replace(",", ".")) || undefined,
        avgHr: Number(hr) || undefined,
        rpe: rpe ?? undefined,
      });
    } else if (mode === "mobility") {
      await logFlow(session as Flow, Math.max(1, Math.round(totalElapsed / 60)));
    }
    setSaved(true);
  };

  // ── Finished ──
  if (finished) {
    if (mode === "warmup" || mode === "cooldown") {
      return (
        <Screen footer={<Button title="Back to workout" onPress={() => router.back()} />}>
          <Title kicker={mode === "warmup" ? "Warm-up done" : "Cool-down done"}>{mode === "warmup" ? "Ready to lift." : "Nicely done."}</Title>
        </Screen>
      );
    }
    if (saved) {
      return (
        <Screen footer={<Button title="Done" onPress={() => router.dismissTo("/")} />}>
          <Title kicker="Saved">Session logged.</Title>
          <Row gap={space.md}>
            <Stat value={`${Math.round(totalElapsed / 60)}′`} label="Time" />
            {distance ? <Stat value={distance} label="Kilometres" /> : null}
            {rpe ? <Stat value={rpe} label="Effort (RPE)" /> : null}
          </Row>
        </Screen>
      );
    }
    return (
      <Screen
        footer={
          <Row>
            <Button title="Discard" variant="danger" onPress={() => router.back()} style={{ flex: 1 }} />
            <Button title="Save session" onPress={save} style={{ flex: 2 }} />
          </Row>
        }
      >
        <Title kicker="Finished">{session.title}</Title>
        {isEndurance ? (
          <>
            <Card>
              <Label>Minutes</Label>
              <TextInput
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                placeholder={String(Math.max(1, Math.round(totalElapsed / 60)))}
                style={inputStyle}
                placeholderTextColor={colors.faint}
              />
              {track && track.stats.distance > 20 ? (
                <>
                  <RouteMap segments={track.segments} height={180} />
                  <Text style={type.strong}>
                    GPS: {(track.stats.distance / 1000).toFixed(2)} km · {formatPace(track.stats.paceSecPerKm)} /km
                  </Text>
                </>
              ) : (
                <>
                  <Label>Distance (km, optional)</Label>
                  <TextInput value={distance} onChangeText={setDistance} keyboardType="decimal-pad" placeholder="e.g. 8.2" style={inputStyle} placeholderTextColor={colors.faint} />
                </>
              )}
              <Label>Average heart rate (optional)</Label>
              <TextInput value={hr} onChangeText={setHr} keyboardType="number-pad" placeholder="bpm" style={inputStyle} placeholderTextColor={colors.faint} />
            </Card>
            <Card>
              <Label>How hard was it? (1–10)</Label>
              <Wrap>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <Chip key={n} label={String(n)} selected={rpe === n} onPress={() => setRpe(n)} />
                ))}
              </Wrap>
            </Card>
          </>
        ) : (
          <Text style={type.body}>{Math.max(1, Math.round(totalElapsed / 60))} minutes of moving well.</Text>
        )}
      </Screen>
    );
  }

  // ── Running ──
  const zone = step?.zone ? ZONES[step.zone - 1] : null;
  const hrRange = step?.zone ? zoneHeartRate(step.zone, age) : null;
  const manual = step ? isManual(step) : false;
  const left = step && !manual ? Math.max(0, (step.seconds ?? 0) - stepElapsed) : stepElapsed;
  const doneSeconds = steps.slice(0, idx).reduce((n, s) => n + (s.seconds ?? 0), 0) + Math.min(stepElapsed, step?.seconds ?? 0);
  const totalSeconds = session.totalSeconds || 1;

  return (
    <Screen
      footer={
        <>
          <Row>
            <Button title="‹" variant="secondary" onPress={() => jump(idx - 1)} disabled={idx === 0} style={{ width: 64 }} />
            {manual && running ? (
              <Button title="Done ✓" onPress={() => jump(idx + 1)} style={{ flex: 1 }} />
            ) : (
              <Button title={running ? "Pause" : idx === 0 && totalElapsed === 0 ? "Start" : "Resume"} onPress={toggleRun} style={{ flex: 1 }} />
            )}
            <Button title="›" variant="secondary" onPress={() => jump(idx + 1)} style={{ width: 64 }} />
          </Row>
          <Button title="Finish early" variant="ghost" onPress={finishEarly} />
        </>
      }
    >
      <Title kicker={`${session.title} · ${clock(totalElapsed)}`}>{`Step ${idx + 1} of ${steps.length}`}</Title>
      <ProgressBar value={doneSeconds / totalSeconds} />

      {gpsCapable && idx === 0 && totalElapsed === 0 ? (
        <Row>
          <Chip label={gpsOn ? "GPS tracking on" : "GPS tracking off"} selected={gpsOn} onPress={() => setGpsWanted(!gpsWanted)} />
          <Text style={[type.small, { flex: 1 }]}>{gpsOn ? "Outdoors: records your route, distance and pace." : "Treadmill or trainer: timer only."}</Text>
        </Row>
      ) : null}
      {gpsOn && tracker.status !== "idle" ? (
        <>
          <Row style={{ justifyContent: "space-around" }}>
            <Text style={type.h2}>{(tracker.stats.distance / 1000).toFixed(2)} km</Text>
            <Text style={type.h2}>{discipline === "bike" ? `${tracker.stats.speedKmh} km/h` : `${formatPace(tracker.pace)} /km`}</Text>
          </Row>
          <RouteMap segments={tracker.segments} height={160} live={tracker.status === "recording"} />
        </>
      ) : null}

      <Card active>
        <Text style={[type.h2, { lineHeight: 30 }]}>{step?.label}</Text>
        <Text style={{ fontFamily: fonts.serif, fontSize: 84, lineHeight: 92, color: colors.text, textAlign: "center" }}>
          {manual ? (step?.meters ? `${step.meters}m` : clock(left)) : clock(left)}
        </Text>
        {manual ? <Text style={[type.small, { textAlign: "center" }]}>Tap Done when you finish this one.</Text> : null}
        {step?.note || step?.cue ? <Text style={[type.body, { textAlign: "center" }]}>{step.note ?? step.cue}</Text> : null}
      </Card>

      {zone ? (
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={type.h3}>
              Zone {zone.id} · {zone.name}
            </Text>
            <Text style={type.strong}>{hrRange ? `${hrRange[0]}–${hrRange[1]} bpm` : `RPE ${zone.rpe}`}</Text>
          </Row>
          <Text style={type.small}>{zone.feel}</Text>
        </Card>
      ) : null}

      {steps.slice(idx + 1, idx + 4).length ? (
        <View style={{ gap: space.sm }}>
          <Label>Up next</Label>
          {steps.slice(idx + 1, idx + 4).map((s, i) => (
            <Pressable
              key={i}
              onPress={() => jump(idx + 1 + i)}
              style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border }}
            >
              <Text style={[type.body, { flex: 1, color: colors.muted }]} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={type.small}>{stepTarget(s)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {idx === 0 && totalElapsed === 0 && isEndurance ? (
        <Note>{(session as EnduranceSession).why}</Note>
      ) : null}
    </Screen>
  );
}

const inputStyle = {
  backgroundColor: colors.surfaceAlt,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  padding: space.md,
  fontSize: 16,
  fontFamily: fonts.semibold,
};
