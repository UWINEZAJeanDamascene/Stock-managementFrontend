import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { UserProfileDialog } from "@/app/components/UserProfileDialog";
import { CompanyProfileDialog } from "@/app/components/CompanyProfileDialog";
import { companyApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
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
  Building2,
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
  Shield,
  LayoutDashboard,
  Banknote,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import CurrencySelector from "../components/CurrencySelector";
import { cn } from "../components/ui/utils";
import { Button } from "@/app/components/ui/button";
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
} from "@/app/components/ui/alert-dialog";
import authService from "@/services/authService";
import { usersApi } from "@/lib/api";
import { useCompanyStore } from "@/store/companyStore";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Section Definitions ───────────────────────────────────────────────────────

const dashboardsNav: NavSection = {
  title: "nav.sectionDashboards",
  items: [
    {
      nameKey: "nav.dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      permission: "stock:read",
    },
    {
      nameKey: "nav.inventoryDashboard",
      href: "/dashboard/inventory",
      icon: Boxes,
      permission: "stock:read",
    },
    {
      nameKey: "nav.salesDashboard",
      href: "/dashboard/sales",
      icon: TrendingUp,
      permission: "stock:read",
    },
    {
      nameKey: "nav.purchaseDashboard",
      href: "/dashboard/purchases",
      icon: ShoppingCart,
      permission: "stock:read",
    },
    {
      nameKey: "nav.financeDashboard",
      href: "/dashboard/finance",
      icon: PieChart,
      permission: "stock:read",
    },
  ],
};

const inventoryNav: NavSection = {
  title: "nav.sectionInventory",
  items: [
    {
      nameKey: "nav.products",
      href: "/products",
      icon: Package,
      permission: "products:read",
    },
    {
      nameKey: "nav.categories",
      href: "/categories",
      icon: FolderTree,
      permission: "categories:read",
    },
    {
      nameKey: "nav.warehouses",
      href: "/warehouses",
      icon: WarehouseIcon,
      permission: "stock:read",
    },
    {
      nameKey: "nav.stockLevels",
      href: "/stock-levels",
      icon: BarChart3,
      permission: "stock:read",
    },
    {
      nameKey: "nav.stockMovements",
      href: "/stock-movements",
      icon: ArrowRightLeft,
      permission: "stock:read",
    },
    {
      nameKey: "nav.stockTransfers",
      href: "/stock-transfers",
      icon: ArrowRightLeft,
      permission: "stock:read",
    },
    {
      nameKey: "nav.stockAudits",
      href: "/stock-audits",
      icon: ClipboardCheck,
      permission: "stock:read",
    },
    {
      nameKey: "nav.batches",
      href: "/batches",
      icon: Boxes,
      permission: "stock:read",
    },
    {
      nameKey: "nav.serialNumbers",
      href: "/serial-numbers",
      icon: Package,
      permission: "stock:read",
    },
  ],
};

const purchasingNav: NavSection = {
  title: "nav.sectionPurchasing",
  items: [
    {
      nameKey: "nav.suppliers",
      href: "/suppliers",
      icon: Building2,
      permission: "stock:read",
    },
    {
      nameKey: "nav.purchaseOrders",
      href: "/purchase-orders",
      icon: ClipboardList,
      permission: "stock:read",
    },
    { nameKey: "nav.grn", href: "/grn", icon: Truck, permission: "stock:read" },
    {
      nameKey: "nav.purchases",
      href: "/purchases",
      icon: ShoppingCart,
      permission: "stock:read",
    },
    {
      nameKey: "nav.purchaseReturns",
      href: "/purchase-returns",
      icon: Truck,
      permission: "stock:read",
    },
  ],
};

const salesNav: NavSection = {
  title: "nav.sectionSales",
  items: [
    {
      nameKey: "nav.pos",
      href: "/sales-legacy",
      icon: Receipt,
      permission: "stock:read",
    },
    {
      nameKey: "nav.clients",
      href: "/clients",
      icon: Users,
      permission: "stock:read",
    },
    {
      nameKey: "nav.quotations",
      href: "/quotations",
      icon: FileText,
      permission: "stock:read",
    },
    {
      nameKey: "nav.salesOrders",
      href: "/sales-orders",
      icon: ShoppingCart,
      permission: "stock:read",
    },
    {
      nameKey: "nav.pickPacks",
      href: "/pick-packs",
      icon: Package,
      permission: "stock:read",
    },
    {
      nameKey: "nav.invoices",
      href: "/invoices",
      icon: FileText,
      permission: "stock:read",
    },
    {
      nameKey: "nav.deliveryNotes",
      href: "/delivery-notes",
      icon: Truck,
      permission: "stock:read",
    },
    {
      nameKey: "nav.creditNotes",
      href: "/credit-notes",
      icon: FileText,
      permission: "stock:read",
    },
    {
      nameKey: "nav.recurringInvoices",
      href: "/recurring-invoices",
      icon: FileText,
      permission: "stock:read",
    },
    {
      nameKey: "nav.arReceipts",
      href: "/ar-receipts",
      icon: Receipt,
      permission: "stock:read",
    },
    {
      nameKey: "nav.apPayments",
      href: "/ap-payments",
      icon: Wallet,
      permission: "stock:read",
    },
  ],
};

const financeNav: NavSection = {
  title: "nav.sectionFinance",
  items: [
    {
      nameKey: "nav.bankAccounts",
      href: "/bank-accounts",
      icon: Banknote,
      permission: "stock:read",
    },
    {
      nameKey: "nav.chartOfAccounts",
      href: "/chart-of-accounts",
      icon: BookOpen,
      permission: "stock:read",
    },
    {
      nameKey: "nav.journalEntries",
      href: "/journal",
      icon: BookOpen,
      permission: "stock:read",
    },
    {
      nameKey: "nav.pettyCash",
      href: "/petty-cash",
      icon: Wallet,
      permission: "stock:read",
    },
    {
      nameKey: "nav.fixedAssets",
      href: "/assets",
      icon: HardDrive,
      permission: "stock:read",
    },
    {
      nameKey: "nav.liabilities",
      href: "/liabilities",
      icon: Scale,
      permission: "stock:read",
    },
    {
      nameKey: "nav.expenses",
      href: "/expenses",
      icon: Receipt,
      permission: "stock:read",
    },
    {
      nameKey: "nav.budgets",
      href: "/budgets",
      icon: PieChart,
      permission: "stock:read",
    },
    {
      nameKey: "nav.budgetSettings",
      href: "/budgets/settings",
      icon: Settings,
      permission: "budgets:admin",
    },
    {
      nameKey: "nav.payroll",
      href: "/payroll",
      icon: DollarSign,
      permission: "stock:read",
    },
    {
      nameKey: "payroll.payrollRuns",
      href: "/payroll-runs",
      icon: Play,
      permission: "stock:read",
    },
    {
      nameKey: "nav.accountingPeriods",
      href: "/periods",
      icon: Calendar,
      permission: "stock:read",
    },
  ],
};

const reportsNav: NavSection = {
  title: "nav.sectionReports",
  items: [
    {
      nameKey: "nav.profitLoss",
      href: "/reports/profit-loss",
      icon: TrendingUp,
      permission: "stock:read",
    },
    {
      nameKey: "nav.balanceSheet",
      href: "/reports/balance-sheet",
      icon: Scale,
      permission: "stock:read",
    },
    {
      nameKey: "nav.cashFlow",
      href: "/reports/cash-flow",
      icon: Waves,
      permission: "stock:read",
    },
    {
      nameKey: "nav.financialRatios",
      href: "/reports/financial-ratios",
      icon: Gauge,
      permission: "stock:read",
    },
  ],
};

const systemNav: NavSection = {
  title: "nav.sectionSystem",
  items: [
    {
      nameKey: "nav.userManagement",
      href: "/users",
      icon: Users,
      permission: "users:read",
    },
    {
      nameKey: "nav.rolesPage",
      href: "/roles",
      icon: Shield,
      permission: "users:read",
    },
    {
      nameKey: "nav.security",
      href: "/security",
      icon: Lock,
      permission: "users:read",
    },
    {
      nameKey: "nav.departments",
      href: "/departments",
      icon: Blocks,
      permission: "users:read",
    },
    {
      nameKey: "nav.companySettings",
      href: "/company-settings",
      icon: Building2,
      permission: "stock:read",
    },
    {
      nameKey: "nav.notificationsInbox",
      href: "/notifications/list",
      icon: Bell,
      permission: "users:read",
    },
    {
      nameKey: "nav.notificationSettings",
      href: "/notifications",
      icon: Settings2,
      permission: "users:read",
    },
    {
      nameKey: "nav.backupRestore",
      href: "/backups",
      icon: HardDrive,
      permission: "users:read",
    },
    {
      nameKey: "nav.bulkData",
      href: "/bulk-data",
      icon: FileSpreadsheet,
      permission: "products:read",
    },
    {
      nameKey: "nav.auditTrail",
      href: "/audit-trail",
      icon: History,
      permission: "users:read",
    },
    {
      nameKey: "nav.testimonials",
      href: "/testimonials",
      icon: Star,
      permission: "users:read",
    },
  ],
};

// All sections in display order — Dashboards always first
const ALL_SECTIONS: NavSection[] = [
  dashboardsNav,
  inventoryNav,
  purchasingNav,
  salesNav,
  financeNav,
  reportsNav,
  systemNav,
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Sidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission: checkPermission, updateUser } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [companyProfileOpen, setCompanyProfileOpen] = useState(false);
  const company = useCompanyStore((state) => state.company);
  const setCompany = useCompanyStore((state) => state.setCompany);

  // Fetch company data on mount
  useEffect(() => {
    // Clear any old localStorage company data
    localStorage.removeItem('company-storage');
    
    // Always fetch fresh company profile from DB
    companyApi.getMe().then((response) => {
      if (response.success && response.data) {
        const companyData = response.data as any;
        setCompany({
          _id: companyData._id || companyData.id || '',
          name: companyData.name || 'My Company',
          legal_name: companyData.legal_name,
          email: companyData.email,
          phone: companyData.phone,
          website: companyData.website,
          registration_number: companyData.registration_number,
          tax_identification_number: companyData.tax_identification_number,
          industry: companyData.industry,
          logo_url: companyData.logo_url,
          address: companyData.address,
        });
      }
    }).catch(() => {
      if (!company) {
        setCompany({ _id: 'fallback', name: 'My Company' });
      }
    });

    // Fetch user profile for latest avatar
    usersApi.getProfile().then((response) => {
      if (response.success && response.data) {
        const profile = response.data as any;
        if (profile.avatar) {
          updateUser?.({ avatar: profile.avatar });
        }
      }
    }).catch(() => {
      // Ignore profile fetch errors
    });
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // Backend logout failed — continue with local cleanup
    }
    logout();
    setLoggingOut(false);
    navigate("/login", { replace: true });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterByPermission = (items: NavItem[]) =>
    items.filter((item) => checkPermission(item.permission as any));

  const handleNavigate = () => {
    if (onNavigate) onNavigate();
  };

  const isPathActive = (href: string) =>
    location.pathname === href ||
    (href !== "/dashboard" && location.pathname.startsWith(href + "/"));

  // ── Render a single nav link ───────────────────────────────────────────────

  const renderNavItem = (
    item: NavItem,
    active: boolean,
    disabled?: boolean,
  ) => {
    if (disabled) {
      return (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors cursor-not-allowed opacity-40",
            "md:text-sm md:px-3 md:py-2.5",
            collapsed && "justify-center px-2 py-2",
            "text-slate-500",
          )}
        >
          <item.icon className="h-4 w-4 md:h-[18px] md:w-[18px] flex-shrink-0" />
          {!collapsed && t(item.nameKey)}
        </div>
      );
    }

    return (
      <Link
        to={item.href}
        onClick={handleNavigate}
        title={collapsed ? t(item.nameKey) : undefined}
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-all duration-150",
          "md:text-sm md:px-3 md:py-2.5",
          collapsed && "justify-center px-2 py-2",
          active
            ? "bg-indigo-600 text-white shadow-sm"
            : "text-slate-300 hover:bg-slate-800 hover:text-white",
        )}
      >
        <item.icon
          className={cn(
            "flex-shrink-0 h-4 w-4 md:h-[18px] md:w-[18px]",
            active ? "text-white" : "text-slate-400",
          )}
        />
        {!collapsed && <span className="truncate">{t(item.nameKey)}</span>}
      </Link>
    );
  };

  // ── Render a whole section ─────────────────────────────────────────────────

  const renderSection = (section: NavSection, isDashboards = false) => {
    const visible = filterByPermission(section.items);
    if (visible.length === 0) return null;

    return (
      <div
        className={cn(
          "mb-1",
          isDashboards ? "pb-2 mb-2 border-b border-slate-700/60" : "",
        )}
      >
        {/* Section label */}
        {section.title && !collapsed && (
          <div className="px-2 md:px-3 pt-3 pb-1">
            <span
              className={cn(
                "text-[10px] font-bold tracking-widest uppercase",
                isDashboards ? "text-indigo-400" : "text-slate-500",
              )}
            >
              {t(section.title)}
            </span>
          </div>
        )}
        {/* Collapsed divider */}
        {section.title && collapsed && (
          <div className="flex justify-center py-2">
            <div className="h-px bg-slate-700 w-8" />
          </div>
        )}

        {/* Items */}
        <ul className={cn("space-y-0.5", collapsed && "space-y-1")}>
          {visible.map((item) => {
            const active = isPathActive(item.href);
            return (
              <li key={item.href}>
                {renderNavItem(item, active, (item as any).disabled)}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  // ── Shell ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "flex h-screen flex-col bg-slate-900 transition-all duration-200 overflow-y-auto",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* ── Logo / header ── */}
      <div
        className={cn(
          "flex h-16 items-center justify-between gap-2 border-b border-slate-800 flex-shrink-0",
          collapsed ? "px-1 justify-center" : "px-3",
        )}
      >
        {/* ── Company Profile Section ── */}
        {collapsed ? (
          <button
            onClick={() => setCompanyProfileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 flex-shrink-0 hover:ring-2 hover:ring-indigo-400 transition-all"
            title={company?.name || "Company"}
          >
            {company?.logo_url ? (
              <Avatar className="h-9 w-9">
                <AvatarImage src={company.logo_url} alt={company.name} />
                <AvatarFallback className="bg-indigo-600 text-white text-sm">
                  {company?.name?.charAt(0).toUpperCase() || "C"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Building2 className="h-5 w-5 text-white" />
            )}
          </button>
        ) : (
          <button
            onClick={() => setCompanyProfileOpen(true)}
            className="flex items-center gap-2 w-full text-left hover:bg-slate-800/50 rounded-lg p-1 transition-colors"
          >
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={company?.logo_url} alt={company?.name || "Company"} />
              <AvatarFallback className="bg-indigo-600 text-white text-sm font-medium">
                {company?.name?.charAt(0).toUpperCase() || "C"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="truncate text-base font-bold text-white tracking-tight">
                {company?.name || "My Company"}
              </p>
            </div>
          </button>
        )}

        <div className="flex items-center gap-1">
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
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

      {/* ── Navigation ── */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent",
          collapsed ? "px-1 py-2" : "px-2 md:px-3 py-2",
        )}
      >
        {/* DASHBOARDS — always rendered first, styled distinctly */}
        {renderSection(dashboardsNav, true)}

        {/* All remaining sections */}
        {ALL_SECTIONS.slice(1).map((section, idx) => (
          <div key={idx}>{renderSection(section, false)}</div>
        ))}
      </nav>

      {/* ── Language toggle ── */}
      <div
        className={cn(
          "border-t border-slate-800 flex-shrink-0",
          collapsed ? "px-1 py-2" : "px-2 md:px-3 py-2",
        )}
      >
        {collapsed ? (
          <button
            onClick={toggleLanguage}
            title={
              language === "en" ? "Passer en Français" : "Switch to English"
            }
            className="flex w-full items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Languages className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={toggleLanguage}
            title={
              language === "en" ? "Passer en Français" : "Switch to English"
            }
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs md:text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Languages className="h-4 w-4 flex-shrink-0" />
            <span>{language === "en" ? "Français" : "English"}</span>
            <span className="ml-auto text-[10px] bg-indigo-600 text-white rounded px-1.5 py-0.5 font-bold">
              {language.toUpperCase()}
            </span>
          </button>
        )}
      </div>

      {/* ── Currency selector ── */}
      {!collapsed && (
        <div className="border-t border-slate-800 px-2 md:px-3 py-2 flex-shrink-0">
          <CurrencySelector />
        </div>
      )}

      {/* ── User section ── */}
      <div
        className={cn(
          "border-t border-slate-800 flex-shrink-0",
          collapsed ? "p-1" : "p-2 md:p-4",
        )}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-medium hover:ring-2 hover:ring-indigo-400 transition-all"
              title={user?.name || "User"}
            >
              {user?.avatar ? (
                <Avatar className="h-8 w-8">
<AvatarImage src={user?.avatar} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-indigo-600 text-white text-sm">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                user?.name?.charAt(0).toUpperCase() || "U"
              )}
            </button>
            <div className="flex gap-1">
              <Link
                to="/company-settings"
                onClick={handleNavigate}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={t("nav.settings")}
              >
                <Settings className="h-3.5 w-3.5" />
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="flex items-center justify-center rounded-lg bg-slate-800 p-1.5 text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
                    title={t("nav.logout")}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("nav.logoutConfirmTitle", "Sign out")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        "nav.logoutConfirmDesc",
                        "Are you sure you want to sign out? Any unsaved changes will be lost.",
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {t("common.cancel", "Cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {loggingOut
                        ? t("nav.signingOut", "Signing out...")
                        : t("nav.logout", "Sign out")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 mb-2 md:mb-3 md:gap-3 w-full text-left hover:bg-slate-800/50 rounded-lg p-1 transition-colors"
            >
              <Avatar className="h-8 w-8 md:h-9 md:w-9 flex-shrink-0">
                <AvatarImage src={user?.avatar} alt={user?.name || "User"} />
                <AvatarFallback className="bg-indigo-600 text-white text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.name || "User"}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {user?.email || ""}
                </p>
              </div>
            </button>

            <div className="flex gap-2">
              <Link
                to="/company-settings"
                onClick={handleNavigate}
                className="flex flex-1 items-center justify-center gap-1 md:gap-2 rounded-lg bg-slate-800 px-2 py-2 text-xs md:text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{t("nav.settings")}</span>
              </Link>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="flex items-center justify-center rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
                    title={t("nav.logout")}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("nav.logoutConfirmTitle", "Sign out")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        "nav.logoutConfirmDesc",
                        "Are you sure you want to sign out? Any unsaved changes will be lost.",
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {t("common.cancel", "Cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {loggingOut
                        ? t("nav.signingOut", "Signing out...")
                        : t("nav.logout", "Sign out")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </div>
      
      {/* User Profile Dialog */}
      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      
      {/* Company Profile Dialog */}
      <CompanyProfileDialog open={companyProfileOpen} onOpenChange={setCompanyProfileOpen} />
    </div>
  );
}
