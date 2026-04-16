import { useState } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { 
  Calendar, 
  Wallet, 
  Users,
  Truck,
  Receipt,
  Download,
  Eye,
  TrendingUp,
  Clock,
  AlertTriangle,
  BarChart3,
  DollarSign
} from "lucide-react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";
import { toast } from "sonner";

interface ReportCard {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  path: string;
  permission: string;
  hasDatePicker?: boolean;
}

const weeklyReports: ReportCard[] = [
  {
    id: "sales-performance",
    name: "Weekly Sales Performance",
    description: "Compare this week vs last week by value and volume with percentage change",
    icon: TrendingUp,
    color: "bg-blue-500",
    path: "/reports/weekly/sales-performance",
    permission: "reports:weekly:read",
    hasDatePicker: true
  },
  {
    id: "inventory-reorder",
    name: "Inventory Reorder Report",
    description: "Products whose stock level has fallen below their reorder point",
    icon: AlertTriangle,
    color: "bg-amber-500",
    path: "/reports/weekly/inventory-reorder",
    permission: "reports:weekly:read",
    hasDatePicker: false
  },
  {
    id: "supplier-performance",
    name: "Supplier Performance",
    description: "POs raised, deliveries received, pending and overdue per supplier",
    icon: Truck,
    color: "bg-green-500",
    path: "/reports/weekly/supplier-performance",
    permission: "reports:weekly:read",
    hasDatePicker: true
  },
  {
    id: "receivables-aging",
    name: "Receivables Aging",
    description: "Outstanding customer invoices grouped by age buckets",
    icon: DollarSign,
    color: "bg-indigo-500",
    path: "/reports/weekly/receivables-aging",
    permission: "reports:weekly:read",
    hasDatePicker: false
  },
  {
    id: "payables-aging",
    name: "Payables Aging",
    description: "Amounts owed to suppliers grouped by age buckets",
    icon: Receipt,
    color: "bg-rose-500",
    path: "/reports/weekly/payables-aging",
    permission: "reports:weekly:read",
    hasDatePicker: false
  },
  {
    id: "cash-flow",
    name: "Weekly Cash Flow",
    description: "Daily cash in and out across the week with net position",
    icon: Wallet,
    color: "bg-cyan-500",
    path: "/reports/weekly/cash-flow",
    permission: "reports:weekly:read",
    hasDatePicker: true
  },
  {
    id: "payroll-preview",
    name: "Payroll Preview",
    description: "Expected gross pay, PAYE, RSSB contributions, and net pay totals",
    icon: Users,
    color: "bg-purple-500",
    path: "/reports/weekly/payroll-preview",
    permission: "reports:weekly:read",
    hasDatePicker: false
  }
];

export default function WeeklyReportsPage() {
  const navigate = useNavigate();
  const [selectedWeek, setSelectedWeek] = useState(weeklyReportsApi.getDefaultWeek());
  const [loading, setLoading] = useState<string | null>(null); // reportId or reportId-excel

  // Get Sunday date for display
  const getWeekEnd = (monday: string) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  };

  const handleViewReport = (reportId: string) => {
    const report = weeklyReports.find(r => r.id === reportId);
    if (report) {
      if (report.hasDatePicker) {
        navigate(`${report.path}?weekStart=${selectedWeek}`);
      } else {
        navigate(report.path);
      }
    }
  };

  const handleDownloadPDF = async (reportId: string) => {
    setLoading(reportId);
    try {
      switch (reportId) {
        case "sales-performance":
          await weeklyReportsApi.downloadSalesPerformancePDF(selectedWeek);
          break;
        case "inventory-reorder":
          await weeklyReportsApi.downloadInventoryReorderPDF();
          break;
        case "supplier-performance":
          await weeklyReportsApi.downloadSupplierPerformancePDF(selectedWeek);
          break;
        case "receivables-aging":
          await weeklyReportsApi.downloadReceivablesAgingPDF();
          break;
        case "payables-aging":
          await weeklyReportsApi.downloadPayablesAgingPDF();
          break;
        case "cash-flow":
          await weeklyReportsApi.downloadCashFlowPDF(selectedWeek);
          break;
        case "payroll-preview":
          await weeklyReportsApi.downloadPayrollPreviewPDF();
          break;
        default:
          toast.info("PDF download not available for this report");
          return;
      }
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to download PDF");
    } finally {
      setLoading(null);
    }
  };

  const handleDownloadExcel = async (reportId: string) => {
    setLoading(`${reportId}-excel`);
    try {
      switch (reportId) {
        case "sales-performance":
          await weeklyReportsApi.downloadSalesPerformanceExcel(selectedWeek);
          break;
        case "inventory-reorder":
          await weeklyReportsApi.downloadInventoryReorderExcel();
          break;
        case "supplier-performance":
          await weeklyReportsApi.downloadSupplierPerformanceExcel(selectedWeek);
          break;
        case "receivables-aging":
          await weeklyReportsApi.downloadReceivablesAgingExcel();
          break;
        case "payables-aging":
          await weeklyReportsApi.downloadPayablesAgingExcel();
          break;
        case "cash-flow":
          await weeklyReportsApi.downloadCashFlowExcel(selectedWeek);
          break;
        case "payroll-preview":
          await weeklyReportsApi.downloadPayrollPreviewExcel();
          break;
        default:
          toast.info("Excel download not available for this report");
          return;
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
              <Calendar className="w-8 h-8 text-purple-500" />
              Weekly Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Seven-day rolling analysis for management review
            </p>
          </div>

          {/* Week Selector */}
          <Card className="w-full md:w-auto">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <label className="text-xs text-muted-foreground">Week Starting (Monday)</label>
                  <Input
                    type="date"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="w-44 h-8"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Week: {selectedWeek} to {getWeekEnd(selectedWeek)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-purple-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-purple-900">Weekly Reports</h3>
            <p className="text-sm text-purple-700">
              These reports cover a rolling seven-day window, defaulting to the most recently completed 
              Monday-to-Sunday week. Use them for management review, inventory planning, and cash flow monitoring.
            </p>
          </div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {weeklyReports.map((report) => {
            const Icon = report.icon;
            const isLoadingPDF = loading === report.id;
            const isLoadingExcel = loading === `${report.id}-excel`;

            return (
              <Card key={report.id} className="group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`${report.color} p-3 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Weekly
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
                        disabled={isLoadingPDF}
                      >
                        {isLoadingPDF ? (
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
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Weekly Reports Overview</CardTitle>
            <CardDescription>
              Summary of available weekly reports and their purpose
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700">7</div>
                <div className="text-xs text-blue-600">Reports Available</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-700">Performance</div>
                <div className="text-xs text-green-600">Week-over-Week</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-700">7 Days</div>
                <div className="text-xs text-amber-600">Rolling Window</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-700">Any Week</div>
                <div className="text-xs text-purple-600">Historical Access</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
