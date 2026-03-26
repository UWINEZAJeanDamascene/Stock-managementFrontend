import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { creditNotesApi, clientsApi, invoicesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
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
  X
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
  const [creating, setCreating] = useState(false);

  const fetchCreditNotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await creditNotesApi.getAll();
      
      if (response.success && response.data) {
        const data = response.data as any;
        if (Array.isArray(data)) {
          setCreditNotes(data);
        } else if (data.creditNotes) {
          setCreditNotes(data.creditNotes);
        } else {
          setCreditNotes([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch credit notes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
      const response = await invoicesApi.getAll({ status: 'confirmed', limit: 50 });
      if (response.success && response.data) {
        const data = response.data as any;
        const invoiceData = Array.isArray(data) ? data : (data.invoices || []);
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
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      draft: { variant: 'secondary', label: t('creditNotes.statusList.draft', 'Draft') },
      confirmed: { variant: 'default', label: t('creditNotes.statusList.confirmed', 'Confirmed') },
      issued: { variant: 'default', label: t('creditNotes.statusList.issued', 'Issued') },
      applied: { variant: 'outline', label: t('creditNotes.statusList.applied', 'Applied') },
      refunded: { variant: 'outline', label: t('creditNotes.statusList.refunded', 'Refunded') },
      cancelled: { variant: 'destructive', label: t('creditNotes.statusList.cancelled', 'Cancelled') },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      goods_return: { variant: 'outline', label: t('creditNotes.typeList.goods_return', 'Goods Return') },
      price_adjustment: { variant: 'secondary', label: t('creditNotes.typeList.price_adjustment', 'Price Adjustment') },
      cancelled_order: { variant: 'outline', label: t('creditNotes.typeList.cancelled_order', 'Cancelled Order') },
    };
    
    const config = typeConfig[type] || { variant: 'outline', label: type };
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
    if (!selectedInvoice) return;
    
    setCreating(true);
    try {
      const response = await creditNotesApi.create({
        invoice: selectedInvoice,
        creditDate: new Date().toISOString(),
        type: 'goods_return',
        reason: ''
      });
      
      if (response.success && response.data) {
        const newCreditNote = response.data as CreditNote;
        navigate(`/credit-notes/${newCreditNote._id}/edit`);
      }
    } catch (error) {
      console.error('Failed to create credit note:', error);
    } finally {
      setCreating(false);
      setShowCreateModal(false);
    }
  };

  const handleExport = async () => {
    alert(t('common.comingSoon', 'Coming soon'));
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{t('creditNotes.title', 'Credit Notes')}</h1>
            <p className="text-muted-foreground">{t('creditNotes.subtitle', 'Manage customer credit notes')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.export', 'Export')}
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('creditNotes.newCreditNote', 'New Credit Note')}
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
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredCreditNotes.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">{t('creditNotes.noCreditNotes', 'No credit notes found')}</h3>
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
                  <TableRow>
                    <TableHead>{t('creditNotes.reference', 'Reference')}</TableHead>
                    <TableHead>{t('creditNotes.invoice', 'Invoice')}</TableHead>
                    <TableHead>{t('creditNotes.client', 'Client')}</TableHead>
                    <TableHead>{t('creditNotes.date', 'Date')}</TableHead>
                    <TableHead>{t('creditNotes.typeLabel', 'Type')}</TableHead>
                    <TableHead>{t('creditNotes.statusLabel', 'Status')}</TableHead>
                    <TableHead className="text-right">{t('creditNotes.total', 'Total')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCreditNotes.map((cn) => (
                    <TableRow key={cn._id}>
                      <TableCell className="font-medium">
                        {cn.referenceNo || cn.creditNoteNumber || 'N/A'}
                      </TableCell>
                      <TableCell>{cn.invoice?.referenceNo || '-'}</TableCell>
                      <TableCell>{cn.client?.name || '-'}</TableCell>
                      <TableCell>{formatDate(cn.creditDate)}</TableCell>
                      <TableCell>{getTypeBadge(cn.type)}</TableCell>
                      <TableCell>{getStatusBadge(cn.status)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(cn.grandTotal || cn.totalAmount, cn.currencyCode)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/credit-notes/${cn._id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('common.view', 'View')}
                            </DropdownMenuItem>
                            {(cn.status === 'draft' || cn.status === 'issued') && (
                              <DropdownMenuItem onClick={() => navigate(`/credit-notes/${cn._id}/edit`)}>
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

      {/* Create Credit Note Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('creditNotes.createNew', 'Create New Credit Note')}</DialogTitle>
            <DialogDescription>
              {t('creditNotes.selectInvoice', 'Select an invoice to create a credit note for')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>{t('creditNotes.invoice', 'Invoice')}</Label>
            <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder={t('creditNotes.selectInvoicePlaceholder', 'Select an invoice')} />
              </SelectTrigger>
              <SelectContent>
                {invoices.map(inv => (
                  <SelectItem key={inv._id} value={inv._id}>
                    {inv.referenceNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              <X className="mr-2 h-4 w-4" />
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleCreateCreditNote} disabled={!selectedInvoice || creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('creditNotes.create', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}