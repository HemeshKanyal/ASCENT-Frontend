import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import type { LoggedSession } from "../services/trainingStore";
import { Row } from "./components";
import { colors, fonts, space, type } from "./theme";

const DAY_MS = 24 * 60 * 60 * 1000;
const CELL = 13;
const GAP = 3;

// Monochrome intensity scale by sets that day.
const SHADES = ["#161616", "#3A3A3A", "#6E6E6E", "#ABABAB", "#FFFFFF"];
const shade = (sets: number) => SHADES[sets === 0 ? 0 : sets < 10 ? 1 : sets < 18 ? 2 : sets < 26 ? 3 : 4];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function heatmapStats(sessions: LoggedSession[], now = new Date()) {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    const k = dayKey(new Date(s.date));
    // Lifting counts sets; runs, rides and flows count minutes (≈2.5 min per set-equivalent).
    const load = s.exercises.reduce((n, e) => n + e.sets.length, 0) + (s.kind && s.kind !== "strength" ? (s.durationMinutes ?? 0) / 2.5 : 0);
    byDay.set(k, (byDay.get(k) ?? 0) + Math.max(1, load));
  }

  // Week streak: consecutive Monday-weeks (ending this week or last) with at least one workout.
  const monday = (d: Date) => startOfDay(new Date(d.getTime() - ((d.getDay() + 6) % 7) * DAY_MS));
  const weeks = new Set(sessions.map((s) => monday(new Date(s.date)).getTime()));
  let cursor = monday(now).getTime();
  if (!weeks.has(cursor)) cursor -= 7 * DAY_MS;
  let weekStreak = 0;
  while (weeks.has(cursor)) {
    weekStreak++;
    cursor -= 7 * DAY_MS;
  }

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const thisYear = sessions.filter((s) => new Date(s.date) >= yearStart).length;
  return { byDay, weekStreak, thisYear, activeDays: byDay.size };
}

const LABEL_COL = 14;

/** Fills the available width with as many recent weeks as fit (up to `maxWeeks`). */
export function Heatmap({ sessions, maxWeeks = 26 }: { sessions: LoggedSession[]; maxWeeks?: number }) {
  const { byDay } = useMemo(() => heatmapStats(sessions), [sessions]);
  const [width, setWidth] = useState(0);
  const weeks = Math.max(1, Math.min(maxWeeks, Math.floor((width - LABEL_COL + GAP) / (CELL + GAP))));

  const columns = useMemo(() => {
    const today = startOfDay(new Date());
    const thisMonday = new Date(today.getTime() - ((today.getDay() + 6) % 7) * DAY_MS);
    const first = new Date(thisMonday.getTime() - (weeks - 1) * 7 * DAY_MS);
    return Array.from({ length: weeks }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = new Date(first.getTime() + (w * 7 + d) * DAY_MS);
        return { date, future: date > today, sets: byDay.get(dayKey(date)) ?? 0 };
      })
    );
  }, [byDay, weeks]);

  // A label where each month starts, skipping one that would crowd the previous label.
  const monthLabelAt = new Set<number>();
  let lastLabel = -Infinity;
  columns.forEach((col, w) => {
    const startsMonth = w === 0 || col[0].date.getMonth() !== columns[w - 1][0].date.getMonth();
    if (startsMonth && w - lastLabel >= 3) {
      monthLabelAt.add(w);
      lastLabel = w;
    }
  });
  if (columns.length > 1 && columns[1][0].date.getMonth() !== columns[0][0].date.getMonth()) {
    // The first column is a sliver of the previous month; label the new month instead.
    monthLabelAt.delete(0);
    monthLabelAt.add(1);
  }

  return (
    <View style={{ gap: space.sm }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <View>
          {/* Month labels in their own row, positioned over the week they start in. */}
          <View style={{ height: 14, marginLeft: LABEL_COL }}>
            {columns.map((col, w) =>
              monthLabelAt.has(w) ? (
                <Text
                  key={w}
                  style={{ position: "absolute", left: w * (CELL + GAP), fontSize: 10, color: colors.faint, fontFamily: fonts.bold }}
                >
                  {col[0].date.toLocaleDateString(undefined, { month: "short" })}
                </Text>
              ) : null
            )}
          </View>
          <View style={{ flexDirection: "row", gap: GAP }}>
            <View style={{ gap: GAP, width: LABEL_COL - GAP }}>
              {["M", "", "W", "", "F", "", "S"].map((l, i) => (
                <Text key={i} style={{ height: CELL, fontSize: 9, lineHeight: CELL, color: colors.faint, fontFamily: fonts.bold }}>
                  {l}
                </Text>
              ))}
            </View>
            {columns.map((col, w) => (
              <View key={w} style={{ gap: GAP }}>
                {col.map((cell, d) => (
                  <View
                    key={d}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: 3,
                      backgroundColor: cell.future ? "transparent" : shade(cell.sets),
                      borderWidth: cell.future ? 1 : 0,
                      borderColor: colors.surfaceAlt,
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <Row gap={4} style={{ justifyContent: "flex-end" }}>
        <Text style={[type.small, { fontSize: 11 }]}>Less</Text>
        {SHADES.map((c) => (
          <View key={c} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c }} />
        ))}
        <Text style={[type.small, { fontSize: 11 }]}>More</Text>
      </Row>
    </View>
  );
}
