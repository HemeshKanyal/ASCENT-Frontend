import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { saveSession } from "../src/services/sessionStorage";
import { getWorkoutTemplates } from "../src/services/workoutStorage";

export default function WorkoutSession() {
  const [templates, setTemplates] = useState([]);
  const [session, setSession] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const data = await getWorkoutTemplates();
    setTemplates(data);
  };

  const startSession = (template) => {
    const newSession = {
      id: Date.now().toString(),
      templateName: template.day,
      date: new Date().toISOString(),
      exercises: template.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        name: e.name,
        sets: Array.from({ length: e.sets }).map(() => ({
          reps: e.reps,
          weight: "",
          completed: false
        }))
      }))
    };

    setSession(newSession);
  };

  const completeSet = (exIndex, setIndex) => {
    const copy = { ...session };
    copy.exercises[exIndex].sets[setIndex].completed = true;
    setSession(copy);
  };

  const finishWorkout = async () => {
    await saveSession(session);
    setSession(null);
    alert("Workout saved");
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        Workout Session
      </Text>

      {!session && templates.map((t, i) => (
        <Pressable key={i} onPress={() => startSession(t)}>
          <Text>Start {t.day} workout</Text>
        </Pressable>
      ))}

      {session && (
        <>
          <Text>Workout in progress</Text>

          {session.exercises.map((ex, ei) => (
            <View key={ei}>
              <Text>{ex.name}</Text>

              {ex.sets.map((s, si) => (
                <Pressable
                  key={si}
                  onPress={() => completeSet(ei, si)}
                >
                  <Text>
                    Set {si + 1}: {s.completed ? "Done" : "Pending"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}

          <Pressable onPress={finishWorkout}>
            <Text style={{ marginTop: 20 }}>Finish Workout</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
