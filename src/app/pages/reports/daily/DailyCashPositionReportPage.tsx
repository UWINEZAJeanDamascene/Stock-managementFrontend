import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Download, ArrowLeft, Wallet, Calendar, Building2 } from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
import { useDailyCashPosition } from "@/lib/hooks/useDailyReports";
import { toast } from "sonner";

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  return "RWF " + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function DailyCashPositionReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null);

  // React Query hook for data fetching with caching
  const { data, isLoading, error } = useDailyCashPosition(date);

  // Show error toast when query fails
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load cash position");
    }
  }, [error]);

  const handleDownloadPDF = async () => {
    setDownloading('pdf');
    try {
      await dailyReportsApi.downloadCashPositionPDF(date);
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
      await dailyReportsApi.downloadCashPositionExcel(date);
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
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                <span className="hidden sm:inline">Daily Cash Position</span>
                <span className="sm:hidden">Cash</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">Opening balance, receipts, payments per account</p>
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
              <Card><CardHeader className="pb-2"><CardDescription>Opening Balance</CardDescription><CardTitle className="text-2xl">{fmt(data.summary.openingBalance)}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Total Receipts</CardDescription><CardTitle className="text-2xl text-green-600">{fmt(data.summary.receipts)}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Total Payments</CardDescription><CardTitle className="text-2xl text-red-500">{fmt(data.summary.payments)}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Closing Balance</CardDescription><CardTitle className="text-2xl text-blue-600">{fmt(data.summary.closingBalance)}</CardTitle></CardHeader></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Account Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.accounts?.map((acc: { accountType: string; accountName: string; bankName?: string; openingBalance: number; receipts: number; payments: number; closingBalance: number }, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{acc.accountType}</Badge>
                          <span className="font-medium">{acc.accountName}</span>
                          {acc.bankName && <span className="text-sm text-muted-foreground">({acc.bankName})</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                        <div><span className="text-muted-foreground">Opening:</span> <span className="font-mono">{fmt(acc.openingBalance)}</span></div>
                        <div><span className="text-muted-foreground">Receipts:</span> <span className="font-mono text-green-600">{fmt(acc.receipts)}</span></div>
                        <div><span className="text-muted-foreground">Payments:</span> <span className="font-mono text-red-500">{fmt(acc.payments)}</span></div>
                        <div><span className="text-muted-foreground">Closing:</span> <span className="font-mono font-bold">{fmt(acc.closingBalance)}</span></div>
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
