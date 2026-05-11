import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { deliveryNotesApi, clientsApi, invoicesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Search,
  Download,
  FileText,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Truck,
  XCircle,
  FilePlus,
  TrendingUp,
  BarChart3,
  Layers,
  Filter,
  RefreshCw,
  Package,
  Clock,
  CalendarDays,
  User,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { toast } from 'sonner';
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
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/contexts/CurrencyContext';

interface DeliveryNote {
  _id: string;
  referenceNo: string;
  quotation?: {
    _id: string;
    referenceNo: string;
  };
  salesOrder?: {
    _id: string;
    referenceNo: string;
    quotation?: {
      _id: string;
      referenceNo: string;
    };
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

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-700',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    dispatched: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    cancelled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  };

  const getStatusBadge = (status: string) => (
    <Badge variant="outline" className={`${STATUS_COLORS[status] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/40 dark:text-slate-300 dark:border-slate-700'} capitalize text-xs`}>
      {status}
    </Badge>
  );

  const { formatCurrency } = useCurrency();

  const toNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object' && '$numberDecimal' in val) return parseFloat(val.$numberDecimal);
    return parseFloat(String(val)) || 0;
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

  const totalValue = filteredDeliveryNotes.reduce((sum, dn) => sum + toNumber(dn.grandTotal), 0);
  const dispatchedCount = filteredDeliveryNotes.filter((dn) => dn.status === 'dispatched').length;
  const draftCount = filteredDeliveryNotes.filter((dn) => dn.status === 'draft').length;
  const deliveredCount = filteredDeliveryNotes.filter((dn) => dn.status === 'delivered').length;

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px] xl:items-stretch">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg bg-orange-50 p-2.5 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/60">
                    <Truck className="h-5 w-5" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                    {t('deliveryNote.title', 'Delivery Notes')}
                  </h1>
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {t('deliveryNote.subtitle', 'Manage deliveries from dispatch through to client receipt.')}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                    <BarChart3 className="mr-1 h-3 w-3" />
                    {pagination.total || filteredDeliveryNotes.length} total
                  </Badge>
                  <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                    <Package className="mr-1 h-3 w-3" />
                    {dispatchedCount} dispatched
                  </Badge>
                  <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {deliveredCount} delivered
                  </Badge>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    onClick={() => navigate('/delivery-notes/new')}
                    className="h-10 gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                  >
                    <Plus className="h-4 w-4" />
                    {t('deliveryNote.newDeliveryNote', 'New Delivery Note')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchDeliveryNotes}
                    className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport} className="h-10 gap-2 dark:border-slate-700 dark:text-slate-200">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Notes</p>
                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{filteredDeliveryNotes.length}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Value</p>
                  <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{formatCurrency(totalValue)}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Dispatched</p>
                  <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">{dispatchedCount}</p>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Delivered</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{deliveredCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline / Status Flow */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex min-w-[700px] items-center justify-between gap-2">
              {['draft', 'confirmed', 'dispatched', 'delivered', 'cancelled'].map((s, i, arr) => {
                const count = filteredDeliveryNotes.filter((dn) => dn.status === s).length;
                const isLast = i === arr.length - 1;
                return (
                  <>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ring-2 ${
                          count > 0
                            ? 'bg-indigo-600 text-white ring-indigo-200 dark:bg-indigo-500 dark:ring-indigo-900'
                            : 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700'
                        }`}
                      >
                        {count}
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {s}
                      </span>
                    </div>
                    {!isLast && (
                      <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                    )}
                  </>
                );
              })}
            </div>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              <>
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </>
            ) : (
              <>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Notes</p>
                        <p className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{filteredDeliveryNotes.length}</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60">
                        <Layers className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{pagination.total || filteredDeliveryNotes.length} across all pages</p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total Value</p>
                        <p className="mt-3 truncate text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(totalValue)}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Combined delivery value</p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dispatched</p>
                        <p className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400">{dispatchedCount}</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60">
                        <Truck className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">In transit to client</p>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Delivered</p>
                        <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{deliveredCount}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Received by client</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Filters */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search by reference or client..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="bg-slate-50 pl-9 ring-1 ring-slate-200 placeholder:text-slate-400 dark:bg-slate-900 dark:ring-slate-700 dark:placeholder:text-slate-500"
                  />
                </div>
                <Select value={statusFilter} onValueChange={handleStatusFilter}>
                  <SelectTrigger className="bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                    <Filter className="mr-2 h-4 w-4 text-slate-500" />
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="dark:text-slate-200">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={clientFilter} onValueChange={handleClientFilter}>
                  <SelectTrigger className="bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                    <User className="mr-2 h-4 w-4 text-slate-500" />
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                    <SelectItem value="all" className="dark:text-slate-200">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client._id} value={client._id} className="dark:text-slate-200">
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="bg-slate-50 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
                />
                {(search || statusFilter !== 'all' || clientFilter !== 'all' || dateFrom || dateTo) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-600 dark:text-slate-300">
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Notes Table */}
          <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))}
                </div>
              ) : filteredDeliveryNotes.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center p-8">
                  <Truck className="mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No delivery notes found</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Create your first delivery note to get started.
                  </p>
                  <Button
                    onClick={() => navigate('/delivery-notes/new')}
                    className="mt-4 gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                  >
                    <Plus className="h-4 w-4" />
                    New Delivery Note
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-900/50 dark:hover:bg-slate-900/50">
                        <TableHead className="text-slate-600 dark:text-slate-400">Reference</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Client</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Delivery Date</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-600 dark:text-slate-400">Carrier</TableHead>
                        <TableHead className="text-right text-slate-600 dark:text-slate-400">Total</TableHead>
                        <TableHead className="text-right text-slate-600 dark:text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeliveryNotes.map((dn) => (
                        <TableRow
                          key={dn._id}
                          className="transition-colors hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/30"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-700 ring-1 ring-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900/60">
                                <Truck className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium text-slate-950 dark:text-white">{dn.referenceNo}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {dn.quotation?.referenceNo || dn.salesOrder?.quotation?.referenceNo || 'No quotation'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-700 dark:text-slate-300">{dn.client?.name || '—'}</TableCell>
                          <TableCell className="text-sm text-slate-700 dark:text-slate-300">{formatDate(dn.deliveryDate)}</TableCell>
                          <TableCell>{getStatusBadge(dn.status)}</TableCell>
                          <TableCell className="text-sm text-slate-700 dark:text-slate-300">{dn.carrier || '—'}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-slate-950 dark:text-white">
                            {formatCurrency(toNumber(dn.grandTotal))}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/delivery-notes/${dn._id}`)}
                                title="View"
                                className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
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
                                    className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleConfirm(dn._id)}
                                    title="Confirm"
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(dn._id)}
                                    title="Delete"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
                                    className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                                  >
                                    <Truck className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancel(dn._id)}
                                    title="Cancel"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
                                  className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {!loading && filteredDeliveryNotes.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {filteredDeliveryNotes.length} of {pagination.total || filteredDeliveryNotes.length} delivery notes
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="dark:border-slate-700 dark:text-slate-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center px-2 text-sm text-slate-600 dark:text-slate-400">
                  Page {pagination.page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={filteredDeliveryNotes.length < pagination.limit}
                  className="dark:border-slate-700 dark:text-slate-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}