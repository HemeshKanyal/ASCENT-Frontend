/** Route drawn as a line without map tiles — used on share cards and as the generic fallback. */
import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";

import { projectRoute, type GpsPoint } from "../engine";
import { colors, radius } from "./theme";

export type RouteMapProps = { segments: GpsPoint[][]; height?: number; live?: boolean; rounded?: boolean };

export function RouteSvg({ segments, width, height, stroke = colors.accent }: { segments: GpsPoint[][]; width: number; height: number; stroke?: string }) {
  const all = segments.flat();
  if (all.length < 2) return null;
  // Project all points together so separate segments line up.
  const xy = projectRoute(all, width, height, 12);
  const offsets = segments.map((_, k) => segments.slice(0, k).reduce((n, s) => n + s.length, 0));
  const lines = segments.map((seg, k) => xy.slice(offsets[k], offsets[k] + seg.length));
  const start = xy[0];
  const end = xy[xy.length - 1];
  return (
    <Svg width={width} height={height}>
      {lines.map((pts, k) =>
        pts.length > 1 ? (
          <Polyline key={k} points={pts.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke={stroke} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        ) : null
      )}
      <Circle cx={start[0]} cy={start[1]} r={5} fill={colors.bg} stroke={stroke} strokeWidth={2} />
      <Circle cx={end[0]} cy={end[1]} r={5} fill={stroke} />
    </Svg>
  );
}

/** Route drawn on a plain surface — no map tiles. */
export function RouteSvgMap({ segments, height = 260, rounded = true }: RouteMapProps) {
  const [width, setWidth] = useState(0);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        height,
        borderRadius: rounded ? radius.lg : 0,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {width ? <RouteSvg segments={segments} width={width} height={height} /> : null}
    </View>
  );
}
