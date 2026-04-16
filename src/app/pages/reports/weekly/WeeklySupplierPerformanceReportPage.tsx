import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, ArrowLeft, Truck, Calendar, Download } from "lucide-react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";
import { useWeeklySupplierPerformance } from "@/lib/hooks/useWeeklyReports";
import { toast } from "sonner";

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  return "RWF " + Math.abs(n).toLocaleString("en-RW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default function WeeklySupplierPerformanceReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [weekStart, setWeekStart] = useState(searchParams.get("weekStart") || weeklyReportsApi.getDefaultWeek());
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const { data, isLoading, error } = useWeeklySupplierPerformance(weekStart);

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load supplier performance report");
    }
    if (data) {
      console.log('Supplier Performance Data:', data);
      console.log('Suppliers array:', data.suppliers);
      console.log('Suppliers count:', data.suppliers?.length);
    }
  }, [error, data]);

  const handleWeekChange = (newWeek: string) => {
    setWeekStart(newWeek);
    setSearchParams({ weekStart: newWeek });
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await weeklyReportsApi.downloadSupplierPerformancePDF(weekStart);
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
      await weeklyReportsApi.downloadSupplierPerformanceExcel(weekStart);
      toast.success("Excel downloaded successfully");
    } catch (error) {
      toast.error("Failed to download Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  return (
    <Layout>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                <span className="hidden sm:inline">Weekly Supplier Performance</span>
                <span className="sm:hidden">Suppliers</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
                POs raised, deliveries received, pending and overdue orders
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

        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium whitespace-nowrap">Week Starting:</label>
                  <Input type="date" value={weekStart} onChange={(e) => handleWeekChange(e.target.value)} className="w-40 sm:w-44" />
                </div>
              </div>
              {data && <span className="text-sm text-muted-foreground">{data.weekStart} to {data.weekEnd}</span>}
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
          </CardContent>
        </Card>

        {data && !isLoading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardHeader className="pb-2"><CardDescription>POs Raised</CardDescription><CardTitle className="text-xl">{data.summary.totalPosRaised}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Deliveries</CardDescription><CardTitle className="text-xl">{data.summary.totalDeliveries}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Pending</CardDescription><CardTitle className="text-xl">{data.summary.totalPending}</CardTitle></CardHeader></Card>
              <Card className="border-red-200"><CardHeader className="pb-2"><CardDescription className="text-red-600">Overdue</CardDescription><CardTitle className="text-xl text-red-600">{data.summary.totalOverdue}</CardTitle></CardHeader></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Supplier Details</CardTitle></CardHeader>
              <CardContent>
                {data.suppliers && data.suppliers.length > 0 ? (
                  <div className="space-y-4">
                    {data.suppliers.map((supplier) => (
                      <div key={supplier.supplierId} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">{supplier.supplierName}</h3>
                          {supplier.overdueDeliveries?.count > 0 && <Badge variant="destructive">{supplier.overdueDeliveries.count} Overdue</Badge>}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div><span className="text-muted-foreground">POs:</span> {supplier.posRaised?.count || 0} ({fmt(supplier.posRaised?.value || 0)})</div>
                          <div><span className="text-muted-foreground">Delivered:</span> {supplier.deliveriesReceived?.count || 0} ({fmt(supplier.deliveriesReceived?.value || 0)})</div>
                          <div><span className="text-muted-foreground">Pending:</span> {supplier.pendingOrders?.count || 0}</div>
                          <div><span className="text-muted-foreground">Overdue:</span> {supplier.overdueDeliveries?.count || 0}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No supplier details available (suppliers: {data.suppliers?.length || 0})
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
