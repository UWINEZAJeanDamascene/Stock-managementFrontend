import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Download, ArrowLeft, TrendingUp, TrendingDown, Calendar, Minus } from "lucide-react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";
import { useWeeklySalesPerformance } from "@/lib/hooks/useWeeklyReports";
import { toast } from "sonner";

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  return "RWF " + Math.abs(n).toLocaleString("en-RW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const fmtPercent = (n: number) => {
  const sign = n > 0 ? "+" : n < 0 ? "" : "";
  return `${sign}${n.toFixed(1)}%`;
};

const ChangeIndicator = ({ value }: { value: number }) => {
  if (value > 0) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <TrendingUp className="w-4 h-4" />
        <span>{fmtPercent(value)}</span>
      </div>
    );
  } else if (value < 0) {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <TrendingDown className="w-4 h-4" />
        <span>{fmtPercent(value)}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-gray-500">
      <Minus className="w-4 h-4" />
      <span>0%</span>
    </div>
  );
};

export default function WeeklySalesPerformanceReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [weekStart, setWeekStart] = useState(searchParams.get("weekStart") || weeklyReportsApi.getDefaultWeek());
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  // React Query hook for data fetching with caching
  const { data, isLoading, error } = useWeeklySalesPerformance(weekStart);

  // Show error toast when query fails
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load sales performance report");
    }
  }, [error]);

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await weeklyReportsApi.downloadSalesPerformancePDF(weekStart);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to download PDF");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      await weeklyReportsApi.downloadSalesPerformanceExcel(weekStart);
      toast.success("Excel downloaded successfully");
    } catch (error) {
      toast.error("Failed to download Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleWeekChange = (newWeek: string) => {
    setWeekStart(newWeek);
    setSearchParams({ weekStart: newWeek });
  };

  // Get week end date
  const getWeekEnd = (start: string) => {
    const d = new Date(start);
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  };

  return (
    <Layout>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                <span className="hidden sm:inline">Weekly Sales Performance</span>
                <span className="sm:hidden">Sales</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
                Compare this week vs last week by value and volume
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={downloadingPDF}>
              {downloadingPDF ? <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-1 sm:mr-2" />}
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadExcel} disabled={downloadingExcel}>
              {downloadingExcel ? <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-1 sm:mr-2" />}
              <span className="hidden sm:inline">Excel</span>
            </Button>
          </div>
        </div>

        {/* Week Selector */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium whitespace-nowrap">Week Starting:</label>
                  <Input
                    type="date"
                    value={weekStart}
                    onChange={(e) => handleWeekChange(e.target.value)}
                    className="w-40 sm:w-44"
                  />
                </div>
              </div>
              {data && (
                <span className="text-sm text-muted-foreground">
                  {data.weekStart} to {data.weekEnd}
                </span>
              )}
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
          </CardContent>
        </Card>

        {data && !isLoading && (
          <>
            {/* This Week Summary */}
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-lg">This Week</CardTitle>
                <CardDescription>{data.weekStart} to {data.weekEnd}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Sales</CardDescription>
                      <CardTitle className="text-xl text-blue-600">{fmt(data.thisWeek.sales)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Invoices</CardDescription>
                      <CardTitle className="text-xl">{data.thisWeek.invoices}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Orders</CardDescription>
                      <CardTitle className="text-xl">{data.thisWeek.orders}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Items Sold</CardDescription>
                      <CardTitle className="text-xl">{data.thisWeek.items}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Last Week Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-muted-foreground">Last Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Sales</CardDescription>
                      <CardTitle className="text-xl">{fmt(data.lastWeek.sales)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Invoices</CardDescription>
                      <CardTitle className="text-xl">{data.lastWeek.invoices}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Orders</CardDescription>
                      <CardTitle className="text-xl">{data.lastWeek.orders}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Items Sold</CardDescription>
                      <CardTitle className="text-xl">{data.lastWeek.items}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Changes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Change vs Last Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Sales Change</div>
                    <ChangeIndicator value={data.changes.salesPercent} />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Invoices Change</div>
                    <ChangeIndicator value={data.changes.invoicesPercent} />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Orders Change</div>
                    <ChangeIndicator value={data.changes.ordersPercent} />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Items Change</div>
                    <ChangeIndicator value={data.changes.itemsPercent} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
