import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, makeStyles } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { listClients, getSettings, archiveClient, deleteClient, type ServiceType, type Client } from "@/src/api";
import { Badge, EmptyState, ConfirmSheet, ActionSheet } from "@/src/components/ui";

export default function Clients() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, isRTL } = useLang();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const qc = useQueryClient();

  const [service, setService] = useState<ServiceType>((params.tab as ServiceType) === "security" ? "security" : "cleaning");
  const [q, setQ] = useState("");
  const [menuFor, setMenuFor] = useState<Client | null>(null);
  const [confirm, setConfirm] = useState<{ action: "archive" | "delete"; client: Client } | null>(null);

  const listQ = useQuery({
    queryKey: ["clients", service, q],
    queryFn: () => listClients({ service, archived: false, q: q || undefined }),
  });
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const currency = settingsQ.data?.currency ?? "ر.س";

  const archiveMut = useMutation({ mutationFn: (id: string) => archiveClient(id, true), onSuccess: () => qc.invalidateQueries() });
  const deleteMut = useMutation({ mutationFn: (id: string) => deleteClient(id), onSuccess: () => qc.invalidateQueries() });

  const items = listQ.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>{t("clients")}</Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Pressable testID="seg-cleaning" onPress={() => setService("cleaning")} style={[styles.seg, service === "cleaning" && styles.segActive]}>
            <Text style={[styles.segText, service === "cleaning" && styles.segTextActive]}>{t("cleaning")}</Text>
          </Pressable>
          <Pressable testID="seg-security" onPress={() => setService("security")} style={[styles.seg, service === "security" && styles.segActive]}>
            <Text style={[styles.segText, service === "security" && styles.segTextActive]}>{t("security")}</Text>
          </Pressable>
        </View>
        <TextInput
          testID="client-search"
          value={q}
          onChangeText={setQ}
          placeholder={t("search")}
          placeholderTextColor={colors.muted}
          style={[styles.search, { textAlign: isRTL ? "right" : "left" }]}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={listQ.isFetching} onRefresh={() => listQ.refetch()} tintColor={colors.brandPrimary} />}
      >
        <Text style={styles.count}>{items.length} · {t("tap_to_view_statement")}</Text>

        {items.length === 0 ? (
          <EmptyState title={t("empty")} testID="clients-empty" />
        ) : (
          items.map((c) => {
            const end = new Date(c.contract_end);
            const days = Math.round((end.getTime() - Date.now()) / (1000 * 3600 * 24));
            const tone: "success" | "warning" | "error" = days < 0 ? "error" : days <= 30 ? "warning" : "success";
            const label = days < 0 ? t("expired") : days <= 30 ? t("expiring_soon") : t("active");
            return (
              <Pressable
                key={c.id}
                testID={`client-${c.id}`}
                onPress={() => router.push({ pathname: "/statement", params: { type: "client", id: c.id } })}
                onLongPress={() => setMenuFor(c)}
                style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text style={styles.sub}>{c.address} · {c.phone}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <Badge tone={tone} label={label} />
                    <Text style={styles.amount}>{Math.round(c.contract_amount).toLocaleString()} {currency}</Text>
                  </View>
                </View>
                <Pressable testID={`client-menu-${c.id}`} onPress={() => setMenuFor(c)} style={styles.menuBtn} hitSlop={10}>
                  <Text style={{ color: colors.muted, fontSize: 22 }}>⋯</Text>
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable
        testID="add-client-fab"
        onPress={() => router.push({ pathname: "/client-form", params: { service } })}
        style={[styles.fab, { bottom: 16 + insets.bottom }]}
      >
        <Text style={{ color: colors.onBrandPrimary, fontSize: 28, fontWeight: "700" }}>+</Text>
      </Pressable>

      <ActionSheet
        visible={!!menuFor && !confirm}
        title={menuFor?.name ?? ""}
        cancelLabel={t("cancel")}
        onCancel={() => setMenuFor(null)}
        actions={[
          {
            label: t("edit"),
            testID: "action-edit",
            onPress: () => {
              const c = menuFor!;
              setMenuFor(null);
              router.push({ pathname: "/client-form", params: { id: c.id } });
            },
          },
          {
            label: t("archive"),
            testID: "action-archive",
            onPress: () => setConfirm({ action: "archive", client: menuFor! }),
          },
          {
            label: t("delete"),
            testID: "action-delete",
            destructive: true,
            onPress: () => setConfirm({ action: "delete", client: menuFor! }),
          },
        ]}
      />

      <ConfirmSheet
        visible={!!confirm}
        destructive={confirm?.action === "delete"}
        title={confirm?.action === "delete" ? t("delete_confirm") : t("archive_confirm")}
        confirmLabel={confirm?.action === "delete" ? t("delete") : t("archive")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.action === "delete") deleteMut.mutate(confirm.client.id);
          else archiveMut.mutate(confirm.client.id);
          setConfirm(null);
          setMenuFor(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: { paddingHorizontal: 16, paddingBottom: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
  title: { color: c.onSurface, fontSize: 24, fontWeight: "800" },
  seg: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border },
  segActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  segText: { color: c.onSurfaceTertiary, fontWeight: "600", fontSize: 13 },
  segTextActive: { color: c.onBrandPrimary },
  search: { marginTop: 12, backgroundColor: c.surfaceTertiary, color: c.onSurface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: c.border },
  count: { color: c.muted, fontSize: 12, marginBottom: 12 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border, gap: 8 },
  name: { color: c.onSurface, fontSize: 15, fontWeight: "700" },
  sub: { color: c.muted, fontSize: 12, marginTop: 2 },
  amount: { color: c.onSurface, fontSize: 13, fontWeight: "700" },
  menuBtn: { padding: 8 },
  fab: { position: "absolute", right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
}));
