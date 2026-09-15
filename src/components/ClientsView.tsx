import React, { useState } from 'react';
import { Client, ServiceType, OfficeSettings } from '../types';
import { useI18n } from '../lib/i18n';
import { DEFAULT_CURRENCIES, getCurrencyInfo } from '../lib/currencies';
import {
  Search,
  Plus,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Clock,
  RotateCw,
  Edit2,
  Archive,
  Trash2,
  Sparkles,
  Shield,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Coins,
} from 'lucide-react';

interface ClientsViewProps {
  clients: Client[];
  settings: OfficeSettings | null;
  onAddClient: (data: Partial<Client>) => Promise<void>;
  onUpdateClient: (id: string, data: Partial<Client>) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  onArchiveClient: (id: string, archived: boolean) => Promise<void>;
  onRenewClient: (id: string, months: number) => Promise<void>;
  onViewStatement: (client: Client) => void;
  isInitialAddOpen?: boolean;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  settings,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onArchiveClient,
  onRenewClient,
  onViewStatement,
}) => {
  const { t } = useI18n();
  const defaultCurrency = settings?.currency || 'ر.ي';
  const availableCurrencies = settings?.currencies || DEFAULT_CURRENCIES;

  const [filterService, setFilterService] = useState<'all' | ServiceType>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    address: '',
    phone: '',
    service_type: 'cleaning',
    contract_amount: 3000,
    currency: defaultCurrency,
    contract_start: new Date().toISOString().split('T')[0],
    contract_end: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
  });

  const [renewingClient, setRenewingClient] = useState<Client | null>(null);
  const [renewMonths, setRenewMonths] = useState<number>(12);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter clients
  const filtered = clients.filter((c) => {
    if (filterService !== 'all' && c.service_type !== filterService) return false;
    if (filterCurrency !== 'all') {
      const cCur = c.currency || defaultCurrency;
      if (cCur !== filterCurrency) return false;
    }
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  });

  const getStatus = (endStr: string) => {
    try {
      const now = new Date();
      const end = new Date(endStr);
      if (end < now) return 'expired';
      const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) return 'expiring_soon';
      return 'active';
    } catch {
      return 'active';
    }
  };

  const openAdd = () => {
    setEditingClient(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      service_type: 'cleaning',
      contract_amount: 3500,
      currency: defaultCurrency,
      contract_start: new Date().toISOString().split('T')[0],
      contract_end: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    });
    setIsFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      address: client.address,
      phone: client.phone,
      service_type: client.service_type,
      contract_amount: client.contract_amount,
      currency: client.currency || defaultCurrency,
      contract_start: client.contract_start ? client.contract_start.split('T')[0] : '',
      contract_end: client.contract_end ? client.contract_end.split('T')[0] : '',
    });
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    if (editingClient) {
      await onUpdateClient(editingClient.id, formData);
    } else {
      await onAddClient(formData);
    }
    setIsFormOpen(false);
  };

  const handleRenewSubmit = async () => {
    if (!renewingClient) return;
    await onRenewClient(renewingClient.id, renewMonths);
    setRenewingClient(null);
  };

  return (
    <div className="space-y-5">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search')}
            className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A1F1C] text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-[#1F4A38] dark:focus:border-[#4A7862] transition-colors"
          />
        </div>

        {/* Add Client Button */}
        <button
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#1F4A38] dark:bg-[#4A7862] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-xs"
          id="btn-add-client"
        >
          <Plus className="w-4 h-4" />
          <span>{t('add_client')}</span>
        </button>
      </div>

      {/* Filters: Service and Currency */}
      <div className="flex flex-wrap items-center gap-2.5 justify-between">
        {/* Segmented Control (All / Cleaning / Security) */}
        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs font-semibold">
          <button
            onClick={() => setFilterService('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filterService === 'all'
                ? 'bg-white dark:bg-[#1A1F1C] text-[#1F4A38] dark:text-[#4A7862] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t('all')} ({clients.length})
          </button>
          <button
            onClick={() => setFilterService('cleaning')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterService === 'cleaning'
                ? 'bg-white dark:bg-[#1A1F1C] text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('cleaning')}</span>
          </button>
          <button
            onClick={() => setFilterService('security')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterService === 'security'
                ? 'bg-white dark:bg-[#1A1F1C] text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{t('security')}</span>
          </button>
        </div>

        {/* Currency Filter Pill */}
        <div className="flex items-center gap-1.5 text-xs">
          <Coins className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium hidden sm:inline">{t('filter_by_currency')}:</span>
          <select
            value={filterCurrency}
            onChange={(e) => setFilterCurrency(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1A1F1C] text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="all">{t('all_currencies')}</option>
            {availableCurrencies.map((cur) => (
              <option key={cur.code} value={cur.code}>
                {cur.symbol} - {cur.name_ar}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clients Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('empty')}</p>
          <button
            onClick={openAdd}
            className="mt-3 px-4 py-2 rounded-xl bg-[#1F4A38] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('add_client')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => {
            const status = getStatus(client.contract_end);
            return (
              <div
                key={client.id}
                className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Service tag & Status badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                        client.service_type === 'security'
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                      }`}
                    >
                      {client.service_type === 'security' ? <Shield className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                      {client.service_type === 'security' ? t('security_short') : t('cleaning_short')}
                    </span>

                    {/* Status Badge */}
                    {status === 'active' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('active')}
                      </span>
                    )}
                    {status === 'expiring_soon' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                        <AlertCircle className="w-3 h-3" />
                        {t('expiring_soon')}
                      </span>
                    )}
                    {status === 'expired' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        <XCircle className="w-3 h-3" />
                        {t('expired')}
                      </span>
                    )}
                  </div>

                  {/* Client Name */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-3 line-clamp-1">
                    {client.name}
                  </h3>

                  {/* Details List */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={`tel:${client.phone}`}
                        className="hover:text-[#1F4A38] dark:hover:text-[#4A7862] hover:underline"
                        dir="ltr"
                      >
                        {client.phone}
                      </a>
                    </div>
                    {client.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{client.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {client.contract_end ? client.contract_end.split('T')[0] : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Contract Amount with Currency */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {t('contract_amount')}
                    </span>
                    <span className="text-sm font-bold text-[#1F4A38] dark:text-[#4A7862]">
                      {Number(client.contract_amount).toLocaleString()} {getCurrencyInfo(client.currency || defaultCurrency, availableCurrencies).symbol} / شهر
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 flex-wrap">
                  <button
                    onClick={() => onViewStatement(client)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#1F4A38] dark:text-[#4A7862] text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                    title={t('statement')}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>{t('statement')}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setRenewingClient(client);
                        setRenewMonths(12);
                      }}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={t('renew_contract')}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEdit(client)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={t('edit')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onArchiveClient(client.id, true)}
                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                      title={t('archive_item')}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(client.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1F1C] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              {editingClient ? t('edit_client') : t('add_client')}
            </h3>
            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('client_name')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('service_type')}
                  </label>
                  <select
                    value={formData.service_type || 'cleaning'}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value as ServiceType })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                  >
                    <option value="cleaning">{t('cleaning')}</option>
                    <option value="security">{t('security')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('phone')}
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('contract_currency')}
                  </label>
                  <select
                    value={formData.currency || defaultCurrency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold text-[#1F4A38] dark:text-emerald-400"
                  >
                    {availableCurrencies.map((cur) => (
                      <option key={cur.code} value={cur.code}>
                        {cur.symbol} ({cur.name_ar})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('contract_amount')}
                  </label>
                  <input
                    type="number"
                    value={formData.contract_amount || 0}
                    onChange={(e) => setFormData({ ...formData, contract_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('address')}
                  </label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('contract_start')}
                  </label>
                  <input
                    type="date"
                    value={formData.contract_start || ''}
                    onChange={(e) => setFormData({ ...formData, contract_start: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('contract_end')}
                  </label>
                  <input
                    type="date"
                    value={formData.contract_end || ''}
                    onChange={(e) => setFormData({ ...formData, contract_end: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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

      {/* Renew Contract Modal */}
      {renewingClient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1F1C] rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              {t('renew_contract')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              تمديد عقد العميل: <span className="font-bold text-slate-800 dark:text-slate-200">{renewingClient.name}</span>
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('renewal_period')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setRenewMonths(m)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      renewMonths === m
                        ? 'border-[#1F4A38] bg-emerald-50 text-[#1F4A38] dark:border-[#4A7862] dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {m} {t('months_count')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRenewingClient(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleRenewSubmit}
                className="px-5 py-2 rounded-xl bg-[#1F4A38] dark:bg-[#4A7862] text-white text-xs font-semibold hover:opacity-90 shadow-xs"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1F1C] rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-red-600 mb-2">
              {t('confirm_delete')}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-5">
              {t('delete_prompt')}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                {t('cancel')}
              </button>
              <button
                onClick={async () => {
                  await onDeleteClient(deletingId);
                  setDeletingId(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
