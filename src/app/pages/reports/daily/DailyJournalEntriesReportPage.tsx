import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Download, ArrowLeft, FileText, Calendar, BookOpen } from "lucide-react";
import { dailyReportsApi, DailyJournalEntries } from "@/lib/api.dailyReports";
import { toast } from "sonner";

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  return "RWF " + Math.abs(n).toLocaleString("en-RW", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function DailyJournalEntriesReportPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(searchParams.get("date") || dailyReportsApi.getToday());
  const [data, setData] = useState<DailyJournalEntries | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null);

  const handleDownloadPDF = async () => {
    setDownloading('pdf');
    try {
      await dailyReportsApi.downloadJournalEntriesPDF(date);
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
      await dailyReportsApi.downloadJournalEntriesExcel(date);
      toast.success("Excel downloaded successfully");
    } catch (error) {
      toast.error("Failed to download Excel");
    } finally {
      setDownloading(null);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await dailyReportsApi.getJournalEntries(date);
      if (response.success) setData(response.data);
    } catch (error) {
      toast.error("Failed to load journal entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [date]);

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
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-500" />
                <span className="hidden sm:inline">Daily Journal Entries</span>
                <span className="sm:hidden">Journal</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">Every journal entry posted with debit, credit, and narration</p>
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
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>
          </CardContent>
        </Card>

        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardHeader className="pb-2"><CardDescription>Total Entries</CardDescription><CardTitle className="text-2xl">{data.summary.totalEntries}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Total Debits</CardDescription><CardTitle className="text-2xl text-blue-600">{fmt(data.summary.totalDebits)}</CardTitle></CardHeader></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Total Credits</CardDescription><CardTitle className="text-2xl text-green-600">{fmt(data.summary.totalCredits)}</CardTitle></CardHeader></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" />Journal Entries</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {data.entries?.map((entry: { entryNumber: string; description: string; postedBy: string; totalDebit: number; lines?: { accountCode: string; accountName: string; debit: number; credit: number }[] }, idx: number) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{entry.entryNumber}</Badge>
                          <span className="font-medium">{entry.description}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Posted by: {entry.postedBy}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        {entry.lines?.map((line: { accountCode: string; accountName: string; debit: number; credit: number }, lidx: number) => (
                          <div key={lidx} className="flex justify-between py-1 border-b border-dashed last:border-0">
                            <span className="text-muted-foreground">{line.accountCode} - {line.accountName}</span>
                            <div className="flex gap-4">
                              {line.debit > 0 && <span className="font-mono text-blue-600">{fmt(line.debit)}</span>}
                              {line.credit > 0 && <span className="font-mono text-green-600">{fmt(line.credit)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-2 pt-2 border-t font-medium">
                        <span>Total</span>
                        <span className="font-mono">{fmt(entry.totalDebit)}</span>
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
