export { default as authService } from './authService';
export type { LoginCredentials, RegisterData, AuthResponse, UserData } from './authService';

export { default as clientService } from './clientService';
export type { Client, ClientQueryParams } from './clientService';

export { default as supplierService } from './supplierService';
export type { Supplier, SupplierQueryParams } from './supplierService';

export { default as invoiceService } from './invoiceService';
export type { Invoice, InvoiceItem, InvoiceQueryParams, CreateInvoiceData } from './invoiceService';

export { default as companyService } from './companyService';
export type { Company, RegisterCompanyData, CompanyQueryParams, CompanyAddress, CompanySettings } from './companyService';
