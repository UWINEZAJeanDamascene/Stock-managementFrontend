import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, ArrowLeft, Wallet, Calendar, TrendingUp, TrendingDown, Download } from "lucide-react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";
import { useWeeklyCashFlow } from "@/lib/hooks/useWeeklyReports";
import { toast } from "sonner";

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  return "RWF " + Math.abs(n).toLocaleString("en-RW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default function WeeklyCashFlowReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [weekStart, setWeekStart] = useState(searchParams.get("weekStart") || weeklyReportsApi.getDefaultWeek());
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  const { data, isLoading, error } = useWeeklyCashFlow(weekStart);

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load cash flow report");
    }
  }, [error]);

  const handleWeekChange = (newWeek: string) => {
    setWeekStart(newWeek);
    setSearchParams({ weekStart: newWeek });
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await weeklyReportsApi.downloadCashFlowPDF(weekStart);
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
      await weeklyReportsApi.downloadCashFlowExcel(weekStart);
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
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500" />
                <span className="hidden sm:inline">Weekly Cash Flow</span>
                <span className="sm:hidden">Cash Flow</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
                Daily cash in and out across the week
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
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-green-50">
                <CardHeader className="pb-2">
                  <CardDescription className="text-green-700">Week Total In</CardDescription>
                  <CardTitle className="text-2xl text-green-800">{fmt(data.summary.weekTotalIn)}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-red-50">
                <CardHeader className="pb-2">
                  <CardDescription className="text-red-700">Week Total Out</CardDescription>
                  <CardTitle className="text-2xl text-red-800">{fmt(data.summary.weekTotalOut)}</CardTitle>
                </CardHeader>
              </Card>
              <Card className={data.summary.weekNetFlow >= 0 ? "bg-blue-50" : "bg-orange-50"}>
                <CardHeader className="pb-2">
                  <CardDescription className={data.summary.weekNetFlow >= 0 ? "text-blue-700" : "text-orange-700"}>Net Flow</CardDescription>
                  <CardTitle className={`text-2xl ${data.summary.weekNetFlow >= 0 ? "text-blue-800" : "text-orange-800"}`}>
                    {fmt(data.summary.weekNetFlow)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Daily Cash Flow</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.summary.dailyFlow.map((day) => (
                    <div key={day.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 font-medium">{day.dayName}</div>
                        <div className="text-sm text-muted-foreground">{day.date}</div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="w-4 h-4" />
                          {fmt(day.cashIn)}
                        </div>
                        <div className="flex items-center gap-1 text-red-600">
                          <TrendingDown className="w-4 h-4" />
                          {fmt(day.cashOut)}
                        </div>
                        <div className={`font-mono font-medium w-28 text-right ${day.netFlow >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                          {day.netFlow >= 0 ? "+" : ""}{fmt(day.netFlow)}
                        </div>
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
