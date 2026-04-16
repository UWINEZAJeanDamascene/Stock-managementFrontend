/**
 * Daily Reports API Integration
 * 
 * Provides functions for all 8 daily reports with JSON, PDF, and Excel support.
 */

import { API_BASE_URL, api as request } from "./api";

// Format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper to download file with auth token
const downloadFile = async (url: string, filename: string) => {
  const token = localStorage.getItem("token");
  const response = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Download failed" }));
    throw new Error(error.message || "Download failed");
  }
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
};

// ============================================
// DAILY SALES SUMMARY TYPES
// ============================================

export interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface DailySalesSummary {
  reportName: string;
  date: string;
  companyId: string;
  summary: {
    totalSales: number;
    totalInvoices: number;
    cashSales: number;
    creditSales: number;
    mobileMoneySales: number;
    bankTransferSales: number;
    totalDiscount: number;
    totalTax: number;
    averageInvoiceValue: number;
  };
  topProducts: TopProduct[];
  generatedAt: string;
}

// ============================================
// DAILY PURCHASES SUMMARY TYPES
// ============================================

export interface TopSupplier {
  supplierId: string;
  name: string;
  amount: number;
  orders: number;
}

export interface DailyPurchasesSummary {
  reportName: string;
  date: string;
  companyId: string;
  summary: {
    totalPurchases: number;
    totalOrders: number;
    totalTax: number;
    totalDiscount: number;
    totalGRNs: number;
    totalItemsReceived: number;
    averageOrderValue: number;
  };
  topSuppliers: TopSupplier[];
  generatedAt: string;
}

// ============================================
// DAILY CASH POSITION TYPES
// ============================================

export interface AccountPosition {
  accountId: string;
  accountName: string;
  accountNumber?: string;
  bankName?: string;
  accountType: string;
  currency: string;
  openingBalance: number;
  receipts: number;
  payments: number;
  journalNet: number;
  closingBalance: number;
}

export interface DailyCashPosition {
  reportName: string;
  date: string;
  companyId: string;
  summary: {
    openingBalance: number;
    receipts: number;
    payments: number;
    closingBalance: number;
  };
  accounts: AccountPosition[];
  generatedAt: string;
}

// ============================================
// DAILY STOCK MOVEMENT TYPES
// ============================================

export interface StockMovementItem {
  movementId: string;
  productId: string;
  productName: string;
  sku?: string;
  warehouse: string;
  type: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  reference?: string;
  notes?: string;
  runningBalance: number;
  date: string;
}

export interface DailyStockMovement {
  reportName: string;
  date: string;
  companyId: string;
  summary: {
    totalMovements: number;
    stockInCount: number;
    stockOutCount: number;
    totalInValue: number;
    totalOutValue: number;
    netMovement: number;
  };
  movements: StockMovementItem[];
  generatedAt: string;
}

// ============================================
// DAILY AR ACTIVITY TYPES
// ============================================

export interface ARInvoice {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  date: string;
  total: number;
  status: string;
}

export interface ARPayment {
  receiptId: string;
  receiptNumber: string;
  clientName: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  paymentMethod: string;
}

export interface ARCreditNote {
  creditNoteId: string;
  creditNoteNumber: string;
  clientName: string;
  invoiceNumber: string;
  date: string;
  total: number;
  reason?: string;
}

export interface DailyARActivity {
  reportName: string;
  date: string;
  companyId: string;
  summary: {
    newInvoicesCount: number;
    newInvoicesTotal: number;
    paymentsCount: number;
    paymentsTotal: number;
    creditNotesCount: number;
    creditNotesTotal: number;
    netARChange: number;
  };
  newInvoices: ARInvoice[];
  paymentsReceived: ARPayment[];
  creditNotes: ARCreditNote[];
  generatedAt: string;
}

// ============================================
// DAILY AP ACTIVITY TYPES
// ============================================

export interface APBill {
  purchaseId: string;
  purchaseNumber: string;
  supplierName: string;
  date: string;
  total: number;
  status: string;
}

export interface APPayment {
  paymentId: string;
  paymentNumber: string;
  supplierName: string;
  purchaseNumber: string;
  date: string;
  amount: number;
  paymentMethod: string;
}

export interface APPurchaseReturn {
  returnId: string;
  returnNumber: string;
  supplierName: string;
  purchaseNumber: string;
  date: string;
  total: number;
  reason?: string;
}

export interface DailyAPActivity {
  reportName: string;
  date: string;
  companyId: string;
  summary: {
    newBillsCount: number;
    newBillsTotal: number;
    paymentsCount: number;
    paymentsTotal: number;
    returnsCount: number;
    returnsTotal: number;
    netAPChange: number;
  };
  newBills: APBill[];
  paymentsMade: APPayment[];
  purchaseReturns: APPurchaseReturn[];
  generatedAt: string;
}

// ============================================
// DAILY JOURNAL ENTRIES TYPES
// ============================================

export interface JournalEntryLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  entryId: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  postedBy: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalEntryLine[];
}

export interface DailyJournalEntries {
  reportName: string;
  date: string;
  companyId: string;
  summary: {
    totalEntries: number;
    totalDebits: number;
    totalCredits: number;
  };
  entries: JournalEntry[];
  generatedAt: string;
}

// ============================================
// DAILY TAX COLLECTED TYPES
// ============================================

export interface TaxBreakdownItem {
  taxCode: string;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface DailyTaxCollected {
  reportName: string;
  date: string;
  companyId: string;
  summary: {
    totalOutputVAT: number;
    taxableSales: number;
    totalSales: number;
    exemptSales: number;
  };
  taxBreakdown: TaxBreakdownItem[];
  generatedAt: string;
}

// ============================================
// DAILY REPORTS API
// ============================================

export const dailyReportsApi = {
  // 1. Daily Sales Summary
  getSalesSummary: (date: string) =>
    request<{ success: boolean; data: DailySalesSummary }>(
      `/reports/daily/sales?date=${date}`
    ),
  downloadSalesPDF: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/sales/pdf?date=${date}`, `daily-sales-${date}.pdf`),
  downloadSalesExcel: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/sales/excel?date=${date}`, `daily-sales-${date}.xlsx`),

  // 2. Daily Purchases Summary
  getPurchasesSummary: (date: string) =>
    request<{ success: boolean; data: DailyPurchasesSummary }>(
      `/reports/daily/purchases?date=${date}`
    ),
  downloadPurchasesPDF: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/purchases/pdf?date=${date}`, `daily-purchases-${date}.pdf`),
  downloadPurchasesExcel: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/purchases/excel?date=${date}`, `daily-purchases-${date}.xlsx`),

  // 3. Daily Cash Position
  getCashPosition: (date: string) =>
    request<{ success: boolean; data: DailyCashPosition }>(
      `/reports/daily/cash-position?date=${date}`
    ),
  downloadCashPositionPDF: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/cash-position/pdf?date=${date}`, `daily-cash-${date}.pdf`),
  downloadCashPositionExcel: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/cash-position/excel?date=${date}`, `daily-cash-${date}.xlsx`),

  // 4. Daily Stock Movement
  getStockMovement: (date: string) =>
    request<{ success: boolean; data: DailyStockMovement }>(
      `/reports/daily/stock-movement?date=${date}`
    ),
  downloadStockMovementPDF: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/stock-movement/pdf?date=${date}`, `daily-stock-${date}.pdf`),
  downloadStockMovementExcel: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/stock-movement/excel?date=${date}`, `daily-stock-${date}.xlsx`),

  // 5. Daily AR Activity
  getARActivity: (date: string) =>
    request<{ success: boolean; data: DailyARActivity }>(
      `/reports/daily/ar-activity?date=${date}`
    ),
  downloadARActivityPDF: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/ar-activity/pdf?date=${date}`, `daily-ar-${date}.pdf`),
  downloadARActivityExcel: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/ar-activity/excel?date=${date}`, `daily-ar-${date}.xlsx`),

  // 6. Daily AP Activity
  getAPActivity: (date: string) =>
    request<{ success: boolean; data: DailyAPActivity }>(
      `/reports/daily/ap-activity?date=${date}`
    ),
  downloadAPActivityPDF: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/ap-activity/pdf?date=${date}`, `daily-ap-${date}.pdf`),
  downloadAPActivityExcel: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/ap-activity/excel?date=${date}`, `daily-ap-${date}.xlsx`),

  // 7. Daily Journal Entries
  getJournalEntries: (date: string) =>
    request<{ success: boolean; data: DailyJournalEntries }>(
      `/reports/daily/journal-entries?date=${date}`
    ),
  downloadJournalEntriesPDF: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/journal-entries/pdf?date=${date}`, `daily-journal-${date}.pdf`),
  downloadJournalEntriesExcel: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/journal-entries/excel?date=${date}`, `daily-journal-${date}.xlsx`),

  // 8. Daily Tax Collected
  getTaxCollected: (date: string) =>
    request<{ success: boolean; data: DailyTaxCollected }>(
      `/reports/daily/tax-collected?date=${date}`
    ),
  downloadTaxCollectedPDF: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/tax-collected/pdf?date=${date}`, `daily-tax-${date}.pdf`),
  downloadTaxCollectedExcel: (date: string) =>
    downloadFile(`${API_BASE_URL}/reports/daily/tax-collected/excel?date=${date}`, `daily-tax-${date}.xlsx`),

  // Helper: Get today's date formatted
  getToday: () => formatDate(new Date()),

  // Helper: Format any date
  formatDate,
};

export default dailyReportsApi;
