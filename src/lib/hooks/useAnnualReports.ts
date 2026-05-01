/**
 * React Query hooks for Annual Reports
 * Provides caching, loading states, and error handling for all annual reports
 */

import { useQuery } from '@tanstack/react-query';
import { annualReportsApi } from '@/lib/api.annualReports';
import type {
  AnnualFinancialStatements,
  AnnualGeneralLedger,
  AnnualFixedAssetSchedule,
  AnnualInventoryReconciliation,
  AnnualAccountsReceivable,
  AnnualAccountsPayable,
  AnnualPayrollReport,
  AnnualTaxSummary,
  AnnualBudgetVsActual,
  AnnualAuditTrail,
} from '@/lib/api.annualReports';

// Query keys for caching
export const annualReportKeys = {
  all: ['annualReports'] as const,
  financialStatements: (year: number) => [...annualReportKeys.all, 'financialStatements', year] as const,
  generalLedger: (year: number) => [...annualReportKeys.all, 'generalLedger', year] as const,
  fixedAssetSchedule: (year: number) => [...annualReportKeys.all, 'fixedAssetSchedule', year] as const,
  inventoryReconciliation: (year: number) => [...annualReportKeys.all, 'inventoryReconciliation', year] as const,
  accountsReceivable: (year: number) => [...annualReportKeys.all, 'accountsReceivable', year] as const,
  accountsPayable: (year: number) => [...annualReportKeys.all, 'accountsPayable', year] as const,
  payrollReport: (year: number) => [...annualReportKeys.all, 'payrollReport', year] as const,
  taxSummary: (year: number) => [...annualReportKeys.all, 'taxSummary', year] as const,
  budgetVsActual: (year: number) => [...annualReportKeys.all, 'budgetVsActual', year] as const,
  auditTrail: (year: number) => [...annualReportKeys.all, 'auditTrail', year] as const,
};

// 1. Financial Statements Hook
export function useAnnualFinancialStatements(year: number) {
  return useQuery<AnnualFinancialStatements, Error>({
    queryKey: annualReportKeys.financialStatements(year),
    queryFn: async () => {
      const response = await annualReportsApi.getFinancialStatements(year);
      if (!response.success) {
        throw new Error('Failed to load financial statements');
      }
      return response.data;
    },
    enabled: !!year,
    staleTime: 30 * 60 * 1000, // 30 minutes - annual data changes infrequently
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  });
}

// 2. General Ledger Hook
export function useAnnualGeneralLedger(year: number) {
  return useQuery<AnnualGeneralLedger, Error>({
    queryKey: annualReportKeys.generalLedger(year),
    queryFn: async () => {
      const response = await annualReportsApi.getGeneralLedger(year);
      if (!response.success) {
        throw new Error('Failed to load general ledger');
      }
      return response.data;
    },
    enabled: !!year,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 3. Fixed Asset Schedule Hook
export function useAnnualFixedAssetSchedule(year: number) {
  return useQuery<AnnualFixedAssetSchedule, Error>({
    queryKey: annualReportKeys.fixedAssetSchedule(year),
    queryFn: async () => {
      const response = await annualReportsApi.getFixedAssetSchedule(year);
      if (!response.success) {
        throw new Error('Failed to load fixed asset schedule');
      }
      return response.data;
    },
    enabled: !!year,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 4. Inventory Reconciliation Hook
export function useAnnualInventoryReconciliation(year: number) {
  return useQuery<AnnualInventoryReconciliation, Error>({
    queryKey: annualReportKeys.inventoryReconciliation(year),
    queryFn: async () => {
      const response = await annualReportsApi.getInventoryReconciliation(year);
      if (!response.success) {
        throw new Error('Failed to load inventory reconciliation');
      }
      return response.data;
    },
    enabled: !!year,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 5. Accounts Receivable Hook
export function useAnnualAccountsReceivable(year: number) {
  return useQuery<AnnualAccountsReceivable, Error>({
    queryKey: annualReportKeys.accountsReceivable(year),
    queryFn: async () => {
      const response = await annualReportsApi.getAccountsReceivable(year);
      if (!response.success) {
        throw new Error('Failed to load accounts receivable summary');
      }
      return response.data;
    },
    enabled: !!year,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 6. Accounts Payable Hook
export function useAnnualAccountsPayable(year: number) {
  return useQuery<AnnualAccountsPayable, Error>({
    queryKey: annualReportKeys.accountsPayable(year),
    queryFn: async () => {
      const response = await annualReportsApi.getAccountsPayable(year);
      if (!response.success) {
        throw new Error('Failed to load accounts payable summary');
      }
      return response.data;
    },
    enabled: !!year,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 7. Payroll Report Hook
export function useAnnualPayrollReport(year: number) {
  return useQuery<AnnualPayrollReport, Error>({
    queryKey: annualReportKeys.payrollReport(year),
    queryFn: async () => {
      const response = await annualReportsApi.getPayrollReport(year);
      if (!response.success) {
        throw new Error('Failed to load payroll report');
      }
      return response.data;
    },
    enabled: !!year,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 8. Tax Summary Hook
export function useAnnualTaxSummary(year: number) {
  return useQuery<AnnualTaxSummary, Error>({
    queryKey: annualReportKeys.taxSummary(year),
    queryFn: async () => {
      const response = await annualReportsApi.getTaxSummary(year);
      if (!response.success) {
        throw new Error('Failed to load tax summary');
      }
      return response.data;
    },
    enabled: !!year,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 9. Budget vs Actual Hook
export function useAnnualBudgetVsActual(year: number) {
  return useQuery<AnnualBudgetVsActual, Error>({
    queryKey: annualReportKeys.budgetVsActual(year),
    queryFn: async () => {
      const response = await annualReportsApi.getBudgetVsActual(year);
      if (!response.success) {
        throw new Error('Failed to load budget vs actual report');
      }
      return response.data;
    },
    enabled: !!year,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 10. Audit Trail Hook
export function useAnnualAuditTrail(year: number) {
  return useQuery<AnnualAuditTrail, Error>({
    queryKey: annualReportKeys.auditTrail(year),
    queryFn: async () => {
      const response = await annualReportsApi.getAuditTrail(year);
      if (!response.success) {
        throw new Error('Failed to load audit trail');
      }
      return response.data;
    },
    enabled: !!year,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Export all hooks for convenience
export const annualReportHooks = {
  useAnnualFinancialStatements,
  useAnnualGeneralLedger,
  useAnnualFixedAssetSchedule,
  useAnnualInventoryReconciliation,
  useAnnualAccountsReceivable,
  useAnnualAccountsPayable,
  useAnnualPayrollReport,
  useAnnualTaxSummary,
  useAnnualBudgetVsActual,
  useAnnualAuditTrail,
};

export default annualReportHooks;
