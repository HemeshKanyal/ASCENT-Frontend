/**
 * Stage 7.3 — Evolution Transparency Engine
 * Generates explainable change logs for workout evolution
 */

export function generateEvolutionRecord({
  oldTemplate,
  newTemplate,
  adjustments = [],
}) {
  const changes = [];

  for (const adj of adjustments) {
    if (!adj.exerciseId) continue;

    const oldEx = oldTemplate.exercises.find(
      (e) => e.exerciseId === adj.exerciseId
    );
    const newEx = newTemplate.exercises.find(
      (e) => e.exerciseId === adj.exerciseId
    );

    if (!oldEx || !newEx) continue;

    // Compare known mutable fields
    ["weight", "reps", "sets"].forEach((field) => {
      if (oldEx[field] !== newEx[field]) {
        changes.push({
          exerciseId: adj.exerciseId,
          field,
          before: oldEx[field],
          after: newEx[field],
          reason: adj.reason,
        });
      }
    });
  }

  return {
    id: `evo_${Date.now()}`,
    timestamp: new Date().toISOString(),
    baseTemplateId:
      newTemplate.baseTemplateId || newTemplate.id,
    fromVersion: oldTemplate.version,
    toVersion: newTemplate.version,
    changes,
  };
}
