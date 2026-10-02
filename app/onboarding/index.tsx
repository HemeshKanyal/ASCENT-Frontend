import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { EMPTY_HEALTH, type HealthProfile } from "../../src/data/health";
import { PLACES } from "../../src/data/places";
import {
  defaultSplitId,
  defaultTrainingDays,
  normalizeProfile,
  saveProfile,
  type Body,
  type FoodPrefs,
  type Level,
  type Weekday,
} from "../../src/services/trainingStore";
import { Button, Row, Screen, Title } from "../../src/ui/components";
import { BodyForm, ConditionsForm, FoodPrefsForm, GoalPicker, LevelPicker, PlacePicker, SchedulePicker, ScreeningForm } from "../../src/ui/editors";
import { colors, space, type } from "../../src/ui/theme";

const STEPS = [
  { id: "level", kicker: "Experience", title: "How long have you been training?" },
  { id: "body", kicker: "About you", title: "Your body" },
  { id: "goals", kicker: "Goals", title: "What are you training for?" },
  { id: "places", kicker: "Where", title: "Where do you train?" },
  { id: "schedule", kicker: "When", title: "Your week" },
  { id: "screening", kicker: "Readiness", title: "A few health questions" },
  { id: "conditions", kicker: "Health", title: "Anything we should know?" },
  { id: "food", kicker: "Food", title: "How do you eat?" },
] as const;

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<Level>("beginner");
  const [goals, setGoals] = useState<string[]>(["build_muscle"]);
  const [primaryGoal, setPrimaryGoal] = useState("build_muscle");
  const [places, setPlaces] = useState<string[]>(["commercial_gym"]);
  const [placeEquipment, setPlaceEquipment] = useState<Record<string, string[]>>({ commercial_gym: PLACES[0].equipment });
  const [days, setDays] = useState<Weekday[]>(defaultTrainingDays(3));
  const [minutes, setMinutes] = useState(60);
  const [health, setHealth] = useState<HealthProfile>(EMPTY_HEALTH);
  const [injuries, setInjuries] = useState<string[]>([]);
  const [body, setBody] = useState<Body>({});
  const [food, setFood] = useState<FoodPrefs>({ dietType: "none", allergies: [] });

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const canContinue =
    (current.id !== "goals" || goals.length > 0) &&
    (current.id !== "places" || places.length > 0) &&
    (current.id !== "schedule" || days.length > 0);

  const finish = async () => {
    await saveProfile(
      normalizeProfile({
        level,
        body,
        food,
        goals,
        primaryGoal,
        places,
        activePlace: places[0],
        placeEquipment,
        trainingDays: days,
        sessionMinutes: minutes,
        health,
        injuries,
        splitId: defaultSplitId(days.length, level),
      })
    );
    router.replace("/");
  };

  return (
    <Screen
      footer={
        <Row>
          {step > 0 ? <Button title="Back" variant="secondary" onPress={() => setStep(step - 1)} style={{ flex: 1 }} /> : null}
          <Button
            title={isLast ? "Build my plan" : "Continue"}
            disabled={!canContinue}
            onPress={isLast ? finish : () => setStep(step + 1)}
            style={{ flex: 2 }}
          />
        </Row>
      }
    >
      <View style={{ flexDirection: "row", gap: 6, marginBottom: space.md }}>
        {STEPS.map((s, i) => (
          <View key={s.id} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= step ? colors.accent : colors.border }} />
        ))}
      </View>

      {step === 0 ? <Text style={[type.h2, { color: colors.muted }]}>Ascent</Text> : null}
      <Title kicker={`Step ${step + 1} of ${STEPS.length} · ${current.kicker}`}>{current.title}</Title>

      {current.id === "level" && <LevelPicker value={level} onChange={setLevel} />}

      {current.id === "body" && <BodyForm body={body} onChange={setBody} />}

      {current.id === "food" && <FoodPrefsForm food={food} onChange={setFood} />}

      {current.id === "goals" && (
        <GoalPicker
          goals={goals}
          primaryGoal={primaryGoal}
          onChange={(g, p) => {
            setGoals(g);
            setPrimaryGoal(p);
          }}
        />
      )}

      {current.id === "places" && (
        <PlacePicker
          places={places}
          placeEquipment={placeEquipment}
          onChange={(p, eq) => {
            setPlaces(p);
            setPlaceEquipment(eq);
          }}
        />
      )}

      {current.id === "schedule" && (
        <SchedulePicker
          days={days}
          minutes={minutes}
          level={level}
          onChange={(d, m) => {
            setDays(d);
            setMinutes(m);
          }}
        />
      )}

      {current.id === "screening" && <ScreeningForm health={health} onChange={setHealth} />}

      {current.id === "conditions" && (
        <ConditionsForm
          health={health}
          injuries={injuries}
          onChange={(h, inj) => {
            setHealth(h);
            setInjuries(inj);
          }}
        />
      )}
    </Screen>
  );
}
