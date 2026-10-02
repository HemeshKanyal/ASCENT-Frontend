import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import type { Flow } from "../src/engine";
import { loadToday, setGuided, startWorkout, type GuidedMode, type Today } from "../src/services/trainingStore";
import { Button, Loading, Row, Screen, Title } from "../src/ui/components";
import { StrengthView } from "../src/ui/StrengthView";

export default function StrengthScreen() {
  const [today, setToday] = useState<Today | null>(null);
  const load = useCallback(async () => setToday(await loadToday()), []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  if (!today) return <Loading />;

  const guide = async (mode: GuidedMode, s: Flow) => {
    await setGuided({ mode, session: s, age: today.age });
    router.push("/guided");
  };

  return (
    <Screen
      footer={
        <Row>
          <Button title="Back" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          {today.active ? (
            <Button title={`Resume ${today.active.dayName}`} onPress={() => router.push("/workout-session")} style={{ flex: 2 }} />
          ) : (
            <Button
              title="Start workout"
              style={{ flex: 2 }}
              onPress={async () => {
                await startWorkout();
                router.push("/workout-session");
              }}
            />
          )}
        </Row>
      }
    >
      <Title kicker={`${today.split.name} · Block ${today.block.number} · Week ${today.workout.blockWeek}/${today.block.weeks}`}>{today.workout.dayName}</Title>
      <StrengthView today={today} load={load} guide={guide} />
    </Screen>
  );
}
