/**
 * React Query hooks for Employee Master
 * Provides caching, loading states, and mutation handling.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi, payrollGenerateApi } from "@/lib/api.employees";
import type {
  Employee,
  SalaryHistoryRecord,
  CreateEmployeePayload,
  UpdateEmployeePayload,
  ChangeSalaryPayload,
  GeneratePayrollPayload,
} from "@/lib/api.employees";

// ═══════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════

export const employeeKeys = {
  all: ["employees"] as const,
  lists: (params?: Record<string, any>) =>
    [...employeeKeys.all, "list", params] as const,
  detail: (id: string) => [...employeeKeys.all, "detail", id] as const,
  salaryHistory: (id: string) =>
    [...employeeKeys.all, "salary-history", id] as const,
};

// ═══════════════════════════════════════════════════════════
// QUERY HOOKS
// ═══════════════════════════════════════════════════════════

/** List employees with optional filters */
export function useEmployees(params?: {
  status?: string;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<Employee[], Error>({
    queryKey: employeeKeys.lists(params),
    queryFn: async () => {
      const response = await employeeApi.getAll(params);
      if (!response.success) {
        throw new Error("Failed to load employees");
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/** Get single employee with payroll history */
export function useEmployee(id: string | undefined) {
  return useQuery<Employee & { payrollHistory: any[] }, Error>({
    queryKey: employeeKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Employee ID is required");
      const response = await employeeApi.getById(id);
      if (!response.success) {
        throw new Error("Failed to load employee");
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/** Get salary history for an employee */
export function useSalaryHistory(employeeId: string | undefined) {
  return useQuery<SalaryHistoryRecord[], Error>({
    queryKey: employeeKeys.salaryHistory(employeeId || ""),
    queryFn: async () => {
      if (!employeeId) throw new Error("Employee ID is required");
      const response = await employeeApi.getSalaryHistory(employeeId);
      if (!response.success) {
        throw new Error("Failed to load salary history");
      }
      return response.data;
    },
    enabled: !!employeeId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ═══════════════════════════════════════════════════════════
// MUTATION HOOKS
// ═══════════════════════════════════════════════════════════

/** Create a new employee */
export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation<
    Employee,
    Error,
    CreateEmployeePayload
  >({
    mutationFn: async (payload) => {
      const response = await employeeApi.create(payload);
      if (!response.success) {
        throw new Error("Failed to create employee");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

/** Update employee personal/org details */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation<
    Employee,
    Error,
    { id: string; payload: UpdateEmployeePayload }
  >({
    mutationFn: async ({ id, payload }) => {
      const response = await employeeApi.update(id, payload);
      if (!response.success) {
        throw new Error("Failed to update employee");
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

/** Change employee salary (creates SalaryHistory row) */
export function useChangeSalary() {
  const queryClient = useQueryClient();
  return useMutation<
    SalaryHistoryRecord,
    Error,
    { id: string; payload: ChangeSalaryPayload }
  >({
    mutationFn: async ({ id, payload }) => {
      const response = await employeeApi.changeSalary(id, payload);
      if (!response.success) {
        throw new Error("Failed to change salary");
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
      queryClient.invalidateQueries({
        queryKey: employeeKeys.salaryHistory(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

/** Terminate an employee */
export function useTerminateEmployee() {
  const queryClient = useQueryClient();
  return useMutation<
    Employee,
    Error,
    { id: string; terminationDate?: string }
  >({
    mutationFn: async ({ id, terminationDate }) => {
      const response = await employeeApi.terminate(id, terminationDate ? { terminationDate } : undefined);
      if (!response.success) {
        throw new Error("Failed to terminate employee");
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

/** Delete (or soft-delete) an employee */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; message: string; data?: Employee },
    Error,
    string
  >({
    mutationFn: async (id) => {
      const response = await employeeApi.delete(id);
      if (!response.success) {
        throw new Error("Failed to delete employee");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

/** Generate payroll from Employee Master (bulk) */
export function useGeneratePayroll() {
  const queryClient = useQueryClient();
  return useMutation<
    {
      success: boolean;
      count: number;
      data: any[];
      errors?: Array<{ employeeId: string; name: string; reason: string }>;
    },
    Error,
    GeneratePayrollPayload
  >({
    mutationFn: async (payload) => {
      const response = await payrollGenerateApi.generate(payload);
      if (!response.success) {
        throw new Error("Failed to generate payroll");
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate payroll list and employee lists
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}
