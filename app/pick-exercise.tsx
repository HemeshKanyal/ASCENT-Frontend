import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EQUIPMENT, EXERCISES, MUSCLE_GROUPS, isAllowed, profileContext } from "../src/engine";
import { addExercise, currentBalance, engineProfile, getProfile, type BalanceItem, type Profile } from "../src/services/trainingStore";
import { Button, Card, Chip, Title } from "../src/ui/components";
import { muscle, muscles } from "../src/ui/format";
import { colors, fonts, radius, space, type } from "../src/ui/theme";

const GROUPS: Record<string, string> = { all: "All", chest: "Chest", back: "Back", shoulders: "Shoulders", arms: "Arms", legs: "Legs", core: "Core" };

export default function PickExercise() {
  const { session } = useLocalSearchParams<{ session?: string }>();
  const inSession = session === "1";
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<BalanceItem[]>([]);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [onlyMine, setOnlyMine] = useState(true);

  useEffect(() => {
    getProfile().then(setProfile);
    currentBalance(inSession).then(setBalance);
  }, [inSession]);

  const status = useMemo(() => Object.fromEntries(balance.map((b) => [b.muscle, b.status])), [balance]);

  const list = useMemo(() => {
    if (!profile) return [];
    const ctx = profileContext(engineProfile(profile));
    const q = query.trim().toLowerCase();
    const groupMuscles = group === "all" ? null : MUSCLE_GROUPS[group as keyof typeof MUSCLE_GROUPS];
    return EXERCISES.filter((e) => {
      if (onlyMine && !isAllowed(e, ctx)) return false;
      if (groupMuscles && !e.primary.some((m) => groupMuscles.includes(m))) return false;
      return !q || e.name.toLowerCase().includes(q) || e.primary.some((m) => muscle(m).toLowerCase().includes(q));
    }).sort((a, b) => {
      // Exercises that help an under-trained muscle first, ones that pile onto an over-trained muscle last.
      const score = (e: (typeof EXERCISES)[number]) =>
        e.primary.some((m) => status[m] === "under") ? 0 : e.primary.some((m) => status[m] === "over") ? 2 : 1;
      return score(a) - score(b);
    });
  }, [profile, query, group, onlyMine, status]);

  const pick = async (id: string) => {
    await addExercise(id, inSession);
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      <View style={{ padding: space.lg, gap: space.md }}>
        <Title kicker={inSession ? "Add to this session" : "Add to today"}>Pick an exercise</Title>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or muscle"
          placeholderTextColor={colors.faint}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            color: colors.text,
            padding: space.md,
            fontSize: 15,
            fontFamily: fonts.regular,
          }}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {Object.entries(GROUPS).map(([id, label]) => (
            <Chip key={id} label={label} selected={group === id} onPress={() => setGroup(id)} />
          ))}
          <Chip label={onlyMine ? "My equipment" : "Everything"} selected={!onlyMine} onPress={() => setOnlyMine(!onlyMine)} />
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.sm }}
        renderItem={({ item }) => {
          const under = item.primary.filter((m) => status[m] === "under");
          const over = item.primary.filter((m) => status[m] === "over");
          return (
            <Card onPress={() => pick(item.id)} style={{ paddingVertical: space.md, gap: 2 }}>
              <Text style={type.h3}>{item.name}</Text>
              <Text style={type.small}>
                {muscles(item.primary)} ·{" "}
                {item.equipment.length ? item.equipment.map((q) => EQUIPMENT[q as keyof typeof EQUIPMENT]).join(", ") : "No equipment"}
              </Text>
              {under.length ? <Text style={[type.small, { color: colors.text }]}>▼ Helps {under.map(muscle).join(", ")} — behind this week</Text> : null}
              {over.length ? <Text style={[type.small, { color: colors.text }]}>▲ {over.map(muscle).join(", ")} already over this week</Text> : null}
            </Card>
          );
        }}
        ListFooterComponent={<Button title="Cancel" variant="ghost" onPress={() => router.back()} />}
      />
    </SafeAreaView>
  );
}
