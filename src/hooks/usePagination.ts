import { useState, useCallback, useMemo } from 'react';

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

export interface PaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  limits?: number[]; // Available page size options
}

export interface UsePaginationReturn {
  // State
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  offset: number;
  
  // Actions
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setTotal: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  reset: () => void;
  
  // Computed
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
}

/**
 * Hook for managing pagination state
 */
export function usePagination(options: PaginationOptions = {}): UsePaginationReturn {
  const {
    initialPage = 1,
    initialLimit = 10,
    limits: _limits = [10, 25, 50, 100],
  } = options;

  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(total / limit);
  }, [total, limit]);

  // Calculate offset for API calls
  const offset = useMemo(() => {
    return (page - 1) * limit;
  }, [page, limit]);

  // Check if has next/previous pages
  const hasNextPage = useMemo(() => {
    return page < totalPages;
  }, [page, totalPages]);

  const hasPrevPage = useMemo(() => {
    return page > 1;
  }, [page]);

  const isFirstPage = useMemo(() => {
    return page === 1;
  }, [page]);

  const isLastPage = useMemo(() => {
    return page === totalPages;
  }, [page, totalPages]);

  // Actions
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(p => p + 1);
    }
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setPage(p => p - 1);
    }
  }, [hasPrevPage]);

  const goToPage = useCallback((targetPage: number) => {
    const validPage = Math.max(1, Math.min(targetPage, totalPages));
    setPage(validPage);
  }, [totalPages]);

  const reset = useCallback(() => {
    setPage(initialPage);
    setLimit(initialLimit);
    setTotal(0);
  }, [initialPage, initialLimit]);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when limit changes
  }, []);

  return {
    // State
    page,
    limit,
    total,
    totalPages,
    offset,
    
    // Actions
    setPage,
    setLimit: handleLimitChange,
    setTotal,
    nextPage,
    prevPage,
    goToPage,
    reset,
    
    // Computed
    hasNextPage,
    hasPrevPage,
    isFirstPage,
    isLastPage,
  };
}

export default usePagination;
