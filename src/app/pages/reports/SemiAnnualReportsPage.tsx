import { useState } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  CalendarRange,
  TrendingUp,
  Scale,
  Wallet,
  Package,
  Users,
  Calculator,
  Receipt,
  Eye,
  ArrowLeft,
  Calendar,
} from "lucide-react";

interface ReportCard {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  path: string;
}

const semiAnnualReports: ReportCard[] = [
  {
    id: "profit-loss",
    name: "Profit & Loss (6-Month)",
    description: "Month-by-month P&L with revenue, COGS, expenses, and net profit totals",
    icon: TrendingUp,
    color: "bg-emerald-600",
    path: "/reports/semi-annual/profit-loss"
  },
  {
    id: "balance-sheet-trend",
    name: "Balance Sheet Trend",
    description: "Side-by-side 6-month comparison of assets, liabilities, and equity",
    icon: Scale,
    color: "bg-blue-600",
    path: "/reports/semi-annual/balance-sheet-trend"
  },
  {
    id: "cash-flow",
    name: "Cash Flow Summary",
    description: "Waterfall cash flow analysis with operating, investing, and financing breakdown",
    icon: Wallet,
    color: "bg-amber-600",
    path: "/reports/semi-annual/cash-flow"
  },
  {
    id: "stock-turnover",
    name: "Stock Turnover Analysis",
    description: "Turnover ratios, days inventory outstanding, and dead stock (90+ days)",
    icon: Package,
    color: "bg-indigo-600",
    path: "/reports/semi-annual/stock-turnover"
  },
  {
    id: "receivables-collection",
    name: "Receivables Collection",
    description: "Average days to collect per customer, bad debts, and recovery rates",
    icon: Users,
    color: "bg-cyan-600",
    path: "/reports/semi-annual/receivables-collection"
  },
  {
    id: "payroll-hr",
    name: "Payroll & HR Cost",
    description: "Total employment costs including salaries, RSSB, benefits, and deductions",
    icon: Calculator,
    color: "bg-rose-600",
    path: "/reports/semi-annual/payroll-hr"
  },
  {
    id: "tax-obligations",
    name: "Tax Obligations",
    description: "Declared vs remitted tax reconciliation for VAT, PAYE, RSSB, and withholding",
    icon: Receipt,
    color: "bg-violet-600",
    path: "/reports/semi-annual/tax-obligations"
  }
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

// Determine default period (H1 or H2)
const getDefaultPeriod = () => {
  if (currentMonth <= 6) {
    return { startYear: currentYear, startMonth: 1, endYear: currentYear, endMonth: 6 };
  } else {
    return { startYear: currentYear, startMonth: 7, endYear: currentYear, endMonth: 12 };
  }
};

export default function SemiAnnualReportsPage() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedPeriod, setSelectedPeriod] = useState<"H1" | "H2" | "custom">(currentMonth <= 6 ? "H1" : "H2");

  const handleViewReport = (reportPath: string) => {
    let startMonth, endMonth;
    
    if (selectedPeriod === "H1") {
      startMonth = 1;
      endMonth = 6;
    } else if (selectedPeriod === "H2") {
      startMonth = 7;
      endMonth = 12;
    } else {
      // For custom, we'll use H1 as default for now
      startMonth = 1;
      endMonth = 6;
    }
    
    navigate(`${reportPath}?startYear=${selectedYear}&startMonth=${startMonth}&endYear=${selectedYear}&endMonth=${endMonth}`);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/reports')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <CalendarRange className="w-8 h-8 text-amber-600" />
                Semi-Annual Reports
              </h1>
              <p className="text-muted-foreground mt-1">
                Six-month analysis reports with trend comparisons
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">Report Period:</span>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <Button
                    variant={selectedPeriod === "H1" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod("H1")}
                  >
                    Jan - Jun
                  </Button>
                  <Button
                    variant={selectedPeriod === "H2" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod("H2")}
                  >
                    Jul - Dec
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {semiAnnualReports.map((report) => {
            const Icon = report.icon;

            return (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`${report.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                      Semi-Annual
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{report.name}</CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {report.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => handleViewReport(report.path)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Report
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-800">About Semi-Annual Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 mb-4">
              Semi-annual reports provide a comprehensive 6-month view of your business performance. 
              These reports are useful for:
            </p>
            <ul className="text-sm text-amber-700 space-y-2 list-disc list-inside">
              <li>Half-year financial reviews and board presentations</li>
              <li>Identifying trends and patterns across six months</li>
              <li>Regulatory compliance and tax planning</li>
              <li>Comparative analysis with prior periods</li>
              <li>Strategic decision making based on medium-term data</li>
            </ul>
          </CardContent>
        </Card>

        {/* Footer Stats */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>
              Summary of semi-annual reporting capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <CalendarRange className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-700">7</div>
                <div className="text-xs text-amber-600">Reports Available</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-700">6</div>
                <div className="text-xs text-emerald-600">Months Covered</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700">H1/H2</div>
                <div className="text-xs text-blue-600">Period Options</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Scale className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-700">Trend</div>
                <div className="text-xs text-purple-600">Analysis</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
