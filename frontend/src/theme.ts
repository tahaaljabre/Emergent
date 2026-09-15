import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FFFFFF",
  onSurface: "#11181C",
  surfaceSecondary: "#F4F5F7",
  onSurfaceSecondary: "#11181C",
  surfaceTertiary: "#E9ECEF",
  onSurfaceTertiary: "#495057",
  surfaceInverse: "#11181C",
  onSurfaceInverse: "#FFFFFF",
  muted: "#687076",

  brand: "#1F4A38",
  onBrand: "#FFFFFF",
  brandPrimary: "#1F4A38",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#4A7862",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#D8E8E0",
  onBrandTertiary: "#1F4A38",

  success: "#287C49",
  onSuccess: "#FFFFFF",
  successBg: "#E4F5EB",
  onSuccessBg: "#1E5C36",
  warning: "#C26510",
  onWarning: "#FFFFFF",
  warningBg: "#FCEBD9",
  onWarningBg: "#8A4508",
  error: "#B82E2E",
  onError: "#FFFFFF",
  errorBg: "#FADEDE",
  onErrorBg: "#7A1F1F",
  info: "#4A5568",
  onInfo: "#FFFFFF",

  border: "#E4E7EB",
  borderStrong: "#C1C7D0",
  divider: "#F0F2F5",
};

const dark: typeof light = {
  surface: "#0F1210",
  onSurface: "#F4F5F7",
  surfaceSecondary: "#1A1F1C",
  onSurfaceSecondary: "#F4F5F7",
  surfaceTertiary: "#242A26",
  onSurfaceTertiary: "#C1C7D0",
  surfaceInverse: "#F4F5F7",
  onSurfaceInverse: "#11181C",
  muted: "#8A9490",

  brand: "#4A7862",
  onBrand: "#FFFFFF",
  brandPrimary: "#4A7862",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#6FA588",
  onBrandSecondary: "#0F1210",
  brandTertiary: "#243830",
  onBrandTertiary: "#B8D8C8",

  success: "#4AAF6C",
  onSuccess: "#0F1210",
  successBg: "#1A3826",
  onSuccessBg: "#8FDDA8",
  warning: "#E8873A",
  onWarning: "#0F1210",
  warningBg: "#3A2818",
  onWarningBg: "#F5B57A",
  error: "#E05555",
  onError: "#0F1210",
  errorBg: "#3A1E1E",
  onErrorBg: "#F0A0A0",
  info: "#8A9490",
  onInfo: "#0F1210",

  border: "#2A302C",
  borderStrong: "#3A423E",
  divider: "#242A26",
};

export type ThemeColors = typeof light;
export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark: ThemeColors } = { light, dark };

const THEME_KEY = "@app_theme_mode";
type Mode = ColorScheme | "system";
let overrideMode: Mode = "system";
const listeners = new Set<() => void>();

export async function loadPersistedTheme() {
  try {
    const v = await AsyncStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "system") {
      overrideMode = v;
      Appearance.setColorScheme?.(v === "system" ? null : v);
      listeners.forEach((l) => l());
    }
  } catch {}
}

export async function setThemeMode(mode: Mode) {
  overrideMode = mode;
  await AsyncStorage.setItem(THEME_KEY, mode);
  Appearance.setColorScheme?.(mode === "system" ? null : mode);
  listeners.forEach((l) => l());
}

export function getThemeMode(): Mode {
  return overrideMode;
}

export function useThemeMode(): Mode {
  const [, setTick] = useState(0);
  useEffect(() => {
    const cb = () => setTick((t) => t + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return overrideMode;
}

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  useThemeMode();
  let scheme: ColorScheme;
  if (overrideMode === "light" || overrideMode === "dark") {
    scheme = overrideMode;
  } else {
    scheme = system && themes[system] ? system : defaultScheme;
  }
  return { scheme, colors: themes[scheme] };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
