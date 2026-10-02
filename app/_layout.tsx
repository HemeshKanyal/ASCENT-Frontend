import { DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from "@expo-google-fonts/dm-serif-display";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack, router, useRootNavigationState, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { onReminderTap } from "../src/services/reminders";
import { getProfile } from "../src/services/trainingStore";
import { colors } from "../src/ui/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [checkingProfile, setCheckingProfile] = useState(true);
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const [fontsLoaded, fontError] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => onReminderTap((url) => router.push(url as never)), []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Wait for the navigation to be ready
    if (!rootNavigationState?.key) return;

    getProfile()
      .then((profile) => {
        const inOnboarding = (segments[0] as string) === "onboarding";
        if (!profile && !inOnboarding) router.replace("/onboarding");
        else if (profile && inOnboarding) router.replace("/");
      })
      .catch((error) => console.error("Error in profile check:", error))
      .finally(() => setCheckingProfile(false));
  }, [rootNavigationState?.key /* Re-run only if root nav availability changes */]);

  if (!fontsLoaded && !fontError) return null;

  // Render Stack always to ensure navigation context is available
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="swap" options={{ presentation: "modal" }} />
      </Stack>
      {checkingProfile && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.bg,
            zIndex: 1000,
          }}
        >
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}
    </View>
  );
}
