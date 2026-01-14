export function decideAdjustments(performanceInsight) {
  const {
    overload = [],
    prs = [],
    volumeTrends = [],
    stagnation = [],
    fatigue,
  } = performanceInsight;

  const adjustments = [];

  // 🚨 GLOBAL FATIGUE OVERRIDE
  if (fatigue?.level === "high") {
    adjustments.push({
      action: "deload",
      target: "volume",
      amount: -25,
      reason: "high fatigue detected — deload required",
    });

    return adjustments; // No further decisions allowed
  }

  for (const overloadSignal of overload) {
    const { exerciseId, status, reason } = overloadSignal;

    const stagnationSignal = stagnation.find(
      (s) => s.exerciseId === exerciseId
    );

    const volumeSignal = volumeTrends.find(
      (v) => v.exerciseId === exerciseId
    );

    const hasRecentPR = prs.some(
      (pr) => pr.exerciseId === exerciseId
    );

    // 🟢 RULE 1 — PROGRESSION
    if (
      status === "progressing" &&
      fatigue?.level === "low" &&
      stagnationSignal?.stagnated === false
    ) {
      let target = "weight";
      let amount = 2.5;

      if (reason === "reps") {
        target = "reps";
        amount = 1;
      }

      adjustments.push({
        exerciseId,
        action: "increase",
        target,
        amount,
        reason: "consistent progression with low fatigue",
      });

      continue;
    }

    // 🟡 RULE 2 — HOLD
    if (
      status === "progressing" ||
      volumeSignal?.trend === "increasing"
    ) {
      adjustments.push({
        exerciseId,
        action: "maintain",
        reason: "progress ongoing — no adjustment needed",
      });

      continue;
    }

    // 🟠 RULE 3 — STAGNATION INTERVENTION
    if (
      stagnationSignal?.stagnated === true &&
      fatigue?.level !== "high"
    ) {
      adjustments.push({
        exerciseId,
        action: "variation",
        target: "volume",
        reason: "stagnation detected without excessive fatigue",
      });

      continue;
    }

    // 🔵 FALLBACK — MAINTAIN
    adjustments.push({
      exerciseId,
      action: "maintain",
      reason: "no decisive signal — maintaining current load",
    });
  }

  return adjustments;
}

