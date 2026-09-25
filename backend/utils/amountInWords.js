/**
 * Convert number to Indian Currency words (Rupees and Paise)
 * e.g. 43265.25 -> "Rupees Forty Three Thousand Two Hundred Sixty Five and Twenty Five Paise Only"
 */

const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertBelowThousand(n) {
  let str = '';
  if (n >= 100) {
    str += ones[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  } else if (n > 0) {
    str += ones[n];
  }
  return str.trim();
}

export function numberToWordsIndian(num) {
  if (num === 0 || isNaN(num)) return 'Rupees Zero Only';

  const parts = Number(num).toFixed(2).split('.');
  let integerPart = parseInt(parts[0], 10);
  const decimalPart = parseInt(parts[1], 10);

  if (integerPart === 0 && decimalPart === 0) return 'Rupees Zero Only';

  let words = '';

  const crore = Math.floor(integerPart / 10000000);
  integerPart %= 10000000;

  const lakh = Math.floor(integerPart / 100000);
  integerPart %= 100000;

  const thousand = Math.floor(integerPart / 1000);
  integerPart %= 1000;

  const remaining = integerPart;

  if (crore > 0) {
    words += convertBelowThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertBelowThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertBelowThousand(thousand) + ' Thousand ';
  }
  if (remaining > 0) {
    words += convertBelowThousand(remaining) + ' ';
  }

  words = words.trim();

  let result = 'Rupees ' + (words ? words : 'Zero');

  if (decimalPart > 0) {
    result += ' and ' + convertBelowThousand(decimalPart) + ' Paise';
  }

  result += ' Only';

  // Capitalize neatly
  return result.replace(/\s+/g, ' ').trim();
}

export default numberToWordsIndian;
