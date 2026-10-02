import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, TextInput } from "react-native";

import { MEALS, addEntry, saveCustomFood, type Meal } from "../../src/services/nutritionStore";
import { Button, Card, Chip, Label, Row, Screen, Title, Wrap } from "../../src/ui/components";
import { colors, fonts, radius, space, type } from "../../src/ui/theme";

const input = {
  backgroundColor: colors.surfaceAlt,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  padding: space.md,
  fontSize: 16,
  fontFamily: fonts.semibold,
};

const num = (v: string) => Number(v.replace(",", ".")) || 0;

export default function QuickAdd() {
  const params = useLocalSearchParams<{ meal: Meal; day: string }>();
  const [name, setName] = useState("");
  const [serving, setServing] = useState("100");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [meal, setMeal] = useState<Meal>(params.meal ?? "snacks");

  const valid = name.trim() && num(kcal) > 0 && num(serving) > 0;

  const save = async () => {
    const food = await saveCustomFood({
      name: name.trim(),
      servingGrams: num(serving),
      kcal: num(kcal),
      protein: num(protein),
      carbs: num(carbs),
      fat: num(fat),
    });
    await addEntry(params.day, food, num(serving), meal, "1 serving");
    router.dismissTo("/fuel");
  };

  const field = (label: string, value: string, set: (v: string) => void, placeholder: string, keyboard: "default" | "decimal-pad" = "decimal-pad") => (
    <>
      <Label>{label}</Label>
      <TextInput value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={colors.faint} keyboardType={keyboard} style={input} />
    </>
  );

  return (
    <Screen
      footer={
        <Row>
          <Button title="Back" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button title="Save & add" onPress={save} disabled={!valid} style={{ flex: 2 }} />
        </Row>
      }
    >
      <Title kicker="Quick add">Your own food</Title>
      <Text style={type.small}>Copy the numbers from the label or a recipe. It&apos;s saved so you can add it again in one tap.</Text>
      <Card>
        {field("Name", name, setName, "e.g. Mum's rajma chawal", "default")}
        {field("Serving size (g)", serving, setServing, "100")}
        {field("Calories per serving", kcal, setKcal, "kcal")}
        <Row gap={space.sm}>
          <Card style={{ flex: 1, padding: space.sm }}>{field("Protein g", protein, setProtein, "0")}</Card>
          <Card style={{ flex: 1, padding: space.sm }}>{field("Carbs g", carbs, setCarbs, "0")}</Card>
          <Card style={{ flex: 1, padding: space.sm }}>{field("Fat g", fat, setFat, "0")}</Card>
        </Row>
      </Card>
      <Label>Meal</Label>
      <Wrap>
        {MEALS.map((m) => (
          <Chip key={m.id} label={m.label} selected={meal === m.id} onPress={() => setMeal(m.id)} />
        ))}
      </Wrap>
    </Screen>
  );
}
