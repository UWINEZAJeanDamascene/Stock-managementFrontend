import { useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, ArrowLeft, DollarSign, Download } from "lucide-react";
import { useWeeklyReceivablesAging } from "@/lib/hooks/useWeeklyReports";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  return "RWF " + Math.abs(n).toLocaleString("en-RW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default function WeeklyReceivablesAgingReportPage() {
  const navigate = useNavigate();
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const { data, isLoading, error } = useWeeklyReceivablesAging();

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load receivables aging report");
    }
  }, [error]);

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await weeklyReportsApi.downloadReceivablesAgingPDF();
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
      await weeklyReportsApi.downloadReceivablesAgingExcel();
      toast.success("Excel downloaded successfully");
    } catch (error) {
      toast.error("Failed to download Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const buckets = [
    { key: '0-7', label: '0-7 Days', color: 'bg-green-100 text-green-800' },
    { key: '8-14', label: '8-14 Days', color: 'bg-yellow-100 text-yellow-800' },
    { key: '15-21', label: '15-21 Days', color: 'bg-orange-100 text-orange-800' },
    { key: 'over21', label: 'Over 21 Days', color: 'bg-red-100 text-red-800' },
  ];

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
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
                <span className="hidden sm:inline">Receivables Aging</span>
                <span className="sm:hidden">Receivables</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
                Outstanding customer invoices grouped by age
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

        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {buckets.map((bucket) => (
              <Card key={bucket.key}>
                <CardHeader className="pb-2">
                  <CardDescription>{bucket.label}</CardDescription>
                  <CardTitle className="text-xl">{fmt(data.summary.bucketTotals[bucket.key as keyof typeof data.summary.bucketTotals])}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {isLoading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>}

        {data && !isLoading && (
          <div className="space-y-6">
            {buckets.map((bucket) => {
              const bucketData = data.buckets[bucket.key as keyof typeof data.buckets];
              return (
                <Card key={bucket.key}>
                  <CardHeader className={`${bucket.color}`}>
                    <div className="flex items-center justify-between">
                      <CardTitle>{bucket.label}</CardTitle>
                      <Badge variant="outline" className={bucket.color}>{bucketData.invoices.length} invoices</Badge>
                    </div>
                    <CardDescription className={bucket.color}>Total: {fmt(bucketData.total)}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {bucketData.invoices.length > 0 ? (
                      <div className="space-y-2">
                        {bucketData.invoices.map((inv) => (
                          <div key={inv.invoiceId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium">{inv.invoiceNumber}</div>
                              <div className="text-sm text-muted-foreground">{inv.clientName}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono">{fmt(inv.balance)}</div>
                              <div className="text-xs text-muted-foreground">{inv.daysOverdue} days overdue</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No invoices in this bucket</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
