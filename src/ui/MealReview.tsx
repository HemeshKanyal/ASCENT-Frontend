/** Review estimated foods before logging: toggle, nudge portions, see totals and warnings. */
import { Text, View } from "react-native";

import { entryNutrients, foodWarnings, type Food } from "../engine";
import { Button, Card, Row, Stat } from "./components";
import { colors, space, type } from "./theme";

export type ReviewItem = { food: Food & { source?: string }; grams: number; label: string; note?: string; on: boolean };

export function totalsOf(items: ReviewItem[]) {
  return items
    .filter((i) => i.on)
    .reduce(
      (t, i) => {
        const n = entryNutrients({ grams: i.grams, per100: i.food.per100 });
        return { kcal: t.kcal + n.kcal, protein: t.protein + n.protein };
      },
      { kcal: 0, protein: 0 }
    );
}

export function MealReview({ items, onChange, conditions }: { items: ReviewItem[]; onChange: (items: ReviewItem[]) => void; conditions: string[] }) {
  const total = totalsOf(items);
  const step = (i: number, dir: 1 | -1) =>
    onChange(
      items.map((it, k) => {
        if (k !== i) return it;
        const unit = Math.max(10, Math.round((it.food.servings[0]?.[1] ?? 100) / 4));
        return { ...it, grams: Math.max(unit, it.grams + dir * unit), label: "adjusted" };
      })
    );
  return (
    <View style={{ gap: space.md }}>
      <Row gap={space.sm} style={{ alignItems: "stretch" }}>
        <Stat value={Math.round(total.kcal)} label="kcal (estimate)" />
        <Stat value={Math.round(total.protein)} label="protein g" />
      </Row>
      {items.map((it, i) => {
        const n = entryNutrients({ grams: it.grams, per100: it.food.per100 });
        return (
          <Card key={i} active={it.on} onPress={() => onChange(items.map((x, k) => (k === i ? { ...x, on: !x.on } : x)))}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{it.food.name}</Text>
                <Text style={type.small}>
                  {it.label !== "adjusted" ? `${it.label} · ` : ""}≈ {it.grams} g · {n.kcal} kcal · {n.protein} g protein
                </Text>
              </View>
              <Row gap={4}>
                <Button title="−" compact variant="secondary" onPress={() => step(i, -1)} />
                <Button title="+" compact variant="secondary" onPress={() => step(i, 1)} />
              </Row>
            </Row>
            {it.note ? <Text style={[type.small, { color: colors.text }]}>{it.note}</Text> : null}
            {foodWarnings(it.food, conditions).map((w) => (
              <Text key={w} style={[type.small, { color: colors.text }]}>
                ⚠ {w}
              </Text>
            ))}
            {!it.on ? <Text style={type.small}>Not included — tap to add back.</Text> : null}
          </Card>
        );
      })}
    </View>
  );
}
