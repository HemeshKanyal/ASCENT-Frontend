import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { getSessions } from "../src/services/sessionStorage";

export default function WorkoutHistory() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const data = await getSessions();
    setSessions(data);
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Workout History
      </Text>

      {sessions.map((s) => (
        <Text key={s.id}>
          {new Date(s.date).toDateString()} - {s.templateName}
        </Text>
      ))}
    </View>
  );
}
