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
  const { t, isRTL } = useLang();

  const screens = [
    { name: "dashboard", title: t("dashboard"), symbol: "▦" },
    { name: "clients", title: t("clients"), symbol: "◉" },
    { name: "employees", title: t("employees"), symbol: "◍" },
    { name: "settings", title: t("settings"), symbol: "⚙" },
  ];
  // In Arabic the bar reads right-to-left: Dashboard on the far right, Settings on the far left.
  const ordered = isRTL ? [...screens].reverse() : screens;

  return (
    <Tabs
      initialRouteName="dashboard"
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
      {ordered.map((s) => (
        <Tabs.Screen
          key={s.name}
          name={s.name}
          options={{
            title: s.title,
            tabBarButtonTestID: `tab-${s.name}`,
            tabBarIcon: ({ focused, color }) => <TabIcon symbol={s.symbol} focused={focused} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
