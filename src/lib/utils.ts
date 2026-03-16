// Currency formatting utilities for Rwandan Francs (FRW)

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'FRW 0';
  return new Intl.NumberFormat('en-RW', { 
    style: 'currency', 
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCurrencyWithDecimals(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'FRW 0.00';
  return new Intl.NumberFormat('en-RW', { 
    style: 'currency', 
    currency: 'RWF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-RW').format(value);
}

// Format large numbers with K, M, B suffixes to prevent overflow in cards
// Examples: 1000 -> 1K, 1000000 -> 1M, 1000000000 -> 1B
export function formatCompactNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  return value.toLocaleString();
}
