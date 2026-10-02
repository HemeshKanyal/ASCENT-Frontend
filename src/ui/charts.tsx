/**
 * Small monochrome chart kit (react-native-svg).
 * One series per chart, one axis, thin marks, recessive grid, touch-to-inspect,
 * and a table view so nothing depends on reading the shape alone.
 */
import { useState, type ReactNode } from "react";
import { Pressable, Text, View, type GestureResponderEvent } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { Card, Label, Row } from "./components";
import { colors, fonts, space, type } from "./theme";

const PAD = { top: 18, right: 44, bottom: 22, left: 40 };
const GRID = colors.border;
const INK_MUTED = colors.faint;

export type Point = { label: string; value: number | null };

/** Clean tick values (0 / 50 / 100…) covering [min, max]. */
function niceTicks(min: number, max: number, count = 3) {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

const compact = (v: number) => (Math.abs(v) >= 10000 ? `${Math.round(v / 1000)}k` : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v * 10) / 10}`);

/** Touch/drag across a chart → index of the nearest point. */
function useScrub(n: number, width: number) {
  const [idx, setIdx] = useState<number | null>(null);
  const at = (e: GestureResponderEvent) => {
    const plot = width - PAD.left - PAD.right;
    const x = e.nativeEvent.locationX - PAD.left;
    setIdx(Math.max(0, Math.min(n - 1, Math.round((x / plot) * (n - 1)))));
  };
  const handlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: at,
    onResponderMove: at,
    onResponderRelease: () => setIdx(null),
    onResponderTerminate: () => setIdx(null),
  };
  return { idx, handlers, setIdx };
}

export function LineChart({
  data,
  height = 180,
  target,
  targetLabel = "Target",
  format = compact,
  secondary,
}: {
  data: Point[];
  height?: number;
  target?: number;
  targetLabel?: string;
  format?: (v: number) => string;
  /** Optional muted dots behind the line (e.g. daily weights under a 7-day average). */
  secondary?: (number | null)[];
}) {
  const [width, setWidth] = useState(0);
  const { idx, handlers } = useScrub(data.length, width);
  const values = [...data.map((d) => d.value), ...(secondary ?? []), ...(target != null ? [target] : [])].filter((v): v is number => v != null);

  // The wrapper that measures width must be the same element with or without data,
  // otherwise a same-sized swap never re-reports its layout and the chart stays 0px wide.
  if (!values.length) {
    return (
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height, alignItems: "center", justifyContent: "center" }}>
        <Text style={type.small}>No data yet for this range.</Text>
      </View>
    );
  }

  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo || 1)) * plotH;

  // Break the line where days are missing.
  const runs: [number, number][][] = [];
  data.forEach((d, i) => {
    if (d.value == null) return;
    const prev = i > 0 && data[i - 1].value != null;
    if (!prev) runs.push([]);
    runs[runs.length - 1].push([x(i), y(d.value)]);
  });
  const lastIdx = data.reduce((acc, d, i) => (d.value != null ? i : acc), -1);
  const last = lastIdx >= 0 ? data[lastIdx] : null;
  const shown = idx != null && data[idx].value != null ? idx : null;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...handlers} accessibilityRole="image">
      {width ? (
        <Svg width={width} height={height}>
          {ticks.map((t) => (
            <Line key={t} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
          ))}
          {ticks.map((t) => (
            <SvgText key={`l${t}`} x={PAD.left - 6} y={y(t) + 3} fontSize={10} fill={INK_MUTED} textAnchor="end" fontFamily={fonts.medium}>
              {format(t)}
            </SvgText>
          ))}
          {target != null ? (
            <>
              <Line x1={PAD.left} x2={width - PAD.right} y1={y(target)} y2={y(target)} stroke={colors.muted} strokeWidth={1} />
              <SvgText x={width - PAD.right + 4} y={y(target) + 3} fontSize={10} fill={colors.muted} fontFamily={fonts.bold}>
                {targetLabel}
              </SvgText>
            </>
          ) : null}
          {secondary?.map((v, i) => (v == null ? null : <Circle key={`s${i}`} cx={x(i)} cy={y(v)} r={2.5} fill={colors.faint} />))}
          {runs.map((pts, k) =>
            pts.length > 1 ? (
              <Path
                key={`a${k}`}
                d={`M${pts[0][0]},${PAD.top + plotH} ${pts.map(([px, py]) => `L${px},${py}`).join(" ")} L${pts[pts.length - 1][0]},${PAD.top + plotH} Z`}
                fill={colors.accent}
                opacity={0.08}
              />
            ) : null
          )}
          {runs.map((pts, k) =>
            pts.length > 1 ? (
              <Path key={`l${k}`} d={`M${pts.map(([px, py]) => `${px},${py}`).join(" L")}`} stroke={colors.accent} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            ) : (
              <Circle key={`p${k}`} cx={pts[0][0]} cy={pts[0][1]} r={3} fill={colors.accent} />
            )
          )}
          {last && last.value != null && shown == null ? (
            <>
              <Circle cx={x(lastIdx)} cy={y(last.value)} r={6} fill={colors.surface} />
              <Circle cx={x(lastIdx)} cy={y(last.value)} r={4} fill={colors.accent} />
              <SvgText x={x(lastIdx) + 8} y={y(last.value) - 8} fontSize={11} fill={colors.text} fontFamily={fonts.bold}>
                {format(last.value)}
              </SvgText>
            </>
          ) : null}
          {shown != null ? (
            <>
              <Line x1={x(shown)} x2={x(shown)} y1={PAD.top} y2={PAD.top + plotH} stroke={colors.muted} strokeWidth={1} />
              <Circle cx={x(shown)} cy={y(data[shown].value!)} r={6} fill={colors.surface} />
              <Circle cx={x(shown)} cy={y(data[shown].value!)} r={4} fill={colors.accent} />
            </>
          ) : null}
          {[0, Math.floor((data.length - 1) / 2), data.length - 1]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((i) => (
              <SvgText key={`x${i}`} x={x(i)} y={height - 6} fontSize={10} fill={INK_MUTED} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} fontFamily={fonts.medium}>
                {data[i].label}
              </SvgText>
            ))}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
      {shown != null ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, alignItems: "center" }} pointerEvents="none">
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.text, backgroundColor: colors.raised, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" }}>
            {data[shown].label} · {format(data[shown].value!)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function ColumnChart({ data, height = 170, format = compact, target }: { data: Point[]; height?: number; format?: (v: number) => string; target?: number }) {
  const [width, setWidth] = useState(0);
  const { idx, handlers } = useScrub(data.length, width);
  const values = data.map((d) => d.value ?? 0);
  const ticks = niceTicks(0, Math.max(...values, target ?? 0, 1));
  const hi = ticks[ticks.length - 1];
  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const slot = plotW / Math.max(1, data.length);
  const bw = Math.min(24, slot * 0.6);
  const y = (v: number) => PAD.top + plotH - (v / (hi || 1)) * plotH;
  const cx = (i: number) => PAD.left + slot * i + slot / 2;

  const col = (i: number, v: number) => {
    const top = y(v);
    const h = PAD.top + plotH - top;
    const r = Math.min(4, h, bw / 2);
    const l = cx(i) - bw / 2;
    if (h <= 0) return "";
    // Rounded data end, square at the baseline.
    return `M${l},${PAD.top + plotH} L${l},${top + r} Q${l},${top} ${l + r},${top} L${l + bw - r},${top} Q${l + bw},${top} ${l + bw},${top + r} L${l + bw},${PAD.top + plotH} Z`;
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...handlers} accessibilityRole="image">
      {width ? (
        <Svg width={width} height={height}>
          {ticks.map((t) => (
            <Line key={t} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
          ))}
          {ticks.map((t) => (
            <SvgText key={`l${t}`} x={PAD.left - 6} y={y(t) + 3} fontSize={10} fill={INK_MUTED} textAnchor="end" fontFamily={fonts.medium}>
              {format(t)}
            </SvgText>
          ))}
          {target != null ? (
            <>
              <Line x1={PAD.left} x2={width - PAD.right} y1={y(target)} y2={y(target)} stroke={colors.muted} strokeWidth={1} />
              <SvgText x={width - PAD.right + 4} y={y(target) + 3} fontSize={10} fill={colors.muted} fontFamily={fonts.bold}>
                Target
              </SvgText>
            </>
          ) : null}
          {data.map((d, i) => (
            <Path key={i} d={col(i, d.value ?? 0)} fill={idx === i || (idx == null && i === data.length - 1) ? colors.accent : colors.borderStrong} />
          ))}
          {/* Generous invisible hit area per column */}
          {data.map((_, i) => (
            <Rect key={`h${i}`} x={cx(i) - slot / 2} y={PAD.top} width={slot} height={plotH} fill="transparent" />
          ))}
          {data.map((d, i) =>
            data.length <= 5 || i === 0 || i === data.length - 1 || i === Math.floor((data.length - 1) / 2) ? (
              <SvgText key={`x${i}`} x={cx(i)} y={height - 6} fontSize={10} fill={INK_MUTED} textAnchor="middle" fontFamily={fonts.medium}>
                {d.label}
              </SvgText>
            ) : null
          )}
          {(() => {
            const i = idx ?? data.length - 1;
            const v = data[i]?.value;
            return v != null ? (
              <SvgText x={cx(i)} y={y(v) - 6} fontSize={11} fill={colors.text} textAnchor="middle" fontFamily={fonts.bold}>
                {format(v)}
              </SvgText>
            ) : null;
          })()}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}

/** Chart wrapper: title, summary, optional controls, chart ↔ table toggle. */
export function ChartCard({
  title,
  summary,
  controls,
  children,
  table,
}: {
  title: string;
  summary?: string;
  controls?: ReactNode;
  children: ReactNode;
  table: { label: string; value: string }[];
}) {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Label>{title}</Label>
          {summary ? <Text style={type.strong}>{summary}</Text> : null}
        </View>
        <Pressable onPress={() => setAsTable(!asTable)} hitSlop={8}>
          <Text style={[type.small, { color: colors.text, fontFamily: fonts.semibold }]}>{asTable ? "Chart" : "Table"}</Text>
        </Pressable>
      </Row>
      {controls}
      {asTable ? (
        <View style={{ gap: 2, marginTop: space.xs }}>
          {table.map((r, i) => (
            <Row key={i} style={{ justifyContent: "space-between", borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 4 }}>
              <Text style={type.small}>{r.label}</Text>
              <Text style={[type.small, { color: colors.text }]}>{r.value}</Text>
            </Row>
          ))}
        </View>
      ) : (
        children
      )}
    </Card>
  );
}
