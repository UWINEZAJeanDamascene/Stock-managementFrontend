import { useState } from "react";
import { Layout } from "../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { 
  Calendar, 
  Sun,
  Clock,
  CalendarDays,
  CalendarRange,
  FileText,
  RefreshCw,
  TrendingUp,
  BarChart3,
  PieChart,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router";

interface ReportCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  path: string;
  reportCount: number;
  lastGenerated?: string;
  features: string[];
}

const reportCategories: ReportCategory[] = [
  {
    id: "daily",
    name: "Daily Reports",
    description: "Operational snapshots for end-of-day analysis including sales, purchases, cash position, stock movement, and journal entries.",
    icon: Sun,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    path: "/reports/daily",
    reportCount: 8,
    features: [
      "Sales Summary",
      "Purchases Summary", 
      "Cash Position",
      "Stock Movement",
      "AR/AP Activity",
      "Journal Entries",
      "Tax Collected"
    ]
  },
  {
    id: "weekly",
    name: "Weekly Reports",
    description: "Seven-day rolling analysis covering sales performance, inventory, supplier metrics, aging reports, cash flow, and payroll.",
    icon: CalendarDays,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    path: "/reports/weekly",
    reportCount: 7,
    features: [
      "Sales Performance",
      "Inventory Reorder",
      "Supplier Performance",
      "Receivables Aging",
      "Payables Aging",
      "Cash Flow Summary",
      "Payroll Preview"
    ]
  },
  {
    id: "monthly",
    name: "Monthly Reports",
    description: "Comprehensive management accounting reports with prior month and YTD comparisons including P&L, Balance Sheet, and aging analysis.",
    icon: BarChart3,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    path: "/reports/monthly",
    reportCount: 15,
    features: [
      "Profit & Loss Statement",
      "Balance Sheet",
      "Trial Balance",
      "Cash Flow Statement",
      "Stock Valuation",
      "Sales by Customer",
      "Sales by Category",
      "Purchases by Supplier",
      "AR Aging",
      "AP Aging",
      "Payroll Summary",
      "VAT Return",
      "Bank Reconciliation",
      "Budget vs Actual",
      "General Ledger"
    ]
  },
  {
    id: "semi-annual",
    name: "Semi-Annual Reports",
    description: "Six-month analysis reports covering P&L trends, balance sheet comparisons, cash flow, stock turnover, receivables collection, payroll costs, and tax obligations.",
    icon: CalendarRange,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    path: "/reports/semi-annual",
    reportCount: 7,
    features: [
      "Profit & Loss (6-Month)",
      "Balance Sheet Trend",
      "Cash Flow Summary",
      "Stock Turnover Analysis",
      "Receivables Collection",
      "Payroll & HR Cost",
      "Tax Obligations"
    ]
  },
  {
    id: "annual",
    name: "Annual Reports",
    description: "Complete year-end financial statements, audit reports, and comprehensive business analysis for external stakeholders.",
    icon: BarChart3,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    path: "/reports/annual",
    reportCount: 10,
    features: [
      "Financial Statements (IFRS)",
      "General Ledger",
      "Fixed Asset Schedule",
      "Inventory Reconciliation",
      "Accounts Receivable",
      "Accounts Payable",
      "Payroll & Benefits",
      "Tax Summary (RRA)",
      "Budget vs Actual",
      "Audit Trail"
    ]
  }
];

export default function ReportsHubPage() {
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const handleRefresh = () => {
    setLastRefreshed(new Date());
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="w-8 h-8 text-primary" />
              Reports Hub
            </h1>
            <p className="text-muted-foreground mt-1">
              Centralized access to all financial and operational reports
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Reports</p>
                  <p className="text-2xl font-bold">47+</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <PieChart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Export Formats</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Access Level</p>
                  <p className="text-lg font-bold">Role-based</p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {reportCategories.map((category) => {
            const Icon = category.icon;

            return (
              <Card key={category.id} className="group hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`${category.bgColor} p-4 rounded-xl`}>
                      <Icon className={`w-8 h-8 ${category.color}`} />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {category.reportCount} Reports
                      </Badge>
                      {category.lastGenerated && (
                        <span className="text-xs text-muted-foreground">
                          Updated {category.lastGenerated}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <CardTitle className="text-xl mt-4 group-hover:text-primary transition-colors">
                    {category.name}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {category.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Features List */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">INCLUDES:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {category.features.slice(0, 4).map((feature, idx) => (
                        <span 
                          key={idx}
                          className="text-xs bg-muted px-2 py-1 rounded-md"
                        >
                          {feature}
                        </span>
                      ))}
                      {category.features.length > 4 && (
                        <span className="text-xs bg-muted px-2 py-1 rounded-md">
                          +{category.features.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link to={category.path} className="block">
                    <Button 
                      className="w-full group/btn"
                      variant={category.id === "daily" ? "default" : "outline"}
                    >
                      View Reports
                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Access Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>
              Most frequently accessed reports based on your role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/reports/daily" className="block">
                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Sun className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Daily Summary</p>
                      <p className="text-xs text-muted-foreground">Sales, Cash, Stock</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link to="/reports/profit-loss" className="block">
                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">P&L Statement</p>
                      <p className="text-xs text-muted-foreground">Profit & Loss</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link to="/reports/balance-sheet" className="block">
                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Balance Sheet</p>
                      <p className="text-xs text-muted-foreground">Assets & Liabilities</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link to="/reports/cash-flow" className="block">
                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <Calendar className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium">Cash Flow</p>
                      <p className="text-xs text-muted-foreground">Inflows & Outflows</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>
            All reports respect multi-tenant architecture and are scoped by company_id.
            <br />
            Access is controlled by role permissions. Monetary values shown in Rwandan Francs (RWF).
          </p>
        </div>
      </div>
    </Layout>
  );
}
