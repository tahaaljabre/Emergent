import React, { useState } from 'react';
import { Employee, ServiceType, OfficeSettings } from '../types';
import { useI18n } from '../lib/i18n';
import { DEFAULT_CURRENCIES, getCurrencyInfo } from '../lib/currencies';
import {
  Search,
  Plus,
  Phone,
  Briefcase,
  DollarSign,
  FileSpreadsheet,
  Edit2,
  Archive,
  Trash2,
  Sparkles,
  Shield,
  UserCheck,
  Coins,
} from 'lucide-react';

interface EmployeesViewProps {
  employees: Employee[];
  settings: OfficeSettings | null;
  onAddEmployee: (data: Partial<Employee>) => Promise<void>;
  onUpdateEmployee: (id: string, data: Partial<Employee>) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onArchiveEmployee: (id: string, archived: boolean) => Promise<void>;
  onViewStatement: (employee: Employee) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  employees,
  settings,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onArchiveEmployee,
  onViewStatement,
}) => {
  const { t } = useI18n();
  const defaultCurrency = settings?.currency || 'ر.ي';
  const availableCurrencies = settings?.currencies || DEFAULT_CURRENCIES;

  const [filterRole, setFilterRole] = useState<'all' | ServiceType>('all');
  const [filterCurrency, setFilterCurrency] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    role: 'cleaning',
    assignment: '',
    phone: '',
    salary: 3500,
    currency: defaultCurrency,
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter employees
  const filtered = employees.filter((e) => {
    if (filterRole !== 'all' && e.role !== filterRole) return false;
    if (filterCurrency !== 'all') {
      const eCur = e.currency || defaultCurrency;
      if (eCur !== filterCurrency) return false;
    }
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.phone.toLowerCase().includes(q) ||
      e.assignment.toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      role: 'cleaning',
      assignment: '',
      phone: '',
      salary: 3500,
      currency: defaultCurrency,
    });
    setIsFormOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      role: emp.role,
      assignment: emp.assignment,
      phone: emp.phone,
      salary: emp.salary,
      currency: emp.currency || defaultCurrency,
    });
    setIsFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    if (editingEmployee) {
      await onUpdateEmployee(editingEmployee.id, formData);
    } else {
      await onAddEmployee(formData);
    }
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Controls */}
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

        {/* Add Employee Button */}
        <button
          onClick={openAdd}
          className="px-4 py-2.5 rounded-xl bg-[#1F4A38] dark:bg-[#4A7862] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shadow-xs"
          id="btn-add-employee"
        >
          <Plus className="w-4 h-4" />
          <span>{t('add_employee')}</span>
        </button>
      </div>

      {/* Filters: Role & Currency */}
      <div className="flex flex-wrap items-center gap-2.5 justify-between">
        {/* Segmented Control */}
        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-xs font-semibold">
          <button
            onClick={() => setFilterRole('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filterRole === 'all'
                ? 'bg-white dark:bg-[#1A1F1C] text-[#1F4A38] dark:text-[#4A7862] shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {t('all')} ({employees.length})
          </button>
          <button
            onClick={() => setFilterRole('cleaning')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterRole === 'cleaning'
                ? 'bg-white dark:bg-[#1A1F1C] text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('cleaning')}</span>
          </button>
          <button
            onClick={() => setFilterRole('security')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              filterRole === 'security'
                ? 'bg-white dark:bg-[#1A1F1C] text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{t('security')}</span>
          </button>
        </div>

        {/* Currency Filter */}
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

      {/* Employees Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('empty')}</p>
          <button
            onClick={openAdd}
            className="mt-3 px-4 py-2 rounded-xl bg-[#1F4A38] text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('add_employee')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              className="bg-white dark:bg-[#1A1F1C] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Role Badge & Avatar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#D8E8E0] dark:bg-[#1D362B] text-[#1F4A38] dark:text-[#4A7862] flex items-center justify-center font-bold text-sm">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {emp.name}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold mt-0.5 ${
                          emp.role === 'security'
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                        }`}
                      >
                        {emp.role === 'security' ? <Shield className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                        {emp.role === 'security' ? t('security_short') : t('cleaning_short')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {emp.assignment && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{emp.assignment}</span>
                    </div>
                  )}
                  {emp.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={`tel:${emp.phone}`}
                        className="hover:text-[#1F4A38] dark:hover:text-[#4A7862] hover:underline"
                        dir="ltr"
                      >
                        {emp.phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* Salary */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t('salary')}
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {Number(emp.salary).toLocaleString()} {getCurrencyInfo(emp.currency || defaultCurrency, availableCurrencies).symbol} / شهر
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                <button
                  onClick={() => onViewStatement(emp)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#1F4A38] dark:text-[#4A7862] text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                  title={t('statement')}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{t('statement')}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(emp)}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={t('edit')}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onArchiveEmployee(emp.id, true)}
                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                    title={t('archive_item')}
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingId(emp.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title={t('delete')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1A1F1C] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              {editingEmployee ? t('edit_employee') : t('add_employee')}
            </h3>
            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('employee_name')} *
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
                    {t('role')}
                  </label>
                  <select
                    value={formData.role || 'cleaning'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as ServiceType })}
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
                    {t('currency')}
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
                    {t('salary')}
                  </label>
                  <input
                    type="number"
                    value={formData.salary || 0}
                    onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('assignment')}
                  </label>
                  <input
                    type="text"
                    value={formData.assignment || ''}
                    onChange={(e) => setFormData({ ...formData, assignment: e.target.value })}
                    placeholder="مثال: برج الأعمال المركزي"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
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

      {/* Delete Modal */}
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
                  await onDeleteEmployee(deletingId);
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
