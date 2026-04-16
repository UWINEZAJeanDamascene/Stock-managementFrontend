/**
 * React Query hooks for Monthly Reports
 * Provides caching, loading states, and error handling for all monthly reports
 */

import { useQuery } from '@tanstack/react-query';
import { monthlyReportsApi } from '@/lib/api.monthlyReports';
import type {
  MonthlyProfitAndLoss,
  MonthlyBalanceSheet,
  MonthlyTrialBalance,
  MonthlyCashFlow,
  MonthlyStockValuation,
  MonthlySalesByCustomer,
  MonthlySalesByCategory,
  MonthlyPurchasesBySupplier,
  MonthlyARAging,
  MonthlyAPAging,
  MonthlyPayrollSummary,
  MonthlyVATReturn,
  MonthlyBankReconciliation,
  MonthlyBudgetVsActual,
  MonthlyGeneralLedger,
} from '@/lib/api.monthlyReports';

// Query keys for caching
export const monthlyReportKeys = {
  all: ['monthlyReports'] as const,
  profitAndLoss: (year: number, month: number) => [...monthlyReportKeys.all, 'profitAndLoss', year, month] as const,
  balanceSheet: (year: number, month: number) => [...monthlyReportKeys.all, 'balanceSheet', year, month] as const,
  trialBalance: (year: number, month: number) => [...monthlyReportKeys.all, 'trialBalance', year, month] as const,
  cashFlow: (year: number, month: number) => [...monthlyReportKeys.all, 'cashFlow', year, month] as const,
  stockValuation: (year: number, month: number) => [...monthlyReportKeys.all, 'stockValuation', year, month] as const,
  salesByCustomer: (year: number, month: number) => [...monthlyReportKeys.all, 'salesByCustomer', year, month] as const,
  salesByCategory: (year: number, month: number) => [...monthlyReportKeys.all, 'salesByCategory', year, month] as const,
  purchasesBySupplier: (year: number, month: number) => [...monthlyReportKeys.all, 'purchasesBySupplier', year, month] as const,
  arAging: (year: number, month: number) => [...monthlyReportKeys.all, 'arAging', year, month] as const,
  apAging: (year: number, month: number) => [...monthlyReportKeys.all, 'apAging', year, month] as const,
  payrollSummary: (year: number, month: number) => [...monthlyReportKeys.all, 'payrollSummary', year, month] as const,
  vatReturn: (year: number, month: number) => [...monthlyReportKeys.all, 'vatReturn', year, month] as const,
  bankReconciliation: (year: number, month: number) => [...monthlyReportKeys.all, 'bankReconciliation', year, month] as const,
  budgetVsActual: (year: number, month: number) => [...monthlyReportKeys.all, 'budgetVsActual', year, month] as const,
  generalLedger: (year: number, month: number) => [...monthlyReportKeys.all, 'generalLedger', year, month] as const,
};

// 1. Profit & Loss Hook
export function useMonthlyProfitAndLoss(year: number, month: number) {
  return useQuery<MonthlyProfitAndLoss, Error>({
    queryKey: monthlyReportKeys.profitAndLoss(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getProfitAndLoss(year, month);
      if (!response.success) {
        throw new Error('Failed to load profit & loss report');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,    // 10 minutes - monthly data changes less frequently
    gcTime: 60 * 60 * 1000,      // 1 hour - keep longer due to larger data
    refetchOnWindowFocus: false,
  });
}

// 2. Balance Sheet Hook
export function useMonthlyBalanceSheet(year: number, month: number) {
  return useQuery<MonthlyBalanceSheet, Error>({
    queryKey: monthlyReportKeys.balanceSheet(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getBalanceSheet(year, month);
      if (!response.success) {
        throw new Error('Failed to load balance sheet');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 3. Trial Balance Hook
export function useMonthlyTrialBalance(year: number, month: number) {
  return useQuery<MonthlyTrialBalance, Error>({
    queryKey: monthlyReportKeys.trialBalance(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getTrialBalance(year, month);
      if (!response.success) {
        throw new Error('Failed to load trial balance');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 0, // Temporarily disable caching to get fresh data
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
}

// 4. Cash Flow Hook
export function useMonthlyCashFlow(year: number, month: number) {
  return useQuery<MonthlyCashFlow, Error>({
    queryKey: monthlyReportKeys.cashFlow(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getCashFlow(year, month);
      if (!response.success) {
        throw new Error('Failed to load cash flow statement');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 5. Stock Valuation Hook
export function useMonthlyStockValuation(year: number, month: number) {
  return useQuery<MonthlyStockValuation, Error>({
    queryKey: monthlyReportKeys.stockValuation(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getStockValuation(year, month);
      if (!response.success) {
        throw new Error('Failed to load stock valuation report');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 6. Sales by Customer Hook
export function useMonthlySalesByCustomer(year: number, month: number) {
  return useQuery<MonthlySalesByCustomer, Error>({
    queryKey: monthlyReportKeys.salesByCustomer(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getSalesByCustomer(year, month);
      if (!response.success) {
        throw new Error('Failed to load sales by customer report');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 7. Sales by Category Hook
export function useMonthlySalesByCategory(year: number, month: number) {
  return useQuery<MonthlySalesByCategory, Error>({
    queryKey: monthlyReportKeys.salesByCategory(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getSalesByCategory(year, month);
      if (!response.success) {
        throw new Error('Failed to load sales by category report');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 8. Purchases by Supplier Hook
export function useMonthlyPurchasesBySupplier(year: number, month: number) {
  return useQuery<MonthlyPurchasesBySupplier, Error>({
    queryKey: monthlyReportKeys.purchasesBySupplier(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getPurchasesBySupplier(year, month);
      if (!response.success) {
        throw new Error('Failed to load purchases by supplier report');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 9. AR Aging Hook
export function useMonthlyARAging(year: number, month: number) {
  return useQuery<MonthlyARAging, Error>({
    queryKey: monthlyReportKeys.arAging(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getARAging(year, month);
      if (!response.success) {
        throw new Error('Failed to load AR aging report');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 10. AP Aging Hook
export function useMonthlyAPAging(year: number, month: number) {
  return useQuery<MonthlyAPAging, Error>({
    queryKey: monthlyReportKeys.apAging(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getAPAging(year, month);
      if (!response.success) {
        throw new Error('Failed to load AP aging report');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 11. Payroll Summary Hook
export function useMonthlyPayrollSummary(year: number, month: number) {
  return useQuery<MonthlyPayrollSummary, Error>({
    queryKey: monthlyReportKeys.payrollSummary(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getPayrollSummary(year, month);
      if (!response.success) {
        throw new Error('Failed to load payroll summary');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 12. VAT Return Hook
export function useMonthlyVATReturn(year: number, month: number) {
  return useQuery<MonthlyVATReturn, Error>({
    queryKey: monthlyReportKeys.vatReturn(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getVATReturn(year, month);
      if (!response.success) {
        throw new Error('Failed to load VAT return');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
}

// 13. Bank Reconciliation Hook
export function useMonthlyBankReconciliation(year: number, month: number) {
  return useQuery<MonthlyBankReconciliation, Error>({
    queryKey: monthlyReportKeys.bankReconciliation(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getBankReconciliation(year, month);
      if (!response.success) {
        throw new Error('Failed to load bank reconciliation');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 14. Budget vs Actual Hook
export function useMonthlyBudgetVsActual(year: number, month: number) {
  return useQuery<MonthlyBudgetVsActual, Error>({
    queryKey: monthlyReportKeys.budgetVsActual(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getBudgetVsActual(year, month);
      if (!response.success) {
        throw new Error('Failed to load budget vs actual report');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 15. General Ledger Hook
export function useMonthlyGeneralLedger(year: number, month: number) {
  return useQuery<MonthlyGeneralLedger, Error>({
    queryKey: monthlyReportKeys.generalLedger(year, month),
    queryFn: async () => {
      const response = await monthlyReportsApi.getGeneralLedger(year, month);
      if (!response.success) {
        throw new Error('Failed to load general ledger');
      }
      return response.data;
    },
    enabled: !!year && !!month,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
