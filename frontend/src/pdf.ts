import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Transaction, OfficeSettings } from "./api";
import { logoDisplayUrl } from "./api";

type Params = {
  entity: { name: string; phone?: string; address?: string; assignment?: string };
  entityType: "client" | "employee";
  items: Transaction[];
  balance: number;
  settings?: OfficeSettings | null;
  t: (k: string) => string;
  isRTL: boolean;
  serviceLabel: string;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString();

export function buildStatementHtml(p: Params): string {
  const { entity, items, balance, settings, t, isRTL, serviceLabel, entityType } = p;
  const currency = settings?.currency ?? "ر.س";
  const logo = logoDisplayUrl(settings?.logo_url);
  const dir = isRTL ? "rtl" : "ltr";
  const charges = items.filter((i) => i.kind === "charge").reduce((s, i) => s + i.amount, 0);
  const payments = items.filter((i) => i.kind === "payment").reduce((s, i) => s + i.amount, 0);
  const sub = entityType === "client" ? [entity.address, entity.phone] : [entity.assignment, entity.phone];

  const rows = items
    .map(
      (tx) => `
      <tr>
        <td>${esc(new Date(tx.date).toLocaleDateString())}</td>
        <td>${esc(tx.description)}</td>
        <td class="num ${tx.kind === "payment" ? "green" : "red"}">${tx.kind === "payment" ? "−" : "+"} ${fmt(tx.amount)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${isRTL ? "ar" : "en"}">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, "Noto Sans Arabic", Arial, sans-serif; color: #1f2a22; margin: 0; padding: 32px; direction: ${dir}; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #4f6f52; padding-bottom: 16px; margin-bottom: 24px; }
  .office h1 { margin: 0; font-size: 22px; color: #4f6f52; }
  .office p { margin: 4px 0 0; font-size: 12px; color: #6b7a6e; }
  .logo { width: 72px; height: 72px; object-fit: contain; border-radius: 12px; }
  .title { font-size: 18px; font-weight: 700; margin: 0 0 12px; }
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
</style>
</head>
<body>
  <div class="head">
    <div class="office">
      <h1>${esc(settings?.office_name || "")}</h1>
      <p>${esc([settings?.address, settings?.phone].filter(Boolean).join(" · "))}</p>
    </div>
    ${logo ? `<img class="logo" src="${esc(logo)}" />` : ""}
  </div>

  <p class="title">${esc(t("statement"))}</p>
  <div class="card">
    <p class="name">${esc(entity.name)}</p>
    <p class="sub">${esc(sub.filter(Boolean).join(" · ") || "—")}</p>
    <span class="badge">${esc(serviceLabel)}</span>
  </div>

  <div class="totals">
    <div class="tot"><div class="l">${esc(t("total_charges"))}</div><div class="v red">${fmt(charges)} ${esc(currency)}</div></div>
    <div class="tot"><div class="l">${esc(t("total_payments"))}</div><div class="v green">${fmt(payments)} ${esc(currency)}</div></div>
    <div class="tot"><div class="l">${esc(t("current_balance"))}</div><div class="v ${balance >= 0 ? "red" : "green"}">${fmt(balance)} ${esc(currency)}</div></div>
  </div>

  ${
    items.length
      ? `<table>
      <thead><tr><th>${esc(t("date"))}</th><th>${esc(t("description"))}</th><th>${esc(t("amount"))} (${esc(currency)})</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
      : `<div class="empty">${esc(t("empty"))}</div>`
  }

  <div class="footer">${esc(t("issued_on"))}: ${esc(new Date().toLocaleDateString())}</div>
</body>
</html>`;
}

/** Generates the PDF and opens the native share sheet (WhatsApp, Mail, ...). On web it opens the print dialog. */
export async function shareStatementPdf(p: Params & { fileName: string }) {
  const html = buildStatementHtml(p);
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("sharing_unavailable");
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: p.fileName,
    UTI: "com.adobe.pdf",
  });
}
