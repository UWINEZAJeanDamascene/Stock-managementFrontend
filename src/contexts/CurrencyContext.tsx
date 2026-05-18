import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { exchangeRatesApi, type ExchangeRateData, type CurrencyInfo } from '@/lib/api';

interface CurrencyContextType {
  baseCurrency: string;
  displayCurrency: string;
  rates: ExchangeRateData | null;
  currencies: CurrencyInfo[];
  loading: boolean;
  error: string | null;
  setDisplayCurrency: (currency: string) => void;
  setBaseCurrency: (currency: string) => void;
  refreshRates: () => Promise<void>;
  convertAmount: (amount: number, from?: string) => number;
  formatCurrency: (amount: number, from?: string) => string;
  getCurrencySymbol: (currency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  RWF: 'RWF',
  FRW: 'RWF',
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

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [baseCurrency, setBaseCurrency] = useState<string>('RWF');
  const [displayCurrency, setDisplayCurrency] = useState<string>('RWF');
  const [rates, setRates] = useState<ExchangeRateData | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const currenciesRes = await exchangeRatesApi.getCurrencies();
        if (currenciesRes.success) {
          setCurrencies(currenciesRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch currencies:', err);
      }
    };
    fetchCurrencies();
  }, []);

  const refreshRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ratesRes = await exchangeRatesApi.getRates();
      if (ratesRes.success) {
        setRates(ratesRes.data.rates);
      }
    } catch (err) {
      console.error('Failed to fetch exchange rates:', err);
      setError('Failed to load exchange rates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshRates();
    const interval = setInterval(refreshRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshRates]);

  const convertAmount = useCallback((amount: number, from?: string): number => {
    if (!rates) return amount;
    const sourceCurrency = from || baseCurrency;
    if (sourceCurrency === displayCurrency) {
      return amount;
    }
    const rateToUSD = rates[sourceCurrency as keyof ExchangeRateData] || 1;
    const rateFromUSD = rates[displayCurrency as keyof ExchangeRateData] || 1;
    const amountInUSD = amount / rateToUSD;
    const convertedAmount = amountInUSD * rateFromUSD;
    return Math.round(convertedAmount * 100) / 100;
  }, [rates, baseCurrency, displayCurrency]);

  const formatCurrency = useCallback((amount: number, from?: string): string => {
    const convertedAmount = convertAmount(amount, from);
    const symbol = getCurrencySymbol(displayCurrency);
    const formatted = convertedAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${symbol} ${formatted}`;
  }, [convertAmount, displayCurrency]);

  const getCurrencySymbol = useCallback((currency?: string): string => {
    const curr = currency || displayCurrency;
    return CURRENCY_SYMBOLS[curr] || curr;
  }, [displayCurrency]);

  const value: CurrencyContextType = {
    baseCurrency,
    displayCurrency,
    rates,
    currencies,
    loading,
    error,
    setDisplayCurrency,
    setBaseCurrency,
    refreshRates,
    convertAmount,
    formatCurrency,
    getCurrencySymbol
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    // Provide a safe fallback so components rendered outside a provider won't crash.
    const fallback: CurrencyContextType = {
      baseCurrency: 'RWF',
      displayCurrency: 'RWF',
      rates: null,
      currencies: [],
      loading: false,
      error: null,
      setDisplayCurrency: () => {},
      setBaseCurrency: () => {},
      refreshRates: async () => {},
      convertAmount: (amount: number) => amount,
      formatCurrency: (amount: number) => {
        const num = typeof amount === 'number' ? amount : Number(amount) || 0;
        const symbol = CURRENCY_SYMBOLS['RWF'] || 'RWF';
        const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return `${symbol} ${formatted}`;
      },
      getCurrencySymbol: (currency?: string) => {
        const curr = currency || 'RWF';
        return CURRENCY_SYMBOLS[curr] || curr;
      }
    };
    return fallback;
  }
  return context;
}

export default CurrencyContext;
