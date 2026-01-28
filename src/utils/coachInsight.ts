type Profile = {
    experience: string;
    goal: string;
    trainingType: string;
    daysPerWeek: number;
};

type Recommendation = {
    split: "Full Body" | "Upper/Lower" | "Push/Pull/Legs";
};

export function getCoachInsight(
    profile: Profile,
    recommendation: Recommendation
): string {
    const { goal, daysPerWeek } = profile;
    const { split } = recommendation;

    let splitText = "";
    let goalText = "";

    // ---- Split explanation ----
    if (split === "Full Body") {
        splitText =
            "A Full Body split trains all major muscle groups each session, which is ideal for building consistency and balanced strength.";
    }

    if (split === "Upper/Lower") {
        splitText =
            "An Upper/Lower split allows you to train each muscle group twice per week while giving enough recovery time between sessions.";
    }

    if (split === "Push/Pull/Legs") {
        splitText =
            "A Push/Pull/Legs split increases training volume and focus, which supports advanced strength and muscle gains.";
    }

    // ---- Goal explanation ----
    if (goal === "Fat Loss") {
        goalText =
            "This structure helps maintain muscle while supporting fat loss.";
    }

    if (goal === "Hypertrophy") {
        goalText =
            "This setup maximizes muscle growth through balanced volume and recovery.";
    }

    if (goal === "Strength") {
        goalText =
            "This approach supports progressive overload and strength adaptation.";
    }

    // ---- Frequency nuance (optional) ----
    let frequencyText = "";
    if (daysPerWeek <= 3) {
        frequencyText =
            " Lower weekly frequency reduces fatigue and improves adherence.";
    } else if (daysPerWeek === 4) {
        frequencyText =
            " This frequency balances training intensity and recovery.";
    } else {
        frequencyText =
            " Higher frequency allows more focused sessions with controlled fatigue.";
    }

    return `${splitText} ${goalText}${frequencyText}`;
}