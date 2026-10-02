import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

import { DISCIPLINES, SESSION_TYPES, type PlannedDay } from "../engine";

type Icon = ComponentProps<typeof Ionicons>["name"];

const DISCIPLINE_ICONS: Record<string, Icon> = {
  run: "walk",
  bike: "bicycle",
  swim: "water",
  hyrox: "flame",
  conditioning: "flash",
};

export function dayIcon(day: PlannedDay | null | undefined): Icon {
  if (!day) return "moon-outline";
  if (day.kind === "strength") return "barbell";
  if (day.kind === "mobility") return "leaf";
  return DISCIPLINE_ICONS[day.discipline] ?? "pulse";
}

export function dayLabel(day: PlannedDay | null | undefined): string {
  if (!day) return "Rest";
  if (day.kind === "strength") return "Strength";
  if (day.kind === "mobility") return { yoga: "Yoga", pilates: "Pilates", recovery: "Breathwork & recovery" }[day.style as string] ?? "Mobility";
  const d = DISCIPLINES[day.discipline]?.label ?? day.discipline;
  return `${SESSION_TYPES[day.type] ?? day.type} ${d.toLowerCase()}`;
}
