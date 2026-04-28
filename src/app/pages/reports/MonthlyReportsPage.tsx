import { useState } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import {
  Calendar,
  TrendingUp,
  Scale,
  FileSpreadsheet,
  Wallet,
  Package,
  Users,
  Tags,
  Truck,
  Clock,
  AlertCircle,
  Receipt,
  Calculator,
  Landmark,
  Target,
  BookOpen,
  Download,
  Eye,
  TrendingDown,
  BarChart3
} from "lucide-react";
import { monthlyReportsApi } from "@/lib/api.monthlyReports";
import { toast } from "sonner";

interface ReportCard {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  path: string;
  permission: string;
}

const monthlyReports: ReportCard[] = [
  {
    id: "profit-loss",
    name: "Profit & Loss Statement",
    description: "Revenue, COGS, gross profit, operating expenses, EBITDA, depreciation, interest, net profit",
    icon: TrendingUp,
    color: "bg-emerald-500",
    path: "/reports/monthly/profit-loss",
    permission: "reports:monthly:read"
  },
  {
    id: "balance-sheet",
    name: "Balance Sheet",
    description: "Assets, liabilities, equity with prior month comparison",
    icon: Scale,
    color: "bg-blue-500",
    path: "/reports/monthly/balance-sheet",
    permission: "reports:monthly:read"
  },
  {
    id: "trial-balance",
    name: "Trial Balance",
    description: "All accounts with debit/credit balances confirming agreement",
    icon: FileSpreadsheet,
    color: "bg-purple-500",
    path: "/reports/monthly/trial-balance",
    permission: "reports:monthly:read"
  },
  {
    id: "cash-flow",
    name: "Cash Flow Statement",
    description: "Operating, investing, financing activities - indirect method",
    icon: Wallet,
    color: "bg-amber-500",
    path: "/reports/monthly/cash-flow",
    permission: "reports:monthly:read"
  },
  {
    id: "stock-valuation",
    name: "Stock Valuation",
    description: "Inventory with weighted average cost, total value, slow-moving flags",
    icon: Package,
    color: "bg-indigo-500",
    path: "/reports/monthly/stock-valuation",
    permission: "reports:monthly:read"
  },
  {
    id: "sales-by-customer",
    name: "Sales by Customer",
    description: "Ranked customer list by revenue with AOV and outstanding balance",
    icon: Users,
    color: "bg-cyan-500",
    path: "/reports/monthly/sales-by-customer",
    permission: "reports:monthly:read"
  },
  {
    id: "sales-by-category",
    name: "Sales by Category",
    description: "Revenue and units by product category with gross margin",
    icon: Tags,
    color: "bg-teal-500",
    path: "/reports/monthly/sales-by-category",
    permission: "reports:monthly:read"
  },
  {
    id: "purchases-by-supplier",
    name: "Purchases by Supplier",
    description: "Ranked suppliers with PO count and order vs invoiced variance",
    icon: Truck,
    color: "bg-orange-500",
    path: "/reports/monthly/purchases-by-supplier",
    permission: "reports:monthly:read"
  },
  {
    id: "ar-aging",
    name: "Accounts Receivable Aging",
    description: "30/60/90/90+ day buckets with provision for doubtful debts",
    icon: Clock,
    color: "bg-rose-500",
    path: "/reports/monthly/ar-aging",
    permission: "reports:monthly:read"
  },
  {
    id: "ap-aging",
    name: "Accounts Payable Aging",
    description: "30/60/90/90+ day bucket structure for payables",
    icon: AlertCircle,
    color: "bg-pink-500",
    path: "/reports/monthly/ap-aging",
    permission: "reports:monthly:read"
  },
  {
    id: "payroll-summary",
    name: "Payroll Summary",
    description: "Employee-level detail: gross, PAYE, RSSB, deductions, net pay",
    icon: Receipt,
    color: "bg-violet-500",
    path: "/reports/monthly/payroll-summary",
    permission: "reports:monthly:read"
  },
  {
    id: "vat-return",
    name: "VAT Return Worksheet",
    description: "Output/input VAT, net payable/reclaimable, RRA filing format",
    icon: Calculator,
    color: "bg-lime-500",
    path: "/reports/monthly/vat-return",
    permission: "reports:monthly:read"
  },
  {
    id: "bank-reconciliation",
    name: "Bank Reconciliation",
    description: "Book balance, outstanding items, bank balance, reconciling items",
    icon: Landmark,
    color: "bg-sky-500",
    path: "/reports/monthly/bank-reconciliation",
    permission: "reports:monthly:read"
  },
  {
    id: "budget-vs-actual",
    name: "Budget vs Actual",
    description: "Expense/revenue vs budget with variance in value and percentage",
    icon: Target,
    color: "bg-fuchsia-500",
    path: "/reports/monthly/budget-vs-actual",
    permission: "reports:monthly:read"
  },
  {
    id: "general-ledger",
    name: "General Ledger Activity",
    description: "Monthly GL movements by account with transaction counts",
    icon: BookOpen,
    color: "bg-slate-500",
    path: "/reports/monthly/general-ledger",
    permission: "reports:monthly:read"
  }
];

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MonthlyReportsPage() {
  const navigate = useNavigate();
  const current = monthlyReportsApi.getCurrentMonth();
  const [selectedYear, setSelectedYear] = useState(current.year);
  const [selectedMonth, setSelectedMonth] = useState(current.month);
  const [loading, setLoading] = useState<string | null>(null);

  const handleViewReport = (reportId: string) => {
    const report = monthlyReports.find(r => r.id === reportId);
    if (report) {
      navigate(`${report.path}?year=${selectedYear}&month=${selectedMonth}`);
    }
  };

  const handleDownloadPDF = async (reportId: string) => {
    setLoading(reportId);
    try {
      switch (reportId) {
        case "profit-loss":
          await monthlyReportsApi.downloadProfitAndLossPDF(selectedYear, selectedMonth);
          break;
        case "balance-sheet":
          await monthlyReportsApi.downloadBalanceSheetPDF(selectedYear, selectedMonth);
          break;
        case "trial-balance":
          await monthlyReportsApi.downloadTrialBalancePDF(selectedYear, selectedMonth);
          break;
        case "cash-flow":
          await monthlyReportsApi.downloadCashFlowPDF(selectedYear, selectedMonth);
          break;
        case "stock-valuation":
          await monthlyReportsApi.downloadStockValuationPDF(selectedYear, selectedMonth);
          break;
        case "sales-by-customer":
          await monthlyReportsApi.downloadSalesByCustomerPDF(selectedYear, selectedMonth);
          break;
        case "sales-by-category":
          await monthlyReportsApi.downloadSalesByCategoryPDF(selectedYear, selectedMonth);
          break;
        case "purchases-by-supplier":
          await monthlyReportsApi.downloadPurchasesBySupplierPDF(selectedYear, selectedMonth);
          break;
        case "ar-aging":
          await monthlyReportsApi.downloadARAgingPDF(selectedYear, selectedMonth);
          break;
        case "ap-aging":
          await monthlyReportsApi.downloadAPAgingPDF(selectedYear, selectedMonth);
          break;
        case "payroll-summary":
          await monthlyReportsApi.downloadPayrollSummaryPDF(selectedYear, selectedMonth);
          break;
        case "vat-return":
          await monthlyReportsApi.downloadVATReturnPDF(selectedYear, selectedMonth);
          break;
        case "bank-reconciliation":
          await monthlyReportsApi.downloadBankReconciliationPDF(selectedYear, selectedMonth);
          break;
        case "budget-vs-actual":
          await monthlyReportsApi.downloadBudgetVsActualPDF(selectedYear, selectedMonth);
          break;
        case "general-ledger":
          await monthlyReportsApi.downloadGeneralLedgerPDF(selectedYear, selectedMonth);
          break;
      }
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to download PDF");
    } finally {
      setLoading(null);
    }
  };

  const handleDownloadExcel = async (reportId: string) => {
    setLoading(reportId + "-excel");
    try {
      switch (reportId) {
        case "profit-loss":
          await monthlyReportsApi.downloadProfitAndLossExcel(selectedYear, selectedMonth);
          break;
        case "balance-sheet":
          await monthlyReportsApi.downloadBalanceSheetExcel(selectedYear, selectedMonth);
          break;
        case "trial-balance":
          await monthlyReportsApi.downloadTrialBalanceExcel(selectedYear, selectedMonth);
          break;
        case "cash-flow":
          await monthlyReportsApi.downloadCashFlowExcel(selectedYear, selectedMonth);
          break;
        case "stock-valuation":
          await monthlyReportsApi.downloadStockValuationExcel(selectedYear, selectedMonth);
          break;
        case "sales-by-customer":
          await monthlyReportsApi.downloadSalesByCustomerExcel(selectedYear, selectedMonth);
          break;
        case "sales-by-category":
          await monthlyReportsApi.downloadSalesByCategoryExcel(selectedYear, selectedMonth);
          break;
        case "purchases-by-supplier":
          await monthlyReportsApi.downloadPurchasesBySupplierExcel(selectedYear, selectedMonth);
          break;
        case "ar-aging":
          await monthlyReportsApi.downloadARAgingExcel(selectedYear, selectedMonth);
          break;
        case "ap-aging":
          await monthlyReportsApi.downloadAPAgingExcel(selectedYear, selectedMonth);
          break;
        case "payroll-summary":
          await monthlyReportsApi.downloadPayrollSummaryExcel(selectedYear, selectedMonth);
          break;
        case "vat-return":
          await monthlyReportsApi.downloadVATReturnExcel(selectedYear, selectedMonth);
          break;
        case "bank-reconciliation":
          await monthlyReportsApi.downloadBankReconciliationExcel(selectedYear, selectedMonth);
          break;
        case "budget-vs-actual":
          await monthlyReportsApi.downloadBudgetVsActualExcel(selectedYear, selectedMonth);
          break;
        case "general-ledger":
          await monthlyReportsApi.downloadGeneralLedgerExcel(selectedYear, selectedMonth);
          break;
      }
      toast.success("Excel downloaded successfully");
    } catch (error) {
      toast.error("Failed to download Excel");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Calendar className="w-8 h-8 text-emerald-500" />
              Monthly Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive management accounting reports with prior month and YTD comparisons
            </p>
          </div>

          {/* Month/Year Selector */}
          <Card className="w-full md:w-auto">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div className="flex gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Year</label>
                    <Input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-24 h-8"
                      min={2020}
                      max={2100}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Month</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="h-8 w-32 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      {monthNames.map((name, index) => (
                        <option key={index + 1} value={index + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
          <BarChart3 className="w-5 h-5 text-emerald-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-emerald-900">Monthly Management Reports</h3>
            <p className="text-sm text-emerald-700">
              These comprehensive reports provide management accounting insights with prior month
              comparisons and year-to-date analysis. Select a month and year above to generate reports.
            </p>
          </div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {monthlyReports.map((report) => {
            const Icon = report.icon;
            const isLoading = loading === report.id;
            const isLoadingExcel = loading === report.id + "-excel";

            return (
              <Card key={report.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`${report.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Monthly
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{report.name}</CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {report.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => handleViewReport(report.id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Report
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownloadPDF(report.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                        ) : (
                          <Download className="w-4 h-4 mr-1" />
                        )}
                        PDF
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownloadExcel(report.id)}
                        disabled={isLoadingExcel}
                      >
                        {isLoadingExcel ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                        ) : (
                          <Download className="w-4 h-4 mr-1" />
                        )}
                        Excel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary Stats */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>Quick Stats for {monthNames[selectedMonth - 1]} {selectedYear}</CardTitle>
            <CardDescription>
              Summary metrics across all reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-700">15</div>
                <div className="text-xs text-emerald-600">Reports Available</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Download className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700">30</div>
                <div className="text-xs text-blue-600">Export Formats</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <Calendar className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-700">Monthly</div>
                <div className="text-xs text-amber-600">Period Coverage</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <TrendingDown className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-700">YTD</div>
                <div className="text-xs text-purple-600">Comparisons</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
