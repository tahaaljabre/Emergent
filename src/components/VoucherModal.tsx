import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas-pro';
import { Transaction, Client, Employee, OfficeSettings } from '../types';
import { useI18n } from '../lib/i18n';
import { tafqeet } from '../lib/tafqeet';
import { DEFAULT_CURRENCIES, getCurrencyInfo } from '../lib/currencies';
import {
  Printer,
  Image as ImageIcon,
  Share2,
  X,
  Edit,
  Check,
  Building,
  ShieldCheck,
  Calendar,
  DollarSign,
  FileCheck,
  Sparkles,
} from 'lucide-react';

import { printHtmlContent } from '../lib/printHelper';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  txn: Transaction | null;
  entity: Client | Employee | null;
  entityType: 'client' | 'employee';
  settings: OfficeSettings | null;
  onEdit?: (txn: Transaction) => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  isOpen,
  onClose,
  txn,
  entity,
  entityType,
  settings,
  onEdit,
}) => {
  const { t, isRTL, lang } = useI18n();
  const voucherRef = useRef<HTMLDivElement>(null);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || !txn || !entity) return null;

  const availableCurrencies = settings?.currencies || DEFAULT_CURRENCIES;
  const rawCurrency = txn.currency || ('currency' in entity ? (entity as any).currency : null) || settings?.currency || 'ر.ي';
  const currencyInfo = getCurrencyInfo(rawCurrency, availableCurrencies);
  const displayCurrency = currencyInfo.symbol;
  const currencyTafqeet = currencyInfo.tafqeet_ar || currencyInfo.name_ar;

  const isClient = entityType === 'client';
  const isReceipt = txn.kind === 'receipt';
  const isDisbursement = txn.kind === 'disbursement';
  const isCharge = txn.kind === 'charge';

  const voucherTitle = isReceipt
    ? lang === 'ar' ? 'سند قبض مالي' : 'Official Receipt Voucher'
    : isDisbursement
    ? lang === 'ar' ? 'سند صرف مالي' : 'Official Payment Voucher'
    : lang === 'ar' ? 'إشعار استحقاق مالي' : 'Official Debit / Billing Notice';

  const serialNo = `SN-${txn.id.substring(txn.id.length - 6).toUpperCase()}`;
  const formattedDate = txn.date ? txn.date.split('T')[0] : new Date().toISOString().split('T')[0];
  const amountWords = tafqeet(txn.amount, currencyTafqeet);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Direct Print PDF - with reliable multi-fallback handling
  const handlePrint = () => {
    try {
      if (!voucherRef.current) {
        window.print();
        return;
      }
      showToast(lang === 'ar' ? 'جاري فتح نافذة الطباعة...' : 'Opening print dialog...');
      const printed = printHtmlContent(voucherRef.current.outerHTML, {
        title: `${voucherTitle} - ${serialNo}`,
        isRTL,
        lang,
        onError: () => {
          window.print();
        },
      });
      if (!printed) {
        window.print();
      }
    } catch (err) {
      console.warn('Direct print error:', err);
      window.print();
    }
  };

  // 2. Export / Print as PNG Image
  const handleExportImage = async () => {
    if (!voucherRef.current) return;
    try {
      setIsGeneratingImage(true);
      const canvas = await html2canvas(voucherRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 5000,
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Voucher_${serialNo}_${formattedDate}.png`;
      link.click();
      showToast(lang === 'ar' ? 'تم تنزيل صورة السند بجودة عالية بنجاح' : 'Voucher image downloaded successfully');
    } catch (err: any) {
      console.error('Error exporting image:', err);
      showToast(lang === 'ar' ? 'تعذر تحويل السند لصورة، يرجى استخدام زر طباعة PDF' : 'Failed to export image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 3. Direct Share (PDF / Image / Web Share)
  const handleShare = async () => {
    const shareText = `📄 ${voucherTitle}\n${t('voucher_no')}: ${serialNo}\n${t('date')}: ${formattedDate}\n${isClient ? t('client_name') : t('employee_name')}: ${entity.name}\n${t('amount')}: ${Number(txn.amount).toLocaleString()} ${displayCurrency}\n${t('description')}: ${txn.description}\n${settings?.office_name || ''}`;

    if (navigator.share && voucherRef.current) {
      try {
        setIsGeneratingImage(true);
        const canvas = await html2canvas(voucherRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          imageTimeout: 5000,
        });
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        
        if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], `Voucher_${serialNo}.png`, { type: 'image/png' })] })) {
          const file = new File([blob], `Voucher_${serialNo}.png`, { type: 'image/png' });
          await navigator.share({
            title: voucherTitle,
            text: shareText,
            files: [file],
          });
          showToast(lang === 'ar' ? 'تمت المشاركة بنجاح' : 'Shared successfully');
          return;
        } else {
          await navigator.share({
            title: voucherTitle,
            text: shareText,
          });
          showToast(lang === 'ar' ? 'تمت المشاركة بنجاح' : 'Shared successfully');
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Navigator share error, falling back to copy:', err);
        }
      } finally {
        setIsGeneratingImage(false);
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      showToast(lang === 'ar' ? 'تم نسخ بيانات السند للمشاركة بنجاح' : 'Voucher text copied to clipboard');
    } catch {
      showToast(shareText);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:static print:bg-transparent">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-[#1F4A38] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-fade-in no-print">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white dark:bg-[#1A1F1C] rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Modal Action Header (Hidden in Print) */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-[#141815] no-print">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>{t('preview_voucher')}</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400">#{serialNo}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                A5
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Direct Print PDF */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title={t('print_voucher_pdf')}
              id="btn-voucher-modal-print"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline">{t('print_voucher_pdf')} (A5)</span>
            </button>

            {/* Export / Print as Image */}
            <button
              onClick={handleExportImage}
              disabled={isGeneratingImage}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
              title={t('print_voucher_image')}
              id="btn-voucher-modal-image"
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline">{t('print_voucher_image')}</span>
            </button>

            {/* Direct Share */}
            <button
              onClick={handleShare}
              disabled={isGeneratingImage}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-[#1F4A38] dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
              title={t('share_voucher')}
              id="btn-voucher-modal-share"
            >
              <Share2 className="w-3.5 h-3.5 text-[#1F4A38] dark:text-emerald-400" />
              <span className="hidden sm:inline">{t('share_voucher')}</span>
            </button>

            {/* Edit Voucher Button */}
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(txn);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title={t('edit_voucher')}
                id="btn-voucher-modal-edit"
              >
                <Edit className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden sm:inline">{t('edit_voucher')}</span>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={t('cancel')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area with the Official Printable Voucher Certificate (A5 Landscape) */}
        <div className="p-3 sm:p-5 overflow-y-auto max-h-[80vh] print:max-h-none print:overflow-visible print:p-0 flex justify-center bg-slate-100/60 dark:bg-slate-900/60">
          <div
            ref={voucherRef}
            id="voucher-card-printable"
            className="bg-white text-slate-900 rounded-xl p-5 sm:p-6 border-2 border-[#1F4A38]/30 shadow-xs relative w-full max-w-[760px] print:border-none print:p-3 print:shadow-none"
            style={{ direction: isRTL ? 'rtl' : 'ltr' }}
          >
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none overflow-hidden">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt=""
                  className="w-72 h-72 object-contain grayscale"
                />
              ) : (
                <ShieldCheck className="w-80 h-80 text-[#1F4A38]" />
              )}
            </div>

            {/* Header: Office Branding */}
            <div className="border-b-2 border-[#1F4A38] pb-3 mb-3">
              <div className="flex items-center justify-between gap-3">
                {/* Office Name & Info */}
                <div className="flex items-center gap-3">
                  {settings?.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt={settings.office_name}
                      className="w-12 h-12 rounded-xl object-contain bg-white p-1 border border-slate-200 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-[#1F4A38] text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                      <Building className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#1F4A38] leading-tight">
                      {settings?.office_name || 'مكتب الأمانة للخدمات الأمنية والنظافة'}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {settings?.address || 'صنعاء - شارع الستين / الرياض - حي العليا'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono" dir="ltr">
                      Tel: {settings?.phone || '0112345678'}
                    </p>
                  </div>
                </div>

                {/* Serial & Date Badge */}
                <div className="text-end space-y-1 shrink-0">
                  <div className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-[#1F4A38] text-xs font-bold font-mono">
                    {serialNo}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium flex items-center justify-end gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Title Banner */}
            <div className="text-center my-2.5">
              <div className="inline-block px-6 py-1.5 rounded-lg bg-[#1F4A38] text-white font-bold text-sm sm:text-base shadow-xs tracking-wide">
                {voucherTitle}
              </div>
            </div>

            {/* Amount Box */}
            <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">
                  {t('amount')} ({displayCurrency})
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#1F4A38] font-mono">
                  {Number(txn.amount).toLocaleString()} {displayCurrency}
                </span>
              </div>
              <div className="text-start sm:text-end max-w-sm">
                <span className="text-[11px] text-slate-500 font-semibold block mb-0.5">
                  {t('amount_in_words')}
                </span>
                <span className="text-xs font-bold text-slate-800 leading-snug block">
                  {amountWords}
                </span>
              </div>
            </div>

            {/* Voucher Details Grid */}
            <div className="space-y-2 text-xs text-slate-800">
              {/* Entity Name */}
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1.5 border-b border-dashed border-slate-200">
                <span className="font-bold text-slate-600 min-w-32 text-start">
                  {isReceipt
                    ? t('received_from')
                    : isDisbursement
                    ? t('paid_to')
                    : t('client_name')}:
                </span>
                <span className="font-bold text-xs sm:text-sm text-slate-900 flex-1">
                  {entity.name}
                  {entity.phone ? ` (هاتف: ${entity.phone})` : ''}
                </span>
              </div>

              {/* Reason / Purpose */}
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1.5 border-b border-dashed border-slate-200">
                <span className="font-bold text-slate-600 min-w-32 text-start">
                  {t('for_reason')}:
                </span>
                <span className="font-medium text-slate-800 flex-1 leading-relaxed bg-slate-50/80 p-1.5 rounded-lg border border-slate-100 text-[11px] sm:text-xs">
                  {txn.description || '—'}
                </span>
              </div>

              {/* Service Type / Role Context */}
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 py-1 border-b border-dashed border-slate-200">
                <span className="font-bold text-slate-600 min-w-32 text-start">
                  نوع الخدمة / النشاط:
                </span>
                <span className="font-semibold text-slate-700 text-xs">
                  {'service_type' in entity && entity.service_type === 'security'
                    ? 'خدمات حراسة أمنية معتمدة'
                    : 'service_type' in entity && entity.service_type === 'cleaning'
                    ? 'خدمات نظافة وصيانة شاملة'
                    : 'شؤون الموظفين والرواتب التشغيلية'}
                </span>
              </div>
            </div>

            {/* Signatures & Official Seal (3-column layout matching user request) */}
            <div className="grid grid-cols-3 gap-2 pt-6 mt-4 border-t-2 border-slate-200 items-end text-center text-xs">
              {/* Column 1: Accountant / المسؤول (Right side in Arabic RTL) */}
              <div className="flex flex-col items-center justify-end min-h-[75px]">
                <span className="block font-bold text-slate-700 mb-1">{t('accountant')}</span>
                {settings?.signature_url ? (
                  <img
                    src={settings.signature_url}
                    alt="Accountant Signature"
                    className="h-10 w-auto object-contain my-0.5"
                  />
                ) : (
                  <div className="h-6" />
                )}
                <div className="w-full border-t border-dashed border-slate-400 pt-0.5 text-[10px] text-slate-500">
                  التوقيع: .....................
                </div>
              </div>

              {/* Column 2: Official Stamp (Center) */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#1F4A38] flex items-center justify-center p-1.5 text-center text-[#1F4A38] rotate-[-4deg] bg-emerald-50/30 shrink-0">
                  {settings?.stamp_url ? (
                    <img
                      src={settings.stamp_url}
                      alt="Official Stamp"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <ShieldCheck className="w-5 h-5 mb-0.5 text-[#1F4A38]" />
                      <span className="text-[9px] font-black leading-tight max-w-[65px] truncate">
                        {settings?.office_name ? settings.office_name.split(' ')[0] + ' ' + (settings.office_name.split(' ')[1] || '') : 'مكتب الأمانة'}
                      </span>
                      <span className="text-[7px] text-slate-500 font-bold">{t('official_stamp')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: Recipient / Client (Left side in Arabic RTL) */}
              <div className="flex flex-col items-center justify-end min-h-[75px]">
                <span className="block font-bold text-slate-700 mb-1">
                  {isReceipt ? t('signature_party') : t('recipient')}
                </span>
                <div className="h-6" />
                <div className="w-full border-t border-dashed border-slate-400 pt-0.5 text-[10px] text-slate-500">
                  التوقيع: .....................
                </div>
              </div>
            </div>

            {/* Footer Note with Timestamp */}
            <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <span>تم استخراج السند آلياً عبر نظام إدارة الخدمات</span>
              <span>
                {new Date().toLocaleDateString('ar-SA', {
                  year: 'numeric',
                  month: 'numeric',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  second: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
