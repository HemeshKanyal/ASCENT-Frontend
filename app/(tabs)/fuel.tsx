import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { NUTRIENTS, SUPPLEMENT_BY_ID, entryNutrients, foodWarnings, suggestFoods, FOOD_BY_ID } from "../../src/engine";
import {
  MEALS,
  addEntry,
  addWater,
  copyMeal,
  getDayEntries,
  getWeights,
  loadDay,
  logWeight,
  removeEntry,
  setSupplementTaken,
  getStack,
  weightTrend,
  type StackItem,
  type DayNutrition,
  type Meal,
  type WeightEntry,
} from "../../src/services/nutritionStore";
import { dateKey } from "../../src/services/trainingStore";
import { Button, Card, Label, Loading, Note, ProgressBar, Row, Screen, Title } from "../../src/ui/components";
import { dayLabel } from "../../src/ui/sessionMeta";
import { colors, fonts, radius, space, type } from "../../src/ui/theme";

const shiftDay = (day: string, by: number) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + by);
  return dateKey(d);
};

const mealForNow = (): Meal => {
  const h = new Date().getHours();
  return h < 11 ? "breakfast" : h < 16 ? "lunch" : h < 21 ? "dinner" : "snacks";
};

function MacroRow({ label, eaten, target, unit = "g" }: { label: string; eaten: number; target: number; unit?: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={type.strong}>{label}</Text>
        <Text style={type.small}>
          {Math.round(eaten)} / {target} {unit}
        </Text>
      </Row>
      <ProgressBar value={target ? eaten / target : 0} />
    </View>
  );
}

export default function FuelScreen() {
  const [day, setDay] = useState(dateKey());
  const [data, setData] = useState<DayNutrition | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [yesterdayMeals, setYesterdayMeals] = useState<Set<Meal>>(new Set());
  const [stack, setStack] = useState<StackItem[]>([]);

  const load = useCallback(async () => {
    setData(await loadDay(day));
    setWeights(await getWeights());
    const prev = await getDayEntries(shiftDay(day, -1));
    setYesterdayMeals(new Set(prev.map((e) => e.meal).filter((m): m is Meal => m !== "supplements")));
    setStack(await getStack());
  }, [day]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!data) return <Loading />;
  const { targets, eaten, entries, profile, water, plannedDay, micros, refs } = data;
  const goals = NUTRIENTS.filter((n) => refs[n.key]?.kind === "goal")
    .map((n) => ({ n, pct: (micros.totals[n.key] ?? 0) / refs[n.key].amount }))
    .sort((a, b) => a.pct - b.pct);
  const overLimits = NUTRIENTS.filter((n) => refs[n.key]?.kind === "limit" && (micros.totals[n.key] ?? 0) > refs[n.key].amount);
  const isToday = day === dateKey();
  const remaining = targets ? { kcal: targets.kcal - eaten.kcal, protein: targets.protein - eaten.protein } : null;
  const suggestions =
    remaining && isToday
      ? suggestFoods({
          remaining,
          dietType: profile.food.dietType,
          allergies: profile.food.allergies,
          conditions: profile.health.conditions,
        })
      : [];
  const trend = weightTrend(weights);
  const dayText = isToday ? "Today" : day === shiftDay(dateKey(), -1) ? "Yesterday" : new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  return (
    <Screen>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <Title kicker={plannedDay ? `${dayLabel(plannedDay)} day` : "Rest day"}>Fuel</Title>
        <Row gap={4} style={{ marginBottom: 8 }}>
          <Pressable onPress={() => setDay(shiftDay(day, -1))} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[type.strong, { minWidth: 90, textAlign: "center" }]}>{dayText}</Text>
          <Pressable onPress={() => !isToday && setDay(shiftDay(day, 1))} hitSlop={10} disabled={isToday}>
            <Ionicons name="chevron-forward" size={22} color={isToday ? colors.faint : colors.text} />
          </Pressable>
        </Row>
      </Row>

      {targets ? (
        <Card active>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Text style={{ fontFamily: fonts.serif, fontSize: 56, lineHeight: 60, color: colors.text }}>
                {Math.abs(remaining!.kcal).toLocaleString()}
              </Text>
              <Text style={type.small}>{remaining!.kcal >= 0 ? "kcal left" : "kcal over"}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={type.strong}>{targets.kcal.toLocaleString()} target</Text>
              <Text style={type.small}>{eaten.kcal.toLocaleString()} eaten</Text>
              {targets.trainingKcal ? <Text style={type.small}>incl. +{targets.trainingKcal} for training</Text> : null}
            </View>
          </Row>
          <ProgressBar value={eaten.kcal / targets.kcal} />
          <MacroRow label="Protein" eaten={eaten.protein} target={targets.protein} />
          <MacroRow label="Carbs" eaten={eaten.carbs} target={targets.carbs} />
          <MacroRow label="Fat" eaten={eaten.fat} target={targets.fat} />
          <MacroRow label="Fibre" eaten={eaten.fiber} target={targets.fiber} />
        </Card>
      ) : (
        <Card onPress={() => router.push("/edit/body")} active>
          <Text style={type.h3}>Add your body stats to get targets</Text>
          <Text style={type.small}>Height, weight, birth year and sex let ASCENT work out calories and macros that change with your training. Tap to add.</Text>
        </Card>
      )}

      <Card>
        <Label>Log a meal fast</Label>
        <Row gap={space.sm}>
          {(
            [
              { icon: "barcode-outline", label: "Scan", go: () => router.push({ pathname: "/food/scan", params: { day, meal: mealForNow() } }) },
              { icon: "camera-outline", label: "Photo", go: () => router.push({ pathname: "/food/photo", params: { day, meal: mealForNow(), source: "camera" } }) },
              { icon: "image-outline", label: "Upload", go: () => router.push({ pathname: "/food/photo", params: { day, meal: mealForNow(), source: "library" } }) },
              { icon: "chatbubble-ellipses-outline", label: "Describe", go: () => router.push({ pathname: "/food/describe", params: { day, meal: mealForNow() } }) },
            ] as const
          ).map((o) => (
            <Pressable
              key={o.label}
              onPress={o.go}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: "center",
                gap: 6,
                paddingVertical: space.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: pressed ? colors.raised : colors.surfaceAlt,
              })}
            >
              <Ionicons name={o.icon} size={24} color={colors.text} />
              <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.text }}>{o.label}</Text>
            </Pressable>
          ))}
        </Row>
        <Text style={type.small}>Photo or upload: AI spots each dish and estimates portions — no weighing scale needed.</Text>
      </Card>

      {targets?.notes.map((n) => <Note key={n}>{n}</Note>)}

      {suggestions.length && remaining && remaining.protein >= 15 ? (
        <Card>
          <Label>Close the protein gap · {Math.round(remaining.protein)} g to go</Label>
          {suggestions.map((s) => (
            <Row key={s.food.id} style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={type.body}>
                  {s.grams} g {s.food.name.toLowerCase()}
                </Text>
                <Text style={type.small}>
                  +{s.protein} g protein · {s.kcal} kcal
                </Text>
              </View>
              <Button
                title="+ Add"
                compact
                variant="secondary"
                onPress={async () => {
                  await addEntry(day, s.food, s.grams, mealForNow());
                  load();
                }}
              />
            </Row>
          ))}
        </Card>
      ) : null}

      {targets ? (
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <Label>Water</Label>
            <Text style={type.small}>
              {(water / 1000).toFixed(2)} / {(targets.waterMl / 1000).toFixed(1)} L
            </Text>
          </Row>
          <ProgressBar value={water / targets.waterMl} />
          <Row>
            {[-250, 250, 500].map((ml) => (
              <Button
                key={ml}
                title={ml > 0 ? `+${ml} ml` : "−250"}
                compact
                variant="secondary"
                style={{ flex: ml > 0 ? 1 : undefined }}
                onPress={async () => {
                  await addWater(day, ml);
                  load();
                }}
              />
            ))}
          </Row>
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>Supplements</Label>
          <Pressable onPress={() => router.push("/supplements")} hitSlop={8}>
            <Text style={[type.small, { color: colors.text, fontFamily: fonts.semibold }]}>{stack.length ? "Manage" : "Add"}</Text>
          </Pressable>
        </Row>
        {stack.length ? (
          stack.map((item) => {
            const supp = SUPPLEMENT_BY_ID[item.id];
            if (!supp) return null;
            const taken = entries.some((e) => e.supplementId === item.id);
            return (
              <Pressable
                key={item.id}
                onPress={async () => {
                  await setSupplementTaken(day, item.id, item.qty, !taken);
                  load();
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 4 }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: taken ? colors.accent : colors.borderStrong,
                    backgroundColor: taken ? colors.accent : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {taken ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={type.body}>{supp.name}</Text>
                  <Text style={type.small}>{item.qty === 1 ? supp.serving : `${item.qty} × ${supp.serving}`}</Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Text style={type.small}>Whey, creatine, fish oil, vitamin D… set up your stack and tick them off each day.</Text>
        )}
      </Card>

      <Card onPress={() => router.push({ pathname: "/nutrients", params: { day } })}>
        <Row style={{ justifyContent: "space-between" }}>
          <Label>Vitamins & minerals</Label>
          <Text style={[type.small, { color: colors.text, fontFamily: fonts.semibold }]}>All ›</Text>
        </Row>
        {entries.length ? (
          <>
            {goals.slice(0, 3).map(({ n, pct }) => (
              <View key={n.key} style={{ gap: 4 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={type.strong}>{n.label}</Text>
                  <Text style={type.small}>{Math.round(pct * 100)}% of daily</Text>
                </Row>
                <ProgressBar value={pct} />
              </View>
            ))}
            {overLimits.map((n) => (
              <Text key={n.key} style={[type.small, { color: colors.text }]}>
                ▲ {n.label} over today&apos;s limit ({Math.round(micros.totals[n.key] ?? 0)} / {refs[n.key].amount} {n.unit})
              </Text>
            ))}
            {micros.coverage < 0.9 ? (
              <Text style={[type.small, { color: colors.faint }]}>Based on {Math.round(micros.coverage * 100)}% of today&apos;s calories — some foods have no vitamin data.</Text>
            ) : null}
          </>
        ) : (
          <Text style={type.small}>Log food to see vitamins, minerals, sugar, sodium and more.</Text>
        )}
      </Card>

      {MEALS.map((m) => {
        const items = entries.filter((e) => e.meal === m.id);
        const kcal = items.reduce((n, e) => n + entryNutrients(e).kcal, 0);
        return (
          <Card key={m.id}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={type.h2}>{m.label}</Text>
              <Text style={type.small}>{kcal} kcal</Text>
            </Row>
            {items.map((e) => {
              const n = entryNutrients(e);
              const known = e.foodId ? FOOD_BY_ID[e.foodId] : undefined;
              const warnings = foodWarnings(known ?? { purine: e.purine as never, flags: e.flags ?? [], diet: e.diet as never, sodium: e.sodium }, profile.health.conditions);
              return (
                <Row key={e.id} style={{ justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={type.body}>{e.name}</Text>
                    <Text style={type.small}>
                      {e.servingLabel ? `${e.servingLabel} · ` : ""}
                      {e.grams} g · {n.kcal} kcal · {n.protein} g protein
                    </Text>
                    {warnings.map((w) => (
                      <Text key={w} style={[type.small, { color: colors.text }]}>
                        ⚠ {w}
                      </Text>
                    ))}
                  </View>
                  <Pressable
                    accessibilityLabel={`Remove ${e.name}`}
                    hitSlop={10}
                    onPress={async () => {
                      await removeEntry(day, e.id);
                      load();
                    }}
                  >
                    <Ionicons name="close" size={18} color={colors.faint} />
                  </Pressable>
                </Row>
              );
            })}
            <Row>
              <Button
                title="+ Add food"
                compact
                variant="secondary"
                onPress={() => router.push({ pathname: "/food/add", params: { meal: m.id, day } })}
              />
              {!items.length && yesterdayMeals.has(m.id) ? (
                <Button
                  title="Same as yesterday"
                  compact
                  variant="ghost"
                  onPress={async () => {
                    await copyMeal(shiftDay(day, -1), day, m.id);
                    load();
                  }}
                />
              ) : null}
            </Row>
          </Card>
        );
      })}

      <Card>
        <Label>Body weight</Label>
        {trend ? (
          <Row gap={space.lg}>
            <View>
              <Text style={type.number}>{trend.latest}</Text>
              <Text style={type.small}>kg latest</Text>
            </View>
            {trend.average != null ? (
              <View>
                <Text style={type.number}>{trend.average}</Text>
                <Text style={type.small}>7-day avg</Text>
              </View>
            ) : null}
            {trend.change != null ? (
              <View>
                <Text style={type.number}>
                  {trend.change > 0 ? "+" : ""}
                  {trend.change}
                </Text>
                <Text style={type.small}>vs last week</Text>
              </View>
            ) : null}
          </Row>
        ) : (
          <Text style={type.small}>Weigh in a few mornings a week — the 7-day average matters, not single days.</Text>
        )}
        <Row>
          <TextInput
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="decimal-pad"
            placeholder={profile.body.weightKg ? String(profile.body.weightKg) : "kg"}
            placeholderTextColor={colors.faint}
            style={{
              flex: 1,
              minWidth: 0,
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.text,
              padding: space.md,
              fontFamily: fonts.semibold,
              fontSize: 16,
            }}
          />
          <Button
            title="Log weight"
            compact
            disabled={!(Number(weightInput.replace(",", ".")) > 20)}
            onPress={async () => {
              await logWeight(Number(weightInput.replace(",", ".")), day);
              setWeightInput("");
              load();
            }}
          />
        </Row>
      </Card>
    </Screen>
  );
}
