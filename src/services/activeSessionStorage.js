import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ACTIVE_WORKOUT_SESSION";

export const saveActiveSession = async (session) => {
    await AsyncStorage.setItem(KEY, JSON.stringify(session));
};

export const getActiveSession = async () => {
    const data = await AsyncStorage.getItem(KEY);
    return data ? JSON.parse(data) : null;
};

export const clearActiveSession = async () => {
    await AsyncStorage.removeItem(KEY);
};