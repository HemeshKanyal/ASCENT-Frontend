import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_KEY = "USER_PROFILE";

// Save or update profile
export const saveUserProfile = async (profile) => {
  const data = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(data));
};

// Get profile
export const getUserProfile = async () => {
  const data = await AsyncStorage.getItem(PROFILE_KEY);
  return data ? JSON.parse(data) : null;
};

// Clear profile (for reset/testing)
export const clearUserProfile = async () => {
  await AsyncStorage.removeItem(PROFILE_KEY);
};
