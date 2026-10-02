import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ACTIVITIES, ACTIVITY_CATEGORIES, AREAS, EQUIPMENT, EXERCISES, MOVES, MUSCLE_GROUPS } from "../../src/engine";
import { Card, Chip, Title } from "../../src/ui/components";
import { muscles } from "../../src/ui/format";
import { colors, fonts, radius, space, type } from "../../src/ui/theme";

type Section = "strength" | "mobility" | "activities";

const SECTIONS: Record<Section, string> = { strength: "Strength", mobility: "Yoga & mobility", activities: "Activities" };

const STRENGTH_GROUPS: Record<string, string> = { all: "All", chest: "Chest", back: "Back", shoulders: "Shoulders", arms: "Arms", legs: "Legs", core: "Core" };
const MOVE_STYLES: Record<string, string> = { all: "All", dynamic: "Warm-up", static: "Stretch", yoga: "Yoga", pilates: "Pilates", breath: "Breath" };
const ACTIVITY_GROUPS: Record<string, string> = { all: "All", ...ACTIVITY_CATEGORIES };

type Row = { key: string; title: string; sub: string; onPress: () => void };

export default function LibraryScreen() {
  const [section, setSection] = useState<Section>("strength");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filters = section === "strength" ? STRENGTH_GROUPS : section === "mobility" ? MOVE_STYLES : ACTIVITY_GROUPS;

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (section === "strength") {
      const groupMuscles = filter === "all" ? null : MUSCLE_GROUPS[filter as keyof typeof MUSCLE_GROUPS];
      return EXERCISES.filter((e) => {
        if (groupMuscles && !e.primary.some((m) => groupMuscles.includes(m))) return false;
        return !q || e.name.toLowerCase().includes(q) || e.primary.some((m) => m.includes(q));
      }).map((e) => ({
        key: e.id,
        title: e.name,
        sub: `${muscles(e.primary)} · ${e.equipment.length ? e.equipment.map((x) => EQUIPMENT[x]).join(", ") : "No equipment"}`,
        onPress: () => router.push({ pathname: "/exercise/[id]", params: { id: e.id } }),
      }));
    }
    if (section === "mobility") {
      return MOVES.filter((m) => (filter === "all" || m.style === filter) && (!q || m.name.toLowerCase().includes(q) || m.areas.some((a) => AREAS[a]?.toLowerCase().includes(q)))).map((m) => ({
        key: m.id,
        title: m.name,
        sub: `${MOVE_STYLES[m.style] ?? m.style} · ${m.areas.map((a) => AREAS[a]).join(", ")}`,
        onPress: () => router.push({ pathname: "/move/[id]", params: { id: m.id } }),
      }));
    }
    return ACTIVITIES.filter((a) => (filter === "all" || a.category === filter) && (!q || a.name.toLowerCase().includes(q))).map((a) => ({
      key: a.id,
      title: a.name,
      sub: `${ACTIVITY_CATEGORIES[a.category]} · ${a.record === "gps" ? "GPS tracking" : a.record === "laps" ? "Lap counter" : a.flow ? "Guided flow" : "Timer"}`,
      onPress: () => router.push({ pathname: "/guide/[id]", params: { id: a.id } }),
    }));
  }, [section, filter, query]);

  const count = section === "strength" ? EXERCISES.length : section === "mobility" ? MOVES.length : ACTIVITIES.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "left", "right"]}>
      {/* Plain black here: the list is long and a gradient behind a FlatList costs scroll performance. */}
      <View style={{ padding: space.lg, gap: space.md }}>
        <Title kicker={`${count} ${section === "strength" ? "exercises" : section === "mobility" ? "moves" : "activities"}`}>Library</Title>
        <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.pill, padding: 3, borderWidth: 1, borderColor: colors.border }}>
          {(Object.keys(SECTIONS) as Section[]).map((s) => (
            <Text
              key={s}
              onPress={() => {
                setSection(s);
                setFilter("all");
              }}
              style={{
                flex: 1,
                textAlign: "center",
                paddingVertical: 9,
                borderRadius: radius.pill,
                overflow: "hidden",
                fontFamily: fonts.bold,
                fontSize: 13,
                color: section === s ? colors.onAccent : colors.muted,
                backgroundColor: section === s ? colors.accent : "transparent",
              }}
            >
              {SECTIONS[s]}
            </Text>
          ))}
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={section === "strength" ? "Search by name or muscle" : section === "mobility" ? "Search moves or body areas" : "Search activities"}
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
          {Object.entries(filters).map(([id, label]) => (
            <Chip key={id} label={label} selected={filter === id} onPress={() => setFilter(id)} />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.sm }}
        renderItem={({ item }) => (
          <Card onPress={item.onPress} style={{ paddingVertical: space.md }}>
            <Text style={type.h3}>{item.title}</Text>
            <Text style={type.small}>{item.sub}</Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
