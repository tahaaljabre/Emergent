const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type ServiceType = "cleaning" | "security";

export type Client = {
  id: string;
  name: string;
  address: string;
  phone: string;
  service_type: ServiceType;
  contract_amount: number;
  contract_start: string; // ISO
  contract_end: string;   // ISO
  archived: boolean;
  created_at: string;
};

export type Employee = {
  id: string;
  name: string;
  role: ServiceType;
  assignment: string;
  phone: string;
  salary: number;
  archived: boolean;
  created_at: string;
};

export type TxnKind = "payment" | "charge";
export type Transaction = {
  id: string;
  entity_type: "client" | "employee";
  entity_id: string;
  kind: TxnKind;
  description: string;
  amount: number;
  date: string;
  archived: boolean;
  created_at: string;
};

export type OfficeSettings = {
  office_name: string;
  address: string;
  phone: string;
  currency: string;
  logo_url: string | null;
};

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// Clients
export const listClients = (opts: { service?: ServiceType; archived?: boolean; q?: string } = {}) => {
  const params = new URLSearchParams();
  if (opts.service) params.set("service", opts.service);
  if (opts.archived != null) params.set("archived", String(opts.archived));
  if (opts.q) params.set("q", opts.q);
  const qs = params.toString();
  return req<Client[]>(`/clients${qs ? `?${qs}` : ""}`);
};
export const getClient = (id: string) => req<Client>(`/clients/${id}`);
export const createClient = (data: Partial<Client>) =>
  req<Client>(`/clients`, { method: "POST", body: JSON.stringify(data) });
export const updateClient = (id: string, data: Partial<Client>) =>
  req<Client>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteClient = (id: string) => req<{ ok: boolean }>(`/clients/${id}`, { method: "DELETE" });
export const archiveClient = (id: string, archived: boolean) =>
  req<Client>(`/clients/${id}/archive`, { method: "POST", body: JSON.stringify({ archived }) });

// Employees
export const listEmployees = (opts: { role?: ServiceType; archived?: boolean; q?: string } = {}) => {
  const params = new URLSearchParams();
  if (opts.role) params.set("role", opts.role);
  if (opts.archived != null) params.set("archived", String(opts.archived));
  if (opts.q) params.set("q", opts.q);
  const qs = params.toString();
  return req<Employee[]>(`/employees${qs ? `?${qs}` : ""}`);
};
export const getEmployee = (id: string) => req<Employee>(`/employees/${id}`);
export const createEmployee = (data: Partial<Employee>) =>
  req<Employee>(`/employees`, { method: "POST", body: JSON.stringify(data) });
export const updateEmployee = (id: string, data: Partial<Employee>) =>
  req<Employee>(`/employees/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteEmployee = (id: string) => req<{ ok: boolean }>(`/employees/${id}`, { method: "DELETE" });
export const archiveEmployee = (id: string, archived: boolean) =>
  req<Employee>(`/employees/${id}/archive`, { method: "POST", body: JSON.stringify({ archived }) });

// Transactions
export const listTransactions = (entity_type: "client" | "employee", entity_id: string) =>
  req<{ items: Transaction[]; balance: number }>(`/transactions/${entity_type}/${entity_id}`);
export const createTransaction = (data: Partial<Transaction>) =>
  req<Transaction>(`/transactions`, { method: "POST", body: JSON.stringify(data) });
export const deleteTransaction = (id: string) =>
  req<{ ok: boolean }>(`/transactions/${id}`, { method: "DELETE" });

// Dashboard
export type DashboardData = {
  total_contracts: number;
  total_subscriptions: number;
  cleaning: { count: number; revenue: number };
  security: { count: number; revenue: number };
  expiring: Client[];
  monthly_revenue: number;
  yearly_revenue: number;
};
export const getDashboard = () => req<DashboardData>(`/dashboard`);

// Settings
export const getSettings = () => req<OfficeSettings>(`/settings`);
export const updateSettings = (data: Partial<OfficeSettings>) =>
  req<OfficeSettings>(`/settings`, { method: "PUT", body: JSON.stringify(data) });

// Backup
export const getBackup = () => req<any>(`/backup`);

// Logo
export const uploadLogo = async (fileUri: string, name: string, type: string): Promise<{ logo_url: string }> => {
  const { Platform } = await import("react-native");
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(fileUri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri: fileUri, name, type } as any);
  }
  const r = await fetch(`${BASE}/api/upload/logo`, { method: "POST", body: form });
  if (!r.ok) throw new Error(`Upload failed: ${r.status}`);
  return r.json();
};

export const logoDisplayUrl = (path: string | null | undefined) =>
  path ? `${BASE}/api/files/${path}` : null;
