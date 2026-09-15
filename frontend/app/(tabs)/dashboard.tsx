import React, { useState } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable, Image, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTheme, makeStyles } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { getDashboard, getSettings, logoDisplayUrl, renewClient, type Client } from "@/src/api";
import { Badge, EmptyState, ActionSheet } from "@/src/components/ui";

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, isRTL } = useLang();
  const router = useRouter();
  const styles = useStyles();
  const qc = useQueryClient();

  const dashQ = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  const currency = settingsQ.data?.currency ?? "ر.س";
  const fmt = (n: number) => `${Math.round(n).toLocaleString()} ${currency}`;

  const d = dashQ.data;
  const expiringCount = d?.expiring.length ?? 0;

  const [renewTarget, setRenewTarget] = useState<Client | null>(null);
  const renewMut = useMutation({
    mutationFn: ({ id, months }: { id: string; months: number }) => renewClient(id, months),
    onSuccess: (c) => {
      qc.invalidateQueries();
      setRenewTarget(null);
      Alert.alert(t("renew_title"), `${t("renewed_until")} ${new Date(c.contract_end).toLocaleDateString()}`);
    },
    onError: () => Alert.alert(t("error")),
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        testID="dashboard-scroll"
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24, paddingHorizontal: 16 }}
        refreshControl={<RefreshControl refreshing={dashQ.isFetching} onRefresh={() => dashQ.refetch()} tintColor={colors.brandPrimary} />}
      >
        <View style={{ marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          {logoDisplayUrl(settingsQ.data?.logo_url) ? (
            <Image source={{ uri: logoDisplayUrl(settingsQ.data?.logo_url)! }} style={{ width: 44, height: 44, borderRadius: 12 }} />
          ) : (
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 22 }}>🏢</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.hello, { writingDirection: isRTL ? "rtl" : "ltr" }]}>{settingsQ.data?.office_name ?? ""}</Text>
            <Text style={styles.pageTitle}>{t("dashboard")}</Text>
          </View>
        </View>

        {expiringCount > 0 && (
          <View testID="expiring-banner" style={styles.banner}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{expiringCount} {t("contracts_expiring_30")}</Text>
              <Text style={styles.bannerSub}>{d!.expiring.map((c) => c.name).slice(0, 3).join("، ")}{expiringCount > 3 ? " …" : ""}</Text>
            </View>
          </View>
        )}

        <View style={styles.kpiRow}>
          <View style={[styles.kpi, { backgroundColor: colors.brandPrimary }]} testID="kpi-contracts">
            <Text style={[styles.kpiLabel, { color: colors.onBrandPrimary, opacity: 0.85 }]}>{t("total_contracts")}</Text>
            <Text style={[styles.kpiValue, { color: colors.onBrandPrimary }]}>{d?.total_contracts ?? 0}</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: colors.brandTertiary }]} testID="kpi-subscriptions">
            <Text style={[styles.kpiLabel, { color: colors.onBrandTertiary, opacity: 0.85 }]}>{t("total_subscriptions")}</Text>
            <Text style={[styles.kpiValue, { color: colors.onBrandTertiary, fontSize: 20 }]}>{fmt(d?.total_subscriptions ?? 0)}</Text>
          </View>
        </View>

        <Text style={styles.section}>{t("services")}</Text>

        <Pressable
          testID="service-cleaning"
          onPress={() => router.push({ pathname: "/(tabs)/clients", params: { tab: "cleaning" } })}
          style={({ pressed }) => [styles.serviceCard, { opacity: pressed ? 0.9 : 1 }]}
        >
          <View style={[styles.serviceIcon, { backgroundColor: colors.brandTertiary }]}>
            <Text style={{ fontSize: 22, color: colors.onBrandTertiary }}>✦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceName}>{t("cleaning")}</Text>
            <Text style={styles.serviceSub}>{d?.cleaning.count ?? 0} {t("active_clients")}</Text>
          </View>
          <Text style={styles.serviceAmount}>{fmt(d?.cleaning.revenue ?? 0)}</Text>
        </Pressable>

        <Pressable
          testID="service-security"
          onPress={() => router.push({ pathname: "/(tabs)/clients", params: { tab: "security" } })}
          style={({ pressed }) => [styles.serviceCard, { opacity: pressed ? 0.9 : 1 }]}
        >
          <View style={[styles.serviceIcon, { backgroundColor: colors.brandPrimary }]}>
            <Text style={{ fontSize: 22, color: colors.onBrandPrimary }}>⛨</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.serviceName}>{t("security")}</Text>
            <Text style={styles.serviceSub}>{d?.security.count ?? 0} {t("active_clients")}</Text>
          </View>
          <Text style={styles.serviceAmount}>{fmt(d?.security.revenue ?? 0)}</Text>
        </Pressable>

        <Text style={styles.section}>{t("expiring_contracts")}</Text>
        {(!d?.expiring || d.expiring.length === 0) ? (
          <EmptyState title={t("empty")} testID="dashboard-empty-expiring" />
        ) : (
          d.expiring.map((c) => {
            const end = new Date(c.contract_end);
            const days = Math.max(0, Math.round((end.getTime() - Date.now()) / (1000 * 3600 * 24)));
            return (
              <Pressable
                key={c.id}
                testID={`expiring-${c.id}`}
                onPress={() => router.push({ pathname: "/statement", params: { type: "client", id: c.id } })}
                style={({ pressed }) => [styles.expCard, { opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.expName}>{c.name}</Text>
                  <Text style={styles.expSub}>{t("contract_expires_in")} {days} {t("days")}</Text>
                </View>
                <Pressable testID={`renew-${c.id}`} onPress={() => setRenewTarget(c)} hitSlop={6} style={({ pressed }) => [styles.renewBtn, { opacity: pressed ? 0.8 : 1 }]}>
                  <Text style={{ color: colors.onBrandPrimary, fontSize: 12, fontWeight: "700" }}>{t("renew")}</Text>
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <ActionSheet
        visible={!!renewTarget}
        title={`${t("renew_title")} · ${renewTarget?.name ?? ""}`}
        cancelLabel={t("cancel")}
        onCancel={() => setRenewTarget(null)}
        actions={[
          { label: t("renew_6"), testID: "renew-6", onPress: () => renewTarget && renewMut.mutate({ id: renewTarget.id, months: 6 }) },
          { label: t("renew_12"), testID: "renew-12", onPress: () => renewTarget && renewMut.mutate({ id: renewTarget.id, months: 12 }) },
          {
            label: t("edit_manually"),
            testID: "renew-edit",
            onPress: () => {
              const id = renewTarget?.id;
              setRenewTarget(null);
              if (id) router.push({ pathname: "/client-form", params: { id } });
            },
          },
        ]}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  hello: { color: c.muted, fontSize: 13, marginBottom: 4 },
  pageTitle: { color: c.onSurface, fontSize: 28, fontWeight: "800" },
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  kpi: { flex: 1, borderRadius: 20, padding: 16, minHeight: 96 },
  kpiLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  kpiValue: { fontSize: 26, fontWeight: "800" },
  section: { color: c.onSurface, fontSize: 17, fontWeight: "700", marginTop: 12, marginBottom: 10 },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.surfaceSecondary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  serviceIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  serviceName: { color: c.onSurface, fontSize: 15, fontWeight: "700" },
  serviceSub: { color: c.muted, fontSize: 12, marginTop: 2 },
  serviceAmount: { color: c.onSurface, fontSize: 15, fontWeight: "700" },
  expCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.border,
    gap: 10,
  },
  expName: { color: c.onSurface, fontSize: 14, fontWeight: "700" },
  expSub: { color: c.muted, fontSize: 12, marginTop: 2 },
  banner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.warningBg, borderRadius: 16, padding: 14, marginBottom: 16 },
  bannerTitle: { color: c.onWarningBg, fontSize: 14, fontWeight: "800" },
  bannerSub: { color: c.onWarningBg, opacity: 0.85, fontSize: 12, marginTop: 2 },
  renewBtn: { backgroundColor: c.brandPrimary, paddingHorizontal: 12, minHeight: 36, justifyContent: "center", borderRadius: 999 },
}));
