import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../layout/Layout';
import { dashboardApi, type ExecutiveDashboardData } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  FileText,
} from 'lucide-react';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function getSourceTypeLabel(sourceType?: string): string {
  if (!sourceType) return 'Journal';
  return sourceType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface MetricCardProps {
  title: string;
  value: number;
  change: number | null;
  icon: React.ReactNode;
  prefix?: string;
  colorClass: string;
  loading?: boolean;
}

function MetricCard({ title, value, change, icon, prefix = '', colorClass, loading }: MetricCardProps) {
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

  const isPositive = change !== null && change >= 0;
  const isNeutral = change === null;

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
          {prefix}{formatCurrency(value)}
        </div>
        <div className="flex items-center gap-1 mt-1">
          {!isNeutral && (
            <>
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span className={`text-sm font-medium ${
                isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {formatPercentage(change)}
              </span>
            </>
          )}
          {isNeutral && (
            <span className="text-sm text-slate-400">--</span>
          )}
          <span className="text-sm text-slate-400 ml-1">vs last month</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await dashboardApi.getExecutive();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
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

  const metrics = data?.key_metrics;
  const ar = data?.accounts_receivable;
  const journalEntries = data?.recent_journal_entries || [];

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Executive Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Financial overview for this month
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="ml-auto"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Row 1: Four Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Revenue This Month"
            value={metrics?.revenue.this_month ?? 0}
            change={metrics?.revenue.vs_last_month ?? null}
            icon={<TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />}
            colorClass="bg-green-100 dark:bg-green-900/30"
            loading={loading}
          />
          <MetricCard
            title="Expenses This Month"
            value={metrics?.expenses.this_month ?? 0}
            change={metrics?.expenses.vs_last_month ?? null}
            icon={<TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />}
            colorClass="bg-red-100 dark:bg-red-900/30"
            loading={loading}
          />
          <MetricCard
            title="Net Profit"
            value={metrics?.net_profit.this_month ?? 0}
            change={metrics?.net_profit.vs_last_month ?? null}
            icon={<DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
            colorClass="bg-blue-100 dark:bg-blue-900/30"
            loading={loading}
          />
          <MetricCard
            title="Cash Balance"
            value={metrics?.cash_balance.current ?? 0}
            change={null}
            icon={<Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
            colorClass="bg-purple-100 dark:bg-purple-900/30"
            loading={loading}
          />
        </div>

        {/* Row 2: Two Columns — AR Summary | Recent Journal Entries */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AR Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Accounts Receivable
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Outstanding */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Outstanding</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(ar?.outstanding_total ?? 0)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {ar?.outstanding_count ?? 0} invoice{ar?.outstanding_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>

                  {/* Overdue */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Overdue</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(ar?.overdue_total ?? 0)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {ar?.overdue_count ?? 0} invoice{ar?.overdue_count !== 1 ? 's' : ''}
                        {ar?.overdue_pct_of_outstanding ? ` (${ar.overdue_pct_of_outstanding}% of outstanding)` : ''}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                      <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Journal Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                Recent Journal Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : journalEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <FileText className="h-8 w-8 mb-2" />
                  <p className="text-sm">No journal entries yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {journalEntries.map((entry) => (
                    <div
                      key={entry._id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                          <FileText className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {entry.description || entry.entryNumber || 'Journal Entry'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            {entry.entryNumber && <span>{entry.entryNumber}</span>}
                            {entry.sourceType && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                                {getSourceTypeLabel(entry.sourceType)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {formatCurrency(entry.totalDebit ?? 0)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {entry.date ? new Date(entry.date).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
