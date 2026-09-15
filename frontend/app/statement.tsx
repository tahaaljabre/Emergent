import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, makeStyles } from "@/src/theme";
import { useLang } from "@/src/i18n";
import { getClient, getEmployee, getSettings, listTransactions, createTransaction, deleteTransaction, type TxnKind } from "@/src/api";
import { EmptyState, ScreenHeader, Field, PrimaryButton, SecondaryButton, Badge } from "@/src/components/ui";

export default function Statement() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, isRTL } = useLang();
  const styles = useStyles();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ type: "client" | "employee"; id: string }>();

  const entityQ = useQuery({
    queryKey: [params.type, params.id],
    queryFn: () => (params.type === "client" ? getClient(params.id) : getEmployee(params.id)),
  });
  const txnQ = useQuery({
    queryKey: ["txn", params.type, params.id],
    queryFn: () => listTransactions(params.type, params.id),
  });
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const currency = settingsQ.data?.currency ?? "ر.س";

  const [modal, setModal] = useState(false);
  const [txn, setTxn] = useState({ kind: "payment" as TxnKind, description: "", amount: "" });

  const createMut = useMutation({
    mutationFn: () =>
      createTransaction({
        entity_type: params.type,
        entity_id: params.id,
        kind: txn.kind,
        description: txn.description.trim(),
        amount: parseFloat(txn.amount) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries();
      setModal(false);
      setTxn({ kind: "payment", description: "", amount: "" });
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => qc.invalidateQueries(),
  });

  const entity: any = entityQ.data;
  const items = txnQ.data?.items ?? [];
  const balance = txnQ.data?.balance ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader
          title={t("statement")}
          left={
            <Pressable testID="stmt-back" onPress={() => router.back()} hitSlop={10}>
              <Text style={{ color: colors.brandPrimary, fontSize: 22 }}>{isRTL ? "›" : "‹"}</Text>
            </Pressable>
          }
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {entity && (
          <View style={styles.heroCard}>
            <Text style={styles.entityName}>{entity.name}</Text>
            {params.type === "client" ? (
              <Text style={styles.entitySub}>{entity.address} · {entity.phone}</Text>
            ) : (
              <Text style={styles.entitySub}>{entity.assignment || "—"} · {entity.phone}</Text>
            )}
            <View style={{ marginTop: 10 }}>
              <Badge
                tone={params.type === "client" ? (entity.service_type === "security" ? "info" : "success") : (entity.role === "security" ? "info" : "success")}
                label={params.type === "client"
                  ? (entity.service_type === "security" ? t("security_short") : t("cleaning"))
                  : (entity.role === "security" ? t("security_short") : t("cleaning"))}
              />
            </View>
            <View style={styles.balanceWrap}>
              <Text style={styles.balanceLabel}>{t("current_balance")}</Text>
              <Text style={[styles.balanceValue, { color: balance >= 0 ? colors.error : colors.success }]}>
                {Math.round(Math.abs(balance)).toLocaleString()} {currency}
              </Text>
            </View>
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 10 }}>
          <Text style={styles.section}>{t("transactions")}</Text>
          <Pressable testID="add-txn" onPress={() => setModal(true)} style={styles.addBtn}>
            <Text style={{ color: colors.onBrandPrimary, fontWeight: "700", fontSize: 13 }}>+ {t("add_transaction")}</Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <EmptyState title={t("empty")} testID="txn-empty" />
        ) : (
          items.map((tx) => (
            <View key={tx.id} testID={`txn-${tx.id}`} style={styles.txnRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txnDesc}>{tx.description}</Text>
                <Text style={styles.txnDate}>{new Date(tx.date).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txnAmount, { color: tx.kind === "payment" ? colors.success : colors.error }]}>
                {tx.kind === "payment" ? "−" : "+"}{Math.round(tx.amount).toLocaleString()}
              </Text>
              <Pressable testID={`txn-del-${tx.id}`} onPress={() => delMut.mutate(tx.id)} hitSlop={10} style={{ marginStart: 8 }}>
                <Text style={{ color: colors.muted, fontSize: 18 }}>×</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <Pressable onPress={() => setModal(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.surface, padding: 20, paddingBottom: 34, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
              <Text style={styles.modalTitle}>{t("add_transaction")}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <Pressable testID="kind-payment" onPress={() => setTxn({ ...txn, kind: "payment" })} style={[styles.seg, txn.kind === "payment" && styles.segActive]}>
                  <Text style={[styles.segText, txn.kind === "payment" && styles.segTextActive]}>{t("payment")}</Text>
                </Pressable>
                <Pressable testID="kind-charge" onPress={() => setTxn({ ...txn, kind: "charge" })} style={[styles.seg, txn.kind === "charge" && styles.segActive]}>
                  <Text style={[styles.segText, txn.kind === "charge" && styles.segTextActive]}>{t("charge")}</Text>
                </Pressable>
              </View>
              <Field label={t("description")} value={txn.description} onChangeText={(v) => setTxn({ ...txn, description: v })} testID="txn-desc" />
              <Field label={t("amount")} value={txn.amount} onChangeText={(v) => setTxn({ ...txn, amount: v })} keyboardType="numeric" testID="txn-amount" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <SecondaryButton title={t("cancel")} onPress={() => setModal(false)} style={{ flex: 1 }} testID="txn-cancel" />
                <PrimaryButton
                  title={t("save")}
                  onPress={() => createMut.mutate()}
                  disabled={!txn.description.trim() || !txn.amount || createMut.isPending}
                  style={{ flex: 1 }}
                  testID="txn-save"
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  heroCard: { backgroundColor: c.brandPrimary, borderRadius: 20, padding: 20 },
  entityName: { color: c.onBrandPrimary, fontSize: 20, fontWeight: "800" },
  entitySub: { color: c.onBrandPrimary, opacity: 0.8, fontSize: 13, marginTop: 4 },
  balanceWrap: { marginTop: 16, backgroundColor: "rgba(255,255,255,0.15)", padding: 12, borderRadius: 12 },
  balanceLabel: { color: c.onBrandPrimary, opacity: 0.8, fontSize: 12 },
  balanceValue: { fontSize: 24, fontWeight: "800", marginTop: 4 },
  section: { color: c.onSurface, fontSize: 17, fontWeight: "700" },
  addBtn: { backgroundColor: c.brandPrimary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  txnRow: { flexDirection: "row", alignItems: "center", backgroundColor: c.surfaceSecondary, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
  txnDesc: { color: c.onSurface, fontSize: 14, fontWeight: "600" },
  txnDate: { color: c.muted, fontSize: 11, marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: "800" },
  modalTitle: { color: c.onSurface, fontSize: 17, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  seg: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border },
  segActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  segText: { color: c.onSurfaceTertiary, fontWeight: "600" },
  segTextActive: { color: c.onBrandPrimary },
}));
