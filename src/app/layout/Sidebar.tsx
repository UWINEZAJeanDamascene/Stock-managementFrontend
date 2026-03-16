import { Link, useLocation } from 'react-router';
import { 
  LayoutDashboard, 
  Package,
  Box,
  Tags, 
  Truck, 
  Users, 
  Warehouse, 
  FileText, 
  ShoppingCart,
  Quote, 
  BarChart3,
  Settings,
  LogOut,
  X,
  UserCog,
  ArrowRight,
  ArrowLeftRight,
  ClipboardCheck,
  RefreshCw,
  MapPin,
  Hash,
  Repeat,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingBag,
  Shield,
  Lock,
  Bell,
  Database,
  Building,
  Building2,
  Banknote,
  Calculator,
  Receipt,
  Languages,
  MessageSquare,
  FileSpreadsheet,
  History,
  ShoppingBasket,
  Undo2,
  User,
  Key,
  Settings2,
  HardDrive,
  Blocks,
  Star,
  Bot,
  FileCheck,
  Scale,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import CurrencySelector from '../components/CurrencySelector';
import { cn } from '../components/ui/utils';
import { Button } from '@/app/components/ui/button';

// Navigation sections with groups
interface NavSection {
  title?: string;
  items: NavItem[];
}

const mainNav: NavSection = {
  items: [
    { nameKey: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:read' as const },
  ]
};

const inventoryNav: NavSection = {
  title: 'nav.sectionInventory',
  items: [
    { nameKey: 'nav.products', href: '/products', icon: Package, permission: 'products:read' as const },
    { nameKey: 'nav.categories', href: '/categories', icon: Tags, permission: 'categories:read' as const },
    { nameKey: 'nav.stock', href: '/stock', icon: Warehouse, permission: 'stock:read' as const },
    { nameKey: 'nav.warehouses', href: '/warehouses', icon: MapPin, permission: 'stock:read' as const },
    { nameKey: 'nav.transfers', href: '/transfers', icon: ArrowLeftRight, permission: 'stock:read' as const },
    { nameKey: 'nav.batches', href: '/batches', icon: Box, permission: 'stock:read' as const },
    { nameKey: 'nav.serialNumbers', href: '/serial-numbers', icon: Hash, permission: 'stock:read' as const },
    { nameKey: 'nav.audits', href: '/audits', icon: ClipboardCheck, permission: 'stock:read' as const },
    { nameKey: 'nav.reorderPoints', href: '/reorder-points', icon: RefreshCw, permission: 'stock:read' as const },
  ]
};

const purchasingNav: NavSection = {
  title: 'nav.sectionPurchasing',
  items: [
    { nameKey: 'nav.purchases', href: '/purchases', icon: ShoppingCart, permission: 'purchases:read' as const },
    { nameKey: 'nav.purchaseReturns', href: '/purchase-returns', icon: Undo2, permission: 'purchases:create' as const },
  ]
};

const salesNav: NavSection = {
  title: 'nav.sectionSales',
  items: [
    { nameKey: 'nav.clients', href: '/clients', icon: Users, permission: 'clients:read' as const },
    { nameKey: 'nav.quotations', href: '/quotations', icon: Quote, permission: 'quotations:read' as const },
    { nameKey: 'nav.deliveryNotes', href: '/delivery-notes', icon: FileCheck, permission: 'quotations:read' as const },
    { nameKey: 'nav.invoices', href: '/invoices', icon: FileText, permission: 'invoices:read' as const },
    { nameKey: 'nav.creditNotes', href: '/credit-notes', icon: Receipt, permission: 'invoices:read' as const },
    { nameKey: 'nav.recurringInvoices', href: '/recurring-invoices', icon: Repeat, permission: 'invoices:read' as const },
    { nameKey: 'nav.subscriptions', href: '/subscriptions', icon: CreditCard, permission: 'invoices:read' as const },
  ]
};

const peopleNav: NavSection = {
  title: 'nav.sectionPeople',
  items: [
    { nameKey: 'nav.suppliers', href: '/suppliers', icon: Truck, permission: 'suppliers:read' as const },
  ]
};

const financeNav: NavSection = {
  title: 'nav.sectionFinance',
  items: [
    { nameKey: 'nav.bankAccounts', href: '/bank-accounts', icon: Building2, permission: 'invoices:create' as const },
    { nameKey: 'nav.accountsPayable', href: '/accounts-payable', icon: CreditCard, permission: 'purchases:read' as const },
    { nameKey: 'nav.accountsReceivable', href: '/accounts-receivable', icon: CreditCard, permission: 'invoices:read' as const },
    { nameKey: 'nav.expenses', href: '/expenses', icon: Receipt, permission: 'invoices:create' as const },
    { nameKey: 'nav.pettyCash', href: '/petty-cash', icon: Calculator, permission: 'invoices:create' as const },
    { nameKey: 'nav.assets', href: '/assets', icon: Building, permission: 'reports:read' as const },
    { nameKey: 'nav.liabilities', href: '/liabilities', icon: Banknote, permission: 'reports:read' as const },
    { nameKey: 'nav.budgets', href: '/budgets', icon: Calculator, permission: 'reports:read' as const },
    { nameKey: 'nav.payroll', href: '/payroll', icon: Calculator, permission: 'reports:read' as const },
    { nameKey: 'nav.taxes', href: '/taxes', icon: Receipt, permission: 'reports:read' as const },
    { nameKey: 'nav.reports', href: '/reports', icon: BarChart3, permission: 'reports:read' as const },
    { nameKey: 'nav.trialBalance', href: '/trial-balance', icon: Scale, permission: 'reports:read' as const },
    { nameKey: 'nav.generalLedger', href: '/general-ledger', icon: BookOpen, permission: 'reports:read' as const },
    { nameKey: 'nav.journalEntries', href: '/journal-entries', icon: FileSpreadsheet, permission: 'reports:read' as const },
  ]
};

const systemNav: NavSection = {
  title: 'nav.sectionSystem',
  items: [
    { nameKey: 'nav.bulkData', href: '/bulk-data', icon: FileSpreadsheet, permission: 'products:read' as const },
    { nameKey: 'nav.auditTrail', href: '/audit-trail', icon: History, permission: 'users:read' as const },
    { nameKey: 'nav.userManagement', href: '/users', icon: User, permission: 'users:read' as const },
    { nameKey: 'nav.roles', href: '/roles', icon: Key, permission: 'users:read' as const },
    { nameKey: 'nav.security', href: '/security', icon: Lock, permission: 'users:read' as const },
    { nameKey: 'nav.notificationsInbox', href: '/notifications/list', icon: Bell, permission: 'users:read' as const },
    { nameKey: 'nav.notificationSettings', href: '/notifications', icon: Settings2, permission: 'users:read' as const },
    { nameKey: 'nav.backupRestore', href: '/backups', icon: HardDrive, permission: 'users:read' as const },
    { nameKey: 'nav.departments', href: '/departments', icon: Blocks, permission: 'users:read' as const },
    { nameKey: 'nav.testimonials', href: '/testimonials', icon: Star, permission: 'users:read' as const },
  ]
};

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  nameKey: string;
  href: string;
  icon: React.ElementType;
  permission: string;
  disabled?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export function Sidebar({ onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const { user, logout, hasPermission: checkPermission, isAdmin } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();

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
        {/* MAIN - Dashboard */}
        {renderSection(mainNav)}

        {!collapsed && <div className="border-t border-slate-800 my-2"></div>}
        {collapsed && <div className="border-t border-slate-800 my-1"></div>}

        {/* INVENTORY */}
        {renderSection(inventoryNav)}

        {!collapsed && <div className="border-t border-slate-800 my-2"></div>}
        {collapsed && <div className="border-t border-slate-800 my-1"></div>}

        {/* PURCHASING */}
        {renderSection(purchasingNav)}

        {!collapsed && <div className="border-t border-slate-800 my-2"></div>}
        {collapsed && <div className="border-t border-slate-800 my-1"></div>}

        {/* SALES */}
        {renderSection(salesNav)}

        {!collapsed && <div className="border-t border-slate-800 my-2"></div>}
        {collapsed && <div className="border-t border-slate-800 my-1"></div>}

        {/* PEOPLE */}
        {renderSection(peopleNav)}

        {!collapsed && <div className="border-t border-slate-800 my-2"></div>}
        {collapsed && <div className="border-t border-slate-800 my-1"></div>}

        {/* FINANCE */}
        {renderSection(financeNav)}

        {!collapsed && <div className="border-t border-slate-800 my-2"></div>}
        {collapsed && <div className="border-t border-slate-800 my-1"></div>}

        {/* SYSTEM */}
        {renderSection(systemNav)}

        {/* Chat Assistant - Always at bottom */}
        {!collapsed && <div className="border-t border-slate-800 my-2"></div>}
        {collapsed && <div className="border-t border-slate-800 my-1"></div>}
        <div className={collapsed ? "px-1" : "px-2"}>
          <Link
            to="/chat"
            onClick={handleNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2 py-2 text-xs md:text-sm md:px-3 md:py-2.5 font-medium transition-colors",
              collapsed && "justify-center px-2 py-2",
              location.pathname === '/chat'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Bot className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
            {!collapsed && t('nav.chatAssistant')}
          </Link>
        </div>
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {}}
                className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
                title={t('nav.settings')}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <button
                onClick={() => logout()}
                className="flex items-center justify-center rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
                title={t('nav.logout')}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
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
                <p className="truncate text-xs text-slate-400">{user?.role || 'Staff'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to="/settings"
                onClick={handleNavigate}
                className="flex flex-1 items-center justify-center gap-1 md:gap-2 rounded-lg bg-slate-800 px-2 py-2 text-xs md:text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.settings')}</span>
              </Link>
              <button
                onClick={() => logout()}
                className="flex items-center justify-center rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
                title={t('nav.logout')}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
