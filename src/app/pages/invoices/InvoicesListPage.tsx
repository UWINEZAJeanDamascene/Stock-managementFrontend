import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { invoicesApi, clientsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  Plus, 
  Search, 
  Download, 
  Loader2,
  FileText,
  Eye,
  Edit,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
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
import { useTranslation } from 'react-i18next';

interface Invoice {
  _id: string;
  referenceNo: string;
  invoiceNumber?: string;
  quotation?: {
    _id: string;
    referenceNo: string;
  };
  client: {
    _id: string;
    name: string;
    code?: string;
  };
  invoiceDate: string;
  dueDate: string;
  status: 'draft' | 'confirmed' | 'partially_paid' | 'fully_paid' | 'cancelled' | 'partial' | 'paid';
  currencyCode: string;
  grandTotal: number;
  amountPaid: number;
  balance: number;
}

interface Client {
  _id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'fully_paid', label: 'Fully Paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function InvoicesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await invoicesApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        clientId: clientFilter !== 'all' ? clientFilter : undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
        search: search || undefined,
      });
      
      if (response.success && response.data) {
        const data = response.data as any;
        console.log('Response data structure:', data);
        
        // Backend returns { success, count, total, pages, currentPage, data: [...invoices] }
        // So response.data is the object containing the invoices array
        const invoicesData = Array.isArray(data) ? data : (data.data || []);
        
        console.log('Extracted invoices:', invoicesData);
        console.log('Invoices count:', invoicesData?.length || 0);
        if (Array.isArray(invoicesData)) {
          setInvoices(invoicesData);
          setPagination(prev => ({ ...prev, total: data.total || invoicesData.length }));
        } else {
          setInvoices([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, clientFilter, dateFrom, dateTo, search]);

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientsApi.getAll({ limit: 100 });
      if (response.success && response.data) {
        const clientData = Array.isArray(response.data)
          ? response.data
          : (response.data as any[]);
        setClients(clientData as Client[]);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    
    // Debug: Check stored companyId and test API directly
    const storedCompanyId = localStorage.getItem('companyId');
    console.log('Stored companyId:', storedCompanyId);
    
    // Test API call with no filters
    invoicesApi.getAll({ limit: 100 }).then(response => {
      console.log('Direct API test - full response:', response);
      console.log('Direct API test - data:', response.data);
      const data = response.data as any;
      if (data?.data) {
        console.log('Direct API test - invoices count:', data.data.length);
        console.log('Direct API test - first invoice:', data.data[0]);
      }
    }).catch(err => {
      console.error('Direct API test failed:', err);
    });
  }, [fetchClients]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClientFilter = (value: string) => {
    setClientFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: t('invoice.status.draft', 'Draft') },
      confirmed: { variant: 'default', label: t('invoice.status.confirmed', 'Confirmed') },
      partially_paid: { variant: 'outline', label: t('invoice.status.partially_paid', 'Partially Paid') },
      partial: { variant: 'outline', label: t('invoice.status.partially_paid', 'Partially Paid') },
      fully_paid: { variant: 'default', label: t('invoice.status.fully_paid', 'Fully Paid') },
      paid: { variant: 'default', label: t('invoice.status.fully_paid', 'Paid') },
      cancelled: { variant: 'destructive', label: t('invoice.status.cancelled', 'Cancelled') },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setClientFilter('all');
    setDateFrom('');
    setDateTo('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExport = async () => {
    try {
      // Export functionality would be implemented here
      alert(t('common.comingSoon', 'Coming soon'));
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-gray-100">{t('invoice.title', 'Invoices')}</h1>
            <p className="text-muted-foreground dark:text-gray-400">{t('invoice.subtitle', 'Manage customer invoices')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.export', 'Export')}
            </Button>
            <Button onClick={() => navigate('/invoices/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('invoice.newInvoice', 'New Invoice')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('invoice.search', 'Search invoices...')}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder={t('invoice.filterStatus', 'Status')} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value} className="dark:text-gray-200">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={handleClientFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder={t('invoice.filterClient', 'Client')} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="all" className="dark:text-gray-200">{t('common.all', 'All Clients')}</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client._id} value={client._id} className="dark:text-gray-200">
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                placeholder={t('invoice.dateFrom', 'From')}
                className="dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                placeholder={t('invoice.dateTo', 'To')}
              />
            </div>
            {(search || statusFilter !== 'all' || clientFilter !== 'all' || dateFrom || dateTo) && (
              <div className="mt-4">
                <Button variant="ghost" onClick={clearFilters}>
                  {t('invoice.clearFilters', 'Clear Filters')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card className="dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12 dark:bg-slate-800">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4 dark:text-gray-400" />
                <h3 className="text-lg font-medium dark:text-gray-200">{t('invoice.noInvoices', 'No invoices found')}</h3>
                <p className="text-muted-foreground mb-4 dark:text-gray-400">
                  {t('invoice.noInvoicesDescription', 'Create your first invoice to get started')}
                </p>
                <Button onClick={() => navigate('/invoices/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('invoice.newInvoice', 'New Invoice')}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="dark:bg-slate-800">
                  <TableRow className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.invoiceNumber', 'Invoice #')}</TableHead>
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.client', 'Client')}</TableHead>
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.invoiceDate', 'Date')}</TableHead>
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.dueDate', 'Due Date')}</TableHead>
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.status', 'Status')}</TableHead>
                    <TableHead className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.total', 'Total')}</TableHead>
                    <TableHead className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.balance', 'Balance')}</TableHead>
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('invoice.source', 'Source')}</TableHead>
                    <TableHead className="text-right dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('common.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="dark:bg-slate-800">
                  {invoices.map((invoice) => (
                    <TableRow key={invoice._id} className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                      <TableCell className="font-medium dark:text-gray-200 dark:bg-slate-800">
                        {invoice.referenceNo || invoice.invoiceNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="dark:text-gray-300 dark:bg-slate-800">{invoice.client?.name || '-'}</TableCell>
                      <TableCell className="dark:text-gray-300 dark:bg-slate-800">{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell className="dark:text-gray-300 dark:bg-slate-800">{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell className="dark:bg-slate-800">{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right font-medium dark:text-gray-200 dark:bg-slate-800">
                        {formatCurrency(invoice.grandTotal, invoice.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right dark:text-gray-300 dark:bg-slate-800">
                        {formatCurrency(invoice.balance || (invoice.grandTotal - invoice.amountPaid), invoice.currencyCode)}
                      </TableCell>
                      <TableCell className="dark:bg-slate-800">
                        {invoice.quotation ? (
                          <span className="text-sm text-muted-foreground dark:text-gray-400">{invoice.quotation.referenceNo}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground dark:text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right dark:bg-slate-800">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-slate-700"
                            onClick={() => navigate(`/invoices/${invoice._id}`)}
                            title={t('common.view', 'View')}
                          >
                            <Eye className="h-4 w-4 dark:text-gray-300" />
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-slate-700"
                              onClick={() => navigate(`/invoices/${invoice._id}/edit`)}
                              title={t('common.edit', 'Edit')}
                            >
                              <Edit className="h-4 w-4 dark:text-gray-300" />
                            </Button>
                          )}
                          {invoice.status === 'draft' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-slate-700 text-green-600"
                              onClick={async () => {
                                try {
                                  await invoicesApi.confirm(invoice._id);
                                  fetchInvoices();
                                } catch (error) {
                                  console.error('Failed to confirm invoice:', error);
                                }
                              }}
                              title={t('invoice.confirm', 'Confirm')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}