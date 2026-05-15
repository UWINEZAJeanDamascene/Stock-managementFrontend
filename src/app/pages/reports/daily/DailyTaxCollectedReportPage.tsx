import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Percent, Receipt, Scale, TrendingUp, Wallet } from "lucide-react";
import { dailyReportsApi } from "@/lib/api.dailyReports";
import { useDailyTaxCollected } from "@/lib/hooks/useDailyReports";
import { toast } from "sonner";
import { DailyReportScaffold, reportCardClass, type DailyMetric } from "./components/DailyReportScaffold";

const fmt = (n: number | null) => n === null || n === undefined ? "-" : "RWF " + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DailyTaxCollectedReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const { data, isLoading, error } = useDailyTaxCollected(date);

  useEffect(() => { if (error) toast.error(error.message || "Failed to load tax report"); }, [error]);
  const onDateChange = (value: string) => { setDate(value); setSearchParams({ date: value }); };
  const downloadPDF = async () => { setDownloading("pdf"); try { await dailyReportsApi.downloadTaxCollectedPDF(date); toast.success("PDF downloaded successfully"); } catch { toast.error("Failed to download PDF"); } finally { setDownloading(null); } };
  const downloadExcel = async () => { setDownloading("excel"); try { await dailyReportsApi.downloadTaxCollectedExcel(date); toast.success("Excel downloaded successfully"); } catch { toast.error("Failed to download Excel"); } finally { setDownloading(null); } };

  const metrics: DailyMetric[] = data ? [
    { label: "Output VAT", value: fmt(data.summary.totalOutputVAT), caption: "Tax collected", icon: Receipt, tone: "emerald" },
    { label: "Taxable Sales", value: fmt(data.summary.taxableSales), caption: "VAT base", icon: Scale, tone: "blue" },
    { label: "Total Sales", value: fmt(data.summary.totalSales), caption: "Gross sales", icon: TrendingUp, tone: "cyan" },
    { label: "Exempt Sales", value: fmt(data.summary.exemptSales), caption: "Non-taxable value", icon: Wallet, tone: "slate" },
  ] : [];

  return (
    <DailyReportScaffold title="Daily Tax Collected" shortTitle="Tax" subtitle="Output VAT from sales and withholding tax breakdown for the selected date." icon={Receipt} tone="teal" date={date} onDateChange={onDateChange} loading={isLoading} downloading={downloading} onBack={() => navigate(-1)} onDownloadPDF={downloadPDF} onDownloadExcel={downloadExcel} metrics={metrics}>
      {data && !isLoading && (
        <Card className={reportCardClass}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Percent className="h-4 w-4 text-teal-600" />Tax Breakdown by Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {data.taxBreakdown?.map((tax: { taxCode: string; taxRate: number; taxableAmount: number; taxAmount: number }, idx: number) => (
                <div key={`${tax.taxCode}-${idx}`} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3"><Badge variant="outline">{tax.taxCode}</Badge><span className="font-semibold text-slate-950 dark:text-white">{tax.taxRate}%</span></div>
                  <div className="flex flex-wrap gap-4 text-sm"><span className="text-slate-500 dark:text-slate-400">Taxable: <span className="font-mono text-slate-950 dark:text-white">{fmt(tax.taxableAmount)}</span></span><span className="font-mono font-semibold text-emerald-600">{fmt(tax.taxAmount)}</span></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DailyReportScaffold>
  );
}
