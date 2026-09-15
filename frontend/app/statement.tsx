import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, makeStyles } from "@/src/theme";
import { useLang } from "@/src/i18n";
import {
  getClient, getEmployee, getSettings, listTransactions, createTransaction, updateTransaction, archiveTransaction,
  txnSign, type TxnKind, type Transaction,
} from "@/src/api";
import { buildStatementHtml, buildVoucherHtml, filterByPeriod, type Period } from "@/src/pdf";
import { EmptyState, ScreenHeader, Field, PrimaryButton, SecondaryButton, Badge, ConfirmSheet, ActionSheet } from "@/src/components/ui";
import { SharePreview } from "@/src/components/share-preview";
import { StatementCard, VoucherCard, kindLabelKey } from "@/src/components/share-cards";

const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
const parseDate = (s: string, endOfDay = false) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(`${s}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return isNaN(d.getTime()) ? undefined : d;
};

const KINDS: TxnKind[] = ["charge", "receipt", "disbursement"];
type Form = { id?: string; kind: TxnKind; description: string; amount: string; date: string };
const emptyForm = (): Form => ({ kind: "receipt", description: "", amount: "", date: toDateInput(new Date()) });

export default function Statement() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, isRTL } = useLang();
  const styles = useStyles();
  const router = useRouter();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ type: "client" | "employee"; id: string }>();

  const entityQ = useQuery<any>({
    queryKey: [params.type, params.id],
    queryFn: () => (params.type === "client" ? getClient(params.id) : getEmployee(params.id)),
  });
  const txnQ = useQuery({
    queryKey: ["txn", params.type, params.id],
    queryFn: () => listTransactions(params.type, params.id),
  });
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const currency = settingsQ.data?.currency ?? "ر.س";

  const kindTone = (k: TxnKind) => (k === "charge" ? colors.error : k === "receipt" ? colors.success : colors.warning);

  // ---- add / edit ----
  const [form, setForm] = useState<Form | null>(null);
  const saveMut = useMutation({
    mutationFn: (f: Form) => {
      const payload = { kind: f.kind, description: f.description.trim(), amount: parseFloat(f.amount) || 0, date: parseDate(f.date)?.toISOString() };
      return f.id ? updateTransaction(f.id, payload) : createTransaction({ entity_type: params.type, entity_id: params.id, ...payload });
    },
    onSuccess: (saved, f) => {
      qc.invalidateQueries();
      setForm(null);
      if (!f.id && saved.kind !== "charge") setPendingVoucher(saved);
    },
  });
  const archiveMut = useMutation({
    mutationFn: (id: string) => archiveTransaction(id, true),
    onSuccess: () => qc.invalidateQueries(),
  });

  // ---- row menu / archive ----
  const [menuTx, setMenuTx] = useState<Transaction | null>(null);
  const [archiveTx, setArchiveTx] = useState<Transaction | null>(null);

  // ---- sharing ----
  const [periodSheet, setPeriodSheet] = useState(false);
  const [customRange, setCustomRange] = useState({ from: toDateInput(new Date(Date.now() - 30 * 86400000)), to: toDateInput(new Date()) });
  const [pendingVoucher, setPendingVoucher] = useState<Transaction | null>(null);
  const [preview, setPreview] = useState<{ kind: "statement"; period: Period | null } | { kind: "voucher"; tx: Transaction } | null>(null);

  const entity: any = entityQ.data;
  const items = txnQ.data?.items ?? [];
  const balance = txnQ.data?.balance ?? 0;
  const isSecurity = params.type === "client" ? entity?.service_type === "security" : entity?.role === "security";
  const serviceLabel = isSecurity ? t("security_short") : t("cleaning");
  const base = { settings: settingsQ.data, t, isRTL };

  const balanceAfter = (tx: Transaction) =>
    items
      .filter((i) => new Date(i.date).getTime() <= new Date(tx.date).getTime() || i.id === tx.id)
      .reduce((s, i) => s + txnSign(params.type, i.kind) * i.amount, 0);

  const now = new Date();
  const periods: { key: string; label: string; testID: string; value: Period | null }[] = [
    { key: "all", label: t("all_time"), testID: "period-all", value: null },
    { key: "month", label: t("this_month"), testID: "period-month", value: { from: new Date(now.getFullYear(), now.getMonth(), 1), label: t("this_month") } },
    { key: "3m", label: t("last_3_months"), testID: "period-3m", value: { from: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()), label: t("last_3_months") } },
  ];
  const customFrom = parseDate(customRange.from);
  const customTo = parseDate(customRange.to, true);
  const periodLabel = (p: Period | null) =>
    p ? `${p.label}${p.from || p.to ? ` (${p.from ? p.from.toLocaleDateString() : "…"} – ${p.to ? p.to.toLocaleDateString() : "…"})` : ""}` : t("all_time");

  const openStatementPreview = (period: Period | null) => {
    setPeriodSheet(false);
    setPreview({ kind: "statement", period });
  };
  const openVoucherPreview = (tx: Transaction) => {
    setPendingVoucher(null);
    setMenuTx(null);
    setPreview({ kind: "voucher", tx });
  };

  const formValid = !!form && !!form.description.trim() && !!parseFloat(form.amount) && !!parseDate(form.date);

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
          right={
            <Pressable testID="stmt-share" onPress={() => setPeriodSheet(true)} disabled={!entity} hitSlop={10} style={styles.shareBtn}>
              <Text style={{ color: colors.brandPrimary, fontWeight: "700", fontSize: 13 }}>{t("share")}</Text>
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
            <View style={{ marginTop: 10, flexDirection: "row" }}>
              <Badge tone={isSecurity ? "info" : "success"} label={serviceLabel} />
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
          <Pressable testID="add-txn" onPress={() => setForm(emptyForm())} style={styles.addBtn}>
            <Text style={{ color: colors.onBrandPrimary, fontWeight: "700", fontSize: 13 }}>+ {t("add_transaction")}</Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <EmptyState title={t("empty")} testID="txn-empty" />
        ) : (
          items.map((tx) => {
            const tone = kindTone(tx.kind);
            const sign = txnSign(params.type, tx.kind);
            return (
              <Pressable key={tx.id} testID={`txn-${tx.id}`} onPress={() => setMenuTx(tx)} style={({ pressed }) => [styles.txnRow, { opacity: pressed ? 0.85 : 1 }]}>
                <View style={[styles.kindBar, { backgroundColor: tone }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnDesc}>{tx.description}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <View testID={`txn-kind-${tx.id}`} style={[styles.kindPill, { borderColor: tone }]}>
                      <Text style={{ color: tone, fontSize: 10, fontWeight: "700" }}>{t(kindLabelKey(tx.kind))}</Text>
                    </View>
                    <Text style={styles.txnDate}>{new Date(tx.date).toLocaleDateString()}</Text>
                  </View>
                </View>
                <Text style={[styles.txnAmount, { color: tone }]}>
                  {sign < 0 ? "−" : "+"}{Math.round(tx.amount).toLocaleString()}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 18, marginStart: 8 }}>⋯</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Row menu */}
      <ActionSheet
        visible={!!menuTx && !archiveTx}
        title={menuTx ? `${t(kindLabelKey(menuTx.kind))} · ${Math.round(menuTx.amount).toLocaleString()} ${currency}` : ""}
        cancelLabel={t("cancel")}
        onCancel={() => setMenuTx(null)}
        actions={[
          ...(menuTx && menuTx.kind !== "charge"
            ? [{ label: `🧾 ${t("print_voucher")}`, testID: "txn-menu-voucher", onPress: () => openVoucherPreview(menuTx) }]
            : []),
          {
            label: `✎ ${t("edit_transaction")}`,
            testID: "txn-menu-edit",
            onPress: () => {
              if (!menuTx) return;
              setForm({ id: menuTx.id, kind: menuTx.kind, description: menuTx.description, amount: String(menuTx.amount), date: toDateInput(new Date(menuTx.date)) });
              setMenuTx(null);
            },
          },
          { label: `🗄 ${t("archive")}`, testID: "txn-menu-archive", destructive: true, onPress: () => setArchiveTx(menuTx) },
        ]}
      />
      <ConfirmSheet
        visible={!!archiveTx}
        destructive
        title={t("archive_transaction_confirm")}
        confirmLabel={t("archive")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          if (archiveTx) archiveMut.mutate(archiveTx.id);
          setArchiveTx(null);
          setMenuTx(null);
        }}
        onCancel={() => setArchiveTx(null)}
      />

      {/* Add / edit transaction */}
      <Modal visible={!!form} transparent animationType="fade" onRequestClose={() => setForm(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <Pressable onPress={() => setForm(null)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.surface, padding: 20, paddingBottom: 34, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
              <Text style={styles.modalTitle}>{form?.id ? t("edit_transaction") : t("add_transaction")}</Text>
              {form && (
                <>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                    {KINDS.map((k) => {
                      const active = form.kind === k;
                      const tone = kindTone(k);
                      return (
                        <Pressable
                          key={k}
                          testID={`kind-${k}`}
                          onPress={() => setForm({ ...form, kind: k })}
                          style={[styles.seg, { borderColor: tone }, active && { backgroundColor: tone }]}
                        >
                          <Text style={[styles.segText, { color: active ? colors.onBrandPrimary : tone }]}>{t(kindLabelKey(k))}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Field label={t("description")} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} testID="txn-desc" />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Field label={t("amount")} value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} keyboardType="numeric" testID="txn-amount" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field label={t("date")} value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} placeholder="YYYY-MM-DD" testID="txn-date" />
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <SecondaryButton title={t("cancel")} onPress={() => setForm(null)} style={{ flex: 1 }} testID="txn-cancel" />
                    <PrimaryButton title={t("save")} onPress={() => saveMut.mutate(form)} disabled={!formValid || saveMut.isPending} style={{ flex: 1 }} testID="txn-save" />
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Period picker before sharing the statement */}
      <Modal visible={periodSheet} transparent animationType="fade" onRequestClose={() => setPeriodSheet(false)}>
        <Pressable onPress={() => setPeriodSheet(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: colors.surface, padding: 20, paddingBottom: 34, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
            <Text style={styles.modalTitle}>{t("period")}</Text>
            {periods.map((p) => (
              <Pressable key={p.key} testID={p.testID} onPress={() => openStatementPreview(p.value)} style={({ pressed }) => [styles.periodRow, { opacity: pressed ? 0.8 : 1 }]}>
                <Text style={styles.periodText}>{p.label}</Text>
              </Pressable>
            ))}
            <View style={styles.customBox}>
              <Text style={[styles.periodText, { marginBottom: 10 }]}>{t("custom_range")}</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label={t("from_date")} value={customRange.from} onChangeText={(v) => setCustomRange({ ...customRange, from: v })} placeholder="YYYY-MM-DD" testID="period-from" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label={t("to_date")} value={customRange.to} onChangeText={(v) => setCustomRange({ ...customRange, to: v })} placeholder="YYYY-MM-DD" testID="period-to" />
                </View>
              </View>
              <PrimaryButton
                title={t("share")}
                testID="period-custom-share"
                disabled={!customFrom || !customTo}
                onPress={() => openStatementPreview({ from: customFrom, to: customTo, label: t("custom_range") })}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmSheet
        visible={!!pendingVoucher}
        title={t("share_voucher_prompt")}
        confirmLabel={t("print_voucher")}
        cancelLabel={t("later")}
        onConfirm={() => pendingVoucher && openVoucherPreview(pendingVoucher)}
        onCancel={() => setPendingVoucher(null)}
      />

      {entity && (
        <SharePreview
          visible={!!preview}
          onClose={() => setPreview(null)}
          title={preview?.kind === "voucher" ? `${t(kindLabelKey(preview.tx.kind))} - ${entity.name}` : `${t("statement")} - ${entity.name}`}
          buildHtml={() =>
            preview?.kind === "voucher"
              ? buildVoucherHtml({ ...base, entity, entityType: params.type, tx: preview.tx, balance: balanceAfter(preview.tx) })
              : buildStatementHtml({ ...base, entity, entityType: params.type, items: filterByPeriod(items, preview?.kind === "statement" ? preview.period : null), balance, serviceLabel, period: preview?.kind === "statement" ? preview.period : null })
          }
        >
          {preview?.kind === "voucher" ? (
            <VoucherCard {...base} entity={entity} entityType={params.type} tx={preview.tx} balance={balanceAfter(preview.tx)} />
          ) : (
            <StatementCard
              {...base}
              entity={entity}
              entityType={params.type}
              items={filterByPeriod(items, preview?.kind === "statement" ? preview.period : null)}
              balance={balance}
              serviceLabel={serviceLabel}
              periodLabel={periodLabel(preview?.kind === "statement" ? preview.period : null)}
            />
          )}
        </SharePreview>
      )}
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
  shareBtn: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  txnRow: { flexDirection: "row", alignItems: "center", backgroundColor: c.surfaceSecondary, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  kindBar: { width: 4, alignSelf: "stretch", borderRadius: 2, marginEnd: 10 },
  kindPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  txnDesc: { color: c.onSurface, fontSize: 14, fontWeight: "600" },
  txnDate: { color: c.muted, fontSize: 11 },
  txnAmount: { fontSize: 15, fontWeight: "800" },
  modalTitle: { color: c.onSurface, fontSize: 17, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  seg: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: c.surfaceTertiary, borderWidth: 1.5 },
  segText: { fontWeight: "700", fontSize: 12 },
  periodRow: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, marginBottom: 8 },
  periodText: { color: c.onSurface, fontWeight: "700", fontSize: 15 },
  customBox: { marginTop: 4, padding: 14, borderRadius: 12, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border },
}));
