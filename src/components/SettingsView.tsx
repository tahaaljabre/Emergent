import React, { useState, useRef } from 'react';
import { OfficeSettings, CurrencyItem } from '../types';
import { updateSettings, getBackup, resetDatabase } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { useAppTheme } from '../lib/theme';
import { DEFAULT_CURRENCIES, CurrencyOption } from '../lib/currencies';
import {
  Settings,
  Building,
  Globe,
  Moon,
  Sun,
  Download,
  RotateCcw,
  Archive,
  BarChart3,
  Check,
  Save,
  Image as ImageIcon,
  Upload,
  Trash2,
  Coins,
  Plus,
  MessageCircle,
  ShieldCheck,
  PenTool,
  Sparkles,
} from 'lucide-react';

interface SettingsViewProps {
  settings: OfficeSettings | null;
  onUpdateSettings: (newSettings: OfficeSettings) => void;
  onNavigateTab: (tab: 'archive' | 'reports') => void;
  onDataReset: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onNavigateTab,
  onDataReset,
}) => {
  const { lang, setLang, t, isRTL } = useI18n();
  const { mode, setMode } = useAppTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<OfficeSettings>({
    office_name: settings?.office_name || 'مكتب الأمانة للخدمات',
    address: settings?.address || 'صنعاء - شارع الستين / الرياض',
    phone: settings?.phone || '0112345678',
    currency: settings?.currency || 'ر.ي',
    currencies: settings?.currencies || DEFAULT_CURRENCIES,
    logo_url: settings?.logo_url || null,
    stamp_url: settings?.stamp_url || null,
    signature_url: settings?.signature_url || null,
  });

  const [newCurCode, setNewCurCode] = useState('');
  const [newCurSymbol, setNewCurSymbol] = useState('');
  const [newCurNameAr, setNewCurNameAr] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Add custom currency
  const handleAddCustomCurrency = () => {
    if (!newCurCode.trim() || !newCurSymbol.trim()) return;
    const code = newCurCode.trim().toUpperCase();
    const symbol = newCurSymbol.trim();
    const name_ar = newCurNameAr.trim() || code;
    
    const existing = (formData.currencies || DEFAULT_CURRENCIES).filter((c) => c.code !== code);
    const updated: CurrencyItem[] = [
      ...existing,
      {
        code,
        symbol,
        name_ar,
        name_en: code,
        tafqeet_ar: name_ar,
      },
    ];
    setFormData({ ...formData, currencies: updated });
    setNewCurCode('');
    setNewCurSymbol('');
    setNewCurNameAr('');
  };

  // Logo file upload handler
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(lang === 'ar' ? 'يرجى اختيار ملف صورة صالح (PNG, JPG, SVG)' : 'Please choose a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setFormData((prev) => ({ ...prev, logo_url: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logo_url: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Stamp file upload handler
  const handleStampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(lang === 'ar' ? 'يرجى اختيار ملف صورة صالح للختم (PNG بخلفية شفافة مفضلة)' : 'Please choose a valid image file for the stamp');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setFormData((prev) => ({ ...prev, stamp_url: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveStamp = () => {
    setFormData((prev) => ({ ...prev, stamp_url: null }));
    if (stampInputRef.current) {
      stampInputRef.current.value = '';
    }
  };

  // Signature file upload handler
  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(lang === 'ar' ? 'يرجى اختيار ملف صورة صالح للتوقيع (PNG بخلفية شفافة مفضلة)' : 'Please choose a valid image file for the signature');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setFormData((prev) => ({ ...prev, signature_url: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    setFormData((prev) => ({ ...prev, signature_url: null }));
    if (signatureInputRef.current) {
      signatureInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateSettings(formData);
      onUpdateSettings(res);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await getBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `office-services-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetData = async () => {
    if (!confirm(t('reset_confirm'))) return;
    try {
      await resetDatabase();
      onDataReset();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t('settings')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('settings_desc')}
          </p>
        </div>
      </div>

      {/* Office Profile & Logo Information Form */}
      <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <Building className="w-4 h-4 text-[#1F4A38] dark:text-[#4A7862]" />
          <span>{t('office_info')}</span>
        </h3>

        {/* Office Branding Grid: Logo, Stamp, Signature */}
        <div className="space-y-4 mb-6">
          {/* 1. Office Logo */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#141815] border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#1F4A38] dark:text-emerald-400" />
                <span>{t('office_logo')} (الترويسة)</span>
              </label>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-[#1A1F1C] border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative">
                {formData.logo_url ? (
                  <img
                    src={formData.logo_url}
                    alt={formData.office_name}
                    className="w-full h-full object-contain p-1.5"
                  />
                ) : (
                  <div className="text-center p-1 text-slate-400">
                    <ImageIcon className="w-6 h-6 mx-auto mb-0.5 opacity-50" />
                    <span className="text-[9px] block">{lang === 'ar' ? 'لا يوجد شعار' : 'No Logo'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lang === 'ar'
                    ? 'يظهر الشعار أعلى ترويسة السندات المالية وكشوفات الحساب الرسمية.'
                    : 'Appears in the header of official vouchers and statements.'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload-input"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#1F4A38] dark:text-emerald-400" />
                    <span>{formData.logo_url ? t('change_logo') : t('upload_logo')}</span>
                  </button>

                  {formData.logo_url && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('remove_logo')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Official Stamp (الختم الرسمي) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#141815] border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{lang === 'ar' ? 'الختم الرسمي للمكتب (Stamp)' : 'Official Office Stamp'}</span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                {formData.stamp_url ? (lang === 'ar' ? 'ختم مخصص مرفوع' : 'Custom Stamp') : (lang === 'ar' ? 'الختم المعتمد الافتراضي' : 'Default Circular Stamp')}
              </span>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Stamp Preview */}
              <div className="w-24 h-24 rounded-2xl bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1.5 shrink-0 shadow-xs relative">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#1F4A38] dark:border-[#4A7862] flex items-center justify-center p-1.5 text-center text-[#1F4A38] dark:text-[#4A7862] bg-emerald-50/50 dark:bg-emerald-950/30 rotate-[-4deg]">
                  {formData.stamp_url ? (
                    <img
                      src={formData.stamp_url}
                      alt="Official Stamp"
                      className="w-full h-full object-contain rounded-full"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <ShieldCheck className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-black leading-tight max-w-[65px] truncate">
                        {formData.office_name ? formData.office_name.split(' ')[0] + ' ' + (formData.office_name.split(' ')[1] || '') : 'مكتب الأمانة'}
                      </span>
                      <span className="text-[7px] font-bold text-slate-500 dark:text-slate-400">الختم الرسمي</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 flex-1">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lang === 'ar'
                    ? 'يظهر الختم بالمنتصف بين توقيع المحاسب وتوقيع المستلم في السندات وكشوف الحساب كما في النموذج المعتمد. يمكنك رفع صورة ختمك الخاص أو استخدام الختم الدائري النظامي.'
                    : 'Placed in the center between the accountant and recipient signatures in vouchers and statements.'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={stampInputRef}
                    accept="image/*"
                    onChange={handleStampChange}
                    className="hidden"
                    id="stamp-upload-input"
                  />
                  <button
                    type="button"
                    onClick={() => stampInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{formData.stamp_url ? (lang === 'ar' ? 'تغيير صورة الختم' : 'Change Stamp') : (lang === 'ar' ? 'رفع ختم مخصص (PNG)' : 'Upload Custom Stamp')}</span>
                  </button>

                  {formData.stamp_url && (
                    <button
                      type="button"
                      onClick={handleRemoveStamp}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'استخدام الختم الافتراضي' : 'Use Default'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Official Signature (توقيع المحاسب / المسؤول) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#141815] border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{lang === 'ar' ? 'التوقيع المعتمد للمسؤول / المحاسب' : 'Official Signature'}</span>
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-semibold">
                {formData.signature_url ? (lang === 'ar' ? 'توقيع مضاف' : 'Signature Added') : (lang === 'ar' ? 'خط توقيع يدوي' : 'Manual Line')}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Signature Preview */}
              <div className="w-28 h-20 rounded-2xl bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-2 shrink-0 shadow-xs relative">
                {formData.signature_url ? (
                  <img
                    src={formData.signature_url}
                    alt="Official Signature"
                    className="max-h-12 w-auto object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">المحاسب المسؤول</span>
                    <div className="w-20 border-t border-dashed border-slate-400 pt-0.5 text-[8px] text-slate-400">
                      التوقيع: ......
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lang === 'ar'
                    ? 'عند رفع صورة التوقيع (PNG بخلفية شفافة)، سيتم إدراجه تلقائياً فوق خانة "المحاسب المسؤول" في السندات وكشوف الحساب.'
                    : 'Upload a signature image to automatically overlay on the accountant signature block.'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={signatureInputRef}
                    accept="image/*"
                    onChange={handleSignatureChange}
                    className="hidden"
                    id="signature-upload-input"
                  />
                  <button
                    type="button"
                    onClick={() => signatureInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{formData.signature_url ? (lang === 'ar' ? 'تغيير صورة التوقيع' : 'Change Signature') : (lang === 'ar' ? 'رفع توقيع (PNG)' : 'Upload Signature')}</span>
                  </button>

                  {formData.signature_url && (
                    <button
                      type="button"
                      onClick={handleRemoveSignature}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/40 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'حذف التوقيع' : 'Remove Signature'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('office_name')}
            </label>
            <input
              type="text"
              required
              value={formData.office_name}
              onChange={(e) => setFormData({ ...formData, office_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('address')}
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('phone')}
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium"
                dir="ltr"
              />
            </div>
          </div>

          {/* Multi-Currency Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  {lang === 'ar' ? 'العملة الافتراضية للنظام' : 'Default System Currency'}
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {lang === 'ar'
                    ? 'العملة المستخدمة كخيار رئيسي عند فتح سند جديد أو إضافة عميل'
                    : 'Default currency selected for new vouchers and clients'}
                </p>
              </div>

              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold text-[#1F4A38] dark:text-emerald-400"
              >
                {(formData.currencies || DEFAULT_CURRENCIES).map((c) => (
                  <option key={c.code} value={c.symbol}>
                    {c.symbol} - {c.name_ar} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* List of active currencies */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {lang === 'ar' ? 'العملات المعتمدة في المكتب' : 'Supported Office Currencies'}
              </span>

              <div className="flex flex-wrap gap-2">
                {(formData.currencies || DEFAULT_CURRENCIES).map((cur) => (
                  <div
                    key={cur.code}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                  >
                    <span className="font-bold text-[#1F4A38] dark:text-emerald-400">{cur.symbol}</span>
                    <span className="text-slate-600 dark:text-slate-300">{cur.name_ar}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({cur.code})</span>
                  </div>
                ))}
              </div>

              {/* Add Custom Currency Mini-Form */}
              <div className="pt-2 mt-2 border-t border-dashed border-slate-200 dark:border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  {lang === 'ar' ? '+ إضافة عملة جديدة للنظام' : '+ Add New Currency'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder="الرمز مثلاً: ر.ع"
                    value={newCurSymbol}
                    onChange={(e) => setNewCurSymbol(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="كود العملة: OMR"
                    value={newCurCode}
                    onChange={(e) => setNewCurCode(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 uppercase"
                  />
                  <input
                    type="text"
                    placeholder="الاسم بالعربي: ريال عماني"
                    value={newCurNameAr}
                    onChange={(e) => setNewCurNameAr(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCurrency}
                    className="px-3 py-1.5 rounded-lg bg-[#1F4A38] text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {saveSuccess ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" />
                {t('saved')}
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#1F4A38] dark:bg-[#4A7862] text-white text-xs font-bold hover:opacity-90 shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? t('loading') : t('save')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Preferences Section */}
      <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#1F4A38] dark:text-[#4A7862]" />
          <span>{t('system_preferences')}</span>
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
              {t('language')}
            </span>
            <span className="text-xs text-slate-500">
              {lang === 'ar'
                ? 'اختر لغة عرض الواجهة (العربية الافتراضية مع دعم RTL)'
                : 'Choose interface language (Arabic default with RTL support)'}
            </span>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              onClick={() => setLang('ar')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                lang === 'ar'
                  ? 'bg-white dark:bg-[#1A1F1C] text-[#1F4A38] dark:text-[#4A7862] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              العربية (RTL)
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                lang === 'en'
                  ? 'bg-white dark:bg-[#1A1F1C] text-[#1F4A38] dark:text-[#4A7862] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              English (LTR)
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
          <div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
              {t('theme')}
            </span>
            <span className="text-xs text-slate-500">
              {lang === 'ar'
                ? 'التبديل بين الوضع الفاتح والداكن المريح للعين'
                : 'Toggle between comfortable light and dark theme'}
            </span>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              onClick={() => setMode('light')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                mode === 'light'
                  ? 'bg-white dark:bg-[#1A1F1C] text-[#1F4A38] dark:text-[#4A7862] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>{t('light')}</span>
            </button>
            <button
              onClick={() => setMode('dark')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                mode === 'dark'
                  ? 'bg-white dark:bg-[#1A1F1C] text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{t('dark')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigateTab('reports')}
          className="p-5 rounded-2xl bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 hover:border-[#1F4A38] dark:hover:border-[#4A7862] text-start transition-all flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('reports')}
              </h4>
              <p className="text-xs text-slate-500">
                {lang === 'ar' ? 'عرض الإحصائيات والتحليلات' : 'View analytics and performance statistics'}
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('archive')}
          className="p-5 rounded-2xl bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 hover:border-[#1F4A38] dark:hover:border-[#4A7862] text-start transition-all flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('archive')}
              </h4>
              <p className="text-xs text-slate-500">
                {lang === 'ar' ? 'إدارة واستعادة السجلات المؤرشفة' : 'Manage and restore archived records'}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Backup and Data Management */}
      <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Download className="w-4 h-4 text-[#1F4A38] dark:text-[#4A7862]" />
          <span>{t('backup_restore')}</span>
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
              {t('export_json')}
            </span>
            <span className="text-xs text-slate-500">
              {lang === 'ar'
                ? 'تحميل ملف JSON كامل يحتوي على جميع العملاء، الموظفين، والمعاملات'
                : 'Download full JSON file containing all clients, employees, and transactions'}
            </span>
          </div>

          <button
            onClick={handleExportBackup}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('export_json')}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
          <div>
            <span className="text-sm font-semibold text-red-600 block">
              {t('reset_data')}
            </span>
            <span className="text-xs text-slate-500">
              {lang === 'ar'
                ? 'إعادة تهيئة قاعدة البيانات بالبيانات التجريبية الأولية'
                : 'Reset database to initial default demo records'}
            </span>
          </div>

          <button
            onClick={handleResetData}
            className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 flex items-center gap-1.5 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('reset_data')}</span>
          </button>
        </div>
      </div>

      {/* Developer Contact Card in Settings (At the bottom only as requested) */}
      <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-center sm:text-start">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {t('contact_developer')}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('developer_name')}
            </span>
          </div>
        </div>

        <a
          href="https://wa.me/967738950505"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('contact_whatsapp')}
          title={t('contact_whatsapp')}
          id="btn-settings-whatsapp-developer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs hover:shadow-sm transition-all transform active:scale-95 shrink-0"
        >
          <MessageCircle className="w-4 h-4 fill-white/10" />
          <span>{t('contact_whatsapp')}</span>
        </a>
      </div>
    </div>
  );
};
