import { Client, Employee, Transaction, OfficeSettings, DashboardData, ServiceType } from '../types';

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error ${res.status}: ${errText}`);
  }
  return res.json();
}

// Dashboard
export const getDashboard = (currency?: string) =>
  req<DashboardData>(`/dashboard${currency && currency !== 'ALL' ? `?currency=${encodeURIComponent(currency)}` : ''}`);

// Clients
export const listClients = (opts: { service?: ServiceType; archived?: boolean; q?: string } = {}) => {
  const params = new URLSearchParams();
  if (opts.service) params.set('service', opts.service);
  if (opts.archived !== undefined) params.set('archived', String(opts.archived));
  if (opts.q) params.set('q', opts.q);
  const qs = params.toString();
  return req<Client[]>(`/clients${qs ? `?${qs}` : ''}`);
};

export const getClient = (id: string) => req<Client>(`/clients/${id}`);
export const createClient = (data: Partial<Client>) =>
  req<Client>('/clients', { method: 'POST', body: JSON.stringify(data) });
export const updateClient = (id: string, data: Partial<Client>) =>
  req<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClient = (id: string) =>
  req<{ ok: boolean }>(`/clients/${id}`, { method: 'DELETE' });
export const archiveClient = (id: string, archived: boolean) =>
  req<Client>(`/clients/${id}/archive`, { method: 'POST', body: JSON.stringify({ archived }) });
export const renewClient = (id: string, months: number) =>
  req<Client>(`/clients/${id}/renew`, { method: 'POST', body: JSON.stringify({ months }) });

// Employees
export const listEmployees = (opts: { role?: ServiceType; archived?: boolean; q?: string } = {}) => {
  const params = new URLSearchParams();
  if (opts.role) params.set('role', opts.role);
  if (opts.archived !== undefined) params.set('archived', String(opts.archived));
  if (opts.q) params.set('q', opts.q);
  const qs = params.toString();
  return req<Employee[]>(`/employees${qs ? `?${qs}` : ''}`);
};

export const getEmployee = (id: string) => req<Employee>(`/employees/${id}`);
export const createEmployee = (data: Partial<Employee>) =>
  req<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) });
export const updateEmployee = (id: string, data: Partial<Employee>) =>
  req<Employee>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteEmployee = (id: string) =>
  req<{ ok: boolean }>(`/employees/${id}`, { method: 'DELETE' });
export const archiveEmployee = (id: string, archived: boolean) =>
  req<Employee>(`/employees/${id}/archive`, { method: 'POST', body: JSON.stringify({ archived }) });

// Transactions
export const listTransactions = (entity_type: 'client' | 'employee', entity_id: string) =>
  req<{ items: Transaction[]; balance: number }>(`/transactions/${entity_type}/${entity_id}`);
export const createTransaction = (data: Partial<Transaction>) =>
  req<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) });
export const updateTransaction = (id: string, data: Partial<Transaction>) =>
  req<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTransaction = (id: string) =>
  req<{ ok: boolean }>(`/transactions/${id}`, { method: 'DELETE' });
export const archiveTransaction = (id: string, archived: boolean) =>
  req<Transaction>(`/transactions/${id}/archive`, { method: 'POST', body: JSON.stringify({ archived }) });
export const getArchivedTransactions = () =>
  req<Transaction[]>('/transactions/archived');

// Settings & Backup
export const getSettings = () => req<OfficeSettings>('/settings');
export const updateSettings = (data: Partial<OfficeSettings>) =>
  req<OfficeSettings>('/settings', { method: 'PUT', body: JSON.stringify(data) });
export const getBackup = () => req<any>('/backup');
export const resetDatabase = () => req<{ ok: boolean; message: string }>('/reset', { method: 'POST' });
