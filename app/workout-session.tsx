import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  discardActiveSession,
  finishWorkout,
  getActiveSession,
  removeExercise,
  saveActiveSession,
  type BalanceItem,
  type ActiveSession,
} from "../src/services/trainingStore";
import { Badge, Button, Card, Loading, Row, Screen, Stat, Title } from "../src/ui/components";
import { clock, range } from "../src/ui/format";
import { colors, fonts, radius, space, type } from "../src/ui/theme";
import { BalanceCard } from "../src/ui/BalanceCard";

type Rest = { endsAt: number; total: number } | null;
type Summary = { minutes: number; sets: number; highlights: { kind: string; text: string }[]; balance: BalanceItem[] };

export default function WorkoutSession() {
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [rest, setRest] = useState<Rest>(null);
  const [now, setNow] = useState(() => Date.now());
  const [missingReps, setMissingReps] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);
  const buzzed = useRef(false);

  useFocusEffect(
    useCallback(() => {
      getActiveSession().then((s) => {
        if (s) setSession(s);
        else if (!summary) router.replace("/");
      });
    }, [summary])
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const restLeft = rest ? (rest.endsAt - now) / 1000 : 0;
  useEffect(() => {
    if (rest && restLeft <= 0 && !buzzed.current) {
      buzzed.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setRest(null);
    }
  }, [rest, restLeft]);

  if (summary) {
    return (
      <Screen footer={<Button title="Done" onPress={() => router.replace("/")} />}>
        <Title kicker="Workout complete">Nice work.</Title>
        <Row gap={space.md}>
          <Stat value={`${summary.minutes}′`} label="Duration" />
          <Stat value={summary.sets} label="Sets logged" />
        </Row>
        {summary.highlights.map((h, i) => (
          <Card key={i} active={h.kind === "pr"}>
            <Text style={[type.body, h.kind === "pr" && { fontFamily: fonts.bold }]}>
              {h.kind === "pr" ? "🏆 " : h.kind === "up" ? "📈 " : "✨ "}
              {h.text}
            </Text>
          </Card>
        ))}
        <BalanceCard items={summary.balance} title="Your week so far" />
      </Screen>
    );
  }

  if (!session) return <Loading />;

  const update = (next: ActiveSession) => {
    setSession(next);
    saveActiveSession(next);
  };

  const editSet = (ei: number, si: number, field: "weight" | "reps", value: string) => {
    const next = structuredClone(session);
    next.exercises[ei].log[si][field] = value.replace(",", ".");
    update(next);
  };

  const toggleSet = (ei: number, si: number) => {
    const next = structuredClone(session);
    const ex = next.exercises[ei];
    const set = ex.log[si];
    if (!set.completed && !(Number(set.reps) > 0)) {
      setMissingReps(`${ei}-${si}`);
      return;
    }
    setMissingReps(null);
    set.completed = !set.completed;
    if (set.completed) {
      // Carry this set's numbers forward to make the next one a single tap.
      const following = ex.log[si + 1];
      if (following && !following.completed) {
        if (!following.weight) following.weight = set.weight;
        if (!following.reps) following.reps = set.reps;
      }
      buzzed.current = false;
      setRest({ endsAt: Date.now() + ex.restSeconds * 1000, total: ex.restSeconds });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    update(next);
  };

  const addSet = (ei: number) => {
    const next = structuredClone(session);
    const log = next.exercises[ei].log;
    const last = log[log.length - 1];
    log.push({ weight: last?.weight ?? "", reps: "", completed: false });
    update(next);
  };

  const removeSet = (ei: number) => {
    const next = structuredClone(session);
    if (next.exercises[ei].log.length > 1) next.exercises[ei].log.pop();
    update(next);
  };

  const completedSets = session.exercises.reduce((n, e) => n + e.log.filter((s) => s.completed).length, 0);
  const elapsed = (now - +new Date(session.startedAt)) / 1000;

  const finish = async () => {
    const { session: logged, highlights, balance } = await finishWorkout(session);
    setSummary({
      minutes: logged.durationMinutes ?? 0,
      sets: logged.exercises.reduce((n, e) => n + e.sets.length, 0),
      highlights,
      balance,
    });
  };

  const discard = async () => {
    await discardActiveSession();
    router.replace("/");
  };

  return (
    <Screen
      footer={
        <>
          {rest ? (
            <View style={styles.restBar}>
              <View style={[styles.restFill, { width: `${Math.max(0, Math.min(1, restLeft / rest.total)) * 100}%` }]} />
              <Text style={[type.h3, { flex: 1 }]}>Rest {clock(restLeft)}</Text>
              <Button title="+30s" compact variant="secondary" onPress={() => setRest({ endsAt: rest.endsAt + 30000, total: rest.total + 30 })} />
              <Button title="Skip" compact variant="secondary" onPress={() => setRest(null)} />
            </View>
          ) : null}
          <Row>
            <Button title="Discard" variant="danger" onPress={discard} style={{ flex: 1 }} />
            <Button title={`Finish (${completedSets} sets)`} onPress={finish} disabled={completedSets === 0} style={{ flex: 2 }} />
          </Row>
        </>
      }
    >
      <Row style={{ justifyContent: "space-between" }}>
        <Title kicker={`In progress · ${clock(elapsed)}`}>{session.dayName}</Title>
      </Row>

      {session.exercises.map((ex, ei) => (
        <Card key={`${ex.exerciseId}-${ei}`}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Badge label={ex.role === "anchor" ? "ANCHOR" : "ROTATION"} solid={ex.role === "anchor"} />
              <Text style={type.h3}>{ex.name}</Text>
              <Text style={type.small}>
                {range(ex.repRange)} reps · {ex.rir} RIR{ex.tempo ? ` · ${ex.tempo}` : ""}
              </Text>
            </View>
            <Button
              title="Swap"
              compact
              variant="secondary"
              onPress={() => router.push({ pathname: "/swap", params: { index: String(ei), session: "1" } })}
            />
          </Row>
          {ex.cue ? <Text style={[type.small, { color: colors.faint }]}>{ex.cue}</Text> : null}
          {ex.technique ? <Text style={[type.small, { color: colors.text }]}>⚡ {ex.technique.label}</Text> : null}

          <Row style={styles.headerRow}>
            <Text style={[styles.colSet, type.label]}>Set</Text>
            <Text style={[styles.colInput, type.label]}>kg</Text>
            <Text style={[styles.colInput, type.label]}>Reps</Text>
            <View style={styles.colCheck} />
          </Row>
          {ex.log.map((set, si) => {
            const missing = missingReps === `${ei}-${si}`;
            return (
              <Row key={si} style={[styles.setRow, set.completed && styles.setRowDone]}>
                <Text style={[styles.colSet, type.body]}>{si + 1}</Text>
                <TextInput
                  style={[styles.input, styles.colInput]}
                  value={set.weight}
                  onChangeText={(v) => editSet(ei, si, "weight", v)}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={colors.faint}
                  editable={!set.completed}
                />
                <TextInput
                  style={[styles.input, styles.colInput, missing && { borderColor: colors.danger }]}
                  value={set.reps}
                  onChangeText={(v) => editSet(ei, si, "reps", v)}
                  keyboardType="number-pad"
                  placeholder={range(ex.repRange)}
                  placeholderTextColor={colors.faint}
                  editable={!set.completed}
                />
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: set.completed }}
                  onPress={() => toggleSet(ei, si)}
                  style={[styles.check, styles.colCheck, set.completed && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                >
                  <Text style={{ color: set.completed ? colors.onAccent : colors.faint, fontFamily: fonts.black }}>✓</Text>
                </Pressable>
              </Row>
            );
          })}
          <Row>
            <Button title="+ Set" compact variant="ghost" onPress={() => addSet(ei)} />
            <Button title="− Set" compact variant="ghost" onPress={() => removeSet(ei)} />
            <View style={{ flex: 1 }} />
            <Button
              title={removing === ei ? "Tap again to remove" : "Remove"}
              compact
              variant={removing === ei ? "danger" : "ghost"}
              onPress={async () => {
                if (removing !== ei) return setRemoving(ei);
                setRemoving(null);
                await removeExercise(ei, true);
                setSession(await getActiveSession());
              }}
            />
          </Row>
        </Card>
      ))}
      <Button title="+ Add exercise" variant="secondary" onPress={() => router.push({ pathname: "/pick-exercise", params: { session: "1" } })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginTop: space.sm },
  setRow: { paddingVertical: 4, borderRadius: radius.sm },
  setRowDone: { opacity: 0.6 },
  colSet: { width: 32, textAlign: "center" },
  colInput: { flex: 1, textAlign: "center" },
  colCheck: { width: 44 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: fonts.semibold,
  },
  check: {
    height: 42,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  restBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  restFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#2B2B2B" },
});
