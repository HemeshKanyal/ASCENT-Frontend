import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { recommendSplits } from "../src/services/splitRecommendation";
import { generateWorkout } from "../src/services/workoutGenerator";
import { saveWorkoutTemplate } from "../src/services/workoutStorage";

export default function WorkoutBuilder() {
  const [split, setSplit] = useState(null);
  const [workout, setWorkout] = useState(null);

  const loadSplit = async () => {
    const data = await recommendSplits();
    setSplit(data.splits[0]); // best split
  };

  const buildWorkout = async () => {
    const day = split.structure[0].day; // first day
    const plan = await generateWorkout(split, day);
    setWorkout(plan);
  };

  const saveWorkout = async () => {
    await saveWorkoutTemplate(workout);
    alert("Workout template saved");
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Workout Builder
      </Text>

      {!split && (
        <Pressable onPress={loadSplit}>
          <Text>Load Recommended Split</Text>
        </Pressable>
      )}

      {split && !workout && (
        <>
          <Text>Split: {split.name}</Text>
          <Pressable onPress={buildWorkout}>
            <Text>Generate Workout</Text>
          </Pressable>
        </>
      )}

      {workout && (
        <>
          <Text style={{ fontWeight: "bold" }}>
            {workout.day} Workout
          </Text>

          {workout.exercises.map((e, i) => (
            <Text key={i}>
              • {e.name} — {e.sets} x {e.reps}
            </Text>
          ))}

          <Pressable onPress={saveWorkout}>
            <Text style={{ marginTop: 20 }}>
              Save Workout Template
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
