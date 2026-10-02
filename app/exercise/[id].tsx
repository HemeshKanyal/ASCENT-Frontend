import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";

import { EQUIPMENT, JOINTS, PATTERN_LABELS, findAlternatives, getExercise, lastPerformance, profileContext } from "../../src/engine";
import { getProfile, getSessions, saveProfile, type LoggedSession, type Profile } from "../../src/services/trainingStore";
import { Button, Card, Chip, Empty, Label, Row, Screen, Title, Wrap } from "../../src/ui/components";
import { muscle, shortDate } from "../../src/ui/format";
import { colors, type } from "../../src/ui/theme";

const BIAS_TEXT: Record<string, string> = {
  lengthened: "Hardest when the muscle is stretched — great for growth.",
  mid: "Even tension through the middle of the range.",
  shortened: "Hardest at the squeeze — pairs well with a stretch-focused move.",
};

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = getExercise(id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<LoggedSession[]>([]);

  useEffect(() => {
    getProfile().then(setProfile);
    getSessions().then(setSessions);
  }, []);

  if (!exercise) {
    return (
      <Screen>
        <Empty title="Exercise not found" action={<Button title="Back" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const last = lastPerformance(exercise.id, sessions);
  const alternatives = profile ? findAlternatives(exercise.id, profileContext(profile), { reason: "dislike", limit: 4 }) : [];
  const isFavorite = profile?.favorites.includes(exercise.id);
  const isDisliked = profile?.disliked.includes(exercise.id);

  const toggle = async (field: "favorites" | "disliked") => {
    if (!profile) return;
    const list = profile[field];
    const next = { ...profile, [field]: list.includes(exercise.id) ? list.filter((x) => x !== exercise.id) : [...list, exercise.id] };
    setProfile(next);
    await saveProfile(next);
  };

  return (
    <Screen footer={<Button title="Back" variant="secondary" onPress={() => router.back()} />}>
      <Title kicker={PATTERN_LABELS[exercise.pattern] ?? exercise.pattern}>{exercise.name}</Title>

      {exercise.cue ? (
        <Card>
          <Label>How to</Label>
          <Text style={type.body}>{exercise.cue}</Text>
        </Card>
      ) : null}

      <Card>
        <Label>Muscles</Label>
        <Wrap>
          {exercise.primary.map((m) => (
            <Chip key={m} label={muscle(m)} selected />
          ))}
          {exercise.secondary.map((m) => (
            <Chip key={m} label={muscle(m)} />
          ))}
        </Wrap>
        <Text style={type.small}>{BIAS_TEXT[exercise.bias]}</Text>
      </Card>

      <Card>
        <Label>Details</Label>
        <Text style={type.body}>
          Equipment:{" "}
          {exercise.equipment.length ? exercise.equipment.map((q) => EQUIPMENT[q as keyof typeof EQUIPMENT]).join(", ") : "None"}
        </Text>
        <Text style={type.body}>Level: {exercise.level}</Text>
        {exercise.joints.length ? (
          <Text style={type.body}>Joint stress: {exercise.joints.map((j) => JOINTS[j as keyof typeof JOINTS]).join(", ")}</Text>
        ) : null}
      </Card>

      {last ? (
        <Card>
          <Label>Last time · {shortDate(last.date)}</Label>
          <Text style={type.body}>{last.sets.map((s) => (s.weight ? `${s.weight}×${s.reps}` : `${s.reps} reps`)).join("  ·  ")}</Text>
        </Card>
      ) : null}

      {profile ? (
        <Row>
          <Button title={isFavorite ? "★ Favourite" : "☆ Favourite"} variant="secondary" onPress={() => toggle("favorites")} style={{ flex: 1 }} />
          <Button
            title={isDisliked ? "Allow again" : "Don't suggest"}
            variant={isDisliked ? "secondary" : "danger"}
            onPress={() => toggle("disliked")}
            style={{ flex: 1 }}
          />
        </Row>
      ) : null}

      {alternatives.length ? (
        <>
          <Label>Similar exercises</Label>
          {alternatives.map(({ exercise: alt, reasons }) => (
            <Card key={alt.id} onPress={() => router.push({ pathname: "/exercise/[id]", params: { id: alt.id } })}>
              <Text style={type.h3}>{alt.name}</Text>
              <Text style={[type.small, { color: colors.muted }]}>{reasons.join(" · ")}</Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
