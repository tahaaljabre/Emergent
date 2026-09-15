import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Types
export type ServiceType = 'cleaning' | 'security';
export type TxnKind = 'charge' | 'receipt' | 'disbursement';

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
  currency?: string;
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
  currency?: string;
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
  currency?: string;
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
  currencies?: CurrencyItem[];
  logo_url: string | null;
  stamp_url?: string | null;
  signature_url?: string | null;
}

const DEFAULT_SYSTEM_CURRENCIES: CurrencyItem[] = [
  { code: 'YER', symbol: 'ر.ي', name_ar: 'ريال يمني', name_en: 'Yemeni Rial', tafqeet_ar: 'ريال يمني' },
  { code: 'SAR', symbol: 'ر.س', name_ar: 'ريال سعودي', name_en: 'Saudi Riyal', tafqeet_ar: 'ريال سعودي' },
  { code: 'USD', symbol: '$', name_ar: 'دولار أمريكي', name_en: 'US Dollar', tafqeet_ar: 'دولار أمريكي' },
  { code: 'AED', symbol: 'د.إ', name_ar: 'درهم إماراتي', name_en: 'UAE Dirham', tafqeet_ar: 'درهم إماراتي' },
  { code: 'QAR', symbol: 'ر.ق', name_ar: 'ريال قطري', name_en: 'Qatari Riyal', tafqeet_ar: 'ريال قطري' },
  { code: 'OMR', symbol: 'ر.ع', name_ar: 'ريال عماني', name_en: 'Omani Rial', tafqeet_ar: 'ريال عماني' },
  { code: 'KWD', symbol: 'د.ك', name_ar: 'دينار كويتي', name_en: 'Kuwaiti Dinar', tafqeet_ar: 'دينار كويتي' },
  { code: 'BHD', symbol: 'د.ب', name_ar: 'دينار بحريني', name_en: 'Bahraini Dinar', tafqeet_ar: 'دينار بحريني' },
  { code: 'EUR', symbol: '€', name_ar: 'يورو', name_en: 'Euro', tafqeet_ar: 'يورو' },
];

// In-memory data store
let clients: Client[] = [];
let employees: Employee[] = [];
let transactions: Transaction[] = [];
let settings: OfficeSettings = {
  office_name: 'مكتب الأمانة للخدمات الأمنية والنظافة',
  address: 'صنعاء - شارع الستين / الرياض - حي العليا',
  phone: '0112345678',
  currency: 'ر.ي',
  currencies: DEFAULT_SYSTEM_CURRENCIES,
  logo_url: null,
  stamp_url: null,
  signature_url: null,
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function nowIso(): string {
  return new Date().toISOString();
}

function monthsAgo(n: number, day: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(Math.min(day, 28));
  d.setHours(10, 0, 0, 0);
  return d;
}

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function seedData() {
  const now = new Date();
  
  clients = [
    {
      id: 'c1',
      name: 'شركة الفا للمقاولات والتجارة',
      address: 'صنعاء - شارع الزبيري',
      phone: '777123456',
      service_type: 'cleaning',
      contract_amount: 850000,
      currency: 'YER',
      contract_start: new Date(now.getTime() - 90 * 86400000).toISOString(),
      contract_end: new Date(now.getTime() + 180 * 86400000).toISOString(),
      archived: false,
      created_at: new Date(now.getTime() - 90 * 86400000).toISOString(),
    },
    {
      id: 'c2',
      name: 'مجمع النور التجاري والسكني',
      address: 'صنعاء - حدة',
      phone: '777987654',
      service_type: 'cleaning',
      contract_amount: 1200000,
      currency: 'YER',
      contract_start: new Date(now.getTime() - 330 * 86400000).toISOString(),
      contract_end: new Date(now.getTime() + 18 * 86400000).toISOString(), // Expiring in 18 days!
      archived: false,
      created_at: new Date(now.getTime() - 330 * 86400000).toISOString(),
    },
    {
      id: 'c3',
      name: 'مستشفى الرعاية الدولي التخصصي',
      address: 'صنعاء - شارع الستين',
      phone: '771112233',
      service_type: 'cleaning',
      contract_amount: 3500,
      currency: 'USD',
      contract_start: new Date(now.getTime() - 60 * 86400000).toISOString(),
      contract_end: new Date(now.getTime() + 305 * 86400000).toISOString(),
      archived: false,
      created_at: new Date(now.getTime() - 60 * 86400000).toISOString(),
    },
    {
      id: 'c4',
      name: 'برج الأعمال والاستثمار المركزي',
      address: 'الرياض - طريق الملك فهد',
      phone: '0555334455',
      service_type: 'security',
      contract_amount: 9000,
      currency: 'SAR',
      contract_start: new Date(now.getTime() - 120 * 86400000).toISOString(),
      contract_end: new Date(now.getTime() + 245 * 86400000).toISOString(),
      archived: false,
      created_at: new Date(now.getTime() - 120 * 86400000).toISOString(),
    },
    {
      id: 'c5',
      name: 'مستودعات الخليج للخدمات اللوجستية',
      address: 'عدن - المعلا / المنطقة الحرة',
      phone: '733667788',
      service_type: 'security',
      contract_amount: 2500,
      currency: 'USD',
      contract_start: new Date(now.getTime() - 200 * 86400000).toISOString(),
      contract_end: new Date(now.getTime() + 165 * 86400000).toISOString(),
      archived: false,
      created_at: new Date(now.getTime() - 200 * 86400000).toISOString(),
    },
    {
      id: 'c6',
      name: 'مجمع الواحة السكني الفندقي',
      address: 'صنعاء - الأصبحي',
      phone: '775998877',
      service_type: 'security',
      contract_amount: 950000,
      currency: 'YER',
      contract_start: new Date(now.getTime() - 340 * 86400000).toISOString(),
      contract_end: new Date(now.getTime() + 12 * 86400000).toISOString(), // Expiring in 12 days!
      archived: false,
      created_at: new Date(now.getTime() - 340 * 86400000).toISOString(),
    },
  ];

  employees = [
    {
      id: 'e1',
      name: 'سالم أحمد العتيبي',
      role: 'security',
      assignment: 'برج الأعمال المركزي',
      phone: '0501112233',
      salary: 4500,
      currency: 'SAR',
      archived: false,
      created_at: new Date(now.getTime() - 120 * 86400000).toISOString(),
    },
    {
      id: 'e2',
      name: 'طه محمد عبدالحميد اليافعي',
      role: 'security',
      assignment: 'مستشفى الرعاية الدولي',
      phone: '7738950505',
      salary: 600,
      currency: 'USD',
      archived: false,
      created_at: new Date(now.getTime() - 150 * 86400000).toISOString(),
    },
    {
      id: 'e3',
      name: 'فهد عبدالله القحطاني',
      role: 'cleaning',
      assignment: 'مجمع النور التجاري',
      phone: '772223344',
      salary: 220000,
      currency: 'YER',
      archived: false,
      created_at: new Date(now.getTime() - 180 * 86400000).toISOString(),
    },
    {
      id: 'e4',
      name: 'خالد صالح الزهراني',
      role: 'cleaning',
      assignment: 'شركة الفا للمقاولات',
      phone: '774445566',
      salary: 190000,
      currency: 'YER',
      archived: false,
      created_at: new Date(now.getTime() - 100 * 86400000).toISOString(),
    },
    {
      id: 'e5',
      name: 'عبدالله يحيى الحربي',
      role: 'security',
      assignment: 'مستودعات الخليج',
      phone: '735556677',
      salary: 500,
      currency: 'USD',
      archived: false,
      created_at: new Date(now.getTime() - 200 * 86400000).toISOString(),
    },
  ];

  transactions = [];
  // Seed past 6 months transactions
  clients.forEach((c, idx) => {
    const clientCurrency = c.currency || 'YER';
    for (let n = 6; n >= 1; n--) {
      const chargeDate = monthsAgo(n, 1);
      const monthName = `${AR_MONTHS[chargeDate.getMonth()]} ${chargeDate.getFullYear()}`;
      const amount = Number(c.contract_amount);
      
      transactions.push({
        id: generateId(),
        entity_type: 'client',
        entity_id: c.id,
        kind: 'charge',
        description: `اشتراك شهر ${monthName}`,
        amount: amount,
        currency: clientCurrency,
        date: chargeDate.toISOString(),
        archived: false,
        created_at: chargeDate.toISOString(),
      });

      const partial = (idx + n) % 4 === 0;
      const payAmount = partial ? Math.round(amount * 0.5) : amount;
      const payDate = monthsAgo(n, 5 + idx);
      transactions.push({
        id: generateId(),
        entity_type: 'client',
        entity_id: c.id,
        kind: 'receipt',
        description: `سند قبض - ${partial ? 'دفعة جزئية ' : 'سداد '}شهر ${monthName}`,
        amount: payAmount,
        currency: clientCurrency,
        date: payDate.toISOString(),
        archived: false,
        created_at: payDate.toISOString(),
      });
    }
  });

  employees.forEach((e, idx) => {
    const employeeCurrency = e.currency || 'YER';
    for (let n = 6; n >= 1; n--) {
      const chargeDate = monthsAgo(n, 27);
      const monthName = `${AR_MONTHS[chargeDate.getMonth()]} ${chargeDate.getFullYear()}`;
      const salary = Number(e.salary);

      transactions.push({
        id: generateId(),
        entity_type: 'employee',
        entity_id: e.id,
        kind: 'charge',
        description: `استحقاق راتب شهر ${monthName}`,
        amount: salary,
        currency: employeeCurrency,
        date: chargeDate.toISOString(),
        archived: false,
        created_at: chargeDate.toISOString(),
      });

      if ((idx + n) % 5 === 0) {
        const bonusDate = monthsAgo(n, 26);
        transactions.push({
          id: generateId(),
          entity_type: 'employee',
          entity_id: e.id,
          kind: 'charge',
          description: 'بدل ساعات عمل إضافية',
          amount: Math.round(salary * 0.1),
          currency: employeeCurrency,
          date: bonusDate.toISOString(),
          archived: false,
          created_at: bonusDate.toISOString(),
        });
      }

      const payDate = monthsAgo(n, 28);
      transactions.push({
        id: generateId(),
        entity_type: 'employee',
        entity_id: e.id,
        kind: 'disbursement',
        description: `سند صرف - تحويل راتب شهر ${monthName}`,
        amount: salary,
        currency: employeeCurrency,
        date: payDate.toISOString(),
        archived: false,
        created_at: payDate.toISOString(),
      });
    }
  });
}

seedData();

function txnSign(entity_type: 'client' | 'employee', kind: TxnKind): number {
  if (kind === 'charge') return 1.0;
  if (entity_type === 'client') return kind === 'receipt' ? -1.0 : 1.0;
  return kind === 'disbursement' ? -1.0 : 1.0;
}

// ----------------- API ROUTES -----------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: nowIso() });
});

// Reset data
app.post('/api/reset', (req, res) => {
  seedData();
  res.json({ ok: true, message: 'Database reseeded successfully' });
});

// Clients
app.get('/api/clients', (req, res) => {
  const { service, archived, q } = req.query;
  let list = [...clients];
  if (service === 'cleaning' || service === 'security') {
    list = list.filter((c) => c.service_type === service);
  }
  if (archived !== undefined) {
    const isArchived = archived === 'true';
    list = list.filter((c) => c.archived === isArchived);
  }
  if (q && typeof q === 'string') {
    const term = q.toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.address.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term)
    );
  }
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(list);
});

app.get('/api/clients/:id', (req, res) => {
  const client = clients.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  res.json(client);
});

app.post('/api/clients', (req, res) => {
  const body = req.body;
  const newClient: Client = {
    id: generateId(),
    name: body.name || 'عميل جديد',
    address: body.address || '',
    phone: body.phone || '',
    service_type: body.service_type === 'security' ? 'security' : 'cleaning',
    contract_amount: Number(body.contract_amount) || 0,
    currency: body.currency || settings.currency || 'YER',
    contract_start: body.contract_start || nowIso(),
    contract_end: body.contract_end || new Date(Date.now() + 365 * 86400000).toISOString(),
    archived: false,
    created_at: nowIso(),
  };
  clients.unshift(newClient);
  res.status(201).json(newClient);
});

app.put('/api/clients/:id', (req, res) => {
  const idx = clients.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Client not found' });
  clients[idx] = { ...clients[idx], ...req.body, id: clients[idx].id };
  res.json(clients[idx]);
});

app.delete('/api/clients/:id', (req, res) => {
  const id = req.params.id;
  clients = clients.filter((c) => c.id !== id);
  transactions = transactions.filter((t) => !(t.entity_type === 'client' && t.entity_id === id));
  res.json({ ok: true });
});

app.post('/api/clients/:id/archive', (req, res) => {
  const client = clients.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  client.archived = Boolean(req.body.archived);
  res.json(client);
});

app.post('/api/clients/:id/renew', (req, res) => {
  const client = clients.find((c) => c.id === req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const months = Number(req.body.months) || 12;
  const now = new Date();
  let currentEnd: Date;
  try {
    currentEnd = new Date(client.contract_end);
    if (isNaN(currentEnd.getTime())) currentEnd = now;
  } catch {
    currentEnd = now;
  }
  const start = currentEnd > now ? currentEnd : now;
  const end = new Date(start.getTime() + months * 30 * 86400000);
  client.contract_start = start.toISOString();
  client.contract_end = end.toISOString();
  res.json(client);
});

// Employees
app.get('/api/employees', (req, res) => {
  const { role, archived, q } = req.query;
  let list = [...employees];
  if (role === 'cleaning' || role === 'security') {
    list = list.filter((e) => e.role === role);
  }
  if (archived !== undefined) {
    const isArchived = archived === 'true';
    list = list.filter((e) => e.archived === isArchived);
  }
  if (q && typeof q === 'string') {
    const term = q.toLowerCase();
    list = list.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.assignment.toLowerCase().includes(term) ||
        e.phone.toLowerCase().includes(term)
    );
  }
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(list);
});

app.get('/api/employees/:id', (req, res) => {
  const emp = employees.find((e) => e.id === req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  res.json(emp);
});

app.post('/api/employees', (req, res) => {
  const body = req.body;
  const newEmp: Employee = {
    id: generateId(),
    name: body.name || 'موظف جديد',
    role: body.role === 'security' ? 'security' : 'cleaning',
    assignment: body.assignment || '',
    phone: body.phone || '',
    salary: Number(body.salary) || 0,
    currency: body.currency || settings.currency || 'YER',
    archived: false,
    created_at: nowIso(),
  };
  employees.unshift(newEmp);
  res.status(201).json(newEmp);
});

app.put('/api/employees/:id', (req, res) => {
  const idx = employees.findIndex((e) => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Employee not found' });
  employees[idx] = { ...employees[idx], ...req.body, id: employees[idx].id };
  res.json(employees[idx]);
});

app.delete('/api/employees/:id', (req, res) => {
  const id = req.params.id;
  employees = employees.filter((e) => e.id !== id);
  transactions = transactions.filter((t) => !(t.entity_type === 'employee' && t.entity_id === id));
  res.json({ ok: true });
});

app.post('/api/employees/:id/archive', (req, res) => {
  const emp = employees.find((e) => e.id === req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  emp.archived = Boolean(req.body.archived);
  res.json(emp);
});

// Transactions
app.get('/api/transactions/archived', (req, res) => {
  const list = transactions.filter((t) => t.archived);
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));
  const employeeMap = new Map(employees.map((e) => [e.id, e.name]));
  const enriched = list.map((t) => ({
    ...t,
    entity_name: t.entity_type === 'client' ? clientMap.get(t.entity_id) || '—' : employeeMap.get(t.entity_id) || '—',
  }));
  enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(enriched);
});

app.get('/api/transactions/:entity_type/:entity_id', (req, res) => {
  const { entity_type, entity_id } = req.params;
  const list = transactions.filter(
    (t) => t.entity_type === entity_type && t.entity_id === entity_id && !t.archived
  );
  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Calculate total balance and per-currency balance
  const balance = list.reduce((acc, t) => acc + txnSign(t.entity_type, t.kind) * Number(t.amount), 0);
  const balance_by_currency: Record<string, number> = {};
  list.forEach((t) => {
    const cur = t.currency || 'YER';
    balance_by_currency[cur] = (balance_by_currency[cur] || 0) + txnSign(t.entity_type, t.kind) * Number(t.amount);
  });

  res.json({ items: list, balance, balance_by_currency });
});

app.post('/api/transactions', (req, res) => {
  const body = req.body;
  let defaultCurrency = body.currency;
  if (!defaultCurrency) {
    if (body.entity_type === 'client') {
      const parent = clients.find((c) => c.id === body.entity_id);
      defaultCurrency = parent?.currency || settings.currency || 'YER';
    } else {
      const parent = employees.find((e) => e.id === body.entity_id);
      defaultCurrency = parent?.currency || settings.currency || 'YER';
    }
  }

  const newTxn: Transaction = {
    id: generateId(),
    entity_type: body.entity_type,
    entity_id: body.entity_id,
    kind: body.kind,
    description: body.description || '',
    amount: Number(body.amount) || 0,
    currency: defaultCurrency,
    date: body.date || nowIso(),
    archived: false,
    created_at: nowIso(),
  };
  transactions.unshift(newTxn);
  res.status(201).json(newTxn);
});

app.put('/api/transactions/:id', (req, res) => {
  const idx = transactions.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Transaction not found' });
  transactions[idx] = { ...transactions[idx], ...req.body, id: transactions[idx].id };
  res.json(transactions[idx]);
});

app.post('/api/transactions/:id/archive', (req, res) => {
  const txn = transactions.find((t) => t.id === req.params.id);
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  txn.archived = Boolean(req.body.archived);
  res.json(txn);
});

app.delete('/api/transactions/:id', (req, res) => {
  transactions = transactions.filter((t) => t.id !== req.params.id);
  res.json({ ok: true });
});

// Dashboard
app.get('/api/dashboard', (req, res) => {
  const selectedCurrency = (req.query.currency as string) || 'ALL';
  const activeClients = clients.filter((c) => !c.archived);
  const now = new Date();
  const soon = new Date(now.getTime() + 30 * 86400000);

  // Group clients and receipts by currency
  const currencyCodes = new Set<string>();
  activeClients.forEach((c) => currencyCodes.add(c.currency || settings.currency || 'YER'));
  employees.filter((e) => !e.archived).forEach((e) => currencyCodes.add(e.currency || settings.currency || 'YER'));

  const clientReceipts = transactions.filter(
    (t) => !t.archived && t.kind === 'receipt' && t.entity_type === 'client'
  );
  clientReceipts.forEach((t) => currencyCodes.add(t.currency || settings.currency || 'YER'));

  const monthly_by_currency: Record<string, number> = {};
  const yearly_by_currency: Record<string, number> = {};
  clientReceipts.forEach((t) => {
    try {
      const d = new Date(t.date);
      const cur = t.currency || settings.currency || 'YER';
      const amt = Number(t.amount || 0);
      if (d.getFullYear() === now.getFullYear()) {
        yearly_by_currency[cur] = (yearly_by_currency[cur] || 0) + amt;
        if (d.getMonth() === now.getMonth()) {
          monthly_by_currency[cur] = (monthly_by_currency[cur] || 0) + amt;
        }
      }
    } catch {
      // ignore
    }
  });

  const subscriptions_by_currency: Record<string, number> = {};
  const cleaning_by_currency: Record<string, { count: number; revenue: number }> = {};
  const security_by_currency: Record<string, { count: number; revenue: number }> = {};
  const contracts_count_by_currency: Record<string, number> = {};

  activeClients.forEach((c) => {
    const cur = c.currency || settings.currency || 'YER';
    const amt = Number(c.contract_amount || 0);
    subscriptions_by_currency[cur] = (subscriptions_by_currency[cur] || 0) + amt;
    contracts_count_by_currency[cur] = (contracts_count_by_currency[cur] || 0) + 1;

    if (c.service_type === 'cleaning') {
      if (!cleaning_by_currency[cur]) cleaning_by_currency[cur] = { count: 0, revenue: 0 };
      cleaning_by_currency[cur].count += 1;
      cleaning_by_currency[cur].revenue += amt;
    } else if (c.service_type === 'security') {
      if (!security_by_currency[cur]) security_by_currency[cur] = { count: 0, revenue: 0 };
      security_by_currency[cur].count += 1;
      security_by_currency[cur].revenue += amt;
    }
  });

  // Filter clients based on selected currency
  const filteredClients = selectedCurrency === 'ALL'
    ? activeClients
    : activeClients.filter((c) => (c.currency || settings.currency || 'YER') === selectedCurrency);

  const cleaning = filteredClients.filter((c) => c.service_type === 'cleaning');
  const security = filteredClients.filter((c) => c.service_type === 'security');
  const cleaningRev = cleaning.reduce((sum, c) => sum + Number(c.contract_amount || 0), 0);
  const securityRev = security.reduce((sum, c) => sum + Number(c.contract_amount || 0), 0);

  const expiring = filteredClients.filter((c) => {
    try {
      const end = new Date(c.contract_end);
      return end >= now && end <= soon;
    } catch {
      return false;
    }
  });
  expiring.sort((a, b) => new Date(a.contract_end).getTime() - new Date(b.contract_end).getTime());

  const monthlyRev = selectedCurrency === 'ALL'
    ? Object.values(monthly_by_currency).reduce((s, v) => s + v, 0)
    : (monthly_by_currency[selectedCurrency] || 0);

  const yearlyRev = selectedCurrency === 'ALL'
    ? Object.values(yearly_by_currency).reduce((s, v) => s + v, 0)
    : (yearly_by_currency[selectedCurrency] || 0);

  const totalSubs = selectedCurrency === 'ALL'
    ? Object.values(subscriptions_by_currency).reduce((s, v) => s + v, 0)
    : (subscriptions_by_currency[selectedCurrency] || 0);

  res.json({
    selected_currency: selectedCurrency,
    total_contracts: filteredClients.length,
    total_subscriptions: totalSubs,
    subscriptions_by_currency,
    cleaning: { count: cleaning.length, revenue: cleaningRev },
    security: { count: security.length, revenue: securityRev },
    expiring: expiring.slice(0, 10),
    monthly_revenue: monthlyRev,
    yearly_revenue: yearlyRev,
    monthly_by_currency,
    yearly_by_currency,
    cleaning_by_currency,
    security_by_currency,
    contracts_count_by_currency,
    active_currencies: Array.from(currencyCodes),
  });
});

// Settings
app.get('/api/settings', (req, res) => {
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  res.json(settings);
});

// Backup
app.get('/api/backup', (req, res) => {
  res.json({
    generated_at: nowIso(),
    clients,
    employees,
    transactions,
    settings,
  });
});

// Start server with Vite middleware or static serving
async function startServer() {
  let viteMiddleware: any = null;

  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      if (viteMiddleware) {
        return viteMiddleware(req, res, next);
      }
      const start = Date.now();
      const interval = setInterval(() => {
        if (viteMiddleware) {
          clearInterval(interval);
          viteMiddleware(req, res, next);
        } else if (Date.now() - start > 10000) {
          clearInterval(interval);
          next();
        }
      }, 50);
    });

    createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    })
      .then((vite) => {
        viteMiddleware = vite.middlewares;
      })
      .catch((err) => {
        console.error('Failed to create Vite server:', err);
      });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
