/**
 * Currency Utilities
 * 
 * Provides consistent currency formatting across the application.
 * Always uses company/settings currency instead of defaulting to USD.
 */

import { useCurrency } from '@/contexts/CurrencyContext';

/**
 * Format currency amount with proper symbol
 * Uses the global displayCurrency from CurrencyContext
 */
export function useFormatCurrency() {
  const { formatCurrency, displayCurrency } = useCurrency();
  
  return (amount: number | any, overrideCurrency?: string): string => {
    const num = typeof amount === 'number' ? amount : Number(amount) || 0;
    const currency = overrideCurrency || displayCurrency || 'FRW';
    return formatCurrency(num, currency);
  };
}

/**
 * Standalone format currency function (for use outside React components)
 * Falls back to FRW if no currency provided
 */
export function formatCurrency(
  amount: number | any,
  currency: string = 'FRW'
): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency 
  }).format(num);
}

/**
 * Format currency with document-specific currency code
 * Use this when you have a document with its own currency (e.g., invoice, credit note)
 */
export function formatDocumentCurrency(
  amount: number | any,
  documentCurrencyCode?: string,
  overrideCurrency?: string
): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  const currency = overrideCurrency || documentCurrencyCode || 'FRW';
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency 
  }).format(num);
}

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  FRW: 'FRw',
  LBP: 'ل.ل',
  SAR: 'ر.س',
  AED: 'د.إ',
  TZS: 'TSh',
  UGX: 'USh',
  KES: 'KSh',
  BIF: 'FBu',
  ZMW: 'ZK',
  MWK: 'MK',
  AOA: 'Kz'
};

/**
 * Get currency symbol for display
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Format amount with currency symbol only (no ISO code)
 */
export function formatWithSymbol(
  amount: number | any,
  currency: string = 'FRW'
): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  const symbol = getCurrencySymbol(currency);
  const formatted = num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbol} ${formatted}`;
}
