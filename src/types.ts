export type ServiceType = 'cleaning' | 'security';
export type TxnKind = 'charge' | 'receipt' | 'disbursement';
export type Lang = 'ar' | 'en';
export type ThemeMode = 'light' | 'dark';

export interface CurrencyItem {
  code: string;
  symbol: string;
  name_ar: string;
  name_en: string;
  tafqeet_ar: string;
}

export interface Client {
  id: string;
  name: string;
  address: string;
  phone: string;
  service_type: ServiceType;
  contract_amount: number;
  currency?: string; // e.g. 'YER', 'SAR', 'USD'
  contract_start: string;
  contract_end: string;
  archived: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  name: string;
  role: ServiceType;
  assignment: string;
  phone: string;
  salary: number;
  currency?: string; // e.g. 'YER', 'SAR', 'USD'
  archived: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  entity_type: 'client' | 'employee';
  entity_id: string;
  kind: TxnKind;
  description: string;
  amount: number;
  currency?: string; // Transaction currency
  date: string;
  archived: boolean;
  created_at: string;
  entity_name?: string;
}

export interface OfficeSettings {
  office_name: string;
  address: string;
  phone: string;
  currency: string;
  currencies?: CurrencyItem[]; // Custom available currencies list
  logo_url: string | null;
  stamp_url?: string | null; // Official circular stamp image
  signature_url?: string | null; // Official manager/accountant signature image
}

export interface CurrencyBreakdown {
  currency: string;
  count: number;
  revenue: number;
}

export interface DashboardData {
  selected_currency?: string;
  total_contracts: number;
  total_subscriptions: number;
  subscriptions_by_currency?: Record<string, number>;
  cleaning: { count: number; revenue: number };
  security: { count: number; revenue: number };
  expiring: Client[];
  monthly_revenue: number;
  yearly_revenue: number;
  monthly_by_currency?: Record<string, number>;
  yearly_by_currency?: Record<string, number>;
  cleaning_by_currency?: Record<string, { count: number; revenue: number }>;
  security_by_currency?: Record<string, { count: number; revenue: number }>;
  contracts_count_by_currency?: Record<string, number>;
  active_currencies?: string[];
}

