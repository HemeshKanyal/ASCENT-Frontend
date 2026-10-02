import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { EQUIPMENT, SWAP_REASONS, findAlternatives, profileContext } from "../src/engine";
import {
  getActiveSession,
  getProfile,
  loadToday,
  swapExercise,
  type Profile,
  type SwapReason,
  type WorkoutExercise,
} from "../src/services/trainingStore";
import { Button, Card, Chip, Empty, Loading, Row, Screen, Title, Wrap } from "../src/ui/components";
import { muscles } from "../src/ui/format";
import { colors, type } from "../src/ui/theme";

const REASON_NOTES: Record<SwapReason, (isAnchor: boolean) => string> = {
  equipment: () => "Just for today — your plan stays the same next time.",
  pain: (a) =>
    a ? "Showing joint-friendlier options. This replaces the anchor for the rest of the block." : "Showing joint-friendlier options.",
  too_hard: (a) => (a ? "Easier options. This replaces the anchor for the rest of the block." : "Easier options to learn."),
  dislike: (a) => `We won't suggest it again${a ? " and the replacement becomes your anchor this block" : ""}.`,
};

export default function SwapScreen() {
  const params = useLocalSearchParams<{ index: string; session?: string }>();
  const index = Number(params.index);
  const inSession = params.session === "1";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [reason, setReason] = useState<SwapReason>("equipment");

  useEffect(() => {
    (async () => {
      setProfile(await getProfile());
      if (inSession) setExercises((await getActiveSession())?.exercises ?? []);
      else setExercises((await loadToday())?.workout.exercises ?? []);
    })();
  }, [inSession]);

  const current = exercises[index];

  const alternatives = useMemo(() => {
    if (!profile || !current) return [];
    return findAlternatives(current.exerciseId, profileContext(profile), {
      reason,
      excludeIds: exercises.map((e) => e.exerciseId),
      limit: 8,
    });
  }, [profile, current, exercises, reason]);

  if (!profile || !current) return <Loading />;

  const choose = async (newExerciseId: string) => {
    await swapExercise({ index, newExerciseId, reason, inSession });
    router.back();
  };

  return (
    <Screen footer={<Button title="Cancel" variant="ghost" onPress={() => router.back()} />}>
      <Title kicker="Swap exercise">{current.name}</Title>

      <Text style={type.h3}>Why?</Text>
      <Wrap>
        {(Object.keys(SWAP_REASONS) as SwapReason[]).map((r) => (
          <Chip key={r} label={SWAP_REASONS[r]} selected={reason === r} onPress={() => setReason(r)} />
        ))}
      </Wrap>
      <Text style={type.small}>{REASON_NOTES[reason](current.role === "anchor")}</Text>

      {alternatives.length === 0 ? (
        <Empty
          title="No good matches"
          body="Nothing in the library fits with your equipment and joints. Try a different reason or add equipment in Profile."
        />
      ) : (
        alternatives.map(({ exercise, reasons }, i) => (
          <Card key={exercise.id} onPress={() => choose(exercise.id)} active={i === 0}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={[type.h3, { flex: 1 }]}>{exercise.name}</Text>
              {i === 0 ? <Text style={[type.label, { color: colors.accent }]}>Best match</Text> : null}
            </Row>
            <Text style={type.small}>{reasons.join(" · ")}</Text>
            <View style={{ gap: 2 }}>
              <Text style={[type.small, { color: colors.faint }]}>Muscles: {muscles(exercise.primary)}</Text>
              <Text style={[type.small, { color: colors.faint }]}>
                Needs: {exercise.equipment.length ? exercise.equipment.map((e) => EQUIPMENT[e as keyof typeof EQUIPMENT]).join(", ") : "Nothing"}
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
