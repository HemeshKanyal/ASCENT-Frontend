import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { colors, fonts } from "../../src/ui/theme";

const icon = (name: React.ComponentProps<typeof Ionicons>["name"]) => {
  const TabIcon = ({ color }: { color: React.ComponentProps<typeof Ionicons>["color"] }) => <Ionicons size={24} name={name} color={color} />;
  return TabIcon;
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: icon("barbell") }} />
      <Tabs.Screen name="fuel" options={{ title: "Fuel", tabBarIcon: icon("nutrition") }} />
      <Tabs.Screen name="feed" options={{ title: "Crew", tabBarIcon: icon("people") }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: icon("stats-chart") }} />
      <Tabs.Screen name="library" options={{ title: "Library", tabBarIcon: icon("library") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("person-circle") }} />
    </Tabs>
  );
}
