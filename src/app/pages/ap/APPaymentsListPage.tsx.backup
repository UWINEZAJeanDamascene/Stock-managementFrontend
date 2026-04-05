import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { apPaymentsApi, suppliersApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Eye,
  Send,
  Undo2,
  Loader2,
  FileText,
  Download,
  Search,
  Calendar
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
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
import { useTranslation } from 'react-i18next';

interface APPayment {
  _id: string;
  referenceNo: string;
  supplier: {
    _id: string;
    name: string;
    code?: string;
  };
  paymentDate: string;
  paymentMethod: string;
  amountPaid: string;
  currencyCode: string;
  status: 'draft' | 'posted' | 'reversed';
  unallocatedAmount?: string;
  createdAt: string;
}

interface Supplier {
  _id: string;
  name: string;
  code?: string;
}

export default function APPaymentsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentList, setPaymentList] = useState<APPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await suppliersApi.getAll({ limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setSuppliers(response.data as Supplier[]);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 20,
      };

      if (supplierFilter && supplierFilter !== 'all') params.supplier_id = supplierFilter;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await apPaymentsApi.getAll(params);
      console.log('[APPaymentsListPage] API Response:', response);

      if (response.success) {
        setPaymentList(response.data as APPayment[]);
        // Calculate total pages from count
        const total = response.count || 0;
        setTotalPages(Math.ceil(total / 20));
      }
    } catch (error) {
      console.error('[APPaymentsListPage] Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  }, [page, supplierFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handlePost = async (id: string) => {
    try {
      await apPaymentsApi.post(id);
      fetchPayments();
    } catch (error) {
      console.error('Failed to post payment:', error);
    }
  };

  const handleReverse = async (id: string) => {
    const reason = window.prompt('Enter reversal reason:');
    if (!reason) return;
    try {
      await apPaymentsApi.reverse(id, reason);
      fetchPayments();
    } catch (error) {
      console.error('Failed to reverse payment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: t('apPayment.status.draft', 'Draft') },
      posted: { variant: 'default', label: t('apPayment.status.posted', 'Posted') },
      reversed: { variant: 'destructive', label: t('apPayment.status.reversed', 'Reversed') },
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: t('apPayment.paymentMethods.bankTransfer', 'Bank Transfer'),
      cash: t('apPayment.paymentMethods.cash', 'Cash'),
      cheque: t('apPayment.paymentMethods.cheque', 'Cheque'),
      card: t('apPayment.paymentMethods.card', 'Card'),
      other: t('apPayment.paymentMethods.other', 'Other'),
    };
    return labels[method] || method;
  };

  const formatCurrency = (amount: string | number, currency: string = 'USD') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('apPayment.title', 'AP Payments')}</h1>
            <p className="text-muted-foreground">{t('apPayment.description', 'Manage supplier payments')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t('common.export', 'Export')}
            </Button>
            <Button onClick={() => navigate('/ap-payments/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('apPayment.newPayment', 'New Payment')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('apPayment.search', 'Search')}</label>
              <Input
                placeholder={t('apPayment.searchPlaceholder', 'Search by reference...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('apPayment.supplier', 'Supplier')}</label>
              <Select value={supplierFilter || 'all'} onValueChange={(value) => setSupplierFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('apPayment.allSuppliers', 'All Suppliers')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('apPayment.allSuppliers', 'All Suppliers')}</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('apPayment.statusLabel', 'Status')}</label>
              <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('apPayment.allStatuses', 'All Statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('apPayment.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="draft">{t('apPayment.status.draft', 'Draft')}</SelectItem>
                  <SelectItem value="posted">{t('apPayment.status.posted', 'Posted')}</SelectItem>
                  <SelectItem value="reversed">{t('apPayment.status.reversed', 'Reversed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('apPayment.dateFrom', 'Date From')}</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('apPayment.dateTo', 'Date To')}</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('apPayment.reference', 'Reference')}</TableHead>
                  <TableHead>{t('apPayment.supplier', 'Supplier')}</TableHead>
                  <TableHead>{t('apPayment.date', 'Date')}</TableHead>
                  <TableHead>{t('apPayment.paymentMethod', 'Payment Method')}</TableHead>
                  <TableHead>{t('apPayment.amount', 'Amount')}</TableHead>
                  <TableHead>{t('apPayment.statusLabel', 'Status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('apPayment.noPayments', 'No payments found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentList.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell className="font-medium">
                        <FileText className="inline-block mr-2 h-4 w-4" />
                        {payment.referenceNo || 'N/A'}
                      </TableCell>
                      <TableCell>{payment.supplier?.name || '-'}</TableCell>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>{getPaymentMethodLabel(payment.paymentMethod)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amountPaid, payment.currencyCode)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/ap-payments/${payment._id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {payment.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/ap-payments/${payment._id}/edit`)}
                              >
                                <Send className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePost(payment._id)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {payment.status === 'posted' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReverse(payment._id)}
                            >
                              <Undo2 className="h-4 w-4 text-red-500" />
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
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      onClick={() => setPage(p)}
                      isActive={page === p}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </Layout>
  );
}
