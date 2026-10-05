/**
 * Front + back anatomy figure with the trained muscles lit in red, and the
 * muscles listed by anatomical name with their plain-language group.
 * Takes individual muscle ids (anatomy.js MUSCLE_DETAILS).
 */
import { Text, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";

import { BODY_BACK, BODY_DETAILS, BODY_FRONT, BODY_VIEWBOX, MUSCLE_DETAILS, muscleHighlight, type BodyRegion } from "../engine";
import { colors, fonts, radius, space, type } from "./theme";

const MIRROR = `translate(${BODY_VIEWBOX.width},0) scale(-1,1)`;

function fill(id: string | null, levels: Record<string, 1 | 2>) {
  if (!id) return colors.bodySkin;
  return levels[id] === 2 ? colors.muscle : levels[id] === 1 ? colors.muscleSoft : colors.muscleIdle;
}

function Figure({ regions, details, levels, height, caption }: { regions: BodyRegion[]; details: string[]; levels: Record<string, 1 | 2>; height: number; caption: string }) {
  // Worked muscles draw last so deep ones (rhomboids under the trapezius) still show.
  const rank = (r: BodyRegion) => (r.muscle ? (levels[r.muscle] ?? 0) : 0);
  const half = regions.filter((r) => !r.whole).map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i);
  const body = (
    <>
      {half.map(({ r, i }) => (
        <Path key={i} d={r.d} fill={fill(r.muscle, levels)} stroke={colors.bodyLine} strokeWidth={0.6} strokeLinejoin="round" />
      ))}
      {details.map((d) => (
        <Path key={d} d={d} fill="none" stroke={colors.bodyLine} strokeWidth={0.5} />
      ))}
    </>
  );
  return (
    <View style={{ alignItems: "center", gap: space.xs }}>
      <Svg width={(height * BODY_VIEWBOX.width) / BODY_VIEWBOX.height} height={height} viewBox={`0 0 ${BODY_VIEWBOX.width} ${BODY_VIEWBOX.height}`}>
        {regions
          .filter((r) => r.whole)
          .map((r, i) => (
            <Path key={i} d={r.d} fill={fill(r.muscle, levels)} stroke={colors.bodyLine} strokeWidth={0.6} />
          ))}
        <G>{body}</G>
        <G transform={MIRROR}>{body}</G>
      </Svg>
      <Text style={[type.label, { fontSize: 10 }]}>{caption}</Text>
    </View>
  );
}

function MuscleList({ ids, color, title }: { ids: string[]; color: string; title: string }) {
  if (!ids.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={{ width: 10, height: 10, borderRadius: radius.pill, backgroundColor: color }} />
        <Text style={type.label}>{title}</Text>
      </View>
      {ids.map((id) => {
        const [name, group] = MUSCLE_DETAILS[id as keyof typeof MUSCLE_DETAILS] ?? [id, ""];
        return (
          <Text key={id} style={[type.body, { paddingLeft: 16 }]}>
            <Text style={{ fontFamily: fonts.semibold }}>{name}</Text>
            {group ? <Text style={{ color: colors.muted }}> ({group})</Text> : null}
          </Text>
        );
      })}
    </View>
  );
}

/** Anatomy card body: figures, then target and helper muscles by name. */
export function BodyMap({ primary, secondary = [], height = 300 }: { primary: string[]; secondary?: string[]; height?: number }) {
  const levels = muscleHighlight(primary, secondary);
  const helpers = secondary.filter((m) => !primary.includes(m));
  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: space.lg }}>
        <Figure regions={BODY_FRONT} details={BODY_DETAILS.front} levels={levels} height={height} caption="Front" />
        <Figure regions={BODY_BACK} details={BODY_DETAILS.back} levels={levels} height={height} caption="Back" />
      </View>
      <MuscleList ids={primary} color={colors.muscle} title="Target muscles" />
      <MuscleList ids={helpers} color={colors.muscleSoft} title="Also working" />
    </View>
  );
}
