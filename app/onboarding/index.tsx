import { Redirect } from "expo-router";

export default function Onboarding() {
    return <Redirect href={"/onboarding/experience" as any} />;
}