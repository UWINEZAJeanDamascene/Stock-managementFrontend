import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { arReceiptsApi, clientsApi, arReconciliationApi, ARTransaction, ARDashboardData } from '@/lib/api';
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
  Calendar,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Activity,
  TrendingUp,
  Clock,
  Building2,
  User,
  Wallet
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/app/components/ui/tooltip';
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

interface AgingBucket {
  client: { _id: string; name: string; code: string };
  totalBalance: number;
  current: number;
  '1-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}

interface InvoiceDetail {
  _id: string;
  invoiceNumber: string;
  referenceNo: string;
  invoiceDate: string;
  dueDate: string;
  balance: string;
  amountOutstanding: string;
  status: string;
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

  // Aging report state - SEPARATE from receipts filters to avoid interference
  const [agingData, setAgingData] = useState<AgingBucket[]>([]);
  const [agingSummary, setAgingSummary] = useState({
    current: 0,
    '1-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
    total: 0
  });
  const [agingClientFilter, setAgingClientFilter] = useState<string>('');
  const [agingAsOfDate, setAgingAsOfDate] = useState<string>('');
  const [loadingAging, setLoadingAging] = useState(false);
  const [selectedClient, setSelectedClient] = useState<{ _id: string; name: string; code?: string } | null>(null);
  const [clientInvoices, setClientInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [activeTab, setActiveTab] = useState('receipts');
  const { toast } = useToast();

  // AR Reconciliation State
  const [loadingRec, setLoadingRec] = useState({
    dashboard: false,
    transactions: false,
    receivables: false,
    verify: false,
    reconcile: false
  });
  const [dashboardData, setDashboardData] = useState<ARDashboardData | null>(null);
  const [transactions, setTransactions] = useState<ARTransaction[]>([]);
  const [currentReceivables, setCurrentReceivables] = useState<any[]>([]);
  const [receivablesSummary, setReceivablesSummary] = useState<any>(null);
  const [recFilters, setRecFilters] = useState({
    transactionType: '',
    reconciliationStatus: '',
    clientId: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50
  });
  const [recPagination, setRecPagination] = useState({ total: 0, pages: 1, currentPage: 1 });
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);

  const transactionTypes = [
    { value: 'invoice_created', label: t('arReconciliation.types.invoiceCreated', 'Invoice Created') },
    { value: 'invoice_cancelled', label: t('arReconciliation.types.invoiceCancelled', 'Invoice Cancelled') },
    { value: 'receipt_posted', label: t('arReconciliation.types.receiptPosted', 'Receipt Posted') },
    { value: 'receipt_reversed', label: t('arReconciliation.types.receiptReversed', 'Receipt Reversed') },
    { value: 'credit_note_applied', label: t('arReconciliation.types.creditNoteApplied', 'Credit Note Applied') },
    { value: 'bad_debt_writeoff', label: t('arReconciliation.types.badDebtWriteoff', 'Bad Debt Write-off') },
    { value: 'payment_recorded', label: t('arReconciliation.types.paymentRecorded', 'Payment Recorded') },
    { value: 'manual_adjustment', label: t('arReconciliation.types.manualAdjustment', 'Manual Adjustment') },
    { value: 'system_correction', label: t('arReconciliation.types.systemCorrection', 'System Correction') }
  ];

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

  const fetchAgingReport = useCallback(async () => {
    setLoadingAging(true);
    try {
      const params: any = {};
      if (agingClientFilter && agingClientFilter !== 'all') params.client_id = agingClientFilter;
      if (agingAsOfDate) params.as_of_date = agingAsOfDate;

      const response = await arReceiptsApi.getAgingReport(params);
      console.log('[ARReceiptsListPage] Aging API Response:', response);

      // Handle response format: { success: true, data: [...] }
      const agingItems = response.data || response;
      
      if (Array.isArray(agingItems)) {
        setAgingData(agingItems as AgingBucket[]);
        const totals = agingItems.reduce(
          (acc, item) => ({
            current: acc.current + (parseFloat(item.current) || 0),
            '1-30': acc['1-30'] + (parseFloat(item['1-30']) || 0),
            '31-60': acc['31-60'] + (parseFloat(item['31-60']) || 0),
            '61-90': acc['61-90'] + (parseFloat(item['61-90']) || 0),
            '90+': acc['90+'] + (parseFloat(item['90+']) || 0),
            total: acc.total + (parseFloat(item.totalBalance) || 0),
          }),
          { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 }
        );
        setAgingSummary(totals);
      } else if (response.byClient) {
        setAgingData(response.byClient as AgingBucket[]);
        if (response.summary) {
          setAgingSummary(response.summary);
        }
      }
    } catch (error) {
      console.error('[ARReceiptsListPage] Failed to fetch aging report:', error);
    } finally {
      setLoadingAging(false);
    }
  }, [agingClientFilter, agingAsOfDate]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Load aging data when switching to aging tab
  useEffect(() => {
    if (activeTab === 'aging') {
      fetchAgingReport();
    }
  }, [activeTab, fetchAgingReport]);

  const handleClientClick = async (client: AgingBucket) => {
    setSelectedClient(client.client);
    setLoadingInvoices(true);
    try {
      const response = await arReceiptsApi.getClientStatement(client.client._id, {
        startDate: undefined,
        endDate: agingAsOfDate,
      });
      console.log('[ARReceiptsListPage] Client statement response:', response);

      if (response && response.invoices) {
        setClientInvoices(response.invoices);
      } else if (Array.isArray(response)) {
        setClientInvoices(response);
      } else {
        setClientInvoices([]);
      }
    } catch (error) {
      console.error('Failed to fetch client statement:', error);
      setClientInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

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

  // AR Reconciliation Fetch Functions
  const fetchDashboard = useCallback(async () => {
    setLoadingRec(prev => ({ ...prev, dashboard: true }));
    try {
      const response = await arReconciliationApi.getDashboard();
      if (response && response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoadingRec(prev => ({ ...prev, dashboard: false }));
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoadingRec(prev => ({ ...prev, transactions: true }));
    try {
      const response = await arReconciliationApi.getTransactions({
        ...recFilters,
        page: recFilters.page,
        limit: recFilters.limit
      });
      if (response.success) {
        setTransactions(response.data || []);
        setRecPagination({
          total: response.total || 0,
          pages: response.pages || 1,
          currentPage: response.currentPage || 1
        });
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoadingRec(prev => ({ ...prev, transactions: false }));
    }
  }, [recFilters]);

  const fetchReceivables = useCallback(async () => {
    setLoadingRec(prev => ({ ...prev, receivables: true }));
    try {
      const response = await arReconciliationApi.getCurrentReceivables({ limit: 100 });
      if (response.success) {
        setCurrentReceivables(response.data?.invoices || []);
        setReceivablesSummary(response.data?.summary || null);
      }
    } catch (error) {
      console.error('Failed to fetch receivables:', error);
    } finally {
      setLoadingRec(prev => ({ ...prev, receivables: false }));
    }
  }, []);

  // Tab effect - load data when switching tabs
  useEffect(() => {
    if (activeTab === 'reconciliation') {
      fetchDashboard();
      fetchReceivables();
    }
    if (activeTab === 'reconciliation-transactions') fetchTransactions();
  }, [activeTab, fetchDashboard, fetchReceivables, fetchTransactions]);

  // AR Reconciliation Actions
  const handleVerify = async () => {
    setLoadingRec(prev => ({ ...prev, verify: true }));
    try {
      const response = await arReconciliationApi.verifyIntegrity({
        clientId: recFilters.clientId || undefined,
        startDate: recFilters.startDate || undefined,
        endDate: recFilters.endDate || undefined
      });
      setVerificationResult(response.data);
      setIsVerifyDialogOpen(true);
    } catch (error) {
      toast({ title: t('common.error'), description: t('arReconciliation.verifyFailed', 'Verification failed'), variant: 'destructive' });
    } finally {
      setLoadingRec(prev => ({ ...prev, verify: false }));
    }
  };

  const handleReconcile = async () => {
    setLoadingRec(prev => ({ ...prev, reconcile: true }));
    try {
      const response = await arReconciliationApi.reconcileAndCorrect({
        clientId: recFilters.clientId || undefined,
        startDate: recFilters.startDate || undefined,
        endDate: recFilters.endDate || undefined
      });
      toast({ title: t('common.success'), description: response.message });
      fetchDashboard();
    } catch (error) {
      toast({ title: t('common.error'), description: t('arReconciliation.reconcileFailed', 'Reconciliation failed'), variant: 'destructive' });
    } finally {
      setLoadingRec(prev => ({ ...prev, reconcile: false }));
    }
  };

  const handleVerifyAll = async () => {
    setLoadingRec(prev => ({ ...prev, reconcile: true }));
    try {
      const response = await arReconciliationApi.verifyAllPending();
      toast({ title: t('common.success'), description: response.message });
      fetchDashboard();
    } catch (error) {
      toast({ title: t('common.error'), description: t('arReconciliation.verifyAllFailed', 'Failed to verify all'), variant: 'destructive' });
    } finally {
      setLoadingRec(prev => ({ ...prev, reconcile: false }));
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

  const formatCurrency = (amount: string | number | undefined, currency: string = 'USD') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getTransactionTypeBadge = (type: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      invoice_created: { variant: 'default', label: 'Invoice' },
      invoice_cancelled: { variant: 'destructive', label: 'Cancelled' },
      receipt_posted: { variant: 'secondary', label: 'Receipt' },
      receipt_reversed: { variant: 'destructive', label: 'Reversed' },
      credit_note_applied: { variant: 'outline', label: 'Credit Note' },
      bad_debt_writeoff: { variant: 'destructive', label: 'Write-off' },
      payment_recorded: { variant: 'default', label: 'Payment' },
      manual_adjustment: { variant: 'secondary', label: 'Adjustment' },
      system_correction: { variant: 'outline', label: 'Correction' }
    };
    const c = config[type] || { variant: 'secondary', label: type };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getReconciliationStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: t('arReconciliation.pending', 'Pending') },
      verified: { variant: 'default', label: t('arReconciliation.verified', 'Verified') },
      discrepancy: { variant: 'destructive', label: t('arReconciliation.discrepancy', 'Discrepancy') },
      corrected: { variant: 'outline', label: t('arReconciliation.corrected', 'Corrected') }
    };
    const c = config[status] || config.pending;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getAgingBadge = (amount: number) => {
    if (amount === 0) return <Badge variant="outline">{formatCurrency(0)}</Badge>;
    if (amount > 10000) return <Badge variant="destructive">{formatCurrency(amount)}</Badge>;
    if (amount > 5000) return <Badge variant="secondary">{formatCurrency(amount)}</Badge>;
    return <Badge variant="default">{formatCurrency(amount)}</Badge>;
  };

  const exportAgingToCSV = () => {
    const headers = ['Client', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total'];
    const rows = agingData.map((item) => [
      item.client.name,
      item.current || 0,
      item['1-30'] || 0,
      item['31-60'] || 0,
      item['61-90'] || 0,
      item['90+'] || 0,
      item.totalBalance || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ar_aging_${agingAsOfDate || new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getInvoiceStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      confirmed: { variant: 'default', label: 'Confirmed' },
      partial: { variant: 'outline', label: 'Partial' },
      paid: { variant: 'default', label: 'Paid' },
      cancelled: { variant: 'destructive', label: 'Cancelled' },
    };
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <TooltipProvider>
      <Layout>
        <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('arReceipt.title', 'Customer Payments')}</h1>
            <p className="text-muted-foreground">{t('arReceipt.description', 'Manage customer receipts and aging')}</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'receipts' && (
              <Button onClick={() => navigate('/ar-receipts/new')}>
                <Plus className="mr-2 h-4 w-4" />
                {t('arReceipt.newReceipt', 'New Receipt')}
              </Button>
            )}
            {activeTab === 'aging' && (
              <Button variant="outline" onClick={exportAgingToCSV}>
                <Download className="mr-2 h-4 w-4" />
                {t('common.export', 'Export CSV')}
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="receipts">{t('arReceipt.receipts', 'Receipts')}</TabsTrigger>
            <TabsTrigger value="aging">{t('arAging.title', 'Aging Report')}</TabsTrigger>
            <TabsTrigger value="reconciliation">
              <Activity className="w-4 h-4 mr-2" />
              {t('arReconciliation.dashboard', 'Dashboard')}
            </TabsTrigger>
            <TabsTrigger value="receivables">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t('arReconciliation.receivables', 'Receivables')}
            </TabsTrigger>
            <TabsTrigger value="reconciliation-transactions">
              <FileText className="w-4 h-4 mr-2" />
              {t('arReconciliation.transactions', 'Transactions')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receipts" className="space-y-6">
            {/* Filters */}
            <div className="bg-card rounded-lg border p-4">
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
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/ar-receipts/${receipt._id}`)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('arReceipt.viewReceipt', 'View Receipt')}</p>
                                </TooltipContent>
                              </Tooltip>
                              {receipt.status === 'draft' && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate(`/ar-receipts/${receipt._id}/edit`)}
                                      >
                                        <Send className="h-4 w-4 text-green-500" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('arReceipt.editReceipt', 'Edit Receipt')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handlePost(receipt._id)}
                                      >
                                        <Send className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('arReceipt.postReceipt', 'Post Receipt')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                              {receipt.status === 'posted' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleReverse(receipt._id)}
                                    >
                                      <Undo2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('arReceipt.reverseReceipt', 'Reverse Receipt')}</p>
                                  </TooltipContent>
                                </Tooltip>
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
              <div className="flex justify-center">
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
          </TabsContent>

          <TabsContent value="aging" className="space-y-6">
            {/* Aging Filters */}
            <div className="bg-card rounded-lg border p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('arAging.client', 'Client')}</label>
                  <Select value={agingClientFilter || 'all'} onValueChange={(value) => setAgingClientFilter(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('arAging.allClients', 'All Clients')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('arAging.allClients', 'All Clients')}</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client._id} value={client._id}>
                          {client.name} ({client.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('arAging.asOfDate', 'As of Date')}</label>
                  <Input
                    type="date"
                    value={agingAsOfDate}
                    onChange={(e) => setAgingAsOfDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchAgingReport}>
                    {t('arAging.refresh', 'Refresh')}
                  </Button>
                </div>
              </div>
            </div>

            {selectedClient ? (
              /* Drill-down view */
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-4">
                  <Button variant="ghost" onClick={() => setSelectedClient(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('common.back', 'Back')}
                  </Button>
                  <h2 className="text-xl font-bold">
                    {selectedClient.name} - {t('arAging.invoices', 'Invoices')}
                  </h2>
                </div>

                <Card>
                  <CardContent className="p-0">
                    {loadingInvoices ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : clientInvoices.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="mx-auto h-8 w-8 mb-2" />
                        <p>{t('arAging.noInvoices', 'No invoices found')}</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('arAging.invoiceNumber', 'Invoice #')}</TableHead>
                            <TableHead>{t('arAging.reference', 'Reference')}</TableHead>
                            <TableHead>{t('arAging.invoiceDate', 'Invoice Date')}</TableHead>
                            <TableHead>{t('arAging.dueDate', 'Due Date')}</TableHead>
                            <TableHead className="text-right">{t('arAging.balance', 'Balance')}</TableHead>
                            <TableHead>{t('arAging.status', 'Status')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientInvoices.map((invoice) => (
                            <TableRow key={invoice._id}>
                              <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                              <TableCell>{invoice.referenceNo || '-'}</TableCell>
                              <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                              <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(parseFloat(invoice.balance || invoice.amountOutstanding || '0'))}
                              </TableCell>
                              <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Main aging table */
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-6 gap-4">
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">{t('arAging.current', 'Current')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-2xl font-bold">{formatCurrency(agingSummary.current)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">1-30 {t('arAging.days', 'Days')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-2xl font-bold">{formatCurrency(agingSummary['1-30'])}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">31-60 {t('arAging.days', 'Days')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-2xl font-bold">{formatCurrency(agingSummary['31-60'])}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">61-90 {t('arAging.days', 'Days')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-2xl font-bold">{formatCurrency(agingSummary['61-90'])}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">90+ {t('arAging.days', 'Days')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(agingSummary['90+'])}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary text-primary-foreground">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">{t('arAging.total', 'Total')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-2xl font-bold">{formatCurrency(agingSummary.total)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Table */}
                <Card>
                  <CardContent className="p-0">
                    {loadingAging ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : agingData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>{t('arAging.noData', 'No aging data found')}</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('arAging.client', 'Client')}</TableHead>
                            <TableHead className="text-right">{t('arAging.current', 'Current')}</TableHead>
                            <TableHead className="text-right">1-30</TableHead>
                            <TableHead className="text-right">31-60</TableHead>
                            <TableHead className="text-right">61-90</TableHead>
                            <TableHead className="text-right">90+</TableHead>
                            <TableHead className="text-right">{t('arAging.total', 'Total')}</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agingData.map((item) => (
                            <TableRow
                              key={item.client._id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleClientClick(item)}
                            >
                              <TableCell className="font-medium">
                                <div>{item.client.name}</div>
                                <div className="text-sm text-muted-foreground">{item.client.code}</div>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(item.current)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item['1-30'])}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item['31-60'])}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item['61-90'])}</TableCell>
                              <TableCell className="text-right text-red-600">{formatCurrency(item['90+'])}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(item.totalBalance)}</TableCell>
                              <TableCell>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Reconciliation Dashboard Tab */}
          <TabsContent value="reconciliation" className="space-y-6">
            <div className="flex justify-end gap-2">
              <Button onClick={handleVerify} disabled={loadingRec.verify} variant="outline">
                {loadingRec.verify ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {t('arReconciliation.verifyIntegrity', 'Verify Integrity')}
              </Button>
              <Button onClick={handleReconcile} disabled={loadingRec.reconcile}>
                {loadingRec.reconcile ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {t('arReconciliation.reconcile', 'Reconcile & Correct')}
              </Button>
              <Button onClick={handleVerifyAll} disabled={loadingRec.reconcile} variant="outline">
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('arReconciliation.verifyAll', 'Verify All Pending')}
              </Button>
            </div>

            {loadingRec.dashboard ? (
              <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
            ) : !dashboardData ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('arReconciliation.noData', 'No dashboard data available')}</p>
                <Button onClick={fetchDashboard} variant="outline" className="mt-4">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('common.retry', 'Retry')}
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('arReconciliation.totalTransactions', 'Total Transactions')}</CardDescription>
                      <CardTitle className="text-3xl">{((dashboardData.stats?.totalTransactions) || 0).toLocaleString()}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('arReconciliation.recentTransactions', 'Recent (30 Days)')}</CardDescription>
                      <CardTitle className="text-3xl">{((dashboardData.stats?.recentTransactions) || 0).toLocaleString()}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('arReconciliation.pendingReconciliation', 'Pending Reconciliation')}</CardDescription>
                      <CardTitle className="text-3xl text-yellow-600">{((dashboardData.stats?.pendingReconciliation) || 0).toLocaleString()}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>{t('arReconciliation.discrepancies', 'Discrepancies')}</CardDescription>
                      <CardTitle className={`text-3xl ${(dashboardData.stats?.discrepancyCount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {((dashboardData.stats?.discrepancyCount) || 0).toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('arReconciliation.recentActivity', 'Recent Activity')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('arReconciliation.date', 'Date')}</TableHead>
                          <TableHead>{t('arReconciliation.type', 'Type')}</TableHead>
                          <TableHead>{t('arReconciliation.client', 'Client')}</TableHead>
                          <TableHead>{t('arReconciliation.description', 'Description')}</TableHead>
                          <TableHead className="text-right">{t('arReconciliation.amount', 'Amount')}</TableHead>
                          <TableHead>{t('arReconciliation.status', 'Status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardData.recentActivity?.slice(0, 5).map((tx: ARTransaction) => (
                          <TableRow key={tx._id}>
                            <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                            <TableCell>{getTransactionTypeBadge(tx.transactionType)}</TableCell>
                            <TableCell>{tx.client?.name || '-'}</TableCell>
                            <TableCell className="max-w-xs truncate">{tx.description}</TableCell>
                            <TableCell className="text-right">
                              <span className={tx.direction === 'increase' ? 'text-green-600' : 'text-red-600'}>
                                {tx.direction === 'increase' ? '+' : '-'}{formatCurrency(tx.amount)}
                              </span>
                            </TableCell>
                            <TableCell>{getReconciliationStatusBadge(tx.reconciliationStatus)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Receivables Tab */}
          <TabsContent value="receivables" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('arReconciliation.outstandingReceivables', 'Outstanding Receivables')}</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRec.receivables ? (
                  <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('arReconciliation.invoiceNumber', 'Invoice #')}</TableHead>
                        <TableHead>{t('arReconciliation.client', 'Client')}</TableHead>
                        <TableHead>{t('arReconciliation.date', 'Date')}</TableHead>
                        <TableHead className="text-right">{t('arReconciliation.total', 'Total')}</TableHead>
                        <TableHead className="text-right">{t('arReconciliation.paid', 'Paid')}</TableHead>
                        <TableHead className="text-right">{t('arReconciliation.balance', 'Balance')}</TableHead>
                        <TableHead>{t('arReconciliation.status', 'Status')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentReceivables.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-8">{t('arReconciliation.noReceivables', 'No outstanding receivables')}</TableCell></TableRow>
                      ) : (
                        currentReceivables.map((inv) => (
                          <TableRow key={inv._id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/invoices/${inv._id}`)}>
                            <TableCell>{inv.invoiceNumber || inv.referenceNo || '-'}</TableCell>
                            <TableCell>{inv.client?.name || '-'}</TableCell>
                            <TableCell>{formatDate(inv.invoiceDate)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(inv.totalAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(inv.amountPaid)}</TableCell>
                            <TableCell className="text-right font-medium text-blue-600">{formatCurrency(inv.balance)}</TableCell>
                            <TableCell>
                              <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'partially_paid' ? 'secondary' : 'outline'}>
                                {inv.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reconciliation Transactions Tab */}
          <TabsContent value="reconciliation-transactions" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Select value={recFilters.transactionType || 'all'} onValueChange={(v) => setRecFilters(p => ({ ...p, transactionType: v === 'all' ? '' : v, page: 1 }))}>
                    <SelectTrigger><SelectValue placeholder={t('arReconciliation.allTypes', 'All Types')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('arReconciliation.allTypes', 'All Types')}</SelectItem>
                      {transactionTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={recFilters.reconciliationStatus || 'all'} onValueChange={(v) => setRecFilters(p => ({ ...p, reconciliationStatus: v === 'all' ? '' : v, page: 1 }))}>
                    <SelectTrigger><SelectValue placeholder={t('arReconciliation.allStatuses', 'All Statuses')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('arReconciliation.allStatuses', 'All Statuses')}</SelectItem>
                      <SelectItem value="pending">{t('arReconciliation.pending', 'Pending')}</SelectItem>
                      <SelectItem value="verified">{t('arReconciliation.verified', 'Verified')}</SelectItem>
                      <SelectItem value="discrepancy">{t('arReconciliation.discrepancy', 'Discrepancy')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={recFilters.startDate} onChange={(e) => setRecFilters(p => ({ ...p, startDate: e.target.value, page: 1 }))} placeholder={t('arReconciliation.startDate', 'Start Date')} />
                  <Input type="date" value={recFilters.endDate} onChange={(e) => setRecFilters(p => ({ ...p, endDate: e.target.value, page: 1 }))} placeholder={t('arReconciliation.endDate', 'End Date')} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('arReconciliation.transactions', 'Transactions')} ({recPagination.total} total)</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRec.transactions ? (
                  <div className="flex justify-center py-8"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('arReconciliation.date', 'Date')}</TableHead>
                          <TableHead>{t('arReconciliation.type', 'Type')}</TableHead>
                          <TableHead>{t('arReconciliation.reference', 'Reference')}</TableHead>
                          <TableHead>{t('arReconciliation.client', 'Client')}</TableHead>
                          <TableHead className="text-right">{t('arReconciliation.amount', 'Amount')}</TableHead>
                          <TableHead className="text-right">{t('arReconciliation.balance', 'Balance')}</TableHead>
                          <TableHead>{t('arReconciliation.status', 'Status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center py-8">{t('arReconciliation.noTransactions', 'No transactions found')}</TableCell></TableRow>
                        ) : (
                          transactions.map((tx) => (
                            <TableRow key={tx._id}>
                              <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                              <TableCell>{getTransactionTypeBadge(tx.transactionType)}</TableCell>
                              <TableCell>{tx.referenceNo || '-'}</TableCell>
                              <TableCell>{tx.client?.name || '-'}</TableCell>
                              <TableCell className="text-right">
                                <span className={tx.direction === 'increase' ? 'text-green-600' : 'text-red-600'}>
                                  {tx.direction === 'increase' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(tx.clientBalanceAfter)}</TableCell>
                              <TableCell>{getReconciliationStatusBadge(tx.reconciliationStatus)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    {recPagination.pages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-6">
                        <Button variant="outline" size="sm" disabled={recFilters.page === 1} onClick={() => setRecFilters(p => ({ ...p, page: p.page - 1 }))}>{t('common.previous', 'Previous')}</Button>
                        <span className="text-sm text-muted-foreground">{t('common.pageOf', 'Page {{page}} of {{pages}}', { page: recPagination.currentPage, pages: recPagination.pages })}</span>
                        <Button variant="outline" size="sm" disabled={recFilters.page >= recPagination.pages} onClick={() => setRecFilters(p => ({ ...p, page: p.page + 1 }))}>{t('common.next', 'Next')}</Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Verification Dialog */}
        <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('arReconciliation.integrityCheck', 'Data Integrity Check')}</DialogTitle>
            </DialogHeader>
            {verificationResult && (
              <div className="space-y-4">
                {verificationResult.verified ? (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <AlertTitle className="text-green-800">{t('arReconciliation.dataVerified', 'Data Verified')}</AlertTitle>
                    <AlertDescription className="text-green-700">{t('arReconciliation.noDiscrepancies', 'No discrepancies found.')}</AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>{t('arReconciliation.discrepanciesFound', 'Discrepancies Found')}</AlertTitle>
                    <AlertDescription>{t('arReconciliation.discrepancyCount', '{{count}} discrepancies found.', { count: verificationResult.discrepancies?.length || 0 })}</AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end gap-2">
                  {!verificationResult.verified && <Button onClick={() => { setIsVerifyDialogOpen(false); handleReconcile(); }}>{t('arReconciliation.reconcileNow', 'Reconcile Now')}</Button>}
                  <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)}>{t('common.close', 'Close')}</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
    </TooltipProvider>
  );
}