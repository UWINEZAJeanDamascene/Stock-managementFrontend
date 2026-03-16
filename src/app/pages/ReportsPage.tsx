import React, { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { reportsApi, budgetsApi, Budget, BudgetComparison, receivablesApi, payablesApi, clientsApi, suppliersApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Users, Package, Calendar, AlertCircle, Download, FileSpreadsheet, Loader2, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#6366f1', '#8b5cf6', '#f97316'];

/** Responsive hook for chart adjustments */
function useIsNarrow(breakpoint = 640) {
  const [narrow, setNarrow] = useState(typeof window !== 'undefined' ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return narrow;
}

/** Format Y-axis labels to compact numbers */
function formatYAxis(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}k`;
  return v.toString();
}

/** Truncate label for chart axis */
function truncateLabel(label: string, maxLen: number): string {
  if (!label) return '';
  return label.length > maxLen ? label.substring(0, maxLen) + '…' : label;
}

export default function ReportsPage() {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="p-3 md:p-6 space-y-4">
        <h1 className="text-xl md:text-2xl font-semibold text-foreground">{t('reports.title')}</h1>
        <p className="text-sm text-muted-foreground hidden sm:block">{t('reports.subtitle')}</p>

        <div className="overflow-x-auto">
          <Tabs defaultValue="pl">
            <TabsList className="flex flex-wrap md:inline-flex h-auto w-full md:w-auto gap-1">
              <TabsTrigger value="pl" className="flex-shrink-0 text-xs sm:text-sm">{t('reports.tabPL')}</TabsTrigger>
              <TabsTrigger value="bs" className="flex-shrink-0 text-xs sm:text-sm">{t('reports.tabBS')}</TabsTrigger>
              <TabsTrigger value="aging" className="flex-shrink-0 text-xs sm:text-sm">{t('reports.tabAging')}</TabsTrigger>
              <TabsTrigger value="vat" className="flex-shrink-0 text-xs sm:text-sm">{t('reports.tabVAT')}</TabsTrigger>
              <TabsTrigger value="product" className="flex-shrink-0 text-xs sm:text-sm">{t('reports.tabProduct')}</TabsTrigger>
              <TabsTrigger value="clv" className="flex-shrink-0 text-xs sm:text-sm">{t('reports.tabCLV')}</TabsTrigger>
              <TabsTrigger value="cashflow" className="flex-shrink-0 text-xs sm:text-sm">{t('reports.tabCashflow')}</TabsTrigger>
              <TabsTrigger value="budget" className="flex-shrink-0 text-xs sm:text-sm">{t('reports.tabBudget')}</TabsTrigger>
              <TabsTrigger value="ratios" className="flex-shrink-0 text-xs sm:text-sm">{t('reports.tabRatios')}</TabsTrigger>
              <TabsTrigger value="periods" className="flex-shrink-0 text-xs sm:text-sm">📊 Period Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="pl">
              <ProfitLossReport />
            </TabsContent>

            <TabsContent value="bs">
              <BalanceSheetReport />
            </TabsContent>

            <TabsContent value="aging">
              <AgingReport />
            </TabsContent>

            <TabsContent value="vat">
              <VATReport />
            </TabsContent>

            <TabsContent value="product">
              <ProductPerformanceReport />
            </TabsContent>

            <TabsContent value="clv">
              <CLVReport />
            </TabsContent>

            <TabsContent value="cashflow">
              <CashFlowReport />
            </TabsContent>

            <TabsContent value="budget">
              <BudgetReport />
            </TabsContent>

            <TabsContent value="ratios">
              <FinancialRatiosReport />
            </TabsContent>

            <TabsContent value="periods">
              <PeriodReportsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
}

// Profit & Loss Report
function ProfitLossReport() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsApi.getProfitAndLossFull({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined
      });
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Profit & Loss data');
    } finally {
      setLoading(false);
    }
  }

  const handleExport = async (type: 'pdf' | 'excel') => {
    try {
      setExporting(true);
      let blob: Blob;
      let filename: string;
      
      if (type === 'excel') {
        blob = await reportsApi.exportExcel('profit-loss');
        filename = `profit-loss-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      } else {
        blob = await reportsApi.exportPDF('profit-loss');
        filename = `profit-loss-report-${new Date().toISOString().split('T')[0]}.pdf`;
      }
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || `Failed to export ${type.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <CardTitle>{t('reports.plTitle')}</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full md:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full sm:w-40"
            />
            <span className="text-muted-foreground hidden sm:inline">to</span>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full sm:w-40"
            />
          </div>
          <Button onClick={fetchData} disabled={loading} className="w-full sm:w-auto">
            {loading ? t('reports.loading') : t('reports.refresh')}
          </Button>
          <div className="relative group">
            <Button variant="outline" disabled={exporting || !data} className="w-full sm:w-auto">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {t('reports.export')}
            </Button>
            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button 
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm dark:text-slate-300 rounded-t-lg"
              >
                {t('reports.exportToPDF')}
              </button>
              <button 
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm dark:text-slate-300 rounded-b-lg"
              >
                {t('reports.exportToExcel')}
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        
        {data && (
          <div className="space-y-6">
            {/* Header - Company Info */}
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold text-foreground">{data.company?.name || 'Company'}</h2>
              <p className="text-muted-foreground">TIN: {data.company?.tin || 'N/A'}</p>
              <p className="text-lg font-semibold mt-2">PROFIT & LOSS STATEMENT</p>
              <p className="text-muted-foreground">Period: {data.period?.formatted || 'N/A'}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 md:p-4 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">{t('reports.netRevenue')}</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 truncate">{formatCurrency(data.revenue?.netRevenue)}</p>
                <p className="text-xs text-muted-foreground">{t('reports.paidInvoices', { count: data.details?.paidInvoicesCount || 0 })}</p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-3 md:p-4 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm">{t('reports.totalCOGS')}</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400 truncate">{formatCurrency(data.cogs?.totalCOGS)}</p>
                <p className="text-xs text-muted-foreground">{t('reports.costOfGoodsSold')}</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 md:p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">{t('reports.grossProfit')}</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400 truncate">{formatCurrency(data.grossProfit?.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {t('reports.grossMargin')}: {data.grossProfit?.marginPercent?.toFixed(1) || 0}%
                </p>
              </div>

              <div className={`p-3 md:p-4 rounded-lg ${data.netProfit?.amount >= 0 ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                <div className={`flex items-center gap-2 mb-1 ${data.netProfit?.amount >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">{t('reports.netProfit')}</span>
                </div>
                <p className={`text-xl md:text-2xl font-bold truncate ${data.netProfit?.amount >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {formatCurrency(data.netProfit?.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('reports.netMargin')}: {data.netProfit?.marginPercent?.toFixed(1) || 0}%
                </p>
              </div>
            </div>

            {/* Detailed P&L Structure */}
            <div className="border border-border rounded-lg overflow-hidden text-sm">
              {/* ── REVENUE SECTION ── */}
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold">
                {t('reports.revenue')}
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium">{t('reports.salesRevenueExVAT')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.paidInvoices', { count: data.details?.paidInvoicesCount || 0 })}</p>
                </div>
                <p className="font-semibold tabular-nums">{formatCurrency(data.revenue?.salesRevenueExVAT)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 pl-8 border-b border-dashed">
                <div>
                  <p className="font-medium text-red-600 dark:text-red-400">{t('reports.lessSalesReturns')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.creditNotesIssued', { count: data.details?.creditNotesCount || 0 })}</p>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.revenue?.salesReturns)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 pl-8 border-b border-dashed">
                <div>
                  <p className="font-medium text-red-600 dark:text-red-400">{t('reports.lessDiscountsGiven')}</p>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.revenue?.discountsGiven)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b-2 border-green-300 dark:border-green-700">
                <div>
                  <p className="font-bold">{t('reports.netRevenue')}</p>
                </div>
                <p className="font-bold text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(data.revenue?.netRevenue)}</p>
              </div>

              {/* ── COST OF GOODS SOLD SECTION ── */}
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold mt-2">
                {t('reports.cogsTitle')}
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium">{t('reports.openingStockValue')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.stockValueAtStart')}</p>
                </div>
                <p className="font-semibold tabular-nums">{formatCurrency(data.cogs?.openingStockValue)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium">{t('reports.addPurchasesExVAT')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.stockBoughtFromSuppliers', { count: data.details?.purchasesCount || 0 })}</p>
                </div>
                <p className="font-semibold text-green-600 dark:text-green-400 tabular-nums">+{formatCurrency(data.cogs?.purchasesExVAT)}</p>
              </div>
              
              {(data.cogs?.purchaseReturns || 0) > 0 && (
                <div className="flex items-center justify-between px-4 py-3 pl-8 border-b border-dashed">
                  <div>
                    <p className="font-medium text-red-600 dark:text-red-400">{t('reports.lessPurchaseReturns')}</p>
                    <p className="text-xs text-muted-foreground">{t('reports.returnedToSuppliers', { count: data.details?.purchaseReturnsCount || 0 })}</p>
                  </div>
                  <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.cogs?.purchaseReturns)}</p>
                </div>
              )}

              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium">{t('reports.lessClosingStockValue')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.stockValueAtEnd')}</p>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.cogs?.closingStockValue)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b-2 border-red-300 dark:border-red-700">
                <div>
                  <p className="font-bold">{t('reports.totalCOGS')}</p>
                </div>
                <p className="font-bold text-red-600 dark:text-red-400 tabular-nums">{formatCurrency(data.cogs?.totalCOGS)}</p>
              </div>

              {/* ── GROSS PROFIT ── */}
              <div className="flex items-center justify-between px-4 py-4 bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-300 dark:border-blue-700">
                <div>
                  <p className="font-bold text-base md:text-lg uppercase">{t('reports.grossProfit')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.grossProfitCalc')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600 dark:text-blue-400 tabular-nums text-lg">{formatCurrency(data.grossProfit?.amount)}</p>
                  <p className="text-xs font-semibold text-blue-500 dark:text-blue-300">
                    {t('reports.grossMargin')}: {data.grossProfit?.marginPercent?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>

              {/* ── OPERATING EXPENSES SECTION ── */}
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold mt-2">
                {t('reports.operatingExpenses')}
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium">{t('reports.salariesWages')}</p>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.operatingExpenses?.salariesAndWages)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium">{t('reports.rent')}</p>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.operatingExpenses?.rent)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium">{t('reports.utilities')}</p>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.operatingExpenses?.utilities)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium">{t('reports.transportDelivery')}</p>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.operatingExpenses?.transportAndDelivery)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium">{t('reports.marketingAdvertising')}</p>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.operatingExpenses?.marketingAndAdvertising)}</p>
              </div>
              
              <div className="border-b border-dashed">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium">{t('reports.depreciation')}</p>
                    <p className="text-xs text-muted-foreground">{t('reports.fromFixedAssets', { count: data.details?.fixedAssetsCount || 0 })}</p>
                  </div>
                  <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.operatingExpenses?.depreciation)}</p>
                </div>
                {/* Per-asset breakdown — answers "where does this depreciation come from?" */}
                {data.details?.depreciationBreakdown?.length > 0 && (
                  <div className="px-4 pb-3 space-y-1">
                    {data.details.depreciationBreakdown.map((a: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs bg-slate-50 dark:bg-slate-800/50 rounded px-3 py-1.5">
                        <div>
                          <span className="font-medium text-foreground">{a.name}</span>
                          <span className="ml-1 text-muted-foreground capitalize">({a.category})</span>
                          {a.assetCode && <span className="ml-1 text-muted-foreground">· {a.assetCode}</span>}
                          <span className="ml-2 text-muted-foreground">
                            RF {(a.purchaseCost || 0).toLocaleString()} · {a.usefulLifeYears}yr · {
                              a.depreciationMethod === 'straight-line' ? 'SL' :
                              a.depreciationMethod === 'sum-of-years'  ? 'SYD' : 'DB'
                            }
                          </span>
                        </div>
                        <span className="font-medium text-red-600 dark:text-red-400 tabular-nums ml-4">
                          −{formatCurrency(a.periodDepreciation)}
                        </span>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground px-1">Annual per asset: {data.details.depreciationBreakdown.map((a: any) => `RF ${(a.annualDepreciation || 0).toLocaleString()}`).join(', ')}</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium">{t('reports.otherExpenses')}</p>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.operatingExpenses?.otherExpenses)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border-b-2 border-orange-300 dark:border-orange-700">
                <div>
                  <p className="font-bold">{t('reports.totalOperatingExpenses')}</p>
                </div>
                <p className="font-bold text-orange-600 dark:text-orange-400 tabular-nums">{formatCurrency(data.operatingExpenses?.total)}</p>
              </div>

              {/* ── OPERATING PROFIT (EBIT) ── */}
              <div className="flex items-center justify-between px-4 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-b-2 border-indigo-300 dark:border-indigo-700">
                <div>
                  <p className="font-bold text-base md:text-lg uppercase">{t('reports.operatingProfitEBIT')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.operatingProfitCalc')}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold tabular-nums text-lg ${data.operatingProfit?.amount >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(data.operatingProfit?.amount)}
                  </p>
                  <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-300">
                    {t('reports.operatingMargin')}: {data.operatingProfit?.marginPercent?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>

              {/* ── OTHER INCOME / EXPENSES SECTION ── */}
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold mt-2">
                {t('reports.otherIncomeExpenses')}
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium text-green-600 dark:text-green-400">{t('reports.interestIncome')}</p>
                </div>
                <p className="font-semibold text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(data.otherIncomeExpenses?.interestIncome)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium text-red-600 dark:text-red-400">{t('reports.interestExpense')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.loanInterest', { count: data.details?.activeLoansCount || 0 })}</p>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.otherIncomeExpenses?.interestExpense)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium text-green-600 dark:text-green-400">{t('reports.otherIncome')}</p>
                </div>
                <p className="font-semibold text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(data.otherIncomeExpenses?.otherIncome)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium text-red-600 dark:text-red-400">{t('reports.otherExpense')}</p>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.otherIncomeExpenses?.otherExpense)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 bg-cyan-50 dark:bg-cyan-900/20 border-b-2 border-cyan-300 dark:border-cyan-700">
                <div>
                  <p className="font-bold">{t('reports.netOtherIncome')}</p>
                </div>
                <p className={`font-bold tabular-nums ${data.otherIncomeExpenses?.netOtherIncome >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(data.otherIncomeExpenses?.netOtherIncome)}
                </p>
              </div>

              {/* ── PROFIT BEFORE TAX ── */}
              <div className="flex items-center justify-between px-4 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-b-2 border-yellow-300 dark:border-yellow-700">
                <div>
                  <p className="font-bold text-base md:text-lg uppercase">{t('reports.profitBeforeTax')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.pbtCalc')}</p>
                </div>
                <p className={`font-bold tabular-nums text-lg ${data.profitBeforeTax?.amount >= 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(data.profitBeforeTax?.amount)}
                </p>
              </div>

              {/* ── TAX SECTION ── */}
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold mt-2">
                {t('reports.tax')}
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed">
                <div>
                  <p className="font-medium">{t('reports.corporateIncomeTax')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.taxRate30')}</p>
                </div>
                <p className="font-semibold text-red-600 dark:text-red-400 tabular-nums">−{formatCurrency(data.tax?.corporateIncomeTax)}</p>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 border-b border-dashed bg-yellow-50 dark:bg-yellow-900/20">
                <div>
                  <p className="font-medium text-yellow-700 dark:text-yellow-300">{t('reports.vatNote')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.vatNotDesc')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('reports.outputVAT')}: {formatCurrency(data.tax?.vatInfo?.outputVAT)} | {t('reports.inputVAT')}: {formatCurrency(data.tax?.vatInfo?.inputVAT)}
                    {(data.tax?.vatInfo?.inputVATReturn || 0) > 0 && (
                      <> | {t('reports.lessVATOnReturns')}: −{formatCurrency(data.tax?.vatInfo?.inputVATReturn)} | {t('reports.netInputVAT')}: {formatCurrency(data.tax?.vatInfo?.netInputVAT)}</>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b-2 border-red-300 dark:border-red-700">
                <div>
                  <p className="font-bold">{t('reports.totalTax')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.taxCorporateOnly')}</p>
                </div>
                <p className="font-bold text-red-600 dark:text-red-400 tabular-nums">{formatCurrency(data.tax?.totalTax)}</p>
              </div>

              {/* ── NET PROFIT ── */}
              <div className={`flex items-center justify-between px-4 py-4 border-t-4 ${data.netProfit?.amount >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'}`}>
                <div>
                  <p className="font-bold text-lg md:text-xl uppercase">{t('reports.netProfitAfterTax')}</p>
                  <p className="text-xs text-muted-foreground">{t('reports.netProfitFlowsBS')}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold tabular-nums text-xl ${data.netProfit?.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(data.netProfit?.amount)}
                  </p>
                  <p className={`text-xs font-semibold ${data.netProfit?.amount >= 0 ? 'text-green-500 dark:text-green-300' : 'text-red-500 dark:text-red-300'}`}>
                    {t('reports.netMargin')}: {data.netProfit?.marginPercent?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Data Summary */}
            <div className="text-xs text-muted-foreground p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="font-semibold">{t('reports.dataSources')}:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>{t('reports.revenueForData', { count: data.details?.paidInvoicesCount || 0 })}</li>
                <li>{t('reports.creditNotesForReturns', { count: data.details?.creditNotesCount || 0 })}</li>
                <li>{t('reports.purchasesForInventory', { count: data.details?.purchasesCount || 0 })}</li>
                <li>{t('reports.purchaseReturnsDeducted', { count: data.details?.purchaseReturnsCount || 0 })}</li>
                <li>{t('reports.productsForStockVal', { count: data.details?.productsCount || 0 })}</li>
                <li>{t('reports.fixedAssetsForDepr', { count: data.details?.fixedAssetsCount || 0 })}</li>
                <li>{t('reports.activeLoansForInterest', { count: data.details?.activeLoansCount || 0 })}</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Aging Report
function AgingReport() {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [type, setType] = useState<'receivables' | 'payables'>('receivables');
  const [error, setError] = useState<string | string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsApi.getAging({ type }) as any;
      setData(res.data.buckets);
    } catch (err: any) {
      setError(err?.message || 'Failed to load aging data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [type]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const getBucketTotal = (bucket: any[]) => {
    return bucket?.reduce((sum: number, item: any) => sum + (item.balance || 0), 0) || 0;
  };

  const getBucketCount = (bucket: any[]) => bucket?.length || 0;

  const totalReceivables = data ? 
    getBucketTotal(data.current) + getBucketTotal(data['1-30']) + getBucketTotal(data['31-60']) + getBucketTotal(data['61-90']) + getBucketTotal(data['90+']) 
    : 0;

  const chartData = data ? [
    { name: 'Current', value: getBucketTotal(data.current), count: getBucketCount(data.current) },
    { name: '1-30 Days', value: getBucketTotal(data['1-30']), count: getBucketCount(data['1-30']) },
    { name: '31-60 Days', value: getBucketTotal(data['31-60']), count: getBucketCount(data['31-60']) },
    { name: '61-90 Days', value: getBucketTotal(data['61-90']), count: getBucketCount(data['61-90']) },
    { name: '90+ Days', value: getBucketTotal(data['90+']), count: getBucketCount(data['90+']) },
  ] : [];

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <CardTitle>{t('reports.agingTitle')} - {type === 'receivables' ? t('reports.receivablesInvoices') : t('reports.payablesPurchases')}</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button 
            variant={type === 'receivables' ? 'default' : 'outline'} 
            onClick={() => setType('receivables')}
            className="w-full sm:w-auto"
          >
            {t('reports.receivables')}
          </Button>
          <Button 
            variant={type === 'payables' ? 'default' : 'outline'} 
            onClick={() => setType('payables')}
            className="w-full sm:w-auto"
          >
            {t('reports.payables')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        
        {data && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 md:p-4 rounded-lg text-center">
               <p className="text-sm text-green-600 dark:text-green-400">{t('reports.current')}</p>
                <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400 truncate">{formatCurrency(getBucketTotal(data.current))}</p>
                <p className="text-xs text-muted-foreground">{t('reports.items', { count: getBucketCount(data.current) })}</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 md:p-4 rounded-lg text-center">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">{t('reports.days1_30')}</p>
                <p className="text-lg md:text-xl font-bold text-yellow-600 dark:text-yellow-400 truncate">{formatCurrency(getBucketTotal(data['1-30']))}</p>
                <p className="text-xs text-muted-foreground">{t('reports.items', { count: getBucketCount(data['1-30']) })}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 md:p-4 rounded-lg text-center">
                <p className="text-sm text-orange-600 dark:text-orange-400">{t('reports.days31_60')}</p>
                <p className="text-lg md:text-xl font-bold text-orange-600 dark:text-orange-400 truncate">{formatCurrency(getBucketTotal(data['31-60']))}</p>
                <p className="text-xs text-muted-foreground">{t('reports.items', { count: getBucketCount(data['31-60']) })}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 md:p-4 rounded-lg text-center">
                <p className="text-sm text-red-600 dark:text-red-400">{t('reports.days61_90')}</p>
                <p className="text-lg md:text-xl font-bold text-red-600 dark:text-red-400 truncate">{formatCurrency(getBucketTotal(data['61-90']))}</p>
                <p className="text-xs text-muted-foreground">{t('reports.items', { count: getBucketCount(data['61-90']) })}</p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/40 p-3 md:p-4 rounded-lg text-center col-span-2 md:col-span-1">
                <p className="text-sm text-red-700 dark:text-red-300">{t('reports.days90plus')}</p>
                <p className="text-lg md:text-xl font-bold text-red-700 dark:text-red-300 truncate">{formatCurrency(getBucketTotal(data['90+']))}</p>
                <p className="text-xs text-muted-foreground">{t('reports.items', { count: getBucketCount(data['90+']) })}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                  <XAxis dataKey="name" className="dark:fill-slate-300" tick={{ fontSize: isNarrow ? 10 : 12 }} />
                  <YAxis tickFormatter={formatYAxis} className="dark:fill-slate-300" width={isNarrow ? 40 : 60} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Total */}
            <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-base md:text-lg font-semibold text-foreground">
                {type === 'receivables' ? t('reports.totalReceivables') : t('reports.totalPayables')}: 
                <span className="ml-2 text-xl md:text-2xl">{formatCurrency(totalReceivables)}</span>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// VAT Report
function VATReport() {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [error, setError] = useState<string | null>(null);

  async function fetchData(fixData: boolean = false) {
    try {
      setLoading(true);
      setFixing(fixData);
      setError(null);
      const res = await reportsApi.getVATSummary({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        recalculate: fixData ? 'true' : undefined
      });
      setData(res.data.summary);
    } catch (err: any) {
      setError(err?.message || 'Failed to load VAT data');
    } finally {
      setLoading(false);
      setFixing(false);
    }
  }

  const handleFixData = () => {
    if (window.confirm(t('reports.fixDataConfirm'))) {
      fetchData(true);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const chartData = data ? Object.entries(data).map(([taxCode, values]: [string, any]) => {
    // Get display name based on tax code
    let displayName = taxCode;
    if (taxCode === 'A') displayName = 'A (Exempt - 0%)';
    else if (taxCode === 'B') displayName = 'B (18%)';
    else if (taxCode === 'None' || taxCode === 'none') displayName = 'No Tax';
    
    return {
      name: displayName,
      taxCode: taxCode,
      taxableBase: values.taxableBase || 0,
      taxAmount: values.taxAmount || 0
    };
  }) : [];

  const totalTaxable = chartData.reduce((sum, item) => sum + item.taxableBase, 0);
  const totalTax = chartData.reduce((sum, item) => sum + item.taxAmount, 0);

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <CardTitle>{t('reports.vatTitle')}</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full md:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full sm:w-40"
            />
            <span className="text-muted-foreground hidden sm:inline">to</span>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full sm:w-40"
            />
          </div>
          <Button onClick={() => fetchData(false)} disabled={loading || fixing} className="w-full sm:w-auto">
            {loading ? t('reports.loading') : t('reports.refresh')}
          </Button>
          <Button variant="outline" onClick={handleFixData} disabled={loading || fixing} className="w-full sm:w-auto">
            {fixing ? t('reports.fixing') : t('reports.fixData')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        
        {data && Object.keys(data).length > 0 && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">{t('reports.totalTaxableBase')}</p>
                <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400 truncate">{formatCurrency(totalTaxable)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">{t('reports.totalVATCollected')}</p>
                <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 truncate">{formatCurrency(totalTax)}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                  <XAxis dataKey="name" className="dark:fill-slate-300" tick={{ fontSize: isNarrow ? 9 : 12 }} interval={0} angle={isNarrow ? -30 : 0} textAnchor={isNarrow ? 'end' : 'middle'} height={isNarrow ? 60 : 30} />
                  <YAxis tickFormatter={formatYAxis} className="dark:fill-slate-300" width={isNarrow ? 40 : 60} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: isNarrow ? 10 : 12 }} />
                  <Bar dataKey="taxableBase" name={t('reports.taxableBase')} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="taxAmount" name={t('reports.taxAmount')} fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.taxCode')}</TableHead>
                    <TableHead className="text-right">{t('reports.taxableBase')}</TableHead>
                    <TableHead className="text-right">{t('reports.taxAmount')}</TableHead>
                    <TableHead className="text-right">{t('reports.effectiveRate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.taxableBase)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.taxAmount)}</TableCell>
                      <TableCell className="text-right">
                        {row.taxableBase > 0 ? ((row.taxAmount / row.taxableBase) * 100).toFixed(2) : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total Row */}
                  <TableRow className="bg-slate-100 dark:bg-slate-800 font-bold">
                    <TableCell className="font-bold">{t('reports.total')}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totalTaxable)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(totalTax)}</TableCell>
                    <TableCell className="text-right font-bold">
                      {totalTaxable > 0 ? ((totalTax / totalTaxable) * 100).toFixed(2) : 0}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {data && Object.keys(data).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('reports.noVATData')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Product Performance Report
function ProductPerformanceReport() {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsApi.getProductPerformance({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        limit: 25
      });
      setData(res.data.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load product performance data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const chartData = data?.slice(0, 10).map((item: any) => ({
    name: item.product?.name?.substring(0, 20) || 'Unknown',
    revenue: item.revenue,
    margin: item.margin,
    quantitySold: item.quantitySold
  })) || [];

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <CardTitle>{t('reports.productPerfTitle')}</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full md:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full sm:w-40"
            />
            <span className="text-muted-foreground hidden sm:inline">to</span>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full sm:w-40"
            />
          </div>
          <Button onClick={fetchData} disabled={loading} className="w-full sm:w-auto">
            {loading ? t('reports.loading') : t('reports.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        
        {data && data.length > 0 && (
          <div className="space-y-6">
            {/* Top Products by Revenue Chart */}
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                  <XAxis type="number" tickFormatter={formatYAxis} className="dark:fill-slate-300" />
                  <YAxis type="category" dataKey="name" width={isNarrow ? 80 : 150} className="dark:fill-slate-300" tick={{ fontSize: isNarrow ? 10 : 12 }} tickFormatter={(v: string) => truncateLabel(v, isNarrow ? 10 : 20)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: isNarrow ? 10 : 12 }} />
                  <Bar dataKey="revenue" name={t('reports.revenueLbl')} fill="#6366f1" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="margin" name={t('reports.profitMargin')} fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.product')}</TableHead>
                    <TableHead className="text-right">{t('reports.quantitySold')}</TableHead>
                    <TableHead className="text-right">{t('reports.revenueLbl')}</TableHead>
                    <TableHead className="text-right">{t('reports.cogsLbl')}</TableHead>
                    <TableHead className="text-right">{t('reports.margin')}</TableHead>
                    <TableHead className="text-right">{t('reports.marginPercent')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.product?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right">{item.quantitySold?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.revenue)}</TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400">{formatCurrency(item.cogs)}</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">{formatCurrency(item.margin)}</TableCell>
                      <TableCell className="text-right">
                        <span className={item.margin > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                          {item.revenue > 0 ? ((item.margin / item.revenue) * 100).toFixed(1) : 0}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {data && data.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('reports.noProductData')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Customer Lifetime Value Report
function CLVReport() {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsApi.getCLV({ limit: 50 });
      setData(res.data.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load CLV data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const chartData = data?.slice(0, 10).map((item: any) => ({
    name: item._id?.name?.substring(0, 20) || 'Unknown',
    totalSales: item.totalSales,
    orders: item.orders,
    avgOrder: item.avgOrder
  })) || [];

  const totalValue = data?.reduce((sum: number, item: any) => sum + item.totalSales, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reports.clvTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        
        {data && data.length > 0 && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <p className="text-sm text-purple-600 dark:text-purple-400">{t('reports.totalCustomerValue')}</p>
                <p className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400 truncate">{formatCurrency(totalValue)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">{t('reports.totalCustomers')}</p>
                <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{data.length}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">{t('reports.avgCLV')}</p>
                <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 truncate">{formatCurrency(totalValue / data.length)}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                  <XAxis dataKey="name" className="dark:fill-slate-300" tick={{ fontSize: isNarrow ? 9 : 12 }} interval={0} angle={isNarrow ? -30 : 0} textAnchor={isNarrow ? 'end' : 'middle'} height={isNarrow ? 60 : 30} />
                  <YAxis tickFormatter={formatYAxis} className="dark:fill-slate-300" width={isNarrow ? 40 : 60} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="totalSales" name={t('reports.totalSales')} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.customer')}</TableHead>
                    <TableHead className="text-right">{t('reports.orders')}</TableHead>
                    <TableHead className="text-right">{t('reports.avgOrder')}</TableHead>
                    <TableHead className="text-right">{t('reports.totalSales')}</TableHead>
                    <TableHead className="text-right">{t('reports.firstOrder')}</TableHead>
                    <TableHead className="text-right">{t('reports.lastOrder')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item._id?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right">{item.orders}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.avgOrder)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.totalSales)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.firstOrder ? new Date(item.firstOrder).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.lastOrder ? new Date(item.lastOrder).toLocaleDateString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {data && data.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('reports.noCLVData')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Cash Flow Report (Comprehensive IAS 7 Format)
function CashFlowReport() {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [loading, setLoading] = useState(false);
  const [fullData, setFullData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsApi.getCashFlow({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        period
      });
      setFullData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load cash flow data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [period]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  // Get data from response
  const summary = fullData?.summary;
  const months = fullData?.months || [];

  // Calculate totals from summary
  const netOperatingCashFlow = summary?.operating?.netCashFlow || 0;
  const netInvestingCashFlow = summary?.investing?.netCashFlow || 0;
  const netFinancingCashFlow = summary?.financing?.netCashFlow || 0;
  const totalNetCashFlow = summary?.totalNetCashFlow || (netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow);

  // Chart data for monthly view
  const chartData = months.map((item: any) => {
    const operating = (item.cashFromCustomers || 0) - (item.cashToSuppliers || 0) - (item.cashForExpenses || 0) - (item.taxPaid || 0);
    const investing = (item.assetDisposals || 0) - (item.assetPurchases || 0);
    const financing = (item.loanDisbursements || 0) - (item.loanRepayments || 0) + (item.capitalInjections || 0) - (item.dividendsPaid || 0);
    return {
      period: item.period,
      operating,
      investing,
      financing,
      net: operating + investing + financing
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <CardTitle>{t('reports.cashFlowTitle')}</CardTitle>
        <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-center w-full lg:w-auto">
          <div className="flex rounded-md border border-input bg-background">
            <Button
              variant={period === 'weekly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod('weekly')}
              className="rounded-r-none"
            >
              {t('reports.weekly')}
            </Button>
            <Button
              variant={period === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod('monthly')}
              className="rounded-none border-x"
            >
              {t('reports.monthly')}
            </Button>
            <Button
              variant={period === 'yearly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod('yearly')}
              className="rounded-l-none"
            >
              {t('reports.yearly')}
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full sm:w-40"
            />
            <span className="text-muted-foreground hidden sm:inline">to</span>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full sm:w-40"
            />
          </div>
          <Button onClick={fetchData} disabled={loading} className="w-full lg:w-auto">
            {loading ? t('reports.loading') : t('reports.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        
        {summary && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <p className="text-lg font-semibold text-foreground">CASH FLOW STATEMENT</p>
              <p className="text-muted-foreground">{t('reports.ias7Format')}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Operating Activities */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">{t('reports.operatingActivities')}</p>
                <p className={`text-xl md:text-2xl font-bold truncate ${netOperatingCashFlow >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {formatCurrency(netOperatingCashFlow)}
                </p>
                <p className="text-xs text-muted-foreground">{t('reports.operatingCashFlowDesc')}</p>
              </div>
              
              {/* Investing Activities */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">{t('reports.investingActivities')}</p>
                <p className={`text-xl md:text-2xl font-bold truncate ${netInvestingCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {formatCurrency(netInvestingCashFlow)}
                </p>
                <p className="text-xs text-muted-foreground">{t('reports.investingCashFlowDesc')}</p>
              </div>
              
              {/* Financing Activities */}
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <p className="text-sm text-purple-600 dark:text-purple-400">{t('reports.financingActivities')}</p>
                <p className={`text-xl md:text-2xl font-bold truncate ${netFinancingCashFlow >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {formatCurrency(netFinancingCashFlow)}
                </p>
                <p className="text-xs text-muted-foreground">{t('reports.financingCashFlowDesc')}</p>
              </div>
              
              {/* Total Net Cash Flow */}
              <div className={`p-4 rounded-lg ${totalNetCashFlow >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                <p className={`text-sm ${totalNetCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {t('reports.netCashMovement')}
                </p>
                <p className={`text-xl md:text-2xl font-bold truncate ${totalNetCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {formatCurrency(totalNetCashFlow)}
                </p>
                <p className="text-xs text-muted-foreground">Net Change in Cash</p>
              </div>
            </div>

            {/* Detailed Sections */}
            <div className="border rounded-lg overflow-hidden">
              {/* OPERATING ACTIVITIES */}
              <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 border-b">
                <h3 className="font-bold text-lg">{t('reports.operatingActivities')}</h3>
                <p className="text-xs text-muted-foreground">{t('reports.operatingActivitiesDesc')}</p>
              </div>
              <div className="px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('reports.cashFromCustomers')}</span>
                  <span className="font-medium text-green-600 dark:text-green-400">+{formatCurrency(summary.operating?.cashFromCustomers)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('reports.cashToSuppliers')}</span>
                  <span className="font-medium text-red-600 dark:text-red-400">−{formatCurrency(summary.operating?.cashToSuppliers)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('reports.cashForExpenses')}</span>
                  <span className="font-medium text-red-600 dark:text-red-400">−{formatCurrency(summary.operating?.cashForExpenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('reports.taxPaid')}</span>
                  <span className="font-medium text-red-600 dark:text-red-400">−{formatCurrency(summary.operating?.taxPaid)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>{t('reports.netOperatingCashFlow')}</span>
                  <span className={netOperatingCashFlow >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}>
                    {formatCurrency(netOperatingCashFlow)}
                  </span>
                </div>
              </div>

              {/* INVESTING ACTIVITIES */}
              <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 border-b">
                <h3 className="font-bold text-lg">{t('reports.investingActivities')}</h3>
                <p className="text-xs text-muted-foreground">{t('reports.investingActivitiesDesc')}</p>
              </div>
              <div className="px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('reports.assetPurchases')}</span>
                  <span className="font-medium text-red-600 dark:text-red-400">−{formatCurrency(summary.investing?.assetPurchases)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('reports.assetDisposals')}</span>
                  <span className="font-medium text-green-600 dark:text-green-400">+{formatCurrency(summary.investing?.assetDisposals)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>{t('reports.netInvestingCashFlow')}</span>
                  <span className={netInvestingCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                    {formatCurrency(netInvestingCashFlow)}
                  </span>
                </div>
              </div>

              {/* FINANCING ACTIVITIES */}
              <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 border-b">
                <h3 className="font-bold text-lg">{t('reports.financingActivities')}</h3>
                <p className="text-xs text-muted-foreground">{t('reports.financingActivitiesDesc')}</p>
              </div>
              <div className="px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t('reports.loanDisbursements')}</span>
                  <span className="font-medium text-green-600 dark:text-green-400">+{formatCurrency(summary.financing?.loanDisbursements)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('reports.loanRepayments')}</span>
                  <span className="font-medium text-red-600 dark:text-red-400">−{formatCurrency(summary.financing?.loanRepayments)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('reports.capitalInjections')}</span>
                  <span className="font-medium text-green-600 dark:text-green-400">+{formatCurrency(summary.financing?.capitalInjections)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('reports.dividendsPaid')}</span>
                  <span className="font-medium text-red-600 dark:text-red-400">−{formatCurrency(summary.financing?.dividendsPaid)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>{t('reports.netFinancingCashFlow')}</span>
                  <span className={netFinancingCashFlow >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}>
                    {formatCurrency(netFinancingCashFlow)}
                  </span>
                </div>
              </div>

              {/* TOTAL */}
              <div className="flex justify-between px-4 py-4 bg-slate-800 dark:bg-slate-600 text-white font-bold text-lg">
                <span>{t('reports.netCashMovement')}</span>
                <span className={totalNetCashFlow >= 0 ? 'text-green-300' : 'text-orange-300'}>
                  {formatCurrency(totalNetCashFlow)}
                </span>
              </div>
            </div>

            {/* Chart: Line chart for Cash Flow by Category */}
            {chartData.length > 0 && (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                    <XAxis dataKey="period" stroke="#6b7280" fontSize={isNarrow ? 9 : 12} className="dark:fill-slate-300" interval={isNarrow ? 'preserveStartEnd' : 0} />
                    <YAxis stroke="#6b7280" fontSize={isNarrow ? 10 : 12} tickFormatter={formatYAxis} className="dark:fill-slate-300" width={isNarrow ? 40 : 60} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: isNarrow ? 10 : 12 }} />
                    <Line
                      type="monotone"
                      dataKey="operating"
                      name={t('reports.operating')}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="investing"
                      name={t('reports.investing')}
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="financing"
                      name={t('reports.financing')}
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly Breakdown Table */}
            {chartData.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('reports.period')}</TableHead>
                      <TableHead className="text-right text-blue-600 dark:text-blue-400">{t('reports.operating')}</TableHead>
                      <TableHead className="text-right text-green-600 dark:text-green-400">{t('reports.investing')}</TableHead>
                      <TableHead className="text-right text-purple-600 dark:text-purple-400">{t('reports.financing')}</TableHead>
                      <TableHead className="text-right">{t('reports.netCashFlow')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartData.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.period}</TableCell>
                        <TableCell className={`text-right ${item.operating >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {formatCurrency(item.operating)}
                        </TableCell>
                        <TableCell className={`text-right ${item.investing >= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {formatCurrency(item.investing)}
                        </TableCell>
                        <TableCell className={`text-right ${item.financing >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {formatCurrency(item.financing)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${item.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(item.net)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {!summary && !error && (
          <div className="text-center py-8 text-muted-foreground">
            {t('reports.noCashFlowData')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Budget vs Actual Report
function BudgetReport() {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [loading, setLoading] = useState(false);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [data, setData] = useState<BudgetComparison | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch all budgets on mount
  useEffect(() => {
    async function fetchBudgets() {
      try {
        setLoadingBudgets(true);
        const res = await budgetsApi.getAll({ limit: 100, status: 'active' });
        if (res.success && res.data) {
          setBudgets(res.data);
        }
      } catch (err: any) {
        console.error('Failed to load budgets:', err);
      } finally {
        setLoadingBudgets(false);
      }
    }
    fetchBudgets();
  }, []);

  async function fetchData() {
    if (!selectedBudgetId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await budgetsApi.getComparison(selectedBudgetId);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load budget comparison data');
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch comparison when a budget is selected
  useEffect(() => {
    if (selectedBudgetId) {
      fetchData();
    } else {
      setData(null);
    }
  }, [selectedBudgetId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reports.budgetTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Budget Selection Dropdown */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:w-80">
            <Label htmlFor="budget-select" className="mb-2 block">{t('reports.selectBudget')}</Label>
            <Select
              value={selectedBudgetId}
              onValueChange={setSelectedBudgetId}
              disabled={loadingBudgets}
            >
              <SelectTrigger id="budget-select" className="w-full">
                <SelectValue placeholder={loadingBudgets ? t('reports.loadingBudgets') : t('reports.selectBudgetPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {budgets.length === 0 && !loadingBudgets && (
                  <SelectItem value="no-budgets" disabled>
                    {t('reports.noActiveBudgets')}
                  </SelectItem>
                )}
                {budgets.map((budget) => (
                  <SelectItem key={budget._id} value={budget._id}>
                    {budget.name} ({budget.budgetId}) - {budget.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={fetchData} disabled={loading || !selectedBudgetId} className="w-full sm:w-auto mt-auto">
            {loading ? t('reports.loading') : t('reports.refresh')}
          </Button>
        </div>

        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        
        {data && (
          <div className="space-y-6">
            {/* Budget Info */}
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-semibold text-lg">{data.budget?.name || 'Unnamed Budget'}</p>
                  <p className="text-sm text-muted-foreground">Budget ID: {data.budget?.budgetId}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    data.budget?.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    data.budget?.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {data.budget?.status?.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    data.budget?.type === 'revenue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    data.budget?.type === 'expense' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                  }`}>
                    {data.budget?.type?.toUpperCase()}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Period: {data.budget?.periodStart ? new Date(data.budget.periodStart).toLocaleDateString() : '-'} 
                to {data.budget?.periodEnd ? new Date(data.budget.periodEnd).toLocaleDateString() : 'Present'}
              </p>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-600 dark:text-blue-400">{t('reports.budgetedAmount')}</p>
                <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400 truncate">
                  {formatCurrency(data.summary?.budgetedAmount || data.budget?.amount || 0)}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <p className="text-sm text-purple-600 dark:text-purple-400">{t('reports.actualAmount')}</p>
                <p className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400 truncate">
                  {formatCurrency(data.summary?.actualAmount || data.actual?.total || 0)}
                </p>
              </div>
              <div className={`p-4 rounded-lg ${
                (data.summary?.varianceAmount || data.variance?.amount || 0) >= 0 
                  ? 'bg-green-50 dark:bg-green-900/20' 
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <p className={`text-sm ${
                  (data.summary?.varianceAmount || data.variance?.amount || 0) >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>{t('reports.variance')}</p>
                <p className={`text-2xl font-bold ${
                  (data.summary?.varianceAmount || data.variance?.amount || 0) >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {(data.summary?.varianceAmount || data.variance?.amount || 0) >= 0 ? '+' : ''}
                  {formatCurrency(Math.abs(data.summary?.varianceAmount || data.variance?.amount || 0))}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.variance?.status === 'over_budget' || (data.summary?.varianceAmount || 0) > 0 
                    ? t('reports.overBudget') 
                    : t('reports.underBudget')}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('reports.budgetUtilization')}</span>
                <span>{(data.summary?.utilizationPercent || data.utilization?.percent || 0).toFixed(1)}%</span>
              </div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    (data.summary?.utilizationPercent || data.utilization?.percent || 0) <= 100 
                      ? 'bg-blue-500' 
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((data.summary?.utilizationPercent || data.utilization?.percent || 0), 100)}%` }}
                />
              </div>
            </div>

            {/* Summary Box */}
            <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-base md:text-lg text-foreground">
                {t('reports.variance')}: 
                <span className={
                  (data.summary?.varianceAmount || data.variance?.amount || 0) >= 0 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-green-600 dark:text-green-400'
                }>
                  {formatCurrency(Math.abs(data.summary?.varianceAmount || data.variance?.amount || 0))}
                </span>
                <span className="text-muted-foreground ml-2">
                  {data.variance?.status === 'over_budget' || (data.summary?.varianceAmount || 0) > 0 
                    ? `(${t('reports.overBudget')})` 
                    : `(${t('reports.underBudget')})`}
                </span>
              </p>
            </div>

            {/* Item-level Comparison if available */}
            {data.itemComparisons && data.itemComparisons.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold">
                  {t('reports.budgetItemsComparison')}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('reports.category')}</TableHead>
                      <TableHead>{t('reports.description')}</TableHead>
                      <TableHead className="text-right">{t('reports.budgeted')}</TableHead>
                      <TableHead className="text-right">{t('reports.actual')}</TableHead>
                      <TableHead className="text-right">{t('reports.variance')}</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.itemComparisons.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.category}</TableCell>
                        <TableCell className="text-muted-foreground">{item.description || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.budgetedAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.actualAmount || 0)}</TableCell>
                        <TableCell className={`text-right ${
                          (item.variance || 0) >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                          {(item.variance || 0) >= 0 ? '+' : ''}{formatCurrency(item.variance || 0)}
                        </TableCell>
                        <TableCell className={`text-right ${
                          (item.variancePercent || 0) >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                          {(item.variancePercent || 0) >= 0 ? '+' : ''}{(item.variancePercent || 0).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Monthly Breakdown if available */}
            {data.actual?.byMonth && data.actual.byMonth.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 font-bold">
                  {t('reports.monthlyBreakdown')}
                </div>
                <div className="h-64 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={data.actual.byMonth.map((m: any) => ({
                        month: `${m.year}-${String(m.month).padStart(2, '0')}`,
                        actual: m.amount,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                      <XAxis dataKey="month" className="dark:fill-slate-300" tick={{ fontSize: isNarrow ? 9 : 12 }} />
                      <YAxis tickFormatter={formatYAxis} className="dark:fill-slate-300" width={isNarrow ? 40 : 60} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="actual" name="Actual" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {!data && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-600" />
            <p>{t('reports.selectBudgetToCompare')}</p>
            {!loadingBudgets && budgets.length === 0 && (
              <p className="text-sm mt-2">{t('reports.noBudgetsCreateFirst')}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
// Balance Sheet Report
function BalanceSheetReport() {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  // P&L period for Current Period Profit — default to fiscal year start (Jan 1) to today
  const today = new Date().toISOString().split('T')[0];
  const jan1 = `${new Date().getFullYear()}-01-01`;
  const [plStartDate, setPlStartDate] = useState(jan1);
  const [plEndDate, setPlEndDate] = useState(today);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsApi.getBalanceSheet({
        asOfDate: asOfDate || undefined,
        startDate: plStartDate || undefined,
        endDate: plEndDate || undefined,
      });
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Balance Sheet data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>{t('reports.bsTitle')}</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">{t('reports.asOf')}:</Label>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <Button onClick={fetchData} disabled={loading} className="w-full sm:w-auto">
              {loading ? t('reports.loading') : t('reports.refresh')}
            </Button>
          </div>
        </div>
        {/* P&L period pickers — set to same dates as P&L tab for exact Current Period Profit match */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">
            {t('reports.plPeriod')}:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={plStartDate}
              onChange={(e) => setPlStartDate(e.target.value)}
              className="w-36 text-xs h-8"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              value={plEndDate}
              onChange={(e) => setPlEndDate(e.target.value)}
              className="w-36 text-xs h-8"
            />
            <span className="text-xs text-blue-600 dark:text-blue-400">
              ← Set same as P&amp;L tab dates for exact match
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        
        {data && (
          <div className="space-y-6">
            {/* Company & Date Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold text-foreground">{data.company?.name || 'Company'}</h2>
              <p className="text-muted-foreground">TIN: {data.company?.tin || 'N/A'}</p>
              <p className="text-lg font-semibold mt-2">{t('reports.bsTitle').toUpperCase()}</p>
              <p className="text-muted-foreground">{t('reports.asOf')}: {formatDate(data.asOfDate)}</p>
            </div>

            {/* Balance Sheet Structure */}
            <div className="border rounded-lg overflow-hidden">
              {/* ASSETS Section */}
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b">
                <h3 className="font-bold text-lg">{t('reports.assets')}</h3>
              </div>
              
              {/* Current Assets */}
              <div className="px-4 py-2 border-b bg-blue-50/50 dark:bg-blue-900/10">
                <h4 className="font-semibold text-foreground">{t('reports.currentAssets')}</h4>
              </div>
              <div className="px-8 py-2 border-b">
                <div className="flex justify-between py-1">
                  <span>{t('reports.cashAndBank')}</span>
                  <span className="font-medium">{formatCurrency(data.assets?.currentAssets?.cashAndBank)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.accountsReceivable')}</span>
                  <span className="font-medium">{t('reports.unpaidInvoicesOwedToYou')}</span>
                  <span className="font-medium">{formatCurrency(data.assets?.currentAssets?.accountsReceivable)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.inventory')}</span>
                  <span className="font-medium">{t('reports.currentStockValue')}</span>
                  <span className="font-medium">{formatCurrency(data.assets?.currentAssets?.inventoryStockValue)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.accruedExpenses')}</span>
                  <span className="font-medium">{formatCurrency(data.assets?.currentAssets?.prepaidExpenses)}</span>
                </div>
                {(data.details?.inputVAT > 0 || data.assets?.currentAssets?.vatReceivable > 0) && (
                  (data.details?.inputVATReturn || 0) > 0 ? (
                    /* Show full breakdown when VAT returns exist */
                    <>
                      <div className="flex justify-between py-1 pl-4">
                        <span className="text-sm text-muted-foreground">{t('reports.inputVAT')}</span>
                        <span className="text-sm text-muted-foreground">{formatCurrency(data.details?.inputVAT)}</span>
                      </div>
                      <div className="flex justify-between py-1 pl-4 text-red-600 dark:text-red-400">
                        <span className="text-sm">{t('reports.inputVATReturn')}</span>
                        <span className="text-sm font-medium">−{formatCurrency(data.details?.inputVATReturn)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-t border-dashed mt-1 font-semibold">
                        <span>{t('reports.netInputVATReceivable')}</span>
                        <span>{formatCurrency(data.assets?.currentAssets?.vatReceivable)}</span>
                      </div>
                    </>
                  ) : (
                    /* No returns — show single VAT Receivable line */
                    <div className="flex justify-between py-1 font-medium">
                      <span>{t('reports.vatReceivable')}</span>
                      <span>{formatCurrency(data.assets?.currentAssets?.vatReceivable)}</span>
                    </div>
                  )
                )}
              </div>
              <div className="flex justify-between px-8 py-2 bg-blue-100/50 dark:bg-blue-900/20 font-semibold border-b">
                <span>{t('reports.totalCurrentAssets')}</span>
                <span>{formatCurrency(data.assets?.currentAssets?.totalCurrentAssets)}</span>
              </div>

              {/* Non-Current Assets */}
              <div className="px-4 py-2 border-b bg-green-50/50 dark:bg-green-900/10">
                <h4 className="font-semibold text-foreground">{t('reports.nonCurrentAssets')}</h4>
              </div>
              <div className="px-8 py-2 border-b">
                <div className="flex justify-between py-1">
                  <span>{t('reports.equipment')}</span>
                  <span className="font-medium">{formatCurrency(data.assets?.nonCurrentAssets?.equipment)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.computers')}</span>
                  <span className="font-medium">{formatCurrency(data.assets?.nonCurrentAssets?.computers)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.furniture')}</span>
                  <span className="font-medium">{formatCurrency(data.assets?.nonCurrentAssets?.furniture)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.vehicles')}</span>
                  <span className="font-medium">{formatCurrency(data.assets?.nonCurrentAssets?.vehicles)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.buildings')}</span>
                  <span className="font-medium">{formatCurrency(data.assets?.nonCurrentAssets?.buildings)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.machinery')}</span>
                  <span className="font-medium">{formatCurrency(data.assets?.nonCurrentAssets?.machinery)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.other')}</span>
                  <span className="font-medium">{formatCurrency(data.assets?.nonCurrentAssets?.other)}</span>
                </div>
                <div className="flex justify-between py-1 text-red-600 dark:text-red-400">
                  <span>{t('reports.lessDepreciation')}</span>
                  <span className="font-medium">{formatCurrency(data.assets?.nonCurrentAssets?.lessDepreciation)}</span>
                </div>
              </div>
              <div className="flex justify-between px-8 py-2 bg-green-100/50 dark:bg-green-900/20 font-semibold border-b">
                <span>{t('reports.totalNonCurrentAssets')}</span>
                <span>{formatCurrency(data.assets?.nonCurrentAssets?.totalNonCurrentAssets)}</span>
              </div>

              {/* TOTAL ASSETS */}
              <div className="flex justify-between px-4 py-3 bg-slate-200 dark:bg-slate-700 font-bold text-lg border-b">
                <span>{t('reports.totalAssets')}</span>
                <span>{formatCurrency(data.assets?.totalAssets)}</span>
              </div>

              {/* LIABILITIES Section */}
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b">
                <h3 className="font-bold text-lg">{t('reports.liabilities')}</h3>
              </div>
              
              {/* Current Liabilities */}
              <div className="px-4 py-2 border-b bg-orange-50/50 dark:bg-orange-900/10">
                <h4 className="font-semibold text-foreground">{t('reports.currentLiabilities')}</h4>
              </div>
              <div className="px-8 py-2 border-b">
                <div className="flex justify-between py-1">
                  <span>{t('reports.accountsPayable')}</span>
                  <span className="font-medium">{t('reports.unpaidPurchasesOwed')}</span>
                  <span className="font-medium">{formatCurrency(data.liabilities?.currentLiabilities?.accountsPayable)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.vatPayable')}</span>
                  <span className="font-medium">{t('reports.youOweRRA')}</span>
                  <span className="font-medium">{formatCurrency(data.liabilities?.currentLiabilities?.vatPayable)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.shortTermLoans')}</span>
                  <span className="font-medium">{formatCurrency(data.liabilities?.currentLiabilities?.shortTermLoans)}</span>
                </div>
                {(data.liabilities?.currentLiabilities?.incomeTaxPayable > 0) && (
                  <div className="flex justify-between py-1">
                    <span>{t('reports.incomeTaxPayable')}</span>
                    <span className="font-medium">{t('reports.corporateTaxOwed')}</span>
                    <span className="font-medium">{formatCurrency(data.liabilities?.currentLiabilities?.incomeTaxPayable)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span>{t('reports.accruedExpenses')}</span>
                  <span className="font-medium">{formatCurrency(data.liabilities?.currentLiabilities?.accruedExpenses)}</span>
                </div>
                {(data.liabilities?.currentLiabilities?.accruedInterest > 0) && (
                  <div className="flex justify-between py-1 text-orange-700 dark:text-orange-400">
                    <span>{t('reports.accruedInterest')}</span>
                    <span className="font-medium">{t('reports.totalInterestOnLoans')}</span>
                    <span className="font-medium">{formatCurrency(data.liabilities?.currentLiabilities?.accruedInterest)}</span>
                  </div>
                )}
                {/* Custom Current Liabilities from Company Settings */}
                {data.liabilities?.currentLiabilities?.customLiabilities?.length > 0 && (
                  data.liabilities.currentLiabilities.customLiabilities.map((liability: any, idx: number) => (
                    <div key={`custom-current-${idx}`} className="flex justify-between py-1 text-blue-600 dark:text-blue-400">
                      <span>{liability.name}</span>
                      <span className="font-medium">{formatCurrency(liability.amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between px-8 py-2 bg-orange-100/50 dark:bg-orange-900/20 font-semibold border-b">
                <span>{t('reports.totalCurrentLiabilities')}</span>
                <span>{formatCurrency(data.liabilities?.currentLiabilities?.totalCurrentLiabilities)}</span>
              </div>

              {/* Non-Current Liabilities */}
              <div className="px-4 py-2 border-b bg-purple-50/50 dark:bg-purple-900/10">
                <h4 className="font-semibold text-foreground">{t('reports.nonCurrentLiabilities')}</h4>
              </div>
              <div className="px-8 py-2 border-b">
                <div className="flex justify-between py-1">
                  <span>{t('reports.longTermLoans')}</span>
                  <span className="font-medium">{formatCurrency(data.liabilities?.nonCurrentLiabilities?.longTermLoans)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.otherLongTermLiabilities')}</span>
                  <span className="font-medium">{formatCurrency(data.liabilities?.nonCurrentLiabilities?.otherLongTermLiabilities)}</span>
                </div>
                {/* Custom Non-Current Liabilities from Company Settings */}
                {data.liabilities?.nonCurrentLiabilities?.customLiabilities?.length > 0 && (
                  data.liabilities.nonCurrentLiabilities.customLiabilities.map((liability: any, idx: number) => (
                    <div key={`custom-noncurrent-${idx}`} className="flex justify-between py-1 text-blue-600 dark:text-blue-400">
                      <span>{liability.name}</span>
                      <span className="font-medium">{formatCurrency(liability.amount)}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between px-8 py-2 bg-purple-100/50 dark:bg-purple-900/20 font-semibold border-b">
                <span>{t('reports.totalNonCurrentLiabilities')}</span>
                <span>{formatCurrency(data.liabilities?.nonCurrentLiabilities?.totalNonCurrentLiabilities)}</span>
              </div>

              {/* TOTAL LIABILITIES */}
              <div className="flex justify-between px-4 py-3 bg-slate-200 dark:bg-slate-700 font-bold text-lg border-b">
                <span>{t('reports.totalLiabilities')}</span>
                <span>{formatCurrency(data.liabilities?.totalLiabilities)}</span>
              </div>

              {/* EQUITY Section */}
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 border-b">
                <h3 className="font-bold text-lg">{t('reports.equity')}</h3>
              </div>
              <div className="px-8 py-2 border-b">
                <div className="flex justify-between py-1">
                  <span>{t('reports.shareCapital')}</span>
                  <span className="font-medium">{formatCurrency(data.equity?.shareCapital)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.ownerCapital') || "Owner's Capital"}</span>
                  <span className="font-medium">{formatCurrency(data.equity?.ownerCapital)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{t('reports.retainedEarnings')}</span>
                  <span className="font-medium">{formatCurrency(data.equity?.retainedEarnings)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <div>
                    <span>{t('reports.currentPeriodProfit')}</span>
                    <p className="text-xs text-muted-foreground">
                      {t('reports.netProfitFromPL')}
                      {data.plPeriod?.formatted ? ` · ${data.plPeriod.formatted}` : ''}
                    </p>
                  </div>
                  <span className={`font-medium ${data.equity?.currentPeriodProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(data.equity?.currentPeriodProfit)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between px-8 py-2 bg-cyan-100/50 dark:bg-cyan-900/20 font-semibold border-b">
                <span>{t('reports.totalEquity')}</span>
                <span>{formatCurrency(data.equity?.totalEquity)}</span>
              </div>

              {/* TOTAL LIABILITIES + EQUITY */}
              <div className="flex justify-between px-4 py-3 bg-slate-800 dark:bg-slate-600 text-white font-bold text-lg">
                <span>{t('reports.totalLiabilitiesEquity')}</span>
                <span>{formatCurrency(data.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>

            {/* Balance Check */}
            <div className={`text-center p-4 rounded-lg ${data.isBalanced ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <p className={`text-lg font-bold ${data.isBalanced ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {data.isBalanced ? `✅ ${t('reports.balanceSheetBalanced')}` : `⚠️ ${t('reports.balanceSheetNotBalanced')}`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Total Assets: {formatCurrency(data.assets?.totalAssets)} | 
                Total Liabilities + Equity: {formatCurrency(data.totalLiabilitiesAndEquity)}
              </p>
            </div>

            {/* Note about accounting method */}
            <div className="text-xs text-muted-foreground p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="font-semibold">{t('reports.note')}:</p>
              <p>{t('reports.bsNote')}</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>{t('reports.bsNote1')}</li>
                <li>{t('reports.bsNote2')}</li>
                <li>{t('reports.bsNote3')}</li>
                <li>{t('reports.bsNote4')}</li>
              </ul>
            </div>
          </div>
        )}

        {!data && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-600" />
            <p>{t('reports.loadingBS')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Financial Ratios Report
function FinancialRatiosReport() {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsApi.getFinancialRatios({
        asOfDate: asOfDate || undefined,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
      });
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Financial Ratios data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  const formatPercent = (value: number) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const formatRatio = (value: number) => {
    return (value || 0).toFixed(2);
  };

  // API may return ratio fields as objects { value, formula, interpretation }
  // or as plain numbers. Normalize to numeric value for display/helpers.
  const unwrap = (v: any) => {
    if (v == null) return 0;
    if (typeof v === 'object' && 'value' in v) return v.value;
    return v;
  };

  const getStatusColor = (value: number, benchmarks: { good: number; bad: number }, type: 'high' | 'low' | 'range') => {
    if (type === 'high') {
      return value >= benchmarks.good ? 'text-green-600 dark:text-green-400' : value >= benchmarks.bad ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
    } else if (type === 'low') {
      return value <= benchmarks.good ? 'text-green-600 dark:text-green-400' : value <= benchmarks.bad ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
    } else {
      return value >= benchmarks.good && value <= benchmarks.bad ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <CardTitle>{t('reports.ratiosTitle')}</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full md:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">{t('reports.asOf')}:</Label>
              <Input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <span className="text-muted-foreground hidden sm:inline">|</span>
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              placeholder="Start Date"
              className="w-full sm:w-36"
            />
            <span className="text-muted-foreground hidden sm:inline">to</span>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              placeholder="End Date"
              className="w-full sm:w-36"
            />
          </div>
          <Button onClick={fetchData} disabled={loading} className="w-full sm:w-auto">
            {loading ? t('reports.loading') : t('reports.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>}
        
        {data && (
          <div className="space-y-6">
            {/* Company & Date Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold text-foreground">{data.company?.name || 'Company'}</h2>
              <p className="text-lg font-semibold mt-2">{t('reports.ratiosTitle').toUpperCase()}</p>
              <p className="text-muted-foreground">{t('reports.asOf')}: {new Date(asOfDate).toLocaleDateString()}</p>
              {dateRange.startDate && dateRange.endDate && (
                <p className="text-sm text-muted-foreground">
                  Period: {new Date(dateRange.startDate).toLocaleDateString()} - {new Date(dateRange.endDate).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Summary Cards - Liquidity Ratios */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 border-b">
                <h3 className="font-bold text-lg">{t('reports.liquidityRatios')}</h3>
                <p className="text-sm text-muted-foreground">{t('reports.liquidityRatiosDesc')}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {/* Current Ratio */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{t('reports.currentRatio')}</h4>
                      <p className="text-xs text-muted-foreground">{t('reports.currentRatioCalc')}</p>
                    </div>
                    <div className={`text-2xl font-bold ${getStatusColor(unwrap(data.liquidity?.currentRatio), { good: 1.5, bad: 1 }, 'high')}`}>
                      {formatRatio(unwrap(data.liquidity?.currentRatio))}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.currentAssets')}:</span>
                      <span>{formatCurrency(data.sourceData?.currentAssets)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.currentLiabilities')}:</span>
                      <span>{formatCurrency(data.sourceData?.currentLiabilities)}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    {t('reports.benchmark')}: ≥2.0 {t('reports.ideal')}, 1.0-2.0 {t('reports.acceptable')}, &lt;1.0 {t('reports.risky')}
                  </div>
                </div>

                {/* Quick Ratio */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{t('reports.quickRatio')}</h4>
                      <p className="text-xs text-muted-foreground">{t('reports.quickRatioCalc')}</p>
                    </div>
                    <div className={`text-2xl font-bold ${getStatusColor(unwrap(data.liquidity?.quickRatio), { good: 1.0, bad: 0.5 }, 'high')}`}>
                      {formatRatio(unwrap(data.liquidity?.quickRatio))}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.cash')}:</span>
                      <span>{formatCurrency(data.sourceData?.cash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.receivables')}:</span>
                      <span>{formatCurrency(data.sourceData?.receivables)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.currentLiabilities')}:</span>
                      <span>{formatCurrency(data.sourceData?.currentLiabilities)}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    {t('reports.benchmark')}: ≥1.0 {t('reports.ideal')}, 0.5-1.0 {t('reports.acceptable')}, &lt;0.5 {t('reports.risky')}
                  </div>
                </div>
              </div>
            </div>

            {/* Profitability Ratios */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 border-b">
                <h3 className="font-bold text-lg">{t('reports.profitabilityRatios')}</h3>
                <p className="text-sm text-muted-foreground">{t('reports.profitabilityRatiosDesc')}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                {/* Gross Margin */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{t('reports.grossMargin')}</h4>
                      <p className="text-xs text-muted-foreground">{t('reports.grossMarginCalc')}</p>
                    </div>
                    <div className={`text-2xl font-bold ${getStatusColor(unwrap(data.profitability?.grossMargin), { good: 30, bad: 10 }, 'high')}`}>
                      {formatPercent(unwrap(data.profitability?.grossMargin))}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.grossProfit')}:</span>
                      <span>{formatCurrency(data.sourceData?.grossProfit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.revenue')}:</span>
                      <span>{formatCurrency(data.sourceData?.revenue)}</span>
                    </div>
                  </div>
                </div>

                {/* Net Margin */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{t('reports.netMargin')}</h4>
                      <p className="text-xs text-muted-foreground">{t('reports.netMarginCalc')}</p>
                    </div>
                    <div className={`text-2xl font-bold ${getStatusColor(unwrap(data.profitability?.netMargin), { good: 10, bad: 0 }, 'high')}`}>
                      {formatPercent(unwrap(data.profitability?.netMargin))}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.netProfit')}:</span>
                      <span>{formatCurrency(data.sourceData?.netProfit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.revenue')}:</span>
                      <span>{formatCurrency(data.sourceData?.revenue)}</span>
                    </div>
                  </div>
                </div>

                {/* ROA */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{t('reports.roa')}</h4>
                      <p className="text-xs text-muted-foreground">{t('reports.roaCalc')}</p>
                    </div>
                    <div className={`text-2xl font-bold ${getStatusColor(unwrap(data.profitability?.roa), { good: 5, bad: 0 }, 'high')}`}>
                      {formatPercent(unwrap(data.profitability?.roa))}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.netProfit')}:</span>
                      <span>{formatCurrency(data.sourceData?.netProfit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.totalAssets')}:</span>
                      <span>{formatCurrency(data.sourceData?.totalAssets)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Efficiency Ratios */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 border-b">
                <h3 className="font-bold text-lg">{t('reports.efficiencyRatios')}</h3>
                <p className="text-sm text-muted-foreground">{t('reports.efficiencyRatiosDesc')}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                {/* Inventory Turnover */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{t('reports.inventoryTurnover')}</h4>
                      <p className="text-xs text-muted-foreground">{t('reports.inventoryTurnoverCalc')}</p>
                    </div>
                    <div className={`text-2xl font-bold ${getStatusColor(unwrap(data.efficiency?.inventoryTurnover), { good: 6, bad: 2 }, 'high')}`}>
                      {formatRatio(unwrap(data.efficiency?.inventoryTurnover))}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.cogs')}:</span>
                      <span>{formatCurrency(data.sourceData?.cogs)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.avgInventory')}:</span>
                      <span>{formatCurrency(data.sourceData?.averageInventory)}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    {t('reports.benchmark')}: &gt;6 {t('reports.highEfficiency')}, 2-6 {t('reports.average')}, &lt;2 {t('reports.lowEfficiency')}
                  </div>
                </div>

                {/* Receivables Days */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{t('reports.receivablesDays')}</h4>
                      <p className="text-xs text-muted-foreground">{t('reports.receivablesDaysCalc')}</p>
                    </div>
                    <div className={`text-2xl font-bold ${getStatusColor(unwrap(data.efficiency?.receivablesDays), { good: 30, bad: 90 }, 'low')}`}>
                      {formatRatio(unwrap(data.efficiency?.receivablesDays))} {t('reports.days')}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.receivables')}:</span>
                      <span>{formatCurrency(data.sourceData?.receivables)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.revenue')}:</span>
                      <span>{formatCurrency(data.sourceData?.revenue)}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    {t('reports.benchmark')}: &lt;30 {t('reports.excellent')}, 30-60 {t('reports.good')}, 60-90 {t('reports.fair')}, &gt;90 {t('reports.poor')}
                  </div>
                </div>

                {/* Payables Days */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{t('reports.payablesDays')}</h4>
                      <p className="text-xs text-muted-foreground">{t('reports.payablesDaysCalc')}</p>
                    </div>
                    <div className={`text-2xl font-bold ${getStatusColor(unwrap(data.efficiency?.payablesDays), { good: 60, bad: 30 }, 'range')}`}>
                      {formatRatio(unwrap(data.efficiency?.payablesDays))} {t('reports.days')}
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.payables')}:</span>
                      <span>{formatCurrency(data.sourceData?.payables)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('reports.purchases')}:</span>
                      <span>{formatCurrency(data.sourceData?.purchases)}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                    {t('reports.benchmark')}: 30-60 {t('reports.ideal')}, &lt;30 {t('reports.mayStressCash')}, &gt;60 {t('reports.goodCashFlow')}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Assessment */}
            {data.interpretation && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b">
                  <h3 className="font-bold text-lg">{t('reports.overallAssessment')}</h3>
                </div>
                <div className="p-4 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-3 rounded-lg ${data.interpretation.liquidity === 'healthy' ? 'bg-green-50 dark:bg-green-900/20' : data.interpretation.liquidity === 'caution' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <h4 className="font-semibold mb-1">{t('reports.liquidityHealth')}</h4>
                      <p className="text-sm">{data.interpretation.liquidityMessage}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${data.interpretation.profitability === 'healthy' ? 'bg-green-50 dark:bg-green-900/20' : data.interpretation.profitability === 'caution' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <h4 className="font-semibold mb-1">{t('reports.profitabilityHealth')}</h4>
                      <p className="text-sm">{data.interpretation.profitabilityMessage}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${data.interpretation.efficiency === 'healthy' ? 'bg-green-50 dark:bg-green-900/20' : data.interpretation.efficiency === 'caution' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <h4 className="font-semibold mb-1">{t('reports.efficiencyHealth')}</h4>
                      <p className="text-sm">{data.interpretation.efficiencyMessage}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <h4 className="font-semibold mb-1">{t('reports.keyTakeaways')}</h4>
                      <p className="text-sm">{data.interpretation.keyTakeaways}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!data && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-slate-400 dark:text-slate-600" />
            <p>{t('reports.loadingRatios')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Period Reports Tab - Multi-period report selector
function PeriodReportsTab() {
  const { t } = useTranslation();
  const isNarrow = useIsNarrow();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi-annual' | 'annual'>('monthly');
  const [availablePeriods, setAvailablePeriods] = useState<Array<{ year: number; periodNumber: number; label: string; startDate: string; endDate: string; hasSnapshot: boolean }>>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; periodNumber: number } | null>(null);
  const [reportType, setReportType] = useState<'profit-loss' | 'balance-sheet' | 'vat-summary' | 'product-performance' | 'customer-summary' | 'sales-summary' | 'purchases' | 'stock-valuation' | 'stock-movement' | 'low-stock' | 'dead-stock' | 'stock-aging' | 'inventory-turnover' | 'batch-expiry' | 'serial-number-tracking' | 'warehouse-stock' | 'suppliers' | 'aging' | 'cash-flow' | 'financial-ratios' | 'top-products' | 'top-customers' | 'client-statement' | 'supplier-statement' | 'top-clients' | 'top-suppliers' | 'credit-limit' | 'new-clients' | 'inactive-clients' | 'purchase-by-supplier' | 'purchase-by-product' | 'purchase-by-category' | 'accounts-payable' | 'supplier-aging' | 'purchase-returns' | 'purchase-order-status' | 'supplier-performance' | 'sales-by-product' | 'sales-by-category' | 'sales-by-client' | 'sales-by-salesperson' | 'invoice-aging' | 'accounts-receivable' | 'credit-notes' | 'quotation-conversion' | 'recurring-invoice' | 'discount-report' | 'daily-sales-summary' | 'expense-by-category' | 'expense-by-period' | 'expense-vs-budget' | 'employee-expense' | 'petty-cash' | 'vat-return' | 'paye-report' | 'withholding-tax' | 'corporate-tax' | 'tax-payment-history' | 'tax-calendar' | 'asset-register' | 'depreciation-schedule' | 'asset-disposal' | 'asset-maintenance' | 'net-book-value' | 'bank-reconciliation' | 'cash-position' | 'bank-transaction' | 'unreconciled-transactions'>('profit-loss');
  const [clients, setClients] = useState<Array<{ _id: string; name: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Period type labels
  const periodLabels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    'semi-annual': 'Semi-Annual',
    annual: 'Annual'
  };

  // Fetch available periods when period type changes
  useEffect(() => {
    fetchAvailablePeriods();
  }, [periodType]);

  // Fetch clients and suppliers on mount
  useEffect(() => {
    async function fetchClientsAndSuppliers() {
      try {
        setLoadingClients(true);
        setLoadingSuppliers(true);
        
        // Fetch clients
        const clientsRes = await clientsApi.getAll({ limit: 1000 });
        if (clientsRes.success && clientsRes.data) {
          const clientsList = Array.isArray(clientsRes.data) ? clientsRes.data : (clientsRes.data as any).data || [];
          setClients(clientsList.map((c: any) => ({ _id: c._id, name: c.name })));
        }
        
        // Fetch suppliers
        const suppliersRes = await suppliersApi.getAll({ limit: 1000 });
        if (suppliersRes.success && suppliersRes.data) {
          const suppliersList = Array.isArray(suppliersRes.data) ? suppliersRes.data : (suppliersRes.data as any).data || [];
          setSuppliers(suppliersList.map((s: any) => ({ _id: s._id, name: s.name })));
        }
      } catch (err: any) {
        console.error('Failed to fetch clients/suppliers:', err);
      } finally {
        setLoadingClients(false);
        setLoadingSuppliers(false);
      }
    }
    fetchClientsAndSuppliers();
  }, []);

  async function fetchAvailablePeriods() {
    try {
      const res = await reportsApi.getAvailablePeriods(periodType);
      const periods = res.data?.availablePeriods || [];
      console.log('[PeriodReportsTab] fetchAvailablePeriods response:', res);
      console.log('[PeriodReportsTab] periods parsed:', periods);
      setAvailablePeriods(periods);
      
      // Auto-select current period if available
      const now = new Date();
      const currentPeriod = periods.find((p: any) => {
        const startDate = new Date(p.startDate);
        const endDate = new Date(p.endDate);
        return now >= startDate && now <= endDate;
      });
      
      if (currentPeriod) {
        setSelectedPeriod({ year: currentPeriod.year, periodNumber: currentPeriod.periodNumber });
        console.log('[PeriodReportsTab] auto-selected currentPeriod', { year: currentPeriod.year, periodNumber: currentPeriod.periodNumber });
      } else if (periods.length > 0) {
        // Select most recent period
        setSelectedPeriod({ year: periods[0].year, periodNumber: periods[0].periodNumber });
        console.log('[PeriodReportsTab] auto-selected most recent period', { year: periods[0].year, periodNumber: periods[0].periodNumber });
      } else {
        console.log('[PeriodReportsTab] no available periods returned from API');
      }
    } catch (err: any) {
      console.error('[PeriodReportsTab] Failed to fetch available periods:', err);
      if (err && (err.status === 401 || (err.message && err.message.toLowerCase().includes('unauthorized')))) {
        setError(t('reports.errors.authRequired') || 'Authentication required to load periods');
      } else {
        setError(err?.message || 'Failed to load available periods');
      }
      setAvailablePeriods([]);
    }
  }

  async function fetchPeriodReport() {
    if (!selectedPeriod) return;
    
    // Validate client/supplier selection for statement reports
    if (reportType === 'client-statement' && !selectedClient) {
      setError('Please select a client to generate the statement');
      return;
    }
    
    if (reportType === 'supplier-statement' && !selectedSupplier) {
      setError('Please select a supplier to generate the statement');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Build params based on report type
      const params: any = {
        year: selectedPeriod.year,
        periodNumber: selectedPeriod.periodNumber,
        reportType
      };
      
      // Add clientId for client-statement report
      if (reportType === 'client-statement' && selectedClient) {
        params.clientId = selectedClient;
      }
      
      // Add supplierId for supplier-statement report
      if (reportType === 'supplier-statement' && selectedSupplier) {
        params.supplierId = selectedSupplier;
      }
      
      const res = await reportsApi.getPeriodReport(periodType, params);
      console.log('[PeriodReportsTab] fetchPeriodReport response:', res);
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load period report');
    } finally {
      setLoading(false);
    }
  }

  // Fetch report when period or report type changes
  useEffect(() => {
    console.log('[PeriodReportsTab] selectedPeriod changed:', selectedPeriod);
    if (selectedPeriod) {
      fetchPeriodReport();
    }
  }, [selectedPeriod, periodType, reportType, selectedClient, selectedSupplier]);

  const handleExport = async (type: 'pdf' | 'excel') => {
    if (!selectedPeriod || !data) return;
    
    // Validate client/supplier selection for statement reports
    if (reportType === 'client-statement' && !selectedClient) {
      setError('Please select a client to export the statement');
      return;
    }
    
    if (reportType === 'supplier-statement' && !selectedSupplier) {
      setError('Please select a supplier to export the statement');
      return;
    }
    
    try {
      setExporting(true);
      let blob: Blob;
      let filename: string;
      
      const params: any = {
        periodType,
        year: selectedPeriod.year,
        periodNumber: selectedPeriod.periodNumber
      };
      
      // Add clientId for client-statement export
      if (reportType === 'client-statement' && selectedClient) {
        params.clientId = selectedClient;
      }
      
      // Add supplierId for supplier-statement export
      if (reportType === 'supplier-statement' && selectedSupplier) {
        params.supplierId = selectedSupplier;
      }
      
      if (type === 'excel') {
        blob = await reportsApi.exportExcel(reportType, params);
        filename = `${reportType}-${periodType}-${selectedPeriod.year}-${selectedPeriod.periodNumber}.xlsx`;
      } else {
        blob = await reportsApi.exportPDF(reportType, params);
        filename = `${reportType}-${periodType}-${selectedPeriod.year}-${selectedPeriod.periodNumber}.pdf`;
      }
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || `Failed to export ${type.toUpperCase()}`);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  // Get current period info
  const currentPeriodInfo = availablePeriods.find(
    p => p.year === selectedPeriod?.year && p.periodNumber === selectedPeriod?.periodNumber
  );

  // Chart data for comparison
  const comparisonData = data?.comparison ? [
    { name: 'Current', value: data.current?.revenue || data.current?.netRevenue || 0 },
    { name: 'Previous', value: data.previous?.revenue || data.previous?.netRevenue || 0 }
  ] : [];

  // Top products chart data
  const topProductsData = data?.topProducts?.slice(0, 5).map((p: any) => ({
    name: p.name?.substring(0, 15) || 'Unknown',
    revenue: p.revenue || 0,
    quantity: p.quantity || 0
  })) || [];

  // Top customers chart data
  const topCustomersData = data?.topCustomers?.slice(0, 5).map((c: any) => ({
    name: c.name?.substring(0, 15) || 'Unknown',
    revenue: c.revenue || 0,
    orders: c.orders || 0
  })) || [];

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Period Reports
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full md:w-auto">
          {/* Period Type Selector */}
          <div className="flex flex-wrap gap-1">
            {(['daily', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'] as const).map((pt) => (
              <Button
                key={pt}
                variant={periodType === pt ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodType(pt)}
                className="text-xs"
              >
                {periodLabels[pt]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Period Selector & Report Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Available Periods */}
          <div>
            <Label className="mb-2 block">Select Period</Label>
            <Select
              value={selectedPeriod ? `${selectedPeriod.year}-${selectedPeriod.periodNumber}` : ''}
              onValueChange={(val) => {
                const [year, periodNumber] = val.split('-').map(Number);
                setSelectedPeriod({ year, periodNumber });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={'Select period'} />
              </SelectTrigger>
              <SelectContent>
                {availablePeriods.map((period) => (
                  <SelectItem
                    key={`${period.year}-${period.periodNumber}`}
                    value={`${period.year}-${period.periodNumber}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{period.label}</span>
                      {period.hasSnapshot && (
                        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                          Saved
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Report Type */}
          <div>
            <Label className="mb-2 block">Report Type</Label>
            <Select value={reportType} onValueChange={(v: any) => {
              setReportType(v);
              // Reset client/supplier selection when changing report type
              if (v !== 'client-statement') setSelectedClient('');
              if (v !== 'supplier-statement') setSelectedSupplier('');
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                <SelectItem value="vat-summary">VAT Summary</SelectItem>
                <SelectItem value="product-performance">Product Performance</SelectItem>
                <SelectItem value="customer-summary">Customer Summary</SelectItem>
                <SelectItem value="sales-summary">Sales Summary</SelectItem>
                <SelectItem value="purchases">Purchases</SelectItem>
                <SelectItem value="stock-valuation">Stock Valuation</SelectItem>
                <SelectItem value="stock-movement">Stock Movement</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="dead-stock">Dead Stock</SelectItem>
                <SelectItem value="stock-aging">Stock Aging</SelectItem>
                <SelectItem value="inventory-turnover">Inventory Turnover</SelectItem>
                <SelectItem value="batch-expiry">Batch/Expiry</SelectItem>
                <SelectItem value="serial-number-tracking">Serial Number Tracking</SelectItem>
                <SelectItem value="warehouse-stock">Warehouse Stock</SelectItem>
                <SelectItem value="suppliers">Suppliers</SelectItem>
                <SelectItem value="aging">Aging</SelectItem>
                <SelectItem value="cash-flow">Cash Flow</SelectItem>
                <SelectItem value="financial-ratios">Financial Ratios</SelectItem>
                <SelectItem value="top-products">Top Products</SelectItem>
                <SelectItem value="top-customers">Top Customers</SelectItem>
                <SelectItem value="client-statement">Client Statement</SelectItem>
                <SelectItem value="supplier-statement">Supplier Statement</SelectItem>
                <SelectItem value="top-clients">Top Clients by Revenue</SelectItem>
                <SelectItem value="top-suppliers">Top Suppliers by Purchase</SelectItem>
                <SelectItem value="credit-limit">Client Credit Limit</SelectItem>
                <SelectItem value="new-clients">New Clients</SelectItem>
                <SelectItem value="inactive-clients">Inactive Clients</SelectItem>
                <SelectItem value="purchase-by-supplier">Purchase by Supplier</SelectItem>
                <SelectItem value="purchase-by-product">Purchase by Product</SelectItem>
                <SelectItem value="purchase-by-category">Purchase by Category</SelectItem>
                <SelectItem value="accounts-payable">Accounts Payable</SelectItem>
                <SelectItem value="supplier-aging">Supplier Aging</SelectItem>
                <SelectItem value="purchase-returns">Purchase Returns</SelectItem>
                <SelectItem value="purchase-order-status">Purchase Order Status</SelectItem>
                <SelectItem value="supplier-performance">Supplier Performance</SelectItem>
                <SelectItem value="sales-by-product">Sales by Product</SelectItem>
                <SelectItem value="sales-by-category">Sales by Category</SelectItem>
                <SelectItem value="sales-by-client">Sales by Client</SelectItem>
                <SelectItem value="sales-by-salesperson">Sales by Salesperson</SelectItem>
                <SelectItem value="invoice-aging">Invoice Aging Report</SelectItem>
                <SelectItem value="accounts-receivable">Accounts Receivable</SelectItem>
                <SelectItem value="credit-notes">Credit Notes Report</SelectItem>
                <SelectItem value="quotation-conversion">Quotation Conversion</SelectItem>
                <SelectItem value="recurring-invoice">Recurring Invoice Report</SelectItem>
                <SelectItem value="discount-report">Discount Report</SelectItem>
                <SelectItem value="daily-sales-summary">Daily Sales Summary</SelectItem>
                <SelectItem value="expense-by-category">Expense by Category</SelectItem>
                <SelectItem value="expense-by-period">Expense by Period</SelectItem>
                <SelectItem value="expense-vs-budget">Expense vs Budget</SelectItem>
                <SelectItem value="employee-expense">Employee Expense</SelectItem>
                <SelectItem value="petty-cash">Petty Cash Report</SelectItem>
                <SelectItem value="vat-return">VAT Return Report</SelectItem>
                <SelectItem value="paye-report">PAYE Report</SelectItem>
                <SelectItem value="withholding-tax">Withholding Tax Report</SelectItem>
                <SelectItem value="corporate-tax">Corporate Tax Report</SelectItem>
                <SelectItem value="tax-payment-history">Tax Payment History</SelectItem>
                <SelectItem value="tax-calendar">Tax Calendar Report</SelectItem>
                <SelectItem value="asset-register">Asset Register Report</SelectItem>
                <SelectItem value="depreciation-schedule">Depreciation Schedule</SelectItem>
                <SelectItem value="asset-disposal">Asset Disposal Report</SelectItem>
                <SelectItem value="asset-maintenance">Asset Maintenance Report</SelectItem>
                <SelectItem value="net-book-value">Net Book Value Report</SelectItem>
                <SelectItem value="bank-reconciliation">Bank Reconciliation Report</SelectItem>
                <SelectItem value="cash-position">Cash Position Report</SelectItem>
                <SelectItem value="bank-transaction">Bank Transaction Report</SelectItem>
                <SelectItem value="unreconciled-transactions">Unreconciled Transactions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client Filter - shown only for client-statement */}
          {reportType === 'client-statement' && (
            <div>
              <Label className="mb-2 block">Select Client</Label>
              <Select 
                value={selectedClient} 
                onValueChange={(val) => setSelectedClient(val)}
                disabled={loadingClients}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingClients ? 'Loading clients...' : 'Select a client'} />
                </SelectTrigger>
                <SelectContent>
                  {clients.length === 0 && !loadingClients && (
                    <SelectItem value="no-clients" disabled>No clients found</SelectItem>
                  )}
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Supplier Filter - shown only for supplier-statement */}
          {reportType === 'supplier-statement' && (
            <div>
              <Label className="mb-2 block">Select Supplier</Label>
              <Select 
                value={selectedSupplier} 
                onValueChange={(val) => setSelectedSupplier(val)}
                disabled={loadingSuppliers}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingSuppliers ? 'Loading suppliers...' : 'Select a supplier'} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.length === 0 && !loadingSuppliers && (
                    <SelectItem value="no-suppliers" disabled>No suppliers found</SelectItem>
                  )}
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport('excel')}
              disabled={exporting || !data}
              className="flex-1"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
              Export to Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('pdf')}
              disabled={exporting || !data}
              className="flex-1"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Export to PDF
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">{t('reports.loading') || 'Loading...'}</span>
          </div>
        )}

        {/* Report Data */}
        {data && !loading && (
          <div className="space-y-6">
            {/* Period Header */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{periodLabels[periodType]} Report</h3>
                  <p className="text-sm text-muted-foreground">
                    {currentPeriodInfo?.startDate && currentPeriodInfo?.endDate
                      ? `${new Date(currentPeriodInfo.startDate).toLocaleDateString()} - ${new Date(currentPeriodInfo.endDate).toLocaleDateString()}`
                      : selectedPeriod?.year && `Year ${selectedPeriod.year}`
                    }
                    {selectedPeriod?.periodNumber && periodType !== 'annual' && ` - Period ${selectedPeriod.periodNumber}`}
                  </p>
                </div>
                {currentPeriodInfo?.hasSnapshot && (
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
                    ✓ From Snapshot (Instant Load)
                  </span>
                )}
              </div>
            </div>

            {/* Profit & Loss Summary */}
            {reportType === 'profit-loss' && data.summary && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">{t('reports.profitLoss') || 'Profit & Loss'}</h4>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">{t('reports.revenue') || 'Revenue'}</span>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(data.summary.revenue)}
                    </p>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                      <TrendingDown className="h-4 w-4" />
                      <span className="text-sm">{t('reports.cogs') || 'COGS'}</span>
                    </div>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(data.summary.cogs)}
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">{t('reports.grossProfit') || 'Gross Profit'}</span>
                    </div>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(data.summary.grossProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.summary.grossMargin?.toFixed(1)}% margin
                    </p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">{t('reports.netProfit') || 'Net Profit'}</span>
                    </div>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(data.summary.netProfit)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.summary.netMargin?.toFixed(1)}% margin
                    </p>
                  </div>
                </div>

                {/* Comparison vs Previous Period */}
                {data.comparison && (
                  <div className="border border-border rounded-lg p-4">
                    <h5 className="font-semibold mb-3">{t('reports.comparisonVsPrevious') || 'Comparison vs Previous Period'}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('reports.revenue') || 'Revenue'}</span>
                        <span className={`font-semibold ${(data.comparison.revenueChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(data.comparison.revenueChange || 0) >= 0 ? '▲' : '▼'} {Math.abs(data.comparison.revenueChange || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('reports.grossProfit') || 'Gross Profit'}</span>
                        <span className={`font-semibold ${(data.comparison.grossProfitChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(data.comparison.grossProfitChange || 0) >= 0 ? '▲' : '▼'} {Math.abs(data.comparison.grossProfitChange || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('reports.netProfit') || 'Net Profit'}</span>
                        <span className={`font-semibold ${(data.comparison.netProfitChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(data.comparison.netProfitChange || 0) >= 0 ? '▲' : '▼'} {Math.abs(data.comparison.netProfitChange || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Revenue Comparison Chart */}
                {comparisonData.length > 0 && (
                  <div className="h-64 md:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                        <XAxis dataKey="name" className="dark:fill-slate-300" />
                        <YAxis tickFormatter={formatYAxis} className="dark:fill-slate-300" width={isNarrow ? 40 : 60} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" name={t('reports.revenue') || 'Revenue'} fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Top Products */}
            {topProductsData.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">{t('reports.topProducts') || 'Top 5 Products'}</h4>
                
                <div className="h-64 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProductsData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                      <XAxis type="number" tickFormatter={formatYAxis} className="dark:fill-slate-300" />
                      <YAxis type="category" dataKey="name" width={isNarrow ? 80 : 120} className="dark:fill-slate-300" tick={{ fontSize: isNarrow ? 10 : 12 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="revenue" name={t('reports.revenue') || 'Revenue'} fill="#22c55e" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Products Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{t('reports.product') || 'Product'}</TableHead>
                        <TableHead className="text-right">{t('reports.quantity') || 'Quantity'}</TableHead>
                        <TableHead className="text-right">{t('reports.revenue') || 'Revenue'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topProducts?.slice(0, 5).map((product: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-right">{product.quantity?.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(product.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Top Customers */}
            {topCustomersData.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">{t('reports.topCustomers') || 'Top 5 Customers'}</h4>
                
                <div className="h-64 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCustomersData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-700" />
                      <XAxis type="number" tickFormatter={formatYAxis} className="dark:fill-slate-300" />
                      <YAxis type="category" dataKey="name" width={isNarrow ? 80 : 120} className="dark:fill-slate-300" tick={{ fontSize: isNarrow ? 10 : 12 }} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="revenue" name={t('reports.revenue') || 'Revenue'} fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Customers Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{t('reports.customer') || 'Customer'}</TableHead>
                        <TableHead className="text-right">{t('reports.orders') || 'Orders'}</TableHead>
                        <TableHead className="text-right">{t('reports.revenue') || 'Revenue'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topCustomers?.slice(0, 5).map((customer: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{customer.name}</TableCell>
                          <TableCell className="text-right">{customer.orders}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(customer.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* VAT Summary */}
            {reportType === 'vat-summary' && data.vatSummary && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">{t('reports.vatSummary') || 'VAT Summary'}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-400">{t('reports.outputVAT') || 'Output VAT'}</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(data.vatSummary.outputVAT)}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400">{t('reports.inputVAT') || 'Input VAT'}</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(data.vatSummary.inputVAT)}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <p className="text-sm text-purple-600 dark:text-purple-400">{t('reports.netVAT') || 'Net VAT'}</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(data.vatSummary.netVAT)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Balance Sheet */}
            {reportType === 'balance-sheet' && data.balanceSheet && (
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">{t('reports.balanceSheet') || 'Balance Sheet'}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Assets */}
                  <div className="border border-border rounded-lg p-4">
                    <h5 className="font-semibold mb-3 text-blue-600">{t('reports.assets') || 'Assets'}</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('reports.currentAssets') || 'Current Assets'}</span>
                        <span className="font-medium">{formatCurrency(data.balanceSheet.currentAssets)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('reports.fixedAssets') || 'Fixed Assets'}</span>
                        <span className="font-medium">{formatCurrency(data.balanceSheet.fixedAssets)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <span>{t('reports.totalAssets') || 'Total Assets'}</span>
                        <span>{formatCurrency(data.balanceSheet.totalAssets)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Liabilities & Equity */}
                  <div className="border border-border rounded-lg p-4">
                    <h5 className="font-semibold mb-3 text-red-600">{t('reports.liabilitiesEquity') || 'Liabilities & Equity'}</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('reports.liabilities') || 'Liabilities'}</span>
                        <span className="font-medium">{formatCurrency(data.balanceSheet.liabilities)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('reports.equity') || 'Equity'}</span>
                        <span className="font-medium">{formatCurrency(data.balanceSheet.equity)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <span>{t('reports.totalLiabilitiesEquity') || 'Total Liabilities & Equity'}</span>
                        <span>{formatCurrency(data.balanceSheet.totalLiabilitiesEquity)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No Data Message */}
            {!data && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('reports.noData') || 'Select a period to view the report'}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
