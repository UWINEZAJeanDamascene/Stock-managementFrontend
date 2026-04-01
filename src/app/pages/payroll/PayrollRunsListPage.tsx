import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { payrollRunApi, PayrollRun } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  RefreshCw,
  Loader2,
  Play,
  AlertCircle,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Label } from '@/app/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { toast } from 'sonner';

export default function PayrollRunsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(20);

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: currentPage, limit };
      if (filterStatus) params.status = filterStatus;

      const response = await payrollRunApi.getAll(params);
      if (response.success) {
        setRuns(response.data || []);
        if (response.pagination) {
          setTotalCount(response.pagination.total || 0);
          setTotalPages(response.pagination.pages || 1);
        }
      }
    } catch (error) {
      console.error('[PayrollRunsListPage] Failed to fetch:', error);
      toast.error(t('payroll.messages.runLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filterStatus, currentPage, limit, t]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handlePost = async (run: PayrollRun) => {
    setSubmitting(true);
    try {
      const response = await payrollRunApi.post(run._id);
      if (response.success) {
        toast.success(t('payroll.messages.runPosted'));
        fetchRuns();
      }
    } catch (error: any) {
      toast.error(error?.message || t('payroll.messages.runPostFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverse = async () => {
    if (!selectedRun) return;
    setSubmitting(true);
    try {
      const response = await payrollRunApi.reverse(selectedRun._id, {
        reason: reversalReason || undefined,
      });
      if (response.success) {
        toast.success(t('payroll.messages.runReversed'));
        setShowReverseDialog(false);
        setSelectedRun(null);
        setReversalReason('');
        fetchRuns();
      }
    } catch (error: any) {
      toast.error(error?.message || t('payroll.messages.runReverseFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRun) return;
    setSubmitting(true);
    try {
      const response = await payrollRunApi.delete(selectedRun._id);
      if (response.success) {
        toast.success(t('payroll.messages.runDeleted'));
        setShowDeleteDialog(false);
        setSelectedRun(null);
        fetchRuns();
      }
    } catch (error: any) {
      toast.error(error?.message || t('payroll.messages.runLoadFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(amount || 0);

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string }> = {
      draft: { className: 'bg-gray-100 text-gray-700 border-gray-300' },
      posted: { className: 'bg-green-100 text-green-700 border-green-300' },
      reversed: { className: 'bg-red-100 text-red-700 border-red-300' },
    };
    const { className } = config[status] || config.draft;
    return <Badge variant="outline" className={className}>{status}</Badge>;
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Play className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('payroll.run.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('payroll.run.subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/payroll')}>
              {t('payroll.employeeRecords')}
            </Button>
            <Button onClick={() => navigate('/payroll-runs/new')}>
              <Play className="mr-2 h-4 w-4" />
              {t('payroll.run.createFromRecords') || 'New Payroll Run'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <Select value={filterStatus || 'all'} onValueChange={(v) => { setFilterStatus(v === 'all' ? '' : v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('payroll.filterByStatus')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('payroll.allStatuses')}</SelectItem>
                  <SelectItem value="draft">{t('payroll.statuses.draft')}</SelectItem>
                  <SelectItem value="posted">{t('payroll.statuses.posted')}</SelectItem>
                  <SelectItem value="reversed">{t('payroll.statuses.reversed')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" onClick={() => { setFilterStatus(''); setCurrentPage(1); }}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('common.clearFilters')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : runs.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No payroll runs found</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('payroll.reference')}</TableHead>
                      <TableHead>{t('payroll.payPeriod')}</TableHead>
                      <TableHead>{t('payroll.paymentDate')}</TableHead>
                      <TableHead className="text-right">{t('payroll.totalGross')}</TableHead>
                      <TableHead className="text-right">{t('payroll.run.rssbTotal')}</TableHead>
                      <TableHead className="text-right">{t('payroll.totalNet')}</TableHead>
                      <TableHead className="text-center">{t('payroll.employees')}</TableHead>
                      <TableHead>{t('payroll.status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => (
                      <TableRow key={run._id}>
                        <TableCell className="font-mono font-medium">{run.reference_no}</TableCell>
                        <TableCell>{formatPeriod(run.pay_period_start, run.pay_period_end)}</TableCell>
                        <TableCell>{formatDate(run.payment_date)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(run.total_gross)}</TableCell>
                        <TableCell className="text-right text-orange-600">
                          {formatCurrency(run.total_other_deductions)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{formatCurrency(run.total_net)}</TableCell>
                        <TableCell className="text-center">{run.employee_count}</TableCell>
                        <TableCell>{getStatusBadge(run.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/payroll-runs/${run._id}`)}
                              title={t('payroll.run.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {run.status === 'draft' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePost(run)}
                                  disabled={submitting}
                                  title={t('payroll.run.postRun')}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setSelectedRun(run); setShowDeleteDialog(true); }}
                                  title={t('payroll.run.deleteRun')}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            {run.status === 'posted' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setSelectedRun(run); setShowReverseDialog(true); }}
                                title={t('payroll.run.reverseRun')}
                              >
                                <RotateCcw className="h-4 w-4 text-orange-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Select value={limit.toString()} onValueChange={(v) => { setLimit(parseInt(v)); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('payroll.run.deleteConfirmTitle')}</DialogTitle>
              <DialogDescription>{t('payroll.run.deleteConfirmMessage')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>{t('common.cancel')}</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reverse Confirmation */}
        <Dialog open={showReverseDialog} onOpenChange={setShowReverseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('payroll.run.reverseConfirmTitle')}</DialogTitle>
              <DialogDescription>{t('payroll.run.reverseConfirmMessage')}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1">
                <Label>{t('payroll.run.reversalReason')}</Label>
                <Input
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Enter reason for reversal..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReverseDialog(false)}>{t('common.cancel')}</Button>
              <Button variant="destructive" onClick={handleReverse} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('payroll.run.reverseRun')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
