/**
 * React Query hooks for Weekly Reports
 * Provides caching, loading states, and error handling for all weekly reports
 */

import { useQuery } from '@tanstack/react-query';
import { weeklyReportsApi } from '@/lib/api.weeklyReports';
import type {
  WeeklySalesPerformance,
  WeeklyInventoryReorder,
  WeeklySupplierPerformance,
  WeeklyReceivablesAging,
  WeeklyPayablesAging,
  WeeklyCashFlow,
  WeeklyPayrollPreview,
} from '@/lib/api.weeklyReports';

// Query keys for caching
export const weeklyReportKeys = {
  all: ['weeklyReports'] as const,
  salesPerformance: (weekStart?: string) => [...weeklyReportKeys.all, 'salesPerformance', weekStart] as const,
  inventoryReorder: () => [...weeklyReportKeys.all, 'inventoryReorder'] as const,
  supplierPerformance: (weekStart?: string) => [...weeklyReportKeys.all, 'supplierPerformance', weekStart] as const,
  receivablesAging: () => [...weeklyReportKeys.all, 'receivablesAging'] as const,
  payablesAging: () => [...weeklyReportKeys.all, 'payablesAging'] as const,
  cashFlow: (weekStart?: string) => [...weeklyReportKeys.all, 'cashFlow', weekStart] as const,
  payrollPreview: () => [...weeklyReportKeys.all, 'payrollPreview'] as const,
};

// 1. Weekly Sales Performance Hook
export function useWeeklySalesPerformance(weekStart?: string) {
  return useQuery<WeeklySalesPerformance, Error>({
    queryKey: weeklyReportKeys.salesPerformance(weekStart),
    queryFn: async () => {
      const response = await weeklyReportsApi.getSalesPerformance(weekStart);
      if (!response.success) {
        throw new Error('Failed to load weekly sales performance report');
      }
      return response.data;
    },
    staleTime: 10 * 60 * 1000,    // Data stays fresh for 10 minutes (weekly data changes less)
    gcTime: 60 * 60 * 1000,       // Keep in cache for 1 hour
    refetchOnWindowFocus: false,
  });
}

// 2. Weekly Inventory Reorder Hook
export function useWeeklyInventoryReorder() {
  return useQuery<WeeklyInventoryReorder, Error>({
    queryKey: weeklyReportKeys.inventoryReorder(),
    queryFn: async () => {
      const response = await weeklyReportsApi.getInventoryReorder();
      if (!response.success) {
        throw new Error('Failed to load inventory reorder report');
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,     // 5 minutes - inventory can change frequently
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,   // Refresh when returning to tab (inventory changes)
  });
}

// 3. Weekly Supplier Performance Hook
export function useWeeklySupplierPerformance(weekStart?: string) {
  return useQuery<WeeklySupplierPerformance, Error>({
    queryKey: weeklyReportKeys.supplierPerformance(weekStart),
    queryFn: async () => {
      const response = await weeklyReportsApi.getSupplierPerformance(weekStart);
      if (!response.success) {
        throw new Error('Failed to load supplier performance report');
      }
      console.log('API Response data:', response.data);
      return response.data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
}

// 4. Weekly Receivables Aging Hook
export function useWeeklyReceivablesAging() {
  return useQuery<WeeklyReceivablesAging, Error>({
    queryKey: weeklyReportKeys.receivablesAging(),
    queryFn: async () => {
      const response = await weeklyReportsApi.getReceivablesAging();
      if (!response.success) {
        throw new Error('Failed to load receivables aging report');
      }
      return response.data;
    },
    staleTime: 15 * 60 * 1000,    // 15 minutes - aging changes slowly
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: true,  // Refresh on focus to catch new payments
  });
}

// 5. Weekly Payables Aging Hook
export function useWeeklyPayablesAging() {
  return useQuery<WeeklyPayablesAging, Error>({
    queryKey: weeklyReportKeys.payablesAging(),
    queryFn: async () => {
      const response = await weeklyReportsApi.getPayablesAging();
      if (!response.success) {
        throw new Error('Failed to load payables aging report');
      }
      return response.data;
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

// 6. Weekly Cash Flow Hook
export function useWeeklyCashFlow(weekStart?: string) {
  return useQuery<WeeklyCashFlow, Error>({
    queryKey: weeklyReportKeys.cashFlow(weekStart),
    queryFn: async () => {
      const response = await weeklyReportsApi.getCashFlow(weekStart);
      if (!response.success) {
        throw new Error('Failed to load weekly cash flow report');
      }
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 7. Weekly Payroll Preview Hook
export function useWeeklyPayrollPreview() {
  return useQuery<WeeklyPayrollPreview, Error>({
    queryKey: weeklyReportKeys.payrollPreview(),
    queryFn: async () => {
      const response = await weeklyReportsApi.getPayrollPreview();
      if (!response.success) {
        throw new Error('Failed to load payroll preview');
      }
      return response.data;
    },
    staleTime: 30 * 60 * 1000,   // 30 minutes - payroll doesn't change often
    gcTime: 2 * 60 * 60 * 1000,  // 2 hours
    refetchOnWindowFocus: false,
  });
}
