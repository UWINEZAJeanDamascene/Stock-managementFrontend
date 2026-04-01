import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../layout/Layout';
import { dashboardApi, type FinanceDashboardData } from '@/lib/api';
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
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Landmark,
  CreditCard,
  Receipt,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  CalendarClock,
  PiggyBank,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const CASH_FLOW_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  colorClass: string;
  loading?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}

function MetricCard({ title, value, subtitle, icon, colorClass, loading, trend }: MetricCardProps) {
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
          <div className="flex items-center gap-1 mt-1">
            {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />}
            {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />}
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const cashFlowChartConfig = {
  inflows: { label: 'Inflows', color: '#22c55e' },
  outflows: { label: 'Outflows', color: '#ef4444' },
} satisfies ChartConfig;

const SOURCE_LABELS: Record<string, string> = {
  ar_receipt: 'AR Receipts',
  ap_payment: 'AP Payments',
  expense: 'Expenses',
  petty_cash_expense: 'Petty Cash',
  payroll_run: 'Payroll',
  tax_settlement: 'Tax Settlement',
  manual: 'Manual',
  invoice: 'Invoice',
  payment: 'Payment',
};

function formatSourceType(st: string): string {
  return SOURCE_LABELS[st] || st.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FinanceDashboardPage() {
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await dashboardApi.getFinance();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load finance dashboard');
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
  const bankBalances = data?.bank_balances;
  const upcomingPayments = data?.upcoming_payments;
  const budgetVsActual = data?.budget_vs_actual;
  const taxLiability = data?.tax_liability;
  const cashFlow = data?.cash_flow_30_days;

  // Cash flow bar chart data
  const cashFlowBarData = cashFlow
    ? [{ label: '30-Day Cash Flow', inflows: cashFlow.inflows, outflows: cashFlow.outflows }]
    : [];

  // Cash flow by source pie data
  const cashFlowPieData = (cashFlow?.by_source || [])
    .filter((s) => (s.cash_debit > 0 || s.cash_credit > 0))
    .map((s) => ({
      name: formatSourceType(s.source_type),
      value: Math.max(s.cash_debit, s.cash_credit),
      debit: s.cash_debit,
      credit: s.cash_credit,
    }));

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Finance Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Bank balances, cash flow, budgets, and tax overview
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
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

        {/* Row 1: Four Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Bank Balance"
            value={`$${formatCurrency(summary?.total_bank_balance ?? 0)}`}
            subtitle={`${bankBalances?.accounts?.length ?? 0} account(s)`}
            icon={<Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            colorClass="bg-blue-100 dark:bg-blue-900/30"
            loading={loading}
          />
          <MetricCard
            title="Upcoming AP"
            value={`$${formatCurrency(summary?.upcoming_ap_total ?? 0)}`}
            subtitle={`${summary?.upcoming_ap_count ?? 0} payments due`}
            icon={<CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            colorClass="bg-amber-100 dark:bg-amber-900/30"
            loading={loading}
          />
          <MetricCard
            title="Net Cash Flow (30d)"
            value={`$${formatCurrency(summary?.net_cash_flow_30d ?? 0)}`}
            subtitle={`In: $${formatCurrency(summary?.cash_inflows_30d ?? 0)} / Out: $${formatCurrency(summary?.cash_outflows_30d ?? 0)}`}
            icon={<TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />}
            colorClass="bg-green-100 dark:bg-green-900/30"
            loading={loading}
            trend={(summary?.net_cash_flow_30d ?? 0) >= 0 ? 'up' : 'down'}
          />
          <MetricCard
            title="Net VAT Payable"
            value={`$${formatCurrency(summary?.net_vat_payable ?? 0)}`}
            subtitle={`${taxLiability?.tax_accounts_configured ?? 0} tax accounts`}
            icon={<Receipt className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
            colorClass="bg-purple-100 dark:bg-purple-900/30"
            loading={loading}
          />
        </div>

        {/* Row 2: Bank Accounts Table | Cash Flow Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bank Balances Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="h-5 w-5 text-blue-500" />
                Bank Balances
              </CardTitle>
              {bankBalances && (
                <p className="text-sm text-slate-400">
                  Total: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">${formatCurrency(bankBalances.total_balance)}</span>
                </p>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !bankBalances?.accounts?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Landmark className="h-8 w-8 mb-2" />
                  <p className="text-sm">No bank accounts configured</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bank</TableHead>
                      <TableHead>Account #</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankBalances.accounts.map((acct) => (
                      <TableRow key={acct.bank_account_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-white">{acct.bank_name}</p>
                            {acct.is_default && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Default</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-slate-500">
                          {acct.account_number || '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {acct.currency} {formatCurrency(acct.current_balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Cash Flow 30 Days Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Cash Flow — Last 30 Days
              </CardTitle>
              {cashFlow && (
                <p className="text-sm text-slate-400">
                  Net: <span className={`font-mono font-medium ${cashFlow.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${formatCurrency(cashFlow.net)}
                  </span>
                </p>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : !cashFlow || (cashFlow.inflows === 0 && cashFlow.outflows === 0) ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <TrendingUp className="h-8 w-8 mb-2" />
                  <p className="text-sm">No cash flow data for this period</p>
                </div>
              ) : (
                <ChartContainer config={cashFlowChartConfig} className="h-[200px] w-full">
                  <BarChart
                    accessibilityLayer
                    data={cashFlowBarData}
                    margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
                  >
                    <XAxis dataKey="label" hide />
                    <YAxis hide />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => (
                            <div className="flex justify-between gap-4">
                              <span>{cashFlowChartConfig[name as keyof typeof cashFlowChartConfig]?.label || name}</span>
                              <span className="font-mono">${formatCurrency(Number(value))}</span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="inflows" fill="var(--color-inflows)" radius={[4, 4, 0, 0]} name="Inflows" />
                    <Bar dataKey="outflows" fill="var(--color-outflows)" radius={[4, 4, 0, 0]} name="Outflows" />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Budget vs Actual | Tax Liability */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Budget vs Actual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-indigo-500" />
                Budget vs Actual
              </CardTitle>
              {budgetVsActual?.has_budget && budgetVsActual.budget_name && (
                <p className="text-sm text-slate-400">
                  {budgetVsActual.budget_name} — Month {budgetVsActual.period_month}/{budgetVsActual.period_year}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !budgetVsActual?.has_budget ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <PiggyBank className="h-8 w-8 mb-2" />
                  <p className="text-sm">{budgetVsActual?.message || 'No approved budget for current fiscal year'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary row */}
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Budgeted</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                        ${formatCurrency(budgetVsActual.total_budgeted ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Actual</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                        ${formatCurrency(budgetVsActual.total_actual ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Variance</p>
                      <p className={`text-lg font-bold font-mono ${(budgetVsActual.total_variance ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${formatCurrency(Math.abs(budgetVsActual.total_variance ?? 0))}
                      </p>
                    </div>
                  </div>

                  {/* Budget lines table */}
                  {budgetVsActual.lines && budgetVsActual.lines.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right">Budgeted</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budgetVsActual.lines.map((line, idx) => (
                          <TableRow key={line.account_id || idx}>
                            <TableCell className="font-mono text-xs text-slate-500">
                              {line.account_id?.slice(-6) || '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${formatCurrency(line.budgeted_amount)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${formatCurrency(line.actual_amount)}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${line.variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              ${formatCurrency(Math.abs(line.variance))}
                            </TableCell>
                            <TableCell>
                              <Badge variant={line.status === 'under_budget' ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0">
                                {line.status === 'under_budget' ? 'Under' : 'Over'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tax Liability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="h-5 w-5 text-purple-500" />
                VAT / Tax Liability
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Output VAT */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Output VAT (Collected)</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                        ${formatCurrency(taxLiability?.output_vat ?? 0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <ArrowUpRight className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>

                  {/* Input VAT */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Input VAT (Paid)</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                        ${formatCurrency(taxLiability?.input_vat ?? 0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <ArrowDownRight className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>

                  {/* Net VAT */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                    <div>
                      <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Net VAT Payable</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 font-mono">
                        ${formatCurrency(taxLiability?.net_vat_payable ?? 0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Receipt className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Upcoming Payments */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-amber-500" />
              Upcoming Payments (Next {upcomingPayments?.days_ahead ?? 14} Days)
            </CardTitle>
            {upcomingPayments && (
              <p className="text-sm text-slate-400">
                {upcomingPayments.count} payment{upcomingPayments.count !== 1 ? 's' : ''} totalling{' '}
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  ${formatCurrency(upcomingPayments.total)}
                </span>
              </p>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !upcomingPayments?.items?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                <p className="text-sm">No upcoming payments in this period</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Left</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingPayments.items.map((payment, idx) => (
                    <TableRow key={`${payment.reference}-${idx}`}>
                      <TableCell className="font-mono text-sm">{payment.reference}</TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {payment.party_name}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {payment.due_date ? new Date(payment.due_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={payment.days_until_due <= 3 ? 'destructive' : payment.days_until_due <= 7 ? 'secondary' : 'outline'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {payment.days_until_due}d
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Row 5: Cash Flow by Source Pie Chart */}
        {cashFlow?.by_source && cashFlow.by_source.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-indigo-500" />
                Cash Flow by Source (30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{name}</span>
                              <span>${formatCurrency(Number(value))}</span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Pie
                      data={cashFlowPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={true}
                    >
                      {cashFlowPieData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CASH_FLOW_COLORS[index % CASH_FLOW_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                {/* Source breakdown table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Debit (In)</TableHead>
                      <TableHead className="text-right">Credit (Out)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashFlow.by_source.map((src, idx) => (
                      <TableRow key={`${src.source_type}-${idx}`}>
                        <TableCell className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-[2px]"
                            style={{ backgroundColor: CASH_FLOW_COLORS[idx % CASH_FLOW_COLORS.length] }}
                          />
                          <span className="font-medium text-slate-900 dark:text-white">
                            {formatSourceType(src.source_type)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600 dark:text-green-400">
                          ${formatCurrency(src.cash_debit)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                          ${formatCurrency(src.cash_credit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
