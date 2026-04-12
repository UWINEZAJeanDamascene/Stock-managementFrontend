import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { recurringInvoicesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { 
  ArrowLeft, 
  Edit,
  Play,
  Pause,
  Zap,
  XCircle,
  Loader2,
  FileText,
  Package,
  Calendar,
  User,
  Repeat,
  AlertTriangle,
  CheckCircle,
  X,
  Clock
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Separator } from '@/app/components/ui/separator';
import { toast } from 'sonner';

interface RecurringInvoiceLine {
  _id: string;
  product: {
    _id: string;
    name: string;
    code?: string;
  };
  productName: string;
  productCode: string;
  qty: number;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
  discountPct?: number;
}

interface RecurringInvoiceRun {
  _id: string;
  runDate: string;
  status: 'success' | 'failed';
  invoice?: {
    _id: string;
    referenceNo: string;
    status: string;
    totalAmount: number;
  };
  errorMessage?: string;
  createdAt: string;
}

interface RecurringInvoice {
  _id: string;
  referenceNo: string;
  client: {
    _id: string;
    name: string;
    code?: string;
  };
  lines: RecurringInvoiceLine[];
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
  currencyCode: string;
  notes?: string;
  lastRunAt?: string;
  createdBy?: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

// Helper to convert Decimal values
const toNumber = (val: any): number => {
  if (typeof val === 'object' && val?.$numberDecimal) {
    return parseFloat(val.$numberDecimal);
  }
  return Number(val) || 0;
};

export default function RecurringInvoiceDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [recurringInvoice, setRecurringInvoice] = useState<RecurringInvoice | null>(null);
  const [runs, setRuns] = useState<RecurringInvoiceRun[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);

  const fetchRecurringInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await recurringInvoicesApi.getById(id);
      if (response.success && response.data) {
        setRecurringInvoice(response.data as RecurringInvoice);
      } else {
        toast.error('Failed to load recurring invoice');
      }
    } catch (error) {
      console.error('Failed to fetch recurring invoice:', error);
      toast.error('Failed to load recurring invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchRuns = useCallback(async () => {
    if (!id) return;
    try {
      const response = await recurringInvoicesApi.getRuns(id);
      if (response.success && response.data) {
        const data = response.data as any;
        setRuns(Array.isArray(data) ? data : (data.runs || []));
      }
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchRecurringInvoice();
    fetchRuns();
  }, [fetchRecurringInvoice, fetchRuns]);

  const handlePause = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const response = await recurringInvoicesApi.pause(id);
      if (response.success) {
        toast.success('Recurring invoice paused');
        fetchRecurringInvoice();
      }
    } catch (error) {
      console.error('Failed to pause:', error);
      toast.error('Failed to pause recurring invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleResume = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const response = await recurringInvoicesApi.resume(id);
      if (response.success) {
        toast.success('Recurring invoice resumed');
        fetchRecurringInvoice();
      }
    } catch (error) {
      console.error('Failed to resume:', error);
      toast.error('Failed to resume recurring invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm(t('recurringInvoices.confirmCancel', 'Are you sure you want to cancel this recurring invoice?'))) {
      return;
    }
    setProcessing(true);
    try {
      const response = await recurringInvoicesApi.cancel(id);
      if (response.success) {
        toast.success('Recurring invoice cancelled');
        fetchRecurringInvoice();
      }
    } catch (error) {
      console.error('Failed to cancel:', error);
      toast.error('Failed to cancel recurring invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleTrigger = async () => {
    if (!id) return;
    setProcessing(true);
    try {
      const response = await recurringInvoicesApi.trigger(id);
      if (response.success) {
        const data = response.data as any;
        if (data) {
          toast.success('Invoice generated successfully');
        } else {
          toast.info('Template already run today (idempotent)');
        }
        fetchRecurringInvoice();
        fetchRuns();
      }
    } catch (error) {
      console.error('Failed to trigger:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setProcessing(false);
      setShowTriggerDialog(false);
    }
  };

  const formatCurrency = (amount: number | any, currency: string = 'USD') => {
    const num = toNumber(amount);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
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

  const getFrequencyLabel = (schedule: RecurringInvoice['schedule']) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annually: 'Annually',
    };
    const freq = labels[schedule.frequency] || schedule.frequency;
    if (schedule.interval > 1) {
      return `Every ${schedule.interval} ${freq}s`;
    }
    return freq;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!recurringInvoice) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Recurring Invoice Not Found</h3>
            <Button onClick={() => navigate('/recurring-invoices')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Recurring Invoices
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const { subtotal, taxAmount, totalAmount } = recurringInvoice.lines.reduce((acc, line) => ({
    subtotal: acc.subtotal + toNumber(line.lineSubtotal || line.qty * line.unitPrice),
    taxAmount: acc.taxAmount + toNumber(line.lineTax || line.qty * line.unitPrice * (line.taxRate / 100)),
    totalAmount: acc.totalAmount + toNumber(line.lineTotal || line.qty * line.unitPrice * (1 + line.taxRate / 100)),
  }), { subtotal: 0, taxAmount: 0, totalAmount: 0 });

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => navigate('/recurring-invoices')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold">{recurringInvoice.referenceNo}</h1>
              <div className="flex items-center gap-2">
                {getStatusBadge(recurringInvoice.status)}
                {recurringInvoice.autoConfirm && (
                  <Badge variant="outline">{t('recurringInvoices.autoConfirm', 'Auto-Confirm')}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(recurringInvoice.status === 'active' || recurringInvoice.status === 'paused') && (
              <Button variant="outline" size="sm" className="px-2 sm:px-3" onClick={() => navigate(`/recurring-invoices/${id}/edit`)}>
                <Edit className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t('common.edit', 'Edit')}</span>
              </Button>
            )}
            {recurringInvoice.status === 'active' && (
              <Button variant="outline" size="sm" className="px-2 sm:px-3" onClick={handlePause} disabled={processing}>
                <Pause className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t('recurringInvoices.pause', 'Pause')}</span>
              </Button>
            )}
            {recurringInvoice.status === 'paused' && (
              <Button variant="outline" size="sm" className="px-2 sm:px-3" onClick={handleResume} disabled={processing}>
                <Play className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t('recurringInvoices.resume', 'Resume')}</span>
              </Button>
            )}
            {(recurringInvoice.status === 'active' || recurringInvoice.status === 'paused') && (
              <>
                <Button variant="outline" size="sm" className="px-2 sm:px-3" onClick={() => setShowTriggerDialog(true)} disabled={processing}>
                  <Zap className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t('recurringInvoices.trigger', 'Trigger')}</span>
                </Button>
                <Button variant="destructive" size="sm" className="px-2 sm:px-3" onClick={handleCancel} disabled={processing}>
                  <XCircle className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t('recurringInvoices.cancel', 'Cancel')}</span>
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="w-full overflow-x-auto flex-nowrap">
            <TabsTrigger value="details" className="px-2 sm:px-3 whitespace-nowrap">
              <FileText className="mr-1.5 sm:mr-2 h-4 w-4" />
              <span className="text-sm">{t('recurringInvoices.details', 'Details')}</span>
            </TabsTrigger>
            <TabsTrigger value="lines" className="px-2 sm:px-3 whitespace-nowrap">
              <Package className="mr-1.5 sm:mr-2 h-4 w-4" />
              <span className="text-sm">{t('recurringInvoices.lineItems', 'Line Items')}</span>
            </TabsTrigger>
            <TabsTrigger value="runs" className="px-2 sm:px-3 whitespace-nowrap">
              <Repeat className="mr-1.5 sm:mr-2 h-4 w-4" />
              <span className="text-sm">{t('recurringInvoices.runHistory', 'Run History')} ({runs.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {t('recurringInvoices.templateInfo', 'Template Information')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground">{t('recurringInvoices.client', 'Client')}</label>
                        <p className="font-medium">{recurringInvoice.client?.name || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">{t('recurringInvoices.frequency', 'Frequency')}</label>
                        <p className="font-medium">{getFrequencyLabel(recurringInvoice.schedule)}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">{t('recurringInvoices.startDate', 'Start Date')}</label>
                        <p className="font-medium">{formatDate(recurringInvoice.startDate)}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">{t('recurringInvoices.endDate', 'End Date')}</label>
                        <p className="font-medium">{recurringInvoice.endDate ? formatDate(recurringInvoice.endDate) : t('common.noEndDate', 'No end date')}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">{t('recurringInvoices.nextRun', 'Next Run Date')}</label>
                        <p className="font-medium">{formatDate(recurringInvoice.nextRunDate)}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">{t('recurringInvoices.lastRun', 'Last Run')}</label>
                        <p className="font-medium">{recurringInvoice.lastRunAt ? formatDate(recurringInvoice.lastRunAt) : '-'}</p>
                      </div>
                    </div>
                    {recurringInvoice.notes && (
                      <>
                        <Separator />
                        <div>
                          <label className="text-sm text-muted-foreground">{t('recurringInvoices.notes', 'Notes')}</label>
                          <p className="mt-1">{recurringInvoice.notes}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('recurringInvoices.summary', 'Summary')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('recurringInvoices.subtotal', 'Subtotal')}</span>
                      <span className="font-medium">{formatCurrency(subtotal, recurringInvoice.currencyCode)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('recurringInvoices.tax', 'Tax')}</span>
                      <span className="font-medium">{formatCurrency(taxAmount, recurringInvoice.currencyCode)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-bold">{t('recurringInvoices.total', 'Total')}</span>
                      <span className="font-bold text-lg">{formatCurrency(totalAmount, recurringInvoice.currencyCode)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {t('recurringInvoices.createdBy', 'Created By')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('common.user', 'User')}</span>
                      <span className="font-medium">{recurringInvoice.createdBy?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-muted-foreground">{t('common.date', 'Date')}</span>
                      <span className="font-medium">{formatDate(recurringInvoice.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lines">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('recurringInvoices.lineItems', 'Line Items')}
                </CardTitle>
                <CardDescription>
                  {t('recurringInvoices.lineItemsDescription', 'Products that will be included in each generated invoice')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recurringInvoice.lines.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('recurringInvoices.noLineItems', 'No line items configured')}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('recurringInvoices.product', 'Product')}</TableHead>
                        <TableHead className="text-right">{t('recurringInvoices.quantity', 'Quantity')}</TableHead>
                        <TableHead className="text-right">{t('recurringInvoices.unitPrice', 'Unit Price')}</TableHead>
                        <TableHead className="text-right">{t('recurringInvoices.taxRate', 'Tax Rate')}</TableHead>
                        <TableHead className="text-right">{t('recurringInvoices.lineTotal', 'Total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recurringInvoice.lines.map((line) => (
                        <TableRow key={line._id}>
                          <TableCell>
                            <div className="font-medium">{line.productName}</div>
                            <div className="text-sm text-muted-foreground">{line.productCode}</div>
                          </TableCell>
                          <TableCell className="text-right">{toNumber(line.qty || line.quantity)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.unitPrice, recurringInvoice.currencyCode)}</TableCell>
                          <TableCell className="text-right">{toNumber(line.taxRate)}%</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(line.lineTotal || (line.qty || line.quantity) * line.unitPrice * (1 + line.taxRate / 100), recurringInvoice.currencyCode)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="runs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="h-5 w-5" />
                  {t('recurringInvoices.runHistory', 'Run History')}
                </CardTitle>
                <CardDescription>
                  {t('recurringInvoices.runHistoryDescription', 'History of invoices generated from this template')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {runs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('recurringInvoices.noRuns', 'No invoices generated yet')}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('recurringInvoices.runDate', 'Run Date')}</TableHead>
                        <TableHead>{t('recurringInvoices.status', 'Status')}</TableHead>
                        <TableHead>{t('recurringInvoices.invoice', 'Generated Invoice')}</TableHead>
                        <TableHead>{t('recurringInvoices.amount', 'Amount')}</TableHead>
                        <TableHead>{t('recurringInvoices.error', 'Error')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map((run) => (
                        <TableRow key={run._id}>
                          <TableCell>{formatDate(run.runDate)}</TableCell>
                          <TableCell>
                            {run.status === 'success' ? (
                              <Badge variant="default" className="flex items-center gap-1 w-fit">
                                <CheckCircle className="h-3 w-3" />
                                Success
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                <X className="h-3 w-3" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {run.invoice ? (
                              <Button 
                                variant="link" 
                                className="h-auto p-0"
                                onClick={() => navigate(`/invoices/${run.invoice?._id}`)}
                              >
                                {run.invoice.referenceNo}
                              </Button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {run.invoice ? formatCurrency(run.invoice.totalAmount, recurringInvoice.currencyCode) : '-'}
                          </TableCell>
                          <TableCell className="text-red-600 text-sm">
                            {run.errorMessage || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Trigger Dialog */}
        <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('recurringInvoices.triggerTitle', 'Trigger Invoice Generation')}</DialogTitle>
              <DialogDescription>
                {t('recurringInvoices.triggerDescription', 'This will immediately generate an invoice from this template. The template will still run on its next scheduled date.')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Next scheduled run: {formatDate(recurringInvoice.nextRunDate)}</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTriggerDialog(false)} disabled={processing}>
                <X className="mr-2 h-4 w-4" />
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleTrigger} disabled={processing}>
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Zap className="mr-2 h-4 w-4" />
                {t('recurringInvoices.triggerNow', 'Trigger Now')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
