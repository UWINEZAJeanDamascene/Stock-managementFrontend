import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../layout/Layout';
import { dashboardApi, type PurchaseDashboardData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/app/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ShoppingCart,
  DollarSign,
  Clock,
  Truck,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Users,
  FileText,
  TrendingUp,
  Package,
  RotateCcw,
} from 'lucide-react';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'fully_received':
      return 'default';
    case 'approved':
      return 'secondary';
    case 'partially_received':
      return 'secondary';
    case 'draft':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  colorClass: string;
  loading?: boolean;
}

function MetricCard({ title, value, subtitle, icon, colorClass, loading }: MetricCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colorClass}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// AP Aging stacked bar config
const agingChartConfig = {
  not_due: { label: 'Not Due', color: '#22c55e' },
  days_1_30: { label: '1-30 Days', color: '#3b82f6' },
  days_31_60: { label: '31-60 Days', color: '#f59e0b' },
  days_61_90: { label: '61-90 Days', color: '#f97316' },
  days_90_plus: { label: '90+ Days', color: '#ef4444' },
} satisfies ChartConfig;

export default function PurchaseDashboardPage() {
  const [data, setData] = useState<PurchaseDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await dashboardApi.getPurchase();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load purchase dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await dashboardApi.clearCache();
    } catch {
      // Cache clear may fail due to permissions; still refetch
    }
    await fetchDashboard();
  };

  const summary = data?.summary;
  const purchaseOrders = data?.purchase_orders;
  const grnPending = data?.grn_pending;
  const purchaseReturns = data?.purchase_returns;
  const apAging = data?.ap_aging;
  const topSuppliers = data?.top_suppliers || [];
  const byStatusList = data?.by_status_list || [];
  const ap = data?.accounts_payable;

  // AP aging data for horizontal stacked bar (single row)
  const agingBarData = apAging
    ? [{
        label: 'AP Outstanding',
        not_due: apAging.not_due,
        days_1_30: apAging.days_1_30,
        days_31_60: apAging.days_31_60,
        days_61_90: apAging.days_61_90,
        days_90_plus: apAging.days_90_plus,
      }]
    : [];

  // Pie chart data for POs by status
  const pieData = byStatusList
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: formatStatusLabel(s.status),
      value: s.count,
      amount: s.total_value,
    }));

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Header - Responsive: one row desktop, one column mobile */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Left: Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
              Purchase Dashboard
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-0.5">
              Procurement, receiving, and payables overview
            </p>
          </div>
          {/* Right: Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-xs sm:text-sm">Refresh</span>
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Row 1: Four Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="POs This Month"
            value={formatNumber(summary?.po_count_mtd ?? 0)}
            subtitle={`${formatNumber(purchaseOrders?.open_count ?? 0)} open · $${formatCurrency(purchaseOrders?.total_value ?? 0)} total`}
            icon={<ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            colorClass="bg-blue-100 dark:bg-blue-900/30"
            loading={loading}
          />
          <MetricCard
            title="Open PO Value"
            value={`$${formatCurrency(summary?.po_open_value ?? 0)}`}
            subtitle={`${formatNumber(purchaseOrders?.open_count ?? 0)} draft + approved`}
            icon={<DollarSign className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            colorClass="bg-indigo-100 dark:bg-indigo-900/30"
            loading={loading}
          />
          <MetricCard
            title="GRN Pending"
            value={formatNumber(summary?.grn_pending_count ?? 0)}
            subtitle={`$${formatCurrency(grnPending?.total_value ?? 0)} invoice · $${formatCurrency(summary?.grn_pending_balance ?? 0)} outstanding`}
            icon={<Truck className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            colorClass="bg-amber-100 dark:bg-amber-900/30"
            loading={loading}
          />
          <MetricCard
            title="AP Overdue"
            value={`$${formatCurrency(summary?.ap_overdue_amount ?? 0)}`}
            subtitle={`$${formatCurrency(summary?.ap_total_outstanding ?? 0)} total outstanding`}
            icon={<AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />}
            colorClass="bg-red-100 dark:bg-red-900/30"
            loading={loading}
          />
        </div>

        {/* Row 2: AP Aging Chart — horizontal stacked bar */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              AP Aging
            </CardTitle>
            <p className="text-sm text-slate-400">
              Outstanding payables by age bucket
              {apAging && (
                <span className="ml-2 font-mono font-medium text-slate-600 dark:text-slate-300">
                  Total: ${formatCurrency(apAging.total_outstanding)}
                </span>
              )}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[120px] w-full" />
            ) : !apAging || apAging.total_outstanding === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                <p className="text-sm">No outstanding payables</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ChartContainer config={agingChartConfig} className="h-[80px] w-full">
                  <BarChart
                    accessibilityLayer
                    data={agingBarData}
                    layout="vertical"
                    margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  >
                    <YAxis type="category" dataKey="label" hide />
                    <XAxis type="number" hide domain={[0, apAging.total_outstanding]} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => (
                            <div className="flex justify-between gap-4">
                              <span>{agingChartConfig[name as keyof typeof agingChartConfig]?.label || name}</span>
                              <span className="font-mono">${formatCurrency(Number(value))}</span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="not_due" stackId="aging" fill="var(--color-not_due)" radius={[4, 0, 0, 4]} />
                    <Bar dataKey="days_1_30" stackId="aging" fill="var(--color-days_1_30)" />
                    <Bar dataKey="days_31_60" stackId="aging" fill="var(--color-days_31_60)" />
                    <Bar dataKey="days_61_90" stackId="aging" fill="var(--color-days_61_90)" />
                    <Bar dataKey="days_90_plus" stackId="aging" fill="var(--color-days_90_plus)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>

                {/* Legend with amounts */}
                <div className="flex flex-wrap gap-4 justify-center">
                  {[
                    { key: 'not_due', label: 'Not Due', color: '#22c55e' },
                    { key: 'days_1_30', label: '1-30 Days', color: '#3b82f6' },
                    { key: 'days_31_60', label: '31-60 Days', color: '#f59e0b' },
                    { key: 'days_61_90', label: '61-90 Days', color: '#f97316' },
                    { key: 'days_90_plus', label: '90+ Days', color: '#ef4444' },
                  ].map((bucket) => {
                    const value = apAging[bucket.key as keyof typeof apAging] as number;
                    if (value === 0) return null;
                    return (
                      <div key={bucket.key} className="flex items-center gap-1.5 text-xs">
                        <div
                          className="h-2.5 w-2.5 rounded-[2px]"
                          style={{ backgroundColor: bucket.color }}
                        />
                        <span className="text-slate-500">{bucket.label}:</span>
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                          ${formatCurrency(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 3: Two Columns — Top Suppliers (table) | POs by Status (pie chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Suppliers by Value */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                Top Suppliers by Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : topSuppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Users className="h-8 w-8 mb-2" />
                  <p className="text-sm">No supplier data available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead className="text-right">GRNs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSuppliers.map((supplier) => (
                      <TableRow key={supplier.supplier_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {supplier.supplier_name}
                            </p>
                            {supplier.supplier_code && (
                              <p className="text-xs text-slate-400">{supplier.supplier_code}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${formatCurrency(supplier.total_value)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-500">
                          {supplier.grn_count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* POs by Status — Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
                Purchase Orders by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : pieData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <ShoppingCart className="h-8 w-8 mb-2" />
                  <p className="text-sm">No purchase orders found</p>
                </div>
              ) : (
                <div>
                  <ChartContainer config={{}} className="h-[220px] w-full">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{name}</span>
                                <span>{value} purchase orders</span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={true}
                      >
                        {pieData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>

                  {/* Status summary below chart */}
                  <div className="flex flex-wrap gap-3 justify-center mt-2">
                    {byStatusList.map((s, index) => (
                      <div key={s.status} className="flex items-center gap-1.5 text-xs">
                        <div
                          className="h-2.5 w-2.5 rounded-[2px]"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <Badge variant={getStatusBadgeVariant(s.status)} className="text-[10px] px-1.5 py-0">
                          {formatStatusLabel(s.status)}
                        </Badge>
                        <span className="font-mono text-slate-500">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Accounts Payable Summary Cards */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Accounts Payable Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Outstanding</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${formatCurrency(ap?.total_outstanding ?? 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Invoices Pending</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatNumber(ap?.invoice_count ?? 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Overdue Amount</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    ${formatCurrency(ap?.overdue_amount ?? 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Overdue Invoices</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatNumber(ap?.overdue_count ?? 0)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 5: Purchase Returns Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-purple-500" />
              Purchase Returns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Returns</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatNumber(purchaseReturns?.total_count ?? 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${formatCurrency(purchaseReturns?.total_amount ?? 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Draft</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatNumber(purchaseReturns?.draft_count ?? 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Confirmed</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatNumber(purchaseReturns?.confirmed_count ?? 0)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
