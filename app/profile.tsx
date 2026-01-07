import { View, Text, Pressable } from "react-native";
import { useEffect, useState } from "react";
import {
  saveUserProfile,
  getUserProfile,
} from "../src/services/userProfile";

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const data = await getUserProfile();
    setProfile(data);
  };

  const createDefaultProfile = async () => {
    const newProfile = {
      experienceLevel: "Beginner",
      goal: "Strength",
      trainingType: "Calisthenics",
      daysPerWeek: 4,
      createdAt: new Date().toISOString(),
    };

    await saveUserProfile(newProfile);
    setProfile(newProfile);
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        User Profile
      </Text>

      {!profile ? (
        <Pressable onPress={createDefaultProfile}>
          <Text style={{ marginTop: 20 }}>
            Create Profile
          </Text>
        </Pressable>
      ) : (
        <>
          <Text>Experience: {profile.experienceLevel}</Text>
          <Text>Goal: {profile.goal}</Text>
          <Text>Training: {profile.trainingType}</Text>
          <Text>Days / Week: {profile.daysPerWeek}</Text>
        </>
      )}
    </View>
  );
}
