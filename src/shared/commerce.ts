export type Language = 'fr' | 'en' | 'ht';
export type Currency = 'USD' | 'HTG' | 'EUR';
export type UserRole = 'admin' | 'seller' | 'buyer';
export type PaymentMethod = 'moncash' | 'natcash' | 'paypal' | 'usdt_bep20';

export const PLATFORM_COMMISSION_RATE = 0.05; // Fixed 5% platform fee

export const CURRENCY_RATES: Record<Currency, number> = {
  USD: 1.0,
  HTG: 132.5,
  EUR: 0.92,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  HTG: 'HTG ',
  EUR: '€',
};

export const PRODUCT_TYPES = [
  'ebook_pdf',
  'digital_book',
  'word_doc',
  'excel_template',
  'video_course',
  'online_course',
  'audio_file',
  'graphic_template',
  'canva_template',
  'software_app',
  'digital_image',
  'ai_prompts',
  'educational_resource',
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export interface CommissionSplit {
  grossUsdCents: number;
  platformCommissionUsdCents: number;
  sellerNetUsdCents: number;
}

/**
 * Computes the exact 5% platform commission and 95% seller gross-net split in integer USD cents.
 * Guarantees platformCommissionUsdCents + sellerNetUsdCents === grossUsdCents.
 */
export function calculateCommissionSplit(grossUsdCents: number): CommissionSplit {
  if (!Number.isInteger(grossUsdCents) || grossUsdCents < 0) {
    throw new Error('grossUsdCents must be a non-negative integer');
  }
  const platformCommissionUsdCents = Math.round(grossUsdCents * PLATFORM_COMMISSION_RATE);
  const sellerNetUsdCents = grossUsdCents - platformCommissionUsdCents;
  return {
    grossUsdCents,
    platformCommissionUsdCents,
    sellerNetUsdCents,
  };
}

/**
 * Computes separate payment gateway fee in USD cents (distinct from the 5% platform fee).
 */
export function calculateProviderFeeUsdCents(
  subtotalUsdCents: number,
  feePercentScaled: number,
  feeFixedUsdCents: number
): number {
  if (subtotalUsdCents <= 0) return 0;
  const percentFee = Math.round((subtotalUsdCents * feePercentScaled) / 10000);
  return percentFee + Math.max(0, feeFixedUsdCents);
}

/**
 * Converts USD cents to display cents in the target currency.
 */
export function convertUsdCentsToCurrencyCents(usdCents: number, currency: Currency): number {
  const rate = CURRENCY_RATES[currency] ?? 1.0;
  return Math.round(usdCents * rate);
}

/**
 * Formats an amount stored in USD cents into the requested display currency.
 */
export function formatMoneyFromUsdCents(usdCents: number, currency: Currency): string {
  const convertedCents = convertUsdCentsToCurrencyCents(usdCents, currency);
  const amount = convertedCents / 100;
  if (currency === 'HTG') {
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG`;
  }
  if (currency === 'EUR') {
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

export function formatOrderCurrencyCents(displayCents: number, currency: Currency): string {
  const amount = displayCents / 100;
  if (currency === 'HTG') {
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} HTG`;
  }
  if (currency === 'EUR') {
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

export function slugifyText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidBep20Address(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export function sanitizeText(input: string, maxLength = 2000): string {
  return input.replace(/[<>]/g, '').trim().slice(0, maxLength);
}
