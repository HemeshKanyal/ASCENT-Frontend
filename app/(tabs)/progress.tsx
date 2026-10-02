import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import {
  DISCIPLINES,
  LEVEL_VOLUME_SCALE,
  SPLITS,
  WEEKLY_SET_TARGETS,
  exerciseTimeline,
  getExercise,
  weekKey,
  weeklyMuscleSets,
} from "../../src/engine";
import { getProfile, getSessions, type LoggedSession, type Profile } from "../../src/services/trainingStore";
import { Card, Empty, Label, Loading, ProgressBar, Row, Screen, Stat, Title } from "../../src/ui/components";
import { muscle, shortDate } from "../../src/ui/format";
import { colors, space, type } from "../../src/ui/theme";
import { ProgressCharts } from "../../src/ui/ProgressCharts";

function MuscleBar({ name, done, target }: { name: string; done: number; target: number }) {
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={type.body}>{name}</Text>
        <Text style={type.small}>
          {done} / {target} sets
        </Text>
      </Row>
      <ProgressBar value={done / target} />
    </View>
  );
}

function Trend({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  return (
    <Row gap={3} style={{ alignItems: "flex-end", height: 28 }}>
      {points.slice(-12).map((p, i) => (
        <View
          key={i}
          style={{
            width: 6,
            borderRadius: 2,
            height: 6 + (max === min ? 10 : ((p - min) / (max - min)) * 22),
            backgroundColor: i === Math.min(points.length, 12) - 1 ? colors.accent : colors.borderStrong,
          }}
        />
      ))}
    </Row>
  );
}

export default function ProgressScreen() {
  const [data, setData] = useState<{ profile: Profile; sessions: LoggedSession[] } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getProfile(), getSessions()]).then(([profile, sessions]) => profile && setData({ profile, sessions }));
    }, [])
  );

  if (!data) return <Loading />;
  const { profile, sessions } = data;


  const thisWeek = weekKey(new Date());
  const weekSets = weeklyMuscleSets(sessions)[thisWeek] ?? {};
  const weekSessions = sessions.filter((s) => weekKey(s.date) === thisWeek);
  const split = SPLITS[profile.splitId as keyof typeof SPLITS];
  const trainedMuscles = [...new Set(split?.days.flatMap((d) => d.muscles) ?? Object.keys(WEEKLY_SET_TARGETS))];
  const scale = LEVEL_VOLUME_SCALE[profile.level] ?? 1;

  const endurance: Record<string, { minutes: number; km: number; count: number }> = {};
  let weekMobility = 0;
  for (const s of weekSessions) {
    if (s.kind === "endurance" && s.discipline) {
      const e = (endurance[s.discipline] ??= { minutes: 0, km: 0, count: 0 });
      e.minutes += s.durationMinutes ?? 0;
      e.km += s.distanceKm ?? 0;
      e.count += 1;
    } else if (s.kind === "mobility") weekMobility += s.durationMinutes ?? 0;
  }
  const weekEndurance = Object.entries(endurance);

  const timeline = exerciseTimeline(sessions);
  const bests = Object.entries(timeline)
    .filter(([id]) => getExercise(id))
    .map(([id, points]) => {
      const bodyweight = points.every((p) => p.e1rm === 0);
      const values = points.map((p) => (bodyweight ? p.bestReps : p.e1rm));
      return { id, name: getExercise(id)?.name ?? id, values, bodyweight, last: points[points.length - 1].date };
    })
    .sort((a, b) => +new Date(b.last) - +new Date(a.last))
    .slice(0, 10);

  const recent = [...sessions].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 15);

  return (
    <Screen>
      <Title kicker="Progress">Your gains</Title>

      <Row gap={space.md} style={{ alignItems: "stretch" }}>
        <Stat value={weekSessions.length} label="Sessions this week" />
        <Stat value={weekSessions.reduce((n, s) => n + (s.durationMinutes ?? 0), 0)} label="Minutes this week" />
        <Stat value={sessions.length} label="All time" />
      </Row>

      {!sessions.length ? (
        <Empty title="No workouts yet" body="Finish your first session and your charts, volume, bests and history will fill in here." />
      ) : null}

      <ProgressCharts sessions={sessions} />

      {weekEndurance.length || weekMobility ? (
        <Card>
          <Label>Endurance & mobility this week</Label>
          {weekEndurance.map(([d, m]) => (
            <Row key={d} style={{ justifyContent: "space-between" }}>
              <Text style={type.body}>{DISCIPLINES[d as keyof typeof DISCIPLINES]?.label ?? d}</Text>
              <Text style={type.small}>
                {m.minutes} min{m.km ? ` · ${Math.round(m.km * 10) / 10} km` : ""} · {m.count} session{m.count > 1 ? "s" : ""}
              </Text>
            </Row>
          ))}
          {weekMobility ? (
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={type.body}>Mobility & yoga</Text>
              <Text style={type.small}>{weekMobility} min</Text>
            </Row>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Label>This week’s volume</Label>
        <Text style={type.small}>Hard sets per muscle. Indirect work (e.g. triceps in a bench press) counts as half.</Text>
        {trainedMuscles.map((m) => (
          <MuscleBar
            key={m}
            name={muscle(m)}
            done={Math.round((weekSets[m] ?? 0) * 2) / 2}
            target={Math.round((WEEKLY_SET_TARGETS[m as keyof typeof WEEKLY_SET_TARGETS] ?? 4) * scale)}
          />
        ))}
      </Card>

      {bests.length ? (
        <Card>
          <Label>Exercise trends</Label>
          <Text style={type.small}>Estimated max (or best reps for bodyweight) each time the exercise comes back around.</Text>
          {bests.map((b) => {
            const first = b.values[0];
            const last = b.values[b.values.length - 1];
            const change = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
            return (
              <Row key={b.id} style={{ justifyContent: "space-between", paddingVertical: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>{b.name}</Text>
                  <Text style={type.small}>
                    {b.bodyweight ? `${last} reps` : `~${Math.round(last)} kg max`}
                    {b.values.length > 1 ? ` · ${change >= 0 ? "+" : ""}${change}%` : " · first time"}
                  </Text>
                </View>
                <Trend points={b.values} />
              </Row>
            );
          })}
        </Card>
      ) : null}

      {recent.length ? <Label>History</Label> : null}
      {recent.map((s) => {
        const sets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
        const isOpen = open === s.id;
        return (
          <Card
            key={s.id}
            onPress={() => (s.activity ? router.push({ pathname: "/activity/[id]", params: { id: s.id } }) : setOpen(isOpen ? null : s.id))}
          >
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={type.h3}>{s.title ?? s.dayName ?? "Workout"}</Text>
              <Text style={type.small}>{shortDate(s.date)}</Text>
            </Row>
            <Text style={type.small}>
              {s.kind === "endurance" || s.kind === "mobility"
                ? `${s.durationMinutes ?? 0} min${s.distanceKm ? ` · ${s.distanceKm} km` : ""}${s.rpe ? ` · RPE ${s.rpe}` : ""}`
                : `${s.exercises.length} exercises · ${sets} sets${s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}`}
            </Text>
            {isOpen
              ? s.exercises.map((e, i) => (
                  <View key={i} style={{ paddingTop: 6 }}>
                    <Text style={type.body}>{e.name}</Text>
                    <Text style={type.small}>{e.sets.map((x) => (x.weight ? `${x.weight}×${x.reps}` : `${x.reps}`)).join("  ·  ")}</Text>
                  </View>
                ))
              : null}
          </Card>
        );
      })}
    </Screen>
  );
}
