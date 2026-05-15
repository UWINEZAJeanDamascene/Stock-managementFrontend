import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Layout } from "../layout/Layout";
import { dashboardApi, type ExecutiveDashboardData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Badge } from "@/app/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/app/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Landmark,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Wallet,
  Zap,
} from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercentage(value: number | null): string {
  if (value === null || value === undefined) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function getSourceTypeLabel(sourceType?: string): string {
  if (!sourceType) return "Journal";
  return sourceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function previousFromChange(current: number, change: number | null): number {
  if (change === null || change === undefined || change <= -99.99) return 0;
  const divisor = 1 + change / 100;
  return divisor === 0 ? 0 : current / divisor;
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

interface MetricTileProps {
  title: string;
  value: number;
  change: number | null;
  icon: ReactNode;
  tone: "green" | "red" | "blue" | "violet";
  loading?: boolean;
  alert?: boolean;
}

const toneClass = {
  green:
    "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  red: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
  blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  violet:
    "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60",
};

function MetricTile({
  title,
  value,
  change,
  icon,
  tone,
  loading,
  alert,
}: MetricTileProps) {
  if (loading) {
    return (
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="mt-5 h-8 w-32" />
          <Skeleton className="mt-3 h-3 w-36" />
        </CardContent>
      </Card>
    );
  }

  const isPositiveChange = change !== null && change >= 0;
  const isNegativeValue = value < 0;

  return (
    <Card
      className={`overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 ${
        alert && isNegativeValue ? "ring-1 ring-red-500/40" : ""
      }`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p
              className={`mt-3 text-2xl font-bold tracking-tight ${
                isNegativeValue
                  ? "text-red-600 dark:text-red-400"
                  : "text-slate-950 dark:text-white"
              }`}
            >
              {formatCurrency(value)}
            </p>
          </div>
          <div className={`rounded-lg p-2.5 ring-1 ${toneClass[tone]}`}>
            {icon}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-xs">
          {change === null ? (
            <span className="text-slate-500 dark:text-slate-400">No comparison</span>
          ) : (
            <>
              {isPositiveChange ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              )}
              <span
                className={`font-semibold ${
                  isPositiveChange
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatPercentage(change)}
              </span>
              <span className="text-slate-500 dark:text-slate-400">vs last month</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PanelTitle({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
      <div className="min-w-0">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
          {icon}
          <span className="truncate">{title}</span>
        </CardTitle>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </CardHeader>
  );
}

function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
      <div className="mb-2 text-slate-500 dark:text-slate-400">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

const pulseChartConfig = {
  revenue: { label: "Revenue", color: "#16a34a" },
  expenses: { label: "Expenses", color: "#dc2626" },
  profit: { label: "Profit", color: "#2563eb" },
} satisfies ChartConfig;

const bridgeChartConfig = {
  amount: { label: "Amount", color: "#2563eb" },
} satisfies ChartConfig;

const arChartConfig = {
  value: { label: "Receivables", color: "#2563eb" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await dashboardApi.getExecutive();
      setData(result);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
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
      // Cache clear may fail due to permissions; still refetch.
    }
    await fetchDashboard();
  };

  const metrics = data?.key_metrics;
  const ar = data?.accounts_receivable;
  const journalEntries = data?.recent_journal_entries || [];
  const upcomingDebt = data?.upcoming_debt_payments;

  const revenue = metrics?.revenue.this_month ?? 0;
  const expenses = metrics?.expenses.this_month ?? 0;
  const profit = metrics?.net_profit.this_month ?? 0;
  const cashBalance = metrics?.cash_balance.current ?? 0;
  const revenuePrev = previousFromChange(revenue, metrics?.revenue.vs_last_month ?? null);
  const expensesPrev = previousFromChange(
    expenses,
    metrics?.expenses.vs_last_month ?? null,
  );
  const profitPrev = previousFromChange(
    profit,
    metrics?.net_profit.vs_last_month ?? null,
  );
  const grossActivity = Math.abs(revenue) + Math.abs(expenses);
  const margin = revenue !== 0 ? (profit / revenue) * 100 : 0;
  const expenseLoad = revenue !== 0 ? (Math.abs(expenses) / Math.abs(revenue)) * 100 : 0;
  const arOutstanding = ar?.outstanding_total ?? 0;
  const arOverdue = ar?.overdue_total ?? 0;
  const arCurrent = Math.max(arOutstanding - arOverdue, 0);
  const arCurrentPct = arOutstanding > 0 ? (arCurrent / arOutstanding) * 100 : 0;
  const debtCoverage =
    (upcomingDebt?.totalAmount ?? 0) > 0
      ? (cashBalance / (upcomingDebt?.totalAmount ?? 1)) * 100
      : 100;
  const cashToRevenue = revenue > 0 ? (cashBalance / revenue) * 100 : 0;
  const score = clampPct(
    50 +
      Math.min(margin, 40) * 0.7 +
      Math.min(arCurrentPct, 100) * 0.2 +
      Math.min(debtCoverage, 200) * 0.05 -
      (cashBalance < 0 ? 30 : 0),
  );
  const scoreLabel = score >= 75 ? "Strong" : score >= 50 ? "Watch" : "Critical";
  const hasNegativeCash = cashBalance < 0;

  const pulseData = [
    {
      period: "Last month",
      revenue: Math.max(revenuePrev, 0),
      expenses: Math.abs(expensesPrev),
      profit: profitPrev,
    },
    {
      period: "This month",
      revenue: Math.max(revenue, 0),
      expenses: Math.abs(expenses),
      profit,
    },
  ];

  const bridgeData = [
    { name: "Revenue", amount: revenue, fill: "#16a34a" },
    { name: "Expenses", amount: expenses, fill: "#dc2626" },
    { name: "Net Profit", amount: profit, fill: profit >= 0 ? "#2563eb" : "#dc2626" },
  ];

  const arDonutData = [
    { name: "Current", value: arCurrent, fill: "#16a34a" },
    { name: "Overdue", value: arOverdue, fill: "#dc2626" },
  ].filter((slice) => slice.value > 0);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1700px] w-full space-y-6 2xl:max-w-[2200px]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] 2xl:grid-cols-[1fr_0.75fr]">
              <div className="p-6 lg:p-7">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/10">
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        Executive Command Center
                      </Badge>
                      {!loading && (
                        <Badge
                          variant={scoreLabel === "Critical" ? "destructive" : "secondary"}
                          className={
                            scoreLabel === "Strong"
                              ? "bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-200"
                              : scoreLabel === "Watch"
                                ? "bg-amber-500/20 text-amber-700 hover:bg-amber-500/20 dark:text-amber-200"
                                : ""
                          }
                        >
                          {scoreLabel}
                        </Badge>
                      )}
                    </div>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                      Executive Dashboard
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-300 sm:text-base">
                      A board-level view of revenue momentum, profitability,
                      cash resilience, receivables risk, and financial activity.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {lastUpdated && (
                      <div className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
                        <Clock className="h-3.5 w-3.5" />
                        {lastUpdated.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="bg-violet-600 text-white hover:bg-violet-700"
                      onClick={() => {
                        window.location.href = "/invoices/new";
                      }}
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span className="ml-1.5 hidden sm:inline">New Invoice</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={() => {
                        window.location.href = "/dashboard/finance";
                      }}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span className="ml-1.5 hidden sm:inline">Finance</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={handleRefresh}
                      disabled={refreshing || loading}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                      />
                      <span className="ml-1.5 hidden sm:inline">Refresh</span>
                    </Button>
                  </div>
                </div>

                <div className="mt-7 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Executive score
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <p className="text-4xl font-bold">{score.toFixed(0)}</p>
                      <Target className="h-6 w-6 text-emerald-300" />
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Profit margin
                    </p>
                    <p className="mt-3 text-3xl font-bold">{margin.toFixed(1)}%</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(profit)} profit on {formatCurrency(revenue)} revenue
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Cash to revenue
                    </p>
                    <p className="mt-3 text-3xl font-bold">{cashToRevenue.toFixed(0)}%</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(cashBalance)} available liquidity
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 bg-white/[0.03] p-5 lg:border-l lg:border-t-0">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-200">
                    Momentum Curve
                  </p>
                  <Badge className="bg-blue-500/20 text-blue-200 hover:bg-blue-500/20">
                    This month
                  </Badge>
                </div>
                {loading ? (
                  <Skeleton className="h-[160px] sm:h-[200px] md:h-[260px] xl:h-[300px] w-full bg-white/10" />
                ) : (
                  <ChartContainer
                    config={pulseChartConfig}
                    className="h-[160px] sm:h-[200px] md:h-[260px] xl:h-[300px] w-full"
                  >
                    <AreaChart
                      accessibilityLayer
                      data={pulseData}
                      margin={{ left: 8, right: 12, top: 16, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#cbd5e1", fontSize: 12 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#cbd5e1", fontSize: 12 }}
                        tickFormatter={(value) => formatCompactCurrency(Number(value))}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="var(--color-revenue)"
                        fill="var(--color-revenue)"
                        fillOpacity={0.22}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="expenses"
                        stroke="var(--color-expenses)"
                        fill="var(--color-expenses)"
                        fillOpacity={0.14}
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="var(--color-profit)"
                        fill="var(--color-profit)"
                        fillOpacity={0.18}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </div>
            </div>
          </div>

          {error && (
            <Card className="border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="sm:ml-auto"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {!loading && hasNegativeCash && (
            <Card className="border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30">
              <CardContent className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800 dark:text-red-200">
                    Critical Cash Alert: Negative Balance of{" "}
                    {formatCurrency(Math.abs(cashBalance))}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Immediate action required. Accelerate collections or review
                    short-term funding.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.location.href = "/ar-receipts/new";
                    }}
                  >
                    Collect Receivables
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.location.href = "/dashboard/finance";
                    }}
                  >
                    View Cash Flow
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              title="Revenue This Month"
              value={revenue}
              change={metrics?.revenue.vs_last_month ?? null}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="green"
              loading={loading}
            />
            <MetricTile
              title="Expenses This Month"
              value={expenses}
              change={metrics?.expenses.vs_last_month ?? null}
              icon={<TrendingDown className="h-5 w-5" />}
              tone="red"
              loading={loading}
            />
            <MetricTile
              title="Net Profit"
              value={profit}
              change={metrics?.net_profit.vs_last_month ?? null}
              icon={<DollarSign className="h-5 w-5" />}
              tone="blue"
              loading={loading}
            />
            <MetricTile
              title="Cash Balance"
              value={cashBalance}
              change={null}
              icon={<Wallet className="h-5 w-5" />}
              tone="violet"
              loading={loading}
              alert
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.9fr] 2xl:grid-cols-[1fr_0.8fr]">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<Zap className="h-4 w-4 text-amber-500" />}
                title="Profit Bridge"
                subtitle="Revenue, expense load, and final profit contribution"
                action={
                  !loading && (
                    <Badge variant={profit >= 0 ? "secondary" : "destructive"}>
                      {formatCurrency(grossActivity)} activity
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[200px] sm:h-[240px] md:h-[300px] xl:h-[360px] w-full" />
                ) : (
                  <div className="grid gap-5 lg:grid-cols-[1fr_260px] xl:grid-cols-[1fr_300px] 2xl:grid-cols-[1fr_360px] lg:items-center">
                    <ChartContainer
                      config={bridgeChartConfig}
                      className="h-[200px] sm:h-[240px] md:h-[300px] xl:h-[360px] w-full"
                    >
                      <BarChart
                        accessibilityLayer
                        data={bridgeData}
                        margin={{ left: 4, right: 20, top: 16, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatCompactCurrency(Number(value))}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => (
                                <span className="font-mono">
                                  {formatCurrency(Number(value))}
                                </span>
                              )}
                            />
                          }
                        />
                        <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                          {bridgeData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            Expense load
                          </span>
                          <span className="font-semibold text-slate-950 dark:text-white">
                            {expenseLoad.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-red-500"
                            style={{ width: `${clampPct(expenseLoad)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            Profit margin
                          </span>
                          <span className="font-semibold text-slate-950 dark:text-white">
                            {margin.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{ width: `${clampPct(margin)}%` }}
                          />
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Net performance
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                          {formatCurrency(profit)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<ShieldCheck className="h-4 w-4 text-blue-500" />}
                title="Receivables Risk"
                subtitle="Collection exposure and overdue concentration"
                action={
                  !loading && (
                    <Badge variant={arOverdue > 0 ? "destructive" : "secondary"}>
                      {ar?.outstanding_count ?? 0} invoices
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[180px] sm:h-[220px] md:h-[300px] xl:h-[340px] w-full" />
                ) : arOutstanding === 0 ? (
                  <EmptyState
                    icon={<ShieldCheck className="h-8 w-8 text-emerald-500" />}
                    message="No outstanding receivables"
                  />
                ) : (
                  <div className="grid gap-5 sm:grid-cols-[minmax(140px,180px)_1fr] md:grid-cols-[minmax(160px,220px)_1fr] xl:grid-cols-[minmax(200px,280px)_1fr] sm:items-center overflow-hidden">
                    <ChartContainer
                      config={arChartConfig}
                      className="mx-auto h-[180px] sm:h-[220px] md:h-[260px] xl:h-[320px] w-full min-w-0"
                    >
                      <PieChart>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">{name}</span>
                                  <span>{formatCurrency(Number(value))}</span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Pie
                          data={arDonutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={92}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                        />
                      </PieChart>
                    </ChartContainer>
                    <div className="space-y-3 min-w-0">
                      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Outstanding
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                          {formatCurrency(arOutstanding)}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="overflow-hidden rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Current
                          </p>
                          <p className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(arCurrent)}
                          </p>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Overdue
                          </p>
                          <p className="mt-1 text-xs font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(arOverdue)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {arCurrentPct.toFixed(0)}% current collection status
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr] 2xl:grid-cols-[1fr_1fr]">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<Landmark className="h-4 w-4 text-amber-500" />}
                title="Debt Watch"
                subtitle="Upcoming debt payments and liquidity coverage"
                action={
                  !loading && upcomingDebt && (
                    <Badge variant={upcomingDebt.totalUpcoming > 0 ? "secondary" : "outline"}>
                      {upcomingDebt.totalUpcoming} due
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[160px] sm:h-[200px] md:h-[260px] xl:h-[300px] w-full" />
                ) : !upcomingDebt || upcomingDebt.totalUpcoming === 0 ? (
                  <EmptyState
                    icon={<Landmark className="h-8 w-8" />}
                    message="No debt payments due in the next 30 days"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                      <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        Total due next 30 days
                      </p>
                      <p className="mt-2 text-3xl font-bold text-amber-950 dark:text-amber-100">
                        {formatCurrency(upcomingDebt.totalAmount)}
                      </p>
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Cash coverage {debtCoverage.toFixed(0)}%
                      </p>
                    </div>
                    <div className="space-y-2">
                      {upcomingDebt.payments.slice(0, 4).map((payment) => (
                        <div
                          key={payment.loanId}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                              {payment.loanName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Due {new Date(payment.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-bold text-slate-950 dark:text-white">
                              {formatCurrency(payment.estimatedAmount)}
                            </p>
                            <Badge
                              variant={payment.daysUntil <= 7 ? "destructive" : "secondary"}
                              className="mt-1 h-5 px-1.5 text-[10px]"
                            >
                              {payment.daysUntil === 0
                                ? "Today"
                                : `${payment.daysUntil}d`}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<FileText className="h-4 w-4 text-blue-500" />}
                title="Executive Activity Feed"
                subtitle="Latest posted accounting events"
                action={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        window.location.href = "/clients/new";
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        window.location.href = "/invoices";
                      }}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                }
              />
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : journalEntries.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-8 w-8" />}
                    message="No journal entries yet"
                  />
                ) : (
                  <div className="space-y-2">
                    {journalEntries.slice(0, 7).map((entry) => (
                      <div
                        key={entry._id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/60"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                            <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                              {entry.description || entry.entryNumber || "Journal Entry"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              {entry.entryNumber && <span>{entry.entryNumber}</span>}
                              {entry.sourceType && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                  {getSourceTypeLabel(entry.sourceType)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="font-mono text-sm font-semibold text-slate-950 dark:text-white">
                            {formatCurrency(entry.totalDebit ?? 0)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {entry.date ? new Date(entry.date).toLocaleDateString() : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <PanelTitle
              icon={<Calendar className="h-4 w-4 text-violet-500" />}
              title="Board Snapshot"
              subtitle="Derived indicators for quick executive review"
            />
            <CardContent>
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-[120px] sm:h-[160px] md:h-[200px] w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Gross activity
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {formatCurrency(grossActivity)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      AR current
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {arCurrentPct.toFixed(0)}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Debt coverage
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {debtCoverage.toFixed(0)}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Activity events
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                      {journalEntries.length}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
