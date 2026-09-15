import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTheme, makeStyles } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { listClients, listEmployees, archiveClient, archiveEmployee, deleteClient, deleteEmployee } from "@/src/api";
import { Badge, EmptyState, ScreenHeader, ConfirmSheet, ActionSheet } from "@/src/components/ui";

type Tab = "clients" | "employees";

export default function Archive() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, isRTL } = useLang();
  const styles = useStyles();
  const router = useRouter();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("clients");
  const [menuFor, setMenuFor] = useState<{ id: string; name: string; type: Tab } | null>(null);
  const [confirm, setConfirm] = useState<{ action: "restore" | "delete"; item: { id: string; name: string; type: Tab } } | null>(null);

  const clientsQ = useQuery({ queryKey: ["archived-clients"], queryFn: () => listClients({ archived: true }), enabled: tab === "clients" });
  const empQ = useQuery({ queryKey: ["archived-employees"], queryFn: () => listEmployees({ archived: true }), enabled: tab === "employees" });

  const restoreClient = useMutation({ mutationFn: (id: string) => archiveClient(id, false), onSuccess: () => qc.invalidateQueries() });
  const restoreEmp = useMutation({ mutationFn: (id: string) => archiveEmployee(id, false), onSuccess: () => qc.invalidateQueries() });
  const delClient = useMutation({ mutationFn: (id: string) => deleteClient(id), onSuccess: () => qc.invalidateQueries() });
  const delEmp = useMutation({ mutationFn: (id: string) => deleteEmployee(id), onSuccess: () => qc.invalidateQueries() });

  const items = tab === "clients" ? clientsQ.data ?? [] : empQ.data ?? [];
  const refreshing = tab === "clients" ? clientsQ.isFetching : empQ.isFetching;
  const refetch = tab === "clients" ? clientsQ.refetch : empQ.refetch;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader
          title={t("archive_screen")}
          left={
            <Pressable testID="arch-back" onPress={() => router.back()} hitSlop={10}>
              <Text style={{ color: colors.brandPrimary, fontSize: 22 }}>{isRTL ? "›" : "‹"}</Text>
            </Pressable>
          }
        />
      </View>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable testID="arch-tab-clients" onPress={() => setTab("clients")} style={[styles.seg, tab === "clients" && styles.segActive]}>
            <Text style={[styles.segText, tab === "clients" && styles.segTextActive]}>{t("clients_archive")}</Text>
          </Pressable>
          <Pressable testID="arch-tab-employees" onPress={() => setTab("employees")} style={[styles.seg, tab === "employees" && styles.segActive]}>
            <Text style={[styles.segText, tab === "employees" && styles.segTextActive]}>{t("employees_archive")}</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refetch()} tintColor={colors.brandPrimary} />}
      >
        {items.length === 0 ? (
          <EmptyState title={t("no_archived")} testID="archive-empty" />
        ) : (
          items.map((it: any) => (
            <Pressable
              key={it.id}
              testID={`archived-${it.id}`}
              onPress={() => setMenuFor({ id: it.id, name: it.name, type: tab })}
              style={styles.card}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{it.name}</Text>
                <Text style={styles.sub}>
                  {tab === "clients" ? `${it.address ?? ""} · ${it.phone ?? ""}` : `${it.assignment ?? ""} · ${it.phone ?? ""}`}
                </Text>
              </View>
              <Badge tone="info" label={t("archived")} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <ActionSheet
        visible={!!menuFor && !confirm}
        title={menuFor?.name ?? ""}
        cancelLabel={t("cancel")}
        onCancel={() => setMenuFor(null)}
        actions={[
          { label: t("restore"), testID: "arch-restore", onPress: () => setConfirm({ action: "restore", item: menuFor! }) },
          { label: t("delete"), testID: "arch-delete", destructive: true, onPress: () => setConfirm({ action: "delete", item: menuFor! }) },
        ]}
      />

      <ConfirmSheet
        visible={!!confirm}
        destructive={confirm?.action === "delete"}
        title={confirm?.action === "delete" ? t("delete_confirm") : t("restore_confirm")}
        confirmLabel={confirm?.action === "delete" ? t("delete") : t("restore")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.item.type === "clients") {
            if (confirm.action === "delete") delClient.mutate(confirm.item.id);
            else restoreClient.mutate(confirm.item.id);
          } else {
            if (confirm.action === "delete") delEmp.mutate(confirm.item.id);
            else restoreEmp.mutate(confirm.item.id);
          }
          setConfirm(null);
          setMenuFor(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  seg: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border },
  segActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  segText: { color: c.onSurfaceTertiary, fontWeight: "600", fontSize: 13 },
  segTextActive: { color: c.onBrandPrimary },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border, gap: 8 },
  name: { color: c.onSurface, fontSize: 15, fontWeight: "700" },
  sub: { color: c.muted, fontSize: 12, marginTop: 2 },
}));
