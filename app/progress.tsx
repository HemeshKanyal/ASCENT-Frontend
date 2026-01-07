import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { analyzeProgress } from "../src/services/progressEngine";

export default function ProgressScreen() {
  const [progress, setProgress] = useState(null);

  const loadProgress = async () => {
    const data = await analyzeProgress();
    setProgress(data);
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Progress Overview
      </Text>

      <Pressable onPress={loadProgress}>
        <Text>Analyze Progress</Text>
      </Pressable>

      {progress && (
        <>
          <Text>Total workouts: {progress.totalWorkouts}</Text>
          <Text>Completed sets: {progress.completedSets}</Text>
          <Text>Last workout: {new Date(progress.lastWorkout).toDateString()}</Text>

          <Text style={{ marginTop: 10, fontWeight: "bold" }}>
            Most trained exercises:
          </Text>

          {progress.mostUsedExercises.map((e) => (
            <Text key={e[0]}>
              {e[0]} — {e[1]} sets
            </Text>
          ))}
        </>
      )}
    </View>
  );
}
