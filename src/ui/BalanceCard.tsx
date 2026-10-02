import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { BalanceItem } from "../services/trainingStore";
import { Card, Label, ProgressBar, Row } from "./components";
import { muscle } from "./format";
import { colors, fonts, space, type } from "./theme";

function message(b: BalanceItem) {
  const sets = `${b.done + b.today} of ${b.target} sets`;
  if (b.status === "over") return `${muscle(b.muscle)}: ${sets} this week — more than it can recover from. Ease off extra work here.`;
  return `${muscle(b.muscle)}: heading for ${b.projected} of ${b.target} sets this week — add a set or an exercise for it.`;
}

/** Weekly per-muscle balance: flags over/under, expandable to every muscle. */
export function BalanceCard({ items, title = "Weekly balance" }: { items: BalanceItem[]; title?: string }) {
  const [open, setOpen] = useState(false);
  // Most important first: furthest from target, as a share of it.
  const severity = (b: BalanceItem) => (b.status === "over" ? (b.done + b.today) / b.target : 1 - b.projected / Math.max(1, b.target));
  const flagged = items.filter((b) => b.status !== "on_track").sort((a, b) => severity(b) - severity(a));
  const shown = open ? flagged : flagged.slice(0, 4);
  if (!items.length) return null;

  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <Label>{title}</Label>
        <Pressable onPress={() => setOpen(!open)} hitSlop={8}>
          <Text style={[type.small, { color: colors.text, fontFamily: fonts.semibold }]}>{open ? "Hide" : "All muscles"}</Text>
        </Pressable>
      </Row>
      {flagged.length ? (
        shown.map((b) => (
          <Text key={b.muscle} style={type.body}>
            {b.status === "over" ? "▲ " : "▼ "}
            {message(b)}
          </Text>
        ))
      ) : (
        <Text style={type.body}>✓ Every muscle is on track this week.</Text>
      )}
      {!open && flagged.length > shown.length ? <Text style={type.small}>+ {flagged.length - shown.length} more — tap All muscles.</Text> : null}
      {open ? (
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          {items.map((b) => (
            <View key={b.muscle} style={{ gap: 4 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={type.strong}>{muscle(b.muscle)}</Text>
                <Text style={type.small}>
                  {b.done}
                  {b.today ? ` + ${b.today} today` : ""} / {b.target}
                  {b.status === "over" ? " · over" : b.status === "under" ? " · under" : ""}
                </Text>
              </Row>
              <ProgressBar value={(b.done + b.today) / Math.max(1, b.target)} />
            </View>
          ))}
          <Text style={[type.small, { color: colors.faint }]}>
            Hard sets this week; indirect work counts half. Targets follow your level and goals.
          </Text>
        </View>
      ) : null}
    </Card>
  );
}
