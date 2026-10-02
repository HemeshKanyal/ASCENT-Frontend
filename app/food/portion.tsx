import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { ALLERGENS, DIET_TYPES, entryNutrients, fitsDiet, foodWarnings } from "../../src/engine";
import { selectedFood } from "../../src/services/foodSelection";
import { MEALS, addEntry, type Meal } from "../../src/services/nutritionStore";
import { getProfile, type Profile } from "../../src/services/trainingStore";
import { Button, Card, Chip, Empty, Label, Loading, Note, Row, Screen, Stat, Title, Wrap } from "../../src/ui/components";
import { colors, fonts, radius, space, type } from "../../src/ui/theme";

export default function Portion() {
  const params = useLocalSearchParams<{ meal: Meal; day: string }>();
  const food = selectedFood();
  const [profile, setProfile] = useState<Profile | null>(null);
  const own = food?.servings ?? [];
  const servings: [string, number][] = own.some(([, q]) => q === 100) ? own : [...own, ["100 g", 100]];
  const [grams, setGrams] = useState(String(servings[0][1]));
  const [label, setLabel] = useState<string | undefined>(servings[0][0] === "100 g" ? undefined : servings[0][0]);
  const [meal, setMeal] = useState<Meal>(params.meal ?? "snacks");

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  if (!food) {
    return (
      <Screen>
        <Empty title="No food selected" action={<Button title="Back" onPress={() => router.back()} />} />
      </Screen>
    );
  }
  if (!profile) return <Loading />;

  const g = Number(grams.replace(",", ".")) || 0;
  const n = entryNutrients({ grams: g, per100: food.per100 });
  const warnings = foodWarnings(food, profile.health.conditions);
  const fits = fitsDiet(food, profile.food.dietType, profile.food.allergies);
  const clash = food.allergens.filter((a) => profile.food.allergies.includes(a)).map((a) => ALLERGENS[a] ?? a);

  const add = async () => {
    await addEntry(params.day, food, g, meal, label);
    router.dismissTo("/fuel");
  };

  return (
    <Screen
      footer={
        <Row>
          <Button title="Back" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button title={`Add ${n.kcal} kcal`} onPress={add} disabled={g <= 0} style={{ flex: 2 }} />
        </Row>
      }
    >
      <Title kicker={food.brand ?? (food.source === "off" ? "Packaged" : "Food")}>{food.name}</Title>

      {!fits ? (
        <Note>
          {clash.length ? `Contains ${clash.join(", ")} — on your allergy list.` : `Doesn't match your diet (${DIET_TYPES[profile.food.dietType]}).`}
        </Note>
      ) : null}
      {warnings.map((w) => (
        <Note key={w}>{w}</Note>
      ))}

      <Card>
        <Label>How much?</Label>
        <Wrap>
          {servings.map(([l, q]) => (
            <Chip
              key={l}
              label={l === "100 g" ? l : `${l} · ${q} g`}
              selected={Number(grams) === q && (label === l || (l === "100 g" && !label))}
              onPress={() => {
                setGrams(String(q));
                setLabel(l === "100 g" ? undefined : l);
              }}
            />
          ))}
        </Wrap>
        <Row>
          <TextInput
            value={grams}
            onChangeText={(v) => {
              setGrams(v);
              setLabel(undefined);
            }}
            keyboardType="decimal-pad"
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              padding: space.md,
              fontSize: 18,
              fontFamily: fonts.semibold,
            }}
          />
          <Text style={type.strong}>grams</Text>
        </Row>
      </Card>

      <Row gap={space.sm} style={{ alignItems: "stretch" }}>
        <Stat value={n.kcal} label="kcal" />
        <Stat value={n.protein} label="protein g" />
      </Row>
      <Row gap={space.sm} style={{ alignItems: "stretch" }}>
        <Stat value={n.carbs} label="carbs g" />
        <Stat value={n.fat} label="fat g" />
      </Row>

      <View style={{ gap: space.sm }}>
        <Label>Meal</Label>
        <Wrap>
          {MEALS.map((m) => (
            <Chip key={m.id} label={m.label} selected={meal === m.id} onPress={() => setMeal(m.id)} />
          ))}
        </Wrap>
      </View>
      {food.source === "off" ? (
        <Text style={[type.small, { color: colors.faint }]}>Data from Open Food Facts (crowd-sourced) — check the label if it looks off.</Text>
      ) : null}
    </Screen>
  );
}
