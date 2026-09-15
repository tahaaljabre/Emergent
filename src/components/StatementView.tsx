import React, { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import { Client, Employee, Transaction, TxnKind, OfficeSettings } from '../types';
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  archiveTransaction,
} from '../lib/api';
import { useI18n } from '../lib/i18n';
import { DEFAULT_CURRENCIES, getCurrencyInfo } from '../lib/currencies';
import { printHtmlContent } from '../lib/printHelper';
import {
  ArrowRight,
  Plus,
  Printer,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  FileText,
  Clock,
  Trash2,
  Archive,
  Phone,
  Building,
  CheckCircle2,
  AlertCircle,
  Shield,
  Sparkles,
  MoreVertical,
  Edit,
  Share2,
  Image as ImageIcon,
  Check,
  Coins,
  Layers,
  Filter,
  Download,
  X,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { VoucherModal } from './VoucherModal';

interface StatementViewProps {
  entityType: 'client' | 'employee';
  entity: Client | Employee;
  settings: OfficeSettings | null;
  onBack: () => void;
}

export const StatementView: React.FC<StatementViewProps> = ({
  entityType,
  entity,
  settings,
  onBack,
}) => {
  const { t, isRTL, lang } = useI18n();
  const availableCurrencies = settings?.currencies || DEFAULT_CURRENCIES;
  const defaultEntityCurrency =
    ('currency' in entity && (entity as any).currency) ||
    settings?.currency ||
    'YER';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter currency tab ('ALL' or specific currency code like 'YER', 'SAR', 'USD')
  const [selectedCurrencyTab, setSelectedCurrencyTab] = useState<string>('ALL');

  // Fast Instant Search & Kind Filters for High-Performance handling of thousands of transactions
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [kindFilter, setKindFilter] = useState<'all' | 'charge' | 'receipt' | 'disbursement'>('all');

  // Pagination for UI rendering (50 rows per page default to guarantee zero lag, while printable ref has 100% data)
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Statement Ref for high-quality printing, PDF export, and image generation
  const statementRef = useRef<HTMLDivElement>(null);

  // Statement 3-dots menu state
  const [isStatementMenuOpen, setIsStatementMenuOpen] = useState(false);

  // Date Range Filtering state
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'this_month' | 'last_month' | 'last_3_months' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

  // Exporting spinners state
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);

  // 3-dots dropdown menu state for individual vouchers
  const [activeMenuTxnId, setActiveMenuTxnId] = useState<string | null>(null);

  // Voucher Preview / Print modal state
  const [selectedVoucherTxn, setSelectedVoucherTxn] = useState<Transaction | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Transaction Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState<{
    kind: TxnKind;
    description: string;
    amount: number;
    currency: string;
    date: string;
  }>({
    kind: entityType === 'client' ? 'receipt' : 'disbursement',
    description: '',
    amount: 1000,
    currency: defaultEntityCurrency,
    date: new Date().toISOString().split('T')[0],
  });

  // Edit Transaction Modal
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = useState<{
    kind: TxnKind;
    description: string;
    amount: number;
    currency: string;
    date: string;
  }>({
    kind: 'receipt',
    description: '',
    amount: 1000,
    currency: defaultEntityCurrency,
    date: new Date().toISOString().split('T')[0],
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuTxnId(null);
      setIsStatementMenuOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await listTransactions(entityType, entity.id);
      setTransactions(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [entity.id, entityType]);

  // Reset pagination when search, kind, date or currency tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, kindFilter, startDate, endDate, selectedCurrencyTab, pageSize]);

  // Apply Quick Date Presets
  const applyDatePreset = (preset: 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'custom') => {
    setDateFilterPreset(preset);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (preset === 'all') {
      setTempStartDate('');
      setTempEndDate('');
    } else if (preset === 'this_month') {
      const firstDay = new Date(y, m, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, m + 1, 0).toISOString().split('T')[0];
      setTempStartDate(firstDay);
      setTempEndDate(lastDay);
    } else if (preset === 'last_month') {
      const firstDay = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, m, 0).toISOString().split('T')[0];
      setTempStartDate(firstDay);
      setTempEndDate(lastDay);
    } else if (preset === 'last_3_months') {
      const firstDay = new Date(y, m - 2, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, m + 1, 0).toISOString().split('T')[0];
      setTempStartDate(firstDay);
      setTempEndDate(lastDay);
    }
  };

  // Print Statement via reliable multi-fallback print handler
  const handlePrintStatement = () => {
    try {
      if (!statementRef.current) {
        window.print();
        return;
      }
      showToast(lang === 'ar' ? 'جاري فتح نافذة الطباعة...' : 'Opening print dialog...');
      const entityName = entity.name || 'كشف_حساب';
      const dateStr = new Date().toISOString().split('T')[0];

      const printed = printHtmlContent(statementRef.current.outerHTML, {
        title: `كشف حساب - ${entityName} - ${dateStr}`,
        isRTL,
        lang,
        onError: () => {
          handleExportStatementPDF();
        },
      });

      if (!printed) {
        handleExportStatementPDF();
      }
    } catch (err) {
      console.warn('Direct print error, fallback to PDF:', err);
      handleExportStatementPDF();
    }
  };

  // Export Statement as PDF
  const handleExportStatementPDF = async () => {
    if (!statementRef.current) {
      handlePrintStatement();
      return;
    }
    try {
      setIsExportingPDF(true);
      showToast(lang === 'ar' ? 'جاري إنشاء ملف PDF لكشف الحساب...' : 'Generating PDF statement...');
      const canvas = await html2canvas(statementRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 5000,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - margin * 2);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - margin * 2);
      }

      const cleanName = (entity.name || 'Statement').replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`كشف_حساب_${cleanName}_${dateStr}.pdf`);
      showToast(lang === 'ar' ? 'تم تصدير كشف الحساب بصيغة PDF بنجاح' : 'PDF Statement downloaded successfully');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast(lang === 'ar' ? 'تعذر إنشاء ملف PDF، سيتم فتح نافذة الطباعة المباشرة' : 'Falling back to print dialog...');
      handlePrintStatement();
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Export Statement as Image
  const handleExportStatementImage = async () => {
    if (!statementRef.current) return;
    try {
      setIsExportingImage(true);
      showToast(lang === 'ar' ? 'جاري تجهيز صورة كشف الحساب...' : 'Generating statement image...');
      const canvas = await html2canvas(statementRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 5000,
      });

      const cleanName = (entity.name || 'Statement').replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const image = canvas.toDataURL('image/png');

      // If Web Share API is available with image attachment
      if (navigator.share) {
        try {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], `كشف_حساب_${cleanName}.png`, { type: 'image/png' })] })) {
            const file = new File([blob], `كشف_حساب_${cleanName}.png`, { type: 'image/png' });
            await navigator.share({
              title: `كشف حساب - ${entity.name}`,
              text: `كشف حساب ${entity.name} - ${settings?.office_name || ''}`,
              files: [file],
            });
            showToast(lang === 'ar' ? 'تمت مشاركة صورة كشف الحساب بنجاح' : 'Shared statement successfully');
            return;
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      // Direct download fallback
      const link = document.createElement('a');
      link.href = image;
      link.download = `كشف_حساب_${cleanName}_${dateStr}.png`;
      link.click();
      showToast(lang === 'ar' ? 'تم تنزيل كشف الحساب كصورة بنجاح' : 'Statement image downloaded successfully');
    } catch (err: any) {
      console.error('Image export error:', err);
      showToast(lang === 'ar' ? 'تعذر حفظ كشف الحساب كصورة' : 'Failed to export image');
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || formData.amount <= 0) return;

    await createTransaction({
      entity_type: entityType,
      entity_id: entity.id,
      kind: formData.kind,
      description: formData.description,
      amount: Number(formData.amount),
      currency: formData.currency,
      date: new Date(formData.date).toISOString(),
    });

    setIsAddOpen(false);
    setFormData({
      kind: entityType === 'client' ? 'receipt' : 'disbursement',
      description: '',
      amount: 1000,
      currency: defaultEntityCurrency,
      date: new Date().toISOString().split('T')[0],
    });
    await loadData();
    showToast(lang === 'ar' ? 'تمت إضافة الحركة المالية بنجاح' : 'Transaction added successfully');
  };

  // Start Editing Transaction
  const handleStartEdit = (txn: Transaction) => {
    setEditingTxn(txn);
    setEditFormData({
      kind: txn.kind,
      description: txn.description || '',
      amount: Number(txn.amount) || 0,
      currency: txn.currency || defaultEntityCurrency,
      date: txn.date ? txn.date.split('T')[0] : new Date().toISOString().split('T')[0],
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxn || !editFormData.description.trim() || editFormData.amount <= 0) return;

    await updateTransaction(editingTxn.id, {
      kind: editFormData.kind,
      description: editFormData.description,
      amount: Number(editFormData.amount),
      currency: editFormData.currency,
      date: new Date(editFormData.date).toISOString(),
    });

    setEditingTxn(null);
    showToast(lang === 'ar' ? 'تم تعديل بيانات السند بنجاح' : 'Voucher updated successfully');
    await loadData();
  };

  const handleDelete = async (tid: string) => {
    if (!confirm(t('delete_prompt'))) return;
    await deleteTransaction(tid);
    showToast(lang === 'ar' ? 'تم حذف السند بنجاح' : 'Voucher deleted');
    await loadData();
  };

  const handleArchive = async (tid: string) => {
    await archiveTransaction(tid, true);
    showToast(lang === 'ar' ? 'تمت أرشفة السند بنجاح' : 'Voucher archived');
    await loadData();
  };

  // Open voucher modal
  const handleOpenVoucher = (txn: Transaction) => {
    setSelectedVoucherTxn(txn);
    setIsVoucherModalOpen(true);
  };

  // Direct Share
  const handleDirectShare = async (txn: Transaction) => {
    const isReceipt = txn.kind === 'receipt';
    const isDisb = txn.kind === 'disbursement';
    const title = isReceipt
      ? 'سند قبض مالي'
      : isDisb
      ? 'سند صرف مالي'
      : 'إشعار استحقاق مالي';
    const serialNo = `SN-${txn.id.substring(txn.id.length - 6).toUpperCase()}`;
    const formattedDate = txn.date ? txn.date.split('T')[0] : '';
    const curInfo = getCurrencyInfo(txn.currency || defaultEntityCurrency, availableCurrencies);
    const shareText = `📄 ${title}\nرقم السند: #${serialNo}\nالتاريخ: ${formattedDate}\nالطرف: ${entity.name}\nالمبلغ: ${Number(txn.amount).toLocaleString()} ${curInfo.symbol}\nالبيان: ${txn.description}\n${settings?.office_name || ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
        });
        showToast(lang === 'ar' ? 'تمت المشاركة بنجاح' : 'Shared successfully');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      showToast(t('voucher_copied'));
    } catch {
      showToast(shareText);
    }
  };

  const isClient = entityType === 'client';
  const clientObj = isClient ? (entity as Client) : null;
  const employeeObj = !isClient ? (entity as Employee) : null;

  // Filtered transactions by date range, instant keyword search, and transaction kind
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((txn) => {
      if (txn.date) {
        const txnDateStr = txn.date.split('T')[0];
        if (startDate && txnDateStr < startDate) return false;
        if (endDate && txnDateStr > endDate) return false;
      }
      if (kindFilter !== 'all' && txn.kind !== kindFilter) {
        return false;
      }
      if (q) {
        const desc = (txn.description || '').toLowerCase();
        const sn = `sn-${txn.id.substring(txn.id.length - 6)}`.toLowerCase();
        const shortId = txn.id.toLowerCase();
        const amt = String(txn.amount);
        if (!desc.includes(q) && !sn.includes(q) && !shortId.includes(q) && !amt.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, startDate, endDate, kindFilter, searchQuery]);

  // Group transactions by currency with pre-calculated running balance
  const currencyGroups = useMemo(() => {
    const map = new Map<string, Transaction[]>();

    // Always ensure the client's/employee's default currency group is present if configured
    const primaryCurrency = defaultEntityCurrency;
    map.set(primaryCurrency, []);

    filteredTransactions.forEach((txn) => {
      const cur = txn.currency || primaryCurrency;
      if (!map.has(cur)) {
        map.set(cur, []);
      }
      map.get(cur)!.push(txn);
    });

    const result: {
      currencyCode: string;
      currencyInfo: ReturnType<typeof getCurrencyInfo>;
      txns: (Transaction & { runningBalance: number })[];
      totalCharges: number;
      totalPaid: number;
      balance: number;
    }[] = [];

    map.forEach((txns, curCode) => {
      if (txns.length === 0 && map.size > 1 && curCode !== primaryCurrency) {
        return;
      }
      // Sort oldest first (نزول من التاريخ الأقدم إلى الأحدث)
      txns.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const curInfo = getCurrencyInfo(curCode, availableCurrencies);
      
      let running = 0;
      let totalCharges = 0;
      let totalPaid = 0;

      const enhancedTxns = txns.map((t) => {
        const amt = Number(t.amount || 0);
        if (t.kind === 'charge') {
          totalCharges += amt;
          running += amt;
        } else {
          totalPaid += amt;
          running -= amt;
        }
        return {
          ...t,
          runningBalance: running,
        };
      });

      // Balance calculation:
      // For Client: charges (due) - paid = balance owed to office
      // For Employee: charges (salary/bonuses) - paid (disbursements) = balance owed to employee
      const balance = totalCharges - totalPaid;

      result.push({
        currencyCode: curCode,
        currencyInfo: curInfo,
        txns: enhancedTxns,
        totalCharges,
        totalPaid,
        balance,
      });
    });

    return result;
  }, [filteredTransactions, defaultEntityCurrency, availableCurrencies]);

  // Distinct currencies list for tab filtering
  const distinctCurrencies = currencyGroups.map((g) => g.currencyCode);

  // Filtered currency groups depending on selected tab
  const displayedGroups =
    selectedCurrencyTab === 'ALL'
      ? currencyGroups
      : currencyGroups.filter((g) => g.currencyCode === selectedCurrencyTab);

  // Default entity currency info
  const defaultCurrencyInfo = getCurrencyInfo(defaultEntityCurrency, availableCurrencies);

  return (
    <div className="space-y-6">
      {/* Top Bar with Back & Actions (Hidden in Print) */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <ArrowRight className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
            <span>{t('back')}</span>
          </button>

          {/* Active Date Range Filter Badge */}
          {(startDate || endDate) && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-semibold shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                {lang === 'ar'
                  ? `الفترة: ${startDate ? `من ${startDate}` : ''} ${endDate ? `إلى ${endDate}` : ''}`
                  : `Period: ${startDate ? `from ${startDate}` : ''} ${endDate ? `to ${endDate}` : ''}`}
              </span>
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setDateFilterPreset('all');
                  showToast(lang === 'ar' ? 'تم إلغاء تصفية الفترة' : 'Date filter cleared');
                }}
                className="ms-1 p-0.5 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-700 dark:text-amber-300"
                title={lang === 'ar' ? 'إلغاء التصفية' : 'Clear filter'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Currency Filter Tabs */}
          {distinctCurrencies.length > 1 && (
            <div className="flex items-center gap-1 bg-white dark:bg-[#1A1F1C] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <button
                onClick={() => setSelectedCurrencyTab('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  selectedCurrencyTab === 'ALL'
                    ? 'bg-[#1F4A38] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {lang === 'ar' ? 'كل العملات' : 'All Currencies'}
              </button>
              {distinctCurrencies.map((code) => {
                const info = getCurrencyInfo(code, availableCurrencies);
                return (
                  <button
                    key={code}
                    onClick={() => setSelectedCurrencyTab(code)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                      selectedCurrencyTab === code
                        ? 'bg-[#1F4A38] text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {info.symbol} ({info.name_ar})
                  </button>
                );
              })}
            </div>
          )}

          {/* Statement Print Button with 3-Dots Dropdown */}
          <div className="relative inline-flex items-center rounded-xl shadow-xs" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handlePrintStatement}
              className="px-3.5 py-2 rounded-s-xl border border-e-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A1F1C] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              id="btn-print-statement"
              title={lang === 'ar' ? 'طباعة كشف الحساب مباشرة' : 'Direct Print'}
            >
              <Printer className="w-4 h-4 text-[#1F4A38] dark:text-[#4A7862]" />
              <span>{lang === 'ar' ? 'طباعة كشف الحساب' : 'Print Statement'}</span>
            </button>
            
            <button
              onClick={() => setIsStatementMenuOpen(!isStatementMenuOpen)}
              className="px-2.5 py-2 rounded-e-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A1F1C] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
              id="btn-statement-menu"
              title={lang === 'ar' ? 'خيارات كشف الحساب (PDF، صورة، تحديد الفترة)' : 'Statement Options'}
            >
              <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>

            {/* 3-Dots Dropdown Menu */}
            {isStatementMenuOpen && (
              <div className="absolute top-full end-0 mt-1.5 w-64 bg-white dark:bg-[#1A1F1C] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-40 text-xs divide-y divide-slate-100 dark:divide-slate-800/80 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400">
                  {lang === 'ar' ? 'خيارات طباعة وتصدير الكشف' : 'Statement Export & Filter'}
                </div>

                <div className="py-1">
                  {/* 1. PDF Direct Print / View */}
                  <button
                    onClick={() => {
                      setIsStatementMenuOpen(false);
                      handlePrintStatement();
                    }}
                    className="w-full px-3.5 py-2.5 text-start flex items-center gap-2.5 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors font-semibold"
                  >
                    <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="font-bold">{lang === 'ar' ? 'طباعة كشف الحساب (طابعة / PDF)' : 'Direct Print / PDF'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{lang === 'ar' ? 'فتح نافذة الطباعة المباشرة' : 'Open system print dialog'}</div>
                    </div>
                  </button>

                  {/* 2. PDF Download */}
                  <button
                    onClick={() => {
                      setIsStatementMenuOpen(false);
                      handleExportStatementPDF();
                    }}
                    disabled={isExportingPDF}
                    className="w-full px-3.5 py-2.5 text-start flex items-center gap-2.5 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors font-semibold disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <div className="font-bold">{lang === 'ar' ? 'تنزيل كشف الحساب PDF' : 'Download PDF Statement'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{lang === 'ar' ? 'حفظ ملف PDF عالي الجودة' : 'Export high-res PDF file'}</div>
                    </div>
                  </button>

                  {/* 3. Image Download & Share */}
                  <button
                    onClick={() => {
                      setIsStatementMenuOpen(false);
                      handleExportStatementImage();
                    }}
                    disabled={isExportingImage}
                    className="w-full px-3.5 py-2.5 text-start flex items-center gap-2.5 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors font-semibold disabled:opacity-50"
                  >
                    <ImageIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <div>
                      <div className="font-bold">{lang === 'ar' ? 'طباعة ومشاركة كصورة' : 'Export as Image (PNG)'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{lang === 'ar' ? 'حفظ أو مشاركة عبر واتساب وغيرها' : 'Save or share statement image'}</div>
                    </div>
                  </button>
                </div>

                {/* 4. Date Range Filter */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsStatementMenuOpen(false);
                      setTempStartDate(startDate);
                      setTempEndDate(endDate);
                      setIsDateFilterModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 text-start flex items-center gap-2.5 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors font-semibold"
                  >
                    <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{lang === 'ar' ? 'تحديد الفترة' : 'Date Range Filter'}</span>
                        {(startDate || endDate) && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {startDate || endDate
                          ? (lang === 'ar' ? `مفعل: ${startDate || 'البداية'} إلى ${endDate || 'الآن'}` : `Active: ${startDate} to ${endDate}`)
                          : (lang === 'ar' ? 'تصفية الحركات حسب فترة زمنية' : 'Filter ledger by date range')}
                      </div>
                    </div>
                  </button>

                  {(startDate || endDate) && (
                    <button
                      onClick={() => {
                        setIsStatementMenuOpen(false);
                        setStartDate('');
                        setEndDate('');
                        setDateFilterPreset('all');
                        showToast(lang === 'ar' ? 'تم إلغاء تصفية الفترة وعرض كافة الحركات' : 'Filter reset to all dates');
                      }}
                      className="w-full px-3.5 py-2 text-start flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-[11px] font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'إلغاء التصفية (عرض الكل)' : 'Reset Date Filter'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setFormData({
                kind: entityType === 'client' ? 'receipt' : 'disbursement',
                description: '',
                amount: 1000,
                currency: defaultEntityCurrency,
                date: new Date().toISOString().split('T')[0],
              });
              setIsAddOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#1F4A38] dark:bg-[#4A7862] text-white text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-xs"
            id="btn-add-txn"
          >
            <Plus className="w-4 h-4" />
            <span>{t('add_transaction')}</span>
          </button>
        </div>
      </div>

      {/* Official Printable Statement Container */}
      <div
        ref={statementRef}
        className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-8 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0"
      >
        {/* Print Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.office_name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-contain bg-white p-1 border border-slate-200 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-[#1F4A38] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-xs">
                  <Building className="w-6 h-6" />
                </div>
              )}
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  {settings?.office_name || 'مكتب الأمانة للخدمات'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {settings?.address} • {t('phone_label')}: {settings?.phone}
                </p>
              </div>
            </div>

            <div className="text-start sm:text-end">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#1F4A38] dark:text-[#4A7862] text-xs font-bold">
                {t('account_statement')}
              </span>
              <p className="text-xs text-slate-400 mt-1">
                {t('issue_date')}: {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
              </p>
              {(startDate || endDate) ? (
                <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                  {lang === 'ar'
                    ? `الفترة: ${startDate ? `من ${startDate}` : ''} ${endDate ? `إلى ${endDate}` : ''}`
                    : `Period: ${startDate ? `from ${startDate}` : ''} ${endDate ? `to ${endDate}` : ''}`}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {lang === 'ar' ? 'الفترة: كافة الحركات المسجلة' : 'Period: All recorded transactions'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Entity Details Card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 bg-slate-50 dark:bg-[#0F1210] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs text-slate-400 font-medium block">
              {isClient ? t('client_name') : t('employee_name')}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {entity.name}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 font-medium block">
              {t('phone')}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100" dir="ltr">
              {entity.phone || '—'}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 font-medium block">
              {isClient ? t('service_type') : t('role')}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 mt-0.5">
              {(isClient ? clientObj?.service_type : employeeObj?.role) === 'security' ? (
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              )}
              {(isClient ? clientObj?.service_type : employeeObj?.role) === 'security'
                ? t('security_short')
                : t('cleaning_short')}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 font-medium block">
              {isClient ? t('contract_amount') : t('salary')}
            </span>
            <span className="text-sm font-bold text-[#1F4A38] dark:text-[#4A7862]">
              {Number(isClient ? clientObj?.contract_amount : employeeObj?.salary).toLocaleString()} {defaultCurrencyInfo.symbol}
            </span>
          </div>
        </div>

        {/* Instant Search & Transaction Filter Bar (Hidden in Print) */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#151916] border border-slate-200 dark:border-slate-800/80 shadow-2xs space-y-3 no-print">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'بحث سريع في الحركات بالبيان، رقم السند، أو المبلغ...'
                    : 'Instant search by description, voucher #, or amount...'
                }
                className="w-full ps-9 pe-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F4A38]/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Kind Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              <button
                type="button"
                onClick={() => setKindFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  kindFilter === 'all'
                    ? 'bg-[#1F4A38] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {lang === 'ar' ? 'كافة الحركات' : 'All Types'} ({transactions.length})
              </button>

              <button
                type="button"
                onClick={() => setKindFilter('charge')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  kindFilter === 'charge'
                    ? 'bg-[#1F4A38] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t('charge')}
              </button>

              {isClient && (
                <button
                  type="button"
                  onClick={() => setKindFilter('receipt')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                    kindFilter === 'receipt'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  {t('receipt_voucher')}
                </button>
              )}

              {!isClient && (
                <button
                  type="button"
                  onClick={() => setKindFilter('disbursement')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                    kindFilter === 'disbursement'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-100'
                  }`}
                >
                  {t('disbursement_voucher')}
                </button>
              )}
            </div>
          </div>

          {/* Search Result Counter Indicator */}
          {(searchQuery || kindFilter !== 'all' || startDate || endDate) && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <span>
                {lang === 'ar'
                  ? `نتائج البحث والتصفية: تم العثور على ${filteredTransactions.length} حركة`
                  : `Filtered results: found ${filteredTransactions.length} transactions`}
              </span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setKindFilter('all');
                  setStartDate('');
                  setEndDate('');
                  setDateFilterPreset('all');
                }}
                className="text-red-600 dark:text-red-400 hover:underline font-semibold"
              >
                {lang === 'ar' ? 'إعادة ضبط كافة الفلاتر' : 'Reset all filters'}
              </button>
            </div>
          )}
        </div>

        {/* Multi-Currency Notice Banner if more than one currency */}
        {currencyGroups.length > 1 && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs">
            <Coins className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {lang === 'ar'
                ? 'يحتوي كشف الحساب على حركات مالية بعملات متعددة. يتم فصل كل عملة في جدول مستقل مع كشف رصيدها الخاص طبقاً للمعايير المحاسبية.'
                : 'This account statement contains multiple currencies. Each currency is presented in a separate ledger table with its own running balance.'}
            </span>
          </div>
        )}

        {/* Currency Group Sections - Separate Tables per Currency */}
        <div className="space-y-8">
          {displayedGroups.map((group, groupIdx) => {
            const { currencyCode, currencyInfo, txns, totalCharges, totalPaid, balance } = group;

            // Pagination calculation for fast responsive UI without DOM freezing
            const totalRows = txns.length;
            const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1;
            const validPage = Math.min(Math.max(1, currentPage), totalPages);
            const startIdx = pageSize > 0 ? (validPage - 1) * pageSize : 0;
            const endIdx = pageSize > 0 ? Math.min(startIdx + pageSize, totalRows) : totalRows;
            const paginatedTxns = pageSize > 0 ? txns.slice(startIdx, endIdx) : txns;

            return (
              <div
                key={currencyCode}
                className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#151916] overflow-hidden shadow-2xs"
              >
                {/* Currency Table Header with KPI Badges */}
                <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-[#181D1A] border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-[#1F4A38] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      {currencyInfo.symbol}
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{lang === 'ar' ? `جدول كشف الحساب - عملة (${currencyInfo.name_ar})` : `Ledger Table - (${currencyInfo.name_en})`}</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
                          {currencyCode}
                        </span>
                      </h3>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {txns.length} {lang === 'ar' ? 'حركات وسندات مسجلة' : 'recorded transactions'}
                      </span>
                    </div>
                  </div>

                  {/* Summary Totals for this currency */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs">
                    <div className="px-3 py-2 rounded-xl bg-white dark:bg-[#111412] border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {t('total_due')}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">
                        {totalCharges.toLocaleString()} {currencyInfo.symbol}
                      </span>
                    </div>

                    <div className="px-3 py-2 rounded-xl bg-white dark:bg-[#111412] border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {t('total_paid')}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {totalPaid.toLocaleString()} {currencyInfo.symbol}
                      </span>
                    </div>

                    <div
                      className={`px-3 py-2 rounded-xl border ${
                        balance > 0
                          ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                          : balance < 0
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      <span className="text-[10px] opacity-80 block font-medium">
                        {t('current_balance')}
                      </span>
                      <span className="font-bold font-mono">
                        {Math.abs(balance).toLocaleString()} {currencyInfo.symbol}
                        <span className="text-[10px] ms-1">
                          {balance > 0
                            ? isClient
                              ? `(${lang === 'ar' ? 'مستحق للمكتب' : 'Due to office'})`
                              : `(${lang === 'ar' ? 'مستحق للموظف' : 'Due to employee'})`
                            : balance < 0
                            ? `(${lang === 'ar' ? 'دائن' : 'Credit'})`
                            : `(${lang === 'ar' ? 'خالص' : 'Zero'})`}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transactions Table for this Currency */}
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50/40 dark:bg-[#121614]">
                        <th className="py-2.5 px-3 text-start font-semibold">#</th>
                        <th className="py-2.5 px-3 text-start font-semibold">{t('date')}</th>
                        <th className="py-2.5 px-3 text-start font-semibold">{t('txn_kind')}</th>
                        <th className="py-2.5 px-3 text-start font-semibold">{t('description')}</th>
                        <th className="py-2.5 px-3 text-start font-semibold">
                          {t('amount')} ({currencyInfo.symbol})
                        </th>
                        <th className="py-2.5 px-3 text-start font-semibold">
                          {lang === 'ar' ? 'الرصيد التراكمي' : 'Running Balance'} ({currencyInfo.symbol})
                        </th>
                        <th className="py-2.5 px-3 text-end font-semibold no-print">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            {t('loading')}
                          </td>
                        </tr>
                      ) : txns.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            {lang === 'ar' ? 'لا توجد حركات مسجلة بهذه العملة حتى الآن' : 'No transactions recorded in this currency'}
                          </td>
                        </tr>
                      ) : (
                        paginatedTxns.map((txn, index) => {
                          const isCharge = txn.kind === 'charge';
                          const isReceipt = txn.kind === 'receipt';
                          const rowIndex = startIdx + index + 1;
                          const rowBal = txn.runningBalance;

                          return (
                            <tr
                              key={txn.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="py-3 px-3 font-mono text-slate-400">{rowIndex}</td>
                              <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {txn.date ? txn.date.split('T')[0] : '—'}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                    isCharge
                                      ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                      : isReceipt
                                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                  }`}
                                >
                                  {isCharge
                                    ? t('charge')
                                    : isReceipt
                                    ? t('receipt_voucher')
                                    : t('disbursement_voucher')}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200 max-w-xs">
                                {txn.description}
                              </td>
                              <td className="py-3 px-3 font-bold whitespace-nowrap">
                                <span
                                  className={
                                    isCharge
                                      ? 'text-slate-900 dark:text-slate-100'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }
                                >
                                  {Number(txn.amount).toLocaleString()} {currencyInfo.symbol}
                                </span>
                              </td>
                              {/* Running Balance Column */}
                              <td className="py-3 px-3 font-bold font-mono whitespace-nowrap">
                                <span
                                  className={
                                    rowBal > 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : rowBal < 0
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }
                                >
                                  {Math.abs(rowBal).toLocaleString()} {currencyInfo.symbol}
                                  <span className="text-[10px] font-sans font-normal opacity-75 ms-1">
                                    {rowBal > 0 ? (isClient ? 'مستحق' : 'له') : rowBal < 0 ? 'له' : 'خالص'}
                                  </span>
                                </span>
                              </td>
                              <td className="py-3 px-3 text-end whitespace-nowrap no-print">
                                <div className="relative inline-block text-start">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuTxnId(activeMenuTxnId === txn.id ? null : txn.id);
                                    }}
                                    className={`p-1.5 rounded-xl border transition-all ${
                                      activeMenuTxnId === txn.id
                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-[#1F4A38] dark:text-emerald-300'
                                        : 'bg-white dark:bg-[#141815] border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                    title={t('voucher_actions')}
                                    id={`btn-actions-${txn.id}`}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {/* 3-Dots Dropdown Menu */}
                                  {activeMenuTxnId === txn.id && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className={`absolute ${
                                        index >= paginatedTxns.length - 2 && index > 1 ? 'bottom-full mb-1' : 'top-full mt-1'
                                      } ${
                                        isRTL ? 'left-0' : 'right-0'
                                      } z-50 w-56 bg-white dark:bg-[#1A1F1C] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 text-xs divide-y divide-slate-100 dark:divide-slate-800`}
                                    >
                                      {/* Voucher ID header */}
                                      <div className="px-3.5 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
                                        <span>{t('voucher_no')}</span>
                                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                          #{txn.id.substring(txn.id.length - 6).toUpperCase()}
                                        </span>
                                      </div>

                                      {/* Printing & Preview Actions */}
                                      <div className="py-1">
                                        <button
                                          onClick={() => {
                                            setActiveMenuTxnId(null);
                                            handleOpenVoucher(txn);
                                          }}
                                          className="w-full px-3.5 py-2 text-start flex items-center gap-2.5 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors font-semibold"
                                        >
                                          <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                          <span>{t('print_voucher_pdf')}</span>
                                        </button>

                                        <button
                                          onClick={() => {
                                            setActiveMenuTxnId(null);
                                            handleOpenVoucher(txn);
                                          }}
                                          className="w-full px-3.5 py-2 text-start flex items-center gap-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                                        >
                                          <ImageIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                          <span>{t('print_voucher_image')}</span>
                                        </button>

                                        <button
                                          onClick={() => {
                                            setActiveMenuTxnId(null);
                                            handleDirectShare(txn);
                                          }}
                                          className="w-full px-3.5 py-2 text-start flex items-center gap-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                                        >
                                          <Share2 className="w-4 h-4 text-[#1F4A38] dark:text-emerald-400" />
                                          <span>{t('share_voucher')}</span>
                                        </button>
                                      </div>

                                      {/* Modification & Archive Actions */}
                                      <div className="py-1">
                                        <button
                                          onClick={() => {
                                            setActiveMenuTxnId(null);
                                            handleStartEdit(txn);
                                          }}
                                          className="w-full px-3.5 py-2 text-start flex items-center gap-2.5 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors font-semibold"
                                        >
                                          <Edit className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                          <span>{t('edit_voucher')}</span>
                                        </button>

                                        <button
                                          onClick={() => {
                                            setActiveMenuTxnId(null);
                                            handleArchive(txn.id);
                                          }}
                                          className="w-full px-3.5 py-2 text-start flex items-center gap-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                                        >
                                          <Archive className="w-4 h-4 text-amber-500" />
                                          <span>{t('archive_voucher')}</span>
                                        </button>
                                      </div>

                                      {/* Deletion */}
                                      <div className="pt-1">
                                        <button
                                          onClick={() => {
                                            setActiveMenuTxnId(null);
                                            handleDelete(txn.id);
                                          }}
                                          className="w-full px-3.5 py-2 text-start flex items-center gap-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors font-semibold"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span>{t('delete_voucher')}</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* High Performance Table Pagination Bar (Hidden in Print) */}
                {totalRows > 0 && (
                  <div className="p-3 bg-slate-50/80 dark:bg-[#181D1A] border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs no-print">
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                      <span>
                        {lang === 'ar'
                          ? `عرض ${totalRows > 0 ? startIdx + 1 : 0} - ${endIdx} من إجمالي ${totalRows} حركة`
                          : `Showing ${totalRows > 0 ? startIdx + 1 : 0} - ${endIdx} of ${totalRows} items`}
                      </span>

                      {/* Page Size Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">{lang === 'ar' ? 'لكل صفحة:' : 'Per page:'}</span>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121614] text-xs font-semibold text-slate-700 dark:text-slate-200"
                        >
                          <option value={25}>25</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={250}>250</option>
                          <option value={0}>{lang === 'ar' ? 'الكل' : 'All'}</option>
                        </select>
                      </div>
                    </div>

                    {/* Pagination Page Controls */}
                    {pageSize > 0 && totalPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={validPage <= 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121614] text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous Page'}
                        >
                          <ChevronRight className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
                        </button>

                        <span className="px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 text-xs">
                          {validPage} / {totalPages}
                        </span>

                        <button
                          type="button"
                          disabled={validPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121614] text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title={lang === 'ar' ? 'الصفحة التالية' : 'Next Page'}
                        >
                          <ChevronLeft className={`w-4 h-4 ${isRTL ? '' : 'rotate-180'}`} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Signatures & Official Stamp block for official print & export output */}
        <div className="pt-8 mt-6 border-t-2 border-slate-200 grid grid-cols-3 gap-3 items-end text-center text-xs">
          {/* Column 1: Accountant / المسؤول (Right side in RTL) */}
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
                  <Shield className="w-5 h-5 mb-0.5 text-[#1F4A38]" />
                  <span className="text-[9px] font-black leading-tight max-w-[65px] truncate">
                    {settings?.office_name ? settings.office_name.split(' ')[0] + ' ' + (settings.office_name.split(' ')[1] || '') : 'مكتب الأمانة'}
                  </span>
                  <span className="text-[7px] text-slate-500 font-bold">{t('official_stamp')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Client / Recipient (Left side in RTL) */}
          <div className="flex flex-col items-center justify-end min-h-[75px]">
            <span className="block font-bold text-slate-700 mb-1">
              {isClient ? t('signature_party') : t('recipient')}
            </span>
            <div className="h-6" />
            <div className="w-full border-t border-dashed border-slate-400 pt-0.5 text-[10px] text-slate-500">
              التوقيع: .....................
            </div>
          </div>
        </div>

        {/* Statement Footer Note with Timestamp */}
        <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-mono">
          <span>تم استخراج كشف الحساب آلياً عبر نظام إدارة الخدمات</span>
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

      {/* Add Transaction Modal with Currency Selection */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1F1C] rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
              {t('add_transaction')} ({entity.name})
            </h3>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('txn_kind')}
                </label>
                <select
                  value={formData.kind}
                  onChange={(e) => setFormData({ ...formData, kind: e.target.value as TxnKind })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option value="charge">{t('charge')}</option>
                  {isClient && <option value="receipt">{t('receipt_voucher')}</option>}
                  {!isClient && <option value="disbursement">{t('disbursement_voucher')}</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('description')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="مثال: سداد دفعة اشتراك شهر / راتب شهر"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>

              {/* Amount and Currency Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'عملة السند' : 'Voucher Currency'}
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium"
                  >
                    {availableCurrencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name_ar} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('amount')} ({getCurrencyInfo(formData.currency, availableCurrencies).symbol})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('date')}
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1F4A38] dark:bg-[#4A7862] text-white text-xs font-semibold hover:opacity-90 shadow-xs"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal with Currency Selection */}
      {editingTxn && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1F1C] rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Edit className="w-4 h-4 text-amber-600" />
              <span>
                {t('edit_voucher')} (#{editingTxn.id.substring(editingTxn.id.length - 6).toUpperCase()})
              </span>
            </h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('txn_kind')}
                </label>
                <select
                  value={editFormData.kind}
                  onChange={(e) => setEditFormData({ ...editFormData, kind: e.target.value as TxnKind })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option value="charge">{t('charge')}</option>
                  {isClient && <option value="receipt">{t('receipt_voucher')}</option>}
                  {!isClient && <option value="disbursement">{t('disbursement_voucher')}</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('description')} *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="مثال: سداد دفعة اشتراك شهر / راتب شهر"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'عملة السند' : 'Voucher Currency'}
                  </label>
                  <select
                    value={editFormData.currency}
                    onChange={(e) => setEditFormData({ ...editFormData, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-medium"
                  >
                    {availableCurrencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name_ar} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('amount')} ({getCurrencyInfo(editFormData.currency, availableCurrencies).symbol})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('date')}
                </label>
                <input
                  type="date"
                  required
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTxn(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Date Range Filter Modal */}
      {isDateFilterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1F1C] rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {lang === 'ar' ? 'تحديد فترة كشف الحساب' : 'Select Statement Date Range'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'اختر فترة زمنية محددة لعرض الحركات المالية' : 'Filter transactions by date range'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDateFilterModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {lang === 'ar' ? 'فترات سريعة' : 'Quick Presets'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyDatePreset('all')}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    dateFilterPreset === 'all'
                      ? 'border-[#1F4A38] bg-[#1F4A38]/10 text-[#1F4A38] dark:border-[#4A7862] dark:bg-[#4A7862]/20 dark:text-[#4A7862]'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {lang === 'ar' ? 'كل الفترات' : 'All Time'}
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('this_month')}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    dateFilterPreset === 'this_month'
                      ? 'border-[#1F4A38] bg-[#1F4A38]/10 text-[#1F4A38] dark:border-[#4A7862] dark:bg-[#4A7862]/20 dark:text-[#4A7862]'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {lang === 'ar' ? 'هذا الشهر' : 'This Month'}
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('last_month')}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    dateFilterPreset === 'last_month'
                      ? 'border-[#1F4A38] bg-[#1F4A38]/10 text-[#1F4A38] dark:border-[#4A7862] dark:bg-[#4A7862]/20 dark:text-[#4A7862]'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {lang === 'ar' ? 'الشهر الماضي' : 'Last Month'}
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('last_3_months')}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    dateFilterPreset === 'last_3_months'
                      ? 'border-[#1F4A38] bg-[#1F4A38]/10 text-[#1F4A38] dark:border-[#4A7862] dark:bg-[#4A7862]/20 dark:text-[#4A7862]'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {lang === 'ar' ? 'آخر 3 أشهر' : 'Last 3 Months'}
                </button>
              </div>
            </div>

            {/* Custom Date Inputs */}
            <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'من تاريخ' : 'From Date'}
                </label>
                <input
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => {
                    setTempStartDate(e.target.value);
                    setDateFilterPreset('custom');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1F1C] text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'إلى تاريخ' : 'To Date'}
                </label>
                <input
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => {
                    setTempEndDate(e.target.value);
                    setDateFilterPreset('custom');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A1F1C] text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setTempStartDate('');
                  setTempEndDate('');
                  setDateFilterPreset('all');
                  setIsDateFilterModalOpen(false);
                  showToast(lang === 'ar' ? 'تم إلغاء التصفية وعرض كافة الحركات' : 'Date filter cleared');
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                {lang === 'ar' ? 'إلغاء التصفية' : 'Reset'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDateFilterModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate(tempStartDate);
                    setEndDate(tempEndDate);
                    setIsDateFilterModalOpen(false);
                    if (tempStartDate || tempEndDate) {
                      showToast(lang === 'ar' ? 'تم تطبيق تصفية الفترة بنجاح' : 'Date filter applied');
                    } else {
                      showToast(lang === 'ar' ? 'تم عرض كافة الحركات' : 'Showing all transactions');
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-[#1F4A38] dark:bg-[#4A7862] hover:opacity-90 text-white text-xs font-semibold shadow-xs"
                >
                  {lang === 'ar' ? 'تطبيق الفترة' : 'Apply Filter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Voucher Preview, PDF Print, PNG Image & Direct Share Modal */}
      <VoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        txn={selectedVoucherTxn}
        entity={entity}
        entityType={entityType}
        settings={settings}
        onEdit={(txn) => handleStartEdit(txn)}
      />

      {/* Feedback Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-[#1F4A38] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-fade-in no-print">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
