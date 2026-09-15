import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Switch, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTheme, makeStyles, setThemeMode, getThemeMode, useThemeMode } from "@/src/theme";
import { useLang, setLang, getLang, t as tt } from "@/src/i18n";
import { getSettings, updateSettings, getBackup } from "@/src/api";
import { Field, PrimaryButton } from "@/src/components/ui";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, lang, isRTL } = useLang();
  const styles = useStyles();
  const router = useRouter();
  const qc = useQueryClient();
  const themeMode = useThemeMode();

  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const [office, setOffice] = useState({ office_name: "", address: "", phone: "", currency: "ر.س" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settingsQ.data) {
      setOffice({
        office_name: settingsQ.data.office_name,
        address: settingsQ.data.address,
        phone: settingsQ.data.phone,
        currency: settingsQ.data.currency,
      });
    }
  }, [settingsQ.data]);

  const saveMut = useMutation({
    mutationFn: () => updateSettings(office),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    },
  });

  const doBackup = async () => {
    try {
      const data = await getBackup();
      Alert.alert(t("backup"), `${t("saved")}: ${data.clients.length} + ${data.employees.length} + ${data.transactions.length}`);
    } catch (e) {
      Alert.alert("Error", String(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>{t("settings")}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.section}>{t("office_info")}</Text>
        <View style={styles.card}>
          <Field label={t("office_name")} value={office.office_name} onChangeText={(v) => setOffice({ ...office, office_name: v })} testID="input-office-name" />
          <Field label={t("address")} value={office.address} onChangeText={(v) => setOffice({ ...office, address: v })} testID="input-office-address" />
          <Field label={t("phone")} value={office.phone} onChangeText={(v) => setOffice({ ...office, phone: v })} keyboardType="phone-pad" testID="input-office-phone" />
          <Field label={t("currency")} value={office.currency} onChangeText={(v) => setOffice({ ...office, currency: v })} testID="input-office-currency" />
          <PrimaryButton
            title={saved ? t("saved") : t("save_changes")}
            onPress={() => saveMut.mutate()}
            disabled={!office.office_name.trim() || saveMut.isPending}
            testID="save-settings"
          />
        </View>

        <Text style={styles.section}>{t("management")}</Text>
        <View style={styles.card}>
          <Pressable testID="open-archive" onPress={() => router.push("/archive")} style={styles.row}>
            <Text style={styles.rowLabel}>{t("archive_screen")}</Text>
            <Text style={styles.chev}>{isRTL ? "‹" : "›"}</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable testID="open-reports" onPress={() => router.push("/reports")} style={styles.row}>
            <Text style={styles.rowLabel}>{t("reports")}</Text>
            <Text style={styles.chev}>{isRTL ? "‹" : "›"}</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable testID="backup-btn" onPress={doBackup} style={styles.row}>
            <Text style={styles.rowLabel}>{t("backup")}</Text>
            <Text style={styles.chev}>⤓</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>{t("appearance")}</Text>
        <View style={styles.chipRow}>
          {(["light", "dark", "system"] as const).map((m) => (
            <Pressable
              key={m}
              testID={`theme-${m}`}
              onPress={() => setThemeMode(m)}
              style={[styles.chip, themeMode === m && styles.chipActive]}
            >
              <Text style={[styles.chipText, themeMode === m && styles.chipTextActive]}>{t(m)}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>{t("language")}</Text>
        <View style={styles.chipRow}>
          {(["ar", "en"] as const).map((l) => (
            <Pressable key={l} testID={`lang-${l}`} onPress={() => setLang(l)} style={[styles.chip, lang === l && styles.chipActive]}>
              <Text style={[styles.chipText, lang === l && styles.chipTextActive]}>{l === "ar" ? t("arabic") : t("english")}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: { paddingHorizontal: 16, paddingBottom: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
  title: { color: c.onSurface, fontSize: 24, fontWeight: "800" },
  section: { color: c.onSurface, fontSize: 16, fontWeight: "700", marginTop: 16, marginBottom: 10 },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  rowLabel: { color: c.onSurface, fontSize: 15, fontWeight: "600" },
  chev: { color: c.muted, fontSize: 20 },
  divider: { height: 1, backgroundColor: c.divider },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipText: { color: c.onSurfaceTertiary, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: c.onBrandPrimary },
}));
