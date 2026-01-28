export function createActiveSession(template) {
    return {
        id: `session_${Date.now()}`,
        workoutTemplateId: template.createdAt,
        splitName: template.splitName,
        day: template.day,
        exercises: template.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            name: ex.name,
            sets: Array.from({ length: ex.sets }).map((_, i) => ({
                setNumber: i + 1,
                reps: null,
                weight: null,
                completed: false,
            })),
        })),
        startedAt: new Date().toISOString(),
        completed: false,
    };
}