import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { defaultSplitId, getProfile, saveProfile, type Profile } from "../../src/services/trainingStore";
import { Button, Loading, Row, Screen, Title } from "../../src/ui/components";
import {
  BodyForm,
  FoodPrefsForm,
  ConditionsForm,
  GoalPicker,
  LevelPicker,
  PlacePicker,
  SchedulePicker,
  ScreeningForm,
  SplitPicker,
} from "../../src/ui/editors";

const TITLES: Record<string, string> = {
  level: "Experience",
  goals: "Goals",
  places: "Where you train",
  schedule: "Your week",
  split: "Split",
  health: "Health",
  body: "Your body",
  food: "Food preferences",
};

export default function EditSection() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const [original, setOriginal] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile | null>(null);

  useEffect(() => {
    getProfile().then((p) => {
      setOriginal(p);
      setDraft(p);
    });
  }, []);

  if (!draft || !original) return <Loading />;

  const set = (patch: Partial<Profile>) => setDraft({ ...draft, ...patch });

  const valid =
    draft.goals.length > 0 && draft.places.length > 0 && draft.trainingDays.length > 0;

  const save = async () => {
    let next = draft;
    // If they were on the recommended split, keep it recommended for the new schedule/level.
    const wasRecommended = original.splitId === defaultSplitId(original.trainingDays.length, original.level);
    if (section !== "split" && wasRecommended) {
      next = { ...next, splitId: defaultSplitId(next.trainingDays.length, next.level) };
    }
    await saveProfile(next);
    router.back();
  };

  return (
    <Screen
      footer={
        <Row>
          <Button title="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button title="Save" onPress={save} disabled={!valid} style={{ flex: 2 }} />
        </Row>
      }
    >
      <Title kicker="Edit">{TITLES[section] ?? section}</Title>

      {section === "level" && <LevelPicker value={draft.level} onChange={(level) => set({ level })} />}

      {section === "body" && <BodyForm body={draft.body} onChange={(body) => set({ body })} />}

      {section === "food" && <FoodPrefsForm food={draft.food} onChange={(food) => set({ food })} />}

      {section === "goals" && (
        <GoalPicker goals={draft.goals} primaryGoal={draft.primaryGoal} onChange={(goals, primaryGoal) => set({ goals, primaryGoal })} />
      )}

      {section === "places" && (
        <PlacePicker
          places={draft.places}
          placeEquipment={draft.placeEquipment}
          onChange={(places, placeEquipment) => set({ places, placeEquipment })}
        />
      )}

      {section === "schedule" && (
        <SchedulePicker
          days={draft.trainingDays}
          minutes={draft.sessionMinutes}
          level={draft.level}
          onChange={(trainingDays, sessionMinutes) => set({ trainingDays, sessionMinutes })}
        />
      )}

      {section === "split" && (
        <SplitPicker
          value={draft.splitId}
          recommended={defaultSplitId(draft.trainingDays.length, draft.level)}
          onChange={(splitId) => set({ splitId })}
        />
      )}

      {section === "health" && (
        <>
          <ScreeningForm health={draft.health} onChange={(health) => set({ health })} />
          <Title kicker="Conditions & joints">Details</Title>
          <ConditionsForm health={draft.health} injuries={draft.injuries} onChange={(health, injuries) => set({ health, injuries })} />
        </>
      )}
    </Screen>
  );
}
