/**
 * Monthly Reports API Integration
 *
 * Provides functions for all 15 monthly reports with JSON, PDF, and Excel support.
 */

import { API_BASE_URL, api as request } from "./api";

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
// TYPES
// ============================================

// 1. Profit & Loss
export interface PLSection {
  title: string;
  current: number;
  prior: number;
  ytd: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  items?: { name: string; current: number; prior: number; ytd: number }[];
}

export interface MonthlyProfitAndLoss {
  reportName: string;
  period: string;
  year: number;
  month: number;
  companyId: string;
  sections: PLSection[];
  generatedAt: string;
}

// 2. Balance Sheet
export interface BalanceSheetItem {
  name: string;
  current: number;
  prior: number;
  code?: string;
  subtype?: string;
}

export interface BalanceSheetAssetSection {
  total: number;
  items: BalanceSheetItem[];
}

export interface MonthlyBalanceSheet {
  reportName: string;
  asOfDate: string;
  year: number;
  month: number;
  companyId: string;
  assets: { 
    current: number; 
    prior: number; 
    items: BalanceSheetItem[];
    currentAssets?: BalanceSheetAssetSection;
    fixedAssets?: BalanceSheetAssetSection;
  };
  liabilities: { current: number; prior: number; items: BalanceSheetItem[] };
  equity: { current: number; prior: number; items: BalanceSheetItem[] };
  totalLiabilitiesAndEquity: number;
  generatedAt: string;
}

// 3. Trial Balance
export interface TrialBalanceAccount {
  accountId: string;
  code: string;
  name: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface MonthlyTrialBalance {
  reportName: string;
  asOfDate: string;
  year: number;
  month: number;
  companyId: string;
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  generatedAt: string;
}

// 4. Cash Flow
export interface MonthlyCashFlow {
  reportName: string;
  period: string;
  year: number;
  month: number;
  companyId: string;
  operating: {
    netProfit: number;
    adjustments: {
      accountsReceivableChange: number;
      accountsPayableChange: number;
      inventoryChange: number;
    };
    netOperatingCashFlow: number;
  };
  investing: {
    purchases: number;
    netInvestingCashFlow: number;
  };
  financing: {
    netFinancingCashFlow: number;
  };
  summary: {
    beginningCash: number;
    netCashChange: number;
    endingCash: number;
  };
  generatedAt: string;
}

// 5. Stock Valuation
export interface StockValuationItem {
  productId: string;
  name: string;
  sku: string;
  category: string;
  quantityOnHand: number;
  unitCost: number;
  totalValue: number;
  lastMovementDate: string;
  daysSinceMovement: number;
  isSlowMoving: boolean;
  isAgedStock: boolean;
}

export interface MonthlyStockValuation {
  reportName: string;
  asOfDate: string;
  year: number;
  month: number;
  companyId: string;
  summary: {
    totalItems: number;
    totalValue: number;
    slowMovingItems: number;
    slowMovingValue: number;
    agedStockItems: number;
    agedStockValue: number;
  };
  items: StockValuationItem[];
  generatedAt: string;
}

// 6. Sales by Customer
export interface SalesByCustomer {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  invoiceCount: number;
  averageOrderValue: number;
  outstandingBalance: number;
}

export interface MonthlySalesByCustomer {
  reportName: string;
  period: string;
  year: number;
  month: number;
  companyId: string;
  summary: {
    totalCustomers: number;
    totalRevenue: number;
    totalInvoices: number;
    totalOutstanding: number;
  };
  customers: SalesByCustomer[];
  generatedAt: string;
}

// 7. Sales by Category
export interface SalesByCategory {
  category: string;
  totalRevenue: number;
  totalUnits: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number;
}

export interface MonthlySalesByCategory {
  reportName: string;
  period: string;
  year: number;
  month: number;
  companyId: string;
  summary: {
    totalCategories: number;
    totalRevenue: number;
    totalUnits: number;
    totalGrossProfit: number;
    overallMargin: number;
  };
  categories: SalesByCategory[];
  generatedAt: string;
}

// 8. Purchases by Supplier
export interface PurchasesBySupplier {
  supplierId: string;
  supplierName: string;
  totalSpend: number;
  poCount: number;
  totalInvoiced: number;
  variance: number;
  variancePercent: number;
}

export interface MonthlyPurchasesBySupplier {
  reportName: string;
  period: string;
  year: number;
  month: number;
  companyId: string;
  summary: {
    totalSuppliers: number;
    totalSpend: number;
    totalPOs: number;
    totalVariance: number;
  };
  suppliers: PurchasesBySupplier[];
  generatedAt: string;
}

// 9. AR Aging
export interface ARAgingBucket {
  amount: number;
  count: number;
}

export interface ARAgingCustomer {
  customerId: string;
  customerName: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90plus: number;
  total: number;
}

export interface MonthlyARAging {
  reportName: string;
  asOfDate: string;
  year: number;
  month: number;
  companyId: string;
  summary: {
    totalAR: number;
    totalInvoices: number;
    provisionForDoubtfulDebts: number;
    netAR: number;
  };
  buckets: {
    current: ARAgingBucket;
    days30: ARAgingBucket;
    days60: ARAgingBucket;
    days90: ARAgingBucket;
    days90plus: ARAgingBucket;
  };
  customers: ARAgingCustomer[];
  generatedAt: string;
}

// 10. AP Aging
export interface APAgingSupplier {
  supplierId: string;
  supplierName: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90plus: number;
  total: number;
}

export interface MonthlyAPAging {
  reportName: string;
  asOfDate: string;
  year: number;
  month: number;
  companyId: string;
  summary: {
    totalAP: number;
    totalBills: number;
  };
  buckets: {
    current: ARAgingBucket;
    days30: ARAgingBucket;
    days60: ARAgingBucket;
    days90: ARAgingBucket;
    days90plus: ARAgingBucket;
  };
  suppliers: APAgingSupplier[];
  generatedAt: string;
}

// 11. Payroll Summary
export interface PayrollEmployee {
  employeeId: string;
  employeeNumber: string;
  name: string;
  grossPay: number;
  taxableIncome: number;
  paye: number;
  rssbEmployee: number;
  rssbEmployer: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  employerCost: number;
}

export interface MonthlyPayrollSummary {
  reportName: string;
  period: string;
  year: number;
  month: number;
  companyId: string;
  summary: {
    totalEmployees: number;
    totalGrossPay: number;
    totalPAYE: number;
    totalRSSBEmployee: number;
    totalRSSBEmployer: number;
    totalOtherDeductions: number;
    totalNetPay: number;
    totalEmployerCost: number;
  };
  employees: PayrollEmployee[];
  generatedAt: string;
}

// 12. VAT Return
export interface VATBreakdownItem {
  taxCode: string;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
}

export interface MonthlyVATReturn {
  reportName: string;
  taxPeriod: string;
  year: number;
  month: number;
  companyId: string;
  summary: {
    netVATPAYABLE: number;
    totalOutputVAT: number;
    totalInputVAT: number;
  };
  outputVAT: {
    total: number;
    totalTaxable: number;
    breakdown: VATBreakdownItem[];
  };
  inputVAT: {
    total: number;
    inputVAT: number;
    totalPurchases: number;
  };
  netVAT: {
    amount: number;
    type: 'payable' | 'reclaimable';
  };
  rraBoxes: {
    box1Sales: number;
    box2OutputVAT: number;
    box3Purchases: number;
    box4InputVAT: number;
    box5NetVAT: number;
  };
  generatedAt: string;
}

// 13. Bank Reconciliation
export interface ReconcilingItem {
  date: string;
  description: string;
  amount: number;
  type: string;
}

export interface BankReconciliationAccount {
  accountId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  currency: string;
  bookBalance: number;
  bankStatementBalance: number;
  outstandingDeposits: number;
  outstandingChecks: number;
  adjustedBankBalance: number;
  reconciliationDifference: number;
  isReconciled: boolean;
  statementDate: string | null;
  reconcilingItems: ReconcilingItem[];
}

export interface MonthlyBankReconciliation {
  reportName: string;
  asOfDate: string;
  year: number;
  month: number;
  companyId: string;
  accounts: BankReconciliationAccount[];
  summary: {
    totalBookBalance: number;
    totalBankStatementBalance: number;
    totalOutstandingDeposits: number;
    totalOutstandingChecks: number;
    totalAdjustedBankBalance: number;
    totalReconciliationDifference: number;
    isFullyReconciled: boolean;
  };
  generatedAt: string;
}

// 14. Budget vs Actual
export interface BudgetLine {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  variancePercent: number;
}

export interface MonthlyBudgetVsActual {
  reportName: string;
  period: string;
  year: number;
  month: number;
  companyId: string;
  revenue: BudgetLine;
  expenses: Array<BudgetLine & { status: string }>;
  summary: {
    totalBudget: number;
    totalExpenseBudget: number;
    totalActual: number;
    totalExpenseActual: number;
    totalVariance: number;
    variancePercent: number;
  };
  generatedAt: string;
}

// 15. General Ledger
export interface GLAccount {
  accountId: string;
  code: string;
  name: string;
  accountType: string;
  debit: number;
  credit: number;
  netMovement: number;
  transactionCount: number;
}

export interface MonthlyGeneralLedger {
  reportName: string;
  period: string;
  year: number;
  month: number;
  companyId: string;
  summary: {
    totalAccounts: number;
    totalDebits: number;
    totalCredits: number;
    totalTransactions: number;
  };
  accounts: GLAccount[];
  generatedAt: string;
}

// ============================================
// API FUNCTIONS
// ============================================

export const monthlyReportsApi = {
  // Helper: Get current month/year
  getCurrentMonth: () => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  },

  // 1. Profit & Loss
  getProfitAndLoss: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyProfitAndLoss }>(
      `/reports/monthly/profit-loss?year=${year}&month=${month}`
    ),
  downloadProfitAndLossPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/profit-loss/pdf?year=${year}&month=${month}`, `monthly-pl-${year}-${month}.pdf`),
  downloadProfitAndLossExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/profit-loss/excel?year=${year}&month=${month}`, `monthly-pl-${year}-${month}.xlsx`),

  // 2. Balance Sheet
  getBalanceSheet: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyBalanceSheet }>(
      `/reports/monthly/balance-sheet?year=${year}&month=${month}`
    ),
  downloadBalanceSheetPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/balance-sheet/pdf?year=${year}&month=${month}`, `monthly-balance-sheet-${year}-${month}.pdf`),
  downloadBalanceSheetExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/balance-sheet/excel?year=${year}&month=${month}`, `monthly-balance-sheet-${year}-${month}.xlsx`),

  // 3. Trial Balance
  getTrialBalance: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyTrialBalance }>(
      `/reports/monthly/trial-balance?year=${year}&month=${month}`
    ),
  downloadTrialBalancePDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/trial-balance/pdf?year=${year}&month=${month}`, `monthly-trial-balance-${year}-${month}.pdf`),
  downloadTrialBalanceExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/trial-balance/excel?year=${year}&month=${month}`, `monthly-trial-balance-${year}-${month}.xlsx`),

  // 4. Cash Flow
  getCashFlow: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyCashFlow }>(
      `/reports/monthly/cash-flow?year=${year}&month=${month}`
    ),
  downloadCashFlowPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/cash-flow/pdf?year=${year}&month=${month}`, `monthly-cash-flow-${year}-${month}.pdf`),
  downloadCashFlowExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/cash-flow/excel?year=${year}&month=${month}`, `monthly-cash-flow-${year}-${month}.xlsx`),

  // 5. Stock Valuation
  getStockValuation: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyStockValuation }>(
      `/reports/monthly/stock-valuation?year=${year}&month=${month}`
    ),
  downloadStockValuationPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/stock-valuation/pdf?year=${year}&month=${month}`, `monthly-stock-valuation-${year}-${month}.pdf`),
  downloadStockValuationExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/stock-valuation/excel?year=${year}&month=${month}`, `monthly-stock-valuation-${year}-${month}.xlsx`),

  // 6. Sales by Customer
  getSalesByCustomer: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlySalesByCustomer }>(
      `/reports/monthly/sales-by-customer?year=${year}&month=${month}`
    ),
  downloadSalesByCustomerPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/sales-by-customer/pdf?year=${year}&month=${month}`, `monthly-sales-customer-${year}-${month}.pdf`),
  downloadSalesByCustomerExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/sales-by-customer/excel?year=${year}&month=${month}`, `monthly-sales-customer-${year}-${month}.xlsx`),

  // 7. Sales by Category
  getSalesByCategory: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlySalesByCategory }>(
      `/reports/monthly/sales-by-category?year=${year}&month=${month}`
    ),
  downloadSalesByCategoryPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/sales-by-category/pdf?year=${year}&month=${month}`, `monthly-sales-category-${year}-${month}.pdf`),
  downloadSalesByCategoryExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/sales-by-category/excel?year=${year}&month=${month}`, `monthly-sales-category-${year}-${month}.xlsx`),

  // 8. Purchases by Supplier
  getPurchasesBySupplier: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyPurchasesBySupplier }>(
      `/reports/monthly/purchases-by-supplier?year=${year}&month=${month}`
    ),
  downloadPurchasesBySupplierPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/purchases-by-supplier/pdf?year=${year}&month=${month}`, `monthly-purchases-supplier-${year}-${month}.pdf`),
  downloadPurchasesBySupplierExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/purchases-by-supplier/excel?year=${year}&month=${month}`, `monthly-purchases-supplier-${year}-${month}.xlsx`),

  // 9. AR Aging
  getARAging: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyARAging }>(
      `/reports/monthly/ar-aging?year=${year}&month=${month}`
    ),
  downloadARAgingPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/ar-aging/pdf?year=${year}&month=${month}`, `monthly-ar-aging-${year}-${month}.pdf`),
  downloadARAgingExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/ar-aging/excel?year=${year}&month=${month}`, `monthly-ar-aging-${year}-${month}.xlsx`),

  // 10. AP Aging
  getAPAging: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyAPAging }>(
      `/reports/monthly/ap-aging?year=${year}&month=${month}`
    ),
  downloadAPAgingPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/ap-aging/pdf?year=${year}&month=${month}`, `monthly-ap-aging-${year}-${month}.pdf`),
  downloadAPAgingExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/ap-aging/excel?year=${year}&month=${month}`, `monthly-ap-aging-${year}-${month}.xlsx`),

  // 11. Payroll Summary
  getPayrollSummary: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyPayrollSummary }>(
      `/reports/monthly/payroll-summary?year=${year}&month=${month}`
    ),
  downloadPayrollSummaryPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/payroll-summary/pdf?year=${year}&month=${month}`, `monthly-payroll-${year}-${month}.pdf`),
  downloadPayrollSummaryExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/payroll-summary/excel?year=${year}&month=${month}`, `monthly-payroll-${year}-${month}.xlsx`),

  // 12. VAT Return
  getVATReturn: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyVATReturn }>(
      `/reports/monthly/vat-return?year=${year}&month=${month}`
    ),
  downloadVATReturnPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/vat-return/pdf?year=${year}&month=${month}`, `monthly-vat-return-${year}-${month}.pdf`),
  downloadVATReturnExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/vat-return/excel?year=${year}&month=${month}`, `monthly-vat-return-${year}-${month}.xlsx`),

  // 13. Bank Reconciliation
  getBankReconciliation: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyBankReconciliation }>(
      `/reports/monthly/bank-reconciliation?year=${year}&month=${month}`
    ),
  downloadBankReconciliationPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/bank-reconciliation/pdf?year=${year}&month=${month}`, `monthly-bank-rec-${year}-${month}.pdf`),
  downloadBankReconciliationExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/bank-reconciliation/excel?year=${year}&month=${month}`, `monthly-bank-rec-${year}-${month}.xlsx`),

  // 14. Budget vs Actual
  getBudgetVsActual: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyBudgetVsActual }>(
      `/reports/monthly/budget-vs-actual?year=${year}&month=${month}`
    ),
  downloadBudgetVsActualPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/budget-vs-actual/pdf?year=${year}&month=${month}`, `monthly-budget-actual-${year}-${month}.pdf`),
  downloadBudgetVsActualExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/budget-vs-actual/excel?year=${year}&month=${month}`, `monthly-budget-actual-${year}-${month}.xlsx`),

  // 15. General Ledger
  getGeneralLedger: (year: number, month: number) =>
    request<{ success: boolean; data: MonthlyGeneralLedger }>(
      `/reports/monthly/general-ledger?year=${year}&month=${month}`
    ),
  downloadGeneralLedgerPDF: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/general-ledger/pdf?year=${year}&month=${month}`, `monthly-gl-${year}-${month}.pdf`),
  downloadGeneralLedgerExcel: (year: number, month: number) =>
    downloadFile(`${API_BASE_URL}/reports/monthly/general-ledger/excel?year=${year}&month=${month}`, `monthly-gl-${year}-${month}.xlsx`),
};

export default monthlyReportsApi;
