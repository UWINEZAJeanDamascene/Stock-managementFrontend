const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stock-tenancy-system.onrender.com/api';

// Bank Account Types
export interface BankAccount {
  _id: string;
  name: string;
  accountType: 'bk_bank' | 'equity_bank' | 'im_bank' | 'cogebanque' | 'ecobank' | 'mtn_momo' | 'airtel_money' | 'cash_in_hand';
  accountNumber?: string;
  bankName?: string;
  openingBalance: number;
  currentBalance: number;
  targetBalance?: number;
  currency: string;
  isPrimary: boolean;
  isActive: boolean;
  color: string;
  createdAt: string;
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    request<{ success: boolean; token: string; data: unknown; company?: unknown; requirePasswordChange?: boolean }>('/auth/login', {
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
export const categoriesApi = {
  getAll: () => request<{ success: boolean; data: unknown }>('/categories'),
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/categories/${id}`),
  create: (category: unknown) => request<{ success: boolean; data: unknown }>('/categories', { method: 'POST', body: category }),
  update: (id: string, category: unknown) => request<{ success: boolean; data: unknown }>(`/categories/${id}`, { method: 'PUT', body: category }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/categories/${id}`, { method: 'DELETE' }),
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
};

// Stock API
export const stockApi = {
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
  delete: (id: string) => request<{ success: boolean; message: string }>(`/credit-notes/${id}`, { method: 'DELETE' })
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
  delete: (id: string) => request<{ success: boolean; message: string }>(`/quotations/${id}`, { method: 'DELETE' }),
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

// Advanced Stock API - Stock Audits
export const stockAuditApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; type?: string; warehouseId?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: unknown }>(`/stock/advanced/audits${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/audits/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/stock/advanced/audits', { method: 'POST', body: data }),
  updateItem: (auditId: string, itemId: string, data: { countedQuantity: number; notes?: string }) =>
    request<{ success: boolean; data: unknown }>(`/stock/advanced/audits/${auditId}/items/${itemId}`, { method: 'PUT', body: data }),
  complete: (id: string, data?: { adjustStock?: boolean; approvedNotes?: string }) =>
    request<{ success: boolean; data: unknown }>(`/stock/advanced/audits/${id}/complete`, { method: 'POST', body: data }),
  cancel: (id: string, reason?: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/audits/${id}/cancel`, { method: 'POST', body: { reason } }),
  getVariance: (id: string) => request<{ success: boolean; data: unknown }>(`/stock/advanced/audits/${id}/variance`),
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
};

// Loans API
export const loansApi = {
  getAll: (params?: { status?: string; loanType?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; data: unknown; summary: unknown }>(`/loans${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/loans/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/loans', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/loans/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/loans/${id}`, { method: 'DELETE' }),
  recordPayment: (id: string, data: { amount: number; paymentMethod: string; reference?: string; notes?: string }) =>
    request<{ success: boolean; data: unknown }>(`/loans/${id}/payment`, { method: 'POST', body: data }),
  getSummary: () => request<{ success: boolean; data: unknown }>('/loans/summary'),
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
  description?: string;
  amount: number;
  expenseDate: string;
  period: string;
  status: 'draft' | 'recorded' | 'approved' | 'cancelled';
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'credit';
  paid: boolean;
  paidDate?: string;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  createdBy: { _id: string; name: string; email: string };
  approvedBy?: { _id: string; name: string; email: string };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const expensesApi = {
  getAll: (params?: {
    type?: string;
    startDate?: string;
    endDate?: string;
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

// Purchase Returns API
export const purchaseReturnsApi = {
  getAll: (params?: {
    supplierId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; count: number; total: number; pages: number; data: unknown[] }>(`/purchase-returns${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/purchase-returns/${id}`),
  create: (data: unknown) => request<{ success: boolean; data: unknown }>('/purchase-returns', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/purchase-returns/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/purchase-returns/${id}`, { method: 'DELETE' }),
  approve: (id: string) => request<{ success: boolean; data: unknown }>(`/purchase-returns/${id}/approve`, { method: 'PUT' }),
  recordRefund: (id: string, data: { refundAmount?: number; refundMethod?: string }) => 
    request<{ success: boolean; data: unknown }>(`/purchase-returns/${id}/refund`, { method: 'PUT', body: data }),
  getSummary: (params?: { startDate?: string; endDate?: string }) => {
    const query = buildQuery(params as Record<string, any>);
    return request<{ success: boolean; data: { totalReturns: number; count: number } }>(`/purchase-returns/summary${query ? `?${query}` : ''}`);
  },
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
  // Float management
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
  completeReplenishment: (id: string, data: { actualAmount?: number; notes?: string }) =>
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
  getAccounts: () => request<{ success: boolean; data: ChartOfAccounts[] }>('/journal-entries/accounts'),
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
