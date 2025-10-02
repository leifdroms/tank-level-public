import { Tabs } from "expo-router";
import React, { useMemo } from "react";
import { Platform, Text } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useTankContext } from "@/context/TankContext";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const {
    state: { connected },
  } = useTankContext();

  const settingsDisabled = !connected;

  const disabledLabelColor = useMemo(
    () => Colors[colorScheme ?? "light"].tabIconDefault,
    [colorScheme]
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tank Monitor",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          // Gray out and block the tab while no device is connected.
          tabBarIcon: ({ color }) => (
            <IconSymbol
              size={28}
              name="gearshape.fill"
              color={settingsDisabled ? disabledLabelColor : color}
              style={settingsDisabled ? { opacity: 0.4 } : undefined}
            />
          ),
          tabBarLabel: ({ color }) => (
            <Text
              style={{
                color: settingsDisabled ? disabledLabelColor : color,
                opacity: settingsDisabled ? 0.4 : 1,
              }}
            >
              Settings
            </Text>
          ),
          tabBarAccessibilityLabel: settingsDisabled
            ? "Settings tab (disabled until connected)"
            : undefined,
          tabBarButton: (props) => (
            <HapticTab
              {...props}
              disabled={settingsDisabled}
              onPress={(event) => {
                if (settingsDisabled) {
                  event.preventDefault();
                  return;
                }
                props.onPress?.(event);
              }}
            />
          ),
        }}
        listeners={{
          tabPress: (event) => {
            if (settingsDisabled) {
              event.preventDefault();
            }
          },
        }}
      />
    </Tabs>
  );
}
