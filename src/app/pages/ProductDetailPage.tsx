import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { productsApi, stockApi } from '@/lib/api';
import { Layout } from '../layout/Layout';
import { 
  ArrowLeft, 
  Edit, 
  Loader2,
  Package,
  DollarSign,
  Warehouse,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  History,
  BarChart3,
  QrCode,
  FileText,
  Clock,
  ShoppingCart,
  Receipt
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/app/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/app/components/ui/pagination';
import { useTranslation } from 'react-i18next';
import BarcodeDisplay from '@/app/components/BarcodeDisplay';

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  barcodeType?: string;
  description?: string;
  category?: {
    _id: string;
    name: string;
  };
  unit: string;
  supplier?: {
    _id: string;
    name: string;
  };
  preferredSupplier?: {
    _id: string;
    name: string;
  };
  currentStock: number | string;
  isActive: boolean;
  isStockable: boolean;
  isArchived: boolean;
  lowStockThreshold?: number;
  averageCost: number | string;
  sellingPrice: number | string;
  costPrice?: number | string;
  costingMethod: string;
  inventoryAccount?: string;
  cogsAccount?: string;
  revenueAccount?: string;
  taxCode?: string;
  taxRate?: number;
  brand?: string;
  location?: string;
  trackingType?: string;
  reorderPoint?: number;
  reorderQuantity?: number;
  defaultWarehouse?: {
    _id: string;
    name: string;
  };
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface StockMovement {
  _id: string;
  type: 'in' | 'out' | 'adjustment';
  reason: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  totalCost?: number;
  warehouse?: {
    _id: string;
    name: string;
    code: string;
  };
  supplier?: {
    _id: string;
    name: string;
  };
  referenceNumber?: string;
  referenceType?: string;
  notes?: string;
  movementDate: string;
  createdAt: string;
}

interface ProductHistoryEntry {
  action: string;
  changes?: Record<string, any>;
  changedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  timestamp: string;
  notes?: string;
}

interface LifecycleTimelineEntry {
  type: string;
  date: string;
  description: string;
  details?: any;
}

const MOVEMENT_REASON_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  sale: 'Sale',
  return: 'Return',
  damage: 'Damage',
  loss: 'Loss',
  theft: 'Theft',
  expired: 'Expired',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  correction: 'Correction',
  initial_stock: 'Initial Stock',
  audit_surplus: 'Audit Surplus',
  audit_shortage: 'Audit Shortage',
  dispatch: 'Dispatch',
  dispatch_reversal: 'Dispatch Reversal',
};

const getReasonLabel = (reason: string): string => {
  return MOVEMENT_REASON_LABELS[reason] || reason.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const getActionBadgeClass = (action: string): string => {
  switch (action) {
    case 'created': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'updated': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'archived': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'restored': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  }
};

const getTimelineIcon = (type: string) => {
  switch (type) {
    case 'product_created': return <Package className="h-4 w-4" />;
    case 'stock_movement': return <Warehouse className="h-4 w-4" />;
    case 'quotation': return <FileText className="h-4 w-4" />;
    case 'invoice': return <Receipt className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const productPanelClass = 'border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
const productMutedPanelClass = 'rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60';

function DetailCard({ title, description, children, className = '' }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={`${productPanelClass} ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FieldRow({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`max-w-[60%] text-right text-sm font-semibold text-slate-950 dark:text-white ${mono ? 'font-mono' : ''}`}>{value || '-'}</span>
    </div>
  );
}

function EmptyProductState({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

export default function ProductDetailPage() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => {
    const translated = t(key);
    return translated === key ? fallback : translated;
  };
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'details';

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementPagination, setMovementPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  // History state
  const [history, setHistory] = useState<ProductHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Lifecycle state
  const [lifecycle, setLifecycle] = useState<LifecycleTimelineEntry[]>([]);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [id]);

  useEffect(() => {
    if (product && initialTab === 'movements') {
      loadMovements();
    }
    if (product && initialTab === 'history') {
      loadHistory();
    }
    if (product && initialTab === 'lifecycle') {
      loadLifecycle();
    }
  }, [product, initialTab]);

  useEffect(() => {
    if (initialTab === 'movements') {
      loadMovements();
    }
  }, [movementPagination.currentPage]);

  const loadProduct = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await productsApi.getById(id);
      if (response.success && response.data) {
        setProduct(response.data as Product);
      }
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    if (!id) return;
    setMovementsLoading(true);
    try {
      const response = await stockApi.getMovements({
        productId: id,
        page: movementPagination.currentPage,
        limit: 20
      });
      if (response.success && response.data) {
        const data = response.data as any;
        setMovements(Array.isArray(data) ? data : data.movements || []);
        if (data.pagination) {
          setMovementPagination(prev => ({
            ...prev,
            ...data.pagination
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load movements:', error);
    } finally {
      setMovementsLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const response = await productsApi.getHistory(id);
      if (response.success && response.data) {
        setHistory(response.data as ProductHistoryEntry[]);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadLifecycle = async () => {
    if (!id) return;
    setLifecycleLoading(true);
    try {
      const response = await productsApi.getLifecycle(id);
      if (response.success && response.data) {
        const data = response.data as any;
        setLifecycle(data.timeline || []);
      }
    } catch (error) {
      console.error('Failed to load lifecycle:', error);
    } finally {
      setLifecycleLoading(false);
    }
  };

  const formatCurrency = (value: number | string | undefined) => {
    if (!value) return '0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toFixed(2);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStockStatus = () => {
    if (!product) return { label: '-', color: '' };
    const stock = Number(product.currentStock) || 0;
    const threshold = product.lowStockThreshold || 10;
    
    if (stock === 0) return { label: tr('products.outOfStock', 'Out of Stock'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (stock <= threshold) return { label: tr('products.lowStock', 'Low Stock'), color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    return { label: tr('products.inStock', 'In Stock'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto py-6 px-4">
          <div className="text-center">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{t('products.notFound') || 'Product not found'}</p>
            <Button onClick={() => navigate('/products')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back') || 'Back to Products'}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const stock = Number(product.currentStock) || 0;
  const stockStatus = getStockStatus();
  const averageCost = Number(product.averageCost) || 0;
  const sellingPrice = Number(product.sellingPrice) || 0;
  const stockValue = stock * averageCost;
  const threshold = product.lowStockThreshold || product.reorderPoint || 10;
  const stockCoverage = Math.min(100, Math.round((stock / Math.max(threshold, 1)) * 100));
  const marginPct = sellingPrice > 0 ? ((sellingPrice - averageCost) / sellingPrice) * 100 : 0;
  const reorderGap = Math.max(threshold - stock, 0);

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Page Header */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/products')} className="mb-3 -ml-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back') || 'Back'}
              </Button>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                  {product.name}
                </h1>
                <Badge variant="outline" className="font-mono">{product.sku}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${stockStatus.color}`}>
                  {stockStatus.label}
                </span>
                <Badge variant="outline">{product.category?.name || 'Uncategorized'}</Badge>
                <Badge variant="outline" className="uppercase">{product.costingMethod || 'fifo'}</Badge>
                {product.isArchived && (
                  <Badge variant="outline" className="bg-slate-100 dark:bg-slate-700">
                    {t('products.archived') || 'Archived'}
                  </Badge>
                )}
              </div>
              <p className="mt-3 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                {product.description || 'Inventory, pricing, stock controls, and lifecycle activity for this SKU.'}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row lg:items-center">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Stock Health</p>
                <p className={`mt-1 text-lg font-bold ${stock <= threshold ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                  {stockCoverage}%
                </p>
              </div>
              <Button onClick={() => navigate(`/products/${product._id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                {t('common.edit') || 'Edit'}
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Warehouse className="h-4 w-4" />
                {t('products.currentStock') || 'Current Stock'}
              </div>
              <div className="text-2xl font-bold mt-1">
                {stock.toFixed(0)} <span className="text-sm font-normal text-slate-500">{product.unit}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <DollarSign className="h-4 w-4" />
                {t('products.sellingPrice') || 'Selling Price'}
              </div>
              <div className="text-2xl font-bold mt-1">
                {formatCurrency(product.sellingPrice)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <TrendingUp className="h-4 w-4" />
                {t('products.averageCost') || 'Average Cost'}
              </div>
              <div className="text-2xl font-bold mt-1">
                {formatCurrency(product.averageCost)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <BarChart3 className="h-4 w-4" />
                {t('products.stockValue') || 'Stock Value'}
              </div>
              <div className="text-2xl font-bold mt-1">
                {formatCurrency(stockValue)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={initialTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 sm:grid-cols-5 lg:max-w-4xl">
            <TabsTrigger value="details">
              <Package className="h-4 w-4 mr-2" />
              {tr('products.details', 'Details')}
            </TabsTrigger>
            <TabsTrigger value="stock">
              <Warehouse className="h-4 w-4 mr-2" />
              {tr('products.stock', 'Stock')}
            </TabsTrigger>
            <TabsTrigger value="movements">
              <History className="h-4 w-4 mr-2" />
              {tr('products.movements', 'Movements')}
            </TabsTrigger>
            <TabsTrigger value="history" onClick={() => { if (history.length === 0) loadHistory(); }}>
              <Clock className="h-4 w-4 mr-2" />
              {tr('products.history', 'History')}
            </TabsTrigger>
            <TabsTrigger value="lifecycle" onClick={() => { if (lifecycle.length === 0) loadLifecycle(); }}>
              <FileText className="h-4 w-4 mr-2" />
              {tr('products.lifecycle', 'Lifecycle')}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <DetailCard title={tr('products.basicInfo', 'Basic Information')} description="Master data used across inventory, sales, and purchase documents.">
                <FieldRow label="SKU" value={product.sku} mono />
                <FieldRow label="Name" value={product.name} />
                <FieldRow label="Category" value={product.category?.name || '-'} />
                <FieldRow label="Unit" value={<span className="capitalize">{product.unit}</span>} />
                <FieldRow label="Supplier" value={product.supplier?.name || '-'} />
                <FieldRow label="Preferred Supplier" value={product.preferredSupplier?.name || '-'} />
                <FieldRow label="Default Warehouse" value={product.defaultWarehouse?.name || '-'} />
                <FieldRow label="Brand" value={product.brand || '-'} />
                <FieldRow label="Storage Location" value={product.location || '-'} />
              </DetailCard>

              <DetailCard title={tr('products.pricingInventory', 'Pricing & Inventory')} description="Commercial values and stock control settings for this SKU.">
                <FieldRow label="Average Cost" value={formatCurrency(product.averageCost)} mono />
                <FieldRow label="Cost Price" value={formatCurrency(product.costPrice || product.averageCost)} mono />
                <FieldRow label="Selling Price" value={formatCurrency(product.sellingPrice)} mono />
                <FieldRow label="Gross Margin" value={`${marginPct.toFixed(1)}%`} mono />
                <FieldRow label="Tax Code" value={product.taxCode || '-'} mono />
                <FieldRow label="Costing Method" value={<span className="uppercase">{product.costingMethod || 'fifo'}</span>} />
                <FieldRow label="Tracking Type" value={<span className="capitalize">{product.trackingType || 'none'}</span>} />
                <FieldRow label="Track Inventory" value={product.isStockable ? tr('common.yes', 'Yes') : tr('common.no', 'No')} />
                <FieldRow label="Low Stock Threshold" value={product.lowStockThreshold || 10} mono />
                <FieldRow label="Reorder Point" value={product.reorderPoint || 0} mono />
                <FieldRow label="Reorder Quantity" value={product.reorderQuantity || 0} mono />
              </DetailCard>

              {/* Accounting */}
              <DetailCard title={tr('products.accounting', 'Accounting')} description="Posting accounts used by inventory valuation, COGS, and sales recognition." className="lg:col-span-2">
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    ['Inventory Account', product.inventoryAccount || '-'],
                    ['COGS Account', product.cogsAccount || '-'],
                    ['Revenue Account', product.revenueAccount || '-'],
                  ].map(([label, value]) => (
                    <div key={label} className={productMutedPanelClass}>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
                      <p className="mt-2 font-mono text-lg font-bold text-slate-950 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </DetailCard>

              {/* Barcode and QR Code */}
              <DetailCard title={tr('products.barcodeAndQR', 'Barcode & QR Code')} description="Scan references for receiving, dispatch, and physical stock checks." className="lg:col-span-2">
                  <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
                    {product.barcode && (
                      <div className={productMutedPanelClass}>
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr('products.barcode', 'Barcode')}</span>
                        <div className="mt-3 flex items-center gap-4">
                        <BarcodeDisplay 
                          productId={product._id} 
                          type="barcode"
                          barcodeParams={{ type: product.barcodeType || 'CODE128', height: 80 }}
                          className="h-20"
                        />
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{product.barcodeType || 'CODE128'}</p>
                            <code className="mt-2 inline-flex rounded bg-white px-2 py-1 text-xs dark:bg-slate-900">{product.barcode}</code>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className={productMutedPanelClass}>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr('products.qrCode', 'QR Code')}</span>
                      <div className="mt-3 inline-flex rounded-md bg-white p-3 dark:bg-slate-950">
                      <BarcodeDisplay 
                        productId={product._id} 
                        type="qrcode"
                        qrParams={{ width: 150 }}
                        className="h-[150px] w-[150px]"
                      />
                      </div>
                    </div>
                    {!product.barcode && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {tr('products.noBarcode', 'No barcode set for this product')}
                      </p>
                    )}
                  </div>
              </DetailCard>

              {product.description && (
                <DetailCard title={tr('products.description', 'Description')} className="lg:col-span-2">
                    <p className="text-slate-600 dark:text-slate-300">{product.description}</p>
                </DetailCard>
              )}
            </div>
          </TabsContent>

          {/* Stock Tab */}
          <TabsContent value="stock" className="mt-6">
            <DetailCard title={tr('products.stockOverview', 'Stock Overview')} description={tr('products.stockOverviewDesc', 'Current inventory status')}>
                <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/70">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Reorder Readiness</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Threshold {threshold.toLocaleString()} {product.unit}; reorder gap {reorderGap.toLocaleString()} {product.unit}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{stockCoverage}% covered</div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${stock <= threshold ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${stockCoverage}%` }}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className={productMutedPanelClass}>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                      {stock.toFixed(0)}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {t('products.quantityOnHand') || 'Quantity on Hand'}
                    </div>
                  </div>
                  <div className={productMutedPanelClass}>
                    <div className="text-3xl font-bold text-yellow-600">
                      {product.lowStockThreshold || 10}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {t('products.lowStockThreshold') || 'Low Stock Threshold'}
                    </div>
                  </div>
                  <div className={productMutedPanelClass}>
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(stockValue)}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {t('products.totalStockValue') || 'Total Stock Value'}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className={productMutedPanelClass}>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Gross Margin</p>
                    <p className={`mt-2 text-2xl font-bold ${marginPct >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300'}`}>
                      {marginPct.toFixed(1)}%
                    </p>
                  </div>
                  <div className={productMutedPanelClass}>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Default Warehouse</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{product.defaultWarehouse?.name || '-'}</p>
                  </div>
                  <div className={productMutedPanelClass}>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Reorder Quantity</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{(product.reorderQuantity || 0).toLocaleString()} {product.unit}</p>
                  </div>
                </div>

                {stock <= (product.lowStockThreshold || 10) && (
                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        {t('products.lowStockAlert') || 'Low Stock Alert'}
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                        {t('products.lowStockAlertDesc') || `Current stock (${stock}) is at or below the reorder point (${product.reorderPoint || 10}). Consider restocking soon.`}
                      </p>
                    </div>
                  </div>
                )}
            </DetailCard>
          </TabsContent>

          {/* Movements Tab */}
          <TabsContent value="movements" className="mt-6">
            <DetailCard title={tr('products.stockMovements', 'Stock Movements')} description={tr('products.movementsDesc', 'History of stock changes')}>
                {movementsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : movements.length === 0 ? (
                  <EmptyProductState
                    icon={<History className="h-6 w-6" />}
                    title={tr('products.noMovements', 'No stock movements yet')}
                    detail="Stock receipts, dispatches, transfers, and adjustments will appear here once posted."
                  />
                ) : (
                  <>
                    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-100/80 dark:bg-slate-800/80">
                          <TableHead>{t('products.date') || 'Date'}</TableHead>
                          <TableHead>{t('products.type') || 'Type'}</TableHead>
                          <TableHead>{t('products.reason') || 'Reason'}</TableHead>
                          <TableHead className="text-right">{t('products.quantity') || 'Qty'}</TableHead>
                          <TableHead className="text-right">{t('products.from') || 'From'}</TableHead>
                          <TableHead className="text-right">{t('products.to') || 'To'}</TableHead>
                          <TableHead className="text-right">{t('products.reference') || 'Reference'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map((movement) => (
                          <TableRow key={movement._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <TableCell className="whitespace-nowrap">
                              {formatDate(movement.movementDate)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={movement.type === 'in' ? 'default' : movement.type === 'out' ? 'destructive' : 'outline'}
                                className={movement.type === 'in' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : movement.type === 'out' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
                              >
                                {movement.type === 'in' ? <TrendingUp className="h-3 w-3 mr-1" /> : movement.type === 'out' ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                                {movement.type}
                              </Badge>
                            </TableCell>
                            <TableCell>{getReasonLabel(movement.reason)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : ''}{movement.quantity}
                            </TableCell>
                            <TableCell className="text-right">{movement.previousStock || '-'}</TableCell>
                            <TableCell className="text-right">{movement.newStock || '-'}</TableCell>
                            <TableCell className="text-right text-slate-500">
                              {movement.referenceNumber || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>

                    {movementPagination.totalPages > 1 && (
                      <div className="flex items-center justify-center mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setMovementPagination(p => ({ ...p, currentPage: p.currentPage - 1 }))}
                                className={movementPagination.currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                            <PaginationItem>
                              <span className="px-4 text-sm">
                                {movementPagination.currentPage} / {movementPagination.totalPages}
                              </span>
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setMovementPagination(p => ({ ...p, currentPage: p.currentPage + 1 }))}
                                className={movementPagination.currentPage >= movementPagination.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
            </DetailCard>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <DetailCard title={tr('products.productHistory', 'Product History')} description={tr('products.productHistoryDesc', 'Audit trail of all changes made to this product')}>
                {historyLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : history.length === 0 ? (
                  <EmptyProductState
                    icon={<Clock className="h-6 w-6" />}
                    title={tr('products.noHistory', 'No history records yet')}
                    detail="Configuration changes and audit notes for this product will appear here."
                  />
                ) : (
                  <div className="space-y-4">
                    {history.map((entry, index) => (
                      <div key={index} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:flex-row">
                        <div className="flex-shrink-0">
                          <Badge className={getActionBadgeClass(entry.action)}>
                            {entry.action}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {entry.changedBy?.name || t('products.unknownUser') || 'Unknown User'}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(entry.timestamp)}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{entry.notes}</p>
                          )}
                          {entry.changes && entry.action === 'updated' && entry.changes.new && (
                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-medium">{t('products.changedFields') || 'Changed'}: </span>
                              {Object.keys(entry.changes.new as Record<string, any>)
                                .filter(k => !['__v', '_id', 'updatedAt', 'createdAt', 'history'].includes(k))
                                .join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </DetailCard>
          </TabsContent>

          {/* Lifecycle Tab */}
          <TabsContent value="lifecycle" className="mt-6">
            <DetailCard title={tr('products.productLifecycle', 'Product Lifecycle')} description={tr('products.productLifecycleDesc', 'Complete timeline of product activity including stock, quotations, and invoices')}>
                {lifecycleLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : lifecycle.length === 0 ? (
                  <EmptyProductState
                    icon={<FileText className="h-6 w-6" />}
                    title={tr('products.noLifecycle', 'No lifecycle events yet')}
                    detail="Purchases, stock activity, quotations, invoices, and archive events will form the complete product timeline here."
                  />
                ) : (
                  <div className="relative pl-7">
                    <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-4">
                      {lifecycle.map((event, index) => (
                        <div key={index} className="relative">
                          <div className="absolute -left-7 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-800">
                            <span className="text-slate-500 dark:text-slate-400">
                              {getTimelineIcon(event.type)}
                            </span>
                          </div>
                          <div className="ml-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <Badge variant="outline" className="text-xs">
                                {event.type.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {formatDate(event.date)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {event.description}
                            </p>
                            {event.details && event.type === 'stock_movement' && (
                              <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-3">
                                {event.details.type && <p><span className="font-semibold text-slate-700 dark:text-slate-200">Type:</span> {event.details.type} ({getReasonLabel(event.details.reason)})</p>}
                                {event.details.quantity && <p><span className="font-semibold text-slate-700 dark:text-slate-200">Qty:</span> {event.details.quantity}</p>}
                                {event.details.newStock !== undefined && <p><span className="font-semibold text-slate-700 dark:text-slate-200">New Stock:</span> {event.details.newStock}</p>}
                              </div>
                            )}
                            {event.details && event.type === 'quotation' && (
                              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                {event.details.status && <p>Status: {event.details.status}</p>}
                                {event.details.client?.name && <p>Client: {event.details.client.name}</p>}
                              </div>
                            )}
                            {event.details && event.type === 'invoice' && (
                              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                {event.details.status && <p>Status: {event.details.status}</p>}
                                {event.details.client?.name && <p>Client: {event.details.client.name}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </DetailCard>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
