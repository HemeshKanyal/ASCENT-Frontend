/**
 * Stage 7.2 — Template Evolution Engine
 * Applies workout adjustments safely with versioning
 */

export function applyAdjustmentsToTemplate(
  template,
  adjustments = []
) {
  // Deep clone to prevent mutation
  const newTemplate = JSON.parse(JSON.stringify(template));

  newTemplate.version = (template.version || 1) + 1;
  newTemplate.baseTemplateId =
    template.baseTemplateId || template.id;
  newTemplate.createdAt = new Date().toISOString();

  for (const adjustment of adjustments) {
    // GLOBAL DELOAD
    if (adjustment.action === "deload") {
      newTemplate.exercises.forEach((exercise) => {
        if (exercise.sets) {
          exercise.sets = Math.max(
            1,
            Math.floor(exercise.sets * 0.75)
          );
        }
      });
      continue;
    }

    const exercise = newTemplate.exercises.find(
      (e) => e.exerciseId === adjustment.exerciseId
    );

    if (!exercise) continue;

    switch (adjustment.action) {
      case "increase":
        applyIncrease(exercise, adjustment);
        break;

      case "variation":
        exercise.notes = "Consider exercise variation";
        break;

      case "maintain":
      default:
        // No changes
        break;
    }
  }

  return newTemplate;
}

function applyIncrease(exercise, adjustment) {
  const { target, amount } = adjustment;

  if (!amount) return;

  switch (target) {
    case "weight":
      exercise.weight =
        Number(exercise.weight || 0) + amount;
      break;

    case "reps":
      exercise.reps =
        Number(exercise.reps || 0) + amount;
      break;

    case "sets":
      exercise.sets =
        Number(exercise.sets || 1) + amount;
      break;

    default:
      break;
  }
}
