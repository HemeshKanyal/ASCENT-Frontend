import { getAllExercises } from "./api";

/*
  input:
   - split (object)
   - day ("Push", "Pull", "Legs", etc.)

  output:
   - workout plan
*/

export const generateWorkout = async (split, day) => {
  const allExercises = await getAllExercises();

  // find day structure from split
  const dayPlan = split.structure.find((d) => d.day === day);
  if (!dayPlan) throw new Error("Invalid training day");

  const focuses = dayPlan.focus; // ["Chest","Shoulders","Triceps"]

  // filter exercises by muscle match
  const matching = allExercises.filter((ex) =>
    focuses.some((f) =>
      ex.muscles?.primary?.includes(f) ||
      ex.muscles?.secondary?.includes(f)
    )
  );

  // basic workout composition logic
  const workoutExercises = matching.slice(0, 6).map((ex) => ({
    exerciseId: ex._id,
    name: ex.name,
    sets: 3,
    reps: "8-12",
    rest: "60s"
  }));

  return {
    splitName: split.name,
    day,
    focus: focuses,
    exercises: workoutExercises,
    createdAt: new Date().toISOString()
  };
};
