import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Layout } from "../layout/Layout";
import {
  dashboardApi,
  type FinanceDashboardData,
  taxDashboardApi,
  type TaxDashboardData,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Badge } from "@/app/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/app/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Cell, PieChart, Pie } from "recharts";
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
  Activity,
  Banknote,
  Clock3,
  Gauge,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDateTime(value?: string): string {
  if (!value) return "Not generated";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not generated";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const CASH_FLOW_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#65a30d",
];

const BANK_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0891b2"];

const SOURCE_LABELS: Record<string, string> = {
  ar_receipt: "AR Receipts",
  ap_payment: "AP Payments",
  expense: "Expenses",
  petty_cash_expense: "Petty Cash",
  payroll_run: "Payroll",
  tax_settlement: "Tax Settlement",
  manual: "Manual",
  invoice: "Invoice",
  payment: "Payment",
  bank_transfer: "Bank Transfer",
  bank_account_opening: "Bank Opening",
  petty_cash_topup: "Petty Cash Topup",
  liability_drawdown: "Liability Drawdown",
  liability_repayment: "Liability Repayment",
};

function formatSourceType(sourceType: string): string {
  return (
    SOURCE_LABELS[sourceType] ||
    sourceType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  tone: "blue" | "amber" | "green" | "violet";
  loading?: boolean;
  trend?: "up" | "down" | "neutral";
}

const toneClass = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
  green:
    "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  violet:
    "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60",
};

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  loading,
  trend,
}: MetricCardProps) {
  if (loading) {
    return (
      <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800">
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

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <div className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {value}
            </div>
          </div>
          <div className={`rounded-lg p-2.5 ring-1 ${toneClass[tone]}`}>
            {icon}
          </div>
        </div>
        {subtitle && (
          <div className="mt-3 flex min-w-0 items-center gap-1">
            {trend === "up" && (
              <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            {trend === "down" && (
              <ArrowDownRight className="h-3.5 w-3.5 flex-shrink-0 text-red-600 dark:text-red-400" />
            )}
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        )}
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
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
      <div className="mb-2 text-slate-400 dark:text-slate-500">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

const cashFlowChartConfig = {
  inflows: { label: "Inflows", color: "#16a34a" },
  outflows: { label: "Outflows", color: "#dc2626" },
} satisfies ChartConfig;

const sourceChartConfig = {
  value: { label: "Cash movement", color: "#2563eb" },
} satisfies ChartConfig;

const budgetChartConfig = {
  budgeted: { label: "Budgeted", color: "#2563eb" },
  actual: { label: "Actual", color: "#f59e0b" },
} satisfies ChartConfig;

export default function FinanceDashboardPage() {
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [taxData, setTaxData] = useState<TaxDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const [financeResult, taxResult] = await Promise.all([
        dashboardApi.getFinance(),
        taxDashboardApi.get({ year: new Date().getFullYear() }),
      ]);
      setData(financeResult);
      if (taxResult.success) {
        setTaxData(taxResult.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load finance dashboard");
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

  const summary = data?.summary;
  const bankBalances = data?.bank_balances;
  const upcomingPayments = data?.upcoming_payments;
  const budgetVsActual = data?.budget_vs_actual;
  const cashFlow = data?.cash_flow_30_days;
  const taxLiability = data?.tax_liability;

  const totalBankBalance =
    summary?.total_bank_balance ?? bankBalances?.total_balance ?? 0;
  const upcomingAp = summary?.upcoming_ap_total ?? upcomingPayments?.total ?? 0;
  const upcomingCount = summary?.upcoming_ap_count ?? upcomingPayments?.count ?? 0;
  const cashInflows = summary?.cash_inflows_30d ?? cashFlow?.inflows ?? 0;
  const cashOutflows = summary?.cash_outflows_30d ?? cashFlow?.outflows ?? 0;
  const netCashFlow = summary?.net_cash_flow_30d ?? cashFlow?.net ?? 0;
  const netVat =
    taxData?.vat?.net ?? summary?.net_vat_payable ?? taxLiability?.net_vat_payable ?? 0;
  const outputVat = taxData?.vat?.output ?? taxLiability?.output_vat ?? 0;
  const inputVat = taxData?.vat?.input ?? taxLiability?.input_vat ?? 0;
  const cashFlowCoverage =
    cashOutflows > 0 ? Math.round((cashInflows / cashOutflows) * 100) : 0;
  const apCoverage =
    upcomingAp > 0 ? Math.round((totalBankBalance / upcomingAp) * 100) : 100;
  const burnMultiple =
    cashInflows > 0 ? Math.round((cashOutflows / cashInflows) * 100) : 0;
  const budgetUtilization =
    (budgetVsActual?.total_budgeted ?? 0) > 0
      ? Math.round(
          ((budgetVsActual?.total_actual ?? 0) /
            (budgetVsActual?.total_budgeted ?? 1)) *
            100,
        )
      : 0;
  const bankConcentration =
    totalBankBalance > 0 && bankBalances?.accounts?.length
      ? Math.round(
          (Math.max(...bankBalances.accounts.map((acct) => acct.current_balance)) /
            totalBankBalance) *
            100,
        )
      : 0;
  const financeHealth =
    netCashFlow < 0 || apCoverage < 100 || budgetVsActual?.over_budget
      ? "Watch"
      : "Stable";

  const cashFlowBarData = cashFlow
    ? [
        {
          label: "30-day cash flow",
          inflows: cashFlow.inflows,
          outflows: cashFlow.outflows,
        },
      ]
    : [];

  const bankPieData = (bankBalances?.accounts || [])
    .filter((account) => account.current_balance > 0)
    .map((account) => ({
      name: account.bank_name,
      value: account.current_balance,
      currency: account.currency,
      account_number: account.account_number,
    }));

  const cashFlowPieData = (cashFlow?.by_source || [])
    .filter((source) => source.cash_debit > 0 || source.cash_credit > 0)
    .map((source) => ({
      name: formatSourceType(source.source_type),
      value: Math.max(source.cash_debit, source.cash_credit),
      debit: source.cash_debit,
      credit: source.cash_credit,
    }));

  const sourceBarData = cashFlowPieData.slice(0, 8).map((source) => ({
    name: source.name.length > 18 ? `${source.name.substring(0, 18)}...` : source.name,
    value: source.value,
  }));

  const budgetBarData = budgetVsActual?.has_budget
    ? [
        {
          label: "Budget",
          budgeted: budgetVsActual.total_budgeted ?? 0,
          actual: budgetVsActual.total_actual ?? 0,
        },
      ]
    : [];

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    Finance Dashboard
                  </h1>
                  {!loading && (
                    <Badge
                      variant={financeHealth === "Watch" ? "destructive" : "secondary"}
                      className="h-6"
                    >
                      {financeHealth}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Liquidity, cash movement, budget control, upcoming obligations,
                  and VAT exposure
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="grid grid-cols-2 gap-2 text-xs sm:flex sm:items-center">
                  <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400">
                      AP coverage
                    </p>
                    <p className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                      {loading ? "-" : `${apCoverage}%`}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400">
                      Generated
                    </p>
                    <p className="mt-0.5 font-semibold text-slate-950 dark:text-white">
                      {loading ? "-" : formatDateTime(data?.generated_at)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing || loading}
                  className="h-10 gap-2"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <Card className="border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Bank Balance"
              value={`$${formatCurrency(totalBankBalance)}`}
              subtitle={`${bankBalances?.accounts?.length ?? 0} bank account(s)`}
              icon={<Landmark className="h-5 w-5" />}
              tone="blue"
              loading={loading}
            />
            <MetricCard
              title="Upcoming AP"
              value={`$${formatCurrency(upcomingAp)}`}
              subtitle={`${formatNumber(upcomingCount)} payment(s) due`}
              icon={<CreditCard className="h-5 w-5" />}
              tone="amber"
              loading={loading}
            />
            <MetricCard
              title="Net Cash Flow"
              value={`$${formatCurrency(netCashFlow)}`}
              subtitle={`In $${formatCurrency(cashInflows)} / Out $${formatCurrency(cashOutflows)}`}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="green"
              loading={loading}
              trend={netCashFlow >= 0 ? "up" : "down"}
            />
            <MetricCard
              title="Net VAT Payable"
              value={`$${formatCurrency(netVat)}`}
              subtitle={`${taxData?.vat?.invoiceCount ?? 0} invoices, ${taxData?.vat?.expenseCount ?? 0} expenses`}
              icon={<Receipt className="h-5 w-5" />}
              tone="violet"
              loading={loading}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
              <PanelTitle
                icon={<Activity className="h-4 w-4 text-emerald-500" />}
                title="Cash Flow Quality"
                subtitle="Inflows, outflows, and net cash movement over 30 days"
                action={
                  !loading && (
                    <Badge variant={netCashFlow >= 0 ? "secondary" : "destructive"}>
                      {netCashFlow >= 0 ? "Positive" : "Negative"}
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[260px] w-full" />
                ) : !cashFlow || (cashFlow.inflows === 0 && cashFlow.outflows === 0) ? (
                  <EmptyState
                    icon={<TrendingUp className="h-8 w-8" />}
                    message="No cash flow data for this period"
                  />
                ) : (
                  <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                    <ChartContainer
                      config={cashFlowChartConfig}
                      className="h-[240px] w-full"
                    >
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
                                  <span>
                                    {cashFlowChartConfig[
                                      name as keyof typeof cashFlowChartConfig
                                    ]?.label || name}
                                  </span>
                                  <span className="font-mono">
                                    ${formatCurrency(Number(value))}
                                  </span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Bar
                          dataKey="inflows"
                          fill="var(--color-inflows)"
                          radius={[6, 6, 0, 0]}
                          barSize={70}
                          name="Inflows"
                        />
                        <Bar
                          dataKey="outflows"
                          fill="var(--color-outflows)"
                          radius={[6, 6, 0, 0]}
                          barSize={70}
                          name="Outflows"
                        />
                      </BarChart>
                    </ChartContainer>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            Cash flow coverage
                          </span>
                          <span className="font-semibold text-slate-950 dark:text-white">
                            {cashFlowCoverage}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(cashFlowCoverage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            Outflow intensity
                          </span>
                          <span className="font-semibold text-slate-950 dark:text-white">
                            {burnMultiple}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-red-500"
                            style={{ width: `${Math.min(burnMultiple, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Inflows
                          </p>
                          <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                            ${formatCurrency(cashInflows)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Outflows
                          </p>
                          <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                            ${formatCurrency(cashOutflows)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<Gauge className="h-4 w-4 text-blue-500" />}
                title="Finance Controls"
                subtitle="Liquidity and budget control indicators"
              />
              <CardContent className="space-y-5">
                {loading ? (
                  <>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </>
                ) : (
                  <>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          Upcoming AP coverage
                        </span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {apCoverage}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${Math.min(apCoverage, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          Budget utilization
                        </span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {budgetUtilization}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={`h-2 rounded-full ${
                            budgetUtilization > 100 ? "bg-red-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          Bank concentration
                        </span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {bankConcentration}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-violet-500"
                          style={{ width: `${Math.min(bankConcentration, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Tax accounts
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                          {formatNumber(taxLiability?.tax_accounts_configured ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Payments
                        </p>
                        <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                          {formatNumber(upcomingCount)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<Landmark className="h-4 w-4 text-blue-500" />}
                title="Bank Balances"
                subtitle="Liquidity by financial account"
                action={
                  !loading && (
                    <Badge variant="secondary">
                      ${formatCurrency(bankBalances?.total_balance ?? 0)}
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !bankBalances?.accounts?.length ? (
                  <EmptyState
                    icon={<Landmark className="h-8 w-8" />}
                    message="No bank accounts configured"
                  />
                ) : (
                  <div className="grid gap-5 md:grid-cols-[230px_1fr] md:items-center">
                    <ChartContainer
                      config={{ value: { label: "Balance", color: "#2563eb" } }}
                      className="mx-auto h-[220px] w-full"
                    >
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
                          data={bankPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={82}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                        >
                          {bankPieData.map((_entry, index) => (
                            <Cell
                              key={`bank-${index}`}
                              fill={BANK_COLORS[index % BANK_COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Bank</TableHead>
                          <TableHead>Account #</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankBalances.accounts.map((account) => (
                          <TableRow key={account.bank_account_id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-950 dark:text-white">
                                  {account.bank_name}
                                </p>
                                {account.is_default && (
                                  <Badge
                                    variant="secondary"
                                    className="h-5 px-1.5 text-[10px]"
                                  >
                                    Default
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-slate-500">
                              {account.account_number || "-"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              {account.currency} {formatCurrency(account.current_balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<PiggyBank className="h-4 w-4 text-indigo-500" />}
                title="Budget vs Actual"
                subtitle={
                  budgetVsActual?.has_budget && budgetVsActual.budget_name
                    ? `${budgetVsActual.budget_name} - Month ${budgetVsActual.period_month}/${budgetVsActual.period_year}`
                    : "Current approved budget"
                }
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[260px] w-full" />
                ) : !budgetVsActual?.has_budget ? (
                  <EmptyState
                    icon={<PiggyBank className="h-8 w-8" />}
                    message={
                      budgetVsActual?.message ||
                      "No approved budget for current fiscal year"
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    <ChartContainer
                      config={budgetChartConfig}
                      className="h-[160px] w-full"
                    >
                      <BarChart
                        accessibilityLayer
                        data={budgetBarData}
                        margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
                      >
                        <XAxis dataKey="label" hide />
                        <YAxis hide />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => (
                                <div className="flex justify-between gap-4">
                                  <span>
                                    {budgetChartConfig[
                                      name as keyof typeof budgetChartConfig
                                    ]?.label || name}
                                  </span>
                                  <span className="font-mono">
                                    ${formatCurrency(Number(value))}
                                  </span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Bar
                          dataKey="budgeted"
                          fill="var(--color-budgeted)"
                          radius={[6, 6, 0, 0]}
                          barSize={70}
                        />
                        <Bar
                          dataKey="actual"
                          fill="var(--color-actual)"
                          radius={[6, 6, 0, 0]}
                          barSize={70}
                        />
                      </BarChart>
                    </ChartContainer>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Budgeted
                        </p>
                        <p className="mt-1 font-mono text-sm font-bold text-slate-950 dark:text-white">
                          ${formatCurrency(budgetVsActual.total_budgeted ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Actual
                        </p>
                        <p className="mt-1 font-mono text-sm font-bold text-slate-950 dark:text-white">
                          ${formatCurrency(budgetVsActual.total_actual ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Variance
                        </p>
                        <p
                          className={`mt-1 font-mono text-sm font-bold ${
                            (budgetVsActual.total_variance ?? 0) >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          ${formatCurrency(Math.abs(budgetVsActual.total_variance ?? 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<Receipt className="h-4 w-4 text-violet-500" />}
                title="VAT / Tax Liability"
                subtitle="Output VAT less recoverable input VAT"
                action={
                  !loading && (
                    <Badge variant={netVat > 0 ? "destructive" : "secondary"}>
                      {netVat > 0 ? "Payable" : "Clear"}
                    </Badge>
                  )
                }
              />
              <CardContent>
                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Output VAT
                        </p>
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      </div>
                      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                        ${formatCurrency(outputVat)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Input VAT
                        </p>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      </div>
                      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                        ${formatCurrency(inputVat)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-violet-700 dark:text-violet-300">
                          Net VAT
                        </p>
                        <Receipt className="h-4 w-4 text-violet-500" />
                      </div>
                      <p className="mt-2 text-2xl font-bold text-violet-950 dark:text-violet-100">
                        ${formatCurrency(netVat)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<CalendarClock className="h-4 w-4 text-amber-500" />}
                title={`Upcoming Payments (Next ${upcomingPayments?.days_ahead ?? 14} Days)`}
                subtitle={`${upcomingPayments?.count ?? 0} payment(s), $${formatCurrency(upcomingPayments?.total ?? 0)} total`}
              />
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !upcomingPayments?.items?.length ? (
                  <EmptyState
                    icon={<CheckCircle className="h-8 w-8 text-emerald-500" />}
                    message="No upcoming payments in this period"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Reference</TableHead>
                          <TableHead>Party</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Days</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingPayments.items.map((payment, idx) => (
                          <TableRow key={`${payment.reference}-${idx}`}>
                            <TableCell className="font-mono text-sm">
                              {payment.reference}
                            </TableCell>
                            <TableCell className="font-medium text-slate-950 dark:text-white">
                              {payment.party_name}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              ${formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {payment.due_date
                                ? new Date(payment.due_date).toLocaleDateString()
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  payment.days_until_due <= 3
                                    ? "destructive"
                                    : payment.days_until_due <= 7
                                      ? "secondary"
                                      : "outline"
                                }
                                className="h-5 px-1.5 text-[10px]"
                              >
                                {payment.days_until_due}d
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<TrendingDown className="h-4 w-4 text-indigo-500" />}
                title="Cash Flow by Source"
                subtitle="Largest inflow and outflow sources over 30 days"
              />
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : sourceBarData.length === 0 ? (
                  <EmptyState
                    icon={<WalletCards className="h-8 w-8" />}
                    message="No source-level cash flow data"
                  />
                ) : (
                  <ChartContainer
                    config={sourceChartConfig}
                    className="h-[300px] w-full"
                  >
                    <BarChart
                      accessibilityLayer
                      data={sourceBarData}
                      layout="vertical"
                      margin={{ left: 8, right: 20, top: 8, bottom: 8 }}
                    >
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                        width={132}
                      />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `$${formatNumber(Number(value))}`}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => (
                              <span className="font-mono">
                                ${formatCurrency(Number(value))}
                              </span>
                            )}
                          />
                        }
                      />
                      <Bar
                        dataKey="value"
                        fill="var(--color-value)"
                        radius={[0, 6, 6, 0]}
                        barSize={24}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <PanelTitle
                icon={<Banknote className="h-4 w-4 text-blue-500" />}
                title="Cash Movement Ledger"
                subtitle="Debit and credit movement by source"
              />
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : !cashFlow?.by_source?.length ? (
                  <EmptyState
                    icon={<ShieldCheck className="h-8 w-8" />}
                    message="No cash source records found"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Source</TableHead>
                          <TableHead className="text-right">Debit In</TableHead>
                          <TableHead className="text-right">Credit Out</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cashFlow.by_source.map((source, index) => (
                          <TableRow key={`${source.source_type}-${index}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      CASH_FLOW_COLORS[index % CASH_FLOW_COLORS.length],
                                  }}
                                />
                                <span className="font-medium text-slate-950 dark:text-white">
                                  {formatSourceType(source.source_type)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                              ${formatCurrency(source.cash_debit)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                              ${formatCurrency(source.cash_credit)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
