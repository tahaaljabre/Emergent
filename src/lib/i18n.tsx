import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lang } from '../types';

const dict = {
  ar: {
    // Tabs & Navigation
    dashboard: 'لوحة القيادة',
    clients: 'العملاء',
    employees: 'الموظفون',
    settings: 'الإعدادات',
    archive: 'الأرشيف',
    reports: 'التقارير',
    statement: 'كشف الحساب',

    // Common actions
    save: 'حفظ',
    cancel: 'إلغاء',
    edit: 'تعديل',
    delete: 'حذف',
    confirm_delete: 'تأكيد الحذف',
    delete_prompt: 'هل أنت متأكد من رغبتك في حذف هذا السجل نهائياً؟',
    archive_item: 'أرشفة',
    restore: 'استعادة',
    add: 'إضافة',
    search: 'بحث بالاسم، الهاتف، أو الموقع...',
    confirm: 'تأكيد',
    loading: 'جاري التحميل...',
    empty: 'لا توجد بيانات مسجلة',
    saved: 'تم الحفظ بنجاح',
    close: 'إغلاق',
    back: 'رجوع',
    actions: 'الإجراءات',
    all: 'الكل',
    filter: 'تصفية',
    print: 'طباعة',
    export_json: 'تصدير نسخة احتياطية',
    reset_data: 'إعادة ضبط البيانات الافتراضية',
    reset_confirm: 'سيتم إعادة ضبط البيانات إلى القيم التجريبية الافتراضية، هل توافق؟',

    // Services & Roles
    services: 'الخدمات',
    cleaning: 'تنظيف ونظافة',
    cleaning_short: 'نظافة',
    security: 'حراسات أمنية',
    security_short: 'أمن وحراسة',

    // Statuses
    status: 'الحالة',
    active: 'ساري ومفعل',
    expiring_soon: 'ينتهي قريباً',
    expired: 'منتهي الصلاحية',
    archived_status: 'مؤرشف',

    // Dashboard
    total_contracts: 'إجمالي العقود النشطة',
    active_clients: 'عرض العملاء النشطين',
    total_subscriptions: 'إجمالي الاشتراكات الشهرية',
    monthly_revenue: 'تحصيلات الشهر الحالي',
    yearly_revenue: 'تحصيلات العام الحالي',
    expiring_contracts: 'عقود تنتهي خلال 30 يوماً',
    no_expiring: 'لا توجد عقود قاربت على الانتهاء',
    quick_renew: 'تجديد فوري',
    cleaning_service_stats: 'عقود النظافة',
    security_service_stats: 'عقود الحراسات الأمنية',
    quick_actions: 'إجراءات سريعة',
    add_client_quick: 'إضافة عميل جديد',
    add_employee_quick: 'إضافة موظف جديد',

    // Clients
    add_client: 'إضافة عميل جديد',
    edit_client: 'تعديل بيانات العميل',
    client_name: 'اسم العميل / المنشأة',
    address: 'العنوان والموقع',
    phone: 'رقم الهاتف / الجوال',
    contract_amount: 'قيمة العقد الشهري',
    contract_start: 'تاريخ بداية العقد',
    contract_end: 'تاريخ نهاية العقد',
    service_type: 'نوع الخدمة',
    renew_contract: 'تجديد العقد',
    renewal_period: 'مدة التجديد بالشهور',
    months_count: 'شهر',
    days_left: 'يوم متبقي',

    // Employees
    add_employee: 'إضافة موظف جديد',
    edit_employee: 'تعديل بيانات الموظف',
    employee_name: 'اسم الموظف',
    role: 'المسمى الوظيفي',
    assignment: 'موقع العمل المعين به',
    salary: 'الراتب الشهري',

    // Statement & Transactions
    account_statement: 'كشف حساب مالي',
    statement_subtitle: 'سجل العمليات المالية والمطالبات والمقبوضات',
    current_balance: 'الرصيد الحالي',
    total_due: 'إجمالي المطالبات المستحقة',
    total_paid: 'إجمالي المدفوعات المسددة',
    owed_to_office: 'مستحق للمكتب',
    owed_to_entity: 'مستحق للموظف',
    balanced: 'الحساب خالص ومطابق',
    add_transaction: 'إضافة حركة مالية',
    edit_transaction: 'تعديل الحركة المالية',
    txn_kind: 'نوع السند / الحركة',
    charge: 'استحقاق مالي (مطالبة / راتب)',
    receipt_voucher: 'سند قبض (استلام أموال من العميل)',
    disbursement_voucher: 'سند صرف (صرف راتب / مستحقات للموظف)',
    description: 'البيان والتفاصيل',
    amount: 'المبلغ',
    date: 'تاريخ المعاملة',
    print_voucher: 'طباعة كشف الحساب / السند',
    signature_officer: 'توقيع وتعميد المسؤول',
    signature_party: 'توقيع المستلم / العميل',

    // Voucher actions & Printing
    voucher_actions: 'إجراءات السند',
    voucher_no: 'رقم السند',
    edit_voucher: 'تعديل السند',
    print_voucher_pdf: 'طباعة السند (PDF)',
    print_voucher_image: 'طباعة / حفظ كصورة',
    share_voucher: 'مشاركة مباشرة',
    share_voucher_pdf: 'مشاركة كـ PDF',
    share_voucher_image: 'مشاركة كصورة',
    archive_voucher: 'أرشفة السند',
    delete_voucher: 'حذف السند',
    received_from: 'استلمنا من المكرم',
    paid_to: 'صرفنا إلى المكرم',
    amount_in_words: 'المبلغ كتابة',
    for_reason: 'وذلك عن',
    accountant: 'المحاسب المسؤول',
    recipient: 'المستلم',
    manager: 'المدير العام / المسؤول',
    official_stamp: 'الختم الرسمي',
    copy_voucher_text: 'نسخ نص السند',
    voucher_copied: 'تم نسخ بيانات السند بنجاح',
    preview_voucher: 'معاينة السند الرسمي',

    // Archive
    archived_clients: 'العملاء المؤرشفون',
    archived_employees: 'الموظفون المؤرشفون',
    archived_transactions: 'المعاملات المؤرشفة',
    empty_archive: 'الأرشيف فارغ حالياً',

    // Reports
    reports_title: 'التقارير المالية والتشغيلية',
    revenue_summary: 'ملخص التحصيلات والإيرادات',
    service_distribution: 'توزيع الإيرادات حسب نوع الخدمة',
    financial_health: 'الموقف المالي العام',

    // Settings
    office_info: 'بيانات المكتب والفرع',
    office_name: 'اسم المنشأة / المكتب',
    currency: 'رمز العملة',
    system_preferences: 'تفضيلات النظام',
    language: 'لغة الواجهة',
    theme: 'المظهر',
    light: 'فاتح',
    dark: 'داكن',
    backup_restore: 'النسخ الاحتياطي وإدارة البيانات',

    // Office Logo & Brand
    office_logo: 'شعار المكتب / المنشأة',
    upload_logo: 'رفع صورة الشعار',
    change_logo: 'تغيير الشعار',
    remove_logo: 'حذف الشعار',
    logo_help: 'يتم جلب هذا الشعار واستخدامه تلقائياً في كافة السندات المالية، كشوفات الحسابات، والتقارير والطباعة.',
    logo_size_hint: 'يفضل صورة مربعة أو أفقية واضحة (PNG أو JPG)',
    logo_uploaded_success: 'تم تحديث الشعار بنجاح',
    logo_removed_success: 'تم حذف الشعار بنجاح',

    // Developer & Footer
    developer_label: 'تطوير وتصميم',
    developer_name: 'طه اليافعي',
    contact_developer: 'تواصل مع المطور',
    contact_whatsapp: 'تواصل عبر واتساب',
    system_rights: 'نظام إدارة عقود النظافة والحراسات الأمنية',
    phone_label: 'الهاتف',
    address_label: 'العنوان',
    all_rights_reserved: 'جميع الحقوق محفوظة',

    // Extra UI titles & subtitles
    dashboard_desc: 'متابعة العقود، التحصيلات، الموظفين، وتنبيهات تجديد العقود في مكان واحد',
    reports_desc: 'تحليل أداء العقود والتحصيلات والتكاليف التشغيلية',
    settings_desc: 'إعدادات بيانات المكتب، الشعار، اللغة، والنسخ الاحتياطي',
    issue_date: 'تاريخ الإصدار',
    contracts_count: 'عقد',
    active_staff_count: 'موظف على رأس العمل',
    operational_margin: 'هامش التشغيل الشهري التقديري',
    margin_diff_note: 'الفارق بين عقود العملاء ورواتب الموظفين',
    month_collections_note: 'سندات القبض المسجلة والمحصلة فعلياً خلال الشهر الجاري',
    year_collections_note: 'إجمالي المقبوضات المحصلة من عقود العملاء خلال هذا العام',
    client_monthly_rev: 'إجمالي إيرادات العقود الشهرية',
    staff_monthly_salaries: 'إجمالي الرواتب الشهرية للموظفين',

    // Multi-currency support
    contract_currency: 'عملة العقد',
    salary_currency: 'عملة الراتب',
    txn_currency: 'عملة الحركة / السند',
    currency_select: 'اختيار العملة',
    currencies_management: 'إدارة العملات المدعومة',
    all_currencies: 'كافة العملات',
    currency_breakdown: 'الفصل والتقسيم حسب العملة',
    separated_by_currency: 'جداول الحركات مفصولة حسب كل عملة',
    balance_per_currency: 'الأرصدة مفصولة لكل عملة',
    filter_by_currency: 'عرض حسب العملة',
    add_custom_currency: 'إضافة عملة جديدة',
    currency_code: 'رمز العملة (مثل YER, SAR, USD)',
    currency_symbol: 'علامة العملة (مثل ر.ي، ر.س، $)',
    currency_name: 'اسم العملة',
    custom_currencies_count: 'عملة مفعلة في النظام',
    print_error_notice: 'تم فتح نافذة الطباعة المنفصلة بنجاح لتفادي أي خطأ في المتصفح',
  },
  en: {
    // Tabs & Navigation
    dashboard: 'Dashboard',
    clients: 'Clients',
    employees: 'Employees',
    settings: 'Settings',
    archive: 'Archive',
    reports: 'Reports',
    statement: 'Statement',

    // Common actions
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    confirm_delete: 'Confirm Delete',
    delete_prompt: 'Are you sure you want to permanently delete this record?',
    archive_item: 'Archive',
    restore: 'Restore',
    add: 'Add',
    search: 'Search by name, phone, or location...',
    confirm: 'Confirm',
    loading: 'Loading...',
    empty: 'No records found',
    saved: 'Saved successfully',
    close: 'Close',
    back: 'Back',
    actions: 'Actions',
    all: 'All',
    filter: 'Filter',
    print: 'Print',
    export_json: 'Export Backup',
    reset_data: 'Reset Default Demo Data',
    reset_confirm: 'This will reset all data to default demo state. Continue?',

    // Services & Roles
    services: 'Services',
    cleaning: 'Cleaning Services',
    cleaning_short: 'Cleaning',
    security: 'Security Services',
    security_short: 'Security',

    // Statuses
    status: 'Status',
    active: 'Active',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
    archived_status: 'Archived',

    // Dashboard
    total_contracts: 'Total Active Contracts',
    active_clients: 'View Active Clients',
    total_subscriptions: 'Total Monthly Subscriptions',
    monthly_revenue: 'This Month Collections',
    yearly_revenue: 'This Year Collections',
    expiring_contracts: 'Contracts Expiring in 30 Days',
    no_expiring: 'No contracts expiring soon',
    quick_renew: 'Renew Now',
    cleaning_service_stats: 'Cleaning Contracts',
    security_service_stats: 'Security Contracts',
    quick_actions: 'Quick Actions',
    add_client_quick: 'New Client',
    add_employee_quick: 'New Employee',

    // Clients
    add_client: 'Add New Client',
    edit_client: 'Edit Client',
    client_name: 'Client / Company Name',
    address: 'Address & Location',
    phone: 'Phone Number',
    contract_amount: 'Monthly Contract Value',
    contract_start: 'Contract Start Date',
    contract_end: 'Contract End Date',
    service_type: 'Service Type',
    renew_contract: 'Renew Contract',
    renewal_period: 'Renewal Period (Months)',
    months_count: 'Months',
    days_left: 'days left',

    // Employees
    add_employee: 'Add New Employee',
    edit_employee: 'Edit Employee',
    employee_name: 'Employee Name',
    role: 'Designation / Role',
    assignment: 'Assigned Site Location',
    salary: 'Monthly Salary',

    // Statement & Transactions
    account_statement: 'Account Statement',
    statement_subtitle: 'Financial ledger of billings, receipts and disbursements',
    current_balance: 'Current Balance',
    total_due: 'Total Charges Due',
    total_paid: 'Total Payments Made',
    owed_to_office: 'Owed to Office',
    owed_to_entity: 'Owed to Staff',
    balanced: 'Settled & Balanced',
    add_transaction: 'Add Transaction',
    edit_transaction: 'Edit Transaction',
    txn_kind: 'Transaction Kind',
    charge: 'Charge / Billing',
    receipt_voucher: 'Receipt Voucher (From Client)',
    disbursement_voucher: 'Disbursement Voucher (Paid to Staff)',
    description: 'Description',
    amount: 'Amount',
    date: 'Date',
    print_voucher: 'Print Statement / Voucher',
    signature_officer: 'Authorized Officer Signature',
    signature_party: 'Recipient / Client Signature',

    // Voucher actions & Printing
    voucher_actions: 'Voucher Actions',
    voucher_no: 'Voucher No.',
    edit_voucher: 'Edit Voucher',
    print_voucher_pdf: 'Print Voucher (PDF)',
    print_voucher_image: 'Save as Image (PNG)',
    share_voucher: 'Direct Share',
    share_voucher_pdf: 'Share as PDF',
    share_voucher_image: 'Share as Image',
    archive_voucher: 'Archive Voucher',
    delete_voucher: 'Delete Voucher',
    received_from: 'Received From',
    paid_to: 'Paid To',
    amount_in_words: 'Amount in Words',
    for_reason: 'For / Purpose',
    accountant: 'Accountant',
    recipient: 'Recipient',
    manager: 'General Manager',
    official_stamp: 'Official Stamp',
    copy_voucher_text: 'Copy Voucher Text',
    voucher_copied: 'Voucher text copied to clipboard',
    preview_voucher: 'Preview Official Voucher',

    // Archive
    archived_clients: 'Archived Clients',
    archived_employees: 'Archived Employees',
    archived_transactions: 'Archived Transactions',
    empty_archive: 'The archive is currently empty',

    // Reports
    reports_title: 'Financial & Operations Reports',
    revenue_summary: 'Collections & Revenue Summary',
    service_distribution: 'Revenue by Service Type',
    financial_health: 'Overall Financial Status',

    // Settings
    office_info: 'Office Information',
    office_name: 'Office / Company Name',
    currency: 'Currency Symbol',
    system_preferences: 'System Preferences',
    language: 'Interface Language',
    theme: 'Appearance',
    light: 'Light',
    dark: 'Dark',
    backup_restore: 'Backup & Data Management',

    // Office Logo & Brand
    office_logo: 'Office / Company Logo',
    upload_logo: 'Upload Logo Image',
    change_logo: 'Change Logo',
    remove_logo: 'Remove Logo',
    logo_help: 'This logo will be automatically used across all vouchers, account statements, reports, and printouts.',
    logo_size_hint: 'Recommended square or landscape image (PNG or JPG)',
    logo_uploaded_success: 'Logo updated successfully',
    logo_removed_success: 'Logo removed successfully',

    // Developer & Footer
    developer_label: 'Design & Development',
    developer_name: 'Taha Al-Yafei',
    contact_developer: 'Contact Developer',
    contact_whatsapp: 'Contact on WhatsApp',
    system_rights: 'Cleaning & Security Contracts Management System',
    phone_label: 'Phone',
    address_label: 'Address',
    all_rights_reserved: 'All rights reserved',

    // Extra UI titles & subtitles
    dashboard_desc: 'Track contracts, collections, employees, and upcoming renewals in one place',
    reports_desc: 'Performance analysis of contracts, collections, and operational costs',
    settings_desc: 'Office profile, company logo, language preferences, and backups',
    issue_date: 'Issue Date',
    contracts_count: 'contracts',
    active_staff_count: 'active employees',
    operational_margin: 'Estimated Monthly Operational Margin',
    margin_diff_note: 'Difference between client contracts and staff salaries',
    month_collections_note: 'Receipt vouchers collected during the current month',
    year_collections_note: 'Total receipts collected from client contracts this year',
    client_monthly_rev: 'Total Monthly Contracts Revenue',
    staff_monthly_salaries: 'Total Monthly Staff Salaries',

    // Multi-currency support
    contract_currency: 'Contract Currency',
    salary_currency: 'Salary Currency',
    txn_currency: 'Transaction Currency',
    currency_select: 'Select Currency',
    currencies_management: 'Supported Currencies',
    all_currencies: 'All Currencies',
    currency_breakdown: 'Breakdown by Currency',
    separated_by_currency: 'Transactions Separated by Currency',
    balance_per_currency: 'Balances by Currency',
    filter_by_currency: 'Filter by Currency',
    add_custom_currency: 'Add New Currency',
    currency_code: 'Currency Code (e.g. YER, SAR, USD)',
    currency_symbol: 'Currency Symbol (e.g. ر.ي, ر.س, $)',
    currency_name: 'Currency Name',
    custom_currencies_count: 'Active currencies',
    print_error_notice: 'Direct print window opened successfully',
  },
};

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof dict['ar']) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'ar',
  setLang: () => {},
  t: (key) => key,
  isRTL: true,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('app_lang') as Lang) || 'ar';
  });

  const setLang = (newLang: Lang) => {
    localStorage.setItem('app_lang', newLang);
    setLangState(newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const t = (key: keyof typeof dict['ar']): string => {
    return dict[lang][key] || dict['ar'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isRTL: lang === 'ar' }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);

