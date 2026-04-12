import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { quotationsApi, clientsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  Plus, 
  Search,
  Eye,
  Pencil,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowRight
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
import { Badge } from '@/app/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface Quotation {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
    code?: string;
  };
  quotationDate: string;
  expiryDate: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  totalAmount: number;
  currency: string;
  convertedToInvoice?: string;
}

interface Client {
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

export default function QuotationsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  
  // Filters
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientsApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        const clientData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as unknown[]);
        setClients(clientData as Client[]);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  }, []);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      console.log('[QuotationsListPage] Fetching quotations with params:', { statusFilter, clientFilter, dateFrom, dateTo, page, search });
      
      const params: any = {
        page,
        limit: 20,
      };
      
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (clientFilter && clientFilter !== 'all') params.clientId = clientFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      if (search) params.search = search;
      
      const response = await quotationsApi.getAll(params);
      console.log('[QuotationsListPage] Quotations response:', response);
      
       if (response.success) {
         const quotationData = Array.isArray(response.data) 
           ? response.data 
           : (response.data as unknown[]);
         setQuotations(quotationData as Quotation[]);
         
         // Handle pagination if response has it
         const responseWithPagination = response as unknown as { 
           pages?: number; 
           currentPage?: number; 
           total?: number 
         };
         if (responseWithPagination.pages !== undefined) {
           setPagination({
             currentPage: responseWithPagination.currentPage || 1,
             totalPages: responseWithPagination.pages || 1,
             total: responseWithPagination.total || 0,
             limit: 20
           });
         }
       }
    } catch (error) {
      console.error('[QuotationsListPage] Failed to fetch quotations:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, clientFilter, dateFrom, dateTo, search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSend = async (id: string) => {
    try {
      await quotationsApi.send(id);
      fetchQuotations();
    } catch (error) {
      console.error('Failed to send quotation:', error);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await quotationsApi.accept(id);
      fetchQuotations();
    } catch (error) {
      console.error('Failed to accept quotation:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await quotationsApi.reject(id);
      fetchQuotations();
    } catch (error) {
      console.error('Failed to reject quotation:', error);
    }
  };

  const handleConvert = async (id: string) => {
    try {
      await quotationsApi.convertToInvoice(id, {});
      fetchQuotations();
    } catch (error) {
      console.error('Failed to convert quotation:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success'; label: string }> = {
      draft: { variant: 'secondary', label: t('quotation.status.draft', 'Draft') },
      sent: { variant: 'default', label: t('quotation.status.sent', 'Sent') },
      accepted: { variant: 'success', label: t('quotation.status.accepted', 'Accepted') },
      rejected: { variant: 'destructive', label: t('quotation.status.rejected', 'Rejected') },
      expired: { variant: 'outline', label: t('quotation.status.expired', 'Expired') },
      converted: { variant: 'success', label: t('quotation.status.converted', 'Converted') },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('quotation.title', 'Quotations')}</h1>
            <p className="text-muted-foreground dark:text-slate-400">{t('quotation.description', 'Manage quotations')}</p>
          </div>
          <Button onClick={() => navigate('/quotations/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('quotation.newQuotation', 'New Quotation')}
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-card dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-slate-900 dark:text-white">{t('quotation.statusLabel', 'Status')}</label>
              <Select value={statusFilter || 'all'} onValueChange={(value) => { setStatusFilter(value === 'all' ? '' : value); setPage(1); }}>
                <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                  <SelectValue placeholder={t('quotation.allStatuses', 'All Statuses')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="dark:text-slate-200">{t('quotation.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="draft" className="dark:text-slate-200">{t('quotation.status.draft', 'Draft')}</SelectItem>
                  <SelectItem value="sent" className="dark:text-slate-200">{t('quotation.status.sent', 'Sent')}</SelectItem>
                  <SelectItem value="accepted" className="dark:text-slate-200">{t('quotation.status.accepted', 'Accepted')}</SelectItem>
                  <SelectItem value="rejected" className="dark:text-slate-200">{t('quotation.status.rejected', 'Rejected')}</SelectItem>
                  <SelectItem value="expired" className="dark:text-slate-200">{t('quotation.status.expired', 'Expired')}</SelectItem>
                  <SelectItem value="converted" className="dark:text-slate-200">{t('quotation.status.converted', 'Converted')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-slate-900 dark:text-white">{t('quotation.client', 'Client')}</label>
              <Select value={clientFilter || 'all'} onValueChange={(value) => { setClientFilter(value === 'all' ? '' : value); setPage(1); }}>
                <SelectTrigger className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600">
                  <SelectValue placeholder={t('quotation.allClients', 'All Clients')} />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="dark:text-slate-200">{t('quotation.allClients', 'All Clients')}</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client._id} value={client._id} className="dark:text-slate-200">
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-slate-900 dark:text-white">{t('quotation.dateFrom', 'Date From')}</label>
              <Input 
                type="date" 
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-slate-900 dark:text-white">{t('quotation.dateTo', 'Date To')}</label>
              <Input 
                type="date" 
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-slate-900 dark:text-white">{t('quotation.search', 'Search')}</label>
              <form onSubmit={handleSearch}>
                <div className="flex gap-2">
                  <Input 
                    placeholder={t('quotation.searchPlaceholder', 'Search...')}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600"
                  />
                  <Button type="submit" variant="secondary" size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="dark:bg-slate-700">
                  <TableHead className="dark:text-white">{t('quotation.reference', 'Reference')}</TableHead>
                  <TableHead className="dark:text-white">{t('quotation.client', 'Client')}</TableHead>
                  <TableHead className="dark:text-white">{t('quotation.date', 'Date')}</TableHead>
                  <TableHead className="dark:text-white">{t('quotation.expiryDate', 'Expiry Date')}</TableHead>
                  <TableHead className="dark:text-white">{t('quotation.statusLabel', 'Status')}</TableHead>
                  <TableHead className="text-right dark:text-white">{t('quotation.total', 'Total')}</TableHead>
                  <TableHead className="dark:text-white">{t('quotation.convertedTo', 'Converted To')}</TableHead>
                  <TableHead className="text-right dark:text-white">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground dark:text-slate-400">
                      {t('quotation.noQuotations', 'No quotations found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  quotations.map((quotation) => (
                    <TableRow key={quotation._id} className="dark:hover:bg-slate-700/50">
                      <TableCell className="font-medium dark:text-slate-200">
                        <FileText className="inline-block mr-2 h-4 w-4" />
                        {quotation.referenceNo || 'N/A'}
                      </TableCell>
                      <TableCell className="dark:text-slate-300">{quotation.client?.name || '-'}</TableCell>
                      <TableCell className="dark:text-slate-300">{formatDate(quotation.quotationDate)}</TableCell>
                      <TableCell className="dark:text-slate-300">{formatDate(quotation.expiryDate)}</TableCell>
                      <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                       <TableCell className="text-right font-medium dark:text-slate-200">
                         {formatCurrency(quotation.totalAmount, quotation.currency)}
                       </TableCell>
                      <TableCell>
                        {quotation.convertedToInvoice ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="text-green-600 dark:text-green-400 p-0 h-auto"
                            onClick={() => navigate(`/invoices/${quotation.convertedToInvoice}`)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            View Invoice
                          </Button>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/quotations/${quotation._id}?view=true`)}
                            title={t('common.view', 'View')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {quotation.status === 'draft' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/quotations/${quotation._id}/edit`)}
                              title={t('common.edit', 'Edit')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {quotation.status === 'draft' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleSend(quotation._id)}
                              title={t('quotation.send', 'Send')}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {quotation.status === 'sent' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleAccept(quotation._id)}
                                title={t('quotation.accept', 'Accept')}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleReject(quotation._id)}
                                title={t('quotation.reject', 'Reject')}
                              >
                                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </Button>
                            </>
                          )}
                          {(quotation.status === 'accepted' || quotation.status === 'sent') && !quotation.convertedToInvoice && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleConvert(quotation._id)}
                              title={t('quotation.convertToInvoice', 'Convert to Invoice')}
                            >
                              <ArrowRight className="h-4 w-4" />
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
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={pagination.currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${pagination.currentPage === i + 1 ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : ''}`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${pagination.currentPage === pagination.totalPages ? 'pointer-events-none opacity-50' : ''}`}
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