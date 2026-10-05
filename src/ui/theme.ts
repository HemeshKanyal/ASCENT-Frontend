/** Monochrome design system: black, white and gray gradients; bold sans + italic serif display. */

export const fonts = {
  serif: "DMSerifDisplay_400Regular_Italic",
  serifUpright: "DMSerifDisplay_400Regular",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  heavy: "Inter_800ExtraBold",
  black: "Inter_900Black",
};

export const colors = {
  bg: "#000000",
  surface: "#0E0E0E",
  surfaceAlt: "#161616",
  raised: "#1F1F1F",
  border: "#262626",
  borderStrong: "#3D3D3D",
  text: "#FAFAFA",
  muted: "#A1A1A1",
  faint: "#6B6B6B",
  accent: "#FFFFFF",
  onAccent: "#000000",
  anchor: "#FFFFFF",
  rotator: "#9A9A9A",
  warning: "#D4D4D4",
  success: "#FFFFFF",
  // Reserved for destructive actions and errors.
  danger: "#F26D6D",
  // Anatomy only: muscles being trained. Deeper than `danger` so a lit-up
  // muscle never reads as a delete button.
  muscle: "#E5383B",
  muscleSoft: "#8A2E30",
  muscleIdle: "#3A3A3A",
  bodySkin: "#2C2C2C",
  bodyLine: "#0A0A0A",
};

export const gradients = {
  screen: ["#141414", "#000000"] as const,
  card: ["#1A1A1A", "#0B0B0B"] as const,
  cardActive: ["#3A3A3A", "#121212"] as const,
  button: ["#FFFFFF", "#C9C9C9"] as const,
  hero: ["#2A2A2A", "#0A0A0A"] as const,
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };

export const type = {
  display: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 48, color: colors.text, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 42, color: colors.text, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 32, color: colors.text },
  h3: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.text },
  strong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21, color: colors.text },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  label: {
    fontFamily: fonts.heavy,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1.6,
    textTransform: "uppercase" as const,
  },
  number: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 38, color: colors.text },
};
