import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "WORKOUT_SESSIONS";

export const saveSession = async (session) => {
  const existing = await getSessions();
  await AsyncStorage.setItem(KEY, JSON.stringify([...existing, session]));
};

export const getSessions = async () => {
  const data = await AsyncStorage.getItem(KEY);
  return data ? JSON.parse(data) : [];
};

export const clearSessions = async () => {
  await AsyncStorage.removeItem(KEY);
};
