import {
    acceptProposal,
    createEvolutionProposal,
    rejectProposal,
} from "../services/evolutionControlEngine.js";

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

const proposal = createEvolutionProposal({
  oldTemplate,
  newTemplate,
  evolutionLog,
  insights,
});

console.log("PROPOSAL:");
console.log(proposal);

console.log("ACCEPTED:");
console.log(acceptProposal(proposal));

console.log("REJECTED:");
console.log(rejectProposal(proposal, "User prefers manual control"));
