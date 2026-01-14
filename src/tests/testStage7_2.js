import { decideAdjustments } from "../services/autoEvolutionEngine.js";
import { runPerformanceAnalysis } from "../services/performanceEngine.js";
import { applyAdjustmentsToTemplate } from "../services/templateEvolutionEngine.js";
import { mockSessions } from "./mockSessions.js";

const template = {
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

const evolvedTemplate = applyAdjustmentsToTemplate(
  template,
  adjustments
);

console.log("OLD TEMPLATE:", template);
console.log("NEW TEMPLATE:", evolvedTemplate);
