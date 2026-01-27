import { router, useLocalSearchParams } from "expo-router";
import { Button, Text, View } from "react-native";

export default function Goal() {
    const params = useLocalSearchParams();

    return (
        <View style={{ flex: 1, padding: 24 }}>
            <Text style={{ fontSize: 22 }}>Your primary goal?</Text>

            {["Strength", "Hypertrophy", "Fat Loss", "Skill"].map((goal) => (
                <Button
                    key={goal}
                    title={goal}
                    onPress={() =>
                        router.push({
                            pathname: "/onboarding/trainingType",
                            params: { ...params, goal },
                        })
                    }
                />
            ))}
        </View>
    );
}
