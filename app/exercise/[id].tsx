import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { EQUIPMENT, JOINTS, PATTERN_LABELS, demoIdFor, exerciseMuscles, findAlternatives, getExercise, lastPerformance, profileContext } from "../../src/engine";
import { EXERCISE_HOWTO } from "../../src/data/howto";
import { getProfile, getSessions, saveProfile, type LoggedSession, type Profile } from "../../src/services/trainingStore";
import { BodyMap } from "../../src/ui/BodyMap";
import { ExerciseDemo } from "../../src/ui/ExerciseDemo";
import { Button, Card, Empty, Label, Row, Screen, Title } from "../../src/ui/components";
import { shortDate } from "../../src/ui/format";
import { colors, fonts, space, type } from "../../src/ui/theme";
import { WatchButton, youtubeQuery } from "../../src/ui/youtube";

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

  const howTo = EXERCISE_HOWTO[exercise.id];
  const demoId = demoIdFor(exercise);
  const worked = exerciseMuscles(exercise);
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

      {demoId ? <ExerciseDemo motionId={demoId} primary={worked.primary} secondary={worked.secondary} /> : null}

      {howTo ? (
        <Card>
          <Label>How to</Label>
          {howTo.steps.map((step, i) => (
            <View key={step} style={{ flexDirection: "row", gap: space.sm }}>
              <Text style={[type.strong, { fontFamily: fonts.heavy, width: 18 }]}>{i + 1}</Text>
              <Text style={[type.body, { flex: 1 }]}>{step}</Text>
            </View>
          ))}
          {exercise.cue ? <Text style={[type.small, { fontStyle: "italic" }]}>Key cue: {exercise.cue}</Text> : null}
        </Card>
      ) : exercise.cue ? (
        <Card>
          <Label>How to</Label>
          <Text style={type.body}>{exercise.cue}</Text>
        </Card>
      ) : null}

      {howTo?.mistakes.length ? (
        <Card>
          <Label>Common mistakes</Label>
          {howTo.mistakes.map((m) => (
            <Text key={m} style={type.body}>
              ✕ {m}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card>
        <Label>Muscles worked</Label>
        <BodyMap primary={worked.primary} secondary={worked.secondary} />
        <Text style={type.small}>{BIAS_TEXT[exercise.bias]}</Text>
      </Card>

      <WatchButton id={exercise.id} query={youtubeQuery("exercise", exercise.name)} />

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
