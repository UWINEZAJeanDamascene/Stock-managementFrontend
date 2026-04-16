import { BrowserRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
import HomePage from './pages/landing/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import CompanySelectorPage from './pages/auth/CompanySelectorPage';
import DashboardPage from './pages/DashboardPage';
import InventoryDashboardPage from './pages/InventoryDashboardPage';
import SalesDashboardPage from './pages/SalesDashboardPage';
import PurchaseDashboardPage from './pages/PurchaseDashboardPage';
import FinanceDashboardPage from './pages/FinanceDashboardPage';
import UsersPage from './pages/UsersPage';
import SecurityPage from './pages/SecurityPage';
import NotificationsPage from './pages/NotificationsPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import BackupPage from './pages/BackupPage';
import TestimonialsPage from './pages/TestimonialsPage';
import DepartmentsPage from './pages/DepartmentsPage';
import BulkDataPage from './pages/BulkDataPage';
import AuditTrailPage from './pages/AuditTrailPage';
import PlatformAdminPage from './pages/PlatformAdminPage';
import ProductsListPage from './pages/ProductsListPage';
import ProductFormPage from './pages/ProductFormPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CategoriesPage from './pages/CategoriesPage';
import WarehousesPage from './pages/WarehousesPage';
import StockLevelsPage from './pages/StockLevelsPage';
import StockMovementsPage from './pages/StockMovementsPage';
import TransfersListPage from './pages/TransfersListPage';
import TransferCreatePage from './pages/TransferCreatePage';
import TransferDetailPage from './pages/TransferDetailPage';
import AuditsListPage from './pages/AuditsListPage';
import AuditDetailPage from './pages/AuditDetailPage';
import AuditCreatePage from './pages/AuditCreatePage';
import BatchesPage from './pages/BatchesPage';
import SerialNumbersPage from './pages/SerialNumbersPage';
import PurchasesListPage from './pages/purchases/PurchasesListPage';
import PurchaseDetailPage from './pages/purchases/PurchaseDetailPage';
import PurchaseFormPage from './pages/purchases/PurchaseFormPage';
import PurchaseOrdersListPage from './pages/purchases/PurchaseOrdersListPage';
import PurchaseOrderFormPage from './pages/purchases/PurchaseOrderFormPage';
import PurchaseOrderDetailPage from './pages/purchases/PurchaseOrderDetailPage';
import GRNListPage from './pages/grn/GRNListPage';
import GRNCreatePage from './pages/grn/GRNCreatePage';
import GRNDetailPage from './pages/grn/GRNDetailPage';
import GRNEditPage from './pages/grn/GRNEditPage';
import PurchaseReturnsListPage from './pages/purchase-returns/PurchaseReturnsListPage';
import PurchaseReturnCreatePage from './pages/purchase-returns/PurchaseReturnCreatePage';
import PurchaseReturnDetailPage from './pages/purchase-returns/PurchaseReturnDetailPage';
import ClientsListPage from './pages/clients/ClientsListPage';
import ClientFormPage from './pages/clients/ClientFormPage';
import ClientDetailPage from './pages/clients/ClientDetailPage';
import SuppliersListPage from './pages/suppliers/SuppliersListPage';
import SupplierFormPage from './pages/suppliers/SupplierFormPage';
import SupplierDetailPage from './pages/suppliers/SupplierDetailPage';
import QuotationsListPage from './pages/quotations/QuotationsListPage';
import QuotationFormPage from './pages/quotations/QuotationFormPage';
import ClientQuotationViewPage from './pages/quotations/ClientQuotationViewPage';
import InvoicesListPage from './pages/invoices/InvoicesListPage';
import InvoiceFormPage from './pages/invoices/InvoiceFormPage';
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage';
import SalesLegacyPage from './pages/sales-legacy/SalesLegacyPage';
import DeliveryNotesListPage from './pages/delivery-notes/DeliveryNotesListPage';
import DeliveryNoteCreatePage from './pages/delivery-notes/DeliveryNoteCreatePage';
import DeliveryNoteDetailPage from './pages/delivery-notes/DeliveryNoteDetailPage';
import CreditNotesListPage from './pages/credit-notes/CreditNotesListPage';
import CreditNoteCreatePage from './pages/credit-notes/CreditNoteCreatePage';
import CreditNoteDetailPage from './pages/credit-notes/CreditNoteDetailPage';
import RecurringInvoicesListPage from './pages/recurring-invoices/RecurringInvoicesListPage';
import RecurringInvoiceDetailPage from './pages/recurring-invoices/RecurringInvoiceDetailPage';
import RecurringInvoiceFormPage from './pages/recurring-invoices/RecurringInvoiceFormPage';
// Sales Orders & Pick Pack
import SalesOrdersListPage from './pages/sales-orders/SalesOrdersListPage';
import SalesOrderCreatePage from './pages/sales-orders/SalesOrderCreatePage';
import SalesOrderDetailPage from './pages/sales-orders/SalesOrderDetailPage';
import PickPacksListPage from './pages/pick-packs/PickPacksListPage';
import PickPackCreatePage from './pages/pick-packs/PickPackCreatePage';
import PickPackDetailPage from './pages/pick-packs/PickPackDetailPage';
import PickPackPickPage from './pages/pick-packs/PickPackPickPage';
import PickPackPackPage from './pages/pick-packs/PickPackPackPage';
import ARReceiptsListPage from './pages/ar/ARReceiptsListPage';
import ARReceiptCreatePage from './pages/ar/ARReceiptCreatePage';
import ARReceiptDetailPage from './pages/ar/ARReceiptDetailPage';
import APPaymentsListPage from './pages/ap/APPaymentsListPage';
import APPaymentCreatePage from './pages/ap/APPaymentCreatePage';
import APPaymentDetailPage from './pages/ap/APPaymentDetailPage';
import APAgingReportPage from './pages/ap/APAgingReportPage';
import APReconciliationPage from './pages/ap/APReconciliationPage';
import BankAccountsListPage from './pages/bank/BankAccountsListPage';
import BankAccountDetailPage from './pages/bank/BankAccountDetailPage';
import PettyCashListPage from './pages/petty-cash/PettyCashListPage';
import PettyCashTransactionsPage from './pages/petty-cash/PettyCashTransactionsPage';
import AssetsListPage from './pages/assets/AssetsListPage';
import AssetCreatePage from './pages/assets/AssetCreatePage';
import AssetDetailPage from './pages/assets/AssetDetailPage';
import LiabilitiesListPage from './pages/liabilities/LiabilitiesListPage';
import LiabilityDetailPage from './pages/liabilities/LiabilityDetailPage';
import LiabilityFormPage from './pages/liabilities/LiabilityFormPage';
import BudgetsListPage from './pages/budgets/BudgetsListPage';
import BudgetFormPage from './pages/budgets/BudgetFormPage';
import BudgetDetailPage from './pages/budgets/BudgetDetailPage';
import BudgetSettingsPage from './pages/budgets/BudgetSettingsPage';
import ARAgingPage from './pages/ar/ARAgingPage';
import ARReconciliationPage from './pages/ar/ARReconciliationPage';
import ExpensesListPage from './pages/expenses/ExpensesListPage';
import ExpenseDetailPage from './pages/expenses/ExpenseDetailPage';
import ChartOfAccountsPage from './pages/settings/ChartOfAccountsPage';
import PayrollListPage from './pages/payroll/PayrollListPage';
import PayrollRunsListPage from './pages/payroll/PayrollRunsListPage';
import PayrollDetailPage from './pages/payroll/PayrollDetailPage';
import PayrollRunDetailPage from './pages/payroll/PayrollRunDetailPage';
import JournalEntriesPage from './pages/journal/JournalEntriesPage';
import JournalEntryDetailPage from './pages/journal/JournalEntryDetailPage';
import JournalEntryFormPage from './pages/journal/JournalEntryFormPage';
import TrialBalancePage from './pages/journal/TrialBalancePage';
import GeneralLedgerPage from './pages/journal/GeneralLedgerPage';
import ProfitLossPage from './pages/reports/ProfitLossPage';
import BalanceSheetPage from './pages/reports/BalanceSheetPage';
import CashFlowPage from './pages/reports/CashFlowPage';
import FinancialRatiosPage from './pages/reports/FinancialRatiosPage';
import ReportsHubPage from './pages/reports/ReportsHubPage';
import DailyReportsPage from './pages/reports/DailyReportsPage';
import DailySalesReportPage from './pages/reports/daily/DailySalesReportPage';
import DailyPurchasesReportPage from './pages/reports/daily/DailyPurchasesReportPage';
import DailyCashPositionReportPage from './pages/reports/daily/DailyCashPositionReportPage';
import DailyStockMovementReportPage from './pages/reports/daily/DailyStockMovementReportPage';
import DailyARActivityReportPage from './pages/reports/daily/DailyARActivityReportPage';
import DailyAPActivityReportPage from './pages/reports/daily/DailyAPActivityReportPage';
import DailyJournalEntriesReportPage from './pages/reports/daily/DailyJournalEntriesReportPage';
import DailyTaxCollectedReportPage from './pages/reports/daily/DailyTaxCollectedReportPage';
import WeeklyReportsPage from './pages/reports/WeeklyReportsPage';
import WeeklySalesPerformanceReportPage from './pages/reports/weekly/WeeklySalesPerformanceReportPage';
import WeeklyInventoryReorderReportPage from './pages/reports/weekly/WeeklyInventoryReorderReportPage';
import WeeklySupplierPerformanceReportPage from './pages/reports/weekly/WeeklySupplierPerformanceReportPage';
import WeeklyReceivablesAgingReportPage from './pages/reports/weekly/WeeklyReceivablesAgingReportPage';
import WeeklyPayablesAgingReportPage from './pages/reports/weekly/WeeklyPayablesAgingReportPage';
import WeeklyCashFlowReportPage from './pages/reports/weekly/WeeklyCashFlowReportPage';
import WeeklyPayrollPreviewReportPage from './pages/reports/weekly/WeeklyPayrollPreviewReportPage';
// Monthly Reports
import MonthlyReportsPage from './pages/reports/MonthlyReportsPage';
import MonthlyPLReportPage from './pages/reports/monthly/MonthlyPLReportPage';
import MonthlyBalanceSheetPage from './pages/reports/monthly/MonthlyBalanceSheetPage';
import MonthlyTrialBalancePage from './pages/reports/monthly/MonthlyTrialBalancePage';
import MonthlyCashFlowPage from './pages/reports/monthly/MonthlyCashFlowPage';
import MonthlyARAgingPage from './pages/reports/monthly/MonthlyARAgingPage';
import MonthlyAPAgingPage from './pages/reports/monthly/MonthlyAPAgingPage';
import MonthlyStockValuationPage from './pages/reports/monthly/MonthlyStockValuationPage';
import MonthlySalesByCustomerPage from './pages/reports/monthly/MonthlySalesByCustomerPage';
import MonthlySalesByCategoryPage from './pages/reports/monthly/MonthlySalesByCategoryPage';
import MonthlyPurchasesBySupplierPage from './pages/reports/monthly/MonthlyPurchasesBySupplierPage';
import MonthlyPayrollSummaryPage from './pages/reports/monthly/MonthlyPayrollSummaryPage';
import MonthlyVATReturnPage from './pages/reports/monthly/MonthlyVATReturnPage';
import MonthlyBankReconciliationPage from './pages/reports/monthly/MonthlyBankReconciliationPage';
import MonthlyBudgetVsActualPage from './pages/reports/monthly/MonthlyBudgetVsActualPage';
import MonthlyGeneralLedgerPage from './pages/reports/monthly/MonthlyGeneralLedgerPage';
import AccountingPeriodsPage from './pages/settings/AccountingPeriodsPage';
import CompanyProfilePage from './pages/settings/CompanyProfilePage';
import RolesSettingsPage from './pages/settings/RolesSettingsPage';
import { LanguageProvider } from '../contexts/LanguageContext';
import ChatBot from './components/ChatBot';
import OfflineSyncBanner from './components/OfflineSyncBanner';
import { Toaster } from 'sonner';

// Wrapper for ProductsListPage
function ProductsListPageWrapper() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div style={{padding: 20, textAlign: 'center', background: '#fff'}}>
      <div>Checking authentication...</div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <div style={{padding: 20, textAlign: 'center', background: '#fff'}}>
      <div>Please log in to view products</div>
    </div>;
  }
  
  try {
    return <ProductsListPage />;
  } catch (err) {
    console.error('[ProductsListPageWrapper] RENDER ERROR:', err);
    return <div style={{padding: 20, color: 'red', background: '#fff'}}>ERROR in ProductsListPage: {String(err)}</div>;
  }
}

// Wrapper for ProductDetailPage
function ProductDetailPageWrapper() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div style={{padding: 20, textAlign: 'center', background: '#fff'}}>
      <div>Checking authentication...</div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <div style={{padding: 20, textAlign: 'center', background: '#fff'}}>
      <div>Please log in to view product details</div>
    </div>;
  }
  
  try {
    return <ProductDetailPage />;
  } catch (err) {
    console.error('[ProductDetailPageWrapper] RENDER ERROR:', err);
    return <div style={{padding: 20, color: 'red', background: '#fff'}}>ERROR in ProductDetailPage: {String(err)}</div>;
  }
}

// Wrapper for DashboardPage
function DashboardPageWrapper() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div style={{padding: 40, textAlign: 'center'}}>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <div style={{padding: 40, textAlign: 'center'}}>Please log in</div>;
  }
  
  try {
    return <DashboardPage />;
  } catch (err: any) {
    console.error('[DashboardPageWrapper] Render error:', err);
    return <div style={{padding: 40, color: 'red', textAlign: 'center'}}>Error: {err.message || String(err)}</div>;
  }
}

// Wrapper for GRNListPage
function GRNListPageWrapper() {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div style={{padding: 20, textAlign: 'center', background: '#fff'}}>
      <div>Checking authentication...</div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <div style={{padding: 20, textAlign: 'center', background: '#fff'}}>
      <div>Please log in to view GRN</div>
    </div>;
  }
  
  try {
    return <GRNListPage />;
  } catch (err) {
    console.error('[GRNListPageWrapper] RENDER ERROR:', err);
    return <div style={{padding: 20, color: 'red', background: '#fff'}}>ERROR in GRNListPage: {String(err)}</div>;
  }
}

// TOP-LEVEL DEBUG - should always show in console
function AppRoutes() {
  return (
    <>
      <OfflineSyncBanner />
      <Routes>
        {/* Public routes - landing page and auth */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/company" element={<CompanySelectorPage />} />
        
        {/* System routes - pages already have Layout component */}
        <Route path="/dashboard" element={<DashboardPageWrapper />} />
        <Route path="/dashboard/inventory" element={<InventoryDashboardPage />} />
        <Route path="/dashboard/sales" element={<SalesDashboardPage />} />
        <Route path="/dashboard/purchases" element={<PurchaseDashboardPage />} />
        <Route path="/dashboard/finance" element={<FinanceDashboardPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/notifications" element={<NotificationSettingsPage />} />
        <Route path="/notifications/list" element={<NotificationsPage />} />
        <Route path="/backups" element={<BackupPage />} />
        <Route path="/testimonials" element={<TestimonialsPage />} />
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/warehouses" element={<WarehousesPage />} />
        <Route path="/stock-levels" element={<StockLevelsPage />} />
        <Route path="/stock-movements" element={<StockMovementsPage />} />
        <Route path="/stock-transfers" element={<TransfersListPage />} />
        <Route path="/stock-transfers/new" element={<TransferCreatePage />} />
        <Route path="/stock-transfers/:id" element={<TransferDetailPage />} />
        <Route path="/stock-audits" element={<AuditsListPage />} />
        <Route path="/stock-audits/new" element={<AuditCreatePage />} />
        <Route path="/stock-audits/:id" element={<AuditDetailPage />} />
        <Route path="/batches" element={<BatchesPage />} />
        <Route path="/serial-numbers" element={<SerialNumbersPage />} />
        <Route path="/purchase-orders" element={<PurchaseOrdersListPage />} />
        <Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
        <Route path="/purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />
        <Route path="/purchase-orders/:id" element={
          <ErrorBoundary>
            <PurchaseOrderDetailPage />
          </ErrorBoundary>
        } />
        <Route path="/purchases" element={<PurchasesListPage />} />
        <Route path="/purchases/new" element={<PurchaseFormPage />} />
        <Route path="/purchases/:id/edit" element={<PurchaseFormPage />} />
        <Route path="/purchases/:id" element={<PurchaseDetailPage />} />
        <Route path="/grn" element={
          <ErrorBoundary>
            <GRNListPageWrapper />
          </ErrorBoundary>
        } />
        <Route path="/grn/new" element={<GRNCreatePage />} />
        <Route path="/grn/:id" element={<GRNDetailPage />} />
        <Route path="/grn/:id/edit" element={<GRNEditPage />} />
        <Route path="/purchase-returns" element={<PurchaseReturnsListPage />} />
        <Route path="/purchase-returns/new" element={<PurchaseReturnCreatePage />} />
        <Route path="/purchase-returns/:id" element={<PurchaseReturnDetailPage />} />
        <Route path="/clients" element={<ClientsListPage />} />
        <Route path="/clients/new" element={<ClientFormPage />} />
        <Route path="/clients/:id/edit" element={<ClientFormPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/suppliers" element={<SuppliersListPage />} />
        <Route path="/suppliers/new" element={<SupplierFormPage />} />
        <Route path="/suppliers/:id/edit" element={<SupplierFormPage />} />
        <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
        <Route path="/quotations" element={<QuotationsListPage />} />
        <Route path="/quotations/new" element={<QuotationFormPage />} />
        <Route path="/quotations/:id/edit" element={<QuotationFormPage />} />
        <Route path="/quotations/:id" element={<QuotationFormPage />} />
        <Route path="/client/quotations/:id" element={<ClientQuotationViewPage />} />
        <Route path="/invoices" element={<InvoicesListPage />} />
        <Route path="/invoices/new" element={<InvoiceFormPage />} />
        <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        
        {/* Sales Legacy / Direct Sale */}
        <Route path="/sales-legacy" element={
          <ErrorBoundary>
            <SalesLegacyPage />
          </ErrorBoundary>
        } />
        
        <Route path="/delivery-notes/new" element={<DeliveryNoteCreatePage />} />
        <Route path="/delivery-notes/:id/edit" element={<DeliveryNoteCreatePage />} />
        <Route path="/delivery-notes/:id" element={<DeliveryNoteDetailPage />} />
        <Route path="/delivery-notes" element={<DeliveryNotesListPage />} />
        
        {/* Sales Orders */}
        <Route path="/sales-orders" element={
          <ErrorBoundary>
            <SalesOrdersListPage />
          </ErrorBoundary>
        } />
        <Route path="/sales-orders/create" element={
          <ErrorBoundary>
            <SalesOrderCreatePage />
          </ErrorBoundary>
        } />
        <Route path="/sales-orders/:id" element={
          <ErrorBoundary>
            <SalesOrderDetailPage />
          </ErrorBoundary>
        } />
        <Route path="/sales-orders/:id/edit" element={
          <ErrorBoundary>
            <SalesOrderCreatePage />
          </ErrorBoundary>
        } />
        
        {/* Pick & Pack */}
        <Route path="/pick-packs" element={
          <ErrorBoundary>
            <PickPacksListPage />
          </ErrorBoundary>
        } />
        <Route path="/pick-packs/create" element={
          <ErrorBoundary>
            <PickPackCreatePage />
          </ErrorBoundary>
        } />
        <Route path="/pick-packs/:id" element={
          <ErrorBoundary>
            <PickPackDetailPage />
          </ErrorBoundary>
        } />
        <Route path="/pick-packs/:id/pick" element={
          <ErrorBoundary>
            <PickPackPickPage />
          </ErrorBoundary>
        } />
        <Route path="/pick-packs/:id/pack" element={
          <ErrorBoundary>
            <PickPackPackPage />
          </ErrorBoundary>
        } />
        
        <Route path="/credit-notes" element={<CreditNotesListPage />} />
        <Route path="/credit-notes/new" element={<CreditNoteCreatePage />} />
        <Route path="/credit-notes/:id/edit" element={<CreditNoteCreatePage />} />
        <Route path="/credit-notes/:id" element={<CreditNoteDetailPage />} />
        <Route path="/recurring-invoices" element={<RecurringInvoicesListPage />} />
        <Route path="/recurring-invoices/new" element={<RecurringInvoiceFormPage />} />
        <Route path="/recurring-invoices/:id/edit" element={<RecurringInvoiceFormPage />} />
        <Route path="/recurring-invoices/:id" element={<RecurringInvoiceDetailPage />} />
        {/* AR Receipts */}
        <Route path="/ar-receipts" element={
          <ErrorBoundary>
            <ARReceiptsListPage />
          </ErrorBoundary>
        } />
        <Route path="/ar-receipts/new" element={
          <ErrorBoundary>
            <ARReceiptCreatePage />
          </ErrorBoundary>
        } />
        <Route path="/ar-receipts/:id/edit" element={
          <ErrorBoundary>
            <ARReceiptCreatePage />
          </ErrorBoundary>
        } />
        <Route path="/ar-receipts/:id" element={
          <ErrorBoundary>
            <ARReceiptDetailPage />
          </ErrorBoundary>
        } />
        {/* AR Aging */}
        <Route path="/ar-aging" element={
          <ErrorBoundary>
            <ARAgingPage />
          </ErrorBoundary>
        } />
        {/* AR Reconciliation */}
        <Route path="/ar-reconciliation" element={
          <ErrorBoundary>
            <ARReconciliationPage />
          </ErrorBoundary>
        } />
        {/* AP Payments */}
        <Route path="/ap-payments" element={
          <ErrorBoundary>
            <APPaymentsListPage />
          </ErrorBoundary>
        } />
        <Route path="/ap-payments/new" element={
          <ErrorBoundary>
            <APPaymentCreatePage />
          </ErrorBoundary>
        } />
        <Route path="/ap-payments/:id/edit" element={
          <ErrorBoundary>
            <APPaymentCreatePage />
          </ErrorBoundary>
        } />
        <Route path="/ap-payments/:id" element={
          <ErrorBoundary>
            <APPaymentDetailPage />
          </ErrorBoundary>
        } />
        {/* AP Aging */}
        <Route path="/ap-aging" element={
          <ErrorBoundary>
            <APAgingReportPage />
          </ErrorBoundary>
        } />
        {/* AP Reconciliation */}
        <Route path="/ap-reconciliation" element={
          <ErrorBoundary>
            <APReconciliationPage />
          </ErrorBoundary>
        } />
        {/* Bank Accounts */}
        <Route path="/bank-accounts" element={
          <ErrorBoundary>
            <BankAccountsListPage />
          </ErrorBoundary>
        } />
        <Route path="/bank-accounts/new" element={
          <ErrorBoundary>
            <BankAccountsListPage />
          </ErrorBoundary>
        } />
        <Route path="/bank-accounts/:id" element={
          <ErrorBoundary>
            <BankAccountDetailPage />
          </ErrorBoundary>
        } />
        <Route path="/bank-accounts/:id/edit" element={
          <ErrorBoundary>
            <BankAccountsListPage />
          </ErrorBoundary>
        } />
        {/* Petty Cash */}
        <Route path="/petty-cash" element={
          <ErrorBoundary>
            <PettyCashListPage />
          </ErrorBoundary>
        } />
        <Route path="/petty-cash/:id/transactions" element={
          <ErrorBoundary>
            <PettyCashTransactionsPage />
          </ErrorBoundary>
        } />
        {/* Fixed Assets */}
        <Route path="/assets" element={
          <ErrorBoundary>
            <AssetsListPage />
          </ErrorBoundary>
        } />
        <Route path="/assets/new" element={
          <ErrorBoundary>
            <AssetCreatePage />
          </ErrorBoundary>
        } />
        <Route path="/assets/:id" element={
          <ErrorBoundary>
            <AssetDetailPage />
          </ErrorBoundary>
        } />
        <Route path="/assets/:id/edit" element={
          <ErrorBoundary>
            <AssetCreatePage />
          </ErrorBoundary>
        } />
        {/* Liabilities */}
        <Route path="/liabilities" element={
          <ErrorBoundary>
            <LiabilitiesListPage />
          </ErrorBoundary>
        } />
        <Route path="/liabilities/new" element={
          <ErrorBoundary>
            <LiabilityFormPage />
          </ErrorBoundary>
        } />
        <Route path="/liabilities/:id" element={
          <ErrorBoundary>
            <LiabilityDetailPage />
          </ErrorBoundary>
        } />
        <Route path="/liabilities/:id/edit" element={
          <ErrorBoundary>
            <LiabilityFormPage />
          </ErrorBoundary>
        } />
        {/* Budgets */}
        <Route path="/budgets" element={
          <ErrorBoundary>
            <BudgetsListPage />
          </ErrorBoundary>
        } />
        <Route path="/budgets/new" element={
          <ErrorBoundary>
            <BudgetFormPage />
          </ErrorBoundary>
        } />
        <Route path="/budgets/:id" element={
          <ErrorBoundary>
            <BudgetDetailPage />
          </ErrorBoundary>
        } />
        <Route path="/budgets/:id/edit" element={
          <ErrorBoundary>
            <BudgetFormPage />
          </ErrorBoundary>
        } />
        <Route path="/budgets/settings" element={
          <ErrorBoundary>
            <BudgetSettingsPage />
          </ErrorBoundary>
        } />
        {/* Expenses */}
        <Route path="/expenses" element={
          <ErrorBoundary>
            <ExpensesListPage />
          </ErrorBoundary>
        } />
        <Route path="/expenses/new" element={
          <ErrorBoundary>
            <ExpensesListPage />
          </ErrorBoundary>
        } />
        <Route path="/expenses/:id" element={
          <ErrorBoundary>
            <ExpenseDetailPage />
          </ErrorBoundary>
        } />
        <Route path="/expenses/:id/edit" element={
          <ErrorBoundary>
            <ExpenseDetailPage />
          </ErrorBoundary>
        } />
        {/* Chart of Accounts */}
        <Route path="/chart-of-accounts" element={
          <ErrorBoundary>
            <ChartOfAccountsPage />
          </ErrorBoundary>
        } />
        <Route path="/bulk-data" element={<BulkDataPage />} />
        <Route path="/audit-trail" element={<AuditTrailPage />} />
        <Route path="/platform-admin" element={<PlatformAdminPage />} />
        
        {/* Payroll routes */}
        <Route path="/payroll" element={
          <ErrorBoundary>
            <PayrollListPage />
          </ErrorBoundary>
        } />
        <Route path="/payroll-runs" element={
          <ErrorBoundary>
            <PayrollRunsListPage />
          </ErrorBoundary>
        } />
        <Route path="/payroll-runs/new" element={
          <ErrorBoundary>
            <PayrollRunDetailPage />
          </ErrorBoundary>
        } />
        <Route path="/payroll-runs/:id" element={
          <ErrorBoundary>
            <PayrollRunDetailPage />
          </ErrorBoundary>
        } />
        <Route path="/payroll/:id" element={
          <ErrorBoundary>
            <PayrollDetailPage />
          </ErrorBoundary>
        } />
        <Route path="/payroll/:id/edit" element={
          <ErrorBoundary>
            <PayrollDetailPage />
          </ErrorBoundary>
        } />

        {/* Journal routes */}
        <Route path="/journal" element={
          <ErrorBoundary>
            <JournalEntriesPage />
          </ErrorBoundary>
        } />
        <Route path="/journal/new" element={
          <ErrorBoundary>
            <JournalEntryFormPage />
          </ErrorBoundary>
        } />
        <Route path="/journal/trial-balance" element={
          <ErrorBoundary>
            <TrialBalancePage />
          </ErrorBoundary>
        } />
        <Route path="/journal/general-ledger" element={
          <ErrorBoundary>
            <GeneralLedgerPage />
          </ErrorBoundary>
        } />
        <Route path="/journal/:id" element={
          <ErrorBoundary>
            <JournalEntryDetailPage />
          </ErrorBoundary>
        } />

        {/* Reports routes */}
        <Route path="/reports/profit-loss" element={
          <ErrorBoundary>
            <ProfitLossPage />
          </ErrorBoundary>
        } />
        <Route path="/reports/balance-sheet" element={
          <ErrorBoundary>
            <BalanceSheetPage />
          </ErrorBoundary>
        } />
        <Route path="/reports/cash-flow" element={
          <ErrorBoundary>
            <CashFlowPage />
          </ErrorBoundary>
        } />
        <Route path="/reports/financial-ratios" element={
          <ErrorBoundary>
            <FinancialRatiosPage />
          </ErrorBoundary>
        } />
        <Route path="/reports" element={
          <ErrorBoundary>
            <ReportsHubPage />
          </ErrorBoundary>
        } />
        <Route path="/reports/daily" element={
          <ErrorBoundary>
            <DailyReportsPage />
          </ErrorBoundary>
        } />
        <Route path="/reports/daily/sales" element={<ErrorBoundary><DailySalesReportPage /></ErrorBoundary>} />
        <Route path="/reports/daily/purchases" element={<ErrorBoundary><DailyPurchasesReportPage /></ErrorBoundary>} />
        <Route path="/reports/daily/cash" element={<ErrorBoundary><DailyCashPositionReportPage /></ErrorBoundary>} />
        <Route path="/reports/daily/stock" element={<ErrorBoundary><DailyStockMovementReportPage /></ErrorBoundary>} />
        <Route path="/reports/daily/ar" element={<ErrorBoundary><DailyARActivityReportPage /></ErrorBoundary>} />
        <Route path="/reports/daily/ap" element={<ErrorBoundary><DailyAPActivityReportPage /></ErrorBoundary>} />
        <Route path="/reports/daily/journal" element={<ErrorBoundary><DailyJournalEntriesReportPage /></ErrorBoundary>} />
        <Route path="/reports/daily/tax" element={<ErrorBoundary><DailyTaxCollectedReportPage /></ErrorBoundary>} />
        <Route path="/reports/weekly" element={<ErrorBoundary><WeeklyReportsPage /></ErrorBoundary>} />
        <Route path="/reports/weekly/sales-performance" element={<ErrorBoundary><WeeklySalesPerformanceReportPage /></ErrorBoundary>} />
        <Route path="/reports/weekly/inventory-reorder" element={<ErrorBoundary><WeeklyInventoryReorderReportPage /></ErrorBoundary>} />
        <Route path="/reports/weekly/supplier-performance" element={<ErrorBoundary><WeeklySupplierPerformanceReportPage /></ErrorBoundary>} />
        <Route path="/reports/weekly/receivables-aging" element={<ErrorBoundary><WeeklyReceivablesAgingReportPage /></ErrorBoundary>} />
        <Route path="/reports/weekly/payables-aging" element={<ErrorBoundary><WeeklyPayablesAgingReportPage /></ErrorBoundary>} />
        <Route path="/reports/weekly/cash-flow" element={<ErrorBoundary><WeeklyCashFlowReportPage /></ErrorBoundary>} />
        <Route path="/reports/weekly/payroll-preview" element={<ErrorBoundary><WeeklyPayrollPreviewReportPage /></ErrorBoundary>} />
        {/* Monthly Reports */}
        <Route path="/reports/monthly" element={<ErrorBoundary><MonthlyReportsPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/profit-loss" element={<ErrorBoundary><MonthlyPLReportPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/balance-sheet" element={<ErrorBoundary><MonthlyBalanceSheetPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/trial-balance" element={<ErrorBoundary><MonthlyTrialBalancePage /></ErrorBoundary>} />
        <Route path="/reports/monthly/cash-flow" element={<ErrorBoundary><MonthlyCashFlowPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/stock-valuation" element={<ErrorBoundary><MonthlyStockValuationPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/sales-by-customer" element={<ErrorBoundary><MonthlySalesByCustomerPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/sales-by-category" element={<ErrorBoundary><MonthlySalesByCategoryPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/purchases-by-supplier" element={<ErrorBoundary><MonthlyPurchasesBySupplierPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/ar-aging" element={<ErrorBoundary><MonthlyARAgingPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/ap-aging" element={<ErrorBoundary><MonthlyAPAgingPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/payroll-summary" element={<ErrorBoundary><MonthlyPayrollSummaryPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/vat-return" element={<ErrorBoundary><MonthlyVATReturnPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/bank-reconciliation" element={<ErrorBoundary><MonthlyBankReconciliationPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/budget-vs-actual" element={<ErrorBoundary><MonthlyBudgetVsActualPage /></ErrorBoundary>} />
        <Route path="/reports/monthly/general-ledger" element={<ErrorBoundary><MonthlyGeneralLedgerPage /></ErrorBoundary>} />
        <Route path="/periods" element={
          <ErrorBoundary>
            <AccountingPeriodsPage />
          </ErrorBoundary>
        } />
        <Route path="/company-settings" element={
          <ErrorBoundary>
            <CompanyProfilePage />
          </ErrorBoundary>
        } />
        <Route path="/roles" element={
          <ErrorBoundary>
            <RolesSettingsPage />
          </ErrorBoundary>
        } />

        {/* Products routes - debug: direct access without auth check */}
        <Route path="/products-debug" element={
          <ErrorBoundary>
            <ProductsListPage />
          </ErrorBoundary>
        } />
        <Route path="/products" element={
          <ErrorBoundary>
            <ProductsListPageWrapper />
          </ErrorBoundary>
        } />
        <Route path="/products/new" element={<ProductFormPage />} />
        <Route path="/products/:id/edit" element={<ProductFormPage />} />
        <Route path="/products/:id" element={
          <ErrorBoundary>
            <ProductDetailPageWrapper />
          </ErrorBoundary>
        } />
        
        {/* 404 fallback */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <CurrencyProvider>
                <ChatBot />
                <Toaster position="top-right" richColors />
                <AppRoutes />
              </CurrencyProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
