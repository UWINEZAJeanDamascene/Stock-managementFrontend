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
  MoreHorizontal
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
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
        if (Array.isArray(data)) {
          setInvoices(data);
          setPagination(prev => ({ ...prev, total: data.length }));
        } else if (data.invoices) {
          setInvoices(data.invoices);
          setPagination(prev => ({ 
            ...prev, 
            total: data.total || data.invoices.length,
            page: data.page || 1 
          }));
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
            <h1 className="text-2xl font-bold">{t('invoice.title', 'Invoices')}</h1>
            <p className="text-muted-foreground">{t('invoice.subtitle', 'Manage customer invoices')}</p>
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
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('invoice.search', 'Search invoices...')}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('invoice.filterStatus', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={handleClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('invoice.filterClient', 'Client')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all', 'All Clients')}</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client._id} value={client._id}>
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
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">{t('invoice.noInvoices', 'No invoices found')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('invoice.noInvoicesDescription', 'Create your first invoice to get started')}
                </p>
                <Button onClick={() => navigate('/invoices/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('invoice.newInvoice', 'New Invoice')}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invoice.invoiceNumber', 'Invoice #')}</TableHead>
                    <TableHead>{t('invoice.client', 'Client')}</TableHead>
                    <TableHead>{t('invoice.invoiceDate', 'Date')}</TableHead>
                    <TableHead>{t('invoice.dueDate', 'Due Date')}</TableHead>
                    <TableHead>{t('invoice.status', 'Status')}</TableHead>
                    <TableHead className="text-right">{t('invoice.total', 'Total')}</TableHead>
                    <TableHead className="text-right">{t('invoice.balance', 'Balance')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice._id}>
                      <TableCell className="font-medium">
                        {invoice.referenceNo || invoice.invoiceNumber || 'N/A'}
                      </TableCell>
                      <TableCell>{invoice.client?.name || '-'}</TableCell>
                      <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.grandTotal, invoice.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.balance || (invoice.grandTotal - invoice.amountPaid), invoice.currencyCode)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice._id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('common.view', 'View')}
                            </DropdownMenuItem>
                            {invoice.status === 'draft' && (
                              <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice._id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                {t('common.edit', 'Edit')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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