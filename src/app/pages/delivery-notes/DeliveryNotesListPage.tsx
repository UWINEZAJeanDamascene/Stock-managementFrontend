import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { deliveryNotesApi, clientsApi, quotationsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  Plus, 
  Search, 
  Download, 
  Loader2,
  FileText,
  Eye,
  Edit,
  Truck,
  XCircle,
  CheckCircle,
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

interface DeliveryNote {
  _id: string;
  referenceNo: string;
  quotation?: {
    _id: string;
    referenceNo: string;
  };
  client: {
    _id: string;
    name: string;
    code?: string;
  };
  deliveryDate: string;
  status: 'draft' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled';
  carrier?: string;
  trackingNumber?: string;
  deliveredBy?: string;
  vehicle?: string;
  deliveryAddress?: string;
  grandTotal: number;
  currencyCode: string;
  itemsCount: number;
  createdAt: string;
}

interface Client {
  _id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function DeliveryNotesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [quotationFilter, setQuotationFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  const fetchDeliveryNotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await deliveryNotesApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        clientId: clientFilter !== 'all' ? clientFilter : undefined,
        quotationId: quotationFilter !== 'all' ? quotationFilter : undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      });
      
      if (response.success && response.data) {
        const data = response.data as any;
        if (Array.isArray(data)) {
          setDeliveryNotes(data);
          setPagination(prev => ({ ...prev, total: data.length }));
        } else if (data.deliveryNotes) {
          setDeliveryNotes(data.deliveryNotes);
          setPagination(prev => ({ 
            ...prev, 
            total: data.total || data.deliveryNotes.length,
            page: data.page || 1 
          }));
        } else {
          setDeliveryNotes([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch delivery notes:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, clientFilter, quotationFilter, dateFrom, dateTo]);

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
    fetchDeliveryNotes();
  }, [fetchDeliveryNotes]);

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

  const handleQuotationFilter = (value: string) => {
    setQuotationFilter(value);
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
      draft: { variant: 'secondary', label: t('deliveryNote.status.draft', 'Draft') },
      confirmed: { variant: 'default', label: t('deliveryNote.status.confirmed', 'Confirmed') },
      dispatched: { variant: 'outline', label: t('deliveryNote.status.dispatched', 'Dispatched') },
      delivered: { variant: 'default', label: t('deliveryNote.status.delivered', 'Delivered') },
      cancelled: { variant: 'destructive', label: t('deliveryNote.status.cancelled', 'Cancelled') },
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
    setQuotationFilter('all');
    setDateFrom('');
    setDateTo('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExport = async () => {
    try {
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
            <h1 className="text-2xl font-bold">{t('deliveryNote.title', 'Delivery Notes')}</h1>
            <p className="text-muted-foreground">{t('deliveryNote.subtitle', 'Manage delivery notes')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.export', 'Export')}
            </Button>
            <Button onClick={() => navigate('/delivery-notes/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('deliveryNote.newDeliveryNote', 'New Delivery Note')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('deliveryNote.search', 'Search delivery notes...')}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('deliveryNote.filterStatus', 'Status')} />
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
                  <SelectValue placeholder={t('deliveryNote.filterClient', 'Client')} />
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
                placeholder={t('deliveryNote.dateFrom', 'From')}
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                placeholder={t('deliveryNote.dateTo', 'To')}
              />
            </div>
            {(search || statusFilter !== 'all' || clientFilter !== 'all' || quotationFilter !== 'all' || dateFrom || dateTo) && (
              <div className="mt-4">
                <Button variant="ghost" onClick={clearFilters}>
                  {t('deliveryNote.clearFilters', 'Clear Filters')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Notes Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : deliveryNotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">{t('deliveryNote.noDeliveryNotes', 'No delivery notes found')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('deliveryNote.noDeliveryNotesDescription', 'Create your first delivery note to get started')}
                </p>
                <Button onClick={() => navigate('/delivery-notes/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('deliveryNote.newDeliveryNote', 'New Delivery Note')}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('deliveryNote.reference', 'Reference')}</TableHead>
                    <TableHead>{t('deliveryNote.quotation', 'Quotation')}</TableHead>
                    <TableHead>{t('deliveryNote.client', 'Client')}</TableHead>
                    <TableHead>{t('deliveryNote.deliveryDate', 'Delivery Date')}</TableHead>
                    <TableHead>{t('deliveryNote.status', 'Status')}</TableHead>
                    <TableHead>{t('deliveryNote.carrier', 'Carrier')}</TableHead>
                    <TableHead>{t('deliveryNote.tracking', 'Tracking')}</TableHead>
                    <TableHead className="text-right">{t('deliveryNote.total', 'Total')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryNotes.map((dn) => (
                    <TableRow key={dn._id}>
                      <TableCell className="font-medium">
                        {dn.referenceNo}
                      </TableCell>
                      <TableCell>{dn.quotation?.referenceNo || '-'}</TableCell>
                      <TableCell>{dn.client?.name || '-'}</TableCell>
                      <TableCell>{formatDate(dn.deliveryDate)}</TableCell>
                      <TableCell>{getStatusBadge(dn.status)}</TableCell>
                      <TableCell>{dn.carrier || '-'}</TableCell>
                      <TableCell>{dn.trackingNumber || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(dn.grandTotal, dn.currencyCode)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/delivery-notes/${dn._id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('common.view', 'View')}
                            </DropdownMenuItem>
                            {dn.status === 'draft' && (
                              <DropdownMenuItem onClick={() => navigate(`/delivery-notes/${dn._id}/edit`)}>
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