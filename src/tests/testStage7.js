import { decideAdjustments } from "../services/autoEvolutionEngine.js";
import { runPerformanceAnalysis } from "../services/performanceEngine.js";
import { mockSessions } from "./mockSessions.js";

const insights = runPerformanceAnalysis(mockSessions);

console.log("PERFORMANCE INSIGHTS:");
console.log(insights);

console.log("AUTO-EVOLUTION DECISIONS:");
console.log(decideAdjustments(insights));
