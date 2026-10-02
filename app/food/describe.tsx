import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, TextInput } from "react-native";

import { parseMeal } from "../../src/engine";
import { AI_ERROR_TEXT, analyzeMeal, toLoggable, type AIError } from "../../src/services/mealAI";
import { MealReview, totalsOf, type ReviewItem } from "../../src/ui/MealReview";
import { MEALS, addEntry, type Meal } from "../../src/services/nutritionStore";
import { getProfile } from "../../src/services/trainingStore";
import { Button, Chip, Label, Note, Row, Screen, Title, Wrap } from "../../src/ui/components";
import { colors, fonts, radius, space, type } from "../../src/ui/theme";


const EXAMPLES = ["rajma chawal with salad, 3 rotis and chaas", "2 eggs, 2 slices brown bread, 1 banana", "1 bowl dal, a small plate of rice, raita"];

export default function DescribeMeal() {
  const params = useLocalSearchParams<{ meal?: Meal; day: string }>();
  const [text, setText] = useState("");
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [asking, setAsking] = useState(false);
  const [aiError, setAiError] = useState<AIError | null>(null);

  const askAI = async () => {
    setAsking(true);
    setAiError(null);
    const r = await analyzeMeal({ hint: unknown.join(", ") });
    setAsking(false);
    if (!r.ok) return setAiError(r.error);
    setItems([...(items ?? []), ...toLoggable(r.result.items).map((i) => ({ ...i, on: true }))]);
    setUnknown([]);
  };
  const [unknown, setUnknown] = useState<string[]>([]);
  const [meal, setMeal] = useState<Meal>(params.meal ?? "lunch");
  const [conditions, setConditions] = useState<string[]>([]);

  const estimate = async () => {
    const r = parseMeal(text);
    setItems(r.items.map((i) => ({ ...i, on: true })));
    setUnknown(r.unknown);
    setConditions((await getProfile())?.health.conditions ?? []);
  };

  const chosen = (items ?? []).filter((i) => i.on);
  const total = totalsOf(items ?? []);

  const addAll = async () => {
    for (const i of chosen) await addEntry(params.day, i.food, i.grams, meal, i.label === "adjusted" ? undefined : i.label);
    router.dismissTo("/fuel");
  };

  return (
    <Screen
      footer={
        items ? (
          <Row>
            <Button title="Edit text" variant="secondary" onPress={() => setItems(null)} style={{ flex: 1 }} />
            <Button title={`Add ${chosen.length} · ${Math.round(total.kcal)} kcal`} disabled={!chosen.length} onPress={addAll} style={{ flex: 2 }} />
          </Row>
        ) : (
          <Button title="Estimate" disabled={!text.trim()} onPress={estimate} />
        )
      }
    >
      <Title kicker="Fuel · quick log">Describe your meal</Title>

      {!items ? (
        <>
          <Text style={type.small}>
            Write it like you&apos;d say it — no weighing scale needed. ASCENT matches dishes and estimates portions from bowls, katoris, plates, glasses and counts.
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            placeholder="e.g. rajma chawal with some salad, 3-4 rotis and a glass of chaas"
            placeholderTextColor={colors.faint}
            style={{
              minHeight: 120,
              textAlignVertical: "top",
              backgroundColor: colors.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              padding: space.md,
              fontSize: 16,
              fontFamily: fonts.regular,
            }}
          />
          <Label>Try</Label>
          <Wrap>
            {EXAMPLES.map((e) => (
              <Chip key={e} label={e} onPress={() => setText(e)} />
            ))}
          </Wrap>
        </>
      ) : (
        <>
          <MealReview items={items} onChange={setItems} conditions={conditions} />
          {unknown.length ? (
            <>
              <Note>Not in ASCENT&apos;s food list: {unknown.join(", ")}.</Note>
              <Button title={asking ? "Asking AI…" : "Ask AI to estimate these"} variant="secondary" disabled={asking} onPress={askAI} />
            </>
          ) : null}
          {aiError ? <Note>{AI_ERROR_TEXT[aiError]}</Note> : null}
          <Label>Meal</Label>
          <Wrap>
            {MEALS.map((m) => (
              <Chip key={m.id} label={m.label} selected={meal === m.id} onPress={() => setMeal(m.id)} />
            ))}
          </Wrap>
          <Text style={[type.small, { color: colors.faint }]}>
            Portions are estimates from typical home servings — adjust with − / + if yours was bigger or smaller.
          </Text>
        </>
      )}
    </Screen>
  );
}
