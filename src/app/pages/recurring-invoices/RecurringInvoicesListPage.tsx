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
  const [processing, setProcessing] = useState<string | null>(null);

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


  const handleExport = async () => {
    alert(t('common.comingSoon', 'Coming soon'));
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold dark:text-gray-100">{t('recurringInvoices.title', 'Recurring Invoices')}</h1>
            <p className="text-muted-foreground dark:text-gray-400">{t('recurringInvoices.subtitle', 'Manage recurring invoice templates')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.export', 'Export')}
            </Button>
            <Button onClick={() => navigate('/recurring-invoices/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('recurringInvoices.newRecurring', 'New Recurring Invoice')}
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
                  placeholder={t('recurringInvoices.search', 'Search recurring invoices...')}
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder={t('recurringInvoices.filterStatus', 'Status')} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value} className="dark:text-gray-200">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={frequencyFilter} onValueChange={handleFrequencyFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder={t('recurringInvoices.filterFrequency', 'Frequency')} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  {FREQUENCY_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value} className="dark:text-gray-200">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={handleClientFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-600">
                  <SelectValue placeholder={t('recurringInvoices.filterClient', 'Client')} />
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
        <Card className="dark:border-slate-700 dark:bg-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredRecurringInvoices.length === 0 ? (
              <div className="text-center py-12 dark:bg-slate-800">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4 dark:text-gray-400" />
                <h3 className="text-lg font-medium dark:text-gray-200">{t('recurringInvoices.noRecurring', 'No recurring invoices found')}</h3>
                <p className="text-muted-foreground mb-4 dark:text-gray-400">
                  {t('recurringInvoices.noRecurringDescription', 'Create your first recurring invoice to get started')}
                </p>
                <Button onClick={() => navigate('/recurring-invoices/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('recurringInvoices.newRecurring', 'New Recurring Invoice')}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="dark:bg-slate-800">
                  <TableRow className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('recurringInvoices.reference', 'Reference')}</TableHead>
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('recurringInvoices.client', 'Client')}</TableHead>
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('recurringInvoices.frequency', 'Frequency')}</TableHead>
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('recurringInvoices.nextRun', 'Next Run')}</TableHead>
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('recurringInvoices.status', 'Status')}</TableHead>
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('recurringInvoices.autoConfirm', 'Auto Confirm')}</TableHead>
                    <TableHead className="dark:text-gray-300 dark:bg-slate-800 dark:border-b dark:border-slate-700">{t('recurringInvoices.lastRun', 'Last Run')}</TableHead>
                    <TableHead className="dark:bg-slate-800 dark:border-b dark:border-slate-700"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="dark:bg-slate-800">
                  {filteredRecurringInvoices.map((inv) => (
                    <TableRow key={inv._id} className="dark:hover:bg-slate-700/50 dark:border-b dark:border-slate-700">
                      <TableCell className="font-medium dark:text-gray-200 dark:bg-slate-800">
                        {inv.referenceNo}
                      </TableCell>
                      <TableCell className="dark:text-gray-300 dark:bg-slate-800">{inv.client?.name || '-'}</TableCell>
                      <TableCell className="dark:text-gray-300 dark:bg-slate-800">{formatFrequency(inv.schedule)}</TableCell>
                      <TableCell className="dark:text-gray-300 dark:bg-slate-800">{formatDate(inv.nextRunDate)}</TableCell>
                      <TableCell className="dark:bg-slate-800">{getStatusBadge(inv.status)}</TableCell>
                      <TableCell className="dark:bg-slate-800">
                        {inv.autoConfirm ? (
                          <Badge variant="default" className="dark:bg-slate-700 dark:text-gray-200">{t('common.yes', 'Yes')}</Badge>
                        ) : (
                          <Badge variant="secondary" className="dark:bg-slate-700 dark:text-gray-200">{t('common.no', 'No')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="dark:text-gray-300 dark:bg-slate-800">{inv.lastRunAt ? formatDate(inv.lastRunAt) : '-'}</TableCell>
                      <TableCell className="text-right dark:bg-slate-800">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(`/recurring-invoices/${inv._id}`)}
                            title={t('common.view', 'View')}
                            className="dark:hover:bg-slate-700"
                          >
                            <Eye className="h-4 w-4 dark:text-gray-300" />
                          </Button>
                          {(inv.status === 'active' || inv.status === 'paused') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => navigate(`/recurring-invoices/${inv._id}/edit`)}
                              title={t('common.edit', 'Edit')}
                              className="dark:hover:bg-slate-700"
                            >
                              <Edit className="h-4 w-4 dark:text-gray-300" />
                            </Button>
                          )}
                          {inv.status === 'active' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handlePause(inv._id)} 
                              disabled={processing === inv._id}
                              title={t('recurringInvoices.pause', 'Pause')}
                              className="dark:hover:bg-slate-700"
                            >
                              <Pause className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </Button>
                          )}
                          {inv.status === 'paused' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleResume(inv._id)} 
                              disabled={processing === inv._id}
                              title={t('recurringInvoices.resume', 'Resume')}
                              className="dark:hover:bg-slate-700"
                            >
                              <Play className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </Button>
                          )}
                          {inv.status !== 'cancelled' && inv.status !== 'completed' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleTrigger(inv._id)} 
                              disabled={processing === inv._id}
                              title={t('recurringInvoices.trigger', 'Trigger Now')}
                              className="dark:hover:bg-slate-700"
                            >
                              <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </Button>
                          )}
                          {(inv.status === 'active' || inv.status === 'paused') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleCancel(inv._id)} 
                              disabled={processing === inv._id}
                              title={t('recurringInvoices.cancel', 'Cancel')}
                              className="text-red-600 dark:hover:bg-slate-700"
                            >
                              <XCircle className="h-4 w-4" />
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