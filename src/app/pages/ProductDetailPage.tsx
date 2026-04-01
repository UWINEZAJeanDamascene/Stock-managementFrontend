import { useState, useEffect } from 'react';
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

export default function ProductDetailPage() {
  const { t } = useTranslation();
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
    
    if (stock === 0) return { label: t('products.outOfStock'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    if (stock <= threshold) return { label: t('products.lowStock'), color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
    return { label: t('products.inStock'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
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
  const stockValue = stock * (Number(product.averageCost) || 0);

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back') || 'Back'}
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {product.name}
                </h1>
                <span className="text-slate-500 dark:text-slate-400">({product.sku})</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={stockStatus.color}>
                  {stockStatus.label}
                </span>
                {product.isArchived && (
                  <Badge variant="outline" className="bg-slate-100 dark:bg-slate-700">
                    {t('products.archived') || 'Archived'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button onClick={() => navigate(`/products/${product._id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            {t('common.edit') || 'Edit'}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
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
          
          <Card>
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
          
          <Card>
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
          
          <Card>
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
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
            <TabsTrigger value="details">
              <Package className="h-4 w-4 mr-2" />
              {t('products.details') || 'Details'}
            </TabsTrigger>
            <TabsTrigger value="stock">
              <Warehouse className="h-4 w-4 mr-2" />
              {t('products.stock') || 'Stock'}
            </TabsTrigger>
            <TabsTrigger value="movements">
              <History className="h-4 w-4 mr-2" />
              {t('products.movements') || 'Movements'}
            </TabsTrigger>
            <TabsTrigger value="history" onClick={() => { if (history.length === 0) loadHistory(); }}>
              <Clock className="h-4 w-4 mr-2" />
              {t('products.history') || 'History'}
            </TabsTrigger>
            <TabsTrigger value="lifecycle" onClick={() => { if (lifecycle.length === 0) loadLifecycle(); }}>
              <FileText className="h-4 w-4 mr-2" />
              {t('products.lifecycle') || 'Lifecycle'}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t('products.basicInfo') || 'Basic Information'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.sku') || 'SKU'}</span>
                    <span className="font-medium">{product.sku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.name') || 'Name'}</span>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.category') || 'Category'}</span>
                    <span className="font-medium">{product.category?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.unit') || 'Unit'}</span>
                    <span className="font-medium capitalize">{product.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.supplier') || 'Supplier'}</span>
                    <span className="font-medium">{product.supplier?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.preferredSupplier') || 'Preferred Supplier'}</span>
                    <span className="font-medium">{product.preferredSupplier?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.defaultWarehouse') || 'Default Warehouse'}</span>
                    <span className="font-medium">{product.defaultWarehouse?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.brand') || 'Brand'}</span>
                    <span className="font-medium">{product.brand || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.location') || 'Location'}</span>
                    <span className="font-medium">{product.location || '-'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('products.pricingInventory') || 'Pricing & Inventory'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.averageCost') || 'Average Cost'}</span>
                    <span className="font-medium">{formatCurrency(product.averageCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.costPrice') || 'Cost Price'}</span>
                    <span className="font-medium">{formatCurrency(product.costPrice || product.averageCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.sellingPrice') || 'Selling Price'}</span>
                    <span className="font-medium">{formatCurrency(product.sellingPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.taxCode') || 'Tax Code'}</span>
                    <span className="font-medium">{product.taxCode || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.costingMethod') || 'Costing Method'}</span>
                    <span className="font-medium uppercase">{product.costingMethod || 'fifo'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.trackingType') || 'Tracking Type'}</span>
                    <span className="font-medium capitalize">{product.trackingType || 'none'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.isStockable') || 'Track Inventory'}</span>
                    <span className="font-medium">{product.isStockable ? t('common.yes') || 'Yes' : t('common.no') || 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.lowStockThreshold') || 'Low Stock Threshold'}</span>
                    <span className="font-medium">{product.lowStockThreshold || 10}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.reorderPoint') || 'Reorder Point'}</span>
                    <span className="font-medium">{product.reorderPoint || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('products.reorderQuantity') || 'Reorder Qty'}</span>
                    <span className="font-medium">{product.reorderQuantity || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Accounting */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>{t('products.accounting') || 'Accounting'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{t('products.inventoryAccount') || 'Inventory Account'}</span>
                      <p className="font-medium">{product.inventoryAccount || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{t('products.cogsAccount') || 'COGS Account'}</span>
                      <p className="font-medium">{product.cogsAccount || '-'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{t('products.revenueAccount') || 'Revenue Account'}</span>
                      <p className="font-medium">{product.revenueAccount || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Barcode and QR Code */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>{t('products.barcodeAndQR') || 'Barcode & QR Code'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-start gap-8">
                    {product.barcode && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('products.barcode') || 'Barcode'}</span>
                        <BarcodeDisplay 
                          productId={product._id} 
                          type="barcode"
                          barcodeParams={{ type: product.barcodeType || 'CODE128', height: 80 }}
                          className="h-20"
                        />
                        <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">{product.barcode}</code>
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t('products.qrCode') || 'QR Code'}</span>
                      <BarcodeDisplay 
                        productId={product._id} 
                        type="qrcode"
                        qrParams={{ width: 150 }}
                        className="h-[150px] w-[150px]"
                      />
                    </div>
                    {!product.barcode && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 self-center">
                        {t('products.noBarcode') || 'No barcode set for this product'}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {product.description && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>{t('products.description') || 'Description'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 dark:text-slate-300">{product.description}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Stock Tab */}
          <TabsContent value="stock" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('products.stockOverview') || 'Stock Overview'}</CardTitle>
                <CardDescription>
                  {t('products.stockOverviewDesc') || 'Current inventory status'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                      {stock.toFixed(0)}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {t('products.quantityOnHand') || 'Quantity on Hand'}
                    </div>
                  </div>
                  <div className="text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-3xl font-bold text-yellow-600">
                      {product.lowStockThreshold || 10}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {t('products.lowStockThreshold') || 'Low Stock Threshold'}
                    </div>
                  </div>
                  <div className="text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(stockValue)}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {t('products.totalStockValue') || 'Total Stock Value'}
                    </div>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Movements Tab */}
          <TabsContent value="movements" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('products.stockMovements') || 'Stock Movements'}</CardTitle>
                <CardDescription>
                  {t('products.movementsDesc') || 'History of stock changes'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {movementsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : movements.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 dark:text-slate-400">
                    <History className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>{t('products.noMovements') || 'No stock movements yet'}</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900/50">
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
                          <TableRow key={movement._id}>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('products.productHistory') || 'Product History'}</CardTitle>
                <CardDescription>
                  {t('products.productHistoryDesc') || 'Audit trail of all changes made to this product'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 dark:text-slate-400">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>{t('products.noHistory') || 'No history records yet'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((entry, index) => (
                      <div key={index} className="flex gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lifecycle Tab */}
          <TabsContent value="lifecycle" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('products.productLifecycle') || 'Product Lifecycle'}</CardTitle>
                <CardDescription>
                  {t('products.productLifecycleDesc') || 'Complete timeline of product activity including stock, quotations, and invoices'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lifecycleLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : lifecycle.length === 0 ? (
                  <div className="text-center p-8 text-slate-500 dark:text-slate-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p>{t('products.noLifecycle') || 'No lifecycle events yet'}</p>
                  </div>
                ) : (
                  <div className="relative pl-6">
                    <div className="absolute left-2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-6">
                      {lifecycle.map((event, index) => (
                        <div key={index} className="relative">
                          <div className="absolute -left-4 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
                            <span className="text-slate-500 dark:text-slate-400">
                              {getTimelineIcon(event.type)}
                            </span>
                          </div>
                          <div className="ml-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-1">
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
                              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                {event.details.type && <p>Type: {event.details.type} ({getReasonLabel(event.details.reason)})</p>}
                                {event.details.quantity && <p>Qty: {event.details.quantity}</p>}
                                {event.details.newStock !== undefined && <p>New Stock: {event.details.newStock}</p>}
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
