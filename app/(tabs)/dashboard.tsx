import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getCoachInsight } from "../../src/utils/coachInsight";

type Profile = {
    experience: string;
    goal: string;
    trainingType: string;
    daysPerWeek: number;
};

export default function Dashboard() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [coachInsight, setCoachInsight] = useState("");

    useEffect(() => {
        const loadProfile = async () => {
            const storedProfile = await AsyncStorage.getItem("profile");
            if (!storedProfile) return;

            const parsed: Profile = JSON.parse(storedProfile);
            setProfile(parsed);

            // 🔹 Temporary recommendation (read-only)
            const recommendation = {
                split:
                    parsed.daysPerWeek <= 3
                        ? "Full Body"
                        : parsed.daysPerWeek === 4
                            ? "Upper/Lower"
                            : "Push/Pull/Legs",
            };

            const insight = getCoachInsight(parsed, recommendation);
            setCoachInsight(insight);
        };

        loadProfile();
    }, []);

    if (!profile) return null;

    const split =
        profile.daysPerWeek <= 3
            ? "Full Body"
            : profile.daysPerWeek === 4
                ? "Upper/Lower"
                : "Push/Pull/Legs";

    return (
        <View style={styles.container}>
            {/* Greeting */}
            <Text style={styles.heading}>Welcome back 👋</Text>

            {/* Profile summary */}
            <View style={styles.card}>
                <Text style={styles.label}>Goal</Text>
                <Text style={styles.value}>{profile.goal}</Text>

                <Text style={styles.label}>Training Split</Text>
                <Text style={styles.value}>{split}</Text>

                <Text style={styles.label}>Days per week</Text>
                <Text style={styles.value}>{profile.daysPerWeek}</Text>
            </View>

            {/* Coach Insight */}
            <View style={styles.insightCard}>
                <Text style={styles.insightTitle}>Coach Insight</Text>
                <Text style={styles.insightText}>{coachInsight}</Text>
            </View>

            {/* Read-only CTA */}
            <View style={styles.card}>
                <Text style={styles.nextText}>
                    You’re ready to start training. When you’re comfortable,
                    begin your first workout.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        gap: 16,
    },
    heading: {
        fontSize: 22,
        fontWeight: "bold",
    },
    card: {
        backgroundColor: "#f2f2f2",
        padding: 16,
        borderRadius: 12,
    },
    label: {
        fontSize: 12,
        color: "#666",
        marginTop: 8,
    },
    value: {
        fontSize: 16,
        fontWeight: "600",
    },
    insightCard: {
        backgroundColor: "#e8f0ff",
        padding: 16,
        borderRadius: 12,
    },
    insightTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 6,
    },
    insightText: {
        fontSize: 14,
        lineHeight: 20,
    },
    nextText: {
        fontSize: 14,
        color: "#333",
    },
});