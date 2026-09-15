import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import type { Transaction, OfficeSettings, DashboardData, TxnKind } from "../api";
import { logoDisplayUrl, txnSign } from "../api";

// Document palette: shared images must look identical in light & dark app themes (matches the PDF CSS).
export const DOC = {
  bg: "#ffffff",
  brand: "#4f6f52",
  text: "#1f2a22",
  muted: "#6b7a6e",
  card: "#f1f5f1",
  border: "#e3e9e4",
  green: "#2e7d4f",
  greenBg: "#e8f5ec",
  orange: "#d97706",
  orangeBg: "#fff4e5",
  red: "#c0392b",
  white: "#ffffff",
};

export const kindColor = (k: TxnKind) => (k === "charge" ? DOC.red : k === "receipt" ? DOC.green : DOC.orange);
export const kindLabelKey = (k: TxnKind) => (k === "charge" ? "charge" : k === "receipt" ? "receipt_voucher" : "disbursement_voucher");

type T = (k: string) => string;
type Entity = { name: string; phone?: string; address?: string; assignment?: string };
type Base = { settings?: OfficeSettings | null; t: T; isRTL: boolean };

const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString();
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString();

function DocFrame({ settings, t, isRTL, children }: Base & { children: React.ReactNode }) {
  const logo = logoDisplayUrl(settings?.logo_url);
  const dir = isRTL ? "row-reverse" : "row";
  return (
    <View style={s.page}>
      <View style={[s.head, { flexDirection: dir }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.office, { textAlign: isRTL ? "right" : "left" }]}>{settings?.office_name || ""}</Text>
          <Text style={[s.officeSub, { textAlign: isRTL ? "right" : "left" }]}>{[settings?.address, settings?.phone].filter(Boolean).join(" · ")}</Text>
        </View>
        {logo ? <Image source={{ uri: logo }} style={s.logo} resizeMode="contain" /> : null}
      </View>
      {children}
      <Text style={s.footer}>{t("issued_on")}: {fmtDate(new Date())}</Text>
    </View>
  );
}

function Tot({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.tot}>
      <Text style={s.totL}>{label}</Text>
      <Text style={[s.totV, { color }]}>{value}</Text>
    </View>
  );
}

export function remainingLabel(t: T, entityType: "client" | "employee", balance: number) {
  if (Math.round(balance) === 0) return t("settled");
  if (entityType === "client") return balance > 0 ? t("remaining_on_client") : t("remaining_for_client");
  return balance > 0 ? t("remaining_for_employee") : t("remaining_on_employee");
}

export function StatementCard(
  p: Base & { entity: Entity; entityType: "client" | "employee"; items: Transaction[]; balance: number; serviceLabel: string; periodLabel?: string }
) {
  const { entity, entityType, items, balance, settings, t, isRTL, serviceLabel, periodLabel } = p;
  const currency = settings?.currency ?? "ر.س";
  const align = { textAlign: isRTL ? ("right" as const) : ("left" as const) };
  const dir = isRTL ? ("row-reverse" as const) : ("row" as const);
  const rows = [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let due = 0, paid = 0, dueCount = 0, paidCount = 0;
  rows.forEach((tx) => {
    if (txnSign(entityType, tx.kind) > 0) { due += tx.amount; dueCount++; } else { paid += tx.amount; paidCount++; }
  });
  const sub = (entityType === "client" ? [entity.address, entity.phone] : [entity.assignment, entity.phone]).filter(Boolean).join(" · ");
  const balColor = Math.round(balance) === 0 ? DOC.green : balance > 0 === (entityType === "client") ? DOC.red : DOC.green;
  const W = { date: 74, num: 66 };
  return (
    <DocFrame settings={settings} t={t} isRTL={isRTL}>
      <View style={[s.metaRow, { flexDirection: dir }]}>
        <Text style={s.metaText}>{t("print_date")}: <Text style={s.metaStrong}>{fmtDate(new Date())}</Text></Text>
        <Text style={s.metaText}>{t("period")}: <Text style={s.metaStrong}>{periodLabel || t("all_time")}</Text></Text>
      </View>
      <View style={[s.entityRow, { flexDirection: dir }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.metaText, align]}>{t("statement_of")} · {entityType === "client" ? t("client_label") : t("employee_label")}</Text>
          <Text style={[s.name, align]}>{entity.name}</Text>
          {sub ? <Text style={[s.sub, align]}>{sub}</Text> : null}
        </View>
        <View style={s.badge}><Text style={s.badgeText}>{serviceLabel}</Text></View>
      </View>

      {rows.length === 0 ? (
        <Text style={s.empty}>{t("empty")}</Text>
      ) : (
        <View style={s.table}>
          <View style={[s.th, { flexDirection: dir }]}>
            <Text style={[s.thText, { width: W.date }, align]}>{t("date")}</Text>
            <Text style={[s.thText, { flex: 1 }, align]}>{t("description")}</Text>
            <Text style={[s.thText, s.center, { width: W.num }]}>{t("col_due")}</Text>
            <Text style={[s.thText, s.center, { width: W.num }]}>{t("col_paid")}</Text>
          </View>
          {rows.map((tx, i) => {
            const isDue = txnSign(entityType, tx.kind) > 0;
            return (
              <View key={tx.id} style={[s.tr, { flexDirection: dir, backgroundColor: i % 2 ? DOC.card : DOC.white }]}>
                <Text style={[s.td, { width: W.date }, align]}>{fmtDate(tx.date)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.td, align]} numberOfLines={2}>{tx.description}</Text>
                  <Text style={[{ color: kindColor(tx.kind), fontSize: 9, fontWeight: "700" }, align]}>{t(kindLabelKey(tx.kind))}</Text>
                </View>
                <Text style={[s.td, s.num, s.center, { width: W.num, color: isDue ? DOC.red : DOC.muted }]}>{isDue ? fmt(tx.amount) : "—"}</Text>
                <Text style={[s.td, s.num, s.center, { width: W.num, color: !isDue ? DOC.green : DOC.muted }]}>{!isDue ? fmt(tx.amount) : "—"}</Text>
              </View>
            );
          })}
          <View style={[s.tr, s.totalRow, { flexDirection: dir }]}>
            <Text style={[s.td, s.num, { flex: 1 }, align]}>{t("total")}</Text>
            <Text style={[s.td, s.num, s.center, { width: W.num, color: DOC.red }]}>{fmt(due)}</Text>
            <Text style={[s.td, s.num, s.center, { width: W.num, color: DOC.green }]}>{fmt(paid)}</Text>
          </View>
        </View>
      )}

      <View style={[s.totals, { flexDirection: dir, marginTop: 14 }]}>
        <Tot label={`${t("charges_count")} (${dueCount})`} value={`${fmt(due)} ${currency}`} color={DOC.red} />
        <Tot label={`${t("payments_count")} (${paidCount})`} value={`${fmt(paid)} ${currency}`} color={DOC.green} />
      </View>
      <View style={[s.balanceBox, { borderColor: balColor, flexDirection: dir }]}>
        <Text style={[s.balanceLabel, { color: balColor }]}>{remainingLabel(t, entityType, balance)}</Text>
        {Math.round(balance) !== 0 ? <Text style={[s.balanceValue, { color: balColor }]}>{fmt(balance)} {currency}</Text> : null}
      </View>
    </DocFrame>
  );
}

/** سند قبض / سند صرف — formal voucher with client & officer signatures. */
export function VoucherCard(p: Base & { entity: Entity; entityType: "client" | "employee"; tx: Transaction; balance: number }) {
  const { entity, entityType, tx, balance, settings, t, isRTL } = p;
  const currency = settings?.currency ?? "ر.س";
  const isReceipt = tx.kind === "receipt";
  const color = isReceipt ? DOC.green : DOC.orange;
  const tint = isReceipt ? DOC.greenBg : DOC.orangeBg;
  const no = tx.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const dir = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = { textAlign: isRTL ? ("right" as const) : ("left" as const) };
  const Line = ({ k, v }: { k: string; v: string }) => (
    <View style={[s.vLine, { flexDirection: dir }]}>
      <Text style={[s.vK, { color }]}>{k}</Text>
      <Text style={[s.vV, align]}>{v}</Text>
    </View>
  );
  return (
    <DocFrame settings={settings} t={t} isRTL={isRTL}>
      <View style={[s.vBand, { backgroundColor: color, flexDirection: dir }]}>
        <Text style={s.vBandTitle}>{isReceipt ? t("receipt_voucher") : t("disbursement_voucher")}</Text>
        <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
          <Text style={s.vBandMeta}>{t("voucher_no")}: {no}</Text>
          <Text style={s.vBandMeta}>{t("date")}: {fmtDate(tx.date)}</Text>
        </View>
      </View>
      <View style={[s.vAmount, { borderColor: color, backgroundColor: tint, flexDirection: dir }]}>
        <Text style={[s.vAmountL, { color }]}>{t("amount")}</Text>
        <Text style={[s.vAmountV, { color }]}>{fmt(tx.amount)} {currency}</Text>
      </View>
      <View style={[s.vBody, { borderColor: color }]}>
        <Line k={isReceipt ? t("received_amount_from") : t("paid_amount_to")} v={entity.name} />
        {entity.phone ? <Line k={t("phone")} v={entity.phone} /> : null}
        <Line k={t("for_purpose")} v={tx.description} />
        <Line k={t("remaining_balance")} v={`${fmt(balance)} ${currency}`} />
      </View>
      <View style={[s.signRow, { flexDirection: dir }]}>
        <View style={s.signBox}>
          <View style={s.signSpace} />
          <Text style={[s.signLabel, { borderTopColor: color }]}>{entityType === "client" ? t("signature_client") : t("signature_employee")}</Text>
          <Text style={s.signName}>{entity.name}</Text>
        </View>
        <View style={s.signBox}>
          <View style={s.signSpace} />
          <Text style={[s.signLabel, { borderTopColor: color }]}>{t("signature_officer")}</Text>
          <Text style={s.signName}>{settings?.office_name || ""}</Text>
        </View>
      </View>
    </DocFrame>
  );
}

export function ReportCard(p: Base & { data: DashboardData }) {
  const { data, settings, t, isRTL } = p;
  const currency = settings?.currency ?? "ر.س";
  const money = (n: number) => `${fmt(n)} ${currency}`;
  const dir = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = { textAlign: isRTL ? ("right" as const) : ("left" as const) };
  const Row = ({ k, v }: { k: string; v: string }) => (
    <View style={[s.tr, { flexDirection: dir }]}>
      <Text style={[s.td, { flex: 1 }, align]}>{k}</Text>
      <Text style={[s.td, s.num]}>{v}</Text>
    </View>
  );
  return (
    <DocFrame settings={settings} t={t} isRTL={isRTL}>
      <Text style={[s.title, align]}>{t("revenue_report")}</Text>
      <View style={[s.totals, { flexDirection: dir }]}>
        <Tot label={t("this_month")} value={money(data.monthly_revenue)} color={DOC.green} />
        <Tot label={t("this_year")} value={money(data.yearly_revenue)} color={DOC.green} />
      </View>
      <Text style={[s.title, { fontSize: 15 }, align]}>{t("by_service")}</Text>
      <Row k={`${t("cleaning")} (${data.cleaning.count})`} v={money(data.cleaning.revenue)} />
      <Row k={`${t("security")} (${data.security.count})`} v={money(data.security.revenue)} />
      <Row k={t("total_contracts")} v={String(data.total_contracts)} />
      <Row k={t("total_subscriptions")} v={money(data.total_subscriptions)} />
      {data.expiring.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={[s.title, { fontSize: 15 }, align]}>{t("expiring_contracts")}</Text>
          {data.expiring.map((c) => (
            <Row key={c.id} k={`${c.name} · ${fmtDate(c.contract_end)}`} v={money(c.contract_amount)} />
          ))}
        </View>
      )}
    </DocFrame>
  );
}

const s = StyleSheet.create({
  page: { backgroundColor: DOC.bg, padding: 20, width: "100%" },
  head: { alignItems: "center", gap: 12, borderBottomWidth: 3, borderBottomColor: DOC.brand, paddingBottom: 12, marginBottom: 16 },
  office: { color: DOC.brand, fontSize: 18, fontWeight: "800" },
  officeSub: { color: DOC.muted, fontSize: 11, marginTop: 2 },
  logo: { width: 56, height: 56, borderRadius: 10 },
  title: { color: DOC.text, fontSize: 17, fontWeight: "800", marginBottom: 8 },
  meta: { color: DOC.muted, fontSize: 11, marginTop: -4, marginBottom: 10 },
  card: { backgroundColor: DOC.card, borderRadius: 12, padding: 14, marginBottom: 14 },
  name: { color: DOC.text, fontSize: 16, fontWeight: "800" },
  sub: { color: DOC.muted, fontSize: 11, marginTop: 3, marginBottom: 8 },
  badge: { backgroundColor: DOC.brand, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeText: { color: DOC.white, fontSize: 10, fontWeight: "700" },
  totals: { gap: 8, marginBottom: 14 },
  tot: { flex: 1, borderWidth: 1, borderColor: DOC.border, borderRadius: 10, padding: 10 },
  totL: { color: DOC.muted, fontSize: 10, textAlign: "center" },
  totV: { fontSize: 13, fontWeight: "800", marginTop: 3, textAlign: "center" },
  th: { backgroundColor: DOC.brand, paddingVertical: 8, paddingHorizontal: 8 },
  thText: { color: DOC.white, fontSize: 11, fontWeight: "700" },
  tr: { paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: DOC.border, alignItems: "center" },
  td: { color: DOC.text, fontSize: 12 },
  num: { fontWeight: "800" },
  empty: { color: DOC.muted, textAlign: "center", padding: 20 },
  footer: { color: DOC.muted, fontSize: 10, textAlign: "center", marginTop: 20 },
  metaRow: { justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", backgroundColor: DOC.card, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, gap: 8 },
  metaText: { color: DOC.muted, fontSize: 10, flexShrink: 1 },
  metaStrong: { color: DOC.text, fontWeight: "700" },
  entityRow: { alignItems: "center", gap: 10, marginTop: 12, marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: DOC.border },
  table: { borderWidth: 1, borderColor: DOC.border, borderRadius: 10, overflow: "hidden" },
  center: { textAlign: "center" },
  totalRow: { backgroundColor: DOC.card, borderTopWidth: 2, borderTopColor: DOC.brand, borderBottomWidth: 0 },
  balanceBox: { marginTop: 10, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center", justifyContent: "space-between", gap: 8 },
  balanceLabel: { fontSize: 13, fontWeight: "800", flex: 1 },
  balanceValue: { fontSize: 20, fontWeight: "800" },
  // voucher
  vBand: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center", justifyContent: "space-between", gap: 8 },
  vBandTitle: { color: DOC.white, fontSize: 18, fontWeight: "800" },
  vBandMeta: { color: DOC.white, fontSize: 10, opacity: 0.9, marginTop: 2 },
  vAmount: { marginTop: 12, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center", justifyContent: "space-between" },
  vAmountL: { fontSize: 12, fontWeight: "700" },
  vAmountV: { fontSize: 24, fontWeight: "800" },
  vBody: { marginTop: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  vLine: { alignItems: "flex-start", gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: DOC.border },
  vK: { fontSize: 11, fontWeight: "700", width: 118 },
  vV: { color: DOC.text, fontSize: 13, fontWeight: "600", flex: 1 },
  signRow: { justifyContent: "space-between", gap: 16, marginTop: 28 },
  signBox: { flex: 1 },
  signSpace: { height: 34 },
  signLabel: { borderTopWidth: 1.5, paddingTop: 6, textAlign: "center", color: DOC.text, fontSize: 11, fontWeight: "700" },
  signName: { textAlign: "center", color: DOC.muted, fontSize: 10, marginTop: 2 },
});
