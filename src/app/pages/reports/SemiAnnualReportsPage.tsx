import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import {
  Calculator,
  Calendar,
  CalendarRange,
  Package,
  Receipt,
  Scale,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  ReportCollectionPage,
  type ReportCatalogItem,
  type ReportMetric,
} from "./components/ReportCollectionPage";

const semiAnnualReports: ReportCatalogItem[] = [
  { id: "profit-loss", name: "Profit & Loss (6-Month)", description: "Month-by-month P&L with revenue, COGS, expenses, and net profit totals", icon: TrendingUp, tone: "emerald" },
  { id: "balance-sheet-trend", name: "Balance Sheet Trend", description: "Side-by-side 6-month comparison of assets, liabilities, and equity", icon: Scale, tone: "blue" },
  { id: "cash-flow", name: "Cash Flow Summary", description: "Waterfall cash flow analysis with operating, investing, and financing breakdown", icon: Wallet, tone: "amber" },
  { id: "stock-turnover", name: "Stock Turnover Analysis", description: "Turnover ratios, days inventory outstanding, and dead stock over 90 days", icon: Package, tone: "indigo" },
  { id: "receivables-collection", name: "Receivables Collection", description: "Average days to collect per customer, bad debts, and recovery rates", icon: Users, tone: "cyan" },
  { id: "payroll-hr", name: "Payroll & HR Cost", description: "Total employment costs including salaries, RSSB, benefits, and deductions", icon: Calculator, tone: "rose" },
  { id: "tax-obligations", name: "Tax Obligations", description: "Declared vs remitted tax reconciliation for VAT, PAYE, RSSB, and withholding", icon: Receipt, tone: "violet" },
];

const reportPaths = {
  "profit-loss": "/reports/semi-annual/profit-loss",
  "balance-sheet-trend": "/reports/semi-annual/balance-sheet-trend",
  "cash-flow": "/reports/semi-annual/cash-flow",
  "stock-turnover": "/reports/semi-annual/stock-turnover",
  "receivables-collection": "/reports/semi-annual/receivables-collection",
  "payroll-hr": "/reports/semi-annual/payroll-hr",
  "tax-obligations": "/reports/semi-annual/tax-obligations",
} as const;

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default function SemiAnnualReportsPage() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedPeriod, setSelectedPeriod] = useState<"H1" | "H2">(
    currentMonth <= 6 ? "H1" : "H2"
  );
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const startMonth = selectedPeriod === "H1" ? 1 : 7;
  const endMonth = selectedPeriod === "H1" ? 6 : 12;

  const metrics: ReportMetric[] = [
    { label: "Reports", value: String(semiAnnualReports.length), caption: "Half-year review pack", icon: CalendarRange, tone: "amber" },
    { label: "Coverage", value: "6", caption: "Months in scope", icon: TrendingUp, tone: "emerald" },
    { label: "Period", value: selectedPeriod, caption: `${selectedYear} selected`, icon: Calendar, tone: "blue" },
    { label: "Focus", value: "Trend", caption: "Medium-term analysis", icon: Scale, tone: "violet" },
  ];

  const handleViewReport = (reportId: string) => {
    const path = reportPaths[reportId as keyof typeof reportPaths];
    if (!path) return;
    navigate(`${path}?startYear=${selectedYear}&startMonth=${startMonth}&endYear=${selectedYear}&endMonth=${endMonth}`);
  };

  return (
    <ReportCollectionPage
      title="Semi-Annual Reports"
      subtitle="Six-month analysis reports with trend comparisons for reviews, planning, and board-ready discussion."
      badge="Semi-Annual"
      icon={CalendarRange}
      tone="amber"
      reports={semiAnnualReports}
      metrics={metrics}
      infoTitle="Half-year performance view"
      infoBody="Pick H1 or H2 to open a six-month pack covering financial statements, stock movement, receivables, HR costs, and tax obligations."
      controls={
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Year</label>
            <select value={selectedYear} onChange={(event) => setSelectedYear(parseInt(event.target.value))} className="mt-2 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={selectedPeriod === "H1" ? "default" : "outline"} size="sm" onClick={() => setSelectedPeriod("H1")}>Jan - Jun</Button>
            <Button variant={selectedPeriod === "H2" ? "default" : "outline"} size="sm" onClick={() => setSelectedPeriod("H2")}>Jul - Dec</Button>
          </div>
        </div>
      }
      onBack={() => navigate("/reports")}
      onView={handleViewReport}
    />
  );
}
