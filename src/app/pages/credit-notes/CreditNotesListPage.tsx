import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { creditNotesApi, clientsApi, invoicesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { useCompany } from '@/hooks/useCompany';
import {
  Plus,
  Search,
  Download,
  FileText,
  Eye,
  Edit,
  X,
  CheckCircle,
  Trash2,
  Receipt,
  TrendingUp,
  Wallet,
  RotateCcw,
  Ban,
} from 'lucide-react';
import { Skeleton } from '@/app/components/ui/skeleton';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';

interface CreditNote {
  _id: string;
  referenceNo: string;
  creditNoteNumber?: string;
  creditDate: string;
  type: 'goods_return' | 'price_adjustment' | 'cancelled_order';
  status: 'draft' | 'confirmed' | 'cancelled' | 'issued' | 'applied' | 'refunded';
  currencyCode: string;
  totalAmount: number;
  grandTotal?: number;
  invoice?: {
    _id: string;
    referenceNo: string;
  };
  client?: {
    _id: string;
    name: string;
  };
  reason?: string;
}

interface Client {
  _id: string;
  name: string;
}

interface Invoice {
  _id: string;
  referenceNo: string;
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'goods_return', label: 'Goods Return' },
  { value: 'price_adjustment', label: 'Price Adjustment' },
  { value: 'cancelled_order', label: 'Cancelled Order' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'issued', label: 'Issued' },
  { value: 'applied', label: 'Applied' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function CreditNotesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currency: companyCurrency } = useCompany();

  const [loading, setLoading] = useState(true);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [createReason, setCreateReason] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);

  const fetchCreditNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (clientFilter && clientFilter !== 'all') params.client = clientFilter;
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (search) params.search = search;
      
      const response = await creditNotesApi.getAll(params);
      
      if (response.success && response.data) {
        const data = response.data as any;
        const notesData = Array.isArray(data) ? data : (data.data || []);
        
        if (Array.isArray(notesData)) {
          setCreditNotes(notesData);
        } else {
          setCreditNotes([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch credit notes:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter, typeFilter, dateFrom, dateTo, search]);

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

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await invoicesApi.getAll({ 
        status: 'confirmed,partially_paid,fully_paid', 
        limit: 100 
      });
      if (response.success && response.data) {
        const data = response.data as any;
        const invoiceData = Array.isArray(data) ? data : (data.invoices || data.data || []);
        setInvoices(invoiceData as Invoice[]);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchInvoices();
  }, [fetchClients, fetchInvoices]);

  useEffect(() => {
    fetchCreditNotes();
  }, [fetchCreditNotes]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  const handleClientFilter = (value: string) => {
    setClientFilter(value);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string; className?: string }> = {
      draft: { variant: 'secondary', label: t('creditNotes.statusList.draft', 'Draft'), className: 'dark:bg-slate-700 dark:text-gray-200' },
      confirmed: { variant: 'default', label: t('creditNotes.statusList.confirmed', 'Confirmed'), className: 'dark:bg-blue-900 dark:text-blue-200' },
      issued: { variant: 'default', label: t('creditNotes.statusList.issued', 'Issued'), className: 'dark:bg-green-900 dark:text-green-200' },
      applied: { variant: 'outline', label: t('creditNotes.statusList.applied', 'Applied'), className: 'dark:text-yellow-300 dark:border-yellow-600' },
      refunded: { variant: 'outline', label: t('creditNotes.statusList.refunded', 'Refunded'), className: 'dark:text-purple-300 dark:border-purple-600' },
      cancelled: { variant: 'destructive', label: t('creditNotes.statusList.cancelled', 'Cancelled'), className: 'dark:bg-red-900 dark:text-red-200' },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status, className: 'dark:text-gray-300 dark:border-gray-600' };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string; className?: string }> = {
      goods_return: { variant: 'outline', label: t('creditNotes.typeList.goods_return', 'Goods Return'), className: 'dark:text-gray-300 dark:border-gray-600' },
      price_adjustment: { variant: 'secondary', label: t('creditNotes.typeList.price_adjustment', 'Price Adjustment'), className: 'dark:bg-slate-700 dark:text-gray-200' },
      cancelled_order: { variant: 'outline', label: t('creditNotes.typeList.cancelled_order', 'Cancelled Order'), className: 'dark:text-gray-300 dark:border-gray-600' },
    };
    
    const config = typeConfig[type] || { variant: 'outline', label: type, className: 'dark:text-gray-300 dark:border-gray-600' };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency?: string) => {
    const curr = currency || companyCurrency || 'FRW';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: curr }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setClientFilter('all');
    setTypeFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const getStatusStyle = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60',
      issued: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
      applied: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
      refunded: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/60',
      cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
    };
    return map[status] || map.draft;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: 'Draft',
      confirmed: 'Confirmed',
      issued: 'Issued',
      applied: 'Applied',
      refunded: 'Refunded',
      cancelled: 'Cancelled',
    };
    return map[status] || status;
  };

  const getTypeStyle = (type: string) => {
    const map: Record<string, string> = {
      goods_return: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60',
      price_adjustment: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/60',
      cancelled_order: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
    };
    return map[type] || 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      goods_return: 'Goods Return',
      price_adjustment: 'Price Adjustment',
      cancelled_order: 'Cancelled Order',
    };
    return map[type] || type;
  };

  const filteredCreditNotes = creditNotes.filter(cn => {
    if (search && !(cn.referenceNo || cn.creditNoteNumber || '').toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && cn.status !== statusFilter) {
      return false;
    }
    if (clientFilter !== 'all' && cn.client?._id !== clientFilter) {
      return false;
    }
    if (typeFilter !== 'all' && cn.type !== typeFilter) {
      return false;
    }
    if (dateFrom && cn.creditDate && new Date(cn.creditDate) < new Date(dateFrom)) {
      return false;
    }
    if (dateTo && cn.creditDate && new Date(cn.creditDate) > new Date(dateTo)) {
      return false;
    }
    return true;
  });

  const handleCreateCreditNote = async () => {
    if (!selectedInvoice || !createReason.trim()) return;
    
    setCreating(true);
    try {
      const response = await creditNotesApi.create({
        invoice: selectedInvoice,
        creditDate: new Date().toISOString(),
        type: 'goods_return',
        reason: createReason.trim()
      });
      
      if (response.success && response.data) {
        const newCreditNote = response.data as CreditNote;
        navigate(`/credit-notes/${newCreditNote._id}/edit`);
      }
    } catch (error: any) {
      console.error('Failed to create credit note:', error);
      toast.error(error?.message || 'Failed to create credit note');
    } finally {
      setCreating(false);
      setShowCreateModal(false);
      setCreateReason('');
      setSelectedInvoice('');
    }
  };

  const handleExport = async () => {
    alert(t('common.comingSoon', 'Coming soon'));
  };

  const openConfirmDialog = (cn: CreditNote) => {
    setSelectedCreditNote(cn);
    setShowConfirmDialog(true);
  };

  const openDeleteDialog = (cn: CreditNote) => {
    setSelectedCreditNote(cn);
    setShowDeleteDialog(true);
  };

  const handleConfirm = async () => {
    if (!selectedCreditNote) return;
    setConfirmingId(selectedCreditNote._id);
    try {
      const response = await creditNotesApi.confirm(selectedCreditNote._id);
      if (response.success) {
        toast.success('Credit note confirmed successfully');
        setShowConfirmDialog(false);
        fetchCreditNotes();
      } else {
        toast.error((response as any).message || 'Failed to confirm credit note');
      }
    } catch (error: any) {
      console.error('Failed to confirm credit note:', error);
      toast.error(error?.message || 'Failed to confirm credit note');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedCreditNote) return;
    setDeletingId(selectedCreditNote._id);
    try {
      const response = await creditNotesApi.delete(selectedCreditNote._id);
      if (response.success) {
        toast.success('Credit note deleted successfully');
        setShowDeleteDialog(false);
        fetchCreditNotes();
      } else {
        toast.error(response.message || 'Failed to delete credit note');
      }
    } catch (error: any) {
      console.error('Failed to delete credit note:', error);
      toast.error(error?.message || 'Failed to delete credit note');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] 2xl:max-w-[2200px] space-y-6">
          {/* Hero Header */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-violet-50 p-2.5 text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">Credit Notes</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage returns, price adjustments, and cancelled orders</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 dark:border-slate-700 dark:text-slate-200">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                  <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">New Credit Note</span>
                    <span className="sm:hidden">New</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Notes</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{filteredCreditNotes.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total Amount</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatCurrency(filteredCreditNotes.reduce((s, c) => s + (c.grandTotal || c.totalAmount || 0), 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Confirmed</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{filteredCreditNotes.filter(c => c.status === 'confirmed').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Issued</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{filteredCreditNotes.filter(c => c.status === 'issued').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                    <Ban className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cancelled</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{filteredCreditNotes.filter(c => c.status === 'cancelled').length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search credit notes..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="bg-white pl-9 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-[150px] bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value} className="dark:text-slate-200">{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={handleTypeFilter}>
                <SelectTrigger className="w-[160px] bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                  {TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value} className="dark:text-slate-200">{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={handleClientFilter}>
                <SelectTrigger className="w-[180px] bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                  <SelectItem value="all" className="dark:text-slate-200">All Clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client._id} value={client._id} className="dark:text-slate-200">{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={dateFrom} onChange={(e) => handleDateFromChange(e.target.value)} className="w-[140px] bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
              <Input type="date" value={dateTo} onChange={(e) => handleDateToChange(e.target.value)} className="w-[140px] bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
              {(search || statusFilter !== 'all' || clientFilter !== 'all' || typeFilter !== 'all' || dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-slate-500 dark:text-slate-400">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredCreditNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Receipt className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No Credit Notes Found</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create your first credit note to get started</p>
              <Button onClick={() => setShowCreateModal(true)} className="mt-4 gap-1.5 bg-violet-600 hover:bg-violet-700">
                <Plus className="h-4 w-4" />
                New Credit Note
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <Card className="hidden overflow-hidden border-slate-200 bg-white shadow-sm sm:block dark:border-slate-800 dark:bg-slate-950">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-slate-200 hover:bg-transparent dark:border-b-slate-800">
                        <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Reference</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Invoice</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Client</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Type</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Total</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCreditNotes.map((cn) => (
                        <TableRow key={cn._id} className="border-b-slate-100 transition-colors hover:bg-slate-50 dark:border-b-slate-800/60 dark:hover:bg-slate-800/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{cn.referenceNo || cn.creditNoteNumber || 'N/A'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-300">{cn.invoice?.referenceNo || '-'}</TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-300">{cn.client?.name || '-'}</TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-300">{formatDate(cn.creditDate)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getTypeStyle(cn.type)}`}>{getTypeLabel(cn.type)}</span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusStyle(cn.status)}`}>{getStatusLabel(cn.status)}</span>
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(cn.grandTotal || cn.totalAmount, cn.currencyCode)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/credit-notes/${cn._id}`)} className="h-8 w-8 p-0 dark:text-slate-300">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(cn.status === 'draft' || cn.status === 'issued') && (
                                <Button variant="ghost" size="sm" onClick={() => navigate(`/credit-notes/${cn._id}/edit`)} className="h-8 w-8 p-0 dark:text-slate-300">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {cn.status === 'draft' && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => openConfirmDialog(cn)} className="h-8 w-8 p-0">
                                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(cn)} className="h-8 w-8 p-0">
                                    <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Mobile Cards */}
              <div className="space-y-3 sm:hidden">
                {filteredCreditNotes.map((cn) => (
                  <Card key={cn._id} className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{cn.referenceNo || cn.creditNoteNumber || 'N/A'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{cn.client?.name || '-'} &middot; {formatDate(cn.creditDate)}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusStyle(cn.status)}`}>{getStatusLabel(cn.status)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Invoice: <span className="font-medium text-slate-700 dark:text-slate-200">{cn.invoice?.referenceNo || '-'}</span></p>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getTypeStyle(cn.type)}`}>{getTypeLabel(cn.type)}</span>
                        </div>
                        <p className="text-base font-bold text-slate-900 dark:text-white">{formatCurrency(cn.grandTotal || cn.totalAmount, cn.currencyCode)}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/credit-notes/${cn._id}`)} className="h-8 w-8 p-0 dark:text-slate-300">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(cn.status === 'draft' || cn.status === 'issued') && (
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/credit-notes/${cn._id}/edit`)} className="h-8 w-8 p-0 dark:text-slate-300">
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {cn.status === 'draft' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openConfirmDialog(cn)} className="h-8 w-8 p-0">
                              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(cn)} className="h-8 w-8 p-0">
                              <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="rounded-lg bg-violet-50 p-1.5 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                <Receipt className="h-4 w-4" />
              </div>
              Create New Credit Note
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Select an invoice to create a credit note for</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700 dark:text-slate-300">Invoice *</Label>
              <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
                <SelectTrigger className="bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                  <SelectValue placeholder="Select an invoice" />
                </SelectTrigger>
                <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                  {invoices.map(inv => (
                    <SelectItem key={inv._id} value={inv._id} className="dark:text-slate-200">{inv.referenceNo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700 dark:text-slate-300">Reason *</Label>
              <Select value={createReason} onValueChange={setCreateReason}>
                <SelectTrigger className="bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent className="dark:border-slate-800 dark:bg-slate-950">
                  <SelectItem value="Goods returned by customer" className="dark:text-slate-200">Goods returned by customer</SelectItem>
                  <SelectItem value="Price adjustment" className="dark:text-slate-200">Price adjustment</SelectItem>
                  <SelectItem value="Order cancelled" className="dark:text-slate-200">Order cancelled</SelectItem>
                  <SelectItem value="Damaged goods" className="dark:text-slate-200">Damaged goods</SelectItem>
                  <SelectItem value="Wrong item shipped" className="dark:text-slate-200">Wrong item shipped</SelectItem>
                  <SelectItem value="Quality issues" className="dark:text-slate-200">Quality issues</SelectItem>
                  <SelectItem value="Customer discount" className="dark:text-slate-200">Customer discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowCreateModal(false); setCreateReason(''); setSelectedInvoice(''); }} className="dark:border-slate-700 dark:text-slate-200">
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </Button>
            <Button size="sm" onClick={handleCreateCreditNote} disabled={!selectedInvoice || !createReason.trim() || creating} className="bg-violet-600 hover:bg-violet-700">
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle className="h-4 w-4" />
              </div>
              Confirm Credit Note
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              This will process the credit note, reverse the journal entries, and return stock to inventory (for goods returns). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Reference</span>
              <span className="font-semibold text-slate-900 dark:text-white">{selectedCreditNote?.referenceNo}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Total Amount</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(selectedCreditNote?.grandTotal || selectedCreditNote?.totalAmount || 0, selectedCreditNote?.currencyCode)}</span>
            </div>
            {selectedCreditNote?.type === 'goods_return' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Type</span>
                <span className="text-slate-700 dark:text-slate-300">Goods Return - Stock will be returned</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowConfirmDialog(false)} disabled={!!confirmingId} className="dark:border-slate-700 dark:text-slate-200">
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={!!confirmingId} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="mr-1.5 h-4 w-4" /> Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="rounded-lg bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
                <Ban className="h-4 w-4" />
              </div>
              Delete Credit Note
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">Are you sure you want to delete this draft credit note? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg border border-rose-100 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Reference</span>
              <span className="font-semibold text-slate-900 dark:text-white">{selectedCreditNote?.referenceNo}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusStyle(selectedCreditNote?.status || '')}`}>{getStatusLabel(selectedCreditNote?.status || '')}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(false)} disabled={!!deletingId} className="dark:border-slate-700 dark:text-slate-200">
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={!!deletingId}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}