import { router, useLocalSearchParams } from "expo-router";
import { Button, Text, View } from "react-native";

export default function TrainingType() {
    const params = useLocalSearchParams();

    return (
        <View style={{ flex: 1, padding: 24 }}>
            <Text style={{ fontSize: 22 }}>How do you train?</Text>

            {["Gym", "Calisthenics", "Mixed"].map((type) => (
                <Button
                    key={type}
                    title={type}
                    onPress={() =>
                        router.push({
                            pathname: "/onboarding/days",
                            params: { ...params, trainingType: type },
                        })
                    }
                />
            ))}
        </View>
    );
}
