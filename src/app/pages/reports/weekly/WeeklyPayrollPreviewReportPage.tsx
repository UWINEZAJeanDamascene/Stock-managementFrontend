import { useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Loader2, ArrowLeft, Users, AlertCircle, Download } from "lucide-react";
import { useWeeklyPayrollPreview } from "@/lib/hooks/useWeeklyReports";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";

const fmt = (n: number | null | undefined) => {
  if (n === null || n === undefined) return "-";
  return "RWF " + Math.abs(n).toLocaleString("en-RW", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default function WeeklyPayrollPreviewReportPage() {
  const navigate = useNavigate();
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const { data, isLoading, error } = useWeeklyPayrollPreview();

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load payroll preview");
    }
  }, [error]);

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await weeklyReportsApi.downloadPayrollPreviewPDF();
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
      await weeklyReportsApi.downloadPayrollPreviewExcel();
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
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                <span className="hidden sm:inline">Payroll Preview</span>
                <span className="sm:hidden">Payroll</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
                Expected gross pay, PAYE, RSSB contributions, and net pay
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

        {isLoading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>}

        {data && !isLoading && (
          <>
            {!data.payrollInProgress ? (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="py-8 text-center">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-amber-800">No Payroll in Progress</h3>
                  <p className="text-amber-700 mt-2">{data.message}</p>
                  <p className="text-sm text-amber-600 mt-4">
                    Estimated Gross Pay for {data.employeeCount} employees: {fmt(data.estimatedGrossPay || 0)}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Employees</CardDescription>
                      <CardTitle className="text-2xl">{data.summary?.employeeCount}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Gross Pay</CardDescription>
                      <CardTitle className="text-xl">{fmt(data.summary?.grossPay)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-red-50">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-red-700">Total Deductions</CardDescription>
                      <CardTitle className="text-xl text-red-800">{fmt(data.summary?.totalDeductions)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-green-50">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-green-700">Net Pay</CardDescription>
                      <CardTitle className="text-xl text-green-800">{fmt(data.summary?.netPay)}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle>Payroll Summary</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b">
                        <span>Gross Pay</span>
                        <span className="font-mono">{fmt(data.summary?.grossPay)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b text-red-600">
                        <span>PAYE</span>
                        <span className="font-mono">-{fmt(data.summary?.paye)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b text-red-600">
                        <span>RSSB Employee (3%)</span>
                        <span className="font-mono">-{fmt(data.summary?.rssbEmployee)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">RSSB Employer (5%)</span>
                        <span className="font-mono text-muted-foreground">{fmt(data.summary?.rssbEmployer)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b font-medium">
                        <span>Total Deductions</span>
                        <span className="font-mono text-red-600">-{fmt(data.summary?.totalDeductions)}</span>
                      </div>
                      <div className="flex justify-between py-2 font-bold text-lg">
                        <span>Net Pay</span>
                        <span className="font-mono text-green-600">{fmt(data.summary?.netPay)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {data.employees && data.employees.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Employee Details</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {data.employees.map((emp) => (
                          <div key={emp.employeeId} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                            <div>
                              <div className="font-medium">{emp.name}</div>
                              <div className="text-muted-foreground">{emp.employeeNumber} • {emp.department}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono">{fmt(emp.netPay)}</div>
                              <div className="text-xs text-muted-foreground">Gross: {fmt(emp.grossPay)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
