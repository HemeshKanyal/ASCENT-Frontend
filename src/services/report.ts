/**
 * Doctor report: a printable/shareable PDF of the last N days — nutrition
 * averages vs references, daily log, supplements, weight and training.
 */
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { NUTRIENTS, SUPPLEMENT_BY_ID, ageFrom, dailyTargets, microReferences } from "../engine";
import { conditionById } from "../data/health";
import { daySummaries, getStack, getWeights } from "./nutritionStore";
import { getProfile, getSessions } from "./trainingStore";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const r1 = (n: number) => Math.round(n * 10) / 10;

export async function buildReportHtml(days = 14) {
  const profile = await getProfile();
  if (!profile) throw new Error("No profile");
  const summaries = await daySummaries(days);
  const logged = summaries.filter((d) => d.logged);
  const n = Math.max(1, logged.length);
  const avg = (f: (d: (typeof summaries)[number]) => number) => logged.reduce((s, d) => s + f(d), 0) / n;

  const { sex, birthYear, heightCm, weightKg } = profile.body;
  const age = ageFrom(birthYear);
  const targets = weightKg && heightCm && age ? dailyTargets({ body: { sex, weightKg, heightCm, age }, goal: profile.goal, health: profile.health }) : null;
  const refs = microReferences({ sex, age: age ?? 30, kcal: targets?.kcal ?? 2000, conditions: profile.health.conditions });
  const coverage = avg((d) => d.coverage);

  const weights = (await getWeights()).slice(-30);
  const stack = await getStack();
  const sessions = (await getSessions()).filter((s) => Date.now() - new Date(s.date).getTime() < days * 864e5);

  const macroRows = [
    ["Calories", r1(avg((d) => d.kcal)), targets?.kcal, "kcal"],
    ["Protein", r1(avg((d) => d.protein)), targets?.protein, "g"],
    ["Carbohydrate", r1(avg((d) => d.carbs)), targets?.carbs, "g"],
    ["Fat", r1(avg((d) => d.fat)), targets?.fat, "g"],
    ["Fibre", r1(avg((d) => d.fiber)), targets?.fiber, "g"],
    ["Water", r1(avg((d) => d.water) / 1000), targets ? r1(targets.waterMl / 1000) : undefined, "L"],
  ];
  const microRows = NUTRIENTS.map((nu) => {
    const value = avg((d) => d.micros[nu.key] ?? 0);
    const ref = refs[nu.key];
    const pct = ref ? Math.round((value / ref.amount) * 100) : null;
    const flag = ref?.kind === "limit" ? (value > ref.amount ? "above limit" : "") : ref?.kind === "goal" && pct != null && pct < 67 ? "low" : "";
    return `<tr><td>${nu.label}</td><td>${r1(value)} ${nu.unit}</td><td>${ref ? `${ref.kind === "limit" ? "≤ " : ""}${ref.amount} ${nu.unit}` : "–"}</td><td>${pct ?? "–"}%</td><td class="flag">${flag}</td></tr>`;
  }).join("");

  const dailyRows = summaries
    .map(
      (d) =>
        `<tr><td>${d.day}</td><td>${d.logged ? Math.round(d.kcal) : "–"}</td><td>${d.logged ? r1(d.protein) : "–"}</td><td>${d.logged ? r1(d.carbs) : "–"}</td><td>${d.logged ? r1(d.fat) : "–"}</td><td>${d.logged ? r1(d.fiber) : "–"}</td><td>${d.logged ? Math.round(d.micros.sodium ?? 0) : "–"}</td><td>${d.logged ? r1(d.micros.sugar ?? 0) : "–"}</td></tr>`
    )
    .join("");

  const conditions = profile.health.conditions.map((c) => conditionById(c)?.label ?? c);

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111;margin:28px;font-size:12px}
  h1{font-family:Georgia,serif;font-style:italic;font-size:26px;margin:0 0 4px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:22px 0 6px;border-bottom:1px solid #ccc;padding-bottom:4px}
  table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #eee;padding:4px 6px;text-align:left}
  th{background:#f4f4f4}.flag{font-weight:bold}.muted{color:#666}
  </style></head><body>
  <h1>ASCENT nutrition & training report</h1>
  <div class="muted">${esc(new Date().toLocaleDateString())} · last ${days} days · ${logged.length} days with food logged</div>

  <h2>Person</h2>
  <table>
  <tr><td>Age / sex</td><td>${age ?? "–"} / ${sex ?? "–"}</td></tr>
  <tr><td>Height / weight</td><td>${heightCm ?? "–"} cm / ${weightKg ?? "–"} kg</td></tr>
  <tr><td>Conditions</td><td>${conditions.length ? esc(conditions.join(", ")) : "None recorded"}</td></tr>
  <tr><td>Doctor's instructions (as entered)</td><td>${profile.health.doctorNotes ? esc(profile.health.doctorNotes) : "–"}${profile.health.proteinLimitG ? `<br>Protein limit: ${profile.health.proteinLimitG} g/day` : ""}</td></tr>
  <tr><td>Diet</td><td>${esc(profile.food.dietType)}${profile.food.allergies.length ? ` · avoids ${esc(profile.food.allergies.join(", "))}` : ""}</td></tr>
  <tr><td>Supplements</td><td>${stack.length ? esc(stack.map((s) => `${SUPPLEMENT_BY_ID[s.id]?.name ?? s.id} × ${s.qty}`).join(", ")) : "None"}</td></tr>
  </table>

  <h2>Daily averages vs targets</h2>
  <table><tr><th>Nutrient</th><th>Average</th><th>Target</th><th>Unit</th></tr>
  ${macroRows.map(([l, v, t, u]) => `<tr><td>${l}</td><td>${v}</td><td>${t ?? "–"}</td><td>${u}</td></tr>`).join("")}
  </table>

  <h2>Vitamins, minerals & limits (daily average)</h2>
  <table><tr><th>Nutrient</th><th>Average</th><th>Reference</th><th>% of ref.</th><th></th></tr>${microRows}</table>
  <div class="muted">References: US National Academies DRIs; limits from Dietary Guidelines. Vitamin data covers ~${Math.round(coverage * 100)}% of logged calories (some foods lack data), so true intake may be higher.</div>

  <h2>Daily log</h2>
  <table><tr><th>Date</th><th>kcal</th><th>Protein g</th><th>Carbs g</th><th>Fat g</th><th>Fibre g</th><th>Sodium mg</th><th>Sugar g</th></tr>${dailyRows}</table>

  <h2>Body weight</h2>
  <div>${weights.length ? esc(weights.map((w) => `${w.date}: ${w.kg} kg`).join(" · ")) : "No weigh-ins recorded."}</div>

  <h2>Training (last ${days} days)</h2>
  <div>${sessions.length} sessions · ${sessions.reduce((s, x) => s + (x.durationMinutes ?? 0), 0)} minutes total${
    sessions.length ? ` · ${esc([...new Set(sessions.map((s) => s.title ?? s.kind ?? "session"))].slice(0, 8).join(", "))}` : ""
  }</div>

  <p class="muted" style="margin-top:24px">Self-reported data logged in the ASCENT app. Food values are estimates from USDA FoodData Central and Open Food Facts. Not a medical record.</p>
  </body></html>`;
}

/** Create the PDF and open the share sheet (phone) or print dialog (web). */
export async function shareReport(days = 14) {
  const html = await buildReportHtml(days);
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share report with your doctor", UTI: "com.adobe.pdf" });
}
