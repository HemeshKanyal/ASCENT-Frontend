import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import {
  ACTIVITY_BY_ID,
  ACTIVITY_CATEGORIES,
  AREAS,
  SESSION_TYPES,
  ageFrom,
  generateEnduranceSession,
  generateFlow,
  type Discipline,
  type Flow,
  type FlowStyle,
} from "../../src/engine";
import { engineProfile, flowConstraints, getProfile, getSessions, setGuided, type Profile } from "../../src/services/trainingStore";
import { Button, Card, Empty, Label, Loading, Row, Screen, Title } from "../../src/ui/components";
import { colors, space, type } from "../../src/ui/theme";

const GUIDED_TYPES: Record<string, string[]> = {
  run: ["easy", "intervals", "tempo", "long"],
  bike: ["easy", "intervals", "tempo", "long"],
  swim: ["technique", "intervals", "long"],
  hyrox: ["compromised", "stations", "engine"],
  conditioning: ["metcon", "sprints", "rounds"],
};

// Module-level so the seeds can use the clock (not allowed during render).
async function startFlow(id: string, style: FlowStyle, minutes: number, areas: string[], constraints: ReturnType<typeof flowConstraints>, age: number | null) {
  const flow: Flow = generateFlow({ style, minutes, areas, constraints, history: await getSessions(), seed: `${id}:${style}:${Date.now()}` });
  await setGuided({ mode: style === "warmup" ? "warmup" : style === "cooldown" ? "cooldown" : "mobility", session: flow, age });
  router.push("/guided");
}

async function startSession(id: string, discipline: Discipline, type: string, profile: Profile, age: number | null) {
  const session = generateEnduranceSession({
    discipline,
    type,
    level: profile.level,
    minutes: profile.sessionMinutes,
    equipment: profile.equipment,
    history: await getSessions(),
    seed: `${id}:${type}:${Date.now()}`,
  });
  await setGuided({ mode: "endurance", session, age });
  router.push("/guided");
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <Card>
      <Label>{title}</Label>
      {items.map((t) => (
        <Text key={t} style={type.body}>
          · {t}
        </Text>
      ))}
    </Card>
  );
}

export default function ActivityGuide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activity = ACTIVITY_BY_ID[id];
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  if (!activity) {
    return (
      <Screen>
        <Empty title="Not found" action={<Button title="Back" onPress={() => router.back()} />} />
      </Screen>
    );
  }
  if (!profile) return <Loading />;

  const constraints = flowConstraints(profile, engineProfile(profile));
  const age = ageFrom(profile.body.birthYear);

  const runFlow = (style: FlowStyle, minutes: number, areas: string[]) => startFlow(id, style, minutes, areas, constraints, age);
  const runSession = (t: string) => startSession(id, activity.discipline!, t, profile, age);

  return (
    <Screen
      footer={
        activity.flow ? (
          <Button title={`Start a ${activity.name.toLowerCase()} flow`} onPress={() => runFlow(activity.flow!, Math.min(profile.sessionMinutes, 30), activity.warmup)} />
        ) : (
          <Button title={`Record a ${activity.name.toLowerCase()}`} onPress={() => router.push({ pathname: "/record", params: { activity: activity.id } })} />
        )
      }
    >
      <Title kicker={ACTIVITY_CATEGORIES[activity.category]}>{activity.name}</Title>

      <Section title="Tips" items={activity.tips} />
      <Section title="Technique" items={activity.technique} />
      <Section title="Common mistakes" items={activity.mistakes} />
      <Section title="Safety" items={activity.safety} />

      {!activity.flow ? (
        <>
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Label>Warm-up · 5 min</Label>
                <Text style={type.small}>{activity.warmup.map((a) => AREAS[a]).join(", ")}</Text>
              </View>
              <Button title="Start" compact variant="secondary" onPress={() => runFlow("warmup", 5, activity.warmup)} />
            </Row>
            {activity.drills.map((d) => (
              <Text key={d} style={type.body}>
                · {d}
              </Text>
            ))}
          </Card>
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Label>Cool-down · 8 min</Label>
                <Text style={type.small}>{activity.cooldown.map((a) => AREAS[a]).join(", ")}</Text>
              </View>
              <Button title="Start" compact variant="secondary" onPress={() => runFlow("cooldown", 8, activity.cooldown)} />
            </Row>
          </Card>
        </>
      ) : null}

      {activity.discipline && GUIDED_TYPES[activity.discipline] ? (
        <View style={{ gap: space.sm }}>
          <Label>Guided sessions</Label>
          {GUIDED_TYPES[activity.discipline].map((t) => (
            <Card key={t} onPress={() => runSession(t)} style={{ paddingVertical: space.md }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={type.h3}>{SESSION_TYPES[t]}</Text>
                <Text style={[type.small, { color: colors.text }]}>Start ›</Text>
              </Row>
            </Card>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
