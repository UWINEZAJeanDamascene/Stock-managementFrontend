import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { purchaseOrdersApi, suppliersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Search,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  Calendar,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/app/components/ui/pagination';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Card, CardContent } from '@/app/components/ui/card';
import { useTranslation } from 'react-i18next';

interface PurchaseOrder {
  _id: string;
  referenceNo: string;
  supplier: {
    _id: string;
    name: string;
    code?: string;
  };
  warehouse?: {
    _id: string;
    name: string;
  };
  orderDate: string;
  expectedDeliveryDate?: string;
  status: 'draft' | 'approved' | 'partially_received' | 'fully_received' | 'cancelled';
  currencyCode: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  linesCount: number;
  createdAt: string;
}

interface Supplier {
  _id: string;
  name: string;
  code?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
}

export default function PurchaseOrdersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [poList, setPoList] = useState<PurchaseOrder[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const fetchSuppliers = useCallback(async () => {
    try {
      console.log('[PurchaseOrdersListPage] Fetching suppliers...');
      const response = await suppliersApi.getAll({ limit: 100 });
      console.log('[PurchaseOrdersListPage] Suppliers response:', response);
      if (response.success && Array.isArray(response.data)) {
        setSuppliers(response.data as Supplier[]);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[PurchaseOrdersListPage] Fetching with params:', { page, statusFilter, supplierFilter, dateFrom, dateTo });
      const params: any = {
        page: page,
        limit: 20,
      };
      
      if (statusFilter) params.status = statusFilter;
      if (supplierFilter) params.supplier_id = supplierFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (searchQuery) params.search = searchQuery;
      
      const response = await purchaseOrdersApi.getAll(params);
      console.log('[PurchaseOrdersListPage] API Response:', response);
      
      if (response.success) {
        setPoList(response.data as PurchaseOrder[]);
        if (response.pagination) {
          setPagination(response.pagination as PaginationInfo);
        }
      } else {
        console.error('[PurchaseOrdersListPage] API returned error:', response);
      }
    } catch (error) {
      console.error('[PurchaseOrdersListPage] Failed to fetch purchase orders:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, supplierFilter, dateFrom, dateTo, searchQuery]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const handleApprove = async (id: string) => {
    try {
      await purchaseOrdersApi.approve(id);
      fetchPurchaseOrders();
    } catch (error) {
      console.error('Failed to approve PO:', error);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await purchaseOrdersApi.cancel(id);
      fetchPurchaseOrders();
    } catch (error) {
      console.error('Failed to cancel PO:', error);
    }
  };

  const statusBadgeClass: Record<string, string> = {
    draft:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
    approved:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    partially_received:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    fully_received:
      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    cancelled:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  };

  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      draft: t('purchase.status.draft', 'Draft'),
      approved: t('purchase.status.approved', 'Approved'),
      partially_received: t('purchase.status.partially_received', 'Partial'),
      fully_received: t('purchase.status.fully_received', 'Received'),
      cancelled: t('purchase.status.cancelled', 'Cancelled'),
    };
    const label = labels[status] || status;
    const cls = statusBadgeClass[status] || statusBadgeClass.draft;
    return (
      <Badge variant="outline" className={`text-xs font-medium ${cls}`}>
        {label}
      </Badge>
    );
  };

  const toneClass: Record<string, string> = {
    emerald:
      'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60',
    amber:
      'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
    violet:
      'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60',
    slate:
      'bg-slate-50 text-slate-700 ring-slate-100 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-800',
    red: 'bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60',
  };

  function MetricTile({
    title,
    value,
    icon,
    tone,
    loading,
    subtitle,
  }: {
    title: string;
    value: string | number;
    icon: ReactNode;
    tone: 'emerald' | 'blue' | 'amber' | 'violet' | 'slate' | 'red';
    loading?: boolean;
    subtitle?: string;
  }) {
    if (loading) {
      return (
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="mt-5 h-8 w-32" />
            {subtitle && <Skeleton className="mt-2 h-3 w-20" />}
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {title}
              </p>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {value}
              </p>
            </div>
            <div className={`rounded-lg p-2.5 ring-1 ${toneClass[tone]}`}>{icon}</div>
          </div>
          {subtitle && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
        <div className="mb-2 text-slate-400 dark:text-slate-500">{icon}</div>
        <p className="text-sm">{message}</p>
      </div>
    );
  }

  const formatCurrency = (amount: number | string, currency: string = 'USD') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const totalValue = poList.reduce((sum, po) => sum + (po.totalAmount || 0), 0);
  const draftCount = poList.filter((po) => po.status === 'draft').length;
  const approvedCount = poList.filter((po) => po.status === 'approved').length;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_380px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`rounded-lg p-2.5 ring-1 ${toneClass.blue}`}>
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                      {t('purchase.orders.title', 'Purchase Orders')}
                    </h1>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {t('purchase.orders.description', 'Manage your purchase orders')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {statusFilter && (
                    <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-400">
                      {t('purchase.orders.status', 'Status')}: {statusFilter}
                    </Badge>
                  )}
                  {supplierFilter && (
                    <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-400">
                      {t('purchase.orders.supplier', 'Supplier')}:{' '}
                      {suppliers.find((s) => s._id === supplierFilter)?.name || supplierFilter}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    onClick={() => navigate('/purchase-orders/new')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('purchase.orders.newPO', 'New PO')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-200 text-slate-900 dark:border-slate-700 dark:text-white"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t('common.import', 'Import')}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {t('purchase.orders.totalValue', 'Total Value')}
                </p>
                <p className="text-2xl font-bold text-slate-950 dark:text-white">
                  {formatCurrency(totalValue)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-400">
                    {pagination?.total || poList.length} {t('purchase.orders.records', 'records')}
                  </Badge>
                  <Badge variant="outline" className="text-xs dark:border-slate-700 dark:text-slate-400">
                    {poList[0]?.currencyCode || 'USD'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              title={t('purchase.orders.totalPOs', 'Total POs')}
              value={pagination?.total || poList.length}
              icon={<Hash className="h-5 w-5" />}
              tone="blue"
              subtitle={t('purchase.orders.allOrders', 'All orders')}
              loading={loading}
            />
            <MetricTile
              title={t('purchase.orders.totalValue', 'Total Value')}
              value={formatCurrency(totalValue)}
              icon={<TrendingUp className="h-5 w-5" />}
              tone="emerald"
              subtitle={t('purchase.orders.currentPage', 'Current page')}
              loading={loading}
            />
            <MetricTile
              title={t('purchase.orders.draft', 'Draft')}
              value={draftCount}
              icon={<AlertCircle className="h-5 w-5" />}
              tone="amber"
              subtitle={t('purchase.orders.awaitingApproval', 'Awaiting approval')}
              loading={loading}
            />
            <MetricTile
              title={t('purchase.orders.approved', 'Approved')}
              value={approvedCount}
              icon={<CheckCircle className="h-5 w-5" />}
              tone="violet"
              subtitle={t('purchase.orders.readyForReceipt', 'Ready for receipt')}
              loading={loading}
            />
          </div>

          {/* Filters */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('purchase.orders.search', 'Search')}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder={t('purchase.orders.searchPlaceholder', 'Search by reference...')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-slate-200 bg-white pl-9 text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('purchase.orders.status', 'Status')}
                  </label>
                  <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                    <SelectTrigger className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <SelectValue placeholder={t('purchase.orders.allStatuses', 'All Statuses')} />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                      <SelectItem value="all" className="dark:text-slate-200">{t('purchase.orders.allStatuses', 'All Statuses')}</SelectItem>
                      <SelectItem value="draft" className="dark:text-slate-200">{t('purchase.status.draft', 'Draft')}</SelectItem>
                      <SelectItem value="approved" className="dark:text-slate-200">{t('purchase.status.approved', 'Approved')}</SelectItem>
                      <SelectItem value="partially_received" className="dark:text-slate-200">{t('purchase.status.partially_received', 'Partially Received')}</SelectItem>
                      <SelectItem value="fully_received" className="dark:text-slate-200">{t('purchase.status.fully_received', 'Fully Received')}</SelectItem>
                      <SelectItem value="cancelled" className="dark:text-slate-200">{t('purchase.status.cancelled', 'Cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('purchase.orders.supplier', 'Supplier')}
                  </label>
                  <Select value={supplierFilter || 'all'} onValueChange={(value) => setSupplierFilter(value === 'all' ? '' : value)}>
                    <SelectTrigger className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <SelectValue placeholder={t('purchase.orders.allSuppliers', 'All Suppliers')} />
                    </SelectTrigger>
                    <SelectContent className="border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                      <SelectItem value="all" className="dark:text-slate-200">{t('purchase.orders.allSuppliers', 'All Suppliers')}</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier._id} value={supplier._id} className="dark:text-slate-200">
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('purchase.orders.dateFrom', 'Date From')}
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('purchase.orders.dateTo', 'Date To')}
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {loading ? (
              <div className="space-y-3 p-5">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : poList.length === 0 ? (
              <CardContent className="p-5">
                <EmptyState
                  icon={<ClipboardList className="h-6 w-6" />}
                  message={t('purchase.orders.noOrders', 'No purchase orders found')}
                />
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800 dark:bg-slate-900/50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('purchase.orders.reference', 'Reference')}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('purchase.orders.supplier', 'Supplier')}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('purchase.orders.orderDate', 'Order Date')}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('purchase.orders.expectedDelivery', 'Expected Delivery')}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('purchase.orders.status', 'Status')}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('purchase.orders.totalAmount', 'Total Amount')}
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('purchase.orders.lines', 'Lines')}
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t('common.actions', 'Actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poList.map((po) => (
                      <TableRow
                        key={po._id}
                        className="cursor-pointer border-b-slate-100 transition-colors hover:bg-slate-50/50 dark:border-b-slate-800/50 dark:hover:bg-slate-800/30"
                        onClick={() => navigate(`/purchase-orders/${po._id}`)}
                      >
                        <TableCell className="font-medium text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            {po.referenceNo || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {po.supplier?.name || '-'}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {formatDate(po.orderDate)}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(po.status)}</TableCell>
                        <TableCell className="font-mono font-medium text-slate-950 dark:text-white">
                          {formatCurrency(po.totalAmount, po.currencyCode)}
                        </TableCell>
                        <TableCell className="text-slate-600 dark:text-slate-300">
                          {po.linesCount || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/purchase-orders/${po._id}`);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {po.status === 'draft' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/purchase-orders/${po._id}/edit`);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApprove(po._id);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancel(po._id);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      className={
                        pagination.currentPage === 1
                          ? 'pointer-events-none opacity-50 dark:border-slate-700 dark:text-slate-400'
                          : 'dark:border-slate-700 dark:text-slate-200'
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => handlePageChange(pageNum)}
                        isActive={pageNum === pagination.currentPage}
                        className={
                          pageNum === pagination.currentPage
                            ? 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200'
                            : 'dark:border-slate-700 dark:text-slate-200'
                        }
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      className={
                        pagination.currentPage === pagination.totalPages
                          ? 'pointer-events-none opacity-50 dark:border-slate-700 dark:text-slate-400'
                          : 'dark:border-slate-700 dark:text-slate-200'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}