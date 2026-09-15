import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useTheme, makeStyles } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { listEmployees, archiveEmployee, deleteEmployee, type Employee } from "@/src/api";
import { Badge, EmptyState, ConfirmSheet, ActionSheet } from "@/src/components/ui";

export default function Employees() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, isRTL } = useLang();
  const styles = useStyles();
  const router = useRouter();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [menuFor, setMenuFor] = useState<Employee | null>(null);
  const [confirm, setConfirm] = useState<{ action: "archive" | "delete"; emp: Employee } | null>(null);

  const listQ = useQuery({
    queryKey: ["employees", q],
    queryFn: () => listEmployees({ archived: false, q: q || undefined }),
  });

  const archiveMut = useMutation({ mutationFn: (id: string) => archiveEmployee(id, true), onSuccess: () => qc.invalidateQueries() });
  const deleteMut = useMutation({ mutationFn: (id: string) => deleteEmployee(id), onSuccess: () => qc.invalidateQueries() });

  const items = listQ.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>{t("employees")}</Text>
        <TextInput
          testID="employee-search"
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
          <EmptyState title={t("empty")} testID="employees-empty" />
        ) : (
          items.map((e) => {
            const initials = e.name.trim().split(" ").slice(0, 2).map((s) => s[0]).join("");
            return (
              <Pressable
                key={e.id}
                testID={`employee-${e.id}`}
                onPress={() => router.push({ pathname: "/statement", params: { type: "employee", id: e.id } })}
                onLongPress={() => setMenuFor(e)}
                style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={styles.avatar}>
                  <Text style={{ color: colors.onBrandTertiary, fontWeight: "700" }}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{e.name}</Text>
                  <Text style={styles.sub}>{e.assignment || "—"}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <Badge tone={e.role === "security" ? "info" : "success"} label={e.role === "security" ? t("security_short") : t("cleaning")} />
                  </View>
                </View>
                <Pressable testID={`employee-menu-${e.id}`} onPress={() => setMenuFor(e)} style={{ padding: 8 }} hitSlop={10}>
                  <Text style={{ color: colors.muted, fontSize: 22 }}>⋯</Text>
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable
        testID="add-employee-fab"
        onPress={() => router.push("/employee-form")}
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
          { label: t("edit"), testID: "action-edit", onPress: () => { const e = menuFor!; setMenuFor(null); router.push({ pathname: "/employee-form", params: { id: e.id } }); } },
          { label: t("archive"), testID: "action-archive", onPress: () => setConfirm({ action: "archive", emp: menuFor! }) },
          { label: t("delete"), testID: "action-delete", destructive: true, onPress: () => setConfirm({ action: "delete", emp: menuFor! }) },
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
          if (confirm.action === "delete") deleteMut.mutate(confirm.emp.id);
          else archiveMut.mutate(confirm.emp.id);
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
  search: { marginTop: 12, backgroundColor: c.surfaceTertiary, color: c.onSurface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: c.border },
  count: { color: c.muted, fontSize: 12, marginBottom: 12 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: c.surfaceSecondary, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: c.border, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  name: { color: c.onSurface, fontSize: 15, fontWeight: "700" },
  sub: { color: c.muted, fontSize: 12, marginTop: 2 },
  fab: { position: "absolute", right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
}));
