import { router, useLocalSearchParams } from "expo-router";
import { Button, Text, View } from "react-native";

export default function Days() {
    const params = useLocalSearchParams();

    return (
        <View style={{ flex: 1, padding: 24 }}>
            <Text style={{ fontSize: 22 }}>Days per week?</Text>

            {[2, 3, 4, 5, 6].map((d) => (
                <Button
                    key={d}
                    title={`${d} days`}
                    onPress={() =>
                        router.push({
                            pathname: "/onboarding/finish" as any,
                            params: { ...params, daysPerWeek: d },
                        })
                    }
                />
            ))}
        </View>
    );
}
