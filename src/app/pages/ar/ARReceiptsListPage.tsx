import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { arReceiptsApi, clientsApi } from '@/lib/api';
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

interface ARReceipt {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
    code?: string;
  };
  receiptDate: string;
  paymentMethod: string;
  amountReceived: string;
  currencyCode: string;
  status: 'draft' | 'posted' | 'reversed';
  unallocatedAmount?: string;
  createdAt: string;
}

interface Client {
  _id: string;
  name: string;
  code?: string;
}

export default function ARReceiptsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [receiptList, setReceiptList] = useState<ARReceipt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [clientFilter, setClientFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientsApi.getAll({ limit: 100 });
      if (response.success && Array.isArray(response.data)) {
        setClients(response.data as Client[]);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  }, []);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 20,
      };

      if (clientFilter && clientFilter !== 'all') params.client_id = clientFilter;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await arReceiptsApi.getAll(params);
      console.log('[ARReceiptsListPage] API Response:', response);

      if (response.success) {
        setReceiptList(response.data as ARReceipt[]);
        // Calculate total pages from count
        const total = response.count || 0;
        setTotalPages(Math.ceil(total / 20));
      }
    } catch (error) {
      console.error('[ARReceiptsListPage] Failed to fetch receipts:', error);
    } finally {
      setLoading(false);
    }
  }, [page, clientFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handlePost = async (id: string) => {
    try {
      await arReceiptsApi.post(id);
      fetchReceipts();
    } catch (error) {
      console.error('Failed to post receipt:', error);
    }
  };

  const handleReverse = async (id: string) => {
    const reason = window.prompt('Enter reversal reason:');
    if (!reason) return;
    try {
      await arReceiptsApi.reverse(id, reason);
      fetchReceipts();
    } catch (error) {
      console.error('Failed to reverse receipt:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: t('arReceipt.status.draft', 'Draft') },
      posted: { variant: 'default', label: t('arReceipt.status.posted', 'Posted') },
      reversed: { variant: 'destructive', label: t('arReceipt.status.reversed', 'Reversed') },
    };

    const config = statusConfig[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: t('arReceipt.paymentMethod.bankTransfer', 'Bank Transfer'),
      cash: t('arReceipt.paymentMethod.cash', 'Cash'),
      cheque: t('arReceipt.paymentMethod.cheque', 'Cheque'),
      card: t('arReceipt.paymentMethod.card', 'Card'),
      other: t('arReceipt.paymentMethod.other', 'Other'),
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
            <h1 className="text-2xl font-bold">{t('arReceipt.title', 'AR Receipts')}</h1>
            <p className="text-muted-foreground">{t('arReceipt.description', 'Manage customer receipts')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t('common.export', 'Export')}
            </Button>
            <Button onClick={() => navigate('/ar-receipts/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('arReceipt.newReceipt', 'New Receipt')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">{t('arReceipt.search', 'Search')}</label>
              <Input
                placeholder={t('arReceipt.searchPlaceholder', 'Search by reference...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('arReceipt.client', 'Client')}</label>
              <Select value={clientFilter || 'all'} onValueChange={(value) => setClientFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('arReceipt.allClients', 'All Clients')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('arReceipt.allClients', 'All Clients')}</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('arReceipt.status', 'Status')}</label>
              <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('arReceipt.allStatuses', 'All Statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('arReceipt.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="draft">{t('arReceipt.status.draft', 'Draft')}</SelectItem>
                  <SelectItem value="posted">{t('arReceipt.status.posted', 'Posted')}</SelectItem>
                  <SelectItem value="reversed">{t('arReceipt.status.reversed', 'Reversed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('arReceipt.dateFrom', 'Date From')}</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t('arReceipt.dateTo', 'Date To')}</label>
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
                  <TableHead>{t('arReceipt.reference', 'Reference')}</TableHead>
                  <TableHead>{t('arReceipt.client', 'Client')}</TableHead>
                  <TableHead>{t('arReceipt.date', 'Date')}</TableHead>
                  <TableHead>{t('arReceipt.paymentMethod', 'Payment Method')}</TableHead>
                  <TableHead>{t('arReceipt.amount', 'Amount')}</TableHead>
                  <TableHead>{t('arReceipt.status', 'Status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receiptList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('arReceipt.noReceipts', 'No receipts found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  receiptList.map((receipt) => (
                    <TableRow key={receipt._id}>
                      <TableCell className="font-medium">
                        <FileText className="inline-block mr-2 h-4 w-4" />
                        {receipt.referenceNo || 'N/A'}
                      </TableCell>
                      <TableCell>{receipt.client?.name || '-'}</TableCell>
                      <TableCell>{formatDate(receipt.receiptDate)}</TableCell>
                      <TableCell>{getPaymentMethodLabel(receipt.paymentMethod)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(receipt.amountReceived, receipt.currencyCode)}
                      </TableCell>
                      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/ar-receipts/${receipt._id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {receipt.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/ar-receipts/${receipt._id}/edit`)}
                              >
                                <Send className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePost(receipt._id)}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {receipt.status === 'posted' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReverse(receipt._id)}
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