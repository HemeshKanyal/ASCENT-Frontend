import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Platform, Text, TextInput, View } from "react-native";

import { FOODS, fitsDiet, foodWarnings, searchFoods, type Food } from "../../src/engine";
import { selectFood, type SelectedFood } from "../../src/services/foodSelection";
import { MEALS, getCustomFoods, getRecentFoods, type Meal } from "../../src/services/nutritionStore";
import { PACKAGED_SEARCH_AVAILABLE, searchOpenFoodFacts } from "../../src/services/openFoodFacts";
import { getProfile, type Profile } from "../../src/services/trainingStore";
import { Button, Card, Label, Loading, Row, Screen, Title } from "../../src/ui/components";
import { colors, fonts, radius, space, type } from "../../src/ui/theme";

function FoodRow({ food, conditions, onPress }: { food: SelectedFood; conditions: string[]; onPress: () => void }) {
  const warnings = foodWarnings(food, conditions);
  return (
    <Card onPress={onPress} style={{ paddingVertical: space.md, gap: 2 }}>
      <Text style={type.h3} numberOfLines={2}>
        {food.name}
      </Text>
      <Text style={type.small}>
        {food.brand ? `${food.brand} · ` : ""}
        {food.per100.kcal} kcal · {food.per100.protein} g protein per 100 g
      </Text>
      {warnings.length ? <Text style={[type.small, { color: colors.text }]}>⚠ {warnings[0]}</Text> : null}
    </Card>
  );
}

export default function AddFood() {
  const params = useLocalSearchParams<{ meal: Meal; day: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<Food[]>([]);
  const [custom, setCustom] = useState<Food[]>([]);
  // Results are tagged with the query they belong to, so stale ones never show.
  const [remote, setRemote] = useState<{ q: string; foods: SelectedFood[]; error?: boolean } | null>(null);

  useEffect(() => {
    getProfile().then(setProfile);
    getRecentFoods().then(setRecent);
    getCustomFoods().then(setCustom);
  }, []);

  // Packaged foods from Open Food Facts, debounced.
  const q = query.trim();
  useEffect(() => {
    if (q.length < 3 || !PACKAGED_SEARCH_AVAILABLE) return;
    const t = setTimeout(() => {
      searchOpenFoodFacts(q)
        .then((foods) => setRemote({ q, foods }))
        .catch(() => setRemote({ q, foods: [], error: true }));
    }, 500);
    return () => clearTimeout(t);
  }, [q]);
  const remoteForQuery = remote?.q === q ? remote : null;

  const diet = profile?.food.dietType ?? "none";
  const allergies = useMemo(() => profile?.food.allergies ?? [], [profile]);
  const local = useMemo(() => {
    const all = searchFoods(query, [...custom, ...FOODS]);
    const fits = all.filter((f) => fitsDiet(f, diet, allergies));
    return { fits, hidden: all.length - fits.length };
  }, [query, custom, diet, allergies]);

  if (!profile) return <Loading />;
  const conditions = profile.health.conditions;
  const mealLabel = MEALS.find((m) => m.id === params.meal)?.label ?? "Food";

  const pick = (food: SelectedFood) => {
    selectFood(food);
    router.push({ pathname: "/food/portion", params });
  };

  return (
    <Screen footer={<Button title="Close" variant="ghost" onPress={() => router.back()} />}>
      <Title kicker="Add food">{mealLabel}</Title>
      <TextInput
        value={query}
        onChangeText={setQuery}
        autoFocus
        placeholder="Search — e.g. paneer, oats, greek yogurt"
        placeholderTextColor={colors.faint}
        style={{
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
      <Row>
        <Button
          title="Scan barcode"
          variant="secondary"
          compact
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: "/food/scan", params })}
          disabled={Platform.OS === "web"}
        />
        <Button title="Quick add" variant="secondary" compact style={{ flex: 1 }} onPress={() => router.push({ pathname: "/food/custom", params })} />
      </Row>

      {!query && recent.length ? (
        <View style={{ gap: space.sm }}>
          <Label>Recent</Label>
          {recent.slice(0, 8).map((f) => (
            <FoodRow key={f.id} food={f} conditions={conditions} onPress={() => pick(f)} />
          ))}
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Label>{query ? "Matches" : "Common foods"}</Label>
        {local.fits.slice(0, query ? 30 : 15).map((f) => (
          <FoodRow key={f.id} food={f} conditions={conditions} onPress={() => pick(f)} />
        ))}
        {query && !local.fits.length ? <Text style={type.small}>Nothing in the built-in list.</Text> : null}
        {local.hidden ? (
          <Text style={[type.small, { color: colors.faint }]}>Hiding {local.hidden} that don&apos;t fit your diet or allergies.</Text>
        ) : null}
      </View>

      {query.trim().length >= 3 ? (
        <View style={{ gap: space.sm }}>
          <Label>Packaged foods · Open Food Facts</Label>
          {!PACKAGED_SEARCH_AVAILABLE ? (
            <Text style={type.small}>Packaged-food search works in the phone app. Here, use the built-in foods or Quick add.</Text>
          ) : !remoteForQuery ? (
            <Text style={type.small}>Searching…</Text>
          ) : null}
          {remoteForQuery?.error ? <Text style={type.small}>Couldn&apos;t reach Open Food Facts — check your connection.</Text> : null}
          {remoteForQuery && !remoteForQuery.error && !remoteForQuery.foods.length ? <Text style={type.small}>No packaged matches.</Text> : null}
          {(remoteForQuery?.foods ?? [])
            .filter((f) => fitsDiet(f, diet, allergies))
            .map((f) => (
              <FoodRow key={f.id} food={f} conditions={conditions} onPress={() => pick(f)} />
            ))}
        </View>
      ) : null}
    </Screen>
  );
}
