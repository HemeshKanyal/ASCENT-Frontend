import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { EXERCISES } from "../exercises.js";

// howto.ts is TypeScript, so check its keys textually rather than importing it.
const src = readFileSync(new URL("../../data/howto.ts", import.meta.url), "utf8");
const keys = new Set([...src.matchAll(/^ {2}(\w+): h\(/gm)].map((m) => m[1]));

test("every exercise has step-by-step instructions", () => {
  for (const e of EXERCISES) assert.ok(keys.has(e.id), `${e.id} missing from src/data/howto.ts`);
});

test("how-to has no entries for unknown exercises", () => {
  const ids = new Set(EXERCISES.map((e) => e.id));
  for (const k of keys) assert.ok(ids.has(k), `${k} is not an exercise id`);
});
