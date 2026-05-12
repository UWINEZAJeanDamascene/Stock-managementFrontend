import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Layout } from '../layout/Layout';
import { Button } from '@/app/components/ui/button';
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  ShoppingCart,
  PieChart,
  Package,
  FolderTree,
  Warehouse,
  BarChart3,
  ArrowRightLeft,
  ClipboardCheck,
  Building2,
  ClipboardList,
  Truck,
  Users,
  FileText,
  Receipt,
  Banknote,
  BookOpen,
  Wallet,
  HardDrive,
  Scale,
  DollarSign,
  Calendar,
  Gauge,
  TrendingDown,
  Waves,
  Clock,
  Shield,
  Lock,
  Bell,
  Settings,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  MousePointerClick,
  MapPin,
  CircleDot,
  CheckCircle2,
  Compass,
} from 'lucide-react';

/* ── Animations ─────────────────────────────────────────── */
const ANIMATION_STYLES = `
@keyframes slowFadeInUp {
  0% { opacity: 0; transform: translateY(60px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes slowFadeInLeft {
  0% { opacity: 0; transform: translateX(-80px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes slowFadeInRight {
  0% { opacity: 0; transform: translateX(80px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes slowScaleIn {
  0% { opacity: 0; transform: scale(0.75); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes gentleFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-14px); }
}
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(14,165,233,0.15); }
  50% { box-shadow: 0 0 40px rgba(14,165,233,0.35); }
}
@keyframes scanLine {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
}
@keyframes orbit {
  0% { transform: rotate(0deg) translateX(28px) rotate(0deg); }
  100% { transform: rotate(360deg) translateX(28px) rotate(-360deg); }
}
@keyframes orbitReverse {
  0% { transform: rotate(0deg) translateX(42px) rotate(0deg); }
  100% { transform: rotate(-360deg) translateX(42px) rotate(360deg); }
}
@keyframes iconPulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.08); opacity: 1; }
}
@keyframes sidebarItemReveal {
  0% { opacity: 0; transform: translateX(-20px) scale(0.95); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .anim-slow, .anim-float, .anim-glow, .anim-scan, .anim-orbit, .anim-orbit-rev, .anim-icon-pulse, .anim-sidebar-reveal {
    animation: none !important; opacity: 1 !important; transform: none !important;
  }
}
`;

/* ── Data ──────────────────────────────────────────────── */
interface OnboardingSection {
  id: string;
  label: string;
  description: string;
  accent: string;
  glowColor: string;
  icon: React.ElementType;
  features: { name: string; href: string; icon: React.ElementType; what: string }[];
  workflow: { step: number; title: string; detail: string }[];
  sidebarPath: string;
}

const SECTIONS: OnboardingSection[] = [
  {
    id: 'dashboards',
    label: 'Command Center',
    description: 'Live executive views that show what is happening across your business right now.',
    accent: 'from-cyan-400 to-emerald-300',
    glowColor: 'shadow-cyan-500/20',
    icon: LayoutDashboard,
    features: [
      { name: 'Main Dashboard', href: '/dashboard', icon: Gauge, what: 'Revenue, expenses, profit margins and top products at a glance.' },
      { name: 'Inventory Dashboard', href: '/dashboard/inventory', icon: Boxes, what: 'Stock levels by warehouse, low-stock alerts and movement summaries.' },
      { name: 'Sales Dashboard', href: '/dashboard/sales', icon: TrendingUp, what: 'Invoice trends, top clients and sales performance over time.' },
      { name: 'Purchase Dashboard', href: '/dashboard/purchases', icon: ShoppingCart, what: 'Order statuses, supplier activity and procurement summaries.' },
      { name: 'Finance Dashboard', href: '/dashboard/finance', icon: PieChart, what: 'Cash position, journal activity and bank balances overview.' },
    ],
    workflow: [
      { step: 1, title: 'Land on the dashboard', detail: 'After login you land here. Every metric updates automatically.' },
      { step: 2, title: 'Drill into any card', detail: 'Click a chart or metric to jump to its detail page.' },
      { step: 3, title: 'Switch dashboards', detail: 'Use the sidebar or the top tabs to switch between inventory, sales, purchase and finance views.' },
    ],
    sidebarPath: 'First section in the sidebar',
  },
  {
    id: 'inventory',
    label: 'Inventory Core',
    description: 'Everything that moves through your warehouse: products, stock counts, transfers and audits.',
    accent: 'from-emerald-400 to-teal-300',
    glowColor: 'shadow-emerald-500/20',
    icon: Boxes,
    features: [
      { name: 'Products', href: '/products', icon: Package, what: 'Create and manage product records with SKUs, prices and stock tracking.' },
      { name: 'Categories', href: '/categories', icon: FolderTree, what: 'Organize products into categories for easier browsing and reporting.' },
      { name: 'Warehouses', href: '/warehouses', icon: Warehouse, what: 'Set up storage locations and assign stock to each warehouse.' },
      { name: 'Stock Levels', href: '/stock-levels', icon: BarChart3, what: 'View current quantities, reorder points and valuation by location.' },
      { name: 'Stock Movements', href: '/stock-movements', icon: ArrowRightLeft, what: 'Track every inward and outward movement with date, quantity and reason.' },
      { name: 'Transfers', href: '/stock-transfers', icon: ArrowRightLeft, what: 'Move stock between warehouses with approval and tracking.' },
      { name: 'Stock Audits', href: '/stock-audits', icon: ClipboardCheck, what: 'Count physical stock and reconcile against system records.' },
    ],
    workflow: [
      { step: 1, title: 'Create products', detail: 'Go to Products > New. Add SKU, name, price and assign a category.' },
      { step: 2, title: 'Set up warehouses', detail: 'Go to Warehouses > New. Name each location and set the address.' },
      { step: 3, title: 'Receive stock', detail: 'Stock arrives via a GRN or purchase order. Quantities update automatically.' },
      { step: 4, title: 'Check levels', detail: 'Open Stock Levels to see what is running low and where.' },
      { step: 5, title: 'Transfer or audit', detail: 'Use Stock Transfers to move items. Use Audits to verify physical counts.' },
    ],
    sidebarPath: 'Second section in the sidebar',
  },
  {
    id: 'purchasing',
    label: 'Supply Chain',
    description: 'From supplier records to purchase orders, goods receipt and returns.',
    accent: 'from-amber-400 to-orange-300',
    glowColor: 'shadow-amber-500/20',
    icon: Truck,
    features: [
      { name: 'Suppliers', href: '/suppliers', icon: Building2, what: 'Maintain supplier contact details, payment terms and purchase history.' },
      { name: 'Purchase Orders', href: '/purchase-orders', icon: ClipboardList, what: 'Create orders, send to suppliers and track fulfillment status.' },
      { name: 'GRN', href: '/grn', icon: Truck, what: 'Record goods received and link them to purchase orders for accuracy.' },
      { name: 'Purchases', href: '/purchases', icon: ShoppingCart, what: 'Direct purchase records for items bought without a formal order.' },
      { name: 'Purchase Returns', href: '/purchase-returns', icon: ArrowRightLeft, what: 'Return defective or excess stock to suppliers with credit tracking.' },
    ],
    workflow: [
      { step: 1, title: 'Add suppliers', detail: 'Go to Suppliers > New. Fill contact, tax ID and payment terms.' },
      { step: 2, title: 'Create a purchase order', detail: 'Go to Purchase Orders > New. Pick a supplier, add items and quantities, then submit.' },
      { step: 3, title: 'Receive goods', detail: 'When stock arrives, go to GRN > New. Link to the PO and enter received quantities.' },
      { step: 4, title: 'Handle returns', detail: 'If items are wrong, create a Purchase Return from the original PO or GRN.' },
    ],
    sidebarPath: 'Fourth section in the sidebar',
  },
  {
    id: 'sales',
    label: 'Revenue Flow',
    description: 'The full sales cycle from quotation to invoice, delivery, credit note and payment receipt.',
    accent: 'from-sky-400 to-indigo-300',
    glowColor: 'shadow-sky-500/20',
    icon: TrendingUp,
    features: [
      { name: 'Clients', href: '/clients', icon: Users, what: 'Customer directory with contact info, credit limits and invoice history.' },
      { name: 'Quotations', href: '/quotations', icon: FileText, what: 'Draft quotes for clients, send them and convert to invoices.' },
      { name: 'Sales Orders', href: '/sales-orders', icon: ShoppingCart, what: 'Record client orders, reserve stock and track fulfillment.' },
      { name: 'Pick & Pack', href: '/pick-packs', icon: Package, what: 'Warehouse picking lists and packing slips tied to orders.' },
      { name: 'Invoices', href: '/invoices', icon: Receipt, what: 'Final billing documents with tax, totals and payment status.' },
      { name: 'Delivery Notes', href: '/delivery-notes', icon: Truck, what: 'Shipping documents that confirm what left the warehouse.' },
      { name: 'Credit Notes', href: '/credit-notes', icon: FileText, what: 'Reverse or adjust invoices when refunds or corrections are needed.' },
      { name: 'Recurring Invoices', href: '/recurring-invoices', icon: Calendar, what: 'Automated billing for subscriptions or repeat services.' },
      { name: 'AR Receipts', href: '/ar-receipts', icon: Banknote, what: 'Record customer payments against outstanding invoices.' },
      { name: 'AP Payments', href: '/ap-payments', icon: Wallet, what: 'Record payments made to suppliers against bills.' },
    ],
    workflow: [
      { step: 1, title: 'Add a client', detail: 'Go to Clients > New. Name, address, tax ID and credit limit.' },
      { step: 2, title: 'Create a quotation', detail: 'Go to Quotations > New. Pick the client, add line items and save.' },
      { step: 3, title: 'Convert to invoice', detail: 'Open the quotation and click Convert to Invoice. Stock deducts automatically.' },
      { step: 4, title: 'Fulfill the order', detail: 'Use Sales Orders and Pick & Pack to reserve and ship the items.' },
      { step: 5, title: 'Record payment', detail: 'Go to AR Receipts > New. Link to the invoice and enter the amount received.' },
    ],
    sidebarPath: 'Third section in the sidebar',
  },
  {
    id: 'finance',
    label: 'Finance Control',
    description: 'Accounting, banking, payroll, budgets and fixed assets in one ledger.',
    accent: 'from-violet-400 to-cyan-300',
    glowColor: 'shadow-violet-500/20',
    icon: BookOpen,
    features: [
      { name: 'Bank Accounts', href: '/bank-accounts', icon: Banknote, what: 'Track balances, transactions and reconciliations per account.' },
      { name: 'Chart of Accounts', href: '/chart-of-accounts', icon: BookOpen, what: 'Define your general ledger structure with account codes and types.' },
      { name: 'Journal Entries', href: '/journal', icon: FileText, what: 'Manual journal postings and automated entries from other modules.' },
      { name: 'Petty Cash', href: '/petty-cash', icon: Wallet, what: 'Small cash transactions, reimbursements and float management.' },
      { name: 'Fixed Assets', href: '/assets', icon: HardDrive, what: 'Asset registers with depreciation schedules and disposal tracking.' },
      { name: 'Liabilities', href: '/liabilities', icon: Scale, what: 'Loans, leases and other obligations with repayment schedules.' },
      { name: 'Expenses', href: '/expenses', icon: Receipt, what: 'Record and categorize business expenses with receipt attachments.' },
      { name: 'Budgets', href: '/budgets', icon: PieChart, what: 'Set department or project budgets and track variance against actuals.' },
      { name: 'Projects', href: '/projects', icon: FolderTree, what: 'Cost tracking by project with budget allocation and time logging.' },
      { name: 'Employees', href: '/employees', icon: Users, what: 'Staff records, contracts and payroll profile setup.' },
      { name: 'Payroll', href: '/payroll', icon: DollarSign, what: 'Salary calculations, deductions and payment runs per period.' },
    ],
    workflow: [
      { step: 1, title: 'Set up accounts', detail: 'Go to Chart of Accounts > New. Create asset, liability, income and expense accounts.' },
      { step: 2, title: 'Add bank accounts', detail: 'Go to Bank Accounts > New. Name, account number and opening balance.' },
      { step: 3, title: 'Record journals', detail: 'Go to Journal Entries > New. Debit and credit lines must balance.' },
      { step: 4, title: 'Run payroll', detail: 'Go to Payroll. Select period, review calculations and confirm the run.' },
      { step: 5, title: 'Track budgets', detail: 'Go to Budgets > New. Set limits per account, then compare to actual spending in Reports.' },
    ],
    sidebarPath: 'Fifth section in the sidebar',
  },
  {
    id: 'reports',
    label: 'Intelligence',
    description: 'Financial and operational reports for decision making and compliance.',
    accent: 'from-lime-300 to-cyan-300',
    glowColor: 'shadow-lime-500/20',
    icon: Gauge,
    features: [
      { name: 'Reports Hub', href: '/reports', icon: BarChart3, what: 'Central place to access all reports with date range filters.' },
      { name: 'Profit & Loss', href: '/reports/profit-loss', icon: TrendingUp, what: 'Income minus expenses for any period you choose.' },
      { name: 'Balance Sheet', href: '/reports/balance-sheet', icon: Scale, what: 'Assets, liabilities and equity snapshot at a point in time.' },
      { name: 'Cash Flow', href: '/reports/cash-flow', icon: Waves, what: 'Operating, investing and financing cash movements.' },
      { name: 'Financial Ratios', href: '/reports/financial-ratios', icon: Gauge, what: 'Liquidity, profitability and efficiency ratios calculated automatically.' },
      { name: 'Debt Maturity', href: '/reports/debt-maturity', icon: Clock, what: 'Upcoming loan repayments and interest obligations by date.' },
    ],
    workflow: [
      { step: 1, title: 'Pick a report', detail: 'Go to Reports Hub and choose the report type you need.' },
      { step: 2, title: 'Set the period', detail: 'Use the date pickers to define the reporting period.' },
      { step: 3, title: 'Review and export', detail: 'Data loads from journals, invoices and transactions. Export to PDF or spreadsheet if needed.' },
    ],
    sidebarPath: 'Sixth section in the sidebar',
  },
  {
    id: 'system',
    label: 'Control Room',
    description: 'User access, security, company settings, backups and audit trails.',
    accent: 'from-rose-300 to-slate-300',
    glowColor: 'shadow-rose-500/20',
    icon: Shield,
    features: [
      { name: 'User Management', href: '/users', icon: Users, what: 'Add staff, assign roles and manage active login sessions.' },
      { name: 'Roles & Permissions', href: '/roles', icon: Shield, what: 'Create roles and define what each role can read, create or delete.' },
      { name: 'Security', href: '/security', icon: Lock, what: 'Two-factor settings, password policies and login monitoring.' },
      { name: 'Departments', href: '/departments', icon: FolderTree, what: 'Organize staff into departments for reporting and permissions.' },
      { name: 'Company Settings', href: '/company-settings', icon: Settings, what: 'Currency, fiscal year, tax rates and company profile.' },
      { name: 'Notifications', href: '/notifications', icon: Bell, what: 'Configure alert rules for low stock, payments and system events.' },
      { name: 'Backup & Restore', href: '/backups', icon: HardDrive, what: 'Manual and scheduled backups of your company data.' },
      { name: 'Bulk Data', href: '/bulk-data', icon: FileText, what: 'Import products, clients and suppliers from spreadsheet files.' },
      { name: 'Audit Trail', href: '/audit-trail', icon: Clock, what: 'Log of every data change with user, timestamp and before/after values.' },
    ],
    workflow: [
      { step: 1, title: 'Add users', detail: 'Go to Users > New. Enter name, email and assign a role.' },
      { step: 2, title: 'Set permissions', detail: 'Go to Roles > New. Name the role and tick the permissions it needs.' },
      { step: 3, title: 'Configure company', detail: 'Go to Company Settings. Set base currency, fiscal year and tax defaults.' },
      { step: 4, title: 'Enable backups', detail: 'Go to Backup & Restore. Set schedule or run a manual export.' },
      { step: 5, title: 'Monitor changes', detail: 'Go to Audit Trail to see who changed what and when.' },
    ],
    sidebarPath: 'Seventh section in the sidebar',
  },
];

/* ── Mini Components ─────────────────────────────────────── */
function SectionCard({ section, index }: { section: OnboardingSection; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.12 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const animDelay = (i: number) => ({ animationDelay: `${0.4 + i * 0.25}s` });

  return (
    <div
      ref={ref}
      id={section.id}
      className="relative scroll-mt-20"
    >
      {/* Section Background */}
      <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04] ${section.glowColor} shadow-xl transition-shadow duration-1000`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${section.accent} opacity-[0.04] dark:opacity-[0.06]`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.06),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.05),transparent_35%)]" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          {/* Header */}
          <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 ${visible ? 'anim-slow' : 'opacity-0'}`} style={{ animation: visible ? 'slowFadeInUp 2s ease-out forwards' : 'none', animationDelay: '0.1s' }}>
            <div className="flex items-start gap-4">
              <div className={`anim-icon-pulse grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${section.accent} text-white shadow-lg`} style={{ animation: 'iconPulse 3s ease-in-out infinite' }}>
                <section.icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Section {index + 1} of 7
                </p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {section.label}
                </h2>
                <p className="mt-2 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  {section.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              {expanded ? 'Collapse' : 'Expand guide'}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {/* Feature Grid */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.features.map((f, i) => (
              <Link
                key={f.name}
                to={f.href}
                className={`group relative rounded-xl border border-slate-200 bg-white/80 p-4 transition-all duration-700 hover:-translate-y-1 hover:border-cyan-300/40 hover:shadow-lg hover:shadow-cyan-500/10 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.09] ${visible ? 'anim-slow' : 'opacity-0'}`}
                style={visible ? { animation: `slowFadeInUp 1.8s ease-out forwards`, animationDelay: `${0.5 + i * 0.18}s` } : {}}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-slate-700 shadow-sm transition-colors group-hover:bg-cyan-50 group-hover:text-cyan-700 dark:bg-slate-950 dark:text-slate-300 dark:group-hover:bg-cyan-950/40 dark:group-hover:text-cyan-300">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{f.name}</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{f.what}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-cyan-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-cyan-300">
                  <span>Open page</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>

          {/* Workflow Guide */}
          {expanded && (
            <div className={`mt-8 rounded-xl border border-slate-200 bg-slate-50/60 p-6 dark:border-white/10 dark:bg-white/[0.04] ${visible ? 'anim-slow' : 'opacity-0'}`} style={visible ? { animation: 'slowScaleIn 1.6s ease-out forwards', animationDelay: '0.8s' } : {}}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                <Compass className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                How this module works
              </h3>
              <div className="mt-5 space-y-4">
                {section.workflow.map((step, i) => (
                  <div
                    key={step.step}
                    className="flex gap-4"
                    style={visible ? { animation: `slowFadeInLeft 2s ease-out forwards`, animationDelay: `${1 + i * 0.3}s`, opacity: 0 } : { opacity: 0 }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 text-xs font-bold text-white shadow-md">
                        {step.step}
                      </span>
                      {i < section.workflow.length - 1 && (
                        <div className="mt-1 h-full w-px bg-gradient-to-b from-cyan-300/50 to-transparent" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{step.title}</p>
                      <p className="mt-0.5 text-sm leading-6 text-slate-600 dark:text-slate-400">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.05]">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Find it in the sidebar: <span className="text-slate-900 dark:text-slate-200">{section.sidebarPath}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
export default function OnboardingPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Update active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = SECTIONS.map((s) => s.id);
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.getBoundingClientRect().top < 300) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Layout>
      <style>{ANIMATION_STYLES}</style>

      <div className="min-h-screen bg-[#f7f9fb] text-slate-950 dark:bg-[#06080d] dark:text-white">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden px-4 pb-8 pt-6 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(14,165,233,0.22),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(16,185,129,0.18),transparent_24%)] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_84%_16%,rgba(74,222,128,0.12),transparent_24%)]" />
          <div className="relative mx-auto max-w-5xl">
            <div className="flex flex-col items-center text-center pt-10 pb-6">
              {/* Orbiting decorative dots */}
              <div className="relative mb-8 h-24 w-24">
                <div className="absolute inset-0 grid place-items-center">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-white shadow-2xl shadow-cyan-500/20">
                    <Sparkles className="h-8 w-8" />
                  </div>
                </div>
                <div className="absolute inset-0" style={{ animation: 'orbit 12s linear infinite' }}>
                  <div className="h-2.5 w-2.5 rounded-full bg-cyan-400/60" />
                </div>
                <div className="absolute inset-0" style={{ animation: 'orbitReverse 18s linear infinite' }}>
                  <div className="h-2 w-2 rounded-full bg-emerald-400/60" />
                </div>
              </div>

              <div className="anim-slow inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-white/70 px-3 py-1.5 text-sm font-semibold text-cyan-800 shadow-sm backdrop-blur dark:bg-white/8 dark:text-cyan-200" style={{ animation: 'slowFadeInUp 2.5s ease-out forwards' }}>
                <MousePointerClick className="h-4 w-4" />
                Getting started guide
              </div>

              <h1 className="anim-slow mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl" style={{ animation: 'slowFadeInUp 2.5s ease-out 0.3s forwards', opacity: 0 }}>
                Every module, explained.
              </h1>

              <p className="anim-slow mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300" style={{ animation: 'slowFadeInUp 2.5s ease-out 0.6s forwards', opacity: 0 }}>
                StockManager is organized into seven areas that mirror how a business actually runs. This guide shows what each area does, where to find it, and how to get started.
              </p>

              <div className="anim-slow mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animation: 'slowFadeInUp 2.5s ease-out 0.9s forwards', opacity: 0 }}>
                {SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-500 ${
                      activeSection === s.id
                        ? 'border-cyan-500/40 bg-cyan-50 text-cyan-800 shadow-sm dark:bg-cyan-950/30 dark:text-cyan-200'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-300/40 hover:text-cyan-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:text-cyan-300'
                    }`}
                  >
                    <s.icon className="h-3.5 w-3.5" />
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Sections ── */}
        <main className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8 space-y-10">
          {SECTIONS.map((section, i) => (
            <SectionCard key={section.id} section={section} index={i} />
          ))}

          {/* ── Footer CTA ── */}
          <div
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-white/[0.04]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-emerald-400/5" />
            <div className="relative">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-white shadow-lg">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">
                Ready to start?
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Your first step is usually the Dashboard, then Products, then your first Purchase Order or Invoice.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link to="/dashboard">
                  <Button className="bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100">
                    Open Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/products">
                  <Button variant="outline" className="border-slate-300 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10">
                    Go to Products
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
