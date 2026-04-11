import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { purchasesApi, suppliersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Eye,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Truck,
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
import { Badge } from '@/app/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface PurchaseItem {
  product: { _id: string; name: string; sku: string; unit?: string };
  quantity: string;
  unitCost: string;
  subtotal: string;
  totalWithTax: string;
}

interface Purchase {
  _id: string;
  purchaseNumber: string;
  supplier: { _id: string; name: string; code?: string };
  status: 'draft' | 'ordered' | 'received' | 'partial' | 'paid' | 'cancelled';
  purchaseDate: string;
  expectedDeliveryDate?: string;
  currency: string;
  grandTotal: string;
  amountPaid: string;
  balance: string;
  items: PurchaseItem[];
  createdBy?: { name: string; email: string };
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

export default function PurchasesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [purchaseList, setPurchaseList] = useState<Purchase[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await suppliersApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : [];
        setSuppliers(data as Supplier[]);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  }, []);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (supplierFilter) params.supplierId = supplierFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;

      const response = await purchasesApi.getAll(params as any);
      if (response.success) {
        setPurchaseList((response.data as Purchase[]) || []);
        const total = (response as any).total || 0;
        const pages = (response as any).pages || 1;
        setPagination({
          currentPage: (response as any).currentPage || page,
          totalPages: pages,
          total,
          limit: 20,
        });
      }
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, supplierFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      {
        variant: 'default' | 'secondary' | 'outline' | 'destructive';
        label: string;
      }
    > = {
      draft: {
        variant: 'secondary',
        label: t('purchases.status.draft', 'Draft'),
      },
      ordered: {
        variant: 'outline',
        label: t('purchases.status.ordered', 'Ordered'),
      },
      received: {
        variant: 'default',
        label: t('purchases.status.received', 'Received'),
      },
      partial: {
        variant: 'secondary',
        label: t('purchases.status.partial', 'Partial'),
      },
      paid: {
        variant: 'default',
        label: t('purchases.status.paid', 'Paid'),
      },
      cancelled: {
        variant: 'destructive',
        label: t('purchases.status.cancelled', 'Cancelled'),
      },
    };
    const c = config[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const handleReceive = async (id: string) => {
    try {
      await purchasesApi.receive(id);
      fetchPurchases();
    } catch (error) {
      console.error('Failed to receive purchase:', error);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm(t('purchases.confirmCancel', 'Are you sure you want to cancel this purchase?'))) return;
    try {
      await purchasesApi.cancel(id);
      fetchPurchases();
    } catch (error) {
      console.error('Failed to cancel purchase:', error);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('purchases.listTitle', 'Direct Purchases')}
            </h1>
            <p className="text-muted-foreground">
              {t(
                'purchases.listDescription',
                'Manage direct purchase entries'
              )}
            </p>
          </div>
          <Button onClick={() => navigate('/purchases/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('purchases.newPurchase', 'New Purchase')}
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-slate-900 dark:text-white">
                {t('purchases.status', 'Status')}
              </label>
              <Select
                value={statusFilter || 'all'}
                onValueChange={(v) =>
                  setStatusFilter(v === 'all' ? '' : v)
                }
              >
                <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                  <SelectValue
                    placeholder={t('purchases.allStatuses', 'All Statuses')}
                  />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="dark:text-slate-200">
                    {t('purchases.allStatuses', 'All Statuses')}
                  </SelectItem>
                  <SelectItem value="draft" className="dark:text-slate-200">
                    {t('purchases.status.draft', 'Draft')}
                  </SelectItem>
                  <SelectItem value="ordered" className="dark:text-slate-200">
                    {t('purchases.status.ordered', 'Ordered')}
                  </SelectItem>
                  <SelectItem value="received" className="dark:text-slate-200">
                    {t('purchases.status.received', 'Received')}
                  </SelectItem>
                  <SelectItem value="partial" className="dark:text-slate-200">
                    {t('purchases.status.partial', 'Partial')}
                  </SelectItem>
                  <SelectItem value="paid" className="dark:text-slate-200">
                    {t('purchases.status.paid', 'Paid')}
                  </SelectItem>
                  <SelectItem value="cancelled" className="dark:text-slate-200">
                    {t('purchases.status.cancelled', 'Cancelled')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-slate-900 dark:text-white">
                {t('purchases.supplier', 'Supplier')}
              </label>
              <Select
                value={supplierFilter || 'all'}
                onValueChange={(v) =>
                  setSupplierFilter(v === 'all' ? '' : v)
                }
              >
                <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                  <SelectValue
                    placeholder={t('purchases.allSuppliers', 'All Suppliers')}
                  />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="dark:text-slate-200">
                    {t('purchases.allSuppliers', 'All Suppliers')}
                  </SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s._id} value={s._id} className="dark:text-slate-200">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-slate-900 dark:text-white">
                {t('purchases.dateFrom', 'Date From')}
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-slate-900 dark:text-white">
                {t('purchases.dateTo', 'Date To')}
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="dark:bg-slate-700">
                  <TableHead className="dark:text-white">
                    {t('purchases.purchaseNumber', 'Purchase #')}
                  </TableHead>
                  <TableHead className="dark:text-white">
                    {t('purchases.supplier', 'Supplier')}
                  </TableHead>
                  <TableHead className="dark:text-white">
                    {t('purchases.purchaseDate', 'Purchase Date')}
                  </TableHead>
                  <TableHead className="dark:text-white">{t('purchases.status', 'Status')}</TableHead>
                  <TableHead className="text-right dark:text-white">
                    {t('purchases.totalAmount', 'Total Amount')}
                  </TableHead>
                  <TableHead className="text-right dark:text-white">
                    {t('purchases.balance', 'Balance')}
                  </TableHead>
                  <TableHead className="text-right dark:text-white">
                    {t('purchases.items', 'Items')}
                  </TableHead>
                  <TableHead className="text-right dark:text-white">
                    {t('common.actions', 'Actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground dark:text-slate-400"
                    >
                      {t('purchases.noPurchases', 'No purchases found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  purchaseList.map((p) => (
                    <TableRow key={p._id} className="dark:hover:bg-slate-700/50">
                      <TableCell className="font-medium dark:text-slate-200">
                        <FileText className="inline-block mr-2 h-4 w-4" />
                        {p.purchaseNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="dark:text-slate-300">{p.supplier?.name || '-'}</TableCell>
                      <TableCell className="dark:text-slate-300">{formatDate(p.purchaseDate)}</TableCell>
                      <TableCell>{getStatusBadge(p.status)}</TableCell>
                      <TableCell className="text-right font-medium dark:text-slate-200">
                        {formatCurrency(p.grandTotal)}
                      </TableCell>
                      <TableCell className="text-right dark:text-slate-300">
                        {formatCurrency(Number(p.grandTotal) - (p.payments?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.items?.length || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/purchases/${p._id}`)}
                            title={t('common.view', 'View')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(p.status === 'draft' || p.status === 'ordered') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReceive(p._id)}
                              title={t('purchases.receive', 'Receive')}
                            >
                              <Truck className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {p.status !== 'cancelled' && p.status !== 'received' && p.status !== 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(p._id)}
                              title={t('common.cancel', 'Cancel')}
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <div className="flex items-center gap-2">
              <button
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                  pagination.currentPage === 1
                    ? 'pointer-events-none opacity-50'
                    : ''
                }`}
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={pagination.currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                    pagination.currentPage === i + 1
                      ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                      : ''
                  }`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                  pagination.currentPage === pagination.totalPages
                    ? 'pointer-events-none opacity-50'
                    : ''
                }`}
                onClick={() => setPage(page + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
