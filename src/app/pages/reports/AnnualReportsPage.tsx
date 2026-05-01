import { useState } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Calendar,
  BarChart3,
  BookOpen,
  Building2,
  Package,
  Users,
  Truck,
  Calculator,
  Receipt,
  Target,
  ShieldCheck,
  Eye,
  ArrowLeft,
  FileText,
  TrendingUp,
  Scale,
} from "lucide-react";

interface ReportCard {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  path: string;
}

const annualReports: ReportCard[] = [
  {
    id: "financial-statements",
    name: "Financial Statements",
    description: "Full IFRS-compliant Income Statement, Balance Sheet, and Cash Flow with prior year comparison",
    icon: BarChart3,
    color: "bg-blue-600",
    path: "/reports/annual/financial-statements"
  },
  {
    id: "general-ledger",
    name: "General Ledger",
    description: "Every transaction posted to every account across the full year, exportable for audit",
    icon: BookOpen,
    color: "bg-slate-600",
    path: "/reports/annual/general-ledger"
  },
  {
    id: "fixed-assets",
    name: "Fixed Asset Schedule",
    description: "Opening book value, additions, disposals, depreciation charged, and closing value by asset class",
    icon: Building2,
    color: "bg-indigo-600",
    path: "/reports/annual/fixed-assets"
  },
  {
    id: "inventory",
    name: "Inventory Reconciliation",
    description: "Opening stock, purchases, COGS, and closing stock reconciled to balance sheet",
    icon: Package,
    color: "bg-amber-600",
    path: "/reports/annual/inventory"
  },
  {
    id: "accounts-receivable",
    name: "Accounts Receivable Summary",
    description: "Credit sales, cash collected, bad debts, and year-end outstanding balance per customer",
    icon: Users,
    color: "bg-emerald-600",
    path: "/reports/annual/accounts-receivable"
  },
  {
    id: "accounts-payable",
    name: "Accounts Payable Summary",
    description: "Credit purchases, cash paid, and year-end outstanding balance per supplier",
    icon: Truck,
    color: "bg-rose-600",
    path: "/reports/annual/accounts-payable"
  },
  {
    id: "payroll",
    name: "Payroll & Benefits Report",
    description: "Full year payroll with monthly subtotals and year-end totals for audit and RSSB reconciliation",
    icon: Calculator,
    color: "bg-cyan-600",
    path: "/reports/annual/payroll"
  },
  {
    id: "tax-summary",
    name: "Tax Summary Report",
    description: "Annual VAT reconciliation, PAYE, RSSB contributions, and withholding taxes for RRA filing",
    icon: Receipt,
    color: "bg-violet-600",
    path: "/reports/annual/tax-summary"
  },
  {
    id: "budget-vs-actual",
    name: "Budget vs Actual",
    description: "Every budget line against actual results with variances for next year's budgeting",
    icon: Target,
    color: "bg-orange-600",
    path: "/reports/annual/budget-vs-actual"
  },
  {
    id: "audit-trail",
    name: "Audit Trail Report",
    description: "All system users, their actions, posting dates, and any reversals or adjustments made",
    icon: ShieldCheck,
    color: "bg-teal-600",
    path: "/reports/annual/audit-trail"
  }
];

const currentYear = new Date().getFullYear();

export default function AnnualReportsPage() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const handleViewReport = (reportPath: string) => {
    navigate(`${reportPath}?year=${selectedYear}`);
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
                <Calendar className="w-8 h-8 text-rose-600" />
                Annual Reports
              </h1>
              <p className="text-muted-foreground mt-1">
                Full-year statutory and strategic reports for external stakeholders
              </p>
            </div>
          </div>
        </div>

        {/* Year Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">Report Year:</span>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {annualReports.map((report) => {
            const Icon = report.icon;

            return (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`${report.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-700">
                      Annual
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
        <Card className="bg-rose-50 border-rose-200">
          <CardHeader>
            <CardTitle className="text-rose-800">About Annual Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-rose-700 mb-4">
              Annual reports provide comprehensive full-year financial and operational data 
              suitable for external stakeholders, audits, and regulatory compliance. These reports include:
            </p>
            <ul className="text-sm text-rose-700 space-y-2 list-disc list-inside">
              <li>IFRS-compliant financial statements with prior year comparison</li>
              <li>Complete general ledger for external audit purposes</li>
              <li>Fixed asset movements and depreciation schedules</li>
              <li>Inventory valuation reconciled to balance sheet</li>
              <li>Customer and supplier transaction summaries</li>
              <li>Full-year payroll with monthly breakdowns for RSSB reconciliation</li>
              <li>Tax summaries suitable for RRA annual filing</li>
              <li>Budget performance analysis for future planning</li>
              <li>Complete audit trail of system activities and adjustments</li>
            </ul>
          </CardContent>
        </Card>

        {/* Footer Stats */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>
              Summary of annual reporting capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-rose-50 rounded-lg">
                <FileText className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-rose-700">10</div>
                <div className="text-xs text-rose-600">Reports Available</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700">IFRS</div>
                <div className="text-xs text-blue-600">Standard Format</div>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-emerald-700">12</div>
                <div className="text-xs text-emerald-600">Months Covered</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <Scale className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-700">Audit</div>
                <div className="text-xs text-amber-600">Ready</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-700">RRA</div>
                <div className="text-xs text-purple-600">Compliant</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
