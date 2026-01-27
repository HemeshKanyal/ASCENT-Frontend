import { Text, View } from "react-native";

export default function Dashboard() {
    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 22, fontWeight: "bold" }}>
                Dashboard
            </Text>
            <Text>Welcome! Your onboarding is complete 🎉</Text>
        </View>
    );
}