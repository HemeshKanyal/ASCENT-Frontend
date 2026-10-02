import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";

import type { PlannedDay } from "../engine";
import { WEEKDAYS, dateKey, todayWeekday, type LoggedSession } from "../services/trainingStore";
import { dayIcon } from "./sessionMeta";
import { colors, fonts, radius } from "./theme";

/** Mon–Sun with what each day is for, a tick where something was logged, today outlined. */
export function WeekStrip({ plan, sessions, today = todayWeekday() }: { plan: Record<string, PlannedDay>; sessions: LoggedSession[]; today?: string }) {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const done = new Set(sessions.map((s) => dateKey(new Date(s.date))));

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      {WEEKDAYS.map((d, i) => {
        const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
        const isToday = d.id === today;
        const logged = done.has(dateKey(date));
        const planned = plan[d.id];
        return (
          <View key={d.id} style={{ alignItems: "center", gap: 6 }}>
            <Text style={{ fontFamily: fonts.heavy, fontSize: 11, color: isToday ? colors.text : colors.faint }}>{d.short}</Text>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: logged ? colors.accent : planned ? colors.surfaceAlt : "transparent",
                borderWidth: isToday ? 1.5 : 1,
                borderColor: isToday ? colors.accent : colors.border,
              }}
            >
              {logged ? (
                <Ionicons name="checkmark" size={18} color={colors.onAccent} />
              ) : (
                <Ionicons name={dayIcon(planned)} size={17} color={planned ? colors.text : colors.faint} />
              )}
            </View>
            <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: colors.faint }}>{date.getDate()}</Text>
          </View>
        );
      })}
    </View>
  );
}
