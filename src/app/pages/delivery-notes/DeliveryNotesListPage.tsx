import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { deliveryNotesApi, clientsApi, quotationsApi, invoicesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  Plus, 
  Search, 
  Download, 
  Loader2,
  FileText,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Truck,
  XCircle,
  FilePlus
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { toast } from "sonner";
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
        let notes: any[] = [];
        
        if (Array.isArray(data)) {
          notes = data;
        } else if (Array.isArray(data.data)) {
          notes = data.data;
        } else if (data.data && Array.isArray(data.data.deliveryNotes)) {
          notes = data.data.deliveryNotes;
        } else {
          notes = [];
        }
        
        setDeliveryNotes(notes);
        
        if (Array.isArray(data)) {
          setPagination(prev => ({ ...prev, total: data.length }));
        } else if (Array.isArray(data.data)) {
          setPagination(prev => ({ 
            ...prev, 
            total: data.total || data.data.length,
          }));
        } else if (data.data && Array.isArray(data.data.deliveryNotes)) {
          setPagination(prev => ({ 
            ...prev, 
            total: data.total || data.data.deliveryNotes.length,
          }));
        }
      } else {
        setDeliveryNotes([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch delivery notes:', error);
      setDeliveryNotes([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, clientFilter, quotationFilter, dateFrom, dateTo, search]);

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
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string; className?: string }> = {
      draft: { variant: 'secondary', label: t('deliveryNote.status.draft', 'Draft'), className: 'dark:bg-slate-700 dark:text-gray-200' },
      confirmed: { variant: 'default', label: t('deliveryNote.status.confirmed', 'Confirmed'), className: 'dark:bg-blue-900 dark:text-blue-200' },
      dispatched: { variant: 'outline', label: t('deliveryNote.status.dispatched', 'Dispatched'), className: 'dark:text-yellow-300 dark:border-yellow-600' },
      delivered: { variant: 'default', label: t('deliveryNote.status.delivered', 'Delivered'), className: 'dark:bg-green-900 dark:text-green-200' },
      cancelled: { variant: 'destructive', label: t('deliveryNote.status.cancelled', 'Cancelled'), className: 'dark:bg-red-900 dark:text-red-200' },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status, className: 'dark:text-gray-300 dark:border-gray-600' };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
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

  const handleDelete = async (id: string) => {
    if (!confirm(t('deliveryNote.confirmDelete', 'Are you sure you want to delete this delivery note?'))) return;
    try {
      const response = await deliveryNotesApi.delete(id);
      if (response.success) {
        toast.success(t('deliveryNote.deleted', 'Delivery note deleted'));
        fetchDeliveryNotes();
      } else {
        toast.error(response.message || t('deliveryNote.deleteFailed', 'Failed to delete'));
      }
    } catch (error) {
      toast.error(t('deliveryNote.deleteFailed', 'Failed to delete delivery note'));
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      console.log('=== CONFIRM WORKFLOW START ===');
      console.log('Delivery Note ID:', id);
      
      // Step 1: Create invoice from delivery note first
      toast.info('Creating invoice from delivery note...');
      console.log('Step 1: Calling deliveryNotesApi.createInvoice...');
      const createResponse = await deliveryNotesApi.createInvoice(id, {
        confirmDelivery: true  // Also confirm the delivery note in one call
      });
      console.log('Step 1 - createInvoice response:', createResponse);
      
      if (!createResponse.success) {
        console.error('Step 1 FAILED:', createResponse);
        toast.error((createResponse as any).message || 'Failed to create invoice');
        return;
      }
      
      const invoiceId = (createResponse.data as any)?._id;
      console.log('Invoice ID from response:', invoiceId);
      
      if (!invoiceId) {
        toast.error('Invoice created but no ID returned');
        return;
      }
      
      toast.success('Invoice created successfully');

      // Step 2: Confirm the invoice
      toast.info('Confirming invoice...');
      console.log('Step 2: Calling invoicesApi.confirm for:', invoiceId);
      const confirmInvoiceResponse = await invoicesApi.confirm(invoiceId);
      console.log('Step 2 - confirmInvoice response:', confirmInvoiceResponse);
      
      if (!confirmInvoiceResponse.success) {
        console.error('Step 2 FAILED:', confirmInvoiceResponse);
        toast.error((confirmInvoiceResponse as any).message || 'Failed to confirm invoice');
        return;
      }
      toast.success('Invoice confirmed');

      // Step 3: Refresh the list to show updated status
      console.log('Step 3: Refreshing delivery notes list...');
      await fetchDeliveryNotes();
      console.log('=== CONFIRM WORKFLOW COMPLETE ===');
      toast.success('Delivery note confirmed successfully');
    } catch (error: any) {
      console.error('=== CONFIRM WORKFLOW ERROR ===');
      console.error('Error:', error);
      console.error('Error response:', error?.response?.data);
      console.error('Error message:', error?.message);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to confirm delivery note');
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      const response = await deliveryNotesApi.dispatch(id, {});
      if (response.success) {
        toast.success(t('deliveryNote.dispatched', 'Delivery note dispatched'));
        fetchDeliveryNotes();
      } else {
        toast.error((response as any).message || t('deliveryNote.dispatchFailed', 'Failed to dispatch'));
      }
    } catch (error) {
      toast.error(t('deliveryNote.dispatchFailed', 'Failed to dispatch delivery note'));
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm(t('deliveryNote.confirmCancel', 'Are you sure you want to cancel this delivery note?'))) return;
    try {
      const response = await deliveryNotesApi.cancel(id);
      if (response.success) {
        toast.success(t('deliveryNote.cancelled', 'Delivery note cancelled'));
        fetchDeliveryNotes();
      } else {
        toast.error((response as any).message || t('deliveryNote.cancelFailed', 'Failed to cancel'));
      }
    } catch (error) {
      toast.error(t('deliveryNote.cancelFailed', 'Failed to cancel delivery note'));
    }
  };

  const handleCreateInvoice = async (id: string) => {
    try {
      const response = await deliveryNotesApi.createInvoice(id);
      if (response.success) {
        toast.success(t('deliveryNote.invoiceCreated', 'Invoice created successfully'));
        fetchDeliveryNotes();
      } else {
        toast.error((response as any).message || t('deliveryNote.invoiceFailed', 'Failed to create invoice'));
      }
    } catch (error) {
      toast.error(t('deliveryNote.invoiceFailed', 'Failed to create invoice'));
    }
  };

  const handleExport = async () => {
    try {
      alert(t('common.comingSoon', 'Coming soon'));
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  // Client-side filtering for search
  const filteredDeliveryNotes = useMemo(() => {
    if (!search) return deliveryNotes;
    const searchLower = search.toLowerCase();
    return deliveryNotes.filter(dn => 
      dn.referenceNo?.toLowerCase().includes(searchLower) ||
      dn.client?.name?.toLowerCase().includes(searchLower) ||
      dn.quotation?.referenceNo?.toLowerCase().includes(searchLower) ||
      dn.carrier?.toLowerCase().includes(searchLower)
    );
  }, [deliveryNotes, search]);

  return (
    <Layout>
      <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold dark:text-white">{t('deliveryNote.title', 'Delivery Notes')}</h1>
            <p className="text-sm text-muted-foreground dark:text-gray-400">{t('deliveryNote.subtitle', 'Manage delivery notes')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-none justify-center">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('common.export', 'Export')}</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <Button size="sm" onClick={() => navigate('/delivery-notes/new')} className="flex-1 sm:flex-none justify-center">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('deliveryNote.newDeliveryNote', 'New Delivery Note')}</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('deliveryNote.search', 'Search delivery notes...')}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectValue placeholder={t('deliveryNote.filterStatus', 'Status')} />
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
                <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectValue placeholder={t('deliveryNote.filterClient', 'Client')} />
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
                placeholder={t('deliveryNote.dateFrom', 'From')}
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                placeholder={t('deliveryNote.dateTo', 'To')}
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
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
        <Card className="dark:bg-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredDeliveryNotes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium dark:text-white">{t('deliveryNote.noDeliveryNotes', 'No delivery notes found')}</h3>
                <p className="text-muted-foreground dark:text-gray-400 mb-4">
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
                  <TableRow className="dark:hover:bg-slate-700">
                    <TableHead className="dark:text-gray-300">{t('deliveryNote.reference', 'Reference')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('deliveryNote.quotation', 'Quotation')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('deliveryNote.client', 'Client')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('deliveryNote.deliveryDate', 'Delivery Date')}</TableHead>
                    <TableHead className="dark:text-gray-300">Status</TableHead>
                    <TableHead className="dark:text-gray-300">{t('deliveryNote.carrier', 'Carrier')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('deliveryNote.tracking', 'Tracking')}</TableHead>
                    <TableHead className="text-right dark:text-gray-300">{t('deliveryNote.total', 'Total')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveryNotes.map((dn) => (
                    <TableRow key={dn._id} className="dark:hover:bg-slate-700">
                      <TableCell className="font-medium dark:text-white">
                        {dn.referenceNo}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">{dn.quotation?.referenceNo || '-'}</TableCell>
                      <TableCell className="dark:text-gray-300">{dn.client?.name || '-'}</TableCell>
                      <TableCell className="dark:text-gray-300">{formatDate(dn.deliveryDate)}</TableCell>
                      <TableCell>{getStatusBadge(dn.status)}</TableCell>
                      <TableCell className="dark:text-gray-300">{dn.carrier || '-'}</TableCell>
                      <TableCell className="dark:text-gray-300">{dn.trackingNumber || '-'}</TableCell>
                      <TableCell className="text-right font-medium dark:text-white">
                        {formatCurrency(dn.grandTotal, dn.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(`/delivery-notes/${dn._id}`)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {dn.status === 'draft' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigate(`/delivery-notes/${dn._id}/edit`)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleConfirm(dn._id)}
                                title="Confirm"
                                className="text-blue-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDelete(dn._id)}
                                title="Delete"
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {dn.status === 'confirmed' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDispatch(dn._id)}
                                title="Dispatch"
                                className="text-yellow-600"
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCancel(dn._id)}
                                title="Cancel"
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          {dn.status === 'delivered' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCreateInvoice(dn._id)}
                              title="Create Invoice"
                              className="text-green-600"
                            >
                              <FilePlus className="h-4 w-4" />
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