/** Hands the chosen food from search/scan to the portion screen (same JS runtime, no serialising). */
import type { Food } from "../engine";

export type SelectedFood = Food & { source?: string; brand?: string; barcode?: string };

let selected: SelectedFood | null = null;

export const selectFood = (food: SelectedFood) => {
  selected = food;
};
export const selectedFood = () => selected;
