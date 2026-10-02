import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, fonts, gradients, radius, space, type } from "./theme";

export function Screen({
  children,
  scroll = true,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
}) {
  return (
    <LinearGradient colors={gradients.screen} style={styles.screen} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.6 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.scrollContent, { flex: 1 }]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </LinearGradient>
  );
}

export function Loading() {
  return (
    <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

/** Page heading: small uppercase kicker over a big italic serif title. */
export function Title({ kicker, children, sub }: { kicker?: string; children: ReactNode; sub?: string }) {
  return (
    <View style={{ gap: 4, marginBottom: space.xs }}>
      {kicker ? <Text style={type.label}>{kicker}</Text> : null}
      <Text style={type.h1}>{children}</Text>
      {sub ? <Text style={type.small}>{sub}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  active,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  active?: boolean;
}) {
  const body = (
    <LinearGradient
      colors={active ? gradients.cardActive : gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, active && { borderColor: colors.accent }, style]}
    >
      {children}
    </LinearGradient>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.75 }}>
      {body}
    </Pressable>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  style,
  compact,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const fg = { primary: colors.onAccent, secondary: colors.text, ghost: colors.muted, danger: colors.danger }[variant];
  const inner = (
    <Text style={[styles.buttonText, compact && { fontSize: 13 }, { color: fg }]} numberOfLines={1}>
      {title}
    </Text>
  );
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: disabled ? 0.35 : pressed ? 0.8 : 1 }, style]}
    >
      {variant === "primary" ? (
        <LinearGradient colors={gradients.button} style={[styles.button, compact && styles.buttonCompact]}>
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.button,
            compact && styles.buttonCompact,
            variant === "secondary" && { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          {inner}
        </View>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && { color: colors.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

/** Large selectable card with a title and a hint — used for single and multi choice. */
export function Option({
  label,
  hint,
  selected,
  onPress,
  right,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
  right?: ReactNode;
}) {
  return (
    <Card onPress={onPress} active={selected} style={{ paddingVertical: space.md }}>
      <Row style={{ justifyContent: "space-between" }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={type.h3}>{label}</Text>
          {hint ? <Text style={type.small}>{hint}</Text> : null}
        </View>
        {right ?? (
          <View style={[styles.tick, selected && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
            {selected ? <Text style={{ color: colors.onAccent, fontFamily: fonts.black, fontSize: 12 }}>✓</Text> : null}
          </View>
        )}
      </Row>
    </Card>
  );
}

export function Badge({ label, solid }: { label: string; solid?: boolean }) {
  return (
    <View style={[styles.badge, solid ? { backgroundColor: colors.accent, borderColor: colors.accent } : null]}>
      <Text style={[styles.badgeText, { color: solid ? colors.onAccent : colors.muted }]}>{label}</Text>
    </View>
  );
}

export function Stat({ value, label, style }: { value: string | number; label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Card style={[{ flex: 1, gap: 2 }, style]}>
      <Text style={type.number}>{value}</Text>
      <Text style={type.small}>{label}</Text>
    </Card>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: colors.raised, overflow: "hidden" }}>
      <LinearGradient
        colors={pct >= 1 ? ["#FFFFFF", "#FFFFFF"] : ["#5A5A5A", "#D9D9D9"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 6, width: `${pct * 100}%`, borderRadius: radius.pill }}
      />
    </View>
  );
}

export function Row({ children, style, gap = space.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

export function Wrap({ children, gap = space.sm }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={type.label}>{children}</Text>;
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <View style={styles.note}>
      <Text style={[type.small, { color: colors.text }]}>{children}</Text>
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: space.xxl, gap: space.sm }}>
      <Text style={type.h2}>{title}</Text>
      {body ? <Text style={[type.small, { textAlign: "center" }]}>{body}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  footer: {
    padding: space.lg,
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  card: {
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonCompact: { paddingVertical: 8, paddingHorizontal: space.md },
  buttonText: { fontFamily: fonts.heavy, fontSize: 15, letterSpacing: 0.2 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontFamily: fonts.semibold, color: colors.text, fontSize: 14 },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontFamily: fonts.heavy, fontSize: 10, letterSpacing: 1.2 },
  note: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: space.md,
    paddingVertical: space.xs,
  },
});
