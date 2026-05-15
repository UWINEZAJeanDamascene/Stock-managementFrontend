import { useState } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3,
  BookOpen,
  Building2,
  Calculator,
  Calendar,
  FileText,
  Package,
  Receipt,
  Scale,
  ShieldCheck,
  Target,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import {
  ReportCollectionPage,
  type ReportCatalogItem,
  type ReportMetric,
} from "./components/ReportCollectionPage";

const annualReports: ReportCatalogItem[] = [
  { id: "financial-statements", name: "Financial Statements", description: "Full IFRS-compliant Income Statement, Balance Sheet, and Cash Flow with prior year comparison", icon: BarChart3, tone: "blue" },
  { id: "general-ledger", name: "General Ledger", description: "Every transaction posted to every account across the full year, exportable for audit", icon: BookOpen, tone: "slate" },
  { id: "fixed-assets", name: "Fixed Asset Schedule", description: "Opening book value, additions, disposals, depreciation charged, and closing value by asset class", icon: Building2, tone: "indigo" },
  { id: "inventory", name: "Inventory Reconciliation", description: "Opening stock, purchases, COGS, and closing stock reconciled to balance sheet", icon: Package, tone: "amber" },
  { id: "accounts-receivable", name: "Accounts Receivable Summary", description: "Credit sales, cash collected, bad debts, and year-end outstanding balance per customer", icon: Users, tone: "emerald" },
  { id: "accounts-payable", name: "Accounts Payable Summary", description: "Credit purchases, cash paid, and year-end outstanding balance per supplier", icon: Truck, tone: "rose" },
  { id: "payroll", name: "Payroll & Benefits Report", description: "Full year payroll with monthly subtotals and year-end totals for audit and RSSB reconciliation", icon: Calculator, tone: "cyan" },
  { id: "tax-summary", name: "Tax Summary Report", description: "Annual VAT reconciliation, PAYE, RSSB contributions, and withholding taxes for RRA filing", icon: Receipt, tone: "violet" },
  { id: "budget-vs-actual", name: "Budget vs Actual", description: "Every budget line against actual results with variances for next year's budgeting", icon: Target, tone: "orange" },
  { id: "audit-trail", name: "Audit Trail Report", description: "All system users, their actions, posting dates, and any reversals or adjustments made", icon: ShieldCheck, tone: "teal" },
];

const reportPaths = Object.fromEntries(
  annualReports.map((report) => [report.id, `/reports/annual/${report.id}`])
) as Record<string, string>;

const currentYear = new Date().getFullYear();

export default function AnnualReportsPage() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const metrics: ReportMetric[] = [
    { label: "Reports", value: String(annualReports.length), caption: `${selectedYear} statutory pack`, icon: FileText, tone: "rose" },
    { label: "Standard", value: "IFRS", caption: "Statement presentation", icon: TrendingUp, tone: "blue" },
    { label: "Coverage", value: "12", caption: "Months in scope", icon: BarChart3, tone: "emerald" },
    { label: "Readiness", value: "Audit", caption: "External review support", icon: Scale, tone: "amber" },
  ];

  const handleViewReport = (reportId: string) => {
    const path = reportPaths[reportId];
    if (path) navigate(`${path}?year=${selectedYear}`);
  };

  return (
    <ReportCollectionPage
      title="Annual Reports"
      subtitle="Full-year statutory and strategic reports for external stakeholders, audits, regulatory filing, and planning."
      badge="Annual"
      icon={Calendar}
      tone="rose"
      reports={annualReports}
      metrics={metrics}
      infoTitle="Year-end reporting pack"
      infoBody="Select the reporting year to open audit-ready financial statements, ledger support, tax schedules, payroll summaries, and operating reconciliations."
      controls={
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Report Year</label>
          <select value={selectedYear} onChange={(event) => setSelectedYear(parseInt(event.target.value))} className="mt-2 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950">
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
      }
      onBack={() => navigate("/reports")}
      onView={handleViewReport}
    />
  );
}
