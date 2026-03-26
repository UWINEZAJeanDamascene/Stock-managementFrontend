import { BrowserRouter, Routes, Route } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import HomePage from './pages/landing/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import CompanySelectorPage from './pages/auth/CompanySelectorPage';
import DashboardPage from './pages/DashboardPage';
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
import AuditsListPage from './pages/AuditsListPage';
import AuditDetailPage from './pages/AuditDetailPage';
import AuditCreatePage from './pages/AuditCreatePage';
import BatchesPage from './pages/BatchesPage';
import PurchaseOrdersListPage from './pages/purchases/PurchaseOrdersListPage';
import PurchaseOrderFormPage from './pages/purchases/PurchaseOrderFormPage';
import PurchaseOrderDetailPage from './pages/purchases/PurchaseOrderDetailPage';
import GRNListPage from './pages/grn/GRNListPage';
import GRNCreatePage from './pages/grn/GRNCreatePage';
import GRNDetailPage from './pages/grn/GRNDetailPage';
import PurchaseReturnsListPage from './pages/purchase-returns/PurchaseReturnsListPage';
import PurchaseReturnCreatePage from './pages/purchase-returns/PurchaseReturnCreatePage';
import ClientsListPage from './pages/clients/ClientsListPage';
import ClientFormPage from './pages/clients/ClientFormPage';
import ClientDetailPage from './pages/clients/ClientDetailPage';
import QuotationsListPage from './pages/quotations/QuotationsListPage';
import QuotationFormPage from './pages/quotations/QuotationFormPage';
import InvoicesListPage from './pages/invoices/InvoicesListPage';
import InvoiceFormPage from './pages/invoices/InvoiceFormPage';
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage';
import DeliveryNotesListPage from './pages/delivery-notes/DeliveryNotesListPage';
import DeliveryNoteCreatePage from './pages/delivery-notes/DeliveryNoteCreatePage';
import CreditNotesListPage from './pages/credit-notes/CreditNotesListPage';
import CreditNoteCreatePage from './pages/credit-notes/CreditNoteCreatePage';
import RecurringInvoicesListPage from './pages/recurring-invoices/RecurringInvoicesListPage';
import ARReceiptsListPage from './pages/ar/ARReceiptsListPage';
import ARReceiptCreatePage from './pages/ar/ARReceiptCreatePage';
import APPaymentsListPage from './pages/ap/APPaymentsListPage';
import APPaymentCreatePage from './pages/ap/APPaymentCreatePage';
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
import ExpensesListPage from './pages/expenses/ExpensesListPage';
import ExpenseDetailPage from './pages/expenses/ExpenseDetailPage';
import ExpenseFormPage from './pages/expenses/ExpenseFormPage';
import ARAgingPage from './pages/ar/ARAgingPage';
import { LanguageProvider } from '@/contexts/LanguageContext';
import ChatBot from './components/ChatBot';
import OfflineSyncBanner from './components/OfflineSyncBanner';

// Wrapper component with logging to debug Products page issue
function ProductsListPageWrapper() {
  const { isAuthenticated, loading } = useAuth();
  console.log('[ProductsListPageWrapper] Rendering, isAuthenticated:', isAuthenticated, 'loading:', loading);
  
  // Debug: show what's happening
  if (loading) {
    return <div style={{padding: 20, textAlign: 'center', background: '#fff'}}>
      <div>🔄 Checking authentication...</div>
    </div>;
  }
  
  if (!isAuthenticated) {
    console.log('[ProductsListPageWrapper] User not authenticated - showing message');
    return <div style={{padding: 20, textAlign: 'center', background: '#fff'}}>
      <div>🔐 Please log in to view products</div>
      <div style={{fontSize: 12, color: '#666', marginTop: 10}}>
        (isAuthenticated={String(isAuthenticated)}, loading={String(loading)})
      </div>
    </div>;
  }
  
  console.log('[ProductsListPageWrapper] User authenticated, rendering ProductsListPage');
  try {
    return <ProductsListPage />;
  } catch (err) {
    console.error('[ProductsListPageWrapper] RENDER ERROR:', err);
    return <div style={{padding: 20, color: 'red', background: '#fff'}}>ERROR in ProductsListPage: {String(err)}</div>;
  }
}

// Wrapper component with logging to debug ProductDetailPage issue
function ProductDetailPageWrapper() {
  const { isAuthenticated, loading } = useAuth();
  console.log('[ProductDetailPageWrapper] Rendering, isAuthenticated:', isAuthenticated, 'loading:', loading);
  
  // Debug: show what's happening
  if (loading) {
    return <div style={{padding: 20, textAlign: 'center', background: '#fff'}}>
      <div>🔄 Checking authentication...</div>
    </div>;
  }
  
  if (!isAuthenticated) {
    console.log('[ProductDetailPageWrapper] User not authenticated - showing message');
    return <div style={{padding: 20, textAlign: 'center', background: '#fff'}}>
      <div>🔐 Please log in to view product details</div>
      <div style={{fontSize: 12, color: '#666', marginTop: 10}}>
        (isAuthenticated={String(isAuthenticated)}, loading={String(loading)})
      </div>
    </div>;
  }
  
  console.log('[ProductDetailPageWrapper] User authenticated, rendering ProductDetailPage');
  try {
    return <ProductDetailPage />;
  } catch (err) {
    console.error('[ProductDetailPageWrapper] RENDER ERROR:', err);
    return <div style={{padding: 20, color: 'red', background: '#fff'}}>ERROR in ProductDetailPage: {String(err)}</div>;
  }
}

// Wrapper component with logging to debug GRNListPage issue
function GRNListPageWrapper() {
  const { isAuthenticated, loading } = useAuth();
  console.log('[GRNListPageWrapper] Rendering, isAuthenticated:', isAuthenticated, 'loading:', loading);
  
  // Debug: show what's happening
  if (loading) {
    return <div style={{padding: 20, textAlign: 'center', background: '#fff'}}>
      <div>🔄 Checking authentication...</div>
    </div>;
  }
  
  if (!isAuthenticated) {
    console.log('[GRNListPageWrapper] User not authenticated - showing message');
    return <div style={{padding: 20, textAlign: 'center', background: '#fff'}}>
      <div>🔐 Please log in to view GRN</div>
      <div style={{fontSize: 12, color: '#666', marginTop: 10}}>
        (isAuthenticated={String(isAuthenticated)}, loading={String(loading)})
      </div>
    </div>;
  }
  
  console.log('[GRNListPageWrapper] User authenticated, rendering GRNListPage');
  try {
    return <GRNListPage />;
  } catch (err) {
    console.error('[GRNListPageWrapper] RENDER ERROR:', err);
    return <div style={{padding: 20, color: 'red', background: '#fff'}}>ERROR in GRNListPage: {String(err)}</div>;
  }
}

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
        <Route path="/dashboard" element={<DashboardPage />} />
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
        <Route path="/stock-audits" element={<AuditsListPage />} />
        <Route path="/stock-audits/new" element={<AuditCreatePage />} />
        <Route path="/stock-audits/:id" element={<AuditDetailPage />} />
        <Route path="/batches" element={<BatchesPage />} />
        <Route path="/purchase-orders" element={<PurchaseOrdersListPage />} />
        <Route path="/purchase-orders/new" element={<PurchaseOrderFormPage />} />
        <Route path="/purchase-orders/:id/edit" element={<PurchaseOrderFormPage />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
        <Route path="/grn" element={
          <ErrorBoundary>
            <GRNListPageWrapper />
          </ErrorBoundary>
        } />
        <Route path="/grn/new" element={<GRNCreatePage />} />
        <Route path="/grn/:id" element={<GRNDetailPage />} />
        <Route path="/purchase-returns" element={<PurchaseReturnsListPage />} />
        <Route path="/purchase-returns/new" element={<PurchaseReturnCreatePage />} />
        <Route path="/clients" element={<ClientsListPage />} />
        <Route path="/clients/new" element={<ClientFormPage />} />
        <Route path="/clients/:id/edit" element={<ClientFormPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/quotations" element={<QuotationsListPage />} />
        <Route path="/quotations/new" element={<QuotationFormPage />} />
        <Route path="/quotations/:id/edit" element={<QuotationFormPage />} />
        <Route path="/quotations/:id" element={<QuotationFormPage />} />
        <Route path="/invoices" element={<InvoicesListPage />} />
        <Route path="/invoices/new" element={<InvoiceFormPage />} />
        <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/delivery-notes" element={<DeliveryNotesListPage />} />
        <Route path="/delivery-notes/new" element={<DeliveryNoteCreatePage />} />
        <Route path="/delivery-notes/:id/edit" element={<DeliveryNoteCreatePage />} />
        <Route path="/delivery-notes/:id" element={<DeliveryNotesListPage />} />
        <Route path="/credit-notes" element={<CreditNotesListPage />} />
        <Route path="/credit-notes/new" element={<CreditNoteCreatePage />} />
        <Route path="/credit-notes/:id/edit" element={<CreditNoteCreatePage />} />
        <Route path="/credit-notes/:id" element={<CreditNotesListPage />} />
        <Route path="/recurring-invoices" element={<RecurringInvoicesListPage />} />
        <Route path="/recurring-invoices/new" element={<RecurringInvoicesListPage />} />
        <Route path="/recurring-invoices/:id/edit" element={<RecurringInvoicesListPage />} />
        <Route path="/recurring-invoices/:id" element={<RecurringInvoicesListPage />} />
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
            <ARReceiptCreatePage />
          </ErrorBoundary>
        } />
        {/* AR Aging */}
        <Route path="/ar-aging" element={
          <ErrorBoundary>
            <ARAgingPage />
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
            <APPaymentCreatePage />
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
        {/* Expenses */}
        <Route path="/expenses" element={
          <ErrorBoundary>
            <ExpensesListPage />
          </ErrorBoundary>
        } />
        <Route path="/expenses/new" element={
          <ErrorBoundary>
            <ExpenseFormPage />
          </ErrorBoundary>
        } />
        <Route path="/expenses/:id" element={
          <ErrorBoundary>
            <ExpenseDetailPage />
          </ErrorBoundary>
        } />
        <Route path="/expenses/:id/edit" element={
          <ErrorBoundary>
            <ExpenseFormPage />
          </ErrorBoundary>
        } />
        <Route path="/bulk-data" element={<BulkDataPage />} />
        <Route path="/audit-trail" element={<AuditTrailPage />} />
        <Route path="/platform-admin" element={<PlatformAdminPage />} />
        
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
        <Route path="*" element={
          <>
            {console.log('[App] Wildcard route matched - 404 fallback showing HomePage')}
            <HomePage />
          </>
        } />
      </Routes>
    </>
  );
}

console.log('[App] App component rendering');

export default function App() {
  console.log('[App] App function called');
  
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <CurrencyProvider>
              <ChatBot />
              <AppRoutes />
            </CurrencyProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
