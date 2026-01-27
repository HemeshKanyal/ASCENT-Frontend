import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function Finish() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const handleStartTraining = async () => {
        const profile = {
            experience: params.experience,
            goal: params.goal,
            trainingType: params.trainingType,
            daysPerWeek: params.daysPerWeek,
        };

        // ✅ Persist profile
        await AsyncStorage.setItem("profile", JSON.stringify(profile));
        await AsyncStorage.setItem("onboardingComplete", "true");

        // ✅ CRITICAL: jump INTO tabs → dashboard
        router.replace("/(tabs)/dashboard");
    };

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 22, fontWeight: "bold" }}>
                You're all set!
            </Text>

            <Pressable
                onPress={handleStartTraining}
                style={{
                    marginTop: 20,
                    backgroundColor: "#2196f3",
                    padding: 12,
                    alignItems: "center",
                }}
            >
                <Text style={{ color: "white", fontWeight: "bold" }}>
                    START TRAINING
                </Text>
            </Pressable>
        </View>
    );
}