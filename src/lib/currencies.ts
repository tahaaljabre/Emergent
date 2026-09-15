export interface CurrencyOption {
  code: string;
  symbol: string;
  name_ar: string;
  name_en: string;
  tafqeet_ar: string;
}

export const DEFAULT_CURRENCIES: CurrencyOption[] = [
  {
    code: 'YER',
    symbol: 'ر.ي',
    name_ar: 'ريال يمني',
    name_en: 'Yemeni Rial',
    tafqeet_ar: 'ريال يمني',
  },
  {
    code: 'SAR',
    symbol: 'ر.س',
    name_ar: 'ريال سعودي',
    name_en: 'Saudi Riyal',
    tafqeet_ar: 'ريال سعودي',
  },
  {
    code: 'USD',
    symbol: '$',
    name_ar: 'دولار أمريكي',
    name_en: 'US Dollar',
    tafqeet_ar: 'دولار أمريكي',
  },
  {
    code: 'AED',
    symbol: 'د.إ',
    name_ar: 'درهم إماراتي',
    name_en: 'UAE Dirham',
    tafqeet_ar: 'درهم إماراتي',
  },
  {
    code: 'QAR',
    symbol: 'ر.ق',
    name_ar: 'ريال قطري',
    name_en: 'Qatari Riyal',
    tafqeet_ar: 'ريال قطري',
  },
  {
    code: 'OMR',
    symbol: 'ر.ع',
    name_ar: 'ريال عماني',
    name_en: 'Omani Rial',
    tafqeet_ar: 'ريال عماني',
  },
  {
    code: 'KWD',
    symbol: 'د.ك',
    name_ar: 'دينار كويتي',
    name_en: 'Kuwaiti Dinar',
    tafqeet_ar: 'دينار كويتي',
  },
  {
    code: 'BHD',
    symbol: 'د.ب',
    name_ar: 'دينار بحريني',
    name_en: 'Bahraini Dinar',
    tafqeet_ar: 'دينار بحريني',
  },
  {
    code: 'EUR',
    symbol: '€',
    name_ar: 'يورو',
    name_en: 'Euro',
    tafqeet_ar: 'يورو',
  },
];

export function getCurrencyInfo(
  currencyCodeOrSymbol?: string | null,
  customList: CurrencyOption[] = DEFAULT_CURRENCIES
): CurrencyOption {
  if (!currencyCodeOrSymbol) {
    return DEFAULT_CURRENCIES[0]; // Yemeni Rial by default or first
  }
  const clean = currencyCodeOrSymbol.trim();
  const match = customList.find(
    (c) =>
      c.code.toUpperCase() === clean.toUpperCase() ||
      c.symbol === clean ||
      c.name_ar === clean ||
      c.name_en.toLowerCase() === clean.toLowerCase()
  );
  if (match) return match;

  // Fallback for custom currencies
  return {
    code: clean,
    symbol: clean,
    name_ar: clean,
    name_en: clean,
    tafqeet_ar: clean,
  };
}
