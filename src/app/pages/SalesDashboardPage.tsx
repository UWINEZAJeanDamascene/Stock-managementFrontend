import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../layout/Layout';
import { dashboardApi, type SalesDashboardData } from '@/lib/api';
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
  FileText,
  DollarSign,
  PiggyBank,
  Percent,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Users,
  FileWarning,
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
    case 'fully_paid':
      return 'default';
    case 'confirmed':
      return 'secondary';
    case 'partially_paid':
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

// AR Aging stacked bar config
const agingChartConfig = {
  not_due: { label: 'Not Due', color: '#22c55e' },
  days_1_30: { label: '1-30 Days', color: '#3b82f6' },
  days_31_60: { label: '31-60 Days', color: '#f59e0b' },
  days_61_90: { label: '61-90 Days', color: '#f97316' },
  days_90_plus: { label: '90+ Days', color: '#ef4444' },
} satisfies ChartConfig;

export default function SalesDashboardPage() {
  const [data, setData] = useState<SalesDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await dashboardApi.getSales();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load sales dashboard');
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
  const arAging = data?.ar_aging;
  const topClients = data?.top_clients || [];
  const byStatusList = data?.by_status_list || [];
  const creditNotes = data?.credit_notes;

  // AR aging data for horizontal stacked bar (single row)
  const agingBarData = arAging
    ? [{
        label: 'AR Outstanding',
        not_due: arAging.not_due,
        days_1_30: arAging.days_1_30,
        days_31_60: arAging.days_31_60,
        days_61_90: arAging.days_61_90,
        days_90_plus: arAging.days_90_plus,
      }]
    : [];

  // Pie chart data for invoices by status
  const pieData = byStatusList
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: formatStatusLabel(s.status),
      value: s.count,
      amount: s.total_amount,
    }));

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Header - Responsive: one row desktop, one column mobile */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Left: Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
              Sales Dashboard
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-0.5">
              Revenue, collections, and AR overview
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
            title="Invoices Raised"
            value={formatNumber(summary?.invoices_raised_mtd ?? 0)}
            subtitle="This month"
            icon={<FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            colorClass="bg-blue-100 dark:bg-blue-900/30"
            loading={loading}
          />
          <MetricCard
            title="Total Invoiced"
            value={`$${formatCurrency(summary?.total_invoiced_mtd ?? 0)}`}
            subtitle="This month (excl. drafts)"
            icon={<DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />}
            colorClass="bg-green-100 dark:bg-green-900/30"
            loading={loading}
          />
          <MetricCard
            title="Total Collected"
            value={`$${formatCurrency(data?.invoices?.total_collected ?? 0)}`}
            subtitle="This month"
            icon={<PiggyBank className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
            colorClass="bg-purple-100 dark:bg-purple-900/30"
            loading={loading}
          />
          <MetricCard
            title="Collection Rate"
            value={`${(summary?.collection_rate_pct ?? 0).toFixed(1)}%`}
            subtitle="Collected vs billed MTD"
            icon={<Percent className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            colorClass="bg-amber-100 dark:bg-amber-900/30"
            loading={loading}
          />
        </div>

        {/* Row 2: AR Aging Chart — horizontal stacked bar */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
              AR Aging
            </CardTitle>
            <p className="text-sm text-slate-400">
              Outstanding receivables by age bucket
              {arAging && (
                <span className="ml-2 font-mono font-medium text-slate-600 dark:text-slate-300">
                  Total: ${formatCurrency(arAging.total_ar_outstanding)}
                </span>
              )}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[120px] w-full" />
            ) : !arAging || arAging.total_ar_outstanding === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                <p className="text-sm">No outstanding receivables</p>
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
                    <XAxis type="number" hide domain={[0, arAging.total_ar_outstanding]} />
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
                    const value = arAging[bucket.key as keyof typeof arAging] as number;
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

        {/* Row 3: Two Columns — Top Clients (table) | Invoices by Status (pie chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Clients by Revenue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-500" />
                Top Clients by Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : topClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Users className="h-8 w-8 mb-2" />
                  <p className="text-sm">No client data available</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Invoiced</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Invoices</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topClients.map((client) => (
                      <TableRow key={client.client_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {client.client_name}
                            </p>
                            {client.client_code && (
                              <p className="text-xs text-slate-400">{client.client_code}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${formatCurrency(client.total_invoiced)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                          ${formatCurrency(client.total_paid)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {client.outstanding > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              ${formatCurrency(client.outstanding)}
                            </span>
                          ) : (
                            <span className="text-slate-400">$0.00</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-500">
                          {client.invoice_count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Invoices by Status — Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Invoices by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : pieData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <FileText className="h-8 w-8 mb-2" />
                  <p className="text-sm">No invoices found</p>
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
                                <span>{value} invoices</span>
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

        {/* Row 4: Credit Notes Summary This Month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-red-500" />
              Credit Notes — This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex gap-6">
                <Skeleton className="h-16 w-32" />
                <Skeleton className="h-16 w-32" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Count</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {creditNotes?.count ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Value</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    ${formatCurrency(creditNotes?.total_value ?? 0)}
                  </p>
                </div>
                {summary && summary.total_invoiced_mtd > 0 && creditNotes && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">% of Invoiced</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      {((creditNotes.total_value / summary.total_invoiced_mtd) * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
