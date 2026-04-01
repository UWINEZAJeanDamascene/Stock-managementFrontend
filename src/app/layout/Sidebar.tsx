import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { 
  Users, 
  Lock,
  Bell,
  Settings2,
  HardDrive,
  Blocks,
  Star,
  FileSpreadsheet,
  History,
  Languages,
  LogOut,
  Settings,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Warehouse,
  Package,
  FolderTree,
  WarehouseIcon,
  BarChart3,
  ArrowRightLeft,
  ClipboardCheck,
  Boxes,
  ShoppingCart,
  Truck,
  FileText,
  Wallet,
  Receipt,
  BookOpen,
  DollarSign,
  Play,
  PieChart,
  TrendingUp,
  Scale,
  Waves,
  Gauge,
  Calendar,
  Building2,
  Shield,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import CurrencySelector from '../components/CurrencySelector';
import { cn } from '../components/ui/utils';
import { Button } from '@/app/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import authService from '@/services/authService';

// Navigation sections with groups
interface NavSection {
  title?: string;
  items: NavItem[];
}

interface NavItem {
  nameKey: string;
  href: string;
  icon: React.ElementType;
  permission: string;
  disabled?: boolean;
}

const systemNav: NavSection = {
  title: 'nav.sectionSystem',
  items: [
    { nameKey: 'nav.products', href: '/products', icon: Package, permission: 'products:read' as const },
    { nameKey: 'nav.userManagement', href: '/users', icon: Users, permission: 'users:read' as const },
    { nameKey: 'nav.security', href: '/security', icon: Lock, permission: 'users:read' as const },
    { nameKey: 'nav.notificationsInbox', href: '/notifications/list', icon: Bell, permission: 'users:read' as const },
    { nameKey: 'nav.notificationSettings', href: '/notifications', icon: Settings2, permission: 'users:read' as const },
    { nameKey: 'nav.backupRestore', href: '/backups', icon: HardDrive, permission: 'users:read' as const },
    { nameKey: 'nav.departments', href: '/departments', icon: Blocks, permission: 'users:read' as const },
    { nameKey: 'nav.categories', href: '/categories', icon: FolderTree, permission: 'categories:read' as const },
    { nameKey: 'nav.warehouses', href: '/warehouses', icon: WarehouseIcon, permission: 'stock:read' as const },
    { nameKey: 'nav.stockLevels', href: '/stock-levels', icon: BarChart3, permission: 'stock:read' as const },
    { nameKey: 'nav.inventoryDashboard', href: '/dashboard/inventory', icon: LayoutDashboard, permission: 'stock:read' as const },
    { nameKey: 'nav.salesDashboard', href: '/dashboard/sales', icon: TrendingUp, permission: 'stock:read' as const },
    { nameKey: 'nav.purchaseDashboard', href: '/dashboard/purchases', icon: ShoppingCart, permission: 'stock:read' as const },
    { nameKey: 'nav.financeDashboard', href: '/dashboard/finance', icon: DollarSign, permission: 'stock:read' as const },
    { nameKey: 'nav.stockMovements', href: '/stock-movements', icon: ArrowRightLeft, permission: 'stock:read' as const },
    { nameKey: 'nav.stockTransfers', href: '/stock-transfers', icon: ArrowRightLeft, permission: 'stock:read' as const },
    { nameKey: 'nav.stockAudits', href: '/stock-audits', icon: ClipboardCheck, permission: 'stock:read' as const },
    { nameKey: 'nav.batches', href: '/batches', icon: Boxes, permission: 'stock:read' as const },
    { nameKey: 'nav.purchaseOrders', href: '/purchase-orders', icon: ShoppingCart, permission: 'stock:read' as const },
    { nameKey: 'nav.grn', href: '/grn', icon: Truck, permission: 'stock:read' as const },
    { nameKey: 'nav.purchaseReturns', href: '/purchase-returns', icon: Truck, permission: 'stock:read' as const },
    { nameKey: 'nav.suppliers', href: '/suppliers', icon: Building2, permission: 'stock:read' as const },
    { nameKey: 'nav.clients', href: '/clients', icon: ShoppingCart, permission: 'stock:read' as const },
    { nameKey: 'nav.quotations', href: '/quotations', icon: FileText, permission: 'stock:read' as const },
    { nameKey: 'nav.invoices', href: '/invoices', icon: FileText, permission: 'stock:read' as const },
    { nameKey: 'nav.deliveryNotes', href: '/delivery-notes', icon: Truck, permission: 'stock:read' as const },
    { nameKey: 'nav.creditNotes', href: '/credit-notes', icon: FileText, permission: 'stock:read' as const },
    { nameKey: 'nav.recurringInvoices', href: '/recurring-invoices', icon: FileText, permission: 'stock:read' as const },
    { nameKey: 'nav.arReceipts', href: '/ar-receipts', icon: FileText, permission: 'stock:read' as const },
    { nameKey: 'nav.arAging', href: '/ar-aging', icon: FileText, permission: 'stock:read' as const },
    { nameKey: 'nav.apPayments', href: '/ap-payments', icon: FileText, permission: 'stock:read' as const },
    { nameKey: 'nav.bankAccounts', href: '/bank-accounts', icon: FileText, permission: 'stock:read' as const },
    { nameKey: 'nav.chartOfAccounts', href: '/chart-of-accounts', icon: BookOpen, permission: 'stock:read' as const },
    { nameKey: 'nav.journalEntries', href: '/journal', icon: BookOpen, permission: 'stock:read' as const },
    { nameKey: 'nav.pettyCash', href: '/petty-cash', icon: Wallet, permission: 'stock:read' as const },
    { nameKey: 'nav.fixedAssets', href: '/assets', icon: HardDrive, permission: 'stock:read' as const },
    { nameKey: 'nav.liabilities', href: '/liabilities', icon: HardDrive, permission: 'stock:read' as const },
    { nameKey: 'nav.expenses', href: '/expenses', icon: Receipt, permission: 'stock:read' as const },
    { nameKey: 'nav.budgets', href: '/budgets', icon: PieChart, permission: 'stock:read' as const },
    { nameKey: 'nav.payroll', href: '/payroll', icon: DollarSign, permission: 'stock:read' as const },
    { nameKey: 'payroll.payrollRuns', href: '/payroll-runs', icon: Play, permission: 'stock:read' as const },
    { nameKey: 'nav.taxes', href: '/taxes', icon: DollarSign, permission: 'stock:read' as const },
    { nameKey: 'nav.profitLoss', href: '/reports/profit-loss', icon: TrendingUp, permission: 'stock:read' as const },
    { nameKey: 'nav.balanceSheet', href: '/reports/balance-sheet', icon: Scale, permission: 'stock:read' as const },
    { nameKey: 'nav.cashFlow', href: '/reports/cash-flow', icon: Waves, permission: 'stock:read' as const },
    { nameKey: 'nav.financialRatios', href: '/reports/financial-ratios', icon: Gauge, permission: 'stock:read' as const },
    { nameKey: 'nav.accountingPeriods', href: '/periods', icon: Calendar, permission: 'stock:read' as const },
    { nameKey: 'nav.companySettings', href: '/company-settings', icon: Building2, permission: 'stock:read' as const },
    { nameKey: 'nav.rolesPage', href: '/roles', icon: Shield, permission: 'users:read' as const },
    { nameKey: 'nav.bulkData', href: '/bulk-data', icon: FileSpreadsheet, permission: 'products:read' as const },
    { nameKey: 'nav.auditTrail', href: '/audit-trail', icon: History, permission: 'users:read' as const },
    { nameKey: 'nav.testimonials', href: '/testimonials', icon: Star, permission: 'users:read' as const },
  ]
};

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission: checkPermission } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // Backend logout failed, continue with local cleanup
    }
    logout();
    setLoggingOut(false);
    navigate('/login', { replace: true });
  };

  // Filter navigation items by permission
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterByPermission = (items: NavItem[]) => items.filter(item => checkPermission(item.permission as any));

  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  const renderNavItem = (item: NavItem, isActive: boolean, isDisabled?: boolean) => {
    if (isDisabled) {
      return (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-2 text-xs md:text-sm md:px-3 md:py-2.5 font-medium transition-colors cursor-not-allowed opacity-50",
            collapsed && "justify-center px-2 py-2",
            'text-slate-500'
          )}
        >
          <item.icon className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
          {!collapsed && t(item.nameKey)}
        </div>
      );
    }

    return (
      <Link
        to={item.href}
        onClick={handleNavigate}
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-2 text-xs md:text-sm md:px-3 md:py-2.5 font-medium transition-colors",
          collapsed && "justify-center px-2 py-2",
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        )}
      >
        <item.icon className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
        {!collapsed && t(item.nameKey)}
      </Link>
    );
  };

  const renderSection = (section: NavSection) => {
    const filteredItems = filterByPermission(section.items);
    if (filteredItems.length === 0) return null;

    return (
      <div className="mb-4">
        {!collapsed && section.title && (
          <div className="px-2 md:px-3 mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t(section.title)}
            </span>
          </div>
        )}
        {collapsed && section.title && (
          <div className="flex justify-center py-2">
            <div className="h-px bg-slate-700 w-8"></div>
          </div>
        )}
        <ul className={cn("space-y-0.5 md:space-y-1", collapsed && "space-y-1")}>
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            const isDisabled = (item as any).disabled;
            return (
              <li key={item.nameKey}>
                {renderNavItem(item, isActive, isDisabled)}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className={cn("flex h-screen flex-col bg-slate-900", collapsed ? "w-16" : "w-64")}>
      {/* Logo */}
      <div className={cn("flex h-16 items-center justify-between gap-2 border-b border-slate-800", collapsed ? "px-1 justify-center" : "px-2")}>
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
            <Warehouse className="h-5 w-5 text-white" />
          </div>
          {!collapsed && <span className="text-lg font-semibold text-white hidden sm:inline">StockManager</span>}
        </div>
        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          )}
          {onNavigate && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigate}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-1" : "px-2 md:px-3 md:py-4")}>
        {/* SYSTEM */}
        {renderSection(systemNav)}
      </nav>

      {/* Language Selector */}
      <div className={cn("border-t border-slate-800", collapsed ? "px-1 py-2" : "px-2 md:px-3 py-2")}>
        {collapsed ? (
          <button
            onClick={toggleLanguage}
            title={language === 'en' ? 'Passer en Français' : 'Switch to English'}
            className="flex w-full items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Languages className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={toggleLanguage}
            title={language === 'en' ? 'Passer en Français' : 'Switch to English'}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs md:text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Languages className="h-4 w-4 flex-shrink-0" />
            <span>{language === 'en' ? 'Français' : 'English'}</span>
            <span className="ml-auto text-xs bg-indigo-600 text-white rounded px-1.5 py-0.5 font-semibold">
              {language.toUpperCase()}
            </span>
          </button>
        )}
      </div>

      {/* Currency Selector - just above user section */}
      {!collapsed && (
        <div className="border-t border-slate-800 px-2 md:px-3 py-2">
          <CurrencySelector />
        </div>
      )}

      {/* User section */}
      <div className={cn("border-t border-slate-800", collapsed ? "p-1" : "p-2 md:p-4")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-medium" title={user?.name || 'User'}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex gap-1">
              <Link
                to="/company-settings"
                onClick={handleNavigate}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={t('nav.settings')}
              >
                <Settings className="h-3.5 w-3.5" />
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="flex items-center justify-center rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
                    title={t('nav.logout')}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('nav.logoutConfirmTitle', 'Sign out')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('nav.logoutConfirmDesc', 'Are you sure you want to sign out? Any unsaved changes will be lost.')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {loggingOut ? t('nav.signingOut', 'Signing out...') : t('nav.logout', 'Sign out')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2 md:mb-3 md:gap-3">
              <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-white">{user?.name || 'User'}</p>
                <p className="truncate text-xs text-slate-400">{user?.email || ''}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to="/company-settings"
                onClick={handleNavigate}
                className="flex flex-1 items-center justify-center gap-1 md:gap-2 rounded-lg bg-slate-800 px-2 py-2 text-xs md:text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.settings')}</span>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="flex items-center justify-center rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
                    title={t('nav.logout')}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('nav.logoutConfirmTitle', 'Sign out')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('nav.logoutConfirmDesc', 'Are you sure you want to sign out? Any unsaved changes will be lost.')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {loggingOut ? t('nav.signingOut', 'Signing out...') : t('nav.logout', 'Sign out')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
