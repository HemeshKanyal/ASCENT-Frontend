import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { ACTIVITY_BY_ID, formatPace, weekKey, type MicroRef, type Targets } from "../engine";
import { daySummaries, getWeights, loadDay, type DaySummary, type WeightEntry } from "../services/nutritionStore";
import { dateKey, type LoggedSession } from "../services/trainingStore";
import { ChartCard, ColumnChart, LineChart, type Point } from "./charts";
import { Chip, Row } from "./components";
import { colors, space, type } from "./theme";

const NUTRITION = [
  { id: "kcal", label: "Calories", unit: "kcal" },
  { id: "protein", label: "Protein", unit: "g" },
  { id: "carbs", label: "Carbs", unit: "g" },
  { id: "fat", label: "Fat", unit: "g" },
  { id: "fiber", label: "Fibre", unit: "g" },
  { id: "sugar", label: "Sugar", unit: "g" },
  { id: "sodium", label: "Sodium", unit: "mg" },
  { id: "water", label: "Water", unit: "L" },
] as const;

type NutritionId = (typeof NUTRITION)[number]["id"];

const RANGES = [7, 30, 90];

const shortLabel = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function Chips<T extends string | number>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
      {options.map((o) => (
        <Chip key={String(o.id)} label={o.label} selected={o.id === value} onPress={() => onChange(o.id)} />
      ))}
    </ScrollView>
  );
}

function valueOf(d: DaySummary, id: NutritionId) {
  if (id === "sugar" || id === "sodium") return d.micros[id] ?? 0;
  if (id === "water") return d.water / 1000;
  return d[id];
}

/** Last n Monday-weeks, oldest first. */
function lastWeeks(n: number) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => weekKey(new Date(now.getTime() - (n - 1 - i) * 7 * 864e5)));
}

export function ProgressCharts({ sessions }: { sessions: LoggedSession[] }) {
  const [metric, setMetric] = useState<NutritionId>("kcal");
  const [range, setRange] = useState(30);
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [targets, setTargets] = useState<Targets | null>(null);
  const [refs, setRefs] = useState<Record<string, MicroRef>>({});
  const [trainMetric, setTrainMetric] = useState<"sets" | "minutes" | "sessions">("minutes");

  useEffect(() => {
    daySummaries(range).then(setSummaries);
  }, [range]);
  useEffect(() => {
    getWeights().then(setWeights);
    loadDay(dateKey()).then((d) => {
      setTargets(d?.targets ?? null);
      setRefs(d?.refs ?? {});
    });
  }, []);

  const def = NUTRITION.find((n) => n.id === metric)!;
  const points: Point[] = summaries.map((d) => ({ label: shortLabel(d.day), value: d.logged || (metric === "water" && d.water) ? Math.round(valueOf(d, metric) * 10) / 10 : null }));
  const logged = summaries.filter((d) => d.logged);
  const avg = logged.length ? logged.reduce((s, d) => s + valueOf(d, metric), 0) / logged.length : null;
  const target =
    metric === "sugar" || metric === "sodium"
      ? refs[metric]?.amount
      : metric === "water"
        ? targets
          ? targets.waterMl / 1000
          : undefined
        : targets?.[metric];

  // Weight: daily dots + trailing 7-day average.
  const weightSeries = useMemo(() => {
    // 90 days back from the latest weigh-in.
    const latest = weights.length ? new Date(weights[weights.length - 1].date).getTime() : 0;
    const recent = weights.filter((w) => latest - new Date(w.date).getTime() < 90 * 864e5);
    return recent.map((w) => {
      const t = new Date(w.date).getTime();
      const window = recent.filter((x) => {
        const dt = t - new Date(x.date).getTime();
        return dt >= 0 && dt < 7 * 864e5;
      });
      return { label: shortLabel(w.date), daily: w.kg, avg: Math.round((window.reduce((s, x) => s + x.kg, 0) / window.length) * 10) / 10 };
    });
  }, [weights]);

  const weeks = lastWeeks(8);
  const weekLabel = (wk: string) => shortLabel(wk);
  const byWeek = (pick: (s: LoggedSession) => number) =>
    weeks.map((wk) => ({ label: weekLabel(wk), value: sessions.filter((s) => weekKey(s.date) === wk).reduce((n, s) => n + pick(s), 0) }));
  const training =
    trainMetric === "sets"
      ? byWeek((s) => s.exercises.reduce((n, e) => n + e.sets.length, 0))
      : trainMetric === "minutes"
        ? byWeek((s) => s.durationMinutes ?? 0)
        : byWeek(() => 1);

  const distanceSports = [...new Set(sessions.filter((s) => s.distanceKm).map((s) => s.activity ?? s.discipline ?? "run"))];
  const [sport, setSport] = useState<string | null>(null);
  const activeSport = sport && distanceSports.includes(sport) ? sport : distanceSports[0];
  const distance = byWeek((s) => ((s.activity ?? s.discipline) === activeSport ? s.distanceKm ?? 0 : 0)).map((p) => ({ ...p, value: Math.round(p.value * 10) / 10 }));

  const runs = sessions
    .filter((s) => (s.activity === "run" || s.activity === "trail_run" || s.discipline === "run") && s.paceSecPerKm)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(-20);

  const fmtMetric = (v: number) => (def.unit === "L" ? v.toFixed(1) : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);

  return (
    <>
      <ChartCard
        title="Nutrition"
        summary={avg != null ? `Avg ${fmtMetric(avg)} ${def.unit}/day · ${logged.length} of ${summaries.length} days logged` : "Log food on the Fuel tab to see trends"}
        controls={
          <View style={{ gap: space.sm }}>
            <Chips options={NUTRITION.map((n) => ({ id: n.id, label: n.label }))} value={metric} onChange={setMetric} />
            <Chips options={RANGES.map((r) => ({ id: r, label: `${r} days` }))} value={range} onChange={setRange} />
          </View>
        }
        table={summaries.filter((d) => d.logged).map((d) => ({ label: shortLabel(d.day), value: `${fmtMetric(valueOf(d, metric))} ${def.unit}` }))}
      >
        <LineChart data={points} target={target} targetLabel={metric === "sugar" || metric === "sodium" ? "Limit" : "Target"} format={fmtMetric} />
      </ChartCard>

      <ChartCard
        title="Body weight"
        summary={
          weightSeries.length
            ? `${weightSeries[weightSeries.length - 1].avg} kg 7-day avg${weightSeries.length > 1 ? ` · ${(weightSeries[weightSeries.length - 1].avg - weightSeries[0].avg >= 0 ? "+" : "")}${Math.round((weightSeries[weightSeries.length - 1].avg - weightSeries[0].avg) * 10) / 10} kg over ${weightSeries.length} weigh-ins` : ""}`
            : "Log your weight on the Fuel tab"
        }
        table={weightSeries.map((w) => ({ label: w.label, value: `${w.daily} kg (avg ${w.avg})` }))}
      >
        <LineChart data={weightSeries.map((w) => ({ label: w.label, value: w.avg }))} secondary={weightSeries.map((w) => w.daily)} format={(v) => `${Math.round(v * 10) / 10}`} />
        {weightSeries.length ? (
          <Row gap={space.md}>
            <Row gap={4}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.faint }} />
              <Text style={type.small}>Daily</Text>
            </Row>
            <Row gap={4}>
              <View style={{ width: 14, height: 2, backgroundColor: colors.accent }} />
              <Text style={type.small}>7-day average — the trend that matters</Text>
            </Row>
          </Row>
        ) : null}
      </ChartCard>

      <ChartCard
        title="Training per week"
        summary={`${training[training.length - 1].value} ${trainMetric === "sets" ? "lifting sets" : trainMetric === "minutes" ? "minutes" : "sessions"} this week`}
        controls={
          <Chips
            options={[
              { id: "minutes", label: "Minutes" },
              { id: "sessions", label: "Sessions" },
              { id: "sets", label: "Lifting sets" },
            ]}
            value={trainMetric}
            onChange={setTrainMetric}
          />
        }
        table={training.map((t) => ({ label: `Week of ${t.label}`, value: String(t.value) }))}
      >
        <ColumnChart data={training} format={(v) => `${Math.round(v)}`} />
      </ChartCard>

      {distanceSports.length ? (
        <ChartCard
          title="Distance per week"
          summary={`${distance[distance.length - 1].value} km this week`}
          controls={
            distanceSports.length > 1 ? (
              <Chips options={distanceSports.map((s) => ({ id: s, label: ACTIVITY_BY_ID[s]?.name ?? s }))} value={activeSport} onChange={setSport} />
            ) : null
          }
          table={distance.map((d) => ({ label: `Week of ${d.label}`, value: `${d.value} km` }))}
        >
          <ColumnChart data={distance} format={(v) => `${Math.round(v * 10) / 10}`} />
        </ChartCard>
      ) : null}

      {runs.length >= 2 ? (
        <ChartCard
          title="Run pace"
          summary={`Latest ${formatPace(runs[runs.length - 1].paceSecPerKm)} /km · lower is faster`}
          table={runs.map((r) => ({ label: `${shortLabel(dateKey(new Date(r.date)))} · ${r.distanceKm ?? 0} km`, value: `${formatPace(r.paceSecPerKm)} /km` }))}
        >
          <LineChart data={runs.map((r) => ({ label: shortLabel(dateKey(new Date(r.date))), value: r.paceSecPerKm ?? null }))} format={(v) => formatPace(v)} />
        </ChartCard>
      ) : null}
    </>
  );
}
