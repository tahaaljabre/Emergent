import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Transaction, OfficeSettings, DashboardData, TxnKind } from "./api";
import { logoDisplayUrl, txnSign } from "./api";
import { DOC, kindColor, kindLabelKey, remainingLabel } from "./components/share-cards";

type T = (k: string) => string;
type Entity = { name: string; phone?: string; address?: string; assignment?: string };
type Base = { settings?: OfficeSettings | null; t: T; isRTL: boolean };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString();
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString();

const CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, "Noto Sans Arabic", Arial, sans-serif; color: #1f2a22; margin: 0; padding: 32px; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #4f6f52; padding-bottom: 16px; margin-bottom: 24px; }
  .office h1 { margin: 0; font-size: 22px; color: #4f6f52; }
  .office p { margin: 4px 0 0; font-size: 12px; color: #6b7a6e; }
  .logo { width: 72px; height: 72px; object-fit: contain; border-radius: 12px; }
  .title { font-size: 18px; font-weight: 700; margin: 0 0 12px; }
  .meta { font-size: 12px; color: #6b7a6e; margin: -6px 0 14px; }
  .card { background: #f1f5f1; border-radius: 14px; padding: 16px; margin-bottom: 20px; }
  .card .name { font-size: 18px; font-weight: 800; margin: 0; }
  .card .sub { font-size: 12px; color: #6b7a6e; margin: 4px 0 0; }
  .badge { display: inline-block; background: #4f6f52; color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 999px; margin-top: 8px; }
  .totals { display: flex; gap: 12px; margin-bottom: 20px; }
  .tot { flex: 1; border: 1px solid #d9e2da; border-radius: 12px; padding: 12px; }
  .tot .l { font-size: 11px; color: #6b7a6e; }
  .tot .v { font-size: 18px; font-weight: 800; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: start; background: #4f6f52; color: #fff; padding: 10px; font-weight: 700; }
  td { padding: 10px; border-bottom: 1px solid #e3e9e4; }
  .num { font-weight: 700; white-space: nowrap; }
  .green { color: #2e7d4f; } .red { color: #c0392b; }
  .footer { margin-top: 28px; font-size: 11px; color: #8a978d; text-align: center; }
  .empty { text-align: center; color: #8a978d; padding: 24px; }
  .amount-box { text-align: center; background: #4f6f52; color: #fff; border-radius: 16px; padding: 24px; margin: 20px 0; }
  .amount-box .l { font-size: 12px; opacity: .85; }
  .amount-box .v { font-size: 36px; font-weight: 800; margin-top: 6px; }
  .kv { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e3e9e4; font-size: 14px; }
  .kv .k { color: #6b7a6e; } .kv .v { font-weight: 700; }
  .sign { display: flex; justify-content: space-between; margin-top: 48px; font-size: 12px; color: #6b7a6e; }
  .sign div { width: 40%; border-top: 1px solid #b9c6bb; padding-top: 8px; text-align: center; }
  .vband { display: flex; justify-content: space-between; align-items: center; border-radius: 14px; padding: 16px 20px; color: #fff; }
  .vtitle { font-size: 24px; font-weight: 800; }
  .vmeta { font-size: 12px; opacity: .95; text-align: end; line-height: 1.6; }
  .vamount { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; border: 2px solid; border-radius: 14px; padding: 14px 20px; font-size: 14px; font-weight: 700; }
  .vamount b { font-size: 30px; font-weight: 800; }
  .vbody { margin-top: 16px; border: 1px solid; border-radius: 14px; padding: 4px 16px; }
  .vline { display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid #e3e9e4; font-size: 14px; }
  .vline:last-child { border-bottom: none; }
  .vk { width: 190px; flex-shrink: 0; font-weight: 700; font-size: 12px; }
  .vv { font-weight: 600; flex: 1; }
  .signs { display: flex; justify-content: space-between; gap: 32px; margin-top: 72px; }
  .signbox { flex: 1; }
  .signline { border-top: 2px solid; padding-top: 8px; text-align: center; font-size: 13px; font-weight: 700; }
  .signname { text-align: center; font-size: 11px; color: #6b7a6e; margin-top: 4px; }
  .metarow { display: flex; justify-content: space-between; background: #f1f5f1; border-radius: 10px; padding: 10px 14px; font-size: 12px; color: #6b7a6e; }
  .metarow b { color: #1f2a22; }
  .entityrow { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 16px 0; padding-bottom: 12px; border-bottom: 1px solid #e3e9e4; }
  .small { font-size: 11px; color: #6b7a6e; }
  .ename { font-size: 20px; font-weight: 800; margin: 2px 0; }
  .stmt { border: 1px solid #e3e9e4; border-radius: 10px; overflow: hidden; }
  .stmt tbody tr:nth-child(even) td { background: #f7faf7; }
  .c { text-align: center; }
  .totalrow td { background: #f1f5f1 !important; font-weight: 800; border-top: 2px solid #4f6f52; }
  .balancebox { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; border: 2px solid; border-radius: 12px; padding: 14px 18px; font-size: 15px; font-weight: 800; }
  .balancebox b { font-size: 24px; }
`;

function wrap(b: Base, body: string): string {
  const { settings, t, isRTL } = b;
  const logo = logoDisplayUrl(settings?.logo_url);
  const dir = isRTL ? "rtl" : "ltr";
  return `<!DOCTYPE html>
<html dir="${dir}" lang="${isRTL ? "ar" : "en"}">
<head><meta charset="utf-8" /><style>${CSS} body { direction: ${dir}; }</style></head>
<body>
  <div class="head">
    <div class="office">
      <h1>${esc(settings?.office_name || "")}</h1>
      <p>${esc([settings?.address, settings?.phone].filter(Boolean).join(" · "))}</p>
    </div>
    ${logo ? `<img class="logo" src="${esc(logo)}" />` : ""}
  </div>
  ${body}
  <div class="footer">${esc(t("issued_on"))}: ${esc(fmtDate(new Date()))}</div>
</body>
</html>`;
}

/** Opens native share sheet (WhatsApp, Mail, ...) with the generated PDF; on web opens the print dialog. */
export async function sharePdf(html: string, title: string) {
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  if (!(await Sharing.isAvailableAsync())) throw new Error("sharing_unavailable");
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
}

/** Shares a PNG captured with react-native-view-shot; on web downloads the data-uri. */
export async function shareImage(uri: string, title: string) {
  if (Platform.OS === "web") {
    const a = document.createElement("a");
    a.href = uri;
    a.download = `${title}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error("sharing_unavailable");
  await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: title, UTI: "public.png" });
}

// ---------- Statement ----------
export type Period = { from?: Date; to?: Date; label: string };

export function filterByPeriod(items: Transaction[], p?: Period | null) {
  if (!p || (!p.from && !p.to)) return items;
  return items.filter((tx) => {
    const d = new Date(tx.date).getTime();
    if (p.from && d < p.from.getTime()) return false;
    if (p.to && d > p.to.getTime()) return false;
    return true;
  });
}

export function buildStatementHtml(
  p: Base & { entity: Entity; entityType: "client" | "employee"; items: Transaction[]; balance: number; serviceLabel: string; period?: Period | null }
): string {
  const { entity, items, balance, settings, t, serviceLabel, entityType, period } = p;
  const currency = settings?.currency ?? "ر.س";
  const rows = [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let due = 0, paid = 0, dueCount = 0, paidCount = 0;
  rows.forEach((tx) => {
    if (txnSign(entityType, tx.kind) > 0) { due += tx.amount; dueCount++; } else { paid += tx.amount; paidCount++; }
  });
  const sub = (entityType === "client" ? [entity.address, entity.phone] : [entity.assignment, entity.phone]).filter(Boolean).join(" · ");
  const periodText = period
    ? `${period.label}${period.from || period.to ? ` (${period.from ? fmtDate(period.from) : "…"} – ${period.to ? fmtDate(period.to) : "…"})` : ""}`
    : t("all_time");
  const settled = Math.round(balance) === 0;
  const balColor = settled ? DOC.green : balance > 0 === (entityType === "client") ? DOC.red : DOC.green;
  const body = rows
    .map((tx) => {
      const isDue = txnSign(entityType, tx.kind) > 0;
      return `<tr><td>${esc(fmtDate(tx.date))}</td>
        <td>${esc(tx.description)}<br/><span style="color:${kindColor(tx.kind)};font-size:10px;font-weight:700">${esc(t(kindLabelKey(tx.kind)))}</span></td>
        <td class="num c" style="color:${isDue ? DOC.red : DOC.muted}">${isDue ? fmt(tx.amount) : "—"}</td>
        <td class="num c" style="color:${!isDue ? DOC.green : DOC.muted}">${!isDue ? fmt(tx.amount) : "—"}</td></tr>`;
    })
    .join("");

  return wrap(
    p,
    `<div class="metarow">
    <span>${esc(t("print_date"))}: <b>${esc(fmtDate(new Date()))}</b></span>
    <span>${esc(t("period"))}: <b>${esc(periodText)}</b></span>
  </div>
  <div class="entityrow">
    <div>
      <div class="small">${esc(t("statement_of"))} · ${esc(entityType === "client" ? t("client_label") : t("employee_label"))}</div>
      <div class="ename">${esc(entity.name)}</div>
      ${sub ? `<div class="small">${esc(sub)}</div>` : ""}
    </div>
    <span class="badge" style="margin:0">${esc(serviceLabel)}</span>
  </div>
  ${
    rows.length
      ? `<table class="stmt">
      <thead><tr><th>${esc(t("date"))}</th><th>${esc(t("description"))}</th><th class="c">${esc(t("col_due"))}</th><th class="c">${esc(t("col_paid"))}</th></tr></thead>
      <tbody>${body}
      <tr class="totalrow"><td colspan="2">${esc(t("total"))}</td><td class="num c" style="color:${DOC.red}">${fmt(due)}</td><td class="num c" style="color:${DOC.green}">${fmt(paid)}</td></tr></tbody>
    </table>`
      : `<div class="empty">${esc(t("empty"))}</div>`
  }
  <div class="totals" style="margin-top:16px">
    <div class="tot"><div class="l">${esc(t("charges_count"))} (${dueCount})</div><div class="v red">${fmt(due)} ${esc(currency)}</div></div>
    <div class="tot"><div class="l">${esc(t("payments_count"))} (${paidCount})</div><div class="v green">${fmt(paid)} ${esc(currency)}</div></div>
  </div>
  <div class="balancebox" style="border-color:${balColor};color:${balColor}">
    <span>${esc(remainingLabel(t, entityType, balance))}</span>${settled ? "" : `<b>${fmt(balance)} ${esc(currency)}</b>`}
  </div>`
  );
}

// ---------- Voucher (سند قبض / سند صرف) ----------
export function buildVoucherHtml(p: Base & { entity: Entity; entityType: "client" | "employee"; tx: Transaction; balance: number }): string {
  const { entity, entityType, tx, balance, settings, t } = p;
  const currency = settings?.currency ?? "ر.س";
  const isReceipt = tx.kind === "receipt";
  const color = isReceipt ? DOC.green : DOC.orange;
  const tint = isReceipt ? DOC.greenBg : DOC.orangeBg;
  const no = tx.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const line = (k: string, v: string) =>
    `<div class="vline"><span class="vk" style="color:${color}">${esc(k)}</span><span class="vv">${esc(v)}</span></div>`;
  return wrap(
    p,
    `<div class="vband" style="background:${color}">
    <div class="vtitle">${esc(isReceipt ? t("receipt_voucher") : t("disbursement_voucher"))}</div>
    <div class="vmeta"><div>${esc(t("voucher_no"))}: ${no}</div><div>${esc(t("date"))}: ${esc(fmtDate(tx.date))}</div></div>
  </div>
  <div class="vamount" style="border-color:${color};background:${tint};color:${color}">
    <span>${esc(t("amount"))}</span><b>${fmt(tx.amount)} ${esc(currency)}</b>
  </div>
  <div class="vbody" style="border-color:${color}">
    ${line(isReceipt ? t("received_amount_from") : t("paid_amount_to"), entity.name)}
    ${entity.phone ? line(t("phone"), entity.phone) : ""}
    ${line(t("for_purpose"), tx.description)}
    ${line(t("remaining_balance"), `${fmt(balance)} ${currency}`)}
  </div>
  <div class="signs">
    <div class="signbox"><div class="signline" style="border-color:${color}">${esc(entityType === "client" ? t("signature_client") : t("signature_employee"))}</div><div class="signname">${esc(entity.name)}</div></div>
    <div class="signbox"><div class="signline" style="border-color:${color}">${esc(t("signature_officer"))}</div><div class="signname">${esc(settings?.office_name || "")}</div></div>
  </div>`
  );
}

// ---------- Revenue report ----------
export function buildReportHtml(p: Base & { data: DashboardData }): string {
  const { data, settings, t } = p;
  const currency = settings?.currency ?? "ر.س";
  const money = (n: number) => `${fmt(n)} ${currency}`;
  const row = (k: string, v: string) => `<tr><td>${esc(k)}</td><td class="num">${esc(v)}</td></tr>`;
  const expiring = data.expiring
    .map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(fmtDate(c.contract_end))}</td><td class="num">${money(c.contract_amount)}</td></tr>`)
    .join("");
  return wrap(
    p,
    `<p class="title">${esc(t("revenue_report"))}</p>
  <div class="totals">
    <div class="tot"><div class="l">${esc(t("this_month"))}</div><div class="v green">${money(data.monthly_revenue)}</div></div>
    <div class="tot"><div class="l">${esc(t("this_year"))}</div><div class="v green">${money(data.yearly_revenue)}</div></div>
  </div>
  <p class="title" style="font-size:15px">${esc(t("by_service"))}</p>
  <table><tbody>
    ${row(`${t("cleaning")} (${data.cleaning.count})`, money(data.cleaning.revenue))}
    ${row(`${t("security")} (${data.security.count})`, money(data.security.revenue))}
    ${row(t("total_contracts"), String(data.total_contracts))}
    ${row(t("total_subscriptions"), money(data.total_subscriptions))}
  </tbody></table>
  ${
    data.expiring.length
      ? `<p class="title" style="font-size:15px;margin-top:24px">${esc(t("expiring_contracts"))}</p>
    <table><thead><tr><th>${esc(t("client_name"))}</th><th>${esc(t("contract_end"))}</th><th>${esc(t("amount"))}</th></tr></thead><tbody>${expiring}</tbody></table>`
      : ""
  }`
  );
}
