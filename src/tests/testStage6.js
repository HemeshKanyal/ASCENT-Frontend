import {
    analyzeVolumeTrends,
    detectFatigue,
    detectProgressiveOverload,
    detectPRs,
    detectStagnation,
    extractExercisePerformance,
    runPerformanceAnalysis,
} from "../services/performanceEngine.js";

import { mockSessions } from "./mockSessions.js";

console.log("----- STAGE 6.1: METRICS -----");
console.log(extractExercisePerformance(mockSessions));

console.log("----- STAGE 6.2: OVERLOAD -----");
console.log(detectProgressiveOverload(mockSessions));

console.log("----- STAGE 6.3: PRs -----");
console.log(detectPRs(mockSessions));

console.log("----- STAGE 6.4: VOLUME TRENDS -----");
console.log(analyzeVolumeTrends(mockSessions));

console.log("----- STAGE 6.5: STAGNATION -----");
console.log(detectStagnation(mockSessions));

console.log("----- STAGE 6.6: FATIGUE -----");
console.log(detectFatigue(mockSessions));

console.log("----- FULL ANALYSIS -----");
console.log(runPerformanceAnalysis(mockSessions));
