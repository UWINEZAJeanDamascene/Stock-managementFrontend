import { useNavigate } from "react-router";
import { Layout } from "../../../layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Download, ArrowLeft, AlertTriangle, Package, AlertCircle } from "lucide-react";
import { weeklyReportsApi } from "@/lib/api.weeklyReports";
import { useWeeklyInventoryReorder } from "@/lib/hooks/useWeeklyReports";
import { toast } from "sonner";
import { useState } from "react";

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  return n.toLocaleString("en-RW");
};

export default function WeeklyInventoryReorderReportPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useWeeklyInventoryReorder();
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  if (error) {
    toast.error(error.message || "Failed to load inventory reorder report");
  }

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      await weeklyReportsApi.downloadInventoryReorderPDF();
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
      await weeklyReportsApi.downloadInventoryReorderExcel();
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                <span className="hidden sm:inline">Inventory Reorder Report</span>
                <span className="sm:hidden">Reorder</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">
                Products below their reorder point requiring procurement action
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

        {/* Summary */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-amber-50 border-amber-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-amber-700">Total Products Needing Reorder</CardDescription>
                <CardTitle className="text-3xl text-amber-800">{data.summary.totalProducts}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-red-700">Critical (Out of Stock)</CardDescription>
                <CardTitle className="text-3xl text-red-800">{data.summary.criticalCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader className="pb-2">
                <CardDescription className="text-yellow-700">Warning (Low Stock)</CardDescription>
                <CardTitle className="text-3xl text-yellow-800">{data.summary.warningCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* Critical Items */}
            {data.critical.length > 0 && (
              <Card className="border-red-200">
                <CardHeader className="bg-red-50">
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    Critical - Out of Stock ({data.critical.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {data.critical.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex items-center gap-3">
                          <Badge variant="destructive">CRITICAL</Badge>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            <span className="text-red-600 font-bold">Stock: {fmt(item.currentStock)}</span>
                            <span className="text-muted-foreground"> / Min: {fmt(item.reorderPoint)}</span>
                            <span className="text-red-600 ml-2 font-medium">({item.deficit > 0 ? fmt(item.deficit) : item.deficit} below minimum)</span>
                          </div>
                          <div className="text-sm text-muted-foreground">Suggested Order: {item.suggestedOrder} {item.unit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warning Items */}
            {data.warning.length > 0 && (
              <Card>
                <CardHeader className="bg-yellow-50">
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    <Package className="w-5 h-5" />
                    Warning - Low Stock ({data.warning.length} items)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {data.warning.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700">LOW</Badge>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            <span className="text-red-600 font-medium">Stock: {fmt(item.currentStock)}</span>
                            <span className="text-muted-foreground"> / Min: {fmt(item.reorderPoint)}</span>
                            <span className="text-amber-600 ml-2">({item.deficit > 0 ? fmt(item.deficit) : item.deficit} below minimum)</span>
                          </div>
                          <div className="text-sm text-muted-foreground">Suggested Order: {item.suggestedOrder} {item.unit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {data.critical.length === 0 && data.warning.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-green-700">All Stock Levels Normal</h3>
                  <p className="text-muted-foreground">No products currently need reordering</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
