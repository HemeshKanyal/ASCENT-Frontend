import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect } from "react";


export default function Index() {
    const router = useRouter();


    useEffect(() => {
        const checkOnboarding = async () => {
            const done = await AsyncStorage.getItem("onboardingComplete");


            if (done === "true") {
                router.replace("/(tabs)/dashboard");
            } else {
                router.replace("/onboarding");
            }
        };


        checkOnboarding();
    }, []);


    return null;
}