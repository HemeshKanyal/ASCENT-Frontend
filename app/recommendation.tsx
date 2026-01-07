import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { recommendSplits } from "../src/services/splitRecommendation";

export default function RecommendationScreen() {
  const [result, setResult] = useState(null);

  const generate = async () => {
    try {
      const data = await recommendSplits();
      setResult(data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Split Recommendation
      </Text>

      <Pressable onPress={generate}>
        <Text style={{ marginTop: 20 }}>
          Generate Recommendation
        </Text>
      </Pressable>

      {result && (
        <View style={{ marginTop: 20 }}>
          <Text>Based on your profile:</Text>
          <Text>Goal: {result.profile.goal}</Text>
          <Text>Experience: {result.profile.experienceLevel}</Text>
          <Text>Days/week: {result.profile.daysPerWeek}</Text>

          <Text style={{ marginTop: 10, fontWeight: "bold" }}>
            Recommended Splits:
          </Text>

          {result.splits.map((s) => (
            <Text key={s._id}>• {s.name}</Text>
          ))}
        </View>
      )}
    </View>
  );
}
