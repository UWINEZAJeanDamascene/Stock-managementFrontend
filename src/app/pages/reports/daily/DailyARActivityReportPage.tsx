import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Download, ArrowLeft, Users, Calendar, FileText, CreditCard } from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
import { useDailyARActivity } from "@/lib/hooks/useDailyReports";
import { toast } from "sonner";

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  return "RWF " + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function DailyARActivityReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null);

  // React Query hook for data fetching with caching
  const { data, isLoading, error } = useDailyARActivity(date);

  // Show error toast when query fails
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load AR activity");
    }
  }, [error]);

  const handleDownloadPDF = async () => {
    setDownloading('pdf');
    try {
      await dailyReportsApi.downloadARActivityPDF(date);
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
      await dailyReportsApi.downloadARActivityExcel(date);
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
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
                <span className="hidden sm:inline">Daily AR Activity</span>
                <span className="sm:hidden">AR Activity</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">New invoices, payments received, credit notes</p>
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
              <Card><CardHeader className="pb-2"><CardDescription>New Invoices</CardDescription><CardTitle className="text-2xl text-blue-600">{data.summary.newInvoicesCount}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>New Invoice Total</CardDescription><CardTitle className="text-2xl">{fmt(data.summary.newInvoicesTotal)}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Payments Received</CardDescription><CardTitle className="text-2xl text-green-600">{fmt(data.summary.paymentsTotal)}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Net AR Change</CardDescription><CardTitle className={`text-2xl ${data.summary.netARChange >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{fmt(data.summary.netARChange)}</CardTitle></CardHeader></Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />New Invoices</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.newInvoices?.map((inv: { invoiceNumber: string; clientName: string; status: string; total: number }, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                        <div><span className="font-medium">{inv.invoiceNumber}</span><span className="text-muted-foreground ml-2">{inv.clientName}</span></div>
                        <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>{inv.status}</Badge>
                        <span className="font-mono">{fmt(inv.total)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Payments Received</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.paymentsReceived?.map((p: { receiptNumber: string; clientName: string; amount: number }, idx: number) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                        <div><span className="font-medium">{p.receiptNumber}</span><span className="text-muted-foreground ml-2">{p.clientName}</span></div>
                        <span className="font-mono text-green-600">{fmt(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
