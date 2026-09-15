/**
 * Arabic number to words (Tafqeet) helper for financial vouchers
 */

const ONES = [
  '',
  'واحد',
  'اثنان',
  'ثلاثة',
  'أربعة',
  'خمسة',
  'ستة',
  'سبعة',
  'ثمانية',
  'تسعة',
  'عشرة',
  'أحد عشر',
  'اثنا عشر',
  'ثلاثة عشر',
  'أربعة عشر',
  'خمسة عشر',
  'ستة عشر',
  'سبعة عشر',
  'ثمانية عشر',
  'تسعة عشر',
];

const TENS = [
  '',
  '',
  'عشرون',
  'ثلاثون',
  'أربعون',
  'خمسون',
  'ستون',
  'سبعون',
  'ثمانون',
  'تسعون',
];

const HUNDREDS = [
  '',
  'مائة',
  'مئتان',
  'ثلاثمائة',
  'أربعمائة',
  'خمسمائة',
  'ستمائة',
  'سبعمائة',
  'ثمانمائة',
  'تسعمائة',
];

function convertThreeDigits(num: number): string {
  let res = '';
  const h = Math.floor(num / 100);
  const remainder = num % 100;

  if (h > 0) {
    res += HUNDREDS[h];
  }

  if (remainder > 0) {
    if (res.length > 0) res += ' و';
    if (remainder < 20) {
      res += ONES[remainder];
    } else {
      const o = remainder % 10;
      const t = Math.floor(remainder / 10);
      if (o > 0) {
        res += ONES[o] + ' و' + TENS[t];
      } else {
        res += TENS[t];
      }
    }
  }

  return res;
}

export function tafqeet(amount: number, currency = 'ريال يمني'): string {
  if (!amount || isNaN(amount) || amount === 0) {
    return `صفر ${currency} فقط لا غير`;
  }

  const num = Math.floor(Math.abs(amount));
  if (num === 0) return `صفر ${currency} فقط لا غير`;

  const parts: string[] = [];

  // Millions
  const millions = Math.floor(num / 1000000);
  const afterMillions = num % 1000000;

  if (millions > 0) {
    if (millions === 1) {
      parts.push('مليون');
    } else if (millions === 2) {
      parts.push('مليونان');
    } else if (millions >= 3 && millions <= 10) {
      parts.push(`${convertThreeDigits(millions)} ملايين`);
    } else {
      parts.push(`${convertThreeDigits(millions)} مليون`);
    }
  }

  // Thousands
  const thousands = Math.floor(afterMillions / 1000);
  const remainder = afterMillions % 1000;

  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('ألف');
    } else if (thousands === 2) {
      parts.push('ألفان');
    } else if (thousands >= 3 && thousands <= 10) {
      parts.push(`${convertThreeDigits(thousands)} آلاف`);
    } else {
      parts.push(`${convertThreeDigits(thousands)} ألف`);
    }
  }

  // Hundreds, tens, ones
  if (remainder > 0) {
    parts.push(convertThreeDigits(remainder));
  }

  const result = parts.join(' و');
  return `${result} ${currency} فقط لا غير`;
}
