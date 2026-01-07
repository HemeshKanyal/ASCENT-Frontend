import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { getAllExercises } from "../../src/services/api";

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams();
  const [exercise, setExercise] = useState<any>(null);

  useEffect(() => {
    getAllExercises().then((data) => {
      setExercise(data.find((e: any) => e._id === id));
    });
  }, [id]);

  if (!exercise) return <Text>Loading...</Text>;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 24 }}>{exercise.name}</Text>
      <Text>Category: {exercise.category}</Text>
      <Text>Primary: {exercise.muscles.primary.join(", ")}</Text>
    </View>
  );
}
