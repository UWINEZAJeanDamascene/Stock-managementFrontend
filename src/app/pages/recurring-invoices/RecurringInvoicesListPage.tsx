import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { recurringInvoicesApi, clientsApi } from '@/lib/api';
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
  Pause,
  Play,
  XCircle,
  Zap
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

interface RecurringInvoice {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
  };
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
    interval: number;
    dayOfMonth?: number;
    dayOfWeek?: number;
  };
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  autoConfirm: boolean;
  lastRunAt?: string;
  currencyCode: string;
  totalAmount?: number;
  lines?: any[];
}

interface Client {
  _id: string;
  name: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'all', label: 'All Frequencies' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
};

export default function RecurringInvoicesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Create form state
  const [selectedClient, setSelectedClient] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [interval, setInterval] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchRecurringInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await recurringInvoicesApi.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        clientId: clientFilter !== 'all' ? clientFilter : undefined,
        frequency: frequencyFilter !== 'all' ? frequencyFilter : undefined,
      });
      
      if (response.success && response.data) {
        const data = response.data as any;
        if (Array.isArray(data)) {
          setRecurringInvoices(data);
        } else if (data.recurringInvoices) {
          setRecurringInvoices(data.recurringInvoices);
        } else {
          setRecurringInvoices([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch recurring invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter, frequencyFilter]);

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
    fetchRecurringInvoices();
  }, [fetchRecurringInvoices]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  const handleClientFilter = (value: string) => {
    setClientFilter(value);
  };

  const handleFrequencyFilter = (value: string) => {
    setFrequencyFilter(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      active: { variant: 'default', label: t('recurringInvoices.status.active', 'Active') },
      paused: { variant: 'secondary', label: t('recurringInvoices.status.paused', 'Paused') },
      completed: { variant: 'outline', label: t('recurringInvoices.status.completed', 'Completed') },
      cancelled: { variant: 'destructive', label: t('recurringInvoices.status.cancelled', 'Cancelled') },
    };
    
    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatFrequency = (schedule: RecurringInvoice['schedule']) => {
    const freq = FREQUENCY_LABELS[schedule.frequency] || schedule.frequency;
    if (schedule.interval > 1) {
      return `Every ${schedule.interval} ${freq}s`;
    }
    return freq;
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setClientFilter('all');
    setFrequencyFilter('all');
  };

  const filteredRecurringInvoices = recurringInvoices.filter(inv => {
    if (search && !(inv.referenceNo || '').toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && inv.status !== statusFilter) {
      return false;
    }
    if (clientFilter !== 'all' && inv.client?._id !== clientFilter) {
      return false;
    }
    if (frequencyFilter !== 'all' && inv.schedule?.frequency !== frequencyFilter) {
      return false;
    }
    return true;
  });

  const handlePause = async (id: string) => {
    setProcessing(id);
    try {
      await recurringInvoicesApi.pause(id);
      fetchRecurringInvoices();
    } catch (error) {
      console.error('Failed to pause:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleResume = async (id: string) => {
    setProcessing(id);
    try {
      await recurringInvoicesApi.resume(id);
      fetchRecurringInvoices();
    } catch (error) {
      console.error('Failed to resume:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm(t('recurringInvoices.confirmCancel', 'Are you sure you want to cancel this recurring invoice?'))) {
      return;
    }
    setProcessing(id);
    try {
      await recurringInvoicesApi.cancel(id);
      fetchRecurringInvoices();
    } catch (error) {
      console.error('Failed to cancel:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleTrigger = async (id: string) => {
    setProcessing(id);
    try {
      await recurringInvoicesApi.trigger(id);
      fetchRecurringInvoices();
    } catch (error) {
      console.error('Failed to trigger:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleCreate = async () => {
    if (!selectedClient || !startDate) return;
    
    setCreating(true);
    try {
      const response = await recurringInvoicesApi.create({
        client: selectedClient,
        startDate,
        schedule: {
          frequency,
          interval,
        },
        autoConfirm,
        status: 'active',
        nextRunDate: startDate,
        lines: [],
      });
      
      if (response.success && response.data) {
        const newRI = response.data as RecurringInvoice;
        setShowCreateModal(false);
        navigate(`/recurring-invoices/${newRI._id}`);
      }
    } catch (error) {
      console.error('Failed to create recurring invoice:', error);
    } finally {
      setCreating(false);
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
            <h1 className="text-2xl font-bold">{t('recurringInvoices.title', 'Recurring Invoices')}</h1>
            <p className="text-muted-foreground">{t('recurringInvoices.subtitle', 'Manage recurring invoice templates')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.export', 'Export')}
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('recurringInvoices.newRecurring', 'New Recurring Invoice')}
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
                  placeholder={t('recurringInvoices.search', 'Search recurring invoices...')}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('recurringInvoices.filterStatus', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={frequencyFilter} onValueChange={handleFrequencyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('recurringInvoices.filterFrequency', 'Frequency')} />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={handleClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('recurringInvoices.filterClient', 'Client')} />
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
            </div>
            {(search || statusFilter !== 'all' || clientFilter !== 'all' || frequencyFilter !== 'all') && (
              <div className="mt-4">
                <Button variant="ghost" onClick={clearFilters}>
                  {t('recurringInvoices.clearFilters', 'Clear Filters')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recurring Invoices Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredRecurringInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">{t('recurringInvoices.noRecurring', 'No recurring invoices found')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('recurringInvoices.noRecurringDescription', 'Create your first recurring invoice to get started')}
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('recurringInvoices.newRecurring', 'New Recurring Invoice')}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('recurringInvoices.reference', 'Reference')}</TableHead>
                    <TableHead>{t('recurringInvoices.client', 'Client')}</TableHead>
                    <TableHead>{t('recurringInvoices.frequency', 'Frequency')}</TableHead>
                    <TableHead>{t('recurringInvoices.nextRun', 'Next Run')}</TableHead>
                    <TableHead>{t('recurringInvoices.status', 'Status')}</TableHead>
                    <TableHead>{t('recurringInvoices.autoConfirm', 'Auto Confirm')}</TableHead>
                    <TableHead>{t('recurringInvoices.lastRun', 'Last Run')}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecurringInvoices.map((inv) => (
                    <TableRow key={inv._id}>
                      <TableCell className="font-medium">
                        {inv.referenceNo}
                      </TableCell>
                      <TableCell>{inv.client?.name || '-'}</TableCell>
                      <TableCell>{formatFrequency(inv.schedule)}</TableCell>
                      <TableCell>{formatDate(inv.nextRunDate)}</TableCell>
                      <TableCell>{getStatusBadge(inv.status)}</TableCell>
                      <TableCell>
                        {inv.autoConfirm ? (
                          <Badge variant="default">{t('common.yes', 'Yes')}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('common.no', 'No')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{inv.lastRunAt ? formatDate(inv.lastRunAt) : '-'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/recurring-invoices/${inv._id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('common.view', 'View')}
                            </DropdownMenuItem>
                            {(inv.status === 'active' || inv.status === 'paused') && (
                              <DropdownMenuItem onClick={() => navigate(`/recurring-invoices/${inv._id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                {t('common.edit', 'Edit')}
                              </DropdownMenuItem>
                            )}
                            {inv.status === 'active' && (
                              <DropdownMenuItem onClick={() => handlePause(inv._id)} disabled={processing === inv._id}>
                                <Pause className="mr-2 h-4 w-4" />
                                {t('recurringInvoices.pause', 'Pause')}
                              </DropdownMenuItem>
                            )}
                            {inv.status === 'paused' && (
                              <DropdownMenuItem onClick={() => handleResume(inv._id)} disabled={processing === inv._id}>
                                <Play className="mr-2 h-4 w-4" />
                                {t('recurringInvoices.resume', 'Resume')}
                              </DropdownMenuItem>
                            )}
                            {inv.status !== 'cancelled' && inv.status !== 'completed' && (
                              <DropdownMenuItem onClick={() => handleTrigger(inv._id)} disabled={processing === inv._id}>
                                <Zap className="mr-2 h-4 w-4" />
                                {t('recurringInvoices.trigger', 'Trigger Now')}
                              </DropdownMenuItem>
                            )}
                            {(inv.status === 'active' || inv.status === 'paused') && (
                              <DropdownMenuItem onClick={() => handleCancel(inv._id)} disabled={processing === inv._id} className="text-red-600">
                                <XCircle className="mr-2 h-4 w-4" />
                                {t('recurringInvoices.cancel', 'Cancel')}
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

      {/* Create Recurring Invoice Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('recurringInvoices.createNew', 'Create New Recurring Invoice')}</DialogTitle>
            <DialogDescription>
              {t('recurringInvoices.createDescription', 'Set up a template for automatic invoice generation')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('recurringInvoices.client', 'Client')} *</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t('recurringInvoices.selectClient', 'Select Client')} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('recurringInvoices.frequency', 'Frequency')}</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('recurringInvoices.interval', 'Every')}</Label>
                <Input
                  type="number"
                  min="1"
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                  className="mt-2"
                />
              </div>
            </div>
            <div>
              <Label>{t('recurringInvoices.startDate', 'Start Date')} *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoConfirm"
                checked={autoConfirm}
                onChange={(e) => setAutoConfirm(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="autoConfirm" className="cursor-pointer">
                {t('recurringInvoices.autoConfirmLabel', 'Auto-confirm generated invoices')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={!selectedClient || !startDate || creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.create', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}