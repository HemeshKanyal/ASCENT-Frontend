import { getSessions } from "./sessionStorage";

export const analyzeProgress = async () => {
  const sessions = await getSessions();
  if (sessions.length === 0) return null;

  let totalWorkouts = sessions.length;
  let lastWorkout = sessions[sessions.length - 1].date;

  const exerciseMap = {};
  const muscleMap = {};
  let completedSets = 0;

  sessions.forEach((session) => {
    session.exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        if (set.completed) {
          completedSets++;

          // Exercise frequency
          exerciseMap[ex.name] = (exerciseMap[ex.name] || 0) + 1;
        }
      });
    });
  });

  return {
    totalWorkouts,
    lastWorkout,
    completedSets,
    mostUsedExercises: Object.entries(exerciseMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  };
};
