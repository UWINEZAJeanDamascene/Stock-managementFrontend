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
  SemiAnnualProfitAndLoss,
  SemiAnnualBalanceSheetTrend,
  SemiAnnualCashFlowSummary,
  SemiAnnualStockTurnover,
  SemiAnnualReceivablesCollection,
  SemiAnnualPayrollHRCost,
  SemiAnnualTaxObligations,
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
  // Semi-Annual Reports
  semiAnnual: (startYear: number, startMonth: number, endYear: number, endMonth: number) =>
    [...monthlyReportKeys.all, 'semiAnnual', startYear, startMonth, endYear, endMonth] as const,
  semiAnnualPL: (startYear: number, startMonth: number, endYear: number, endMonth: number) =>
    [...monthlyReportKeys.all, 'semiAnnual', 'pl', startYear, startMonth, endYear, endMonth] as const,
  semiAnnualBalanceSheet: (startYear: number, startMonth: number, endYear: number, endMonth: number) =>
    [...monthlyReportKeys.all, 'semiAnnual', 'balanceSheet', startYear, startMonth, endYear, endMonth] as const,
  semiAnnualCashFlow: (startYear: number, startMonth: number, endYear: number, endMonth: number) =>
    [...monthlyReportKeys.all, 'semiAnnual', 'cashFlow', startYear, startMonth, endYear, endMonth] as const,
  semiAnnualStockTurnover: (startYear: number, startMonth: number, endYear: number, endMonth: number) =>
    [...monthlyReportKeys.all, 'semiAnnual', 'stockTurnover', startYear, startMonth, endYear, endMonth] as const,
  semiAnnualReceivables: (startYear: number, startMonth: number, endYear: number, endMonth: number) =>
    [...monthlyReportKeys.all, 'semiAnnual', 'receivables', startYear, startMonth, endYear, endMonth] as const,
  semiAnnualPayroll: (startYear: number, startMonth: number, endYear: number, endMonth: number) =>
    [...monthlyReportKeys.all, 'semiAnnual', 'payroll', startYear, startMonth, endYear, endMonth] as const,
  semiAnnualTax: (startYear: number, startMonth: number, endYear: number, endMonth: number) =>
    [...monthlyReportKeys.all, 'semiAnnual', 'tax', startYear, startMonth, endYear, endMonth] as const,
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

// ============================================
// SEMI-ANNUAL REPORTS HOOKS
// ============================================

// 1. Semi-Annual Profit & Loss
export function useSemiAnnualProfitAndLoss(
  startYear: number, startMonth: number, endYear: number, endMonth: number
) {
  return useQuery<SemiAnnualProfitAndLoss, Error>({
    queryKey: monthlyReportKeys.semiAnnualPL(startYear, startMonth, endYear, endMonth),
    queryFn: async () => {
      const response = await monthlyReportsApi.getSemiAnnualProfitAndLoss(startYear, startMonth, endYear, endMonth);
      if (!response.success) {
        throw new Error('Failed to load semi-annual profit & loss report');
      }
      return response.data;
    },
    enabled: !!startYear && !!startMonth && !!endYear && !!endMonth,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 2. Semi-Annual Balance Sheet Trend
export function useSemiAnnualBalanceSheetTrend(
  startYear: number, startMonth: number, endYear: number, endMonth: number
) {
  return useQuery<SemiAnnualBalanceSheetTrend, Error>({
    queryKey: monthlyReportKeys.semiAnnualBalanceSheet(startYear, startMonth, endYear, endMonth),
    queryFn: async () => {
      const response = await monthlyReportsApi.getSemiAnnualBalanceSheetTrend(startYear, startMonth, endYear, endMonth);
      if (!response.success) {
        throw new Error('Failed to load semi-annual balance sheet trend');
      }
      return response.data;
    },
    enabled: !!startYear && !!startMonth && !!endYear && !!endMonth,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 3. Semi-Annual Cash Flow Summary
export function useSemiAnnualCashFlowSummary(
  startYear: number, startMonth: number, endYear: number, endMonth: number
) {
  return useQuery<SemiAnnualCashFlowSummary, Error>({
    queryKey: monthlyReportKeys.semiAnnualCashFlow(startYear, startMonth, endYear, endMonth),
    queryFn: async () => {
      const response = await monthlyReportsApi.getSemiAnnualCashFlowSummary(startYear, startMonth, endYear, endMonth);
      if (!response.success) {
        throw new Error('Failed to load semi-annual cash flow summary');
      }
      return response.data;
    },
    enabled: !!startYear && !!startMonth && !!endYear && !!endMonth,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 4. Semi-Annual Stock Turnover
export function useSemiAnnualStockTurnover(
  startYear: number, startMonth: number, endYear: number, endMonth: number
) {
  return useQuery<SemiAnnualStockTurnover, Error>({
    queryKey: monthlyReportKeys.semiAnnualStockTurnover(startYear, startMonth, endYear, endMonth),
    queryFn: async () => {
      const response = await monthlyReportsApi.getSemiAnnualStockTurnover(startYear, startMonth, endYear, endMonth);
      if (!response.success) {
        throw new Error('Failed to load semi-annual stock turnover analysis');
      }
      return response.data;
    },
    enabled: !!startYear && !!startMonth && !!endYear && !!endMonth,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 5. Semi-Annual Receivables Collection
export function useSemiAnnualReceivablesCollection(
  startYear: number, startMonth: number, endYear: number, endMonth: number
) {
  return useQuery<SemiAnnualReceivablesCollection, Error>({
    queryKey: monthlyReportKeys.semiAnnualReceivables(startYear, startMonth, endYear, endMonth),
    queryFn: async () => {
      const response = await monthlyReportsApi.getSemiAnnualReceivablesCollection(startYear, startMonth, endYear, endMonth);
      if (!response.success) {
        throw new Error('Failed to load semi-annual receivables collection analysis');
      }
      return response.data;
    },
    enabled: !!startYear && !!startMonth && !!endYear && !!endMonth,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 6. Semi-Annual Payroll & HR Cost
export function useSemiAnnualPayrollHRCost(
  startYear: number, startMonth: number, endYear: number, endMonth: number
) {
  return useQuery<SemiAnnualPayrollHRCost, Error>({
    queryKey: monthlyReportKeys.semiAnnualPayroll(startYear, startMonth, endYear, endMonth),
    queryFn: async () => {
      const response = await monthlyReportsApi.getSemiAnnualPayrollHRCost(startYear, startMonth, endYear, endMonth);
      if (!response.success) {
        throw new Error('Failed to load semi-annual payroll & HR cost report');
      }
      return response.data;
    },
    enabled: !!startYear && !!startMonth && !!endYear && !!endMonth,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 7. Semi-Annual Tax Obligations
export function useSemiAnnualTaxObligations(
  startYear: number, startMonth: number, endYear: number, endMonth: number
) {
  return useQuery<SemiAnnualTaxObligations, Error>({
    queryKey: monthlyReportKeys.semiAnnualTax(startYear, startMonth, endYear, endMonth),
    queryFn: async () => {
      const response = await monthlyReportsApi.getSemiAnnualTaxObligations(startYear, startMonth, endYear, endMonth);
      if (!response.success) {
        throw new Error('Failed to load semi-annual tax obligations summary');
      }
      return response.data;
    },
    enabled: !!startYear && !!startMonth && !!endYear && !!endMonth,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
