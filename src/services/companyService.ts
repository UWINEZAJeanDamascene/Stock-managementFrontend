import {
  companyApi,
  type PlatformAccessUpdate,
  type PlatformCompany,
  type PlatformDashboardData,
} from '@/lib/api';

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
  subscription_plan?: string;
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

  async getPlatformDashboard(): Promise<{ data: PlatformDashboardData }> {
    const response = await companyApi.getPlatformDashboard();
    return response as unknown as { data: PlatformDashboardData };
  }

  async updatePlatformAccess(id: string, data: PlatformAccessUpdate): Promise<{ data: PlatformCompany }> {
    const response = await companyApi.updatePlatformAccess(id, data);
    return response as unknown as { data: PlatformCompany };
  }

  async sendPaymentReminder(id: string, data: { subject?: string; message?: string }): Promise<{ data: { sent: boolean; company: PlatformCompany } }> {
    const response = await companyApi.sendPaymentReminder(id, data);
    return response as unknown as { data: { sent: boolean; company: PlatformCompany } };
  }

  async broadcastPlatformUpdate(data: { subject?: string; message?: string; companyIds?: string[] }): Promise<{ data: { sent: number; failed: number; recipients: number } }> {
    const response = await companyApi.broadcastPlatformUpdate(data);
    return response as unknown as { data: { sent: number; failed: number; recipients: number } };
  }

  async getPlatformAnalytics() {
    const response = await companyApi.getPlatformAnalytics();
    return response;
  }

  async getPlatformAuditLogs(params?: Parameters<typeof companyApi.getPlatformAuditLogs>[0]) {
    const response = await companyApi.getPlatformAuditLogs(params);
    return response;
  }

  async getCompanyUsers(companyId: string, params?: Parameters<typeof companyApi.getCompanyUsers>[1]) {
    const response = await companyApi.getCompanyUsers(companyId, params);
    return response;
  }

  async impersonateUser(companyId: string, userId: string) {
    const response = await companyApi.impersonateUser(companyId, userId);
    return response;
  }

  async forcePasswordReset(companyId: string, userId: string) {
    const response = await companyApi.forcePasswordReset(companyId, userId);
    return response;
  }

  async recordOwnerCapital(data: { amount: number; description?: string; date?: string; bankAccountId?: string }): Promise<{ message: string }> {
    const response = await companyApi.recordOwnerCapital(data);
    return response as unknown as { message: string };
  }

  async getSubscriptionPlans(params?: { active?: boolean }) {
    const response = await companyApi.getSubscriptionPlans(params);
    return response;
  }

  async getPublicSubscriptionPlans() {
    const response = await companyApi.getPublicSubscriptionPlans();
    return response;
  }

  async createSubscriptionPlan(data: Parameters<typeof companyApi.createSubscriptionPlan>[0]) {
    const response = await companyApi.createSubscriptionPlan(data);
    return response;
  }

  async updateSubscriptionPlan(key: string, data: Parameters<typeof companyApi.updateSubscriptionPlan>[1]) {
    const response = await companyApi.updateSubscriptionPlan(key, data);
    return response;
  }

  async deleteSubscriptionPlan(key: string) {
    const response = await companyApi.deleteSubscriptionPlan(key);
    return response;
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
