import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/landing/HomePage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import PosPage from './pages/PosPage';
import CategoriesPage from './pages/CategoriesPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import SuppliersPage from './pages/SuppliersPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import StockPage from './pages/StockPage';
import WarehousesPage from './pages/WarehousesPage';
import TransfersPage from './pages/TransfersPage';
import AuditsPage from './pages/AuditsPage';
import ReorderPointsPage from './pages/ReorderPointsPage';
import BatchesPage from './pages/BatchesPage';
import SerialNumbersPage from './pages/SerialNumbersPage';
import InvoicesPage from './pages/InvoicesPage';
import PurchasesPage from './pages/PurchasesPage';
import AccountsPayablePage from './pages/AccountsPayablePage';
import AccountsReceivablePage from './pages/AccountsReceivablePage';
import QuotationsPage from './pages/QuotationsPage';
import DeliveryNotesPage from './pages/DeliveryNotesPage';
import UsersPage from './pages/UsersPage';
import AccessControlPage from './pages/AccessControlPage';
import PlatformAdminPage from './pages/PlatformAdminPage';
import RolesPage from './pages/RolesPage';
import SecurityPage from './pages/SecurityPage';
import RecurringInvoicesPage from './pages/RecurringInvoicesPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import CreditNotesPage from './pages/CreditNotesPage';
import ReportsPage from './pages/ReportsPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import BackupPage from './pages/BackupPage';
import FixedAssetsPage from './pages/FixedAssetsPage';
import LoansPage from './pages/LoansPage';
import BudgetsPage from './pages/BudgetsPage';
import PayrollPage from './pages/PayrollPage';
import TaxPage from './pages/TaxPage';
import ExpensesPage from './pages/ExpensesPage';
import PettyCashPage from './pages/PettyCashPage';
import BankAccountsPage from './pages/BankAccountsPage';
import PurchaseReturnsPage from './pages/PurchaseReturnsPage';
import TestimonialsPage from './pages/TestimonialsPage';
import TrialBalancePage from './pages/TrialBalancePage';
import GeneralLedgerPage from './pages/GeneralLedgerPage';
import JournalEntriesPage from './pages/JournalEntriesPage';
import BankHubPage from './pages/BankHubPage';
import DepartmentsPage from './pages/DepartmentsPage';
import BulkDataPage from './pages/BulkDataPage';
import AuditTrailPage from './pages/AuditTrailPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageProvider } from '@/contexts/LanguageContext';
import ChatBot from './components/ChatBot';
import OfflineSyncBanner from './components/OfflineSyncBanner';
import { Layout } from './layout/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated, user, loading } = useAuth();
  
  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  const isPlatformAdmin = user?.role === 'platform_admin';
  
  // Redirect platform admins to platform admin page
  if (isAuthenticated && isPlatformAdmin) {
    return (
      <Routes>
        <Route path="/login" element={<Navigate to="/platform" />} />
        <Route
          path="/platform"
          element={
            <ProtectedRoute>
              <PlatformAdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/platform" />} />
      </Routes>
    );
  }
  
  return (
    <>
      {isAuthenticated && !isPlatformAdmin && <ChatBot />}
      {isAuthenticated && <OfflineSyncBanner />}
      <Routes>
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <HomePage />} 
        />
      {/* Public landing route accessible even when authenticated */}
      <Route path="/home" element={<HomePage />} />
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} 
      />
      <Route 
        path="/register" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} 
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <PosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/categories"
        element={
          <ProtectedRoute>
            <CategoriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <ProtectedRoute>
            <ClientDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <ClientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers/:id"
        element={
          <ProtectedRoute>
            <SupplierDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <ProtectedRoute>
            <SuppliersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <StockPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/warehouses"
        element={
          <ProtectedRoute>
            <WarehousesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfers"
        element={
          <ProtectedRoute>
            <TransfersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audits"
        element={
          <ProtectedRoute>
            <AuditsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reorder-points"
        element={
          <ProtectedRoute>
            <ReorderPointsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/batches"
        element={
          <ProtectedRoute>
            <BatchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/serial-numbers"
        element={
          <ProtectedRoute>
            <SerialNumbersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute>
            <InvoicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/recurring-invoices"
        element={
          <ProtectedRoute>
            <RecurringInvoicesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/credit-notes"
        element={
          <ProtectedRoute>
            <CreditNotesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscriptions"
        element={
          <ProtectedRoute>
            <SubscriptionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchases"
        element={
          <ProtectedRoute>
            <PurchasesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounts-payable"
        element={
          <ProtectedRoute>
            <AccountsPayablePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounts-receivable"
        element={
          <ProtectedRoute>
            <AccountsReceivablePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quotations"
        element={
          <ProtectedRoute>
            <QuotationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delivery-notes"
        element={
          <ProtectedRoute>
            <DeliveryNotesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/access-control"
        element={
          <ProtectedRoute>
            <AccessControlPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute>
            <RolesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/security"
        element={
          <ProtectedRoute>
            <SecurityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/list"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backups"
        element={
          <ProtectedRoute>
            <BackupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute>
            <FixedAssetsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/liabilities"
        element={
          <ProtectedRoute>
            <LoansPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/budgets"
        element={
          <ProtectedRoute>
            <BudgetsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll"
        element={
          <ProtectedRoute>
            <PayrollPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/taxes"
        element={
          <ProtectedRoute>
            <TaxPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <ExpensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petty-cash"
        element={
          <ProtectedRoute>
            <PettyCashPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank-accounts"
        element={
          <ProtectedRoute>
            <BankAccountsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-returns"
        element={
          <ProtectedRoute>
            <ErrorBoundary>
              <PurchaseReturnsPage />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/testimonials"
        element={
          <ProtectedRoute>
            <TestimonialsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trial-balance"
        element={
          <ProtectedRoute>
            <Layout>
              <TrialBalancePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/general-ledger"
        element={
          <ProtectedRoute>
            <Layout>
              <GeneralLedgerPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/journal-entries"
        element={
          <ProtectedRoute>
            <Layout>
              <JournalEntriesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank-hub"
        element={
          <ProtectedRoute>
            <Layout>
              <BankHubPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute>
            <DepartmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bulk-data"
        element={
          <ProtectedRoute>
            <BulkDataPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-trail"
        element={
          <ProtectedRoute>
            <AuditTrailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <AppRoutes />
            </CurrencyProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
