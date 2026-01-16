import { decideAdjustments } from "../services/autoEvolutionEngine.js";
import { generateEvolutionRecord } from "../services/evolutionLogEngine.js";
import { runPerformanceAnalysis } from "../services/performanceEngine.js";
import { applyAdjustmentsToTemplate } from "../services/templateEvolutionEngine.js";
import { mockSessions } from "./mockSessions.js";

const oldTemplate = {
  id: "tpl_1",
  version: 1,
  createdAt: "2025-01-01",
  exercises: [
    {
      exerciseId: "bench_press",
      name: "Bench Press",
      sets: 3,
      reps: 8,
      weight: 62.5,
    },
  ],
};

const insights = runPerformanceAnalysis(mockSessions);
const adjustments = decideAdjustments(insights);

const newTemplate = applyAdjustmentsToTemplate(
  oldTemplate,
  adjustments
);

const evolutionLog = generateEvolutionRecord({
  oldTemplate,
  newTemplate,
  adjustments,
});

console.log("EVOLUTION LOG:");
console.log(JSON.stringify(evolutionLog, null, 2));
