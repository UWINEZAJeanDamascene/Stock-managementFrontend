import { suppliersApi } from '@/lib/api';

export interface Supplier {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  openingBalance?: number;
  paymentTermDays?: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateSupplierData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  openingBalance?: number;
  paymentTermDays?: number;
  notes?: string;
}

class SupplierService {
  async getSuppliers(params?: SupplierQueryParams): Promise<{ data: Supplier[]; total: number; page: number; limit: number }> {
    const response = await suppliersApi.getAll(params);
    return response as unknown as { data: Supplier[]; total: number; page: number; limit: number };
  }

  async getSupplier(id: string): Promise<Supplier> {
    const response = await suppliersApi.getById(id);
    return response as unknown as Supplier;
  }

  async createSupplier(data: CreateSupplierData): Promise<Supplier> {
    const response = await suppliersApi.create(data);
    return response as unknown as Supplier;
  }

  async updateSupplier(id: string, data: Partial<CreateSupplierData>): Promise<Supplier> {
    const response = await suppliersApi.update(id, data);
    return response as unknown as Supplier;
  }

  async deleteSupplier(id: string): Promise<void> {
    await suppliersApi.delete(id);
  }

  async toggleSupplierStatus(id: string): Promise<Supplier> {
    const response = await suppliersApi.toggleStatus(id);
    return response as unknown as Supplier;
  }

  async getPurchaseHistory(id: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string }): Promise<unknown[]> {
    const response = await suppliersApi.getPurchaseHistory(id, params);
    return response as unknown as unknown[];
  }
}

export default new SupplierService();
