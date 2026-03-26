const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stock-tenancy-system.onrender.com/api';

// Bank Account Types
export interface BankAccount {
  _id: string;
  name: string;
  accountType: 'bk_bank' | 'equity_bank' | 'im_bank' | 'cogebanque' | 'ecobank' | 'mtn_momo' | 'airtel_money' | 'cash_in_hand';
  accountNumber?: string;
  bankName?: string;
  branchName?: string;
  openingBalance: number;
  cachedBalance?: number;  // Computed balance from journal entries
  currentBalance?: number;  // Alias for compatibility
  currencyCode: string;
  isDefault?: boolean;
  isPrimary?: boolean;
  isActive: boolean;
  color?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BankTransaction {
  _id: string;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'adjustment';
  amount: number;
  balanceAfter: number;
  description?: string;
  date: string;
  referenceNumber?: string;
  status: string;
}

export interface CashPosition {
  total: number;
  byType: {
    bk_bank: number;
    equity_bank: number;
    im_bank: number;
    cogebanque: number;
    ecobank: number;
    mtn_momo: number;
    airtel_money: number;
    cash_in_hand: number;
  };
}

// Helper: build query string while skipping undefined/null values
function buildQuery(params?: Record<string, any>) { 
  if (!params) return '';
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      v.forEach(item => qp.append(k, String(item)));
    } else {
      qp.set(k, String(v));
    }
  });
  return qp.toString();
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build query string from params
  const queryString = buildQuery(options.params);
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    // Body is empty or not valid JSON
    throw new ApiError(
      response.status,
      `${response.status} ${response.statusText || 'Server Error'}`
    );
  }

  if (!response.ok) {
    throw new ApiError(response.status, data.message || 'An error occurred');
  }

  return data;
}

// Auth API - matching backend response
// Backend returns: { success, token, access_token, refresh_token, userId, memberships }
export interface Membership {
  companyId: string;
  role: string;
}

export interface AuthLoginResponse {
  success: boolean;
  token: string;
  access_token: string;
  refresh_token: string;
  userId: string;
  memberships: Membership[];
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthLoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  
  register: (name: string, email: string, password: string, role?: string, mustChangePassword?: boolean) =>
    request<{ success: boolean; token: string; data: unknown }>('/auth/register', {
      method: 'POST',
      body: { name, email, password, role, mustChangePassword },
    }),
  
  getMe: () => request<{ success: boolean; data: unknown }>('/auth/me'),
  
  updatePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('/auth/update-password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    }),
  
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
};

// Company API (Public - for registration)
export const companyApi = {
  register: (companyData: { name: string; email: string; tin?: string; phone?: string }, adminData: { name: string; email: string; password: string }) =>
    request<{ success: boolean; message: string; data: { company: unknown; user: unknown } }>('/companies/register', {
      method: 'POST',
      body: { company: companyData, admin: adminData },
    }),
  
  getMe: () => request<{ success: boolean; data: unknown }>('/companies/me'),
  
  // Get company by ID - needed for company selector when user has multiple memberships
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/companies/${id}`),
  
  update: (data: {
    name?: string;
    email?: string;
    tin?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    settings?: {
      currency?: string;
      taxRate?: number;
      lowStockThreshold?: number;
      dateFormat?: string;
    };
    equity?: {
      shareCapital?: number;
      ownerCapital?: number;
      retainedEarnings?: number;
      accumulatedProfit?: number;
    };
    assets?: {
      prepaidExpenses?: number;
    };
    liabilities?: {
      accruedExpenses?: number;
      otherLongTermLiabilities?: number;
      currentLiabilities?: Array<{
        name: string;
        amount: number;
        description?: string;
      }>;
      nonCurrentLiabilities?: Array<{
        name: string;
        amount: number;
        description?: string;
        dueDate?: string;
      }>;
    };
  }) =>
    request<{ success: boolean; data: unknown }>('/companies', { method: 'PUT', body: data }),

  // Platform admin endpoints
  getPendingCompanies: () => request<{ success: boolean; data: unknown[] }>('/companies/pending'),
  
  getAllCompanies: (params?: { page?: number; limit?: number; status?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/companies/all${query ? `?${query}` : ''}`);
  },
  
  approveCompany: (id: string) => 
    request<{ success: boolean; message: string; data: unknown }>(`/companies/${id}/approve`, { method: 'PUT' }),
  
  rejectCompany: (id: string, reason?: string) => 
    request<{ success: boolean; message: string; data: unknown }>(`/companies/${id}/reject`, { method: 'PUT', body: { reason } }),

  // Capital Management
  recordOwnerCapital: (data: { amount: number; description?: string; date?: string; bankAccountId?: string }) =>
    request<{ success: boolean; message: string; data: unknown }>('/companies/capital/owner', { method: 'POST', body: data }),
  recordShareCapital: (data: { amount: number; description?: string; date?: string; bankAccountId?: string }) =>
    request<{ success: boolean; message: string; data: unknown }>('/companies/capital/share', { method: 'POST', body: data }),
  getCapitalBalance: () =>
    request<{ success: boolean; data: { shareCapital: number; ownerCapital: number; totalCapital: number } }>('/companies/capital/balance'),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => request<{ success: boolean; data: unknown }>('/dashboard/stats'),
  getRecentActivities: (params?: { limit?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/dashboard/recent-activities${query ? `?${query}` : ''}`);
  },
  getLowStockAlerts: () => request<{ success: boolean; data: unknown }>('/dashboard/low-stock-alerts'),
  getTopSellingProducts: (params?: { limit?: number; startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/dashboard/top-selling-products${query ? `?${query}` : ''}`);
  },
  getTopClients: (params?: { limit?: number; startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/dashboard/top-clients${query ? `?${query}` : ''}`);
  },
  getSalesChart: (params?: { period?: 'week' | 'month' | 'year' }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/dashboard/sales-chart${query ? `?${query}` : ''}`);
  },
  getStockMovementChart: (params?: { period?: 'week' | 'month' | 'year' }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/dashboard/stock-movement-chart${query ? `?${query}` : ''}`);
  },
  
  // Reorder alerts: products needing reorder based on configured reorder points
  getReorderAlerts: () => request<{ success: boolean; data: unknown }>(`/stock/advanced/reorder-points/needing-reorder`),

};

// Products API
export const productsApi = {
  getAll: (params?: { 
    search?: string; 
    category?: string;
    supplier?: string;
    status?: string;
    page?: number; 
    limit?: number;
    isArchived?: boolean;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown; pagination?: unknown }>(`/products${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/products/${id}`),
  create: (product: unknown) => request<{ success: boolean; data: unknown }>('/products', { method: 'POST', body: product }),
  update: (id: string, product: unknown) => request<{ success: boolean; data: unknown }>(`/products/${id}`, { method: 'PUT', body: product }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/products/${id}`, { method: 'DELETE' }),
  archive: (id: string, notes?: string) => request<{ success: boolean }>(`/products/${id}/archive`, { method: 'PUT', body: { notes } }),
  restore: (id: string, notes?: string) => request<{ success: boolean }>(`/products/${id}/restore`, { method: 'PUT', body: { notes } }),
  getLowStock: () => request<{ success: boolean; data: unknown }>('/products/low-stock'),
  checkLowStockAndNotify: () => request<{ success: boolean; message: string; data: { outOfStockCount: number; lowStockCount: number } }>('/products/check-low-stock', { method: 'POST' }),
  getHistory: (id: string) => request<{ success: boolean; data: unknown }>(`/products/${id}/history`),
  getLifecycle: (id: string) => request<{ success: boolean; data: unknown }>(`/products/${id}/lifecycle`),
  // Barcode / QR image fetchers (return Blob)
  getBarcodeImage: (id: string, params?: { type?: string; scale?: number; height?: number }) => {
    const token = localStorage.getItem('token');
    const query = buildQuery(params as Record<string, any>);
    return fetch(`${API_BASE_URL}/products/${id}/barcode${query ? `?${query}` : ''}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    }).then(res => {
      if (!res.ok) throw new Error('Failed to fetch barcode image');
      return res.blob();
    });
  },
  getQRCodeImage: (id: string, params?: { width?: number }) => {
    const token = localStorage.getItem('token');
    const query = buildQuery(params as Record<string, any>);
    return fetch(`${API_BASE_URL}/products/${id}/qrcode${query ? `?${query}` : ''}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    }).then(res => {
      if (!res.ok) throw new Error('Failed to fetch QR image');
      return res.blob();
    });
  },
};

// Categories API
type CategoryResponse = { success: boolean; data: unknown; message?: string };
type CategoryDeleteResponse = { success: boolean; message: string };

export const categoriesApi = {
  getAll: () => request<CategoryResponse>('/categories'),
  getById: (id: string) => request<CategoryResponse>(`/categories/${id}`),
  create: (category: unknown) => request<CategoryResponse>('/categories', { method: 'POST', body: category }),
  update: (id: string, category: unknown) => request<CategoryResponse>(`/categories/${id}`, { method: 'PUT', body: category }),
  delete: (id: string) => request<CategoryDeleteResponse>(`/categories/${id}`, { method: 'DELETE' }),
};

// Warehouses API
type WarehouseResponse = { success: boolean; data: unknown; message?: string; count?: number; total?: number; pages?: number; currentPage?: number };
type WarehouseDeleteResponse = { success: boolean; message: string };

export const warehousesApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number; isActive?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<WarehouseResponse>(`/stock/warehouses${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<WarehouseResponse>(`/stock/warehouses/${id}`),
  create: (warehouse: unknown) => request<WarehouseResponse>('/stock/warehouses', { method: 'POST', body: warehouse }),
  update: (id: string, warehouse: unknown) => request<WarehouseResponse>(`/stock/warehouses/${id}`, { method: 'PUT', body: warehouse }),
  delete: (id: string) => request<WarehouseDeleteResponse>(`/stock/warehouses/${id}`, { method: 'DELETE' }),
};

// Suppliers API
export const suppliersApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number; isActive?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/suppliers${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/suppliers/${id}`),
  create: (supplier: unknown) => request<{ success: boolean; data: unknown }>('/suppliers', { method: 'POST', body: supplier }),
  update: (id: string, supplier: unknown) => request<{ success: boolean; data: unknown }>(`/suppliers/${id}`, { method: 'PUT', body: supplier }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/suppliers/${id}`, { method: 'DELETE' }),
  toggleStatus: (id: string) => request<{ success: boolean; data: unknown }>(`/suppliers/${id}/toggle-status`, { method: 'PUT' }),
  getPurchaseHistory: (id: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/suppliers/${id}/purchase-history${query ? `?${query}` : ''}`);
  },
};

// Clients API
export const clientsApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number; type?: string; isActive?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/clients${query ? `?${query}` : ''}`);
  },
  getWithStats: (params?: { search?: string; page?: number; limit?: number; type?: string; isActive?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/clients/with-stats${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/clients/${id}`),
  create: (client: unknown) => request<{ success: boolean; data: unknown }>('/clients', { method: 'POST', body: client }),
  update: (id: string, client: unknown) => request<{ success: boolean; data: unknown }>(`/clients/${id}`, { method: 'PUT', body: client }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/clients/${id}`, { method: 'DELETE' }),
  toggleStatus: (id: string) => request<{ success: boolean; data: unknown }>(`/clients/${id}/toggle-status`, { method: 'PUT' }),
  getPurchaseHistory: (id: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/clients/${id}/purchase-history${query ? `?${query}` : ''}`);
  },
  getOutstandingInvoices: (id: string) => request<{ success: boolean; data: unknown }>(`/clients/${id}/outstanding-invoices`),
  exportPDF: (params?: { type?: string; isActive?: boolean }) => {
    const token = localStorage.getItem('token');
    const query = buildQuery(params as Record<string, any>);
    return fetch(`${API_BASE_URL}/clients/export/pdf${query ? `?${query}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to export PDF');
      return res.blob();
    });
  },
  getInvoices: (id: string, params?: { page?: number; limit?: number; status?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown; summary?: unknown }>(`/clients/${id}/invoices${query ? `?${query}` : ''}`);
  },
  getReceipts: (id: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown; summary?: unknown }>(`/clients/${id}/receipts${query ? `?${query}` : ''}`);
  },
  getCreditNotes: (id: string, params?: { page?: number; limit?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown; summary?: unknown }>(`/clients/${id}/credit-notes${query ? `?${query}` : ''}`);
  },
  getStatementPDF: (id: string, params?: { startDate?: string; endDate?: string }) => {
    const token = localStorage.getItem('token');
    const query = buildQuery(params as Record<string, any>);
    return fetch(`${API_BASE_URL}/clients/${id}/statement${query ? `?${query}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to generate statement');
      return res.blob();
    });
  },
};

// Stock API
export const stockApi = {
  getLevels: (params?: {
    warehouse?: string;
    product?: string;
    lowStock?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown; warehouses?: unknown[]; pagination?: unknown }>(`/stock/levels${query ? `?${query}` : ''}`);
  },
  getMovements: (params?: { 
    productId?: string; 
    type?: 'in' | 'out' | 'adjustment';
    startDate?: string;
    endDate?: string;
    page?: number; 
    limit?: number;
    search?: string;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/stock/movements${query ? `?${query}` : ''}`);
  },
  receiveStock: (data: {
    product: string;
    quantity: number;
    unitCost: number;
    supplier?: string;
    batchNumber?: string;
    notes?: string;
  }) => request<{ success: boolean; data: unknown }>('/stock/movements', { method: 'POST', body: data }),
  adjustStock: (data: {
    product: string;
    quantity: number;
    type: 'in' | 'out';
    reason: 'damage' | 'loss' | 'theft' | 'expired' | 'correction' | 'transfer';
    notes?: string;
  }) => request<{ success: boolean; data: unknown }>('/stock/adjust', { method: 'POST', body: data }),
  getSummary: () => request<{ success: boolean; data: unknown }>('/stock/summary'),
  deleteMovement: (id: string) => request<{ success: boolean; message: string }>(`/stock/movements/${id}`, { method: 'DELETE' }),
  updateMovement: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/stock/movements/${id}`, { method: 'PUT', body: data }),
  
  // Stock Transfers API
  getTransfers: (params?: {
    status?: string;
    fromWarehouse?: string;
    toWarehouse?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown; pagination?: unknown }>(`/stock/advanced/transfers${query ? `?${query}` : ''}`);
  },
  getTransfer: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/transfers/${id}`),
  createTransfer: (data: {
    fromWarehouse: string;
    toWarehouse: string;
    transferDate: string;
    notes?: string;
    items: Array<{
      product: string;
      quantity: number;
      unitCost: number;
    }>;
  }) => request<{ success: boolean; data: unknown }>('/stock/advanced/transfers', { method: 'POST', body: data }),
  approveTransfer: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/transfers/${id}/approve`, { method: 'POST' }),
  completeTransfer: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/transfers/${id}/complete`, { method: 'POST' }),
  cancelTransfer: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/transfers/${id}/cancel`, { method: 'POST' }),
};

// Invoices API
export const invoicesApi = {
  getAll: (params?: { 
    clientId?: string; 
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number; 
    limit?: number;
    search?: string;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/invoices${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/invoices/${id}`),
  create: (invoice: unknown) => request<{ success: boolean; data: unknown }>('/invoices', { method: 'POST', body: invoice }),
  update: (id: string, invoice: unknown) => request<{ success: boolean; data: unknown }>(`/invoices/${id}`, { method: 'PUT', body: invoice }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/invoices/${id}`, { method: 'DELETE' }),
  confirm: (id: string) => request<{ success: boolean; data: unknown }>(`/invoices/${id}/confirm`, { method: 'PUT' }),
  recordPayment: (id: string, data: {
    amount: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'mobile_money';
    reference?: string;
    notes?: string;
  }) => request<{ success: boolean; data: unknown }>(`/invoices/${id}/payment`, { method: 'POST', body: data }),
  cancel: (id: string, reason?: string) => request<{ success: boolean; data: unknown }>(`/invoices/${id}/cancel`, { method: 'PUT', body: { reason } }),
  saveReceiptMetadata: (id: string, data: {
    sdcId?: string;
    receiptNumber?: string;
    receiptSignature?: string;
    internalData?: string;
    mrcCode?: string;
  }) => request<{ success: boolean; data: unknown }>(`/invoices/${id}/receipt-metadata`, { method: 'POST', body: data }),
  getPDF: (id: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/invoices/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to download PDF');
      return res.blob();
    });
  },
  getClientInvoices: (clientId: string) => request<{ success: boolean; data: unknown }>(`/invoices/client/${clientId}`),
  getProductInvoices: (productId: string) => request<{ success: boolean; data: unknown }>(`/invoices/product/${productId}`),
  sendEmail: (id: string) => request<{ success: boolean; message: string }>(`/invoices/${id}/send-email`, { method: 'POST' }),
};

// Recurring Invoices API
export const recurringApi = {
  getAll: () => request<{ success: boolean; data: unknown }>('/recurring-invoices'),
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/recurring-invoices/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/recurring-invoices', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/recurring-invoices/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/recurring-invoices/${id}`, { method: 'DELETE' }),
  trigger: () => request<{ success: boolean; message: string }>('/recurring-invoices/trigger', { method: 'POST' }),
  triggerTemplate: (id: string) => request<{ success: boolean; data: unknown }>(`/recurring-invoices/${id}/trigger`, { method: 'POST' }),
};

// Subscriptions API
export const subscriptionsApi = {
  getAll: () => request<{ success: boolean; data: unknown }>('/subscriptions'),
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/subscriptions/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/subscriptions', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/subscriptions/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/subscriptions/${id}`, { method: 'DELETE' }),
};

// Credit Notes API
export const creditNotesApi = {
  getAll: () => request<{ success: boolean; data: unknown }>('/credit-notes'),
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/credit-notes/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/credit-notes', { method: 'POST', body: data }),
  approve: (id: string, opts?: { reverseStock?: boolean; warehouseId?: string }) => 
    request<{ success: boolean; data: unknown }>(`/credit-notes/${id}/approve`, { method: 'PUT', body: opts }),
  apply: (id: string, invoiceId: string) => 
    request<{ success: boolean; data: unknown }>(`/credit-notes/${id}/apply`, { method: 'POST', body: { invoiceId } }),
  refund: (id: string, data: { amount: number; paymentMethod: string; reference?: string }) => 
    request<{ success: boolean; data: unknown }>(`/credit-notes/${id}/refund`, { method: 'POST', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/credit-notes/${id}`, { method: 'DELETE' }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/credit-notes/${id}`, { method: 'PUT', body: data }),
  confirm: (id: string) => request<{ success: boolean; data: unknown }>(`/credit-notes/${id}/confirm`, { method: 'POST' })
};

// Recurring Invoices API
export const recurringInvoicesApi = {
  getAll: (params?: { 
    status?: string;
    clientId?: string;
    frequency?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/recurring-templates${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/recurring-templates/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/recurring-templates', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/recurring-templates/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/recurring-templates/${id}`, { method: 'DELETE' }),
  pause: (id: string) => request<{ success: boolean; data: unknown }>(`/recurring-templates/${id}/pause`, { method: 'POST' }),
  resume: (id: string) => request<{ success: boolean; data: unknown }>(`/recurring-templates/${id}/resume`, { method: 'POST' }),
  cancel: (id: string) => request<{ success: boolean; data: unknown }>(`/recurring-templates/${id}/cancel`, { method: 'POST' }),
  trigger: (id: string) => request<{ success: boolean; data: unknown }>(`/recurring-templates/${id}/trigger`, { method: 'POST' }),
  getRuns: (templateId: string) => request<{ success: boolean; data: unknown }>(`/recurring-templates/${templateId}/runs`)
};

// Quotations API
export const quotationsApi = {
  getAll: (params?: { 
    clientId?: string; 
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number; 
    limit?: number;
    search?: string;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/quotations${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/quotations/${id}`),
  create: (quotation: unknown) => request<{ success: boolean; data: unknown }>('/quotations', { method: 'POST', body: quotation }),
  update: (id: string, quotation: unknown) => request<{ success: boolean; data: unknown }>(`/quotations/${id}`, { method: 'PUT', body: quotation }),
  approve: (id: string) => request<{ success: boolean; data: unknown }>(`/quotations/${id}/approve`, { method: 'PUT' }),
  convertToInvoice: (id: string, data: { dueDate?: string }) => request<{ success: boolean; data: unknown }>(`/quotations/${id}/convert-to-invoice`, { method: 'POST', body: data }),
  getClientQuotations: (clientId: string) => request<{ success: boolean; data: unknown }>(`/quotations/client/${clientId}`),
  getProductQuotations: (productId: string) => request<{ success: boolean; data: unknown }>(`/quotations/product/${productId}`),
  getPDF: (id: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/quotations/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to download PDF');
      return res.blob();
    });
  },
  delete: (id: string) => request<{ success: boolean; message: string }>(`/quotations/${id}`, { method: 'DELETE' }),
  send: (id: string) => request<{ success: boolean; data: unknown }>(`/quotations/${id}/send`, { method: 'POST' }),
  accept: (id: string) => request<{ success: boolean; data: unknown }>(`/quotations/${id}/accept`, { method: 'POST' }),
  reject: (id: string) => request<{ success: boolean; data: unknown }>(`/quotations/${id}/reject`, { method: 'POST' }),
};

// Delivery Notes API
export const deliveryNotesApi = {
  getAll: (params?: { 
    clientId?: string; 
    status?: string;
    quotationId?: string;
    startDate?: string;
    endDate?: string;
    page?: number; 
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/delivery-notes${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/delivery-notes/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/delivery-notes', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/delivery-notes/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/delivery-notes/${id}`, { method: 'DELETE' }),
  dispatch: (id: string, data: { deliveredBy?: string; vehicle?: string; deliveryAddress?: string; deliveryDate?: string }) => 
    request<{ success: boolean; data: unknown }>(`/delivery-notes/${id}/dispatch`, { method: 'PUT', body: data }),
  confirm: (id: string, data: { receivedBy?: string; receivedDate?: string; clientSignature?: string; clientStamp?: boolean; notes?: string }) => 
    request<{ success: boolean; data: unknown }>(`/delivery-notes/${id}/confirm`, { method: 'PUT', body: data }),
  cancel: (id: string, cancellationReason?: string) => 
    request<{ success: boolean; data: unknown }>(`/delivery-notes/${id}/cancel`, { method: 'PUT', body: { cancellationReason } }),
  createInvoice: (id: string, data?: { dueDate?: string; paymentTerms?: string; notes?: string; terms?: string }) => 
    request<{ success: boolean; data: unknown }>(`/delivery-notes/${id}/create-invoice`, { method: 'POST', body: data }),
  getQuotationDeliveryNotes: (quotationId: string) => 
    request<{ success: boolean; data: unknown }>(`/delivery-notes/quotation/${quotationId}`),
  updateItemDeliveryQty: (id: string, itemId: string, data: { deliveredQty: number; notes?: string }) => 
    request<{ success: boolean; data: unknown }>(`/delivery-notes/${id}/items/${itemId}`, { method: 'PUT', body: data }),
  getPDF: (id: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/delivery-notes/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to download PDF');
      return res.blob();
    });
  },
};

// Access control & security API (roles, 2FA, IP whitelist endpoints)
export const accessApi = {
  getRoles: () => request<{ success: boolean; data: unknown }>('/access/roles'),
  createRole: (data: { name: string; description?: string; permissions?: string[] }) => request<{ success: boolean; data: unknown }>('/access/roles', { method: 'POST', body: data }),
  updateRole: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/access/roles/${id}`, { method: 'PUT', body: data }),
  deleteRole: (id: string) => request<{ success: boolean; message: string }>(`/access/roles/${id}`, { method: 'DELETE' }),
  // 2FA
  setup2FA: () => request<{ success: boolean; data: { qr: string; secret: string } }>('/access/2fa/setup', { method: 'POST' }),
  verify2FA: (token: string) => request<{ success: boolean; message: string }>('/access/2fa/verify', { method: 'POST', body: { token } }),
  disable2FA: () => request<{ success: boolean; message: string }>('/access/2fa/disable', { method: 'POST' }),
  // IP Whitelist
  getIPWhitelist: () => request<{ success: boolean; data: unknown }>('/access/ip-whitelist'),
  createIPWhitelist: (data: { ip: string; description?: string; enabled?: boolean }) => request<{ success: boolean; data: unknown }>('/access/ip-whitelist', { method: 'POST', body: data }),
  updateIPWhitelist: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/access/ip-whitelist/${id}`, { method: 'PUT', body: data }),
  deleteIPWhitelist: (id: string) => request<{ success: boolean; message: string }>(`/access/ip-whitelist/${id}`, { method: 'DELETE' }),
};

// Purchases API
export const purchasesApi = {
  getAll: (params?: { 
    supplierId?: string; 
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number; 
    limit?: number;
    search?: string;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/purchases${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/purchases/${id}`),
  create: (purchase: unknown) => request<{ success: boolean; data: unknown }>('/purchases', { method: 'POST', body: purchase }),
  update: (id: string, purchase: unknown) => request<{ success: boolean; data: unknown }>(`/purchases/${id}`, { method: 'PUT', body: purchase }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/purchases/${id}`, { method: 'DELETE' }),
  receive: (id: string) => request<{ success: boolean; data: unknown }>(`/purchases/${id}/receive`, { method: 'PUT' }),
  recordPayment: (id: string, data: {
    amount: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'credit';
    reference?: string;
    notes?: string;
    useCapital?: boolean;
    capitalType?: 'owner' | 'share';
  }) => request<{ success: boolean; data: unknown }>(`/purchases/${id}/payment`, { method: 'POST', body: data }),
  cancel: (id: string, reason?: string) => request<{ success: boolean; data: unknown }>(`/purchases/${id}/cancel`, { method: 'PUT', body: { reason } }),
  getPDF: (id: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/purchases/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to download PDF');
      return res.blob();
    });
  },
  getSupplierPurchases: (supplierId: string) => request<{ success: boolean; data: unknown }>(`/purchases/supplier/${supplierId}`),
};

// Purchase Orders API (Advanced Stock)
export const purchaseOrdersApi = {
  getAll: (params?: {
    supplier_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown; pagination?: unknown }>(`/stock/advanced/purchase-orders${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown; grns?: unknown[] }>(`/stock/advanced/purchase-orders/${id}`),
  create: (po: unknown) => request<{ success: boolean; data: unknown }>('/stock/advanced/purchase-orders', { method: 'POST', body: po }),
  update: (id: string, po: unknown) => request<{ success: boolean; data: unknown }>(`/stock/advanced/purchase-orders/${id}`, { method: 'PUT', body: po }),
  approve: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/purchase-orders/${id}/approve`, { method: 'POST' }),
  cancel: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/purchase-orders/${id}/cancel`, { method: 'POST' }),
};

// GRN API
export const grnApi = {
  getAll: (params?: { supplier_id?: string; status?: string; date_from?: string; date_to?: string; page?: number; limit?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown; pagination?: unknown }>(`/stock/advanced/grn${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/grn/${id}`),
  create: (data: {
    purchaseOrderId: string;
    warehouse: string;
    referenceNo: string;
    supplierInvoiceNo?: string;
    lines: Array<{
      product: string;
      qtyReceived: number;
      unitCost: number;
      purchaseOrderLine?: string;
      batchNo?: string;
      serialNumbers?: string[];
    }>;
  }) => request<{ success: boolean; data: unknown }>('/stock/advanced/grn', { method: 'POST', body: data }),
  confirm: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/grn/${id}/confirm`, { method: 'POST' }),
};

// Purchase Returns API
export const purchaseReturnsApi = {
  getAll: (params?: { supplier_id?: string; status?: string; date_from?: string; date_to?: string; page?: number; limit?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown; pagination?: unknown }>(`/stock/advanced/purchase-returns${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/purchase-returns/${id}`),
  create: (data: {
    referenceNo: string;
    grn: string;
    supplier: string;
    warehouse: string;
    reason: string;
    supplierCreditNoteNo?: string;
    lines: Array<{
      grnLine: string;
      product: string;
      qtyReturned: number;
      unitCost: number;
    }>;
  }) => request<{ success: boolean; data: unknown }>('/stock/advanced/purchase-returns', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/stock/advanced/purchase-returns/${id}`, { method: 'PUT', body: data }),
  confirm: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/purchase-returns/${id}/confirm`, { method: 'PUT' }),
};

// Reports API
export const reportsApi = {
  // Basic reports
  getStockValuation: (params?: { categoryId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/stock-valuation${query ? `?${query}` : ''}`);
  },
  getStockMovement: (params?: { productId?: string; warehouseId?: string; startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/stock-movement${query ? `?${query}` : ''}`);
  },
  getLowStock: (params?: { warehouseId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/low-stock${query ? `?${query}` : ''}`);
  },
  getDeadStock: (params?: { warehouseId?: string; daysSinceLastMovement?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/dead-stock${query ? `?${query}` : ''}`);
  },
  getStockAging: (params?: { warehouseId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/stock-aging${query ? `?${query}` : ''}`);
  },
  getInventoryTurnover: (params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/inventory-turnover${query ? `?${query}` : ''}`);
  },
  getBatchExpiry: (params?: { warehouseId?: string; daysUntilExpiry?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/batch-expiry${query ? `?${query}` : ''}`);
  },
  getSerialNumberTracking: (params?: { warehouseId?: string; status?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/serial-number-tracking${query ? `?${query}` : ''}`);
  },
  getWarehouseStock: (params?: { warehouseId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/warehouse-stock${query ? `?${query}` : ''}`);
  },
  getSalesSummary: (params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/sales-summary${query ? `?${query}` : ''}`);
  },
  getProductMovement: (params?: { productId?: string; type?: string; startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/product-movement${query ? `?${query}` : ''}`);
  },
  
  // Advanced reports
  getProfitAndLoss: (params?: { startDate?: string; endDate?: string; companyId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/profit-and-loss${query ? `?${query}` : ''}`);
  },
  getProfitAndLossDetailed: (params?: { startDate?: string; endDate?: string; companyId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/profit-and-loss-detailed${query ? `?${query}` : ''}`);
  },
  getProfitAndLossFull: (params?: { startDate?: string; endDate?: string; previousPeriodStart?: string; previousPeriodEnd?: string; companyId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/profit-and-loss-full${query ? `?${query}` : ''}`);
  },
  getAging: (params?: { type?: 'receivables' | 'payables'; companyId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: { count: number; buckets: unknown }; fromCache?: boolean }>(`/reports/aging${query ? `?${query}` : ''}`);
  },
  getVATSummary: (params?: { startDate?: string; endDate?: string; companyId?: string; recalculate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: { summary: unknown }; fromCache?: boolean }>(`/reports/vat-summary${query ? `?${query}` : ''}`);
  },
  getProductPerformance: (params?: { startDate?: string; endDate?: string; limit?: number; companyId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: { count: number; data: Array<{ product: unknown; quantitySold: number; revenue: number; cogs: number; margin: number }> }; fromCache?: boolean }>(`/reports/product-performance${query ? `?${query}` : ''}`);
  },
  getCLV: (params?: { companyId?: string; limit?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: { count: number; data: Array<{ _id: unknown; totalSales: number; orders: number; avgOrder: number; firstOrder: Date; lastOrder: Date }> }; fromCache?: boolean }>(`/reports/clv${query ? `?${query}` : ''}`);
  },
  getCashFlow: (params?: { startDate?: string; endDate?: string; companyId?: string; period?: 'weekly' | 'monthly' | 'yearly' }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: { period: unknown; periodType: unknown; months: unknown }; fromCache?: boolean }>(`/reports/cash-flow${query ? `?${query}` : ''}`);
  },
  getBudgetVsActual: (params?: { budgetId: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/budget-vs-actual${query ? `?${query}` : ''}`);
  },
  getBalanceSheet: (params?: { asOfDate?: string; startDate?: string; endDate?: string; companyId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/balance-sheet${query ? `?${query}` : ''}`);
  },
  getFinancialRatios: (params?: { asOfDate?: string; startDate?: string; endDate?: string; companyId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/financial-ratios${query ? `?${query}` : ''}`);
  },
  
  // Client/Supplier Reports
  getClientSalesReport: (params?: { startDate?: string; endDate?: string; limit?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: { count: number; data: Array<{ client: unknown; totalSales: number; invoiceCount: number; avgOrderValue: number }> } }>(`/reports/client-sales${query ? `?${query}` : ''}`);
  },
  getSupplierPurchaseReport: (params?: { startDate?: string; endDate?: string; limit?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: { count: number; data: Array<{ supplier: unknown; totalPurchases: number; purchaseCount: number; avgOrderValue: number }> } }>(`/reports/supplier-purchase${query ? `?${query}` : ''}`);
  },
  getClientCreditLimitReport: (params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: { count: number; data: Array<{ client: unknown; creditLimit: number; currentBalance: number; availableCredit: number; utilizationPercent: number }> } }>(`/reports/client-credit-limit${query ? `?${query}` : ''}`);
  },
  getNewClientsReport: (params?: { startDate?: string; endDate?: string; limit?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: { count: number; data: Array<{ client: unknown; firstPurchaseDate: string; totalOrders: number; totalRevenue: number }> } }>(`/reports/new-clients${query ? `?${query}` : ''}`);
  },
  getInactiveClientsReport: (params?: { days?: number; limit?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: { count: number; data: Array<{ client: unknown; lastPurchaseDate: string; daysInactive: number; totalOrders: number; totalRevenue: number }> } }>(`/reports/inactive-clients${query ? `?${query}` : ''}`);
  },

  // Export functions
  exportExcel: (reportType: string, params?: { startDate?: string; endDate?: string; periodType?: string; year?: number; periodNumber?: number }) => {
    const token = localStorage.getItem('token');
    const query = buildQuery(params as Record<string, any>);
    return fetch(`${API_BASE_URL}/reports/export/excel/${reportType}${query ? `?${query}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to export Excel');
      return res.blob();
    });
  },
  exportPDF: (reportType: string, params?: { startDate?: string; endDate?: string; periodType?: string; year?: number; periodNumber?: number }) => {
    const token = localStorage.getItem('token');
    const query = buildQuery(params as Record<string, any>);
    return fetch(`${API_BASE_URL}/reports/export/pdf/${reportType}${query ? `?${query}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to export PDF');
      return res.blob();
    });
  },
  
  // Period-based reports (new)
  getPeriodReport: (periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual', params?: { year?: number; periodNumber?: number; reportType?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/reports/period/${periodType}${query ? `?${query}` : ''}`);
  },
  getAvailablePeriods: (periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual') => {
    return request<{ success: boolean; data: { periodType: string; currentPeriod: { year: number; periodNumber: number }; availablePeriods: Array<{ year: number; periodNumber: number; label: string; startDate: string; endDate: string; hasSnapshot: boolean; isCurrent?: boolean; generatedAt?: string }> } }>(`/reports/periods/${periodType}/available`);
  },
  generateManualSnapshot: (data: { periodType: string; year: number; periodNumber: number }) => {
    return request<{ success: boolean; message: string; data: unknown }>('/reports/generate-snapshot', { method: 'POST', body: data });
  },
};

// Users API (Admin only)
export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; role?: string; isActive?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/users${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/users/${id}`),
  create: (user: { name: string; email: string; role?: string; generateTemp?: boolean; password?: string }) =>
    request<{ success: boolean; data: unknown; tempPassword?: string }>('/users', { method: 'POST', body: user }),
  update: (id: string, user: unknown) => request<{ success: boolean; data: unknown }>(`/users/${id}`, { method: 'PUT', body: user }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id: string, body?: { newPassword?: string }) =>
    request<{ success: boolean; message: string; tempPassword?: string }>(`/users/${id}/reset-password`, { method: 'POST', body }),
  toggleStatus: (id: string) =>
    request<{ success: boolean; data: unknown; message: string }>(`/users/${id}/toggle-status`, { method: 'PUT' }),
  getActionLogs: (userId: string, params?: { page?: number; limit?: number; module?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/users/${userId}/action-logs${query ? `?${query}` : ''}`);
  },
};

// Chat / AI Assistant API
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const chatApi = {
  send: async (message: string, history: ChatMessage[] = []): Promise<{ success: boolean; reply: string }> => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, history }),
    });

    let data: any;
    try { data = await response.json(); } catch { data = {}; }

    // Always return the reply field if present (covers both success and error responses)
    if (data.reply) return { success: data.success ?? false, reply: data.reply };

    if (!response.ok) {
      throw new ApiError(response.status, data.message || 'An error occurred');
    }
    return data;
  },
};

export { ApiError };
export { request as api };
export default request;

// Exchange Rates API
export interface ExchangeRateData {
  USD: number;
  EUR: number;
  GBP: number;
  FRW: number;
  LBP: number;
  SAR: number;
  AED: number;
  TZS: number;
  UGX: number;
  KES: number;
  BIF: number;
  ZMW: number;
  MWK: number;
  AOA: number;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

export const exchangeRatesApi = {
  // Get current exchange rates
  getRates: (params?: { forceRefresh?: boolean }) => {
    const query = params?.forceRefresh ? '?forceRefresh=true' : '';
    return request<{ success: boolean; data: { rates: ExchangeRateData; source: string; timestamp: string; cached: boolean } }>(`/exchange-rates${query}`);
  },
  
  // Get list of supported currencies
  getCurrencies: () => {
    return request<{ success: boolean; data: CurrencyInfo[] }>('/exchange-rates/currencies');
  },
  
  // Convert amount between currencies
  convert: (amount: number, from: string, to: string) => {
    return request<{ success: boolean; data: { originalAmount: number; convertedAmount: number; from: string; to: string; rate: number } }>('/exchange-rates/convert', {
      method: 'POST',
      body: { amount, from, to }
    });
  },
  
  // Get exchange rate history
  getHistory: (params?: { baseCurrency?: string; targetCurrency?: string; startDate?: string; endDate?: string; limit?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; data: unknown[] }>(`/exchange-rates/history${query ? `?${query}` : ''}`);
  },
  
  // Manual update (admin only)
  updateManualRate: (baseCurrency: string, targetCurrency: string, rate: number) => {
    return request<{ success: boolean; data: unknown }>('/exchange-rates/manual', {
      method: 'PUT',
      body: { baseCurrency, targetCurrency, rate }
    });
  }
};

// Advanced Stock API - Warehouses
export const warehouseApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/stock/advanced/warehouses${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/warehouses/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/stock/advanced/warehouses', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/stock/advanced/warehouses/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/stock/advanced/warehouses/${id}`, { method: 'DELETE' }),
  getInventory: (id: string, params?: { page?: number; limit?: number; search?: string; lowStock?: boolean; expiring?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/stock/advanced/warehouses/${id}/inventory${query ? `?${query}` : ''}`);
  },
};

// Advanced Stock API - Inventory Batches
export const inventoryBatchApi = {
  getAll: (params?: { page?: number; limit?: number; productId?: string; warehouseId?: string; status?: string; search?: string; expiring?: boolean; lowStock?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/stock/advanced/batches${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/batches/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/stock/advanced/batches', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/stock/advanced/batches/${id}`, { method: 'PUT', body: data }),
  consume: (id: string, data: { quantity: number; notes?: string; referenceType?: string; referenceNumber?: string }) => 
    request<{ success: boolean; data: unknown }>(`/stock/advanced/batches/${id}/consume`, { method: 'POST', body: data }),
  getExpiring: (params?: { days?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/stock/advanced/batches/expiring${query ? `?${query}` : ''}`);
  },
  getByProduct: (productId: string, params?: { warehouseId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/stock/advanced/batches/product/${productId}${query ? `?${query}` : ''}`);
  },
};

// Advanced Stock API - Serial Numbers
export const serialNumberApi = {
  getAll: (params?: { page?: number; limit?: number; productId?: string; warehouseId?: string; status?: string; search?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/stock/advanced/serial-numbers${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/serial-numbers/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/stock/advanced/serial-numbers', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/stock/advanced/serial-numbers/${id}`, { method: 'PUT', body: data }),
  sell: (id: string, data: { clientId?: string; saleDate?: string; salePrice?: number; invoiceId?: string; warrantyEndDate?: string; notes?: string }) =>
    request<{ success: boolean; data: unknown }>(`/stock/advanced/serial-numbers/${id}/sell`, { method: 'POST', body: data }),
  return: (id: string, data: { warehouseId?: string; notes?: string }) =>
    request<{ success: boolean; data: unknown }>(`/stock/advanced/serial-numbers/${id}/return`, { method: 'POST', body: data }),
  lookup: (serial: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/serial-numbers/lookup/${serial}`),
  getAvailable: (productId: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/serial-numbers/product/${productId}/available`),
};

// Advanced Stock API - Stock Transfers
export const stockTransferApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; fromWarehouse?: string; toWarehouse?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/stock/advanced/transfers${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/transfers/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/stock/advanced/transfers', { method: 'POST', body: data }),
  approve: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/transfers/${id}/approve`, { method: 'POST' }),
  complete: (id: string, data?: { receivedNotes?: string }) => 
    request<{ success: boolean; data: unknown }>(`/stock/advanced/transfers/${id}/complete`, { method: 'POST', body: data }),
  cancel: (id: string, reason?: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/transfers/${id}/cancel`, { method: 'POST', body: { reason } }),
};

// Stock Audits API - matches backend /api/stock-audits endpoints
export const stockAuditApi = {
  // Get all stock audits with filters
  getAll: (params?: { 
    page?: number; 
    limit?: number; 
    status?: string; 
    warehouse?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; total: number; pages: number; currentPage: number; data: StockAudit[] }>(`/stock-audits${query ? `?${query}` : ''}`);
  },
  // Get single stock audit by ID
  getById: (id: string) => request<{ success: boolean; data: StockAudit }>(`/stock-audits/${id}`),
  // Create new stock audit
  create: (data: {
    warehouse: string;
    auditDate?: string;
    type?: string;
    category?: string;
    notes?: string;
    products?: string[];
  }) => request<{ success: boolean; message: string; data: StockAudit }>('/stock-audits', { method: 'POST', body: data }),
  // Update stock audit
  update: (id: string, data: { notes?: string; type?: string }) => 
    request<{ success: boolean; message: string; data: StockAudit }>(`/stock-audits/${id}`, { method: 'PUT', body: data }),
  // Delete stock audit (only draft)
  delete: (id: string) => request<{ success: boolean; message: string }>(`/stock-audits/${id}`, { method: 'DELETE' }),
  // Bulk update audit lines (counted quantities)
  bulkUpdateLines: (id: string, lines: { productId: string; qtyCounted: number }[]) => 
    request<{ success: boolean; message: string; data: StockAudit }>(`/stock-audits/${id}/lines`, { method: 'PUT', body: { lines } }),
  // Update single audit line
  updateLine: (id: string, lineId: string, data: { qtyCounted?: number; notes?: string }) => 
    request<{ success: boolean; message: string; data: StockAuditLine }>(`/stock-audits/${id}/lines/${lineId}`, { method: 'PUT', body: data }),
  // Post stock audit
  post: (id: string) => request<{ success: boolean; message: string; data: StockAudit }>(`/stock-audits/${id}/post`, { method: 'POST' }),
  // Cancel stock audit
  cancel: (id: string, reason?: string) => request<{ success: boolean; message: string; data: StockAudit }>(`/stock-audits/${id}/cancel`, { method: 'POST', body: { reason } }),
};

// Stock Audit Types
export interface StockAuditLine {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
  };
  qtySystem: string;
  qtyCounted: string | null;
  qtyVariance: string;
  unitCost: string;
  varianceValue: string;
  journalEntry?: string;
  notes?: string;
}

export interface StockAudit {
  _id: string;
  company: string;
  referenceNo: string;
  warehouse: {
    _id: string;
    name: string;
    code: string;
  };
  auditDate: string;
  status: 'draft' | 'counting' | 'posted' | 'cancelled';
  type: 'full' | 'partial' | 'cycle_count' | 'spot_check';
  category?: string;
  notes?: string;
  items: StockAuditLine[];
  totalItems: number;
  itemsCounted: number;
  itemsWithVariance: number;
  totalVarianceValue: string;
  postedBy?: {
    _id: string;
    name: string;
  };
  postedAt?: string;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
};

// Stock Batches API - /api/stock-batches endpoints
export interface StockBatch {
  _id: string;
  company: string;
  batchNo: string;
  product: {
    _id: string;
    name: string;
    sku: string;
    trackingType?: string;
  };
  warehouse: {
    _id: string;
    name: string;
    code: string;
  };
  grn?: {
    _id: string;
    referenceNo: string;
  };
  qtyReceived: string;
  qtyOnHand: string;
  unitCost: string;
  manufactureDate?: string;
  expiryDate?: string;
  isQuarantined: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const stockBatchApi = {
  // Get all stock batches with filters
  getAll: (params?: {
    page?: number;
    limit?: number;
    product?: string;
    warehouse?: string;
    search?: string;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: StockBatch[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/stock-batches${query ? `?${query}` : ''}`);
  },
  // Get single stock batch by ID
  getById: (id: string) => request<{ success: boolean; data: StockBatch }>(`/stock-batches/${id}`),
  // Get expiring batches
  getExpiring: (params?: { page?: number; limit?: number; days?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: StockBatch[] }>(`/stock-batches/expiring${query ? `?${query}` : ''}`);
  },
  // Toggle quarantine status
  toggleQuarantine: (id: string) => request<{ success: boolean; data: StockBatch }>(`/stock-batches/${id}/quarantine`, { method: 'PUT' }),
};

// Advanced Stock API - Reorder Points
export const reorderPointApi = {
  getAll: (params?: { page?: number; limit?: number; productId?: string; supplierId?: string; isActive?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/stock/advanced/reorder-points${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/reorder-points/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/stock/advanced/reorder-points', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/stock/advanced/reorder-points/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/stock/advanced/reorder-points/${id}`, { method: 'DELETE' }),
  getNeedingReorder: () => request<{ success: boolean; data: unknown }>('/stock/advanced/reorder-points/needing-reorder'),
  bulkCreate: (items: unknown[]) => request<{ success: boolean; data: unknown }>('/stock/advanced/reorder-points/bulk', { method: 'POST', body: { items } }),
  applyToProduct: (data: {
    productId: string;
    reorderPoint: number;
    reorderQuantity?: number;
    safetyStock?: number;
    supplierId?: string;
    estimatedUnitCost?: number;
    autoReorder?: boolean;
  }) => request<{ success: boolean; data: unknown; autoPOCreated?: boolean }>('/stock/advanced/reorder-points/apply-to-product', { method: 'POST', body: data }),
  triggerAutoCheck: () => request<{ success: boolean; message: string }>('/stock/advanced/reorder-points/trigger-auto-check', { method: 'POST' }),
};

// Fixed Assets API
export const fixedAssetsApi = {
  getAll: (params?: { status?: string; category?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; data: unknown; summary: unknown }>(`/fixed-assets${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/fixed-assets/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/fixed-assets', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/fixed-assets/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/fixed-assets/${id}`, { method: 'DELETE' }),
  getSummary: () => request<{ success: boolean; data: unknown }>('/fixed-assets/summary'),
  // Depreciation
  getDepreciationPreview: (period?: string) => {
    const query = period ? `?period=${period}` : '';
    return request<{ success: boolean; data: unknown }>(`/fixed-assets/depreciation-preview${query}`);
  },
  runDepreciation: (data: { period?: string; assetId?: string }) => 
    request<{ success: boolean; data: unknown }>('/fixed-assets/run-depreciation', { method: 'POST', body: data }),
  getDepreciationHistory: (id: string) => 
    request<{ success: boolean; data: unknown }>(`/fixed-assets/${id}/depreciation-history`),
  getDepreciationSchedule: (id: string) => 
    request<{ success: boolean; data: unknown }>(`/fixed-assets/${id}/depreciation-schedule`),
  calculateDepreciation: (id: string, periodDate?: string) => {
    const query = periodDate ? `?periodDate=${periodDate}` : '';
    return request<{ success: boolean; data: unknown }>(`/fixed-assets/${id}/calculate-depreciation${query}`);
  },
  postDepreciation: (id: string, periodDate?: string) => {
    const body = periodDate ? { periodDate } : {};
    return request<{ success: boolean; data: unknown }>(`/fixed-assets/${id}/depreciate`, { method: 'POST', body });
  },
  dispose: (id: string, data: { disposalDate: string; disposalProceeds?: number; disposalMethod?: string; notes?: string }) => 
    request<{ success: boolean; data: unknown }>(`/fixed-assets/${id}/dispose`, { method: 'POST', body: data }),
  getDepreciationReport: () => 
    request<{ success: boolean; data: unknown }>('/fixed-assets/report/depreciation'),
  getDepreciationEntries: (id: string) => 
    request<{ success: boolean; data: unknown }>(`/fixed-assets/${id}/depreciation-entries`),
  reverseDepreciation: (id: string, entryId: string, reason?: string) => 
    request<{ success: boolean; data: unknown }>(`/fixed-assets/${id}/depreciation/${entryId}/reverse`, { method: 'POST', body: { reason } }),
};

export const assetCategoriesApi = {
  getAll: (params?: { isActive?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: AssetCategory[] }>(`/asset-categories${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: AssetCategory }>(`/asset-categories/${id}`),
  create: (data: Partial<AssetCategory>) => request<{ success: boolean; data: AssetCategory }>('/asset-categories', { method: 'POST', body: data }),
  update: (id: string, data: Partial<AssetCategory>) => request<{ success: boolean; data: AssetCategory }>(`/asset-categories/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean }>(`/asset-categories/${id}`, { method: 'DELETE' }),
};

// Loans/Liabilities API
export interface Liability {
  _id: string;
  loanNumber: string;
  name: string;
  loanType?: string;
  type?: string;
  lenderName?: string;
  lenderContact?: string;
  originalAmount: number;
  principalAmount?: number;
  outstandingBalance: number;
  amountPaid?: number;
  interestRate: number;
  interestMethod?: string;
  durationMonths?: number;
  startDate: string;
  endDate?: string;
  status: string;
  liabilityAccountId?: string;
  interestExpenseAccountId?: string;
  purpose?: string;
  collateral?: string;
  notes?: string;
  paymentTerms?: string;
  monthlyPayment?: number;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  transactions?: LiabilityTransaction[];
  payments?: Array<{
    amount: number;
    paymentDate: string;
    paymentMethod?: string;
    reference?: string;
    notes?: string;
  }>;
}

export interface LiabilityTransaction {
  _id: string;
  transactionDate: string;
  type: 'drawdown' | 'repayment' | 'interest_charge' | 'interest';
  amount: number;
  principalPortion?: number;
  interestPortion?: number;
  reference?: string;
  notes?: string;
  bankAccountId?: string;
  journalEntryId?: string;
}

export interface PaymentScheduleResponse {
  loanNumber: string;
  name: string;
  status: string;
  originalAmount: number;
  outstandingBalance: number;
  amountPaid: number;
  inputs: {
    originalAmount: number;
    interestRate: number;
    durationMonths: number;
    interestMethod: string;
    startDate: string;
  };
  schedule: {
    monthlyPayment: number;
    totalPayment: number;
    totalInterest: number;
    schedule: Array<{
      paymentNumber: number;
      paymentDate: string;
      principalPortion: number;
      interestPortion: number;
      totalPayment: number;
      remainingBalance: number;
    }>;
  };
}

export const loansApi = {
  getAll: (params?: { status?: string; loanType?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; data: Liability[]; summary: unknown }>(`/loans${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: Liability }>(`/loans/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: Liability }>('/loans', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: Liability }>(`/loans/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/loans/${id}`, { method: 'DELETE' }),
  cancel: (id: string, reason?: string) => request<{ success: boolean; data: Liability; message: string }>(`/loans/${id}/cancel`, { method: 'POST', body: { reason } }),
  recordPayment: (id: string, data: { amount: number; paymentMethod: string; reference?: string; notes?: string }) =>
    request<{ success: boolean; data: Liability }>(`/loans/${id}/payment`, { method: 'POST', body: data }),
  getSummary: () => request<{ success: boolean; data: unknown }>('/loans/summary'),
  // Drawdown - record money received from liability
  recordDrawdown: (id: string, data: { amount: number; bankAccountId: string; transactionDate?: string; notes?: string }) =>
    request<{ success: boolean; data: Liability; journalEntry: unknown }>(`/loans/${id}/drawdown`, { method: 'POST', body: data }),
  // Repayment - record payment to liability
  recordRepayment: (id: string, data: { principalPortion: number; interestPortion?: number; bankAccountId: string; transactionDate?: string; notes?: string }) =>
    request<{ success: boolean; data: Liability; journalEntry: unknown }>(`/loans/${id}/repayment`, { method: 'POST', body: data }),
  // Interest - record interest charge/accrual
  recordInterest: (id: string, data: { amount: number; chargeDate?: string; notes?: string }) =>
    request<{ success: boolean; data: Liability; journalEntry: unknown }>(`/loans/${id}/interest`, { method: 'POST', body: data }),
  // Get transaction history
  getTransactions: (id: string) => request<{ success: boolean; data: LiabilityTransaction[] }>(`/loans/${id}/transactions`),
  // Payment schedule calculation
  calculatePaymentSchedule: (data: { originalAmount: number; interestRate: number; durationMonths: number; interestMethod?: string; startDate?: string; loanType?: string }) =>
    request<{ success: boolean; data: unknown }>('/loans/calculate', { method: 'POST', body: data }),
  // Get payment schedule for existing loan
  getPaymentSchedule: (id: string) => request<{ success: boolean; data: unknown }>(`/loans/${id}/schedule`),
};

// Budget API
export interface BudgetItem {
  _id?: string;
  category: string;
  subcategory?: string;
  description?: string;
  budgetedAmount: number;
  actualAmount?: number;
  variance?: number;
  variancePercent?: number;
}

export interface Budget {
  _id: string;
  budgetId: string;
  name: string;
  description?: string;
  company: string;
  type: 'revenue' | 'expense' | 'profit';
  status: 'draft' | 'active' | 'closed' | 'cancelled';
  periodStart: string;
  periodEnd: string;
  periodType: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  amount: number;
  originalAmount: number;
  adjustedAmount?: number;
  items?: BudgetItem[];
  department?: string;
  notes?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: { _id: string; name: string; email: string };
  approvedAt?: string;
  rejectionReason?: string;
  createdBy: { _id: string; name: string; email: string };
  updatedBy?: { _id: string; name: string; email: string };
  version: number;
  previousVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetComparison {
  budget: Budget;
  actual: {
    total: number;
    byMonth: Array<{ year: number; month: number; amount: number; count: number }>;
    breakdown: Record<string, number>;
  };
  variance: {
    amount: number;
    percent: number;
    status: 'under_budget' | 'over_budget';
  };
  utilization: {
    percent: number;
    remaining: number;
  };
  itemComparisons: BudgetItem[];
  summary: {
    budgetedAmount: number;
    actualAmount: number;
    varianceAmount: number;
    variancePercent: number;
    utilizationPercent: number;
    status: 'on_track' | 'exceeded';
  };
}

export const budgetsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: Budget[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/budgets${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: Budget }>(`/budgets/${id}`),
  create: (data: {
    name: string;
    description?: string;
    type: 'revenue' | 'expense' | 'profit';
    status?: 'draft' | 'active';
    periodStart: string;
    periodEnd: string;
    periodType?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
    amount: number;
    department?: string;
    notes?: string;
    items?: BudgetItem[];
  }) => request<{ success: boolean; data: Budget }>('/budgets', { method: 'POST', body: data }),
  update: (id: string, data: Partial<{
    name: string;
    description: string;
    type: 'revenue' | 'expense' | 'profit';
    status: 'draft' | 'active' | 'closed' | 'cancelled';
    periodStart: string;
    periodEnd: string;
    periodType: 'monthly' | 'quarterly' | 'yearly' | 'custom';
    amount: number;
    department: string;
    notes: string;
    items: BudgetItem[];
  }>) => request<{ success: boolean; data: Budget }>(`/budgets/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/budgets/${id}`, { method: 'DELETE' }),
  approve: (id: string) => request<{ success: boolean; data: Budget; message: string }>(`/budgets/${id}/approve`, { method: 'POST' }),
  reject: (id: string, reason?: string) => request<{ success: boolean; data: Budget; message: string }>(`/budgets/${id}/reject`, { method: 'POST', body: { reason } }),
  getComparison: (id: string) => request<{ success: boolean; data: BudgetComparison }>(`/budgets/${id}/compare`),
  getAllComparisons: (params?: { status?: string; type?: string; periodStart?: string; periodEnd?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: Array<{
      _id: string;
      budgetId: string;
      name: string;
      type: string;
      status: string;
      periodStart: string;
      periodEnd: string;
      budgetedAmount: number;
      actualAmount: number;
      variance: number;
      variancePercent: number;
      utilizationPercent: number;
    }>; summary: {
      totalBudgets: number;
      activeBudgets: number;
      totalBudgeted: number;
      totalActual: number;
      averageUtilization: number;
    } }>(`/budgets/compare/all${query ? `?${query}` : ''}`);
  },
  getSummary: () => request<{ success: boolean; data: {
    budgets: Array<{
      _id: string;
      budgetId: string;
      name: string;
      type: string;
      budgetedAmount: number;
      actualAmount: number;
      variance: number;
      variancePercent: number;
      utilization: number;
      isOnTrack: boolean;
    }>;
    totals: {
      totalBudgeted: number;
      totalActual: number;
      totalVariance: number;
    };
    status: {
      onTrack: number;
      exceeded: number;
      total: number;
    };
    pendingApprovals: number;
    draftBudgets: number;
  } }>('/budgets/summary'),
  clone: (id: string, data: { newPeriodStart: string; newPeriodEnd: string; newName?: string }) =>
    request<{ success: boolean; data: Budget; message: string }>(`/budgets/${id}/clone`, { method: 'POST', body: data }),
  close: (id: string, notes?: string) =>
    request<{ success: boolean; data: Budget; message: string }>(`/budgets/${id}/close`, { method: 'POST', body: { notes } }),
  // Forecasting methods
  getRevenueForecast: (months?: number) => {
    const query = months ? `?months=${months}` : '';
    return request<{ success: boolean; data: {
      historical: Array<{ year: number; month: number; revenue: number; count: number }>;
      forecast: Array<{
        year: number;
        month: number;
        monthName: string;
        projectedRevenue: number;
        confidence: string;
        trend: string | null;
      }>;
      summary: {
        averageMonthlyRevenue: number;
        totalProjected: number;
        trend: number;
        trendDirection: string;
        dataPoints: number;
      }
    } }>(`/budgets/forecast/revenue${query}`);
  },
  getExpenseForecast: (months?: number) => {
    const query = months ? `?months=${months}` : '';
    return request<{ success: boolean; data: {
      historical: Array<{ year: number; month: number; expense: number; count: number }>;
      forecast: Array<{
        year: number;
        month: number;
        monthName: string;
        projectedExpense: number;
        confidence: string;
        trend: string | null;
      }>;
      summary: {
        averageMonthlyExpense: number;
        totalProjected: number;
        trend: number;
        trendDirection: string;
        dataPoints: number;
      }
    } }>(`/budgets/forecast/expense${query}`);
  },
  getCashFlowForecast: (months?: number) => {
    const query = months ? `?months=${months}` : '';
    return request<{ success: boolean; data: {
      currentPosition: {
        receivables: number;
        payables: number;
        netPosition: number;
      };
      historicalNetFlow: Array<{
        year: number;
        month: number;
        revenue: number;
        expense: number;
        netFlow: number;
      }>;
      forecast: Array<{
        year: number;
        month: number;
        monthName: string;
        projectedRevenue: number;
        projectedExpense: number;
        netCashFlow: number;
        cumulativeCashFlow: number;
      }>;
      summary: {
        averageMonthlyRevenue: number;
        averageMonthlyExpense: number;
        averageNetCashFlow: number;
        projectedTotalRevenue: number;
        projectedTotalExpense: number;
        projectedNetCashFlow: number;
        revenueTrend: number;
        expenseTrend: number;
        dataPoints: number;
      }
    } }>(`/budgets/forecast/cashflow${query}`);
  }
};

// Expenses API
export interface Expense {
  _id: string;
  company: string;
  type: 'salaries_wages' | 'rent' | 'utilities' | 'transport_delivery' | 'marketing_advertising' | 'other_expense' | 'interest_income' | 'other_income' | 'other_expense_income';
  category: string;
  expenseNumber?: string;
  reference?: string;
  description?: string;
  amount: number;
  taxAmount?: number;
  totalAmount?: number;
  expenseDate: string;
  period: string;
  status: 'draft' | 'recorded' | 'approved' | 'cancelled' | 'posted' | 'reversed';
  paymentMethod: 'cash' | 'bank' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'credit_card' | 'petty_cash' | 'payable';
  paid: boolean;
  paidDate?: string;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  createdBy: { _id: string; name: string; email: string };
  approvedBy?: { _id: string; name: string; email: string };
  // New fields from backend
  account?: {
    _id: string;
    code: string;
    name: string;
  } | null;
  method?: string;
  bankAccount?: {
    _id: string;
    code: string;
    name: string;
  } | null;
  pettyCashFund?: {
    _id: string;
    name: string;
  } | null;
  receiptRef?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const expensesApi = {
  getAll: (params?: {
    type?: string;
    startDate?: string;
    endDate?: string;
    expenseAccountId?: string;
    paymentMethod?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; total: number; pages: number; data: Expense[] }>(`/expenses${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: Expense }>(`/expenses/${id}`),
  create: (data: {
    type: Expense['type'];
    description?: string;
    amount: number;
    expenseDate?: string;
    paymentMethod?: Expense['paymentMethod'];
    paid?: boolean;
    isRecurring?: boolean;
    recurringFrequency?: Expense['recurringFrequency'];
    notes?: string;
  }) => request<{ success: boolean; data: Expense }>('/expenses', { method: 'POST', body: data }),
  update: (id: string, data: Partial<{
    type: Expense['type'];
    description: string;
    amount: number;
    expenseDate: string;
    status: Expense['status'];
    paymentMethod: Expense['paymentMethod'];
    paid: boolean;
    paidDate: string;
    notes: string;
  }>) => request<{ success: boolean; data: Expense }>(`/expenses/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/expenses/${id}`, { method: 'DELETE' }),
  reverse: (id: string, reason?: string) => 
    request<{ success: boolean; message: string; data: Expense; reversalJournalEntry?: any }>(`/expenses/${id}/reverse`, { 
      method: 'POST', 
      body: { reason } 
    }),
  getSummary: (params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: {
      salariesWages: number;
      rent: number;
      utilities: number;
      transportDelivery: number;
      marketingAdvertising: number;
      otherExpenses: number;
      interestIncome: number;
      otherIncome: number;
      totalOperating: number;
      totalOtherIncome: number;
    } }>(`/expenses/summary${query ? `?${query}` : ''}`);
  },
  bulkCreate: (expenses: Array<{
    type: Expense['type'];
    description?: string;
    amount: number;
    expenseDate?: string;
    paymentMethod?: Expense['paymentMethod'];
    notes?: string;
  }>) => request<{ success: boolean; count: number; data: Expense[] }>('/expenses/bulk', { method: 'POST', body: { expenses } }),
};

// Notifications API
export interface Notification {
  _id: string;
  company: string;
  user: string;
  type: 'low_stock' | 'invoice' | 'payment' | 'reorder' | 'expiry' | 'system' | 'alert';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  isRead: boolean;
  readAt: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export const notificationsApi = {
  // Get all notifications
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<NotificationResponse>(`/notifications${query ? `?${query}` : ''}`);
  },
  
  // Get unread count
  getUnreadCount: () => request<{ success: boolean; count: number }>('/notifications/unread-count'),
  
  // Mark single notification as read
  markAsRead: (id: string) => request<{ success: boolean; data: Notification }>(`/notifications/${id}/read`, { method: 'PUT' }),
  
  // Mark all as read
  markAllAsRead: () => request<{ success: boolean; message: string }>('/notifications/read-all', { method: 'PUT' }),
  
  // Delete notification
  delete: (id: string) => request<{ success: boolean; message: string }>(`/notifications/${id}`, { method: 'DELETE' }),
  
  // Settings
  getSettings: () => request<{ success: boolean; data: unknown }>('/notifications/settings'),
  updateSettings: (settings: {
    emailNotifications?: {
      enabled?: boolean;
      invoiceDelivery?: boolean;
      paymentReminders?: boolean;
      lowStockAlerts?: boolean;
      dailySummary?: boolean;
      weeklySummary?: boolean;
    };
    smsNotifications?: {
      enabled?: boolean;
      criticalOnly?: boolean;
      adminPhones?: string[];
    };
    preferences?: {
      lowStockThreshold?: number;
      paymentReminderDays?: number;
      summarySendTime?: string;
      largeOrderThreshold?: number;
    };
    criticalAlertPhones?: string[];
  }) => request<{ success: boolean; data: unknown }>('/notifications/settings', { method: 'PUT', body: settings }),
  testEmail: (email: string) => request<{ success: boolean; message: string }>('/notifications/test-email', { method: 'POST', body: { email } }),
  testSMS: (phone: string) => request<{ success: boolean; message: string; messageId?: string }>('/notifications/test-sms', { method: 'POST', body: { phone } }),
  sendManualSummary: (type: 'daily' | 'weekly') => request<{ success: boolean; message: string }>('/notifications/send-summary', { method: 'POST', body: { type } }),
};

// Backup & Restore API
// Backup & Restore API
export interface Backup {
  _id: string;
  company: string;
  name: string;
  type: 'manual' | 'automated' | 'scheduled';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'verified' | 'restoring';
  storageLocation: 'local' | 'cloud' | 's3' | 'google-drive' | 'dropbox';
  cloudUrl?: string;
  filePath?: string;
  fileSize: number;
  compressionFormat: 'none' | 'gzip' | 'zip';
  mongoVersion?: string;
  pointInTime?: string;
  collections: { name: string; documentCount: number }[];
  verification: {
    verified: boolean;
    verifiedAt?: string;
    verifiedBy?: { _id: string; name: string; email: string };
    checksum?: string;
    integrityStatus: 'not_verified' | 'valid' | 'corrupted' | 'missing';
    errorMessage?: string;
  };
  errorMessage?: string;
  restore?: {
    restoredAt?: string;
    restoredBy?: { _id: string; name: string; email: string };
    originalBackupId?: string;
  };
  schedule?: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
    cronExpression?: string;
    lastRun?: string;
    nextRun?: string;
  };
  retention: {
    keepForDays: number;
    autoDelete: boolean;
  };
  createdBy?: { _id: string; name: string; email: string };
  cloudConfig?: {
    provider: 'aws' | 'gcp' | 'azure' | 'local';
    bucket?: string;
    region?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BackupSettings {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  retention: number;
  storageLocation: 'local' | 'cloud' | 's3' | 'google-drive' | 'dropbox';
  autoVerify: boolean;
  cloudConfig?: {
    provider: 'aws' | 'gcp' | 'azure' | 'local';
    bucket?: string;
    region?: string;
  };
}

export interface BackupStats {
  totalBackups: number;
  completedBackups: number;
  verifiedBackups: number;
  failedBackups: number;
  totalSize: number;
  formattedTotalSize: string;
  lastBackup: string | null;
}

export interface PointInTime {
  id: string;
  name: string;
  timestamp: string;
  fileSize: number;
  totalDocuments: number;
}

export const backupApi = {
  // Get all backups
  getAll: () => request<{ success: boolean; count: number; data: Backup[] }>('/backups'),
  
  // Get single backup
  getById: (id: string) => request<{ success: boolean; data: Backup }>(`/backups/${id}`),
  
  // Create new backup
  create: (data: { name?: string; type?: 'manual' | 'automated' | 'scheduled'; storageLocation?: 'local' | 'cloud' | 's3' | 'google-drive' | 'dropbox'; pointInTime?: string }) => 
    request<{ success: boolean; message: string; data: Backup }>('/backups', { method: 'POST', body: data }),
  
  // Restore from backup
  restore: (id: string) => request<{ success: boolean; message: string; data: Backup }>(`/backups/${id}/restore`, { method: 'POST' }),
  
  // Verify backup
  verify: (id: string) => request<{ success: boolean; message: string }>(`/backups/${id}/verify`, { method: 'POST' }),
  
  // Delete backup
  delete: (id: string) => request<{ success: boolean; message: string }>(`/backups/${id}`, { method: 'DELETE' }),
  
  // Get available point-in-time recovery points
  getPointsInTime: () => request<{ success: boolean; data: PointInTime[] }>('/backups/points-in-time'),
  
  // Get backup settings
  getSettings: () => request<{ success: boolean; data: BackupSettings }>('/backups/settings'),
  
  // Update backup settings
  updateSettings: (settings: BackupSettings) => request<{ success: boolean; message: string; data: Backup }>('/backups/settings', { method: 'PUT', body: settings }),
  
  // Download backup file
  download: (id: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/backups/${id}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to download backup');
      return res.blob();
    });
  },
  
  // Get backup statistics
  getStats: () => request<{ success: boolean; data: BackupStats }>('/backups/stats'),
};

// Departments API
export const departmentsApi = {
  getAll: (params?: { search?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; data: unknown[] }>(`/departments${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/departments/${id}`),
  create: (data: { name: string; description?: string }) =>
    request<{ success: boolean; data: unknown }>('/departments', { method: 'POST', body: data }),
  update: (id: string, data: { name?: string; description?: string }) =>
    request<{ success: boolean; data: unknown }>(`/departments/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/departments/${id}`, { method: 'DELETE' }),
  assignUsers: (id: string, userIds: string[]) =>
    request<{ success: boolean; message: string; data: unknown }>(`/departments/${id}/assign-users`, { method: 'PUT', body: { userIds } }),
  removeUser: (id: string, userId: string) =>
    request<{ success: boolean; message: string }>(`/departments/${id}/remove-user/${userId}`, { method: 'PUT' }),
};

// Audit Trail API
export const auditTrailApi = {
  getAll: (params?: Record<string, string>) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/audit-trail${query ? `?${query}` : ''}`);
  },
  getStats: (params?: Record<string, string>) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/audit-trail/stats${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/audit-trail/${id}`),
};

// Bulk Data Import/Export API
export const bulkDataApi = {
  exportProducts: () => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/bulk/export/products`, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to export products');
      return res.blob();
    });
  },
  exportClients: () => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/bulk/export/clients`, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to export clients');
      return res.blob();
    });
  },
  exportSuppliers: () => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/bulk/export/suppliers`, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to export suppliers');
      return res.blob();
    });
  },
  downloadTemplate: (type: 'products' | 'clients' | 'suppliers') => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/bulk/template/${type}`, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to download template');
      return res.blob();
    });
  },
  importProducts: (file: File) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE_URL}/bulk/import/products`, {
      method: 'POST',
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      body: formData,
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to import products');
      return data;
    });
  },
  importClients: (file: File) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE_URL}/bulk/import/clients`, {
      method: 'POST',
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      body: formData,
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to import clients');
      return data;
    });
  },
  importSuppliers: (file: File) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE_URL}/bulk/import/suppliers`, {
      method: 'POST',
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      body: formData,
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to import suppliers');
      return data;
    });
  },
};

// Testimonials API
export interface Testimonial {
  _id: string;
  name: string;
  role: string;
  company: string;
  avatar?: string;
  content: string;
  rating: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export const testimonialsApi = {
  getAll: () => request<{ success: boolean; count: number; data: Testimonial[] }>('/testimonials'),
  getById: (id: string) => request<{ success: boolean; data: Testimonial }>(`/testimonials/${id}`),
  create: (data: {
    name: string;
    role: string;
    company: string;
    avatar?: string;
    content: string;
    rating: number;
    isActive?: boolean;
    order?: number;
  }) => request<{ success: boolean; data: Testimonial }>('/testimonials', { method: 'POST', body: data }),
  update: (id: string, data: Partial<{
    name: string;
    role: string;
    company: string;
    avatar: string;
    content: string;
    rating: number;
    isActive: boolean;
    order: number;
  }>) => request<{ success: boolean; data: Testimonial }>(`/testimonials/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/testimonials/${id}`, { method: 'DELETE' }),
  toggle: (id: string) => request<{ success: boolean; data: Testimonial }>(`/testimonials/${id}/toggle`, { method: 'PATCH' }),
  reorder: (order: { id: string; order: number }[]) => request<{ success: boolean; data: Testimonial[] }>('/testimonials/reorder', { method: 'POST', body: { order } }),
};

// Petty Cash API
export interface PettyCashFloat {
  _id: string;
  company: string;
  name: string;
  openingBalance: number;
  currentBalance: number;
  minimumBalance: number;
  custodian: { _id: string; name: string; email: string };
  location?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PettyCashExpense {
  _id: string;
  company: string;
  float: { _id: string; name: string };
  description: string;
  amount: number;
  category: string;
  date: string;
  receiptNumber?: string;
  receiptImage?: { name: string; url: string };
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed';
  approvedBy?: { _id: string; name: string; email: string };
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PettyCashReplenishment {
  _id: string;
  company: string;
  float: { _id: string; name: string };
  amount: number;
  actualAmount?: number;
  reason?: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';
  requestedBy: { _id: string; name: string; email: string };
  approvedBy?: { _id: string; name: string; email: string };
  completedBy?: { _id: string; name: string; email: string };
  replenishmentNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PettyCashTransaction {
  _id: string;
  company: string;
  float: { _id: string; name: string };
  type: 'opening' | 'expense' | 'replenishment' | 'adjustment' | 'closing';
  amount: number;
  balanceAfter: number;
  description?: string;
  date: string;
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
}

export interface PettyCashSummary {
  floats: Array<{
    _id: string;
    name: string;
    openingBalance: number;
    currentBalance: number;
    minimumBalance: number;
    custodian: { _id: string; name: string; email: string };
    needsReplenishment: boolean;
    pendingExpenses: number;
    pendingReplenishments: number;
    todayTotal: number;
    totalExpenses: number;
    totalReplenishments: number;
  }>;
  totals: {
    totalOpeningBalance: number;
    totalCurrentBalance: number;
    totalTodayExpenses: number;
    totalPendingExpenses: number;
    totalPendingReplenishments: number;
  };
  floatCount: number;
  needsReplenishment: number;
}

export interface PettyCashReport {
  report: Array<{
    float: {
      _id: string;
      name: string;
      openingBalance: number;
      custodian: { _id: string; name: string; email: string };
      location?: string;
    };
    summary: {
      openingBalance: number;
      totalExpenses: number;
      totalReplenishments: number;
      currentBalance: number;
      expenseCount: number;
      replenishmentCount: number;
    };
    expensesByCategory: Array<{
      category: string;
      total: number;
      count: number;
    }>;
    transactions: PettyCashTransaction[];
    expenses: PettyCashExpense[];
  }>;
  grandTotal: {
    openingBalance: number;
    totalExpenses: number;
    totalReplenishments: number;
    currentBalance: number;
    expenseCount: number;
    replenishmentCount: number;
  };
  dateRange: {
    startDate?: string;
    endDate?: string;
  };
}

export const pettyCashApi = {
  // New Fund endpoints per Module 4 spec
  getFunds: (params?: { isActive?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; data: PettyCashFloat[] }>(`/petty-cash/funds${query ? `?${query}` : ''}`);
  },
  createFund: (data: {
    name: string;
    ledgerAccountId?: string;
    custodianId?: string;
    floatAmount: number;
    openingBalance?: number;
    notes?: string;
  }) => request<{ success: boolean; data: PettyCashFloat }>('/petty-cash/funds', { method: 'POST', body: data }),
  topUp: (id: string, data: {
    amount: number;
    bank_account_id: string;
    description?: string;
    transactionDate?: string;
  }) => request<{ success: boolean; data: PettyCashTransaction }>(`/petty-cash/funds/${id}/top-up`, { method: 'POST', body: data }),
  recordExpense: (id: string, data: {
    amount: number;
    expenseAccountId: string;
    description?: string;
    receiptRef?: string;
    transactionDate?: string;
  }) => request<{ success: boolean; data: PettyCashTransaction }>(`/petty-cash/funds/${id}/expense`, { method: 'POST', body: data }),
  getFundTransactions: (id: string, params?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; total: number; pages: number; data: { fund: PettyCashFloat; transactions: PettyCashTransaction[] } }>(`/petty-cash/funds/${id}/transactions${query ? `?${query}` : ''}`);
  },

  // Float management (legacy)
  getFloats: (params?: { isActive?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; data: PettyCashFloat[] }>(`/petty-cash/floats${query ? `?${query}` : ''}`);
  },
  getFloat: (id: string) => request<{ success: boolean; data: PettyCashFloat }>(`/petty-cash/floats/${id}`),
  createFloat: (data: {
    name: string;
    openingBalance: number;
    minimumBalance?: number;
    custodian?: string;
    location?: string;
    notes?: string;
    sourceType?: 'bank' | 'cash';
    bankAccountId?: string;
  }) => request<{ success: boolean; data: PettyCashFloat }>('/petty-cash/floats', { method: 'POST', body: data }),
  updateFloat: (id: string, data: Partial<{
    name: string;
    openingBalance: number;
    minimumBalance: number;
    custodian: string;
    location: string;
    notes: string;
  }>) => request<{ success: boolean; data: PettyCashFloat }>(`/petty-cash/floats/${id}`, { method: 'PUT', body: data }),
  deleteFloat: (id: string) => request<{ success: boolean; message: string }>(`/petty-cash/floats/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: (params?: {
    floatId?: string;
    status?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; total: number; pages: number; data: PettyCashExpense[] }>(`/petty-cash/expenses${query ? `?${query}` : ''}`);
  },
  getExpense: (id: string) => request<{ success: boolean; data: PettyCashExpense }>(`/petty-cash/expenses/${id}`),
  createExpense: (data: {
    float: string;
    description: string;
    amount: number;
    category?: string;
    date?: string;
    receiptNumber?: string;
    notes?: string;
  }) => request<{ success: boolean; data: PettyCashExpense }>('/petty-cash/expenses', { method: 'POST', body: data }),
  updateExpense: (id: string, data: Partial<{
    description: string;
    amount: number;
    category: string;
    date: string;
    receiptNumber: string;
    notes: string;
  }>) => request<{ success: boolean; data: PettyCashExpense }>(`/petty-cash/expenses/${id}`, { method: 'PUT', body: data }),
  approveExpense: (id: string, data: { status: 'approved' | 'rejected'; notes?: string }) =>
    request<{ success: boolean; data: PettyCashExpense }>(`/petty-cash/expenses/${id}/approve`, { method: 'PUT', body: data }),
  deleteExpense: (id: string) => request<{ success: boolean; message: string }>(`/petty-cash/expenses/${id}`, { method: 'DELETE' }),

  // Replenishments
  getReplenishments: (params?: {
    floatId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; total: number; pages: number; data: PettyCashReplenishment[] }>(`/petty-cash/replenishments${query ? `?${query}` : ''}`);
  },
  createReplenishment: (data: {
    float: string;
    amount: number;
    reason?: string;
  }) => request<{ success: boolean; data: PettyCashReplenishment }>('/petty-cash/replenishments', { method: 'POST', body: data }),
  approveReplenishment: (id: string, data?: { notes?: string }) =>
    request<{ success: boolean; data: PettyCashReplenishment }>(`/petty-cash/replenishments/${id}/approve`, { method: 'PUT', body: data }),
  completeReplenishment: (id: string, data: { actualAmount?: number; notes?: string; sourceType?: 'bank' | 'cash'; bankAccountId?: string }) =>
    request<{ success: boolean; data: PettyCashReplenishment }>(`/petty-cash/replenishments/${id}/complete`, { method: 'PUT', body: data }),
  rejectReplenishment: (id: string, data: { reason?: string }) =>
    request<{ success: boolean; data: PettyCashReplenishment }>(`/petty-cash/replenishments/${id}/reject`, { method: 'PUT', body: data }),

  // Reports & Summary
  getSummary: () => request<{ success: boolean; data: PettyCashSummary }>('/petty-cash/summary'),
  getReport: (params?: { floatId?: string; startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: PettyCashReport }>(`/petty-cash/report${query ? `?${query}` : ''}`);
  },
  getTransactions: (params?: {
    floatId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; total: number; pages: number; data: PettyCashTransaction[] }>(`/petty-cash/transactions${query ? `?${query}` : ''}`);
  },
};

// Accounts Payable API
export const payablesApi = {
  // Payment Schedules
  getPaymentSchedules: (params?: {
    supplierId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; data: unknown[] }>(`/payables/schedules${query ? `?${query}` : ''}`);
  },
  getPaymentSchedule: (id: string) => request<{ success: boolean; data: unknown }>(`/payables/schedules/${id}`),
  createPaymentSchedule: (data: {
    purchase: string;
    supplier: string;
    installments: Array<{ date: string; notes?: string }>;
    earlyPaymentDiscount?: { discountPercent: number };
  }) => request<{ success: boolean; count: number; data: unknown }>('/payables/schedules', { method: 'POST', body: data }),
  updatePaymentSchedule: (id: string, data: {
    scheduledAmount?: number;
    scheduledDate?: string;
    notes?: string;
    earlyPaymentDiscount?: { discountPercent: number };
  }) => request<{ success: boolean; data: unknown }>(`/payables/schedules/${id}`, { method: 'PUT', body: data }),
  deletePaymentSchedule: (id: string) => request<{ success: boolean; message: string }>(`/payables/schedules/${id}`, { method: 'DELETE' }),
  recordSchedulePayment: (id: string, data: {
    amount: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'credit';
    reference?: string;
    notes?: string;
    applyEarlyPaymentDiscount?: boolean;
  }) => request<{ success: boolean; data: unknown }>(`/payables/schedules/${id}/pay`, { method: 'POST', body: data }),

  // Supplier Statement
  getSupplierStatement: (supplierId: string, params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/payables/supplier/${supplierId}/statement${query ? `?${query}` : ''}`);
  },
  reconcileSupplierStatement: (supplierId: string, data: { notes?: string; adjustments?: Array<{ type: string; amount: number; description: string }> }) =>
    request<{ success: boolean; message: string; data: unknown }>(`/payables/supplier/${supplierId}/reconcile`, { method: 'POST', body: data }),

  // Aging Report
  getPayableAgingReport: (params?: { supplierId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/payables/aging${query ? `?${query}` : ''}`);
  },

  // Dashboard Summary
  getPayablesSummary: () => request<{ success: boolean; data: {
    totalPayables: number;
    totalPayablesCount: number;
    overduePayables: number;
    overduePayablesCount: number;
    upcomingPayments: number;
    upcomingPaymentsCount: number;
    topSuppliers: Array<{ supplierName: string; supplierCode: string; totalBalance: number; purchaseCount: number }>;
  } }>('/payables/summary'),

  // Auto-generate schedules
  generateSchedulesFromPurchases: (data: { purchaseIds?: string[]; installmentCount?: number; startDate?: string }) =>
    request<{ success: boolean; count: number; message: string; data: unknown }>('/payables/generate-schedules', { method: 'POST', body: data }),
};

// Accounts Receivable API
export const receivablesApi = {
  // Dashboard Summary
  getReceivablesSummary: () =>
    request<{ success: boolean; data: {
      totalReceivables: number;
      totalReceivablesCount: number;
      overdueReceivables: number;
      overdueReceivablesCount: number;
      badDebt: number;
      badDebtCount: number;
      topClients: Array<{
        clientName: string;
        clientCode: string;
        totalBalance: number;
        invoiceCount: number;
      }>;
    } }>('/receivables/summary'),

  // Aging Report
  getReceivableAgingReport: (params?: { clientId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: {
      asOfDate: string;
      summary: {
        current: number;
        '1-30': number;
        '31-60': number;
        '61-90': number;
        '90+': number;
        total: number;
      };
      byClient: Array<{
        client: { _id: string; name: string; code: string };
        totalBalance: number;
        current: number;
        '1-30': number;
        '31-60': number;
        '61-90': number;
        '90+': number;
        invoiceCount: number;
      }>;
    } }>(`/receivables/aging${query ? `?${query}` : ''}`);
  },

  // Client Statement
  getClientStatement: (clientId: string, params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: {
      client: { _id: string; name: string; code: string; contact: string };
      period: { startDate: string | null; endDate: string | null };
      summary: {
        totalInvoices: number;
        totalPaid: number;
        totalBalance: number;
        invoiceCount: number;
      };
      aging: {
        current: number;
        '1-30': number;
        '31-60': number;
        '61-90': number;
        '90+': number;
      };
      invoices: Array<{
        _id: string;
        invoiceNumber: string;
        invoiceDate: string;
        dueDate: string;
        status: string;
        total: number;
        paid: number;
        balance: number;
      }>;
      payments: Array<{
        date: string;
        type: string;
        reference: string;
        amount: number;
        invoiceNumber: string;
      }>;
    } }>(`/receivables/client/${clientId}/statement${query ? `?${query}` : ''}`);
  },

  // Bad Debts
  getBadDebts: () =>
    request<{ success: boolean; data: {
      invoices: unknown[];
      totalBadDebt: number;
      count: number;
    } }>('/receivables/bad-debts'),

  // Write off bad debt
  writeOffBadDebt: (clientId: string, data: { invoiceIds?: string[]; reason?: string; notes?: string }) =>
    request<{ success: boolean; message: string; data: {
      invoiceCount: number;
      totalBadDebt: number;
      writtenOffDate: string;
      reason: string;
    } }>(`/receivables/client/${clientId}/bad-debt`, { method: 'POST', body: data }),

  // Reverse bad debt
  reverseBadDebt: (invoiceId: string, data: { reason?: string }) =>
    request<{ success: boolean; message: string; data: {
      invoice: unknown;
      restoredBalance: number;
    } }>(`/receivables/invoice/${invoiceId}/reverse-bad-debt`, { method: 'POST', body: data }),
};

// Payroll API
export interface PayrollRecord {
  _id: string;
  company: string;
  employee: {
    employeeId: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string;
    nationalId?: string;
    bankName?: string;
    bankAccount?: string;
    employmentType: 'full-time' | 'part-time' | 'contract' | 'intern';
    startDate?: string;
    isActive: boolean;
  };
  salary: {
    basicSalary: number;
    transportAllowance: number;
    housingAllowance: number;
    otherAllowances: number;
    grossSalary: number;
  };
  deductions: {
    paye: number;
    rssbEmployee: number;
    healthInsurance: number;
    otherDeductions: number;
    loanDeductions: number;
    totalDeductions: number;
  };
  netPay: number;
  contributions: {
    rssbEmployer: number;
    maternity: number;
  };
  period: {
    month: number;
    year: number;
    monthName: string;
  };
  payment: {
    status: 'pending' | 'processed' | 'paid' | 'cancelled';
    paymentDate?: string;
    paymentMethod?: string;
    reference?: string;
  };
  payslipGenerated: boolean;
  notes?: string;
  createdBy: { _id: string; name: string; email: string };
  approvedBy?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export const payrollApi = {
  getAll: (params?: { month?: number; year?: number; status?: string; search?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; data: PayrollRecord[]; summary: {
      totalGrossSalary: number;
      totalNetPay: number;
      totalPAYE: number;
      totalRSSB: number;
      employeeCount: number;
    } }>(`/payroll${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: PayrollRecord }>(`/payroll/${id}`),
  create: (data: {
    employee: {
      employeeId: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      department?: string;
      position?: string;
      nationalId?: string;
      bankName?: string;
      bankAccount?: string;
    };
    salary: {
      basicSalary: number;
      transportAllowance?: number;
      housingAllowance?: number;
      otherAllowances?: number;
    };
    period: { month: number; year: number };
    notes?: string;
  }) => request<{ success: boolean; data: PayrollRecord }>('/payroll', { method: 'POST', body: data }),
  update: (id: string, data: Partial<{
    employee: Record<string, any>;
    salary: Record<string, any>;
    period: { month: number; year: number };
    notes: string;
  }>) => request<{ success: boolean; data: PayrollRecord }>(`/payroll/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/payroll/${id}`, { method: 'DELETE' }),
  calculate: (data: {
    salary: {
      basicSalary: number;
      transportAllowance?: number;
      housingAllowance?: number;
      otherAllowances?: number;
    };
  }) => request<{ success: boolean; data: {
    grossSalary: number;
    deductions: { paye: number; rssbEmployee: number; totalDeductions: number };
    contributions: { rssbEmployer: number; maternity: number };
    netPay: number;
    taxBrackets: Array<{ range: string; rate: string; tax: number }>;
  } }>('/payroll/calculate', { method: 'POST', body: data }),
  processPayment: (id: string, data: { paymentMethod?: string; reference?: string }) =>
    request<{ success: boolean; data: PayrollRecord; message: string }>(`/payroll/${id}/pay`, { method: 'POST', body: data }),
  // Pay PAYE tax to RRA (creates journal entry: DR PAYE Payable, CR Cash at Bank)
  payPAYE: (data: { amount: number; paymentMethod: string; reference?: string; notes?: string }) =>
    request<{ success: boolean; message: string; data: { journalEntryId: string; entryNumber: string } }>('/payroll/pay-paye', { method: 'POST', body: data }),
  // Pay RSSB to RSSB (creates journal entry: DR RSSB Payable, CR Cash at Bank)
  payRSSB: (data: { amount: number; paymentMethod: string; reference?: string; notes?: string }) =>
    request<{ success: boolean; message: string; data: { journalEntryId: string; entryNumber: string } }>('/payroll/pay-rssb', { method: 'POST', body: data }),
  getSummary: (params?: { year?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: {
      monthlyData: Array<{
        month: number;
        year: number;
        monthName: string;
        grossSalary: number;
        netPay: number;
        paye: number;
        rssb: number;
        employerContrib: number;
        employeeCount: number;
      }>;
      totals: {
        totalGrossSalary: number;
        totalNetPay: number;
        totalPAYE: number;
        totalRSSB: number;
        totalEmployerContrib: number;
      };
      currentMonth: {
        grossSalary: number;
        netPay: number;
        employeeCount: number;
      };
    } }>(`/payroll/summary${query ? `?${query}` : ''}`);
  },
  bulkCreate: (data: {
    employees: Array<{
      employee: Record<string, any>;
      salary: Record<string, any>;
    }>;
    period: { month: number; year: number };
    notes?: string;
  }) => request<{ success: boolean; count: number; data: PayrollRecord[] }>('/payroll/bulk', { method: 'POST', body: data }),
};

// Tax Management API
export interface TaxPayment {
  _id: string;
  amount: number;
  paymentDate: string;
  reference?: string;
  period?: { month: number; year: number };
  method: 'bank_transfer' | 'cash' | 'cheque' | 'mobile_money' | 'other';
  notes?: string;
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
}

export interface TaxFiling {
  _id: string;
  filingDate: string;
  filingPeriod: { month: number; year: number };
  taxType: 'vat' | 'corporate_income' | 'paye' | 'withholding' | 'trading_license';
  amountDeclared: number;
  amountPaid?: number;
  status: 'filed' | 'paid' | 'overdue' | 'pending';
  dueDate: string;
  filingReference?: string;
  rraConfirmation?: string;
  notes?: string;
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
}

export interface TaxCalendarEntry {
  _id: string;
  title: string;
  taxType: 'vat' | 'corporate_income' | 'paye' | 'withholding' | 'trading_license';
  dueDate: string;
  period?: { month: number; year: number };
  description?: string;
  isRecurring: boolean;
  recurrencePattern: 'monthly' | 'quarterly' | 'annually';
  status: 'upcoming' | 'due_soon' | 'overdue' | 'filed' | 'paid';
}

export interface TaxRecord {
  _id: string;
  company: string;
  taxType: 'vat' | 'corporate_income' | 'paye' | 'withholding' | 'trading_license';
  vatRate: number;
  vatOutput: number;
  vatInput: number;
  vatNet: number;
  corporateIncomeRate: number;
  taxableIncome: number;
  taxOwed: number;
  payeCollected: number;
  payePaid: number;
  withholdingCollected: number;
  withholdingPaid: number;
  tradingLicenseFee: number;
  tradingLicenseYear?: number;
  tradingLicenseStatus: 'active' | 'expired' | 'pending' | 'not_applicable';
  payments: TaxPayment[];
  filings: TaxFiling[];
  calendar: TaxCalendarEntry[];
  status: 'active' | 'inactive' | 'pending';
  notes?: string;
  createdBy: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export const taxApi = {
  getAll: (params?: { taxType?: string; year?: number; status?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: TaxRecord[]; count: number }>(`/taxes${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: TaxRecord }>(`/taxes/${id}`),
  getSummary: (params?: { year?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: {
      vat: { output: number; input: number; net: number; isPayable: boolean; refund: number };
      paye: { collected: number; owed: number };
      corporateIncome: { rate: number; status: string };
      tradingLicense: { status: string; fee: number };
      upcomingDeadlines: TaxCalendarEntry[];
      overdue: TaxCalendarEntry[];
      totals: { vat: number; paye: number; total: number };
    } }>(`/taxes/summary${query ? `?${query}` : ''}`);
  },
  create: (data: {
    taxType: 'vat' | 'corporate_income' | 'paye' | 'withholding' | 'trading_license';
    vatRate?: number;
    corporateIncomeRate?: number;
    tradingLicenseFee?: number;
    notes?: string;
  }) => request<{ success: boolean; data: TaxRecord }>('/taxes', { method: 'POST', body: data }),
  update: (id: string, data: Partial<TaxRecord>) =>
    request<{ success: boolean; data: TaxRecord }>(`/taxes/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/taxes/${id}`, { method: 'DELETE' }),
  addPayment: (id: string, data: {
    amount: number;
    paymentDate: string;
    reference?: string;
    period?: { month: number; year: number };
    method?: string;
    notes?: string;
  }) => request<{ success: boolean; data: TaxRecord }>(`/taxes/${id}/payments`, { method: 'POST', body: data }),
  addFiling: (id: string, data: {
    filingDate: string;
    filingPeriod: { month: number; year: number };
    amountDeclared: number;
    amountPaid?: number;
    status?: string;
    filingReference?: string;
    notes?: string;
  }) => request<{ success: boolean; data: TaxRecord }>(`/taxes/${id}/filings`, { method: 'POST', body: data }),
  getCalendar: (params?: { year?: number; month?: number; status?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: TaxCalendarEntry[] }>(`/taxes/calendar${query ? `?${query}` : ''}`);
  },
  addCalendarEntry: (id: string, data: {
    title: string;
    dueDate: string;
    period?: { month: number; year: number };
    description?: string;
  }) => request<{ success: boolean; data: TaxRecord }>(`/taxes/${id}/calendar`, { method: 'POST', body: data }),
  prepareVATReturn: (params: { month: number; year: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: {
      period: { month: number; year: number };
      vatOutput: number;
      vatInput: number;
      netVAT: number;
      isPayable: boolean;
      refund: number;
      dueDate: string;
      filingStatus: string;
      filingReference?: string;
    } }>(`/taxes/vat-return${query ? `?${query}` : ''}`);
  },
  getFilingHistory: (params?: { taxType?: string; year?: number }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: TaxFiling[] }>(`/taxes/filing-history${query ? `?${query}` : ''}`);
  },
  generateCalendar: (year: number) => request<{ success: boolean; data: TaxCalendarEntry[]; message: string }>('/taxes/generate-calendar', { method: 'POST', body: { year } }),
}

// Bank Accounts API
export const bankAccountsApi = {
  getAll: (params?: { accountType?: string; isActive?: boolean }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: BankAccount[]; totals: CashPosition }>(`/bank-accounts${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: BankAccount }>(`/bank-accounts/${id}`),
  create: (data: Partial<BankAccount>) => request<{ success: boolean; data: BankAccount }>('/bank-accounts', { method: 'POST', body: data }),
  update: (id: string, data: Partial<BankAccount>) => request<{ success: boolean; data: BankAccount }>(`/bank-accounts/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean }>(`/bank-accounts/${id}`, { method: 'DELETE' }),
  getTransactions: (id: string, params?: { startDate?: string; endDate?: string; type?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: BankTransaction[] }>(`/bank-accounts/${id}/transactions${query ? `?${query}` : ''}`);
  },
  addTransaction: (id: string, data: Partial<BankTransaction>) => request<{ success: boolean; data: BankTransaction }>(`/bank-accounts/${id}/transactions`, { method: 'POST', body: data }),
  transfer: (data: { fromAccount: string; toAccount: string; amount: number; description?: string; referenceNumber?: string }) => request<{ success: boolean }>('/bank-accounts/transfer', { method: 'POST', body: data }),
  reconcile: (id: string, data: { statementBalance: number; statementDate?: string; notes?: string }) => request<{ success: boolean }>(`/bank-accounts/${id}/reconcile`, { method: 'POST', body: data }),
  importCSV: (id: string, data: { transactions: any[]; autoMatch?: boolean }) => request<{ success: boolean; data: { imported: number } }>(`/bank-accounts/${id}/import-csv`, { method: 'POST', body: data }),
  getReconciliationReport: (id: string, params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: any }>(`/bank-accounts/${id}/reconciliation-report${query ? `?${query}` : ''}`);
  },
};

// Fixed Assets API
export interface FixedAsset {
  _id: string;
  referenceNo: string;
  name: string;
  description?: string;
  categoryId?: string;
  assetAccountCode: string;
  assetAccountId?: { _id: string; code: string; name: string };
  accumDepreciationAccountCode: string;
  accumDepreciationAccountId?: { _id: string; code: string; name: string };
  depreciationExpenseAccountCode: string;
  depreciationExpenseAccountId?: { _id: string; code: string; name: string };
  purchaseDate: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  usefulLifeYears?: number;
  depreciationMethod: 'straight_line' | 'declining_balance';
  decliningRate?: number;
  status: 'active' | 'fully_depreciated' | 'disposed';
  accumulatedDepreciation: number;
  netBookValue: number;
  supplierId?: string;
  disposalDate?: string;
  disposalProceeds?: number;
  lastDepreciationDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AssetCategory {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  defaultAssetAccountCode?: string;
  defaultAccumDepreciationAccountCode?: string;
  defaultDepreciationExpenseAccountCode?: string;
  defaultUsefulLifeMonths?: number;
  defaultDepreciationMethod?: string;
  isActive?: boolean;
  // Additional fields
  depreciationMethod?: string;
  usefulLifeMonths?: number;
  assetAccountCode?: string;
  accumDepreciationAccountCode?: string;
  depreciationExpenseAccountCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DepreciationScheduleItem {
  period: number;
  date: string;
  label: string;
  openingNBV: number;
  depreciation: number;
  closingNBV: number;
}

export interface DepreciationEntry {
  _id: string;
  periodDate: string;
  depreciationAmount: number;
  accumulatedBefore: number;
  accumulatedAfter: number;
  netBookValueAfter: number;
  journalEntryId?: string;
  createdAt: string;
}

// Journal Entries & Accounting API
export interface JournalEntryLine {
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  _id: string;
  company: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  referenceType?: string;
  referenceId?: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: 'draft' | 'posted' | 'voided';
  createdBy: { _id: string; name: string; email: string };
  approvedBy?: { _id: string; name: string; email: string };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChartOfAccounts {
  _id?: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category: string;
  subCategory?: string;
  isActive: boolean;
  isDefault?: boolean;
  parentCode?: string;
}

export interface GeneralLedgerEntry {
  date: string;
  entryNumber: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
}

// Backend returns different field names - use any for flexibility
export interface GeneralLedgerResponse {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  entries: GeneralLedgerEntry[];
}

export interface GeneralLedgerResponseLegacy {
  code: string;
  name: string;
  type: string;
  normalBalance?: string;
  openingBalance: number;
  closingBalance: number;
  transactions: GeneralLedgerEntry[];
}

export interface TrialBalanceEntry {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
}

// Chart of Accounts API - for fetching accounts to map to products
export interface ChartAccount {
  _id?: string;
  code: string;
  accountCode?: string;
  name: string;
  accountName?: string;
  type: string;
  accountType?: string;
  subtype?: string;
  isActive?: boolean;
}

export const accountsApi = {
  getAll: (params?: { type?: string; subtype?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: ChartAccount[] }>(`/journal-entries/accounts${query ? `?${query}` : ''}`);
  },
};

export const journalEntriesApi = {
  // Journal Entries
  getAll: (params?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; total: number; pages: number; data: JournalEntry[] }>(`/journal-entries${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: JournalEntry }>(`/journal-entries/${id}`),
  create: (data: {
    date: string;
    description: string;
    reference?: string;
    lines: Array<{
      accountCode: string;
      description?: string;
      debit: number;
      credit: number;
    }>;
    notes?: string;
  }) => request<{ success: boolean; data: JournalEntry }>('/journal-entries', { method: 'POST', body: data }),
  update: (id: string, data: Partial<{
    date: string;
    description: string;
    reference: string;
    lines: Array<{
      accountCode: string;
      description?: string;
      debit: number;
      credit: number;
    }>;
    notes: string;
  }>) => request<{ success: boolean; data: JournalEntry }>(`/journal-entries/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/journal-entries/${id}`, { method: 'DELETE' }),
  deletePermanent: (id: string) => request<{ success: boolean; message: string }>(`/journal-entries/${id}/permanent`, { method: 'DELETE' }),
  post: (id: string) => request<{ success: boolean; data: JournalEntry }>(`/journal-entries/${id}/post`, { method: 'PUT' }),
  void: (id: string, reason?: string) => request<{ success: boolean; message: string }>(`/journal-entries/${id}/void`, { method: 'PUT', body: { reason } }),

  // Chart of Accounts
  getAccounts: (params?: { type?: string; subtype?: string; includeInactive?: boolean | string }) => 
    request<{ success: boolean; data: ChartOfAccounts[] }>('/journal-entries/accounts', { params }),
  createAccount: (data: {
    code: string;
    name: string;
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
    category: string;
    subCategory?: string;
    parentCode?: string;
  }) => request<{ success: boolean; data: ChartOfAccounts }>('/journal-entries/accounts', { method: 'POST', body: data }),
  updateAccount: (id: string, data: Partial<{
    name: string;
    category: string;
    subCategory: string;
    isActive: boolean;
  }>) => request<{ success: boolean; data: ChartOfAccounts }>(`/journal-entries/accounts/${id}`, { method: 'PUT', body: data }),

  // Reports
  getTrialBalance: (params?: { asOfDate?: string; startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: TrialBalanceEntry[]; totals: { totalDebit: number; totalCredit: number; totalBalance: number }; byType: Record<string, any>; period: { start: string; end: string } }>(`/journal-entries/trial-balance${query ? `?${query}` : ''}`);
  },
  getGeneralLedger: (params?: {
    accountCode?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: {
      accountCode: string;
      accountName: string;
      accountType: string;
      openingBalance: number;
      closingBalance: number;
      totalDebits: number;
      totalCredits: number;
      entries: GeneralLedgerEntry[];
    }[] }>(`/journal-entries/general-ledger${query ? `?${query}` : ''}`);
  },
  // Run Depreciation
  runDepreciation: (period?: string) => 
    request<{ success: boolean; message: string; data: {
      totalAssets: number;
      processed: number;
      skipped: number;
      errors: Array<{ assetCode: string; error: string }>;
      journalEntries: Array<{ assetCode: string; assetName: string; amount: number; entryNumber: string }>;
    } }>('/journal-entries/run-depreciation', { method: 'POST', body: { period } }),
};

// ============================================================
// BANK HUB API - Centralized Transaction Management
// ============================================================

// Transaction types for inflows (money coming in)
export type BankHubInflowType = 
  | 'sale_payment'           // Payment received from sales/invoices
  | 'invoice_payment'         // Customer invoice payment
  | 'credit_note_refund'     // Refund from credit note
  | 'loan_received'          // Loan amount received
  | 'capital_injection'      // Owner capital introduced
  | 'interest_income'        // Interest earned
  | 'other_income'           // Miscellaneous income
  | 'tax_refund'             // Tax refund from government
  | 'client_advance'         // Advance payment from client
  | 'bank_transfer_in';      // Transfer from another bank account

// Transaction types for outflows (money going out)
export type BankHubOutflowType = 
  | 'purchase_payment'        // Payment to suppliers
  | 'expense_payment'         // Business expense
  | 'salary_payment'          // Employee salaries
  | 'tax_payment'            // Tax payments (VAT, PAYE, etc.)
  | 'loan_repayment'         // Loan repayment
  | 'petty_cash_funding'     // Funding petty cash float
  | 'bank_transfer_out'      // Transfer to another bank account
  | 'asset_purchase'         // Fixed asset acquisition
  | 'dividend_payment'       // Dividend distribution
  | 'other_expense';         // Miscellaneous expense

// All transaction types
export type BankHubTransactionType = BankHubInflowType | BankHubOutflowType;

// Payment methods
export type BankHubPaymentMethod = 
  | 'cash' 
  | 'bank_transfer' 
  | 'cheque' 
  | 'mobile_money' 
  | 'card' 
  | 'other';

// Transaction status
export type BankHubStatus = 'completed' | 'pending' | 'reversed' | 'failed';

// Bank Hub Transaction interface
export interface BankHubTransaction {
  _id: string;
  company: string;
  transactionNumber: string;
  type: BankHubTransactionType;
  flow: 'inflow' | 'outflow';
  amount: number;
  currency: string;
  exchangeRate?: number;
  amountInBaseCurrency?: number;
  
  // Account details
  bankAccount?: {
    _id: string;
    name: string;
    accountType: string;
  };
  bankAccountId?: string;
  
  // Reference to source document
  referenceType?: 'invoice' | 'purchase' | 'expense' | 'payroll' | 'petty_cash' | 'journal_entry' | 'loan' | 'tax' | 'manual';
  referenceId?: string;
  referenceNumber?: string;
  
  // Payment details
  paymentMethod: BankHubPaymentMethod;
  chequeNumber?: string;
  
  // Counterparty
  counterpartyType?: 'client' | 'supplier' | 'employee' | 'tax_authority' | 'bank' | 'other';
  counterpartyId?: string;
  counterpartyName?: string;
  
  // Description
  description: string;
  notes?: string;
  
  // Status
  status: BankHubStatus;
  
  // Related records
  journalEntryId?: string;
  journalEntryNumber?: string;
  
  // Metadata
  transactionDate: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Dashboard summary
export interface BankHubDashboardSummary {
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  closingBalance: number;
  openingBalance: number;
  byPaymentMethod: Record<BankHubPaymentMethod, number>;
  byType: Record<BankHubTransactionType, number>;
  recentTransactions: BankHubTransaction[];
  monthlyTrend: Array<{
    month: string;
    inflow: number;
    outflow: number;
  }>;
}

// Cash flow report
export interface BankHubCashFlowReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
    transactionCount: number;
  };
  byType: Array<{
    type: BankHubTransactionType;
    flow: 'inflow' | 'outflow';
    total: number;
    count: number;
  }>;
  byPaymentMethod: Array<{
    paymentMethod: BankHubPaymentMethod;
    total: number;
    count: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    inflow: number;
    outflow: number;
  }>;
}

// Bank Hub API
export const bankHubApi = {
  // Dashboard
  getDashboardSummary: (params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: BankHubDashboardSummary }>(`/bank-hub/dashboard${query ? `?${query}` : ''}`);
  },

  // Transactions
  getTransactions: (params?: {
    type?: BankHubTransactionType;
    flow?: 'inflow' | 'outflow';
    paymentMethod?: BankHubPaymentMethod;
    status?: BankHubStatus;
    startDate?: string;
    endDate?: string;
    bankAccountId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; total: number; pages: number; data: BankHubTransaction[] }>(`/bank-hub/transactions${query ? `?${query}` : ''}`);
  },

  getTransactionById: (id: string) => 
    request<{ success: boolean; data: BankHubTransaction }>(`/bank-hub/transactions/${id}`),

  createTransaction: (data: {
    type: BankHubTransactionType;
    amount: number;
    bankAccountId?: string;
    paymentMethod: BankHubPaymentMethod;
    referenceType?: BankHubTransaction['referenceType'];
    referenceId?: string;
    referenceNumber?: string;
    counterpartyType?: BankHubTransaction['counterpartyType'];
    counterpartyId?: string;
    counterpartyName?: string;
    description?: string;
    notes?: string;
    transactionDate?: string;
    chequeNumber?: string;
  }) => request<{ success: boolean; data: BankHubTransaction }>('/bank-hub/transactions', { method: 'POST', body: data }),

  // Reversal
  reverseTransaction: (id: string, data: { reason: string }) => 
    request<{ success: boolean; data: { reversedTransaction: BankHubTransaction; reversalTransaction: BankHubTransaction } }>(`/bank-hub/transactions/${id}/reverse`, { method: 'POST', body: data }),

  // Reports
  getCashFlowReport: (params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
    type?: BankHubTransactionType;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: BankHubCashFlowReport }>(`/bank-hub/reports/cash-flow${query ? `?${query}` : ''}`);
  },

  getTypeSummary: (params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: {
      inflows: Array<{ type: BankHubInflowType; total: number; count: number }>;
      outflows: Array<{ type: BankHubOutflowType; total: number; count: number }>;
    } }>(`/bank-hub/reports/type-summary${query ? `?${query}` : ''}`);
  },

  getBankAccountSummary: (params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: {
      accounts: Array<{
        bankAccount: { _id: string; name: string; accountType: string };
        openingBalance: number;
        closingBalance: number;
        totalInflow: number;
        totalOutflow: number;
        transactionCount: number;
      }>;
      totals: {
        totalOpeningBalance: number;
        totalClosingBalance: number;
        totalInflow: number;
        totalOutflow: number;
      };
    } }>(`/bank-hub/reports/bank-account-summary${query ? `?${query}` : ''}`);
  },

  // Export
  exportTransactions: (params?: {
    startDate?: string;
    endDate?: string;
    type?: BankHubTransactionType;
    format?: 'csv' | 'excel' | 'pdf';
  }) => {
    const token = localStorage.getItem('token');
    const query = buildQuery(params as Record<string, any>);
    return fetch(`${API_BASE_URL}/bank-hub/export${query ? `?${query}` : ''}`, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to export transactions');
      return res.blob();
    });
  },
};

// AR Receipts API - Step 57-59
interface ARReceiptData {
  _id: string;
  referenceNo: string;
  client: { _id: string; name: string; code: string };
  receiptDate: string;
  paymentMethod: string;
  bankAccount?: { _id: string; accountName: string; accountCode: string };
  amountReceived: string;
  currencyCode: string;
  exchangeRate: string;
  reference?: string;
  status: 'draft' | 'posted' | 'reversed';
  notes?: string;
  unallocatedAmount?: string;
  postedBy?: { name: string };
  createdBy?: { name: string };
  createdAt: string;
  updatedAt?: string;
}

interface ARReceiptAllocation {
  _id: string;
  receipt: string;
  invoice: { _id: string; invoiceNumber: string; referenceNo: string; balance: string };
  amountAllocated: string;
}

export const arReceiptsApi = {
  // List receipts with filters
  getAll: (params?: {
    client_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; data: ARReceiptData[] }>(`/ar/receipts${query ? `?${query}` : ''}`);
  },

  // Get single receipt with allocations
  getById: (id: string) =>
    request<{ success: boolean; data: ARReceiptData; allocations: ARReceiptAllocation[] }>(`/ar/receipts/${id}`),

  // Create receipt
  create: (data: {
    client: string;
    receiptDate?: string;
    paymentMethod: string;
    bankAccount?: string;
    amountReceived: number;
    currencyCode?: string;
    exchangeRate?: number;
    reference?: string;
    notes?: string;
  }) => request<{ success: boolean; data: ARReceiptData }>('/ar/receipts', { method: 'POST', body: data }),

  // Update receipt (draft only)
  update: (id: string, data: Partial<{
    receiptDate: string;
    paymentMethod: string;
    bankAccount: string;
    amountReceived: number;
    currencyCode: string;
    exchangeRate: number;
    reference: string;
    notes: string;
  }>) => request<{ success: boolean; data: ARReceiptData }>(`/ar/receipts/${id}`, { method: 'PUT', body: data }),

  // Post receipt (draft -> posted)
  post: (id: string) =>
    request<{ success: boolean; message: string; data: ARReceiptData }>(`/ar/receipts/${id}/post`, { method: 'POST' }),

  // Reverse posted receipt
  reverse: (id: string, reason: string) =>
    request<{ success: boolean; message: string; data: ARReceiptData }>(`/ar/receipts/${id}/reverse`, { method: 'POST', body: { reason } }),

  // Allocate receipt to invoice
  allocate: (id: string, data: { invoiceId: string; amount: number }) =>
    request<{ success: boolean; data: ARReceiptAllocation }>(`/ar/receipts/${id}/allocate`, { method: 'POST', body: data }),

  // Get aging report
  getAgingReport: (params?: { client_id?: string; as_of_date?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<any>(`/ar/aging${query ? `?${query}` : ''}`);
  },

  // Get client statement (drill down)
  getClientStatement: (clientId: string, params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<any>(`/ar/statement/${clientId}${query ? `?${query}` : ''}`);
  },
};

// AP Payment Types
export interface APPayment {
  _id: string;
  referenceNo: string;
  supplier: {
    _id: string;
    name: string;
    code?: string;
  };
  paymentDate: string;
  paymentMethod: string;
  amountPaid: string;
  currencyCode: string;
  status: 'draft' | 'posted' | 'reversed';
  bankAccount?: {
    _id: string;
    accountName: string;
    accountNumber: string;
  };
  reference?: string;
  notes?: string;
  createdAt: string;
}

export interface APPaymentAllocation {
  _id: string;
  payment: string;
  grn: { _id: string; referenceNo: string; totalAmount: string; balance: string };
  amountAllocated: string;
}

// AP Payments API
export const apPaymentsApi = {
  // List payments with filters
  getAll: (params?: {
    supplier_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; data: APPayment[] }>(`/ap/payments${query ? `?${query}` : ''}`);
  },

  // Get single payment with allocations
  getById: (id: string) =>
    request<{ success: boolean; data: APPayment; allocations: APPaymentAllocation[] }>(`/ap/payments/${id}`),

  // Create payment
  create: (data: {
    supplierId: string;
    paymentDate?: string;
    paymentMethod: string;
    bankAccountId: string;
    amountPaid: number;
    currencyCode?: string;
    exchangeRate?: number;
    reference?: string;
    notes?: string;
  }) => request<{ success: boolean; data: APPayment }>('/ap/payments', { method: 'POST', body: data }),

  // Update payment (draft only)
  update: (id: string, data: Partial<{
    paymentDate: string;
    paymentMethod: string;
    bankAccountId: string;
    amountPaid: number;
    currencyCode: string;
    exchangeRate: number;
    reference: string;
    notes: string;
  }>) => request<{ success: boolean; data: APPayment }>(`/ap/payments/${id}`, { method: 'PUT', body: data }),

  // Post payment (draft -> posted)
  post: (id: string) =>
    request<{ success: boolean; message: string; data: APPayment }>(`/ap/payments/${id}/post`, { method: 'POST' }),

  // Reverse posted payment
  reverse: (id: string, reason: string) =>
    request<{ success: boolean; message: string; data: APPayment }>(`/ap/payments/${id}/reverse`, { method: 'POST', body: { reason } }),

  // Allocate payment to GRN
  allocate: (paymentId: string, data: { grnId: string; amount: number }) =>
    request<{ success: boolean; data: APPaymentAllocation }>('/ap/allocations', { method: 'POST', body: { payment: paymentId, grn: data.grnId, amountAllocated: data.amount } }),

  // Get allocations for a payment
  getAllocations: (paymentId: string) =>
    request<{ success: boolean; data: APPaymentAllocation[] }>(`/ap/allocations?payment_id=${paymentId}`),

  // Get aging report
  getAgingReport: (params?: { supplier_id?: string; as_of_date?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<any>(`/ap/aging${query ? `?${query}` : ''}`);
  },

  // Get supplier statement (drill down)
  getSupplierStatement: (supplierId: string, params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<any>(`/ap/statement/${supplierId}${query ? `?${query}` : ''}`);
  },
};