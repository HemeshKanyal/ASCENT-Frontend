import { Stack, router, useRootNavigationState, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { getUserProfile } from "../src/services/userProfile";

export default function RootLayout() {
  const [checkingProfile, setCheckingProfile] = useState(true);
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    // Wait for the navigation to be ready
    if (!rootNavigationState?.key) return;

    async function init() {
      try {
        console.log("Checking user profile...");
        const profile = await getUserProfile();
        console.log("Profile result:", profile);

        const inAuthGroup = segments[0] === "(tabs)";
        const inOnboardingGroup = segments[0] === "onboarding";

        // Logic to prevent redirect loops
        if (!profile && !inOnboardingGroup) {
          console.log("Redirecting to /onboarding");
          router.replace("/onboarding" as any);
        } else if (profile && !inAuthGroup) {
          console.log("Redirecting to /(tabs)");
          router.replace("/(tabs)" as any);
        } else {
          console.log("No redirect needed. Current segment:", segments[0]);
        }
      } catch (error) {
        console.error("Error in auth check:", error);
      } finally {
        setCheckingProfile(false);
      }
    }

    init();
  }, [rootNavigationState?.key /* Re-run only if root nav availability changes */]);

  // Render Stack always to ensure navigation context is available
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
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
            backgroundColor: "white", // ensure it covers the screen
            zIndex: 1000,
          }}
        >
          <ActivityIndicator size="large" />
        </View>
      )}
    </View>
  );
}
