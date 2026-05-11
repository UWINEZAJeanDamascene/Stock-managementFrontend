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
  Clock,
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
  label: string;
  description: string;
  accent: string;
  glow: string;
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
  label: "Command",
  description: "Live executive views",
  accent: "from-cyan-300 to-emerald-300",
  glow: "bg-cyan-400/15",
  items: [
    {
      nameKey: "nav.dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      permission: "products:read",
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
      permission: "sales_invoices:read",
    },
    {
      nameKey: "nav.purchaseDashboard",
      href: "/dashboard/purchases",
      icon: ShoppingCart,
      permission: "purchase_orders:read",
    },
    {
      nameKey: "nav.financeDashboard",
      href: "/dashboard/finance",
      icon: PieChart,
      permission: "journal_entries:read",
    },
  ],
};

const inventoryNav: NavSection = {
  title: "nav.sectionInventory",
  label: "Inventory Core",
  description: "Products, stock and warehouses",
  accent: "from-emerald-300 to-teal-200",
  glow: "bg-emerald-400/12",
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
      permission: "products:read",
    },
    {
      nameKey: "nav.warehouses",
      href: "/warehouses",
      icon: WarehouseIcon,
      permission: "warehouses:read",
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
      permission: "stock_transfers:read",
    },
    {
      nameKey: "nav.stockAudits",
      href: "/stock-audits",
      icon: ClipboardCheck,
      permission: "stock_audits:read",
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
  label: "Supply Chain",
  description: "Suppliers, buying and receiving",
  accent: "from-amber-300 to-orange-200",
  glow: "bg-amber-300/12",
  items: [
    {
      nameKey: "nav.suppliers",
      href: "/suppliers",
      icon: Building2,
      permission: "suppliers:read",
    },
    {
      nameKey: "nav.purchaseOrders",
      href: "/purchase-orders",
      icon: ClipboardList,
      permission: "purchase_orders:read",
    },
    { nameKey: "nav.grn", href: "/grn", icon: Truck, permission: "grn:read" },
    {
      nameKey: "nav.purchases",
      href: "/purchases",
      icon: ShoppingCart,
      permission: "purchase_orders:read",
    },
    {
      nameKey: "nav.purchaseReturns",
      href: "/purchase-returns",
      icon: Truck,
      permission: "purchase_returns:read",
    },
  ],
};

const salesNav: NavSection = {
  title: "nav.sectionSales",
  label: "Revenue Flow",
  description: "Customers, orders and billing",
  accent: "from-sky-300 to-indigo-300",
  glow: "bg-sky-400/12",
  items: [
    {
      nameKey: "nav.pos",
      href: "/sales-legacy",
      icon: Receipt,
      permission: "sales_invoices:read",
    },
    {
      nameKey: "nav.clients",
      href: "/clients",
      icon: Users,
      permission: "clients:read",
    },
    {
      nameKey: "nav.quotations",
      href: "/quotations",
      icon: FileText,
      permission: "quotations:read",
    },
    {
      nameKey: "nav.salesOrders",
      href: "/sales-orders",
      icon: ShoppingCart,
      permission: "sales_orders:read",
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
      permission: "sales_invoices:read",
    },
    {
      nameKey: "nav.deliveryNotes",
      href: "/delivery-notes",
      icon: Truck,
      permission: "delivery_notes:read",
    },
    {
      nameKey: "nav.creditNotes",
      href: "/credit-notes",
      icon: FileText,
      permission: "credit_notes:read",
    },
    {
      nameKey: "nav.recurringInvoices",
      href: "/recurring-invoices",
      icon: FileText,
      permission: "sales_invoices:read",
    },
    {
      nameKey: "nav.accountsReceivable",
      href: "/ar-receipts",
      icon: Receipt,
      permission: "ar_receipts:read",
    },
    {
      nameKey: "nav.accountsPayable",
      href: "/ap-payments",
      icon: Wallet,
      permission: "ap_payments:read",
    },
  ],
};

const financeNav: NavSection = {
  title: "nav.sectionFinance",
  label: "Finance Control",
  description: "Cash, ledgers and payroll",
  accent: "from-violet-300 to-cyan-200",
  glow: "bg-violet-400/12",
  items: [
    {
      nameKey: "nav.bankAccounts",
      href: "/bank-accounts",
      icon: Banknote,
      permission: "bank_accounts:read",
    },
    {
      nameKey: "nav.chartOfAccounts",
      href: "/chart-of-accounts",
      icon: BookOpen,
      permission: "chart_of_accounts:read",
    },
    {
      nameKey: "nav.journalEntries",
      href: "/journal",
      icon: BookOpen,
      permission: "journal_entries:read",
    },
    {
      nameKey: "nav.pettyCash",
      href: "/petty-cash",
      icon: Wallet,
      permission: "petty_cash:read",
    },
    {
      nameKey: "nav.fixedAssets",
      href: "/assets",
      icon: HardDrive,
      permission: "fixed_assets:read",
    },
    {
      nameKey: "nav.liabilities",
      href: "/liabilities",
      icon: Scale,
      permission: "loans:read",
    },
    {
      nameKey: "nav.expenses",
      href: "/expenses",
      icon: Receipt,
      permission: "expenses:read",
    },
    {
      nameKey: "nav.budgets",
      href: "/budgets",
      icon: PieChart,
      permission: "budgets:read",
    },
    {
      nameKey: "nav.projects",
      href: "/projects",
      icon: FolderTree,
      permission: "budgets:read",
    },
    {
      nameKey: "nav.budgetSettings",
      href: "/budgets/settings",
      icon: Settings,
      permission: "budgets:read",
    },
    {
      nameKey: "nav.employees",
      href: "/employees",
      icon: Users,
      permission: "payroll:read",
    },
    {
      nameKey: "nav.payroll",
      href: "/payroll",
      icon: DollarSign,
      permission: "payroll:read",
    },
    {
      nameKey: "payroll.payrollRuns",
      href: "/payroll-runs",
      icon: Play,
      permission: "payroll:read",
    },
    {
      nameKey: "nav.accountingPeriods",
      href: "/periods",
      icon: Calendar,
      permission: "periods:read",
    },
  ],
};

const reportsNav: NavSection = {
  title: "nav.sectionReports",
  label: "Intelligence",
  description: "Reports and ratios",
  accent: "from-lime-200 to-cyan-200",
  glow: "bg-lime-300/12",
  items: [
    {
      nameKey: "nav.reportsHub",
      href: "/reports",
      icon: FileText,
      permission: "reports:read",
    },
    {
      nameKey: "nav.profitLoss",
      href: "/reports/profit-loss",
      icon: TrendingUp,
      permission: "reports:read",
    },
    {
      nameKey: "nav.balanceSheet",
      href: "/reports/balance-sheet",
      icon: Scale,
      permission: "reports:read",
    },
    {
      nameKey: "nav.cashFlow",
      href: "/reports/cash-flow",
      icon: Waves,
      permission: "reports:read",
    },
    {
      nameKey: "nav.financialRatios",
      href: "/reports/financial-ratios",
      icon: Gauge,
      permission: "reports:read",
    },
    {
      nameKey: "nav.debtMaturity",
      href: "/reports/debt-maturity",
      icon: Clock,
      permission: "reports:read",
    },
  ],
};

const systemNav: NavSection = {
  title: "nav.sectionSystem",
  label: "Control Room",
  description: "Security, data and settings",
  accent: "from-rose-200 to-slate-200",
  glow: "bg-rose-300/12",
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
      permission: "roles:read",
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
      permission: "settings:read",
    },
    {
      nameKey: "nav.notificationsInbox",
      href: "/notifications/list",
      icon: Bell,
      permission: "notifications:read",
    },
    {
      nameKey: "nav.notificationSettings",
      href: "/notifications",
      icon: Settings2,
      permission: "notifications:read",
    },
    {
      nameKey: "nav.backupRestore",
      href: "/backups",
      icon: HardDrive,
      permission: "settings:read",
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
  salesNav,
  purchasingNav,
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
          base_currency: companyData.base_currency,
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
    section: NavSection,
    compact = false,
    disabled?: boolean,
  ) => {
    if (disabled) {
      return (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg text-xs font-medium transition-colors cursor-not-allowed opacity-40",
            compact ? "px-2 py-2" : "px-2 py-2 md:px-3 md:py-2.5",
            collapsed && "justify-center px-2 py-2 h-10 w-10",
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
          "group relative flex items-center overflow-hidden rounded-lg text-xs font-semibold transition-all duration-200",
          compact ? "min-h-12 flex-col justify-center gap-1 px-2 py-2 text-center" : "gap-2 px-2 py-2 md:px-3 md:py-2.5",
          collapsed && "mx-auto h-11 w-11 justify-center rounded-2xl px-0 py-0",
          active
            ? "bg-white text-slate-950 shadow-lg shadow-cyan-950/20"
            : "text-slate-300 hover:bg-white/8 hover:text-white",
        )}
      >
        {active && (
          <span
            className={cn(
              "absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r",
              section.accent,
            )}
          />
        )}
        <item.icon
          className={cn(
            "flex-shrink-0 h-4 w-4 md:h-[18px] md:w-[18px]",
            compact && "h-4 w-4",
            collapsed && "h-5 w-5",
            active ? "text-slate-950" : "text-slate-400 group-hover:text-white",
          )}
        />
        {!collapsed && (
          <span className={cn("truncate", compact && "max-w-full text-[11px] leading-tight")}>
            {t(item.nameKey)}
          </span>
        )}
      </Link>
    );
  };

  // ── Render a whole section ─────────────────────────────────────────────────

  const renderSection = (section: NavSection, isDashboards = false) => {
    const visible = filterByPermission(section.items);
    if (visible.length === 0) return null;
    const useGrid = !collapsed && (isDashboards || visible.length > 4);

    return (
      <div
        className={cn(
          "relative mb-3 overflow-hidden",
          collapsed
            ? "rounded-[1.4rem] border border-white/7 bg-white/[0.025] p-1.5"
            : "rounded-xl border border-white/8 bg-white/[0.045] p-2 shadow-sm",
        )}
      >
        {!collapsed && (
          <div className="mb-2 flex items-start justify-between gap-2 px-1.5 pt-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 rounded-full bg-gradient-to-r", section.accent)} />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  {section.label}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {section.description}
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              {visible.length}
            </span>
          </div>
        )}
        {collapsed && (
          <div className={cn("mx-auto mb-1.5 h-1 w-6 rounded-full bg-gradient-to-r", section.accent)} />
        )}

        <ul
          className={cn(
            useGrid ? "grid grid-cols-2 gap-1.5" : "space-y-1",
            collapsed && "grid grid-cols-1 gap-1 space-y-0",
          )}
        >
          {visible.map((item) => {
            const active = isPathActive(item.href);
            return (
              <li key={item.href}>
                {renderNavItem(item, active, section, useGrid, (item as any).disabled)}
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
        "flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_28%),linear-gradient(180deg,#07111f_0%,#0f172a_42%,#070b13_100%)] transition-all duration-300",
        collapsed ? "w-20" : "w-72",
      )}
    >
      {/* ── Logo / header ── */}
      <div
        className={cn(
          "flex min-h-20 items-center justify-between gap-2 border-b border-white/10 bg-white/[0.035] flex-shrink-0",
          collapsed ? "px-2 justify-center flex-col py-3" : "px-3",
        )}
      >
        {/* ── Company Profile Section ── */}
        {collapsed ? (
          <button
            onClick={() => setCompanyProfileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-emerald-300 text-slate-950 flex-shrink-0 hover:ring-2 hover:ring-cyan-200/60 transition-all"
            title={company?.name || "Company"}
          >
            {company?.logo_url ? (
              <Avatar className="h-9 w-9">
                <AvatarImage src={company.logo_url} alt={company.name} />
                <AvatarFallback className="bg-cyan-300 text-slate-950 text-sm">
                  {company?.name?.charAt(0).toUpperCase() || "C"}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </button>
        ) : (
          <button
            onClick={() => setCompanyProfileOpen(true)}
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.045] p-2 text-left transition-colors hover:bg-white/[0.08]"
          >
            <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-cyan-300/30">
              <AvatarImage src={company?.logo_url} alt={company?.name || "Company"} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-300 to-emerald-300 text-slate-950 text-sm font-bold">
                {company?.name?.charAt(0).toUpperCase() || "C"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="truncate text-sm font-bold text-white tracking-tight">
                {company?.name || "My Company"}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Operating atlas
              </p>
            </div>
          </button>
        )}

        <div className={cn("flex items-center gap-1", collapsed && "mt-2")}>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
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
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 lg:hidden"
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
          collapsed
            ? "px-2 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "px-3 py-3",
        )}
      >
        {/* DASHBOARDS — always rendered first, styled distinctly */}
        {ALL_SECTIONS.map((section, idx) => (
          <div key={section.label}>{renderSection(section, idx === 0)}</div>
        ))}

        {/* All remaining sections */}
      </nav>

      {/* ── Language toggle ── */}
      <div
        className={cn(
          "border-t border-white/10 flex-shrink-0 bg-white/[0.025]",
          collapsed ? "px-2 py-2" : "px-3 py-2",
        )}
      >
        {collapsed ? (
          <button
            onClick={toggleLanguage}
            title={
              language === "en" ? "Passer en Français" : "Switch to English"
            }
            className="flex h-10 w-full items-center justify-center rounded-2xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Languages className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={toggleLanguage}
            title={
              language === "en" ? "Passer en Français" : "Switch to English"
            }
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs md:text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Languages className="h-4 w-4 flex-shrink-0" />
            <span>{language === "en" ? "Français" : "English"}</span>
            <span className="ml-auto text-[10px] bg-cyan-300 text-slate-950 rounded-full px-1.5 py-0.5 font-bold">
              {language.toUpperCase()}
            </span>
          </button>
        )}
      </div>

      {/* ── Currency selector ── */}
      {!collapsed && (
        <div className="border-t border-white/10 px-3 py-2 flex-shrink-0 bg-white/[0.025]">
          <CurrencySelector />
        </div>
      )}

      {/* ── User section ── */}
      <div
        className={cn(
          "border-t border-white/10 flex-shrink-0 bg-white/[0.025]",
          collapsed ? "p-2" : "p-3",
        )}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white text-sm font-medium hover:ring-2 hover:ring-cyan-300/50 transition-all overflow-hidden"
              title={user?.name || "User"}
            >
              {user?.avatar ? (
                <Avatar className="h-11 w-11">
<AvatarImage src={user?.avatar} alt={user?.name || "User"} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-400 text-white text-sm">
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
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title={t("nav.settings")}
              >
                <Settings className="h-3.5 w-3.5" />
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 p-1.5 text-slate-300 hover:bg-red-600 hover:text-white transition-colors"
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
