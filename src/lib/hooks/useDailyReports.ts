/**
 * React Query hooks for Daily Reports
 * Provides caching, loading states, and error handling for all daily reports
 */

import { useQuery } from '@tanstack/react-query';
import { dailyReportsApi } from '@/lib/api.dailyReports';
import type {
  DailySalesSummary,
  DailyPurchasesSummary,
  DailyCashPosition,
  DailyStockMovement,
  DailyARActivity,
  DailyAPActivity,
  DailyJournalEntries,
  DailyTaxCollected,
} from '@/lib/api.dailyReports';

// Query keys for caching
export const dailyReportKeys = {
  all: ['dailyReports'] as const,
  sales: (date: string) => [...dailyReportKeys.all, 'sales', date] as const,
  purchases: (date: string) => [...dailyReportKeys.all, 'purchases', date] as const,
  cashPosition: (date: string) => [...dailyReportKeys.all, 'cashPosition', date] as const,
  stockMovement: (date: string) => [...dailyReportKeys.all, 'stockMovement', date] as const,
  arActivity: (date: string) => [...dailyReportKeys.all, 'arActivity', date] as const,
  apActivity: (date: string) => [...dailyReportKeys.all, 'apActivity', date] as const,
  journalEntries: (date: string) => [...dailyReportKeys.all, 'journalEntries', date] as const,
  taxCollected: (date: string) => [...dailyReportKeys.all, 'taxCollected', date] as const,
};

// 1. Daily Sales Summary Hook
export function useDailySalesSummary(date: string) {
  return useQuery<DailySalesSummary, Error>({
    queryKey: dailyReportKeys.sales(date),
    queryFn: async () => {
      const response = await dailyReportsApi.getSalesSummary(date);
      if (!response.success) {
        throw new Error('Failed to load sales report');
      }
      return response.data;
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000,    // Data stays fresh for 5 minutes
    gcTime: 30 * 60 * 1000,      // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch when switching tabs
  });
}

// 2. Daily Purchases Summary Hook
export function useDailyPurchasesSummary(date: string) {
  return useQuery<DailyPurchasesSummary, Error>({
    queryKey: dailyReportKeys.purchases(date),
    queryFn: async () => {
      const response = await dailyReportsApi.getPurchasesSummary(date);
      if (!response.success) {
        throw new Error('Failed to load purchases report');
      }
      return response.data;
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 3. Daily Cash Position Hook
export function useDailyCashPosition(date: string) {
  return useQuery<DailyCashPosition, Error>({
    queryKey: dailyReportKeys.cashPosition(date),
    queryFn: async () => {
      const response = await dailyReportsApi.getCashPosition(date);
      if (!response.success) {
        throw new Error('Failed to load cash position report');
      }
      return response.data;
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 4. Daily Stock Movement Hook
export function useDailyStockMovement(date: string) {
  return useQuery<DailyStockMovement, Error>({
    queryKey: dailyReportKeys.stockMovement(date),
    queryFn: async () => {
      const response = await dailyReportsApi.getStockMovement(date);
      if (!response.success) {
        throw new Error('Failed to load stock movement report');
      }
      return response.data;
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 5. Daily AR Activity Hook
export function useDailyARActivity(date: string) {
  return useQuery<DailyARActivity, Error>({
    queryKey: dailyReportKeys.arActivity(date),
    queryFn: async () => {
      const response = await dailyReportsApi.getARActivity(date);
      if (!response.success) {
        throw new Error('Failed to load AR activity report');
      }
      return response.data;
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 6. Daily AP Activity Hook
export function useDailyAPActivity(date: string) {
  return useQuery<DailyAPActivity, Error>({
    queryKey: dailyReportKeys.apActivity(date),
    queryFn: async () => {
      const response = await dailyReportsApi.getAPActivity(date);
      if (!response.success) {
        throw new Error('Failed to load AP activity report');
      }
      return response.data;
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 7. Daily Journal Entries Hook
export function useDailyJournalEntries(date: string) {
  return useQuery<DailyJournalEntries, Error>({
    queryKey: dailyReportKeys.journalEntries(date),
    queryFn: async () => {
      const response = await dailyReportsApi.getJournalEntries(date);
      if (!response.success) {
        throw new Error('Failed to load journal entries report');
      }
      return response.data;
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 8. Daily Tax Collected Hook
export function useDailyTaxCollected(date: string) {
  return useQuery<DailyTaxCollected, Error>({
    queryKey: dailyReportKeys.taxCollected(date),
    queryFn: async () => {
      const response = await dailyReportsApi.getTaxCollected(date);
      if (!response.success) {
        throw new Error('Failed to load tax collected report');
      }
      return response.data;
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
