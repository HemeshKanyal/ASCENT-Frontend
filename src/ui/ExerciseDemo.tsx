/**
 * Looping exercise demo: the 3D mannequin from src/engine/demo.js projected
 * and drawn with react-native-svg, working muscles in red. Tap to pause.
 * Holds still on the hardest position when the phone asks for reduced motion.
 */
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Line, Polygon } from "react-native-svg";

import { MOTIONS, demoDuration, demoFrame, demoViewBox, muscleHighlight, type DemoShape } from "../engine";
import { colors, radius, space, type } from "./theme";

const PALETTE: Record<string, string> = {
  muscle: colors.muscle,
  muscleSoft: colors.muscleSoft,
  outline: "#141414",
  bar: "#C8C8C8",
  plate: "#2A2A2A",
  plateEdge: "#3A3A3A",
  propDark: "#333333",
  propTop: "#4A4A4A",
  propSide: "#3C3C3C",
  cable: "#9A9A9A",
  band: "#777777",
  shadow: "rgba(255,255,255,0.05)",
};
const paint = (c: string) => PALETTE[c] ?? c;

const FPS = 30;

function Shape({ s }: { s: DemoShape }) {
  const color = paint(s.color);
  const opacity = s.opacity ?? 1;
  if (s.kind === "line") {
    return <Line x1={s.p1[0]} y1={s.p1[1]} x2={s.p2[0]} y2={s.p2[1]} stroke={color} strokeWidth={s.w} strokeLinecap="round" opacity={opacity} />;
  }
  if (s.kind === "circle") return <Circle cx={s.c[0]} cy={s.c[1]} r={s.r} fill={color} opacity={opacity} />;
  if (s.kind === "ellipse") {
    const plate = s.color === "plate";
    return (
      <Ellipse
        cx={s.c[0]}
        cy={s.c[1]}
        rx={s.rx}
        ry={s.ry}
        fill={color}
        stroke={plate ? "#BDBDBD" : undefined}
        strokeWidth={plate ? 0.8 : 0}
        opacity={opacity}
        transform={`rotate(${s.rot} ${s.c[0]} ${s.c[1]})`}
      />
    );
  }
  return <Polygon points={s.points.map((p) => p.join(",")).join(" ")} fill={color} stroke="#1A1A1A" strokeWidth={0.5} opacity={opacity} />;
}

export function ExerciseDemo({ motionId, primary, secondary = [], size = 280 }: { motionId: string; primary: string[]; secondary?: string[]; size?: number }) {
  const motion = MOTIONS[motionId];
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => alive && setStill(on));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (paused || still) return;
    let frame = 0;
    let last = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      if (now - last >= 1000 / FPS) {
        last = now;
        setT((now - start) / 1000);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paused, still]);

  if (!motion) return null;
  // With reduced motion, hold the hardest position (the frame with the most effort).
  const peak = motion.frames.reduce((best: { at: number; e: number; t: number }, f) => {
    const frame = f as { effort?: number; hold?: number; move?: number };
    const e = frame.effort ?? 0;
    const next = { at: best.t, e, t: best.t + (frame.hold ?? 0.25) + (frame.move ?? 0.9) };
    return e > best.e ? next : { ...best, t: next.t };
  }, { at: 0, e: -1, t: 0 }).at;
  const shapes = demoFrame(motion, still ? peak + 0.05 : t % demoDuration(motion), muscleHighlight(primary, secondary));

  return (
    <Pressable onPress={() => setPaused((p) => !p)} accessibilityRole="button" accessibilityLabel={paused ? "Play demo" : "Pause demo"}>
      <View style={{ alignItems: "center", borderRadius: radius.md, backgroundColor: "#0B0B0B", overflow: "hidden", paddingVertical: space.sm }}>
        <Svg width={size} height={size} viewBox={demoViewBox(motion).join(" ")}>
          {shapes.map((s, i) => (
            <Shape key={i} s={s} />
          ))}
        </Svg>
        <Text style={[type.small, { fontSize: 11 }]}>{still ? "Reduced motion is on" : paused ? "Paused · tap to play" : "Tap to pause"}</Text>
      </View>
    </Pressable>
  );
}
