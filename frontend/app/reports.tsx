import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTheme, makeStyles } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { getDashboard, getSettings } from "@/src/api";
import { buildReportHtml } from "@/src/pdf";
import { ScreenHeader } from "@/src/components/ui";
import { SharePreview } from "@/src/components/share-preview";
import { ReportCard } from "@/src/components/share-cards";

export default function Reports() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, isRTL } = useLang();
  const styles = useStyles();
  const router = useRouter();

  const dashQ = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const currency = settingsQ.data?.currency ?? "ر.س";
  const fmt = (n: number) => `${Math.round(n).toLocaleString()} ${currency}`;
  const d = dashQ.data;

  const [preview, setPreview] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader
          title={t("reports")}
          left={
            <Pressable testID="rep-back" onPress={() => router.back()} hitSlop={10}>
              <Text style={{ color: colors.brandPrimary, fontSize: 22 }}>{isRTL ? "›" : "‹"}</Text>
            </Pressable>
          }
          right={
            <Pressable testID="rep-share" onPress={() => setPreview(true)} disabled={!d} hitSlop={10} style={styles.shareBtn}>
              <Text style={{ color: colors.brandPrimary, fontWeight: "700", fontSize: 13 }}>{t("share")}</Text>
            </Pressable>
          }
        />
      </View>
      {d && (
        <SharePreview visible={preview} onClose={() => setPreview(false)} title={t("revenue_report")} buildHtml={() => buildReportHtml({ data: d, settings: settingsQ.data, t, isRTL })}>
          <ReportCard data={d} settings={settingsQ.data} t={t} isRTL={isRTL} />
        </SharePreview>
      )}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.section}>{t("total_revenue")}</Text>
        <View style={styles.grid}>
          <View style={[styles.card, { backgroundColor: colors.brandPrimary }]} testID="rep-month">
            <Text style={[styles.cardLabel, { color: colors.onBrandPrimary, opacity: 0.8 }]}>{t("this_month")}</Text>
            <Text style={[styles.cardValue, { color: colors.onBrandPrimary }]}>{fmt(d?.monthly_revenue ?? 0)}</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.brandTertiary }]} testID="rep-year">
            <Text style={[styles.cardLabel, { color: colors.onBrandTertiary, opacity: 0.85 }]}>{t("this_year")}</Text>
            <Text style={[styles.cardValue, { color: colors.onBrandTertiary }]}>{fmt(d?.yearly_revenue ?? 0)}</Text>
          </View>
        </View>

        <Text style={styles.section}>{t("by_service")}</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("cleaning")}</Text>
          <Text style={styles.rowValue}>{fmt(d?.cleaning.revenue ?? 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("security")}</Text>
          <Text style={styles.rowValue}>{fmt(d?.security.revenue ?? 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("total_contracts")}</Text>
          <Text style={styles.rowValue}>{d?.total_contracts ?? 0}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t("total_subscriptions")}</Text>
          <Text style={styles.rowValue}>{fmt(d?.total_subscriptions ?? 0)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  section: { color: c.onSurface, fontSize: 17, fontWeight: "700", marginBottom: 12, marginTop: 8 },
  grid: { flexDirection: "row", gap: 12, marginBottom: 8 },
  card: { flex: 1, borderRadius: 16, padding: 16, minHeight: 100 },
  cardLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  cardValue: { fontSize: 20, fontWeight: "800" },
  row: { flexDirection: "row", justifyContent: "space-between", backgroundColor: c.surfaceSecondary, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
  rowLabel: { color: c.onSurface, fontSize: 14, fontWeight: "600" },
  rowValue: { color: c.onSurface, fontSize: 14, fontWeight: "700" },
  shareBtn: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
}));
