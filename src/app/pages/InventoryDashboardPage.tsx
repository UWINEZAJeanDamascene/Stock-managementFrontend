import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Layout } from "../layout/Layout";
import { dashboardApi, type InventoryDashboardData } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
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
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import {
  Package,
  Layers,
  DollarSign,
  CheckCircle,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  ShoppingCart,
  Archive,
} from "lucide-react";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

const PIE_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  colorClass: string;
  loading?: boolean;
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  colorClass,
  loading,
}: SummaryCardProps) {
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
        <div className={`p-2 rounded-lg ${colorClass}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">
          {value}
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

const topMovingChartConfig = {
  total_qty: {
    label: "Units Moved",
    color: "#6366f1",
  },
} satisfies ChartConfig;

const warehouseChartConfig = {
  value: {
    label: "Value",
  },
} satisfies ChartConfig;

export default function InventoryDashboardPage() {
  const [data, setData] = useState<InventoryDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const result = await dashboardApi.getInventory();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load inventory dashboard");
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
  const lowStockItems = data?.low_stock_alerts?.items || [];
  const topMoving = data?.top_moving_products || [];
  const warehouseBreakdown = data?.warehouse_breakdown || [];
  const deadStockItems = data?.dead_stock?.items || [];

  // Pie chart data for warehouse breakdown
  const pieData = warehouseBreakdown.map((wh) => ({
    name: wh.warehouse_name || wh.warehouse_code,
    value: wh.total_value,
    units: wh.total_units,
    skus: wh.sku_count,
  }));

  return (
    <Layout>
      <div className="p-4 sm:p-6">
        {/* Header - Responsive: one row desktop, one column mobile */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Left: Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
              Inventory Dashboard
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-0.5">
              Stock overview, alerts, and movement analytics
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
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="text-xs sm:text-sm">Refresh</span>
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
          <SummaryCard
            title="Total SKUs"
            value={formatNumber(summary?.total_sku_count ?? 0)}
            subtitle={`${summary?.in_stock_count ?? 0} in stock, ${summary?.zero_stock_count ?? 0} at zero`}
            icon={
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            }
            colorClass="bg-blue-100 dark:bg-blue-900/30"
            loading={loading}
          />
          <SummaryCard
            title="Total Units"
            value={formatNumber(summary?.total_units ?? 0)}
            subtitle={`${formatNumber(summary?.total_reserved ?? 0)} reserved`}
            icon={
              <Layers className="h-5 w-5 text-green-600 dark:text-green-400" />
            }
            colorClass="bg-green-100 dark:bg-green-900/30"
            loading={loading}
          />
          <SummaryCard
            title="Total Value"
            value={`$${formatCurrency(summary?.total_value ?? 0)}`}
            subtitle="At average cost"
            icon={
              <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            }
            colorClass="bg-amber-100 dark:bg-amber-900/30"
            loading={loading}
          />
          <SummaryCard
            title="Total Available"
            value={formatNumber(summary?.total_available ?? 0)}
            subtitle="On hand minus reserved"
            icon={
              <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            }
            colorClass="bg-purple-100 dark:bg-purple-900/30"
            loading={loading}
          />
        </div>

        {/* Row 2: Low Stock Alerts Table */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Low Stock Alerts
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1">
                Products below reorder point — sorted by shortage severity
              </p>
            </div>
            {!loading && (
              <Badge variant="destructive">{lowStockItems.length} alerts</Badge>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                <p className="text-sm">All products are adequately stocked</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Qty on Hand</TableHead>
                      <TableHead className="text-right">
                        Qty Available
                      </TableHead>
                      <TableHead className="text-right">
                        Reorder Point
                      </TableHead>
                      <TableHead className="text-right">Shortage</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={`${item.product_id}-${item.warehouse_id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.product_code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {item.warehouse_name || "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(item.qty_on_hand)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={`font-mono font-semibold ${item.qty_available <= 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}
                            >
                              {formatNumber(item.qty_available)}
                            </span>
                            {item.qty_reserved > 0 && (
                              <span className="text-xs text-amber-500 dark:text-amber-400">
                                {formatNumber(item.qty_reserved)} reserved
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-500">
                          {formatNumber(item.reorder_point)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                            {formatNumber(item.shortage)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/purchase-orders/new")}
                            className="flex items-center gap-1"
                          >
                            <ShoppingCart className="h-3 w-3" />
                            Create PO
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row 3: Two Columns — Top Moving Products (bar chart) | Warehouse Breakdown (pie chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Moving Products — Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-green-500" />
                Top Moving Products
              </CardTitle>
              <p className="text-sm text-slate-400">
                Last {data?.date_context?.top_moving_window_days ?? 30} days by
                units dispatched
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : topMoving.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Package className="h-8 w-8 mb-2" />
                  <p className="text-sm">No dispatch activity in this period</p>
                </div>
              ) : (
                <ChartContainer
                  config={topMovingChartConfig}
                  className="h-[250px] w-full"
                >
                  <BarChart
                    accessibilityLayer
                    data={topMoving.map((p) => ({
                      name:
                        p.product_name?.length > 15
                          ? p.product_name.substring(0, 15) + "..."
                          : p.product_name,
                      total_qty: p.total_qty,
                    }))}
                    layout="vertical"
                    margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                  >
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      width={110}
                    />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="total_qty"
                      fill="var(--color-total_qty)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Warehouse Breakdown — Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-500" />
                Warehouse Breakdown
              </CardTitle>
              <p className="text-sm text-slate-400">
                Stock value distribution by warehouse
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : pieData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Archive className="h-8 w-8 mb-2" />
                  <p className="text-sm">No warehouse data available</p>
                </div>
              ) : (
                <ChartContainer
                  config={warehouseChartConfig}
                  className="h-[250px] w-full"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{name}</span>
                              <span className="font-mono">
                                ${formatCurrency(Number(value))}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
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
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Dead Stock Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Archive className="h-5 w-5 text-slate-500" />
              Dead Stock
            </CardTitle>
            <p className="text-sm text-slate-400">
              No movement in the last{" "}
              {data?.date_context?.dead_stock_lookback_days ?? 90} days — sorted
              by value
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : deadStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                <p className="text-sm">No dead stock detected</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty on Hand</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">
                        Days Since Last Movement
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadStockItems.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.product_code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(item.qty_on_hand)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${formatCurrency(item.stock_value)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {item.days_no_movement}+ days
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
    </Layout>
  );
}
