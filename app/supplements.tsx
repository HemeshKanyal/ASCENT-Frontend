import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { NUTRIENT_BY_KEY, SUPPLEMENTS, fitsDiet, supplementWarnings } from "../src/engine";
import { getStack, saveStack, type StackItem } from "../src/services/nutritionStore";
import { getProfile, type Profile } from "../src/services/trainingStore";
import { Button, Card, Label, Loading, Note, Row, Screen, Title } from "../src/ui/components";
import { colors, space, type } from "../src/ui/theme";

const CATEGORIES = ["Protein", "Performance", "Health", "Vitamins", "Minerals", "Other"];

export default function Supplements() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stack, setStack] = useState<StackItem[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    getProfile().then(setProfile);
    getStack().then(setStack);
  }, []);

  if (!profile) return <Loading />;
  const conditions = profile.health.conditions;

  const update = async (next: StackItem[]) => {
    setStack(next);
    await saveStack(next);
  };
  const qtyOf = (id: string) => stack.find((s) => s.id === id)?.qty ?? 0;
  const setQty = (id: string, qty: number) =>
    update(qty <= 0 ? stack.filter((s) => s.id !== id) : stack.some((s) => s.id === id) ? stack.map((s) => (s.id === id ? { ...s, qty } : s)) : [...stack, { id, qty }]);

  return (
    <Screen footer={<Button title="Done" onPress={() => router.back()} />}>
      <Title kicker="Fuel">Your supplement stack</Title>
      <Text style={type.small}>
        Add what you take, then tick it off each day on the Fuel tab — protein, vitamins and minerals count toward your totals. Supplements fill gaps; they don&apos;t replace food.
      </Text>

      {CATEGORIES.map((cat) => (
        <View key={cat} style={{ gap: space.sm }}>
          <Label>{cat}</Label>
          {SUPPLEMENTS.filter((s) => s.category === cat).map((s) => {
            const qty = qtyOf(s.id);
            const warnings = supplementWarnings(s, conditions);
            const fits = fitsDiet(s, profile.food.dietType, profile.food.allergies);
            const contents = [
              s.per.protein ? `${s.per.protein} g protein` : null,
              ...Object.entries(s.micros).map(([k, v]) => `${v} ${NUTRIENT_BY_KEY[k]?.unit ?? ""} ${NUTRIENT_BY_KEY[k]?.label.toLowerCase() ?? k}`),
            ].filter(Boolean);
            return (
              <Card key={s.id} active={qty > 0} onPress={() => setOpen(open === s.id ? null : s.id)}>
                <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3}>{s.name}</Text>
                    <Text style={type.small}>{s.serving}</Text>
                  </View>
                  {qty > 0 ? (
                    <Row gap={4}>
                      <Button title="−" compact variant="secondary" onPress={() => setQty(s.id, qty - 1)} />
                      <Text style={[type.strong, { minWidth: 22, textAlign: "center" }]}>{qty}</Text>
                      <Button title="+" compact variant="secondary" onPress={() => setQty(s.id, qty + 1)} />
                    </Row>
                  ) : (
                    <Button title="Add" compact variant="secondary" onPress={() => setQty(s.id, 1)} />
                  )}
                </Row>
                {!fits ? <Text style={[type.small, { color: colors.text }]}>Doesn&apos;t match your diet or allergies.</Text> : null}
                {warnings.map((w) => (
                  <Note key={w}>{w}</Note>
                ))}
                {open === s.id ? (
                  <>
                    <Text style={type.body}>{s.about}</Text>
                    {contents.length ? <Text style={type.small}>Per serving: {contents.join(" · ")}</Text> : null}
                  </>
                ) : null}
              </Card>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}
