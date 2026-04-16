import { useState } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { 
  Calendar, 
  ShoppingCart, 
  Package, 
  Wallet, 
  ArrowLeftRight,
  Users,
  Truck,
  FileText,
  Receipt,
  Download,
  Eye,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock
} from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
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

const dailyReports: ReportCard[] = [
  {
    id: "sales",
    name: "Daily Sales Summary",
    description: "Total sales, invoices, cash vs credit breakdown, top products",
    icon: ShoppingCart,
    color: "bg-blue-500",
    path: "/reports/daily/sales",
    permission: "reports:daily:read"
  },
  {
    id: "purchases",
    name: "Daily Purchases Summary",
    description: "Goods received, supplier invoices, total purchase value",
    icon: Package,
    color: "bg-green-500",
    path: "/reports/daily/purchases",
    permission: "reports:daily:read"
  },
  {
    id: "cash",
    name: "Daily Cash Position",
    description: "Opening balance, receipts, payments, closing balance per account",
    icon: Wallet,
    color: "bg-amber-500",
    path: "/reports/daily/cash",
    permission: "reports:daily:read"
  },
  {
    id: "stock",
    name: "Daily Stock Movement",
    description: "Stock-in and stock-out transactions with running balances",
    icon: ArrowLeftRight,
    color: "bg-purple-500",
    path: "/reports/daily/stock",
    permission: "reports:daily:read"
  },
  {
    id: "ar",
    name: "Daily AR Activity",
    description: "New invoices, payments received, credit notes",
    icon: Users,
    color: "bg-indigo-500",
    path: "/reports/daily/ar",
    permission: "reports:daily:read"
  },
  {
    id: "ap",
    name: "Daily AP Activity",
    description: "New bills posted, payments made, debit notes",
    icon: Truck,
    color: "bg-rose-500",
    path: "/reports/daily/ap",
    permission: "reports:daily:read"
  },
  {
    id: "journal",
    name: "Daily Journal Entries",
    description: "Every journal entry with debit, credit, narration, and user",
    icon: FileText,
    color: "bg-cyan-500",
    path: "/reports/daily/journal",
    permission: "reports:daily:read"
  },
  {
    id: "tax",
    name: "Daily Tax Collected",
    description: "Output VAT from sales and withholding tax breakdown",
    icon: Receipt,
    color: "bg-emerald-500",
    path: "/reports/daily/tax",
    permission: "reports:daily:read"
  }
];

export default function DailyReportsPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(dailyReportsApi.getToday());
  const [loading, setLoading] = useState<string | null>(null);

  const handleViewReport = (reportId: string) => {
    const report = dailyReports.find(r => r.id === reportId);
    if (report) {
      navigate(`${report.path}?date=${selectedDate}`);
    }
  };

  const handleDownloadPDF = async (reportId: string) => {
    setLoading(reportId);
    try {
      switch (reportId) {
        case "sales":
          await dailyReportsApi.downloadSalesPDF(selectedDate);
          break;
        case "purchases":
          await dailyReportsApi.downloadPurchasesPDF(selectedDate);
          break;
        case "cash":
          await dailyReportsApi.downloadCashPositionPDF(selectedDate);
          break;
        case "stock":
          await dailyReportsApi.downloadStockMovementPDF(selectedDate);
          break;
        case "ar":
          await dailyReportsApi.downloadARActivityPDF(selectedDate);
          break;
        case "ap":
          await dailyReportsApi.downloadAPActivityPDF(selectedDate);
          break;
        case "journal":
          await dailyReportsApi.downloadJournalEntriesPDF(selectedDate);
          break;
        case "tax":
          await dailyReportsApi.downloadTaxCollectedPDF(selectedDate);
          break;
      }
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
        case "sales":
          await dailyReportsApi.downloadSalesExcel(selectedDate);
          break;
        case "purchases":
          await dailyReportsApi.downloadPurchasesExcel(selectedDate);
          break;
        case "cash":
          await dailyReportsApi.downloadCashPositionExcel(selectedDate);
          break;
        case "stock":
          await dailyReportsApi.downloadStockMovementExcel(selectedDate);
          break;
        case "ar":
          await dailyReportsApi.downloadARActivityExcel(selectedDate);
          break;
        case "ap":
          await dailyReportsApi.downloadAPActivityExcel(selectedDate);
          break;
        case "journal":
          await dailyReportsApi.downloadJournalEntriesExcel(selectedDate);
          break;
        case "tax":
          await dailyReportsApi.downloadTaxCollectedExcel(selectedDate);
          break;
      }
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
              <Calendar className="w-8 h-8 text-blue-500" />
              Daily Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Operational snapshots for end-of-day analysis
            </p>
          </div>

          {/* Date Selector */}
          <Card className="w-full md:w-auto">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <label className="text-xs text-muted-foreground">Report Date</label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-40 h-8"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Daily Reports</h3>
            <p className="text-sm text-blue-700">
              These reports cover operational snapshots and are designed to be run at end of day 
              or on demand for any specific calendar date. Select a date above to generate reports 
              for that day.
            </p>
          </div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dailyReports.map((report) => {
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
                      Daily
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
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Stats for {selectedDate}</CardTitle>
            <CardDescription>
              Summary metrics across all daily reports for the selected date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-700">8</div>
                <div className="text-xs text-blue-600">Reports Available</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Download className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-700">16</div>
                <div className="text-xs text-green-600">Export Formats</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-amber-700">Real-time</div>
                <div className="text-xs text-amber-600">Data Updates</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-700">Any Date</div>
                <div className="text-xs text-purple-600">Historical Access</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
