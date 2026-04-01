import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { budgetsApi, Budget } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Lock,
  Power,
  Loader2,
  AlertCircle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
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
import { Textarea } from '@/app/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { toast } from 'sonner';

interface SummaryData {
  budgets: Array<{
    _id: string;
    budgetId: string;
    name: string;
    type: string;
    budgetedAmount: number;
    actualAmount: number;
    variance: number;
    variancePercent: number;
    utilization: number;
    isOnTrack: boolean;
  }>;
  totals: {
    totalBudgeted: number;
    totalActual: number;
    totalVariance: number;
  };
  status: {
    onTrack: number;
    exceeded: number;
    total: number;
  };
  pendingApprovals: number;
  draftBudgets: number;
}

export default function BudgetsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(20);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    fiscal_year: '',
    type: '',
  });

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Clone form
  const [cloneForm, setCloneForm] = useState({
    newPeriodStart: '',
    newPeriodEnd: '',
    newName: '',
  });

  // Reject form
  const [rejectReason, setRejectReason] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit,
      };
      if (filters.status) params.status = filters.status;
      if (filters.fiscal_year) params.fiscal_year = filters.fiscal_year;
      if (filters.type) params.type = filters.type;
      if (searchQuery) params.search = searchQuery;

      const response: any = await budgetsApi.getAll(params);
      if (response.success) {
        setBudgets(response.data || []);
        setTotalCount(response.pagination?.total || 0);
        setTotalPages(response.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('[BudgetsListPage] Failed to fetch budgets:', error);
      toast.error(t('budgets.errors.fetchFailed', 'Failed to load budgets'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, filters, searchQuery, t]);

  const fetchSummary = useCallback(async () => {
    try {
      const response: any = await budgetsApi.getSummary();
      if (response.success) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error('[BudgetsListPage] Failed to fetch summary:', error);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
    fetchSummary();
  }, [fetchBudgets, fetchSummary]);

  const handleDeleteBudget = async () => {
    if (!selectedBudget) return;
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.delete(selectedBudget._id);
      if (response.success) {
        toast.success(t('budgets.messages.deleted', 'Budget deleted successfully'));
        setShowDeleteDialog(false);
        setSelectedBudget(null);
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || t('budgets.errors.deleteFailed', 'Failed to delete budget'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (budget: Budget) => {
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.approve(budget._id);
      if (response.success) {
        toast.success(t('budgets.messages.approved', 'Budget approved successfully'));
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || t('budgets.errors.approveFailed', 'Failed to approve budget'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBudget) return;
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.reject(selectedBudget._id, rejectReason);
      if (response.success) {
        toast.success(t('budgets.messages.rejected', 'Budget rejected'));
        setShowRejectDialog(false);
        setSelectedBudget(null);
        setRejectReason('');
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || t('budgets.errors.rejectFailed', 'Failed to reject budget'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLock = async () => {
    if (!selectedBudget) return;
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.lock(selectedBudget._id);
      if (response.success) {
        toast.success(t('budgets.messages.locked', 'Budget locked successfully'));
        setShowLockDialog(false);
        setSelectedBudget(null);
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || t('budgets.errors.lockFailed', 'Failed to lock budget'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!selectedBudget) return;
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.close(selectedBudget._id, closeNotes);
      if (response.success) {
        toast.success(t('budgets.messages.closed', 'Budget closed successfully'));
        setShowCloseDialog(false);
        setSelectedBudget(null);
        setCloseNotes('');
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || t('budgets.errors.closeFailed', 'Failed to close budget'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClone = async () => {
    if (!selectedBudget) return;
    if (!cloneForm.newPeriodStart || !cloneForm.newPeriodEnd) {
      toast.error(t('budgets.errors.periodRequired', 'Period dates are required'));
      return;
    }
    setSubmitting(true);
    try {
      const response: any = await budgetsApi.clone(selectedBudget._id, {
        newPeriodStart: cloneForm.newPeriodStart,
        newPeriodEnd: cloneForm.newPeriodEnd,
        newName: cloneForm.newName || undefined,
      });
      if (response.success) {
        toast.success(t('budgets.messages.cloned', 'Budget cloned successfully'));
        setShowCloneDialog(false);
        setSelectedBudget(null);
        setCloneForm({ newPeriodStart: '', newPeriodEnd: '', newName: '' });
        fetchBudgets();
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || t('budgets.errors.cloneFailed', 'Failed to clone budget'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    try {
      const dataToExport = budgets.map((b) => ({
        Name: b.name,
        Type: b.type,
        Status: b.status,
        'Fiscal Year': b.fiscal_year || '',
        Amount: b.amount,
        Description: b.description || '',
        'Period Start': b.periodStart ? new Date(b.periodStart).toLocaleDateString() : '',
        'Period End': b.periodEnd ? new Date(b.periodEnd).toLocaleDateString() : '',
        'Created At': b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '',
      }));
      // Simple CSV export
      const headers = Object.keys(dataToExport[0] || {});
      const csv = [
        headers.join(','),
        ...dataToExport.map((row) => headers.map((h) => `"${(row as any)[h]}"`).join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budgets_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('common.exported', 'Exported successfully'));
    } catch (error) {
      toast.error(t('common.exportFailed', 'Export failed'));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: string; className: string }> = {
      draft: { variant: 'outline', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
      active: { variant: 'default', className: 'bg-blue-500' },
      approved: { variant: 'default', className: 'bg-green-500' },
      locked: { variant: 'secondary', className: 'bg-amber-500 text-white' },
      closed: { variant: 'outline', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      cancelled: { variant: 'destructive', className: '' },
    };
    const { variant, className } = config[status] || config.draft;
    return (
      <Badge variant={variant as any} className={className}>
        {t(`budgets.status.${status}`, status)}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { className: string }> = {
      revenue: { className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
      expense: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      profit: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    };
    const { className } = config[type] || config.expense;
    return (
      <Badge variant="outline" className={className}>
        {t(`budgets.types.${type}`, type)}
      </Badge>
    );
  };

  const currentYear = new Date().getFullYear();
  const fiscalYears = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  // Action eligibility
  const canEdit = (b: Budget) => b.status === 'draft';
  const canDelete = (b: Budget) => b.status === 'draft';
  const canApprove = (b: Budget) => b.status === 'draft';
  const canReject = (b: Budget) => b.status === 'draft' || b.status === 'approved';
  const canLock = (b: Budget) => b.status === 'approved';
  const canClose = (b: Budget) => b.status === 'approved' || b.status === 'locked';
  const canClone = () => true;

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <DollarSign className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{t('budgets.title', 'Budgets')}</h1>
              <p className="text-muted-foreground">
                {t('budgets.subtitle', 'Manage budgets and track spending')}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.export', 'Export')}
            </Button>
            <Button onClick={() => navigate('/budgets/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('budgets.addBudget', 'Add Budget')}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  {t('budgets.totalBudgeted', 'Total Budgeted')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.totals.totalBudgeted)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.status.total} {t('budgets.budgets', 'budgets')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  {t('budgets.totalActual', 'Total Actual')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.totals.totalActual)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('budgets.spent', 'Spent')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  {summary.totals.totalVariance >= 0 ? (
                    <TrendingDown className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  )}
                  {t('budgets.totalVariance', 'Total Variance')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    summary.totals.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(summary.totals.totalVariance)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.totals.totalVariance >= 0
                    ? t('budgets.underBudget', 'Under budget')
                    : t('budgets.overBudget', 'Over budget')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  {t('budgets.statusSummary', 'Status')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  <div>
                    <div className="text-xl font-bold text-green-600">
                      {summary.status.onTrack}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('budgets.onTrack', 'On Track')}
                    </p>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-red-600">
                      {summary.status.exceeded}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('budgets.exceeded', 'Exceeded')}
                    </p>
                  </div>
                </div>
                {summary.pendingApprovals > 0 && (
                  <Badge variant="outline" className="mt-2 bg-yellow-50 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    {summary.pendingApprovals} {t('budgets.pending', 'pending')}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('budgets.searchPlaceholder', 'Search budgets...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchBudgets()}
                  className="pl-10"
                />
              </div>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value === 'all' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('budgets.filterStatus', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('budgets.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="draft">{t('budgets.status.draft', 'Draft')}</SelectItem>
                  <SelectItem value="active">{t('budgets.status.active', 'Active')}</SelectItem>
                  <SelectItem value="approved">{t('budgets.status.approved', 'Approved')}</SelectItem>
                  <SelectItem value="locked">{t('budgets.status.locked', 'Locked')}</SelectItem>
                  <SelectItem value="closed">{t('budgets.status.closed', 'Closed')}</SelectItem>
                  <SelectItem value="cancelled">{t('budgets.status.cancelled', 'Cancelled')}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  setFilters({ ...filters, type: value === 'all' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('budgets.filterType', 'Type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('budgets.allTypes', 'All Types')}</SelectItem>
                  <SelectItem value="expense">{t('budgets.types.expense', 'Expense')}</SelectItem>
                  <SelectItem value="revenue">{t('budgets.types.revenue', 'Revenue')}</SelectItem>
                  <SelectItem value="profit">{t('budgets.types.profit', 'Profit')}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.fiscal_year}
                onValueChange={(value) =>
                  setFilters({ ...filters, fiscal_year: value === 'all' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('budgets.filterYear', 'Fiscal Year')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('budgets.allYears', 'All Years')}</SelectItem>
                  {fiscalYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setFilters({ status: '', fiscal_year: '', type: '' });
                  setSearchQuery('');
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('common.clearFilters', 'Clear Filters')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Budgets Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : budgets.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {t('budgets.noBudgets', 'No budgets found')}
                </p>
                <Button className="mt-4" onClick={() => navigate('/budgets/new')}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('budgets.createFirst', 'Create First Budget')}
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('budgets.name', 'Name')}</TableHead>
                      <TableHead>{t('budgets.type', 'Type')}</TableHead>
                      <TableHead>{t('budgets.fiscalYear', 'Fiscal Year')}</TableHead>
                      <TableHead>{t('budgets.period', 'Period')}</TableHead>
                      <TableHead className="text-right">
                        {t('budgets.amount', 'Amount')}
                      </TableHead>
                      <TableHead>{t('budgets.statusLabel', 'Status')}</TableHead>
                      <TableHead className="text-right">
                        {t('common.actions', 'Actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgets.map((budget) => (
                      <TableRow key={budget._id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{budget.name}</div>
                            {budget.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {budget.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(budget.type)}</TableCell>
                        <TableCell className="font-medium">{budget.fiscal_year || '-'}</TableCell>
                        <TableCell>
                          {budget.periodStart || budget.periodEnd ? (
                            <div className="text-xs">
                              <div>{formatDate(budget.periodStart)}</div>
                              <div className="text-muted-foreground">
                                to {formatDate(budget.periodEnd)}
                              </div>
                            </div>
                          ) : (
                            <span className="capitalize text-xs text-muted-foreground">{budget.periodType}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(budget.amount as number)}
                        </TableCell>
                        <TableCell>{getStatusBadge(budget.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/budgets/${budget._id}`)}
                              title={t('common.view', 'View')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/budgets/${budget._id}/edit`)}
                                title={t('common.edit', 'Edit')}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {canApprove(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(budget)}
                                title={t('budgets.approve', 'Approve')}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {canReject(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBudget(budget);
                                  setShowRejectDialog(true);
                                }}
                                title={t('budgets.reject', 'Reject')}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                            {canLock(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBudget(budget);
                                  setShowLockDialog(true);
                                }}
                                title={t('budgets.lock', 'Lock')}
                              >
                                <Lock className="h-4 w-4 text-amber-600" />
                              </Button>
                            )}
                            {canClose(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBudget(budget);
                                  setShowCloseDialog(true);
                                }}
                                title={t('budgets.close', 'Close')}
                              >
                                <Power className="h-4 w-4 text-slate-600" />
                              </Button>
                            )}
                            {canClone() && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBudget(budget);
                                  setCloneForm({
                                    newName: `${budget.name} (Copy)`,
                                    newPeriodStart: '',
                                    newPeriodEnd: '',
                                  });
                                  setShowCloneDialog(true);
                                }}
                                title={t('budgets.clone', 'Clone')}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete(budget) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBudget(budget);
                                  setShowDeleteDialog(true);
                                }}
                                title={t('common.delete', 'Delete')}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
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
                    {t('common.showing', 'Showing')}{' '}
                    {(currentPage - 1) * limit + 1}{' '}
                    {t('common.to', 'to')}{' '}
                    {Math.min(currentPage * limit, totalCount)}{' '}
                    {t('common.of', 'of')} {totalCount}{' '}
                    {t('budgets.budgets', 'budgets')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm">
                      {t('common.page', 'Page')} {currentPage} {t('common.of', 'of')}{' '}
                      {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Select
                      value={limit.toString()}
                      onValueChange={(val) => {
                        setLimit(parseInt(val));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('budgets.deleteTitle', 'Delete Budget')}</DialogTitle>
              <DialogDescription>
                {t('budgets.deleteDescription', 'Are you sure you want to delete this budget? All budget lines will be removed. This action cannot be undone.')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDeleteBudget} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.delete', 'Delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('budgets.rejectTitle', 'Reject Budget')}</DialogTitle>
              <DialogDescription>
                {t('budgets.rejectDescription', 'Provide a reason for rejecting this budget (optional).')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>{t('budgets.rejectionReason', 'Reason')}</Label>
              <Textarea
                className="mt-2"
                placeholder={t('budgets.rejectionReasonPlaceholder', 'Reason for rejection')}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button variant="destructive" onClick={handleReject} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('budgets.reject', 'Reject')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lock Dialog */}
        <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('budgets.lockTitle', 'Lock Budget')}</DialogTitle>
              <DialogDescription>
                {t('budgets.lockDescription', 'Lock this budget to prevent further changes. This action can only be reversed by an administrator.')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLockDialog(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleLock} disabled={submitting} className="bg-amber-500 hover:bg-amber-600">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('budgets.lock', 'Lock')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Close Dialog */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('budgets.closeTitle', 'Close Budget')}</DialogTitle>
              <DialogDescription>
                {t('budgets.closeDescription', 'Close this budget to finalize it. No further modifications will be possible.')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>{t('budgets.closeNotes', 'Close Notes')}</Label>
              <Textarea
                className="mt-2"
                placeholder={t('budgets.closeNotesPlaceholder', 'Optional closing notes')}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleClose} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('budgets.close', 'Close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clone Dialog */}
        <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('budgets.cloneTitle', 'Clone Budget')}</DialogTitle>
              <DialogDescription>
                {t('budgets.cloneDescription', 'Create a copy of this budget for a new period.')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{t('budgets.newName', 'New Name')}</Label>
                <Input
                  placeholder={selectedBudget ? `${selectedBudget.name} (Copy)` : 'Budget Name (Copy)'}
                  value={cloneForm.newName}
                  onChange={(e) => setCloneForm({ ...cloneForm, newName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('budgets.newPeriodStart', 'New Period Start')} *</Label>
                  <Input
                    type="date"
                    value={cloneForm.newPeriodStart}
                    onChange={(e) => setCloneForm({ ...cloneForm, newPeriodStart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('budgets.newPeriodEnd', 'New Period End')} *</Label>
                  <Input
                    type="date"
                    value={cloneForm.newPeriodEnd}
                    onChange={(e) => setCloneForm({ ...cloneForm, newPeriodEnd: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleClone} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('budgets.clone', 'Clone')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
