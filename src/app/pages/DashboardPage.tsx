import { useEffect, useState } from 'react';
import { Layout } from '../layout/Layout';
import { dashboardApi, invoicesApi, productsApi, bankAccountsApi } from '@/lib/api';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCompactNumber } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { 
  Package, 
  Users, 
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Smartphone,
  Wallet
} from 'lucide-react';
import { Circle, MinusCircle, Truck, ShoppingCart } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardData {
  products: {
    total: number;
    totalLastMonth?: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  };
  invoices: {
    total: number;
    pending: number;
    monthly: { count: number; total: number; paid: number };
    yearly: { count: number; total: number; paid: number };
  };
  quotations: { active: number };
  clients: { total: number; totalLastMonth?: number };
}

interface SalesData {
  month: string;
  sales: number;
}

interface StockData {
  type: string;
  quantity: number;
}

interface TopProductData {
  _id: {
    name: string;
    sku: string;
  };
  totalRevenue: number;
  totalQuantity: number;
}

interface TopClientData {
  _id: {
    name: string;
    code: string;
  };
  totalAmount: number;
  invoiceCount: number;
}

interface InvoiceStatusData {
  status: string;
  count: number;
}

interface CashPosition {
  total: number;
  byType: {
    bk_bank: number;
    equity_bank: number;
    im_bank: number;
    cogebanque: number;
    ecobank: number;
    mtn_momo: number;
    airtel_money: number;
    cash_in_hand: number;
  };
  accounts?: Array<{
    _id: string;
    name: string;
    accountType: string;
    currentBalance: number;
  }>;
}

// Generate mock data for demonstration when API returns empty data
const getMockSalesData = (): SalesData[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return months.map((month, index) => ({
    month,
    sales: Math.floor(Math.random() * 50000) + 10000 + (index * 5000),
  }));
};

// Helper to convert API date format to month name
const convertToMonthName = (dateStr: string): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // If it's already a short month name, return as is
  if (months.includes(dateStr)) {
    return dateStr;
  }
  
  // Try to parse as date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return months[date.getMonth()];
  }
  
  return dateStr;
};

const getMockStockData = (): StockData[] => {
  return [
    { type: 'in', quantity: Math.floor(Math.random() * 500) + 100 },
    { type: 'out', quantity: Math.floor(Math.random() * 300) + 50 },
  ];
};

// Colors for pie charts
const COLORS = ['#22c55e', '#eab308', '#ef4444', '#6366f1', '#8b5cf6'];

export default function DashboardPage() {
  const { formatCurrency, convertAmount, displayCurrency } = useCurrency();
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductData[]>([]);
  const [topClients, setTopClients] = useState<TopClientData[]>([]);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatusData[]>([]);
  const [reorderAlerts, setReorderAlerts] = useState<any[]>([]);
  const [cashPosition, setCashPosition] = useState<CashPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesPeriod, setSalesPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [stockPeriod, setStockPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Responsive helpers for charts
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isNarrow = windowWidth < 640; // tailwind 'sm' breakpoint

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        const [statsRes, salesRes, stockRes, topProductsRes, topClientsRes, invoicesRes, bankRes] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getSalesChart({ period: salesPeriod }),
          dashboardApi.getStockMovementChart({ period: stockPeriod }),
          dashboardApi.getTopSellingProducts({ limit: 5 }),
          dashboardApi.getTopClients({ limit: 5 }),
          invoicesApi.getAll({ limit: 1000 }),
          bankAccountsApi.getAll(),
        ]);

        // Reorder alerts - products needing reorder based on configured reorder points
        try {
          const reorderRes = await dashboardApi.getReorderAlerts();
          if (reorderRes.success) {
            setReorderAlerts(reorderRes.data as any[]);
          }
        } catch (e) {
          console.error('Failed to fetch reorder alerts:', e);
        }

        // Low stock / Out of stock alerts - products that are out of stock (currentStock = 0)
        // This doesn't require reorder points to be configured
        try {
          const productsRes = await productsApi.getAll({ limit: 1000 });
          if (productsRes.success) {
            const allProducts = productsRes.data as any[];
            // Filter to show products with zero or negative stock
            const outOfStockProducts = allProducts.filter(p => (p.currentStock || 0) <= 0);
            // Combine with reorder alerts (filter out duplicates)
            if (outOfStockProducts.length > 0) {
              const existingIds = new Set(reorderAlerts.map(r => r.product?._id || r.product));
              const newOutOfStock = outOfStockProducts
                .filter(p => !existingIds.has(p._id))
                .map(p => ({
                  _reorderPointId: null,
                  product: { _id: p._id, name: p.name, sku: p.sku, currentStock: 0 },
                  supplier: p.preferredSupplier || null,
                  currentStock: 0,
                  reorderPoint: 0,
                  reorderQuantity: p.reorderQuantity || 10,
                  safetyStock: 0,
                  isBelowSafetyStock: true,
                  estimatedCost: 0,
                  leadTimeDays: 7,
                  autoReorder: false,
                  isOutOfStock: true
                }));
              setReorderAlerts(prev => [...newOutOfStock, ...prev]);
            }
          }
        } catch (e) {
          console.error('Failed to fetch low stock products:', e);
        }

        if (statsRes.success) {
          setData(statsRes.data as DashboardData);
        }
        
        if (salesRes.success) {
          const sales = salesRes.data as SalesData[];
          // Convert date strings to month names
          const formattedSales = sales.map(item => ({
            ...item,
            month: convertToMonthName(item.month)
          }));
          console.log('Sales data received:', formattedSales);
          setSalesData(formattedSales);
        }
        
        if (stockRes.success) {
          const stock = stockRes.data as StockData[];
          console.log('Stock data received:', stock);
          setStockData(stock);
        }
        
        if (topProductsRes.success) {
          const products = topProductsRes.data as TopProductData[];
          console.log('Top products received:', products);
          setTopProducts(products);
        }
        
        if (topClientsRes.success) {
          const clients = topClientsRes.data as TopClientData[];
          console.log('Top clients received:', clients);
          setTopClients(clients);
        }
        
        // Process invoice status from actual invoice data
        if (invoicesRes.success) {
          const invoices = invoicesRes.data as any[];
          const paidCount = invoices.filter(inv => inv.status === 'paid').length;
          const pendingCount = invoices.filter(inv => inv.status === 'pending' || inv.status === 'partial').length;
          const overdueCount = invoices.filter(inv => inv.status === 'overdue').length;
          
          setInvoiceStatus([
            { status: 'Paid', count: paidCount },
            { status: 'Pending', count: pendingCount },
            { status: 'Overdue', count: overdueCount },
          ]);
        }
        
        // Set cash position from bank accounts
        if (bankRes.success) {
          setCashPosition(bankRes.totals as CashPosition);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Fetch chart data when period changes
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const [salesRes, stockRes] = await Promise.all([
          dashboardApi.getSalesChart({ period: salesPeriod }),
          dashboardApi.getStockMovementChart({ period: stockPeriod }),
        ]);
        
        if (salesRes.success) {
          const sales = salesRes.data as SalesData[];
          // Convert date strings to month names
          const formattedSales = sales.map(item => ({
            ...item,
            month: convertToMonthName(item.month)
          }));
          setSalesData(formattedSales);
        }
        if (stockRes.success) {
          const stock = stockRes.data as StockData[];
          setStockData(stock);
        }
      } catch (err) {
        console.error('Failed to fetch chart data:', err);
      }
    };
    fetchChartData();
  }, [salesPeriod, stockPeriod]);

  // Calculate Y-axis domain based on actual data
  const getYAxisDomain = (data: { sales: number }[]) => {
    if (!data || data.length === 0) return [0, 100];
    const maxValue = Math.max(...data.map(d => d.sales));
    // Add 10% padding to the max value
    return [0, Math.ceil(maxValue * 1.1)];
  };

  // Calculate Y-axis domain for stock chart based on quantity
  const getStockYAxisDomain = (data: { quantity: number }[]) => {
    if (!data || data.length === 0) return [0, 100];
    const maxValue = Math.max(...data.map(d => d.quantity));
    // Add 10% padding to the max value
    return [0, Math.ceil(maxValue * 1.1)];
  };
  const formatLargeNumber = (value: number): string => {
    return formatCompactNumber(value);
  };

  // Format number for Y-axis
  const formatYAxis = (value: number): string => {
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)}k`;
    }
    return value.toString();
  };

  // Format quantity numbers (without currency symbol)
  const formatQuantity = (value: number): string => {
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    } else if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)}k`;
    }
    return value.toLocaleString();
  };

  // Calculate stats from real data
  const totalProducts = data?.products?.total || 0;
  const totalClients = data?.clients?.total || 0;
  const lowStockCount = data?.products?.lowStock || 0;
  const totalRevenue = data?.invoices?.yearly?.total || 0;
  
  // Extract monthly data for type safety
  const monthly = data?.invoices?.monthly;
  const monthlyGrowth = (monthly?.total ?? 0) > 0 && monthly?.paid != null
    ? Math.round((monthly.paid / monthly.total) * 100)
    : 0;

  // Calculate dynamic percentage changes
  const productsLastMonth = data?.products?.totalLastMonth;
  const productsChange = productsLastMonth != null && productsLastMonth > 0
    ? Math.round(((totalProducts - productsLastMonth) / productsLastMonth) * 100)
    : 0;

  const clientsLastMonth = data?.clients?.totalLastMonth;
  const clientsChange = clientsLastMonth != null && clientsLastMonth > 0
    ? Math.round(((totalClients - clientsLastMonth) / clientsLastMonth) * 100)
    : 0;

  const statCards = [
    { 
      title: t('dashboard.totalProducts'), 
      value: formatLargeNumber(totalProducts), 
      icon: Package, 
      color: 'bg-blue-500',
      change: `${productsChange >= 0 ? '+' : ''}${productsChange}%`,
      trend: productsChange >= 0 ? 'up' : 'down'
    },
    { 
      title: t('dashboard.totalRevenue'), 
      value: formatCurrency(totalRevenue), 
      icon: DollarSign, 
      color: 'bg-green-500',
      change: `${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth}%`,
      trend: monthlyGrowth >= 0 ? 'up' : 'down'
    },
    { 
      title: t('dashboard.totalClients'), 
      value: formatLargeNumber(totalClients), 
      icon: Users, 
      color: 'bg-purple-500',
      change: `${clientsChange >= 0 ? '+' : ''}${clientsChange}%`,
      trend: clientsChange >= 0 ? 'up' : 'down'
    },
    { 
      title: t('dashboard.lowStockItems'), 
      value: formatLargeNumber(lowStockCount), 
      icon: AlertTriangle, 
      color: 'bg-red-500',
      change: lowStockCount > 0 ? `-${lowStockCount}` : '0',
      trend: lowStockCount > 0 ? 'down' : 'up'
    },
  ];

  return (
    <Layout>
      <div className="p-3 md:p-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{t('dashboard.title')}</h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 hidden sm:block">{t('dashboard.welcome')}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
            {t('dashboard.loadingError')}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
              {statCards.map((stat, index) => (
                <div key={index} className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div className={`p-2.5 md:p-3 rounded-lg ${stat.color}`}>
                      <stat.icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 text-xs md:text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {stat.trend === 'up' ? (
                        <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 md:h-4 md:w-4" />
                      )}
                      {stat.change}
                    </div>
                  </div>
                  <h3 className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium truncate">{stat.title}</h3>
                  <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white mt-1 truncate">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Cash Position / Bank Accounts Summary */}
            {cashPosition && cashPosition.total > 0 && (
              <div className="mb-6">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-4 md:p-6 shadow-sm text-white">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{t('dashboard.cashPosition') || 'Cash Position'}</h3>
                      <p className="text-indigo-100 text-sm">{cashPosition.accounts?.length || 0} {t('dashboard.accounts') || 'accounts'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-100 text-sm">{t('dashboard.totalCash') || 'Total Cash'}</p>
                      <p className="text-2xl md:text-3xl font-bold">{formatCurrency(cashPosition.total)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4" />
                        <span className="text-xs text-indigo-100">BK Bank</span>
                      </div>
                      <p className="font-semibold">{formatCurrency(cashPosition.byType.bk_bank)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4" />
                        <span className="text-xs text-indigo-100">Equity</span>
                      </div>
                      <p className="font-semibold">{formatCurrency(cashPosition.byType.equity_bank)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4" />
                        <span className="text-xs text-indigo-100">I&M</span>
                      </div>
                      <p className="font-semibold">{formatCurrency(cashPosition.byType.im_bank)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4" />
                        <span className="text-xs text-indigo-100">Cogebanque</span>
                      </div>
                      <p className="font-semibold">{formatCurrency(cashPosition.byType.cogebanque)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4" />
                        <span className="text-xs text-indigo-100">Ecobank</span>
                      </div>
                      <p className="font-semibold">{formatCurrency(cashPosition.byType.ecobank)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Smartphone className="h-4 w-4" />
                        <span className="text-xs text-indigo-100">MTN MoMo</span>
                      </div>
                      <p className="font-semibold">{formatCurrency(cashPosition.byType.mtn_momo)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Smartphone className="h-4 w-4" />
                        <span className="text-xs text-indigo-100">Airtel</span>
                      </div>
                      <p className="font-semibold">{formatCurrency(cashPosition.byType.airtel_money)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="h-4 w-4" />
                      <span className="text-xs text-indigo-100">Cash in Hand</span>
                    </div>
                    <p className="font-semibold">{formatCurrency(cashPosition.byType.cash_in_hand)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Reorder Alerts Panel */}
            {reorderAlerts && reorderAlerts.length > 0 && (
              <div className="mb-6 bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" /> {t('dashboard.reorderAlerts')}
                    <span className="text-sm text-slate-500 dark:text-slate-400">({reorderAlerts.length} {t('pages.products.title').toLowerCase()})</span>
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {reorderAlerts.map((item: any) => {
                    const current = item.currentStock ?? 0;
                    const reorderAt = item.reorderPoint ?? 0;
                    const qty = item.reorderQuantity ?? 0;
                    const supplierName = item.supplier?.name || 'Unknown Supplier';
                    const belowSafety = item.isBelowSafetyStock;
                    const outOfStock = current <= 0;
                    const hasReorderPoint = item._reorderPointId !== null;

                    return (
                      <div key={item._reorderPointId || item.product._id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {outOfStock ? (
                              <MinusCircle className="h-5 w-5 text-red-500" />
                            ) : belowSafety ? (
                              <Circle className="h-4 w-4 text-red-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-yellow-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm md:text-base font-medium text-slate-800 dark:text-white">
                              {item.product?.name || item.product._id}
                              {outOfStock && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                                  {t('dashboard.outOfStock')}
                                </span>
                              )}
                            </div>
                            <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                {t('dashboard.stockArrow')} <span className="font-semibold">{current}</span> | {t('dashboard.reorderAt')}: <span className="font-semibold">{reorderAt}</span>
                              </div>
                            {hasReorderPoint && (
                              <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {t('dashboard.order')} <span className="font-semibold">{qty}</span> {t('dashboard.units')} {t('dashboard.from')} <span className="font-semibold text-slate-800 dark:text-white">{supplierName}</span>
                              </div>
                            )}
                            {!hasReorderPoint && (
                              <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {t('dashboard.supplier')}: <span className="font-semibold text-slate-800 dark:text-white">{supplierName}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.location.href = `/purchases?product=${item.product?._id || ''}`}
                          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                          >
                            {t('dashboard.createPO')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
              {/* Sales Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-white">{t('dashboard.salesOverview')}</h3>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setSalesPeriod('week')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${salesPeriod === 'week' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >
                      {t('dashboard.week')}
                    </button>
                    <button 
                      onClick={() => setSalesPeriod('month')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${salesPeriod === 'month' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >
                      {t('dashboard.month')}
                    </button>
                    <button 
                      onClick={() => setSalesPeriod('year')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${salesPeriod === 'year' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >
                      {t('dashboard.year')}
                    </button>
                  </div>
                </div>
                <div className="h-64">
                  {salesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.3}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          stroke="#64748b" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={12} 
                          tickFormatter={formatYAxis}
                          domain={getYAxisDomain(salesData)}
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          width={60}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatLargeNumber(value), 'Revenue']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f1f5f9' }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="sales" 
                          name="Revenue"
                          fill="url(#colorSales)" 
                          radius={[4, 4, 0, 0]}
                          animationDuration={500}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                      {t('dashboard.noSalesData')}
                    </div>
                  )}
                </div>
        {/* Sales Summary */}
                {salesData.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.totalSales')}</p>
                        <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">
                          {formatLargeNumber(salesData.reduce((sum, item) => sum + item.sales, 0))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.transactions')}</p>
                        <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{salesData.length}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

        {/* Stock Movement Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-white">{t('dashboard.stockMovement')}</h3>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setStockPeriod('week')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${stockPeriod === 'week' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >
                      {t('dashboard.week')}
                    </button>
                    <button 
                      onClick={() => setStockPeriod('month')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${stockPeriod === 'month' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >
                      {t('dashboard.month')}
                    </button>
                    <button 
                      onClick={() => setStockPeriod('year')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${stockPeriod === 'year' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >
                      {t('dashboard.year')}
                    </button>
                  </div>
                </div>
                <div className="h-64">
                  {stockData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis 
                          dataKey="type" 
                          stroke="#64748b" 
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={12} 
                          tickFormatter={formatYAxis}
                          domain={getStockYAxisDomain(stockData)}
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          width={60}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f1f5f9' }}
                          formatter={(value: number) => [formatQuantity(value), 'Quantity']}
                        />
                        <Bar dataKey="quantity" fill="#6366f1" radius={[4, 4, 0, 0]} animationDuration={500} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                      {t('dashboard.noStockData')}
                    </div>
                  )}
                </div>
                {/* Stock Movement Summary */}
                {stockData.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.stockIn')}</p>
                        <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400 truncate">
                          {formatQuantity(stockData.find(s => s.type === 'in')?.quantity || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.stockOut')}</p>
                        <p className="text-lg md:text-xl font-bold text-red-600 dark:text-red-400 truncate">
                          {formatQuantity(stockData.find(s => s.type === 'out')?.quantity || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Summary & Status Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
              {/* Invoice Summary */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t('dashboard.invoiceSummary')}</h3>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="p-3 md:p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{t('dashboard.totalInvoices')}</p>
                    <p className="text-lg md:text-xl font-bold text-slate-800 dark:text-white truncate">{formatLargeNumber(data?.invoices?.total || 0)}</p>
                  </div>
                  <div className="p-3 md:p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{t('dashboard.pending')}</p>
                    <p className="text-lg md:text-xl font-bold text-yellow-600 dark:text-yellow-400 truncate">{formatLargeNumber(data?.invoices?.pending || 0)}</p>
                  </div>
                  <div className="p-3 md:p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{t('dashboard.monthlyPaid')}</p>
                    <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400 truncate">{formatLargeNumber(data?.invoices?.monthly?.paid || 0)}</p>
                  </div>
                  <div className="p-3 md:p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{t('dashboard.yearlyTotal')}</p>
                    <p className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400 truncate">{formatLargeNumber(data?.invoices?.yearly?.total || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Invoice Status Donut Chart */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-white mb-4">{t('dashboard.invoiceStatusBreakdown')}</h3>
                <div className="h-64">
                  {invoiceStatus.some(s => s.count > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={invoiceStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={isNarrow ? 40 : 60}
                          outerRadius={isNarrow ? 60 : 80}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="status"
                          label={isNarrow ? false : ({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                          labelLine={!isNarrow}
                        >
                          {invoiceStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f1f5f9' }}
                          formatter={(value: number, name: string) => [value, name]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                      {t('dashboard.noInvoiceData')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Secondary Charts - Top Products and Top Clients */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Top Products by Revenue */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-white mb-4">{t('dashboard.topProductsByRevenue')}</h3>
                <div className="h-64">
                  {topProducts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProducts} layout="vertical" margin={{ top: 10, right: 10, left: isNarrow ? 24 : 60, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis 
                          type="number" 
                          stroke="#64748b" 
                          fontSize={isNarrow ? 10 : 12}
                          tickFormatter={formatYAxis}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="_id.name" 
                          stroke="#64748b" 
                          fontSize={isNarrow ? 10 : 12}
                          tickLine={false}
                          axisLine={false}
                          width={isNarrow ? 48 : 72}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatLargeNumber(value), 'Revenue']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f1f5f9' }}
                        />
                        <Bar dataKey="totalRevenue" fill="#22c55e" radius={[0, 4, 4, 0]} animationDuration={500} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                      {t('dashboard.noProductData')}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Clients */}
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 md:p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-base md:text-lg font-semibold text-slate-800 dark:text-white mb-4">{t('dashboard.topClients')}</h3>
                <div className="h-64">
                  {topClients.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topClients} layout="vertical" margin={{ top: 10, right: 10, left: isNarrow ? 24 : 60, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis 
                          type="number" 
                          stroke="#64748b" 
                          fontSize={isNarrow ? 10 : 12}
                          tickFormatter={formatYAxis}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="_id.name" 
                          stroke="#64748b" 
                          fontSize={isNarrow ? 10 : 12}
                          tickLine={false}
                          axisLine={false}
                          width={isNarrow ? 48 : 72}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatLargeNumber(value), 'Amount']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f1f5f9' }}
                        />
                        <Bar dataKey="totalAmount" fill="#8b5cf6" radius={[0, 4, 4, 0]} animationDuration={500} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                      {t('dashboard.noClientData')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
