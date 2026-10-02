import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { NUTRIENTS, microStatus, type MicroRef, type Micros } from "../src/engine";
import { daySummaries, loadDay } from "../src/services/nutritionStore";
import { shareReport } from "../src/services/report";
import { dateKey } from "../src/services/trainingStore";
import { Button, Card, Chip, Label, Loading, Note, ProgressBar, Row, Screen, Title, Wrap } from "../src/ui/components";
import { colors, space, type } from "../src/ui/theme";

const GROUPS = [
  { id: "limit", label: "Keep under" },
  { id: "mineral", label: "Minerals" },
  { id: "vitamin", label: "Vitamins" },
] as const;

const STATUS_TEXT: Record<string, string> = { over: "over", near: "near limit", ok: "", met: "✓", close: "", low: "low", info: "", unknown: "" };

const fmt = (v: number) => (v >= 100 ? Math.round(v).toLocaleString() : Math.round(v * 10) / 10);

export default function Nutrients() {
  const params = useLocalSearchParams<{ day?: string }>();
  const day = params.day ?? dateKey();
  const [range, setRange] = useState<"day" | "week">("day");
  const [data, setData] = useState<{ totals: Micros; coverage: number; refs: Record<string, MicroRef>; days: number } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const today = await loadDay(day);
      if (!today) return;
      if (range === "day") {
        setData({ totals: today.micros.totals, coverage: today.micros.coverage, refs: today.refs, days: 1 });
      } else {
        const week = (await daySummaries(7)).filter((d) => d.logged);
        const n = Math.max(1, week.length);
        const totals: Micros = {};
        for (const nu of NUTRIENTS) totals[nu.key] = week.reduce((s, d) => s + (d.micros[nu.key] ?? 0), 0) / n;
        setData({ totals, coverage: week.reduce((s, d) => s + d.coverage, 0) / n, refs: today.refs, days: week.length });
      }
    })();
  }, [day, range]);

  if (!data) return <Loading />;

  return (
    <Screen
      footer={
        <Row>
          <Button title="Back" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button
            title={sharing ? "Preparing…" : "Doctor report (PDF)"}
            disabled={sharing}
            style={{ flex: 2 }}
            onPress={async () => {
              setSharing(true);
              setErr("");
              try {
                await shareReport(14);
              } catch {
                setErr("Couldn't create the report — try again.");
              } finally {
                setSharing(false);
              }
            }}
          />
        </Row>
      }
    >
      <Title kicker="Fuel">Vitamins & minerals</Title>
      <Wrap>
        <Chip
          label={day === dateKey() ? "Today" : new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
          selected={range === "day"}
          onPress={() => setRange("day")}
        />
        <Chip label="7-day average" selected={range === "week"} onPress={() => setRange("week")} />
      </Wrap>
      {data.coverage < 0.9 ? (
        <Note>
          Based on {Math.round(data.coverage * 100)}% of calories — quick-add and some packaged foods have no vitamin data, so real intake is likely a bit higher.
        </Note>
      ) : null}
      {range === "week" && data.days < 7 ? <Text style={type.small}>Averaged over {data.days} logged day{data.days === 1 ? "" : "s"}.</Text> : null}

      {GROUPS.map((g) => (
        <Card key={g.id}>
          <Label>{g.label}</Label>
          {NUTRIENTS.filter((n) => n.group === g.id).map((n) => {
            const ref = data.refs[n.key];
            const value = data.totals[n.key] ?? 0;
            const status = microStatus(value, ref);
            return (
              <View key={n.key} style={{ gap: 4 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={type.strong}>{n.label}</Text>
                  <Text style={[type.small, (status === "over" || status === "low") && { color: colors.text }]}>
                    {fmt(value)} / {ref?.kind === "limit" ? "≤ " : ""}
                    {fmt(ref?.amount ?? 0)} {n.unit} {STATUS_TEXT[status] ? `· ${STATUS_TEXT[status]}` : ""}
                  </Text>
                </Row>
                <ProgressBar value={ref ? value / ref.amount : 0} />
                {ref?.note ? <Text style={[type.small, { color: colors.faint }]}>{ref.note}</Text> : null}
              </View>
            );
          })}
        </Card>
      ))}
      {err ? <Note>{err}</Note> : null}
      <Text style={[type.small, { color: colors.faint, marginBottom: space.md }]}>
        References are US National Academies daily intakes for your age and sex. The report includes 14 days of food, supplements, weight and training for your doctor or dietitian.
      </Text>
    </Screen>
  );
}
