import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";

import type { Achievement, Streaks } from "../engine";
import { Card, Label, Row } from "./components";
import { colors, fonts, radius, space, type } from "./theme";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** One-line streak summary for Today. */
export function StreakBar({ s, onPress }: { s: Streaks; onPress?: () => void }) {
  const left = Math.max(0, s.week.goal - s.week.thisWeek);
  const status = s.atRisk
    ? "Train today to keep your streak"
    : s.week.met
      ? "Weekly goal hit"
      : `${plural(left, "session")} to go this week`;
  return (
    <Card onPress={onPress} style={{ paddingVertical: space.md }}>
      <Row gap={space.md}>
        <Ionicons name={s.plan.current ? "flame" : "flame-outline"} size={28} color={s.atRisk ? colors.muted : colors.text} />
        <View style={{ flex: 1 }}>
          <Text style={type.strong}>
            {s.plan.current ? `${plural(s.plan.current, "day")} on plan` : "Start a streak today"}
            {s.week.current ? ` · ${plural(s.week.current, "week")} in a row` : ""}
          </Text>
          <Text style={type.small}>{status}</Text>
        </View>
        <WeekDots done={s.week.thisWeek} goal={s.week.goal} />
      </Row>
    </Card>
  );
}

function WeekDots({ done, goal }: { done: number; goal: number }) {
  return (
    <Row gap={4}>
      {Array.from({ length: goal }, (_, i) => (
        <View
          key={i}
          style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: i < done ? colors.accent : "transparent", borderWidth: 1, borderColor: colors.borderStrong }}
        />
      ))}
    </Row>
  );
}

const GROUP_ICON: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  Sessions: "checkmark-done",
  Consistency: "flame",
  Running: "walk",
  Distance: "map",
  Strength: "barbell",
  Mobility: "leaf",
  Fun: "sparkles",
  Nutrition: "nutrition",
};

export function Badge({ b, size = 64 }: { b: Achievement; size?: number }) {
  const earned = !!b.earnedAt;
  return (
    <View style={{ width: size + 24, alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: earned ? colors.accent : colors.surface,
          borderWidth: 1,
          borderColor: earned ? colors.accent : colors.border,
          opacity: earned ? 1 : 0.55,
        }}
      >
        <Ionicons name={GROUP_ICON[b.group] ?? "ribbon"} size={size * 0.42} color={earned ? colors.bg : colors.muted} />
      </View>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: earned ? colors.text : colors.faint, textAlign: "center" }} numberOfLines={2}>
        {b.title}
      </Text>
    </View>
  );
}

/** Streak numbers plus the most recent badges, for Profile. */
export function StreakSummary({ s, badges, onPress }: { s: Streaks; badges: Achievement[]; onPress?: () => void }) {
  const earned = badges.filter((b) => b.earnedAt).sort((a, b) => +new Date(b.earnedAt!) - +new Date(a.earnedAt!));
  const next = badges.filter((b) => !b.earnedAt).sort((a, b) => b.progress - a.progress)[0];
  return (
    <Card onPress={onPress}>
      <Row style={{ justifyContent: "space-between" }}>
        <Label>Streaks & badges</Label>
        <Text style={type.small}>
          {earned.length}/{badges.length} ›
        </Text>
      </Row>
      <Row style={{ alignItems: "stretch" }}>
        <Num value={s.plan.current} label="day streak" sub={`best ${s.plan.best}`} />
        <Num value={s.week.current} label="week streak" sub={`best ${s.week.best}`} />
        <Num value={s.food.current} label="days logging food" sub={`best ${s.food.best}`} />
      </Row>
      {earned.length ? (
        <Row gap={0} style={{ justifyContent: "flex-start" }}>
          {earned.slice(0, 4).map((b) => (
            <Badge key={b.id} b={b} size={48} />
          ))}
        </Row>
      ) : null}
      {next ? (
        <Text style={type.small}>
          Next: {next.title} — {next.desc.toLowerCase()} ({Math.round(next.progress * 100)}%)
        </Text>
      ) : null}
    </Card>
  );
}

function Num({ value, label, sub }: { value: number; label: string; sub: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 34, color: colors.text }}>{value}</Text>
      <Text style={[type.small, { color: colors.text }]}>{label}</Text>
      <Text style={[type.small, { color: colors.faint }]}>{sub}</Text>
    </View>
  );
}
