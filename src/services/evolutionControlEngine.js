/**
 * Stage 7.4 — User Control & Confidence Engine
 * Wraps evolution into user-controllable proposals
 */

export function calculateConfidenceScore(insights, adjustments) {
  let score = 0;

  const fatigue = insights.fatigue?.level;

  insights.overload.forEach((o) => {
    if (o.status === "progressing") score += 30;
  });

  if (insights.prs.length > 0) score += 20;

  insights.volumeTrends.forEach((v) => {
    if (v.trend === "increasing") score += 20;
  });

  if (fatigue === "low") score += 30;
  if (fatigue === "moderate") score -= 10;
  if (fatigue === "high") score -= 50;

  insights.stagnation.forEach((s) => {
    if (s.stagnated) score -= 30;
  });

  return Math.max(0, Math.min(100, score));
}

export function createEvolutionProposal({
  oldTemplate,
  newTemplate,
  evolutionLog,
  insights,
}) {
  const confidenceScore = calculateConfidenceScore(
    insights,
    evolutionLog.changes
  );

  return {
    id: `proposal_${Date.now()}`,
    templateId: oldTemplate.id,
    proposedTemplate: newTemplate,
    evolutionLog,
    confidenceScore,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

export function acceptProposal(proposal) {
  return {
    ...proposal,
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  };
}

export function rejectProposal(proposal, reason = "") {
  return {
    ...proposal,
    status: "rejected",
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason,
  };
}
