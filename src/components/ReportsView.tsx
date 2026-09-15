import React, { useState } from 'react';
import { DashboardData, Client, Employee, OfficeSettings } from '../types';
import { useI18n } from '../lib/i18n';
import { DEFAULT_CURRENCIES, getCurrencyInfo } from '../lib/currencies';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Sparkles,
  Shield,
  FileCheck,
  Building2,
  Calendar,
  Coins,
  Wallet,
  Users,
  Layers,
  ArrowUpRight,
  Receipt,
  Banknote,
  CheckCircle2,
} from 'lucide-react';

interface ReportsViewProps {
  dashboard: DashboardData | null;
  clients: Client[];
  employees: Employee[];
  settings: OfficeSettings | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  dashboard,
  clients,
  employees,
  settings,
}) => {
  const { t, lang } = useI18n();
  const availableCurrencies = settings?.currencies || DEFAULT_CURRENCIES;
  const defaultCurrency = settings?.currency || 'YER';

  const activeClients = clients.filter((c) => !c.archived);
  const activeEmployees = employees.filter((e) => !e.archived);

  // Group contracts and payroll by currency
  const contractsByCurrency: Record<string, { count: number; total: number; cleaningCount: number; cleaningTotal: number; securityCount: number; securityTotal: number; clients: Client[] }> = {};
  activeClients.forEach((c) => {
    const cur = c.currency || defaultCurrency;
    if (!contractsByCurrency[cur]) {
      contractsByCurrency[cur] = {
        count: 0,
        total: 0,
        cleaningCount: 0,
        cleaningTotal: 0,
        securityCount: 0,
        securityTotal: 0,
        clients: [],
      };
    }
    const amt = Number(c.contract_amount || 0);
    contractsByCurrency[cur].count += 1;
    contractsByCurrency[cur].total += amt;
    contractsByCurrency[cur].clients.push(c);

    if (c.service_type === 'cleaning') {
      contractsByCurrency[cur].cleaningCount += 1;
      contractsByCurrency[cur].cleaningTotal += amt;
    } else if (c.service_type === 'security') {
      contractsByCurrency[cur].securityCount += 1;
      contractsByCurrency[cur].securityTotal += amt;
    }
  });

  const payrollByCurrency: Record<string, { count: number; total: number; employees: Employee[] }> = {};
  activeEmployees.forEach((e) => {
    const cur = e.currency || defaultCurrency;
    if (!payrollByCurrency[cur]) {
      payrollByCurrency[cur] = { count: 0, total: 0, employees: [] };
    }
    const sal = Number(e.salary || 0);
    payrollByCurrency[cur].count += 1;
    payrollByCurrency[cur].total += sal;
    payrollByCurrency[cur].employees.push(e);
  });

  // All distinct currencies active in contracts or payroll
  const activeCurrencies = Array.from(
    new Set([...Object.keys(contractsByCurrency), ...Object.keys(payrollByCurrency)])
  );

  // Initial state: default currency if active, otherwise first active currency or 'ALL'
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    if (activeCurrencies.includes(defaultCurrency)) return defaultCurrency;
    if (activeCurrencies.length > 0) return activeCurrencies[0];
    return 'ALL';
  });

  if (!dashboard) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">{t('loading')}</div>;
  }

  const isAll = selectedCurrency === 'ALL';
  const curInfo = getCurrencyInfo(selectedCurrency, availableCurrencies);

  // Current selected currency data
  const selectedContracts = contractsByCurrency[selectedCurrency] || {
    count: 0,
    total: 0,
    cleaningCount: 0,
    cleaningTotal: 0,
    securityCount: 0,
    securityTotal: 0,
    clients: [],
  };

  const selectedPayroll = payrollByCurrency[selectedCurrency] || {
    count: 0,
    total: 0,
    employees: [],
  };

  const selectedNetMargin = selectedContracts.total - selectedPayroll.total;

  const selCleaningRev = selectedContracts.cleaningTotal;
  const selSecurityRev = selectedContracts.securityTotal;
  const selTotalRev = selCleaningRev + selSecurityRev || 1;
  const selCleaningPct = Math.round((selCleaningRev / selTotalRev) * 100);
  const selSecurityPct = Math.round((selSecurityRev / selTotalRev) * 100);

  const selectedMonthlyCollections = dashboard.monthly_by_currency?.[selectedCurrency] || 0;
  const selectedYearlyCollections = dashboard.yearly_by_currency?.[selectedCurrency] || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.office_name}
              className="w-12 h-12 rounded-xl object-contain bg-white dark:bg-[#252C28] p-1 border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t('reports_title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'تحليل الإيرادات والرواتب وتوزيع الخدمات حسب العملة المختارة' : 'Revenue, payroll, and service breakdown per selected currency'}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-end font-medium">
          <span className="font-bold text-slate-700 dark:text-slate-200">{settings?.office_name}</span>
          <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {t('issue_date')}: {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
          </span>
        </div>
      </div>

      {/* Currency Selector Bar */}
      <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#1F4A38] dark:text-[#4A7862]" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {lang === 'ar' ? 'تحديد عملة التقرير لعرض التفاصيل بدقة:' : 'Select Report Currency for Precise Breakdown:'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {activeCurrencies.map((code) => {
              const info = getCurrencyInfo(code, availableCurrencies);
              const isSelected = selectedCurrency === code;
              return (
                <button
                  key={code}
                  onClick={() => setSelectedCurrency(code)}
                  id={`btn-cur-report-${code}`}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#1F4A38] dark:bg-[#2B604A] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="px-1 py-0.2 rounded bg-white/20 text-[11px]">
                    {info.symbol}
                  </span>
                  <span>{info.name_ar}</span>
                  <span className="text-[10px] opacity-75 font-mono uppercase">
                    ({code})
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => setSelectedCurrency('ALL')}
              id="btn-cur-report-all"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isAll
                  ? 'bg-[#1F4A38] dark:bg-[#2B604A] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'عرض شامل لكل العملات' : 'All Currencies Overview'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SINGLE CURRENCY DETAILED VIEW */}
      {!isAll ? (
        <div className="space-y-6">
          {/* Active Selected Currency Summary Banner */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                {curInfo.symbol}
              </span>
              <span>
                {lang === 'ar'
                  ? `تفاصيل التقرير المالي لعملة: ${curInfo.name_ar} (${curInfo.code})`
                  : `Financial Report Details for: ${curInfo.name_en} (${curInfo.code})`}
              </span>
            </h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {selectedContracts.count} {lang === 'ar' ? 'عقود عملاء' : 'client contracts'} • {selectedPayroll.count} {lang === 'ar' ? 'موظفين' : 'employees'}
            </span>
          </div>

          {/* Key Metrics Grid for Selected Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Monthly Contracts Subscriptions */}
            <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {lang === 'ar' ? 'إجمالي الاشتراكات الشهرية' : 'Monthly Subscriptions'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
                  <FileCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {selectedContracts.total.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  {curInfo.symbol}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {selectedContracts.count} {lang === 'ar' ? 'عقد نشط بهذه العملة' : 'active contracts'}
              </p>
            </div>

            {/* Monthly Payroll */}
            <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {lang === 'ar' ? 'إجمالي رواتب الموظفين' : 'Monthly Payroll'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {selectedPayroll.total.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {curInfo.symbol}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {selectedPayroll.count} {lang === 'ar' ? 'موظف يتقاضى بهذه العملة' : 'staff on payroll'}
              </p>
            </div>

            {/* Net Operational Margin */}
            <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {t('operational_margin')}
                </span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    selectedNetMargin >= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span
                  className={`text-2xl font-bold ${
                    selectedNetMargin >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {selectedNetMargin >= 0 ? '+' : ''}
                  {selectedNetMargin.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {curInfo.symbol}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {lang === 'ar' ? 'الفارق بين الاشتراكات والرواتب' : 'Net Margin (Revenue - Payroll)'}
              </p>
            </div>

            {/* Monthly Collections Received */}
            <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {lang === 'ar' ? 'تحصيلات الشهر الجاري' : 'This Month Receipts'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {selectedMonthlyCollections.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                  {curInfo.symbol}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {lang === 'ar' ? 'سندات قبض محصلة هذا الشهر' : 'Cash collected this month'}
              </p>
            </div>
          </div>

          {/* Service Revenue Distribution for this specific currency */}
          <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#1F4A38] dark:text-[#4A7862]" />
                <span>
                  {lang === 'ar'
                    ? `توزيع الإيرادات حسب نوع الخدمة لعملة (${curInfo.name_ar})`
                    : `Service Revenue Distribution for (${curInfo.name_en})`}
                </span>
              </h4>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'الإجمالي:' : 'Total:'}{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  {selectedContracts.total.toLocaleString()} {curInfo.symbol}
                </strong>
              </span>
            </div>

            <div className="space-y-4">
              {/* Cleaning Service */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('cleaning')} ({selectedContracts.cleaningCount} {t('contracts_count')})
                  </span>
                  <span className="text-slate-900 dark:text-slate-100 font-mono">
                    {selCleaningRev.toLocaleString()} {curInfo.symbol} ({selCleaningPct}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all duration-500"
                    style={{ width: `${selCleaningPct}%` }}
                  />
                </div>
              </div>

              {/* Security Service */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <Shield className="w-3.5 h-3.5" />
                    {t('security')} ({selectedContracts.securityCount} {t('contracts_count')})
                  </span>
                  <span className="text-slate-900 dark:text-slate-100 font-mono">
                    {selSecurityRev.toLocaleString()} {curInfo.symbol} ({selSecurityPct}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1F4A38] dark:bg-[#4A7862] rounded-full transition-all duration-500"
                    style={{ width: `${selSecurityPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Yearly and Monthly Collections Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {lang === 'ar' ? 'تحصيلات الشهر الحالي الفعلية' : 'Current Month Actual Receipts'}
                </h4>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {selectedMonthlyCollections.toLocaleString()} {curInfo.symbol}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('month_collections_note')}
              </p>
            </div>

            <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {lang === 'ar' ? 'تحصيلات العام الحالي الفعلية' : 'Current Year Actual Receipts'}
                </h4>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {selectedYearlyCollections.toLocaleString()} {curInfo.symbol}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('year_collections_note')}
              </p>
            </div>
          </div>

          {/* Contracts List for this currency */}
          <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#1F4A38] dark:text-[#4A7862]" />
              <span>
                {lang === 'ar' ? `قائمة عقود العملاء بعملة (${curInfo.name_ar})` : `Client Contracts in (${curInfo.name_en})`}
              </span>
            </h4>
            {selectedContracts.clients.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">
                {lang === 'ar' ? 'لا توجد عقود مسجلة بهذه العملة' : 'No contracts in this currency'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="pb-2 text-start">#</th>
                      <th className="pb-2 text-start">{t('client_name')}</th>
                      <th className="pb-2 text-start">{t('service_type')}</th>
                      <th className="pb-2 text-start">{t('phone')}</th>
                      <th className="pb-2 text-end">{t('contract_amount')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedContracts.clients.map((c, i) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 text-slate-400">{i + 1}</td>
                        <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                          {c.name}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              c.service_type === 'security'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
                            }`}
                          >
                            {c.service_type === 'security' ? t('security') : t('cleaning')}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-500 dark:text-slate-400 font-mono">{c.phone}</td>
                        <td className="py-2.5 text-end font-bold text-slate-900 dark:text-slate-100 font-mono">
                          {Number(c.contract_amount).toLocaleString()} {curInfo.symbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Staff Payroll List for this currency */}
          <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>
                {lang === 'ar' ? `قائمة رواتب الموظفين بعملة (${curInfo.name_ar})` : `Staff Salaries in (${curInfo.name_en})`}
              </span>
            </h4>
            {selectedPayroll.employees.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">
                {lang === 'ar' ? 'لا يوجد موظفون مسجلون بهذه العملة' : 'No employees in this currency'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="pb-2 text-start">#</th>
                      <th className="pb-2 text-start">{t('employee_name')}</th>
                      <th className="pb-2 text-start">{t('role')}</th>
                      <th className="pb-2 text-start">{t('assignment')}</th>
                      <th className="pb-2 text-end">{t('salary')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedPayroll.employees.map((e, i) => (
                      <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 text-slate-400">{i + 1}</td>
                        <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                          {e.name}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              e.role === 'security'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
                            }`}
                          >
                            {e.role === 'security' ? t('security') : t('cleaning')}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-500 dark:text-slate-400">{e.assignment || '—'}</td>
                        <td className="py-2.5 text-end font-bold text-amber-600 dark:text-amber-400 font-mono">
                          {Number(e.salary).toLocaleString()} {curInfo.symbol}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ALL CURRENCIES OVERVIEW VIEW */
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#1F4A38] dark:text-[#4A7862]" />
              <span>{lang === 'ar' ? 'الموقف المالي المفصل لكل عملة' : 'Financial Breakdown by Currency'}</span>
            </h3>
            <span className="text-xs text-slate-400">
              {activeCurrencies.length} {lang === 'ar' ? 'عملات نشطة' : 'active currencies'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCurrencies.map((code) => {
              const info = getCurrencyInfo(code, availableCurrencies);
              const cData = contractsByCurrency[code] || {
                count: 0,
                total: 0,
                cleaningCount: 0,
                cleaningTotal: 0,
                securityCount: 0,
                securityTotal: 0,
                clients: [],
              };
              const pData = payrollByCurrency[code] || { count: 0, total: 0, employees: [] };
              const netMargin = cData.total - pData.total;
              const curMonthlyColl = dashboard.monthly_by_currency?.[code] || 0;
              const curYearlyColl = dashboard.yearly_by_currency?.[code] || 0;

              return (
                <div
                  key={code}
                  className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 hover:border-[#1F4A38] dark:hover:border-[#4A7862] transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center">
                        {info.symbol}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {info.name_ar}
                        </h4>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {info.code}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCurrency(code)}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#1F4A38] hover:text-white dark:hover:bg-[#2B604A] transition-colors flex items-center gap-1"
                    >
                      <span>{lang === 'ar' ? 'التفاصيل' : 'Details'}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t('client_monthly_rev')} ({cData.count})</span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {cData.total.toLocaleString()} {info.symbol}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t('staff_monthly_salaries')} ({pData.count})</span>
                      </span>
                      <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {pData.total.toLocaleString()} {info.symbol}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">{t('operational_margin')}</span>
                      <span
                        className={`font-bold font-mono ${
                          netMargin >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {netMargin >= 0 ? '+' : ''}
                        {netMargin.toLocaleString()} {info.symbol}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        <span className="text-slate-400 block">{lang === 'ar' ? 'تحصيل الشهر:' : 'This Month:'}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {curMonthlyColl.toLocaleString()} {info.symbol}
                        </span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                        <span className="text-slate-400 block">{lang === 'ar' ? 'تحصيل العام:' : 'This Year:'}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {curYearlyColl.toLocaleString()} {info.symbol}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

