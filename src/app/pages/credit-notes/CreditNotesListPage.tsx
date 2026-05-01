import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { creditNotesApi, clientsApi, invoicesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { useCompany } from '@/hooks/useCompany';
import { 
  Plus, 
  Search, 
  Download, 
  Loader2,
  FileText,
  Eye,
  Edit,
  MoreHorizontal,
  CreditCard,
  X,
  CheckCircle,
  Trash2
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
      <div className="container mx-auto py-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold dark:text-white">{t('creditNotes.title', 'Credit Notes')}</h1>
            <p className="text-sm text-muted-foreground">{t('creditNotes.subtitle', 'Manage customer credit notes')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} size="sm" className="sm:size-default">
              <Download className="mr-1.5 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('common.export', 'Export')}</span>
              <span className="sm:hidden">{t('common.export', 'Export')}</span>
            </Button>
            <Button onClick={() => setShowCreateModal(true)} size="sm" className="sm:size-default">
              <Plus className="mr-1.5 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('creditNotes.newCreditNote', 'New Credit Note')}</span>
              <span className="sm:hidden">{t('creditNotes.new', 'New')}</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('creditNotes.search', 'Search credit notes...')}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('creditNotes.filterStatus', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={handleTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('creditNotes.filterType', 'Type')} />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={handleClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('creditNotes.filterClient', 'Client')} />
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
                placeholder={t('creditNotes.dateFrom', 'From')}
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                placeholder={t('creditNotes.dateTo', 'To')}
              />
            </div>
            {(search || statusFilter !== 'all' || clientFilter !== 'all' || typeFilter !== 'all' || dateFrom || dateTo) && (
              <div className="mt-4">
                <Button variant="ghost" onClick={clearFilters}>
                  {t('creditNotes.clearFilters', 'Clear Filters')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit Notes Table */}
        <Card className="dark:bg-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredCreditNotes.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium dark:text-white">{t('creditNotes.noCreditNotes', 'No credit notes found')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('creditNotes.noCreditNotesDescription', 'Create your first credit note to get started')}
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('creditNotes.newCreditNote', 'New Credit Note')}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="dark:hover:bg-slate-700">
                    <TableHead className="dark:text-gray-300">{t('creditNotes.reference', 'Reference')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('creditNotes.invoice', 'Invoice')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('creditNotes.client', 'Client')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('creditNotes.date', 'Date')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('creditNotes.typeLabel', 'Type')}</TableHead>
                    <TableHead className="dark:text-gray-300">{t('creditNotes.statusLabel', 'Status')}</TableHead>
                    <TableHead className="text-right dark:text-gray-300">{t('creditNotes.total', 'Total')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCreditNotes.map((cn) => (
                    <TableRow key={cn._id} className="dark:hover:bg-slate-700">
                      <TableCell className="font-medium dark:text-white">
                        {cn.referenceNo || cn.creditNoteNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">{cn.invoice?.referenceNo || '-'}</TableCell>
                      <TableCell className="dark:text-gray-300">{cn.client?.name || '-'}</TableCell>
                      <TableCell className="dark:text-gray-300">{formatDate(cn.creditDate)}</TableCell>
                      <TableCell>{getTypeBadge(cn.type)}</TableCell>
                      <TableCell>{getStatusBadge(cn.status)}</TableCell>
                      <TableCell className="text-right font-medium dark:text-white">
                        {formatCurrency(cn.grandTotal || cn.totalAmount, cn.currencyCode)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(`/credit-notes/${cn._id}`)}
                            title={t('common.view', 'View')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(cn.status === 'draft' || cn.status === 'issued') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => navigate(`/credit-notes/${cn._id}/edit`)}
                              title={t('common.edit', 'Edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {cn.status === 'draft' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => openConfirmDialog(cn)}
                                title={t('creditNotes.confirm', 'Confirm')}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => openDeleteDialog(cn)}
                                title={t('common.delete', 'Delete')}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
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

      {/* Create Credit Note Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{t('creditNotes.createNew', 'Create New Credit Note')}</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              {t('creditNotes.selectInvoice', 'Select an invoice to create a credit note for')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="dark:text-gray-200">{t('creditNotes.invoice', 'Invoice')} *</Label>
              <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
                <SelectTrigger className="mt-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                  <SelectValue placeholder={t('creditNotes.selectInvoicePlaceholder', 'Select an invoice')} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  {invoices.map(inv => (
                    <SelectItem key={inv._id} value={inv._id} className="dark:text-white">
                      {inv.referenceNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="dark:text-gray-200">{t('creditNotes.reason', 'Reason')} *</Label>
              <Select value={createReason} onValueChange={setCreateReason}>
                <SelectTrigger className="mt-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                  <SelectValue placeholder={t('creditNotes.selectReason', 'Select a reason')} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="Goods returned by customer" className="dark:text-white">Goods returned by customer</SelectItem>
                  <SelectItem value="Price adjustment" className="dark:text-white">Price adjustment</SelectItem>
                  <SelectItem value="Order cancelled" className="dark:text-white">Order cancelled</SelectItem>
                  <SelectItem value="Damaged goods" className="dark:text-white">Damaged goods</SelectItem>
                  <SelectItem value="Wrong item shipped" className="dark:text-white">Wrong item shipped</SelectItem>
                  <SelectItem value="Quality issues" className="dark:text-white">Quality issues</SelectItem>
                  <SelectItem value="Customer discount" className="dark:text-white">Customer discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateModal(false);
              setCreateReason('');
              setSelectedInvoice('');
            }}>
              <X className="mr-2 h-4 w-4" />
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleCreateCreditNote} disabled={!selectedInvoice || !createReason.trim() || creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('creditNotes.create', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Credit Note Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{t('creditNotes.confirmTitle', 'Confirm Credit Note')}</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              {t('creditNotes.confirmDescription', 'This will process the credit note, reverse the journal entries, and return stock to inventory (for goods returns). This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted dark:bg-slate-700 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="dark:text-gray-300">Reference:</span>
                <span className="font-bold dark:text-white">{selectedCreditNote?.referenceNo}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="dark:text-gray-300">Total Amount:</span>
                <span className="font-bold dark:text-white">{formatCurrency(selectedCreditNote?.grandTotal || selectedCreditNote?.totalAmount || 0, selectedCreditNote?.currencyCode)}</span>
              </div>
              {selectedCreditNote?.type === 'goods_return' && (
                <div className="flex justify-between text-sm">
                  <span className="dark:text-gray-300">Type:</span>
                  <span className="dark:text-white">Goods Return - Stock will be returned to inventory</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={!!confirmingId}>
              <X className="mr-2 h-4 w-4" />
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleConfirm} disabled={!!confirmingId}>
              {confirmingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CheckCircle className="mr-2 h-4 w-4" />
              {t('creditNotes.confirm', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Credit Note Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{t('creditNotes.deleteTitle', 'Delete Credit Note')}</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              {t('creditNotes.deleteDescription', 'Are you sure you want to delete this draft credit note? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-destructive/10 dark:bg-red-900/20 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="dark:text-gray-300">Reference:</span>
                <span className="font-bold dark:text-white">{selectedCreditNote?.referenceNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="dark:text-gray-300">Status:</span>
                <Badge variant="secondary" className="dark:bg-slate-700 dark:text-gray-200">{selectedCreditNote?.status}</Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={!!deletingId}>
              <X className="mr-2 h-4 w-4" />
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!!deletingId}>
              {deletingId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}