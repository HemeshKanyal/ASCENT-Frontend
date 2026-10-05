import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

// Phones resolve "./X" to "X.native.tsx" (or X.ios/.android) when it exists. If that file imports
// "./X" itself, it imports itself forever — the crash this guards against (the web never sees it).
const ROOTS = ["src", "app"];
const files = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(native|ios|android|web)\.(t|j)sx?$/.test(e.name)) files.push(p);
  }
};
ROOTS.forEach((r) => fs.existsSync(r) && walk(r));

describe("platform-specific files", () => {
  it("never import themselves through their platform-less name", () => {
    for (const f of files) {
      const base = path.basename(f).replace(/\.(native|ios|android|web)\.(t|j)sx?$/, "");
      const code = fs.readFileSync(f, "utf8").replace(/\/\/.*$/gm, "");
      const imports = [...code.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((m) => m[1]);
      for (const spec of imports) {
        const resolved = path.normalize(path.join(path.dirname(f), spec));
        assert.notEqual(resolved, path.join(path.dirname(f), base), `${f} imports itself via "${spec}"`);
      }
    }
  });
});

describe("Expo Go compatibility", () => {
  // Importing expo-notifications at the top of a module crashes Expo Go on Android (SDK 53+).
  it("never imports expo-notifications at module level", () => {
    const all = [];
    const walkAll = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walkAll(p);
        else if (/\.(t|j)sx?$/.test(e.name)) all.push(p);
      }
    };
    ROOTS.forEach((r) => fs.existsSync(r) && walkAll(r));
    for (const f of all) {
      const code = fs.readFileSync(f, "utf8");
      assert.ok(!/^import\s+(?!type\b)[^;]*from\s+["']expo-notifications["']/m.test(code), `${f} imports expo-notifications eagerly`);
    }
  });
});
