import React, { useState } from 'react';
import { DashboardData, Client, OfficeSettings } from '../types';
import { useI18n } from '../lib/i18n';
import { DEFAULT_CURRENCIES, getCurrencyInfo } from '../lib/currencies';
import {
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Shield,
  Clock,
  ArrowUpRight,
  UserPlus,
  Building2,
  CalendarCheck,
  Coins,
  Layers,
} from 'lucide-react';

interface DashboardViewProps {
  data: DashboardData | null;
  settings: OfficeSettings | null;
  onRenewClient: (client: Client) => void;
  onViewStatement: (client: Client) => void;
  onNavigateTab: (tab: 'clients' | 'employees' | 'reports') => void;
  onAddClient: () => void;
  onAddEmployee: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  settings,
  onRenewClient,
  onViewStatement,
  onNavigateTab,
  onAddClient,
  onAddEmployee,
}) => {
  const { t, lang } = useI18n();
  const availableCurrencies = settings?.currencies || DEFAULT_CURRENCIES;
  const defaultCurrency = settings?.currency || 'YER';

  const activeCurrencies = data?.active_currencies && data.active_currencies.length > 0
    ? data.active_currencies
    : Object.keys(data?.subscriptions_by_currency || {});

  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    if (activeCurrencies.includes(defaultCurrency)) return defaultCurrency;
    if (activeCurrencies.length > 0) return activeCurrencies[0];
    return 'ALL';
  });

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        <Clock className="w-5 h-5 animate-spin mr-2" />
        <span>{t('loading')}</span>
      </div>
    );
  }

  const isAll = selectedCurrency === 'ALL';
  const curInfo = getCurrencyInfo(selectedCurrency, availableCurrencies);

  // Compute metrics based on selected currency
  const totalContractsCount = isAll
    ? data.total_contracts
    : (data.contracts_count_by_currency?.[selectedCurrency] || 0);

  const totalSubscriptionsValue = isAll
    ? data.total_subscriptions
    : (data.subscriptions_by_currency?.[selectedCurrency] || 0);

  const monthlyCollectionsValue = isAll
    ? data.monthly_revenue
    : (data.monthly_by_currency?.[selectedCurrency] || 0);

  const yearlyCollectionsValue = isAll
    ? data.yearly_revenue
    : (data.yearly_by_currency?.[selectedCurrency] || 0);

  const cleaningData = isAll
    ? data.cleaning
    : (data.cleaning_by_currency?.[selectedCurrency] || { count: 0, revenue: 0 });

  const securityData = isAll
    ? data.security
    : (data.security_by_currency?.[selectedCurrency] || { count: 0, revenue: 0 });

  const serviceTotal = cleaningData.revenue + securityData.revenue || 1;
  const cleaningPercent = Math.round((cleaningData.revenue / serviceTotal) * 100);
  const securityPercent = Math.round((securityData.revenue / serviceTotal) * 100);

  // Filter expiring contracts if specific currency selected
  const filteredExpiring = isAll
    ? data.expiring
    : data.expiring.filter((c) => (c.currency || defaultCurrency) === selectedCurrency);

  const getDaysLeft = (dateStr: string) => {
    try {
      const end = new Date(dateStr);
      const diff = end.getTime() - new Date().getTime();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-l from-[#1F4A38] to-[#2B604A] dark:from-[#12281E] dark:to-[#1F4A38] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 text-emerald-100 mb-2">
            <Building2 className="w-3.5 h-3.5" />
            {settings?.office_name || 'مكتب الأمانة للخدمات'}
          </span>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('dashboard')}
          </h2>
          <p className="text-emerald-100 text-sm mt-1 max-w-xl">
            {lang === 'ar'
              ? 'متابعة العقود، التحصيلات، الموظفين، وتنبيهات تجديد العقود القريبة في مكان واحد.'
              : 'Track contracts, collections, employees, and upcoming renewal alerts in one place.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onAddClient}
            className="px-4 py-2.5 rounded-xl bg-white text-[#1F4A38] text-sm font-semibold hover:bg-emerald-50 transition-colors shadow-sm flex items-center gap-1.5"
            id="btn-quick-add-client"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('add_client_quick')}</span>
          </button>
          <button
            onClick={onAddEmployee}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors border border-white/20 flex items-center gap-1.5"
            id="btn-quick-add-emp"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('add_employee_quick')}</span>
          </button>
        </div>
      </div>

      {/* Currency Filter Bar */}
      {activeCurrencies.length > 0 && (
        <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#1F4A38] dark:text-[#4A7862]" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {lang === 'ar' ? 'عرض المؤشرات المالية حسب العملة:' : 'Filter Metrics by Currency:'}
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
                  id={`btn-dash-cur-${code}`}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#1F4A38] dark:bg-[#2B604A] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="px-1 py-0.2 rounded bg-white/20 text-[10px]">
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
              id="btn-dash-cur-all"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isAll
                  ? 'bg-[#1F4A38] dark:bg-[#2B604A] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'الكل' : 'All'}</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contracts */}
        <div
          onClick={() => onNavigateTab('clients')}
          className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-[#1F4A38] dark:hover:border-[#4A7862] cursor-pointer transition-all group"
          id="card-total-contracts"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('total_contracts')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1F4A38] dark:text-[#4A7862] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {totalContractsCount}
            </span>
            <span className="text-xs font-semibold text-[#1F4A38] dark:text-[#4A7862] flex items-center group-hover:translate-x-0.5 transition-transform">
              {t('active_clients')} <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {!isAll ? `${lang === 'ar' ? 'بعملة' : 'in'} ${curInfo.name_ar}` : `${activeCurrencies.length} ${lang === 'ar' ? 'عملات' : 'currencies'}`}
          </p>
        </div>

        {/* Total Subscriptions Value */}
        <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('total_subscriptions')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {totalSubscriptionsValue.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {!isAll ? curInfo.symbol : `${defaultCurrency}`} / شهرياً
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {!isAll ? `إجمالي عقود ${curInfo.name_ar}` : 'إجمالي الاشتراكات الشهرية'}
          </p>
        </div>

        {/* Monthly Collections */}
        <div
          onClick={() => onNavigateTab('reports')}
          className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-[#1F4A38] dark:hover:border-[#4A7862] cursor-pointer transition-all group"
          id="card-monthly-revenue"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('monthly_revenue')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {monthlyCollectionsValue.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {!isAll ? curInfo.symbol : defaultCurrency}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            سندات قبض الشهر الجاري
          </p>
        </div>

        {/* Yearly Collections */}
        <div
          onClick={() => onNavigateTab('reports')}
          className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-[#1F4A38] dark:hover:border-[#4A7862] cursor-pointer transition-all group"
          id="card-yearly-revenue"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('yearly_revenue')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {yearlyCollectionsValue.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
              {!isAll ? curInfo.symbol : defaultCurrency}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            تحصيلات العام الحالي
          </p>
        </div>
      </div>

      {/* Services Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cleaning Service Card */}
        <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('cleaning')}
                </h3>
                {!isAll && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {curInfo.name_ar}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
              {cleaningData.count} {t('total_contracts')}
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {cleaningData.revenue.toLocaleString()} {!isAll ? curInfo.symbol : ''}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {cleaningPercent}% من الإيراد
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${cleaningPercent}%` }}
            />
          </div>
        </div>

        {/* Security Service Card */}
        <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#1F4A38] dark:text-[#4A7862] flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('security')}
                </h3>
                {!isAll && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {curInfo.name_ar}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              {securityData.count} {t('total_contracts')}
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
              {securityData.revenue.toLocaleString()} {!isAll ? curInfo.symbol : ''}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {securityPercent}% من الإيراد
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-[#1F4A38] dark:bg-[#4A7862] h-full rounded-full transition-all duration-500"
              style={{ width: `${securityPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expiring Contracts Card */}
      <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t('expiring_contracts')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar'
                  ? 'تنبيه مبكر للتواصل مع العملاء لتجديد العقود قبل انقضائها'
                  : 'Early notification to renew client contracts before expiration'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
            {filteredExpiring.length} {t('clients')}
          </span>
        </div>

        {filteredExpiring.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            {t('no_expiring')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {filteredExpiring.map((client) => {
              const days = getDaysLeft(client.contract_end);
              const clientCur = client.currency || defaultCurrency;
              const curBadge = getCurrencyInfo(clientCur, availableCurrencies);
              return (
                <div
                  key={client.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl px-2 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs mt-0.5">
                      {client.service_type === 'security' ? '🛡️' : '🧹'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {client.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono">{client.phone}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {Number(client.contract_amount).toLocaleString()} {curBadge.symbol}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {days} {t('days_left')}
                    </span>
                    <button
                      onClick={() => onRenewClient(client)}
                      className="px-3 py-1.5 rounded-lg bg-[#1F4A38] dark:bg-[#4A7862] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      {t('quick_renew')}
                    </button>
                    <button
                      onClick={() => onViewStatement(client)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {t('statement')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

