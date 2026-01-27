import { router } from "expo-router";
import { useState } from "react";
import { Button, Text, View } from "react-native";

export default function Experience() {
    const [experience, setExperience] = useState("Beginner");

    return (
        <View style={{ flex: 1, padding: 24 }}>
            <Text style={{ fontSize: 22 }}>Your experience level?</Text>

            {["Beginner", "Intermediate", "Advanced"].map((lvl) => (
                <Button
                    key={lvl}
                    title={lvl}
                    onPress={() => setExperience(lvl)}
                />
            ))}

            <Button
                title="Next"
                onPress={() =>
                    router.push({
                        pathname: "/onboarding/goal",
                        params: { experience },
                    })
                }
            />
        </View>
    );
}
