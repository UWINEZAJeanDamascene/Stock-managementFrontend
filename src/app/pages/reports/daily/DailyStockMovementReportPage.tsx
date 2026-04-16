import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Download, ArrowLeft, ArrowLeftRight, Calendar, Package } from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
import { useDailyStockMovement } from "@/lib/hooks/useDailyReports";
import { toast } from "sonner";

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  return "RWF " + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function DailyStockMovementReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null);

  // React Query hook for data fetching with caching
  const { data, isLoading, error } = useDailyStockMovement(date);

  // Show error toast when query fails
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load stock movement");
    }
  }, [error]);

  const handleDownloadPDF = async () => {
    setDownloading('pdf');
    try {
      await dailyReportsApi.downloadStockMovementPDF(date);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading('excel');
    try {
      await dailyReportsApi.downloadStockMovementExcel(date);
      toast.success("Excel downloaded successfully");
    } catch (error) {
      toast.error("Failed to download Excel");
    } finally {
      setDownloading(null);
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
                <ArrowLeftRight className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                <span className="hidden sm:inline">Daily Stock Movement</span>
                <span className="sm:hidden">Stock</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">Stock-in and stock-out transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={downloading === 'pdf'}>
              {downloading === 'pdf' ? <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-1 sm:mr-2" />}
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadExcel} disabled={downloading === 'excel'}>
              {downloading === 'excel' ? <Loader2 className="w-4 h-4 mr-1 sm:mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-1 sm:mr-2" />}
              <span className="hidden sm:inline">Excel</span>
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Report Date:</label>
                <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setSearchParams({ date: e.target.value }); }} className="w-40" />
              </div>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
          </CardContent>
        </Card>

        {data && !isLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardHeader className="pb-2"><CardDescription>Total Movements</CardDescription><CardTitle className="text-2xl">{data.summary.totalMovements}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Stock In</CardDescription><CardTitle className="text-2xl text-green-600">{data.summary.stockInCount}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Stock Out</CardDescription><CardTitle className="text-2xl text-red-500">{data.summary.stockOutCount}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Net Value</CardDescription><CardTitle className={`text-2xl ${data.summary.netMovement >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(data.summary.netMovement)}</CardTitle></CardHeader></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" />Movement Details</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {data.movements?.slice(0, 50).map((m: { type: string; productName: string; warehouse: string; quantity: number; totalValue: number; runningBalance: number }, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant={m.type.includes('in') ? 'default' : 'destructive'}>{m.type}</Badge>
                        <span>{m.productName}</span>
                        <span className="text-muted-foreground">({m.warehouse})</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="text-muted-foreground">Qty: {m.quantity}</span>
                        <span className="font-mono">{fmt(m.totalValue)}</span>
                        <span className="text-muted-foreground">Bal: {m.runningBalance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
