import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Workout App</Text>

      <Pressable onPress={() => router.push("/exercises")}>
        <Text style={{ marginTop: 20 }}>View Exercises</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/splits")}>
        <Text style={{ marginTop: 10 }}>View Splits</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/profile")}>
        <Text style={{ marginTop: 10 }}>Profile</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/recommendation")}>
        <Text style={{ marginTop: 10 }}>Get Split Recommendation</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/workout-builder")}>
        <Text style={{ marginTop: 10 }}>Workout Builder</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/workout-session")}>
        <Text style={{ marginTop: 10 }}>Start Workout</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/workout-history")}>
        <Text style={{ marginTop: 10 }}>Workout History</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/progress")}>
        <Text style={{ marginTop: 10 }}>Progress</Text>
      </Pressable>


    </View>
  );
}
