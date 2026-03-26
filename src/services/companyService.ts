import { companyApi } from '@/lib/api';

export interface CompanyAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface CompanySettings {
  currency?: string;
  taxRate?: number;
  lowStockThreshold?: number;
  dateFormat?: string;
  timezone?: string;
  language?: string;
}

export interface Company {
  _id: string;
  name: string;
  email: string;
  tin?: string;
  phone?: string;
  address?: CompanyAddress;
  settings?: CompanySettings;
  isActive: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface RegisterCompanyData {
  name: string;
  email: string;
  tin?: string;
  phone?: string;
  address?: CompanyAddress;
}

export interface CompanyQueryParams {
  page?: number;
  limit?: number;
  status?: string;
}

class CompanyService {
  async register(
    companyData: RegisterCompanyData,
    adminData: { name: string; email: string; password: string }
  ): Promise<{ message: string; companyId: string }> {
    const response = await companyApi.register(companyData, adminData);
    return response as unknown as { message: string; companyId: string };
  }

  async getAll(params?: CompanyQueryParams): Promise<{ data: Company[]; total: number; page: number; limit: number }> {
    const response = await companyApi.getAllCompanies(params);
    return response as unknown as { data: Company[]; total: number; page: number; limit: number };
  }

  async getCurrent(): Promise<{ data: Company }> {
    const response = await companyApi.getMe();
    return response as unknown as { data: Company };
  }

  async update(data: Partial<Company>): Promise<{ data: Company }> {
    const response = await companyApi.update(data);
    return response as unknown as { data: Company };
  }

  async getPendingCompanies(): Promise<{ data: Company[] }> {
    const response = await companyApi.getPendingCompanies();
    return response as unknown as { data: Company[] };
  }

  async approveCompany(id: string): Promise<{ message: string }> {
    const response = await companyApi.approveCompany(id);
    return response as unknown as { message: string };
  }

  async rejectCompany(id: string, reason?: string): Promise<{ message: string }> {
    const response = await companyApi.rejectCompany(id, reason);
    return response as unknown as { message: string };
  }

  async recordOwnerCapital(data: { amount: number; description?: string; date?: string; bankAccountId?: string }): Promise<{ message: string }> {
    const response = await companyApi.recordOwnerCapital(data);
    return response as unknown as { message: string };
  }

  async recordShareCapital(data: { amount: number; description?: string; date?: string; bankAccountId?: string }): Promise<{ message: string }> {
    const response = await companyApi.recordShareCapital(data);
    return response as unknown as { message: string };
  }

  async getCapitalBalance(): Promise<{ data: { shareCapital: number; ownerCapital: number; totalCapital: number } }> {
    const response = await companyApi.getCapitalBalance();
    return response as unknown as { data: { shareCapital: number; ownerCapital: number; totalCapital: number } };
  }
}

export default new CompanyService();
