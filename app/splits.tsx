import { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { getAllSplits } from "../src/services/api";

export default function SplitsScreen() {
  const [splits, setSplits] = useState([]);

  useEffect(() => {
    getAllSplits().then(setSplits).catch(console.error);
  }, []);

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>Training Splits</Text>

      <FlatList
        data={splits}
        keyExtractor={(item: any) => item._id}
        renderItem={({ item }: any) => (
          <View style={{ padding: 12 }}>
            <Text style={{ fontSize: 18 }}>{item.name}</Text>
            <Text>{item.type}</Text>
          </View>
        )}
      />
    </View>
  );
}
