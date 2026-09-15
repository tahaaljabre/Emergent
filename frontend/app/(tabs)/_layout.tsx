import { Tabs } from "expo-router";
import React from "react";
import { View, Text, Platform, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme";
import { useLang } from "@/src/i18n";

function TabIcon({ symbol, focused, color }: { symbol: string; focused: boolean; color: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 32, height: 32 }}>
      <Text style={{ fontSize: focused ? 22 : 20, color }}>{symbol}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useLang();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t("dashboard"),
          tabBarIcon: ({ focused, color }) => <TabIcon symbol="▦" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: t("clients"),
          tabBarIcon: ({ focused, color }) => <TabIcon symbol="◉" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: t("employees"),
          tabBarIcon: ({ focused, color }) => <TabIcon symbol="◍" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings"),
          tabBarIcon: ({ focused, color }) => <TabIcon symbol="⚙" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}
