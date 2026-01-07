import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { getAllExercises } from "../src/services/api";

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState([]);

  useEffect(() => {
    getAllExercises().then(setExercises).catch(console.error);
  }, []);

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>Exercises</Text>

      <FlatList
        data={exercises}
        keyExtractor={(item: any) => item._id}
        renderItem={({ item }: any) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/exercise/[id]",
                params: { id: item._id }
              })
            }
          >
            <Text style={{ padding: 12 }}>{item.name}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
