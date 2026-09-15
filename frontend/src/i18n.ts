import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export type Lang = "ar" | "en";

const LANG_KEY = "@app_language";
let currentLang: Lang = "ar";
const listeners = new Set<() => void>();

const dict: Record<Lang, Record<string, string>> = {
  ar: {
    // Tabs
    dashboard: "لوحة القيادة",
    clients: "العملاء",
    employees: "الموظفون",
    settings: "الإعدادات",
    // Common
    save: "حفظ",
    cancel: "إلغاء",
    edit: "تعديل",
    delete: "حذف",
    archive: "أرشفة",
    restore: "استعادة",
    add: "إضافة",
    search: "بحث...",
    confirm: "تأكيد",
    loading: "جاري التحميل...",
    empty: "لا توجد بيانات",
    saved: "تم الحفظ",
    // Services
    cleaning: "تنظيف",
    security: "حراسات أمنية",
    security_short: "حراسات",
    // Statuses
    active: "نشط",
    expiring_soon: "ينتهي قريباً",
    expired: "منتهي",
    archived: "مؤرشف",
    // Dashboard
    total_contracts: "إجمالي العقود",
    total_subscriptions: "إجمالي الاشتراكات",
    active_clients: "عميل نشط",
    services: "الخدمات",
    expiring_contracts: "عقود تنتهي قريباً",
    monthly_revenue: "الإيراد الشهري",
    // Clients
    add_client: "إضافة عميل",
    edit_client: "تعديل عميل",
    client_name: "اسم العميل",
    address: "العنوان",
    phone: "الهاتف",
    contract_amount: "قيمة العقد",
    contract_start: "بداية العقد",
    contract_end: "نهاية العقد",
    service_type: "نوع الخدمة",
    tap_to_view_statement: "اضغط على أي عنصر لعرض كشف الحساب",
    // Employees
    add_employee: "إضافة موظف",
    edit_employee: "تعديل موظف",
    employee_name: "اسم الموظف",
    role: "الدور",
    assignment: "الموقع",
    salary: "الراتب",
    // Statement
    statement: "كشف الحساب",
    transactions: "المعاملات",
    current_balance: "الرصيد الحالي",
    add_transaction: "إضافة معاملة",
    description: "الوصف",
    amount: "المبلغ",
    date: "التاريخ",
    payment: "دفعة",
    charge: "استحقاق",
    export_pdf: "تنزيل PDF",
    export_image: "حفظ كصورة",
    share_pdf: "مشاركة PDF",
    pdf_preparing: "جاري تجهيز الملف...",
    pdf_error: "تعذر إنشاء ملف PDF",
    total_charges: "إجمالي الاستحقاقات",
    total_payments: "إجمالي المدفوعات",
    issued_on: "تاريخ الإصدار",
    // Settings
    office_info: "بيانات المكتب",
    office_name: "اسم المكتب",
    currency: "رمز العملة",
    logo: "الشعار",
    change_logo: "تغيير الشعار",
    management: "الإدارة",
    archive_screen: "الأرشيف",
    reports: "التقارير",
    backup: "نسخة احتياطية",
    preferences: "التفضيلات",
    appearance: "المظهر",
    light: "فاتح",
    dark: "داكن",
    system: "النظام",
    language: "اللغة",
    arabic: "العربية",
    english: "English",
    save_changes: "حفظ التغييرات",
    // Confirm
    delete_confirm: "هل تريد حذف هذا العنصر نهائياً؟",
    archive_confirm: "هل تريد أرشفة هذا العنصر؟",
    restore_confirm: "استعادة هذا العنصر؟",
    yes: "نعم",
    no: "لا",
    all: "الكل",
    clients_archive: "العملاء",
    employees_archive: "الموظفون",
    no_archived: "لا توجد عناصر مؤرشفة",
    // Reports
    revenue_report: "تقرير الإيرادات",
    total_revenue: "إجمالي الإيرادات",
    this_month: "هذا الشهر",
    this_year: "هذه السنة",
    by_service: "حسب الخدمة",
    required_field: "هذا الحقل مطلوب",
    contract_expires_in: "ينتهي خلال",
    days: "يوم",
    select_client: "اختر العميل",
    no_clients_for_role: "لا يوجد عملاء متاحون لهذا التخصص",
    manual_entry: "إدخال يدوي",
  },
  en: {
    dashboard: "Dashboard",
    clients: "Clients",
    employees: "Employees",
    settings: "Settings",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    archive: "Archive",
    restore: "Restore",
    add: "Add",
    search: "Search...",
    confirm: "Confirm",
    loading: "Loading...",
    empty: "No data",
    saved: "Saved",
    cleaning: "Cleaning",
    security: "Security",
    security_short: "Security",
    active: "Active",
    expiring_soon: "Expiring soon",
    expired: "Expired",
    archived: "Archived",
    total_contracts: "Total Contracts",
    total_subscriptions: "Total Subscriptions",
    active_clients: "active clients",
    services: "Services",
    expiring_contracts: "Expiring Contracts",
    monthly_revenue: "Monthly Revenue",
    add_client: "Add Client",
    edit_client: "Edit Client",
    client_name: "Client Name",
    address: "Address",
    phone: "Phone",
    contract_amount: "Contract Amount",
    contract_start: "Contract Start",
    contract_end: "Contract End",
    service_type: "Service Type",
    tap_to_view_statement: "Tap any item to view its statement",
    add_employee: "Add Employee",
    edit_employee: "Edit Employee",
    employee_name: "Employee Name",
    role: "Role",
    assignment: "Assignment",
    salary: "Salary",
    statement: "Statement",
    transactions: "Transactions",
    current_balance: "Current Balance",
    add_transaction: "Add Transaction",
    description: "Description",
    amount: "Amount",
    date: "Date",
    payment: "Payment",
    charge: "Charge",
    export_pdf: "Download PDF",
    export_image: "Save Image",
    share_pdf: "Share PDF",
    pdf_preparing: "Preparing file...",
    pdf_error: "Could not create the PDF",
    total_charges: "Total Charges",
    total_payments: "Total Payments",
    issued_on: "Issued on",
    office_info: "Office Info",
    office_name: "Office Name",
    currency: "Currency",
    logo: "Logo",
    change_logo: "Change Logo",
    management: "Management",
    archive_screen: "Archive",
    reports: "Reports",
    backup: "Backup",
    preferences: "Preferences",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    system: "System",
    language: "Language",
    arabic: "العربية",
    english: "English",
    save_changes: "Save Changes",
    delete_confirm: "Delete this item permanently?",
    archive_confirm: "Archive this item?",
    restore_confirm: "Restore this item?",
    yes: "Yes",
    no: "No",
    all: "All",
    clients_archive: "Clients",
    employees_archive: "Employees",
    no_archived: "No archived items",
    revenue_report: "Revenue Report",
    total_revenue: "Total Revenue",
    this_month: "This Month",
    this_year: "This Year",
    by_service: "By Service",
    required_field: "This field is required",
    contract_expires_in: "Expires in",
    days: "days",
    select_client: "Select client",
    no_clients_for_role: "No clients available for this role",
    manual_entry: "Custom entry",
  },
};

export async function loadPersistedLang() {
  try {
    const v = await AsyncStorage.getItem(LANG_KEY);
    if (v === "ar" || v === "en") {
      currentLang = v;
      listeners.forEach((l) => l());
    }
  } catch {}
}

export async function setLang(l: Lang) {
  currentLang = l;
  await AsyncStorage.setItem(LANG_KEY, l);
  listeners.forEach((cb) => cb());
}

export function getLang(): Lang {
  return currentLang;
}

export function useLang(): { lang: Lang; t: (k: string) => string; isRTL: boolean } {
  const [, setTick] = useState(0);
  useEffect(() => {
    const cb = () => setTick((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  return {
    lang: currentLang,
    t: (k: string) => dict[currentLang][k] ?? k,
    isRTL: currentLang === "ar",
  };
}

export function t(k: string): string {
  return dict[currentLang][k] ?? k;
}
