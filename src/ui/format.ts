import { MUSCLES } from "../engine";

export const range = ([lo, hi]: [number, number]) => `${lo}–${hi}`;

export const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  const mmss = `${String(Math.floor(s / 60) % 60).padStart(s >= 3600 ? 2 : 1, "0")}:${String(s % 60).padStart(2, "0")}`;
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mmss}` : mmss;
};

export const muscle = (id: string) => MUSCLES[id as keyof typeof MUSCLES] ?? id;

export const muscles = (ids: string[]) => ids.map(muscle).join(", ");

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
