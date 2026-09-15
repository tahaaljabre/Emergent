import React, { useState, useEffect } from 'react';
import { Client, Employee, Transaction, OfficeSettings } from '../types';
import {
  listClients,
  listEmployees,
  getArchivedTransactions,
  archiveClient,
  deleteClient,
  archiveEmployee,
  deleteEmployee,
  archiveTransaction,
  deleteTransaction,
} from '../lib/api';
import { useI18n } from '../lib/i18n';
import { DEFAULT_CURRENCIES, getCurrencyInfo } from '../lib/currencies';
import {
  Archive,
  RotateCcw,
  Trash2,
  Users,
  UserCheck,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Shield,
} from 'lucide-react';

interface ArchiveViewProps {
  settings: OfficeSettings | null;
  onRefreshData?: () => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ settings, onRefreshData }) => {
  const { t } = useI18n();
  const availableCurrencies = settings?.currencies || DEFAULT_CURRENCIES;
  const defaultCurrency = settings?.currency || 'ر.ي';

  const [activeTab, setActiveTab] = useState<'clients' | 'employees' | 'transactions'>('clients');
  const [archivedClients, setArchivedClients] = useState<Client[]>([]);
  const [archivedEmployees, setArchivedEmployees] = useState<Employee[]>([]);
  const [archivedTransactions, setArchivedTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [c, e, tx] = await Promise.all([
        listClients({ archived: true }),
        listEmployees({ archived: true }),
        getArchivedTransactions(),
      ]);
      setArchivedClients(c);
      setArchivedEmployees(e);
      setArchivedTransactions(tx);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRestoreClient = async (id: string) => {
    await archiveClient(id, false);
    await loadData();
    onRefreshData?.();
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm(t('delete_prompt'))) return;
    await deleteClient(id);
    await loadData();
    onRefreshData?.();
  };

  const handleRestoreEmployee = async (id: string) => {
    await archiveEmployee(id, false);
    await loadData();
    onRefreshData?.();
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm(t('delete_prompt'))) return;
    await deleteEmployee(id);
    await loadData();
    onRefreshData?.();
  };

  const handleRestoreTxn = async (id: string) => {
    await archiveTransaction(id, false);
    await loadData();
    onRefreshData?.();
  };

  const handleDeleteTxn = async (id: string) => {
    if (!confirm(t('delete_prompt'))) return;
    await deleteTransaction(id);
    await loadData();
    onRefreshData?.();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t('archive')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              استرجاع أو حذف السجلات المؤرشفة بصورة نهائية
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'clients'
              ? 'bg-white dark:bg-[#1A1F1C] text-[#1F4A38] dark:text-[#4A7862] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t('archived_clients')}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800">
            {archivedClients.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'employees'
              ? 'bg-white dark:bg-[#1A1F1C] text-[#1F4A38] dark:text-[#4A7862] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>{t('archived_employees')}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800">
            {archivedEmployees.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === 'transactions'
              ? 'bg-white dark:bg-[#1A1F1C] text-[#1F4A38] dark:text-[#4A7862] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>{t('archived_transactions')}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800">
            {archivedTransactions.length}
          </span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-slate-500">
          <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
          <span className="text-xs">{t('loading')}</span>
        </div>
      ) : activeTab === 'clients' ? (
        archivedClients.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1F1C] rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            {t('empty_archive')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#1A1F1C] rounded-2xl border border-slate-200 dark:border-slate-800">
            {archivedClients.map((client) => (
              <div
                key={client.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {client.name}
                    </h4>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {client.service_type === 'security' ? t('security_short') : t('cleaning_short')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {client.phone} • {t('contract_amount')}: {Number(client.contract_amount).toLocaleString()} {getCurrencyInfo(client.currency || defaultCurrency, availableCurrencies).symbol}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestoreClient(client.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('restore')}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClient(client.id)}
                    className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('delete')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'employees' ? (
        archivedEmployees.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1F1C] rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            {t('empty_archive')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#1A1F1C] rounded-2xl border border-slate-200 dark:border-slate-800">
            {archivedEmployees.map((emp) => (
              <div
                key={emp.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {emp.name}
                    </h4>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {emp.role === 'security' ? t('security_short') : t('cleaning_short')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {t('assignment')}: {emp.assignment || '—'} • {t('salary')}: {Number(emp.salary).toLocaleString()} {getCurrencyInfo(emp.currency || defaultCurrency, availableCurrencies).symbol}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestoreEmployee(emp.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('restore')}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(emp.id)}
                    className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('delete')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        archivedTransactions.length === 0 ? (
          <div className="bg-white dark:bg-[#1A1F1C] rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
            {t('empty_archive')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#1A1F1C] rounded-2xl border border-slate-200 dark:border-slate-800">
            {archivedTransactions.map((txn) => (
              <div
                key={txn.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {txn.entity_name}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {txn.kind === 'charge' ? t('charge') : txn.kind === 'receipt' ? t('receipt_voucher') : t('disbursement_voucher')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {txn.description} • {t('amount')}: {Number(txn.amount).toLocaleString()} {getCurrencyInfo(txn.currency || defaultCurrency, availableCurrencies).symbol}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestoreTxn(txn.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('restore')}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteTxn(txn.id)}
                    className="px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-100 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('delete')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
