import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "WORKOUT_TEMPLATES";

export const saveWorkoutTemplate = async (workout) => {
  const existing = await getWorkoutTemplates();
  const updated = [...existing, workout];
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
};

export const getWorkoutTemplates = async () => {
  const data = await AsyncStorage.getItem(KEY);
  return data ? JSON.parse(data) : [];
};

export const clearWorkoutTemplates = async () => {
  await AsyncStorage.removeItem(KEY);
};
