import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { payrollApi, PayrollRecord } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  RefreshCw,
  Loader2,
  Users,
  DollarSign,
  TrendingDown,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Play,
  FileText,
  Eye,
  Edit,
  Trash2,
  Download,
  Calculator,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export default function PayrollListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState({
    totalGrossSalary: 0,
    totalNetPay: 0,
    totalPAYE: 0,
    totalRSSB: 0,
    employeeCount: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(20);

  // Filters
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    employeeId: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    nationalId: '',
    bankName: '',
    bankAccount: '',
    employmentType: 'full-time' as const,
    basicSalary: 0,
    transportAllowance: 0,
    housingAllowance: 0,
    otherAllowances: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    notes: '',
  });

  // Live calculations
  const [calculations, setCalculations] = useState({
    grossSalary: 0,
    paye: 0,
    rssbEmployeePension: 0,
    rssbEmployeeMaternity: 0,
    rssbEmployerPension: 0,
    rssbEmployerMaternity: 0,
    occupationalHazard: 0,
    totalDeductions: 0,
    netPay: 0,
    totalEmployerCost: 0,
  });

  // Recalculate whenever salary fields change
  useEffect(() => {
    const basic = createForm.basicSalary || 0;
    const transport = createForm.transportAllowance || 0;
    const housing = createForm.housingAllowance || 0;
    const other = createForm.otherAllowances || 0;
    const gross = basic + transport + housing + other;

    // Rwanda PAYE 2025 brackets
    let paye = 0;
    if (gross > 200000) {
      paye = 4000 + 20000 + (gross - 200000) * 0.30;
    } else if (gross > 100000) {
      paye = 4000 + (gross - 100000) * 0.20;
    } else if (gross > 60000) {
      paye = (gross - 60000) * 0.10;
    }
    paye = Math.round(paye * 100) / 100;

    const rssbEmployeePension = Math.round(gross * 0.06 * 100) / 100;
    const rssbEmployeeMaternity = Math.round(gross * 0.003 * 100) / 100;
    const rssbEmployerPension = Math.round(gross * 0.06 * 100) / 100;
    const rssbEmployerMaternity = Math.round(gross * 0.003 * 100) / 100;
    const occupationalHazard = Math.round(gross * 0.02 * 100) / 100;

    const totalDeductions = paye + rssbEmployeePension + rssbEmployeeMaternity;
    const netPay = Math.round((gross - totalDeductions) * 100) / 100;
    const totalEmployerCost = Math.round(
      (gross + rssbEmployerPension + rssbEmployerMaternity + occupationalHazard) * 100
    ) / 100;

    setCalculations({
      grossSalary: gross,
      paye,
      rssbEmployeePension,
      rssbEmployeeMaternity,
      rssbEmployerPension,
      rssbEmployerMaternity,
      occupationalHazard,
      totalDeductions,
      netPay,
      totalEmployerCost,
    });
  }, [createForm.basicSalary, createForm.transportAllowance, createForm.housingAllowance, createForm.otherAllowances]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterMonth) params.month = parseInt(filterMonth);
      if (filterYear) params.year = parseInt(filterYear);
      if (filterStatus) params.status = filterStatus;
      if (searchQuery) params.search = searchQuery;
      params.page = currentPage;
      params.limit = limit;

      const response = await payrollApi.getAll(params);
      if (response.success) {
        setRecords(response.data || []);
        if (response.pagination) {
          setTotalCount(response.pagination.total || 0);
          setTotalPages(response.pagination.pages || 1);
        }
        if (response.summary) {
          setSummary(response.summary);
        }
      }
    } catch (error) {
      console.error('[PayrollListPage] Failed to fetch:', error);
      toast.error(t('payroll.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear, filterStatus, searchQuery, currentPage, limit, t]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleCreate = async () => {
    if (!createForm.firstName || !createForm.lastName || !createForm.employeeId) {
      toast.error('Please fill in all required employee fields');
      return;
    }
    if (createForm.basicSalary <= 0) {
      toast.error('Basic salary must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const response = await payrollApi.create({
        employee: {
          employeeId: createForm.employeeId,
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          email: createForm.email || undefined,
          phone: createForm.phone || undefined,
          department: createForm.department || undefined,
          position: createForm.position || undefined,
          nationalId: createForm.nationalId || undefined,
          bankName: createForm.bankName || undefined,
          bankAccount: createForm.bankAccount || undefined,
        },
        salary: {
          basicSalary: createForm.basicSalary,
          transportAllowance: createForm.transportAllowance,
          housingAllowance: createForm.housingAllowance,
          otherAllowances: createForm.otherAllowances,
        },
        period: { month: createForm.month, year: createForm.year },
        notes: createForm.notes || undefined,
      });

      if (response.success) {
        toast.success(t('payroll.messages.created'));
        setShowCreateDialog(false);
        resetCreateForm();
        fetchRecords();
      }
    } catch (error: any) {
      console.error('[PayrollListPage] Create error:', error);
      toast.error(error?.message || t('payroll.messages.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      const response = await payrollApi.delete(selectedRecord._id);
      if (response.success) {
        toast.success(t('payroll.messages.deleted'));
        setShowDeleteDialog(false);
        setSelectedRecord(null);
        fetchRecords();
      }
    } catch (error: any) {
      toast.error(error?.message || t('payroll.messages.deleteFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinaliseSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error(t('payroll.messages.noRecordsSelected'));
      return;
    }
    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      try {
        await payrollApi.finalise(id);
        successCount++;
      } catch {
        failCount++;
      }
    }
    setSubmitting(false);
    setSelectedIds(new Set());
    if (successCount > 0) toast.success(`${successCount} record(s) finalised`);
    if (failCount > 0) toast.error(`${failCount} record(s) failed to finalise`);
    fetchRecords();
  };

  const handleExport = () => {
    const dataToExport = records.map((r) => ({
      'Employee ID': r.employee.employeeId,
      'First Name': r.employee.firstName,
      'Last Name': r.employee.lastName,
      Department: r.employee.department || '',
      Position: r.employee.position || '',
      'Basic Salary': r.salary.basicSalary,
      'Transport Allowance': r.salary.transportAllowance,
      'Housing Allowance': r.salary.housingAllowance,
      'Other Allowances': r.salary.otherAllowances,
      'Gross Salary': r.salary.grossSalary,
      PAYE: r.deductions.paye,
      'RSSB Employee': r.deductions.rssbEmployeePension + r.deductions.rssbEmployeeMaternity,
      'RSSB Employer': (r.contributions?.rssbEmployerPension || 0) + (r.contributions?.rssbEmployerMaternity || 0),
      'Net Pay': r.netPay,
      Status: r.record_status || r.payment?.status || 'draft',
      Period: `${r.period.monthName} ${r.period.year}`,
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `payroll_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const resetCreateForm = () => {
    setCreateForm({
      firstName: '', lastName: '', employeeId: '', email: '', phone: '',
      department: '', position: '', nationalId: '', bankName: '', bankAccount: '',
      employmentType: 'full-time', basicSalary: 0, transportAllowance: 0,
      housingAllowance: 0, otherAllowances: 0,
      month: new Date().getMonth() + 1, year: new Date().getFullYear(), notes: '',
    });
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map((r) => r._id)));
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(amount || 0);

  const getStatusBadge = (record: PayrollRecord) => {
    const status = record.record_status || record.payment?.status || 'draft';
    const config: Record<string, { className: string }> = {
      draft: { className: 'bg-gray-100 text-gray-700 border-gray-300' },
      pending: { className: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
      finalised: { className: 'bg-blue-100 text-blue-700 border-blue-300' },
      paid: { className: 'bg-green-100 text-green-700 border-green-300' },
      processed: { className: 'bg-green-100 text-green-700 border-green-300' },
    };
    const { className } = config[status] || config.draft;
    return <Badge variant="outline" className={className}>{status}</Badge>;
  };

  const canFinalise = (record: PayrollRecord) => record.record_status === 'draft';
  const canEdit = (record: PayrollRecord) => record.record_status === 'draft';
  const canDelete = (record: PayrollRecord) => record.record_status === 'draft';

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('payroll.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('payroll.subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/payroll-runs')}>
              <Play className="mr-2 h-4 w-4" />
              {t('payroll.payrollRuns')}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.export')}
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('payroll.newRecord')}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {t('payroll.summary.totalEmployees')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.employeeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                {t('payroll.summary.totalGross')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalGrossSalary)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                {t('payroll.summary.totalPAYE')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalPAYE)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                {t('payroll.summary.totalRSSB')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalRSSB)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                {t('payroll.summary.totalNet')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalNetPay)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('payroll.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-10"
                />
              </div>
              <Select value={filterMonth || 'all'} onValueChange={(v) => { setFilterMonth(v === 'all' ? '' : v); setCurrentPage(1); }}>
                <SelectTrigger><SelectValue placeholder={t('payroll.month')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('payroll.allPeriods')}</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterYear || 'all'} onValueChange={(v) => { setFilterYear(v === 'all' ? '' : v); setCurrentPage(1); }}>
                <SelectTrigger><SelectValue placeholder={t('payroll.year')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('payroll.year')}</SelectItem>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus || 'all'} onValueChange={(v) => { setFilterStatus(v === 'all' ? '' : v); setCurrentPage(1); }}>
                <SelectTrigger><SelectValue placeholder={t('payroll.filterByStatus')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('payroll.allStatuses')}</SelectItem>
                  <SelectItem value="draft">{t('payroll.statuses.draft')}</SelectItem>
                  <SelectItem value="finalised">{t('payroll.statuses.finalised')}</SelectItem>
                  <SelectItem value="paid">{t('payroll.statuses.paid')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" onClick={() => { setFilterMonth(''); setFilterYear(''); setFilterStatus(''); setSearchQuery(''); setCurrentPage(1); }}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('common.clearFilters')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
            <Button size="sm" onClick={handleFinaliseSelected} disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              {t('payroll.finaliseSelected')}
            </Button>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No payroll records found</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('payroll.newRecord')}
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={records.length > 0 && selectedIds.size === records.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </TableHead>
                      <TableHead>{t('payroll.employeeName')}</TableHead>
                      <TableHead>{t('payroll.employeeId')}</TableHead>
                      <TableHead className="text-right">{t('payroll.grossSalary')}</TableHead>
                      <TableHead className="text-right">{t('payroll.paye')}</TableHead>
                      <TableHead className="text-right">{t('payroll.rssbEmployee')}</TableHead>
                      <TableHead className="text-right">{t('payroll.rssbEmployer')}</TableHead>
                      <TableHead className="text-right">{t('payroll.netPay')}</TableHead>
                      <TableHead>{t('payroll.status')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell>
                          {canFinalise(record) && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(record._id)}
                              onChange={() => toggleSelect(record._id)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {record.employee.firstName} {record.employee.lastName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{record.employee.employeeId}</TableCell>
                        <TableCell className="text-right">{formatCurrency(record.salary.grossSalary)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(record.deductions.paye)}</TableCell>
                        <TableCell className="text-right text-orange-600">
                          {formatCurrency(record.deductions.rssbEmployeePension + record.deductions.rssbEmployeeMaternity)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {formatCurrency((record.contributions?.rssbEmployerPension || 0) + (record.contributions?.rssbEmployerMaternity || 0))}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{formatCurrency(record.netPay)}</TableCell>
                        <TableCell>{getStatusBadge(record)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/payroll/${record._id}`)} title="View">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit(record) && (
                              <Button variant="ghost" size="icon" onClick={() => navigate(`/payroll/${record._id}/edit`)} title="Edit">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete(record) && (
                              <Button variant="ghost" size="icon" onClick={() => { setSelectedRecord(record); setShowDeleteDialog(true); }} title="Delete">
                                <Trash2 className="h-4 w-4 text-red-500" />
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

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('payroll.newRecord')}</DialogTitle>
              <DialogDescription>Create a new payroll record. Calculated fields update automatically.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Employee Information */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" /> {t('payroll.form.employeeInformation')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>{t('payroll.form.firstName')} *</Label>
                    <Input value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.lastName')} *</Label>
                    <Input value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.employeeId')} *</Label>
                    <Input value={createForm.employeeId} onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.email')}</Label>
                    <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.phone')}</Label>
                    <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.department')}</Label>
                    <Input value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.position')}</Label>
                    <Input value={createForm.position} onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.nationalId')}</Label>
                    <Input value={createForm.nationalId} onChange={(e) => setCreateForm({ ...createForm, nationalId: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.employmentType')}</Label>
                    <Select value={createForm.employmentType} onValueChange={(v: any) => setCreateForm({ ...createForm, employmentType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">{t('payroll.form.employmentTypes.full-time')}</SelectItem>
                        <SelectItem value="part-time">{t('payroll.form.employmentTypes.part-time')}</SelectItem>
                        <SelectItem value="contract">{t('payroll.form.employmentTypes.contract')}</SelectItem>
                        <SelectItem value="intern">{t('payroll.form.employmentTypes.intern')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.bankName')}</Label>
                    <Input value={createForm.bankName} onChange={(e) => setCreateForm({ ...createForm, bankName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.bankAccount')}</Label>
                    <Input value={createForm.bankAccount} onChange={(e) => setCreateForm({ ...createForm, bankAccount: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Period */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> {t('payroll.form.periodInformation')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>{t('payroll.form.payMonth')} *</Label>
                    <Select value={String(createForm.month)} onValueChange={(v) => setCreateForm({ ...createForm, month: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.payYear')} *</Label>
                    <Select value={String(createForm.year)} onValueChange={(v) => setCreateForm({ ...createForm, year: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Salary */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> {t('payroll.form.salaryInformation')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label>{t('payroll.form.basicSalary')} *</Label>
                    <Input type="number" min="0" value={createForm.basicSalary || ''} onChange={(e) => setCreateForm({ ...createForm, basicSalary: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.transportAllowance')}</Label>
                    <Input type="number" min="0" value={createForm.transportAllowance || ''} onChange={(e) => setCreateForm({ ...createForm, transportAllowance: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.housingAllowance')}</Label>
                    <Input type="number" min="0" value={createForm.housingAllowance || ''} onChange={(e) => setCreateForm({ ...createForm, housingAllowance: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.otherAllowances')}</Label>
                    <Input type="number" min="0" value={createForm.otherAllowances || ''} onChange={(e) => setCreateForm({ ...createForm, otherAllowances: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>

              {/* Calculated Fields */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> {t('payroll.form.calculatedFields')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('payroll.form.grossSalaryCalc')}</p>
                    <p className="text-lg font-bold">{formatCurrency(calculations.grossSalary)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('payroll.form.payeCalc')}</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(calculations.paye)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('payroll.form.rssbEmployeeCalc')}</p>
                    <p className="text-lg font-bold text-orange-600">{formatCurrency(calculations.rssbEmployeePension)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('payroll.form.rssbEmployeeMaternityCalc')}</p>
                    <p className="text-lg font-bold text-orange-600">{formatCurrency(calculations.rssbEmployeeMaternity)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('payroll.form.totalDeductionsCalc')}</p>
                    <p className="text-lg font-bold text-red-700">{formatCurrency(calculations.totalDeductions)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('payroll.form.netPayCalc')}</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(calculations.netPay)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('payroll.form.rssbEmployerCalc')}</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(calculations.rssbEmployerPension)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('payroll.form.totalEmployerCostCalc')}</p>
                    <p className="text-lg font-bold text-purple-600">{formatCurrency(calculations.totalEmployerCost)}</p>
                  </div>
                </div>
                {/* Tax brackets reference */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('payroll.form.taxBrackets')} (Rwanda 2025):</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <span>0 - 60,000: <strong>0%</strong></span>
                    <span>60,001 - 100,000: <strong>10%</strong></span>
                    <span>100,001 - 200,000: <strong>20%</strong></span>
                    <span>Above 200,000: <strong>30%</strong></span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label>{t('payroll.form.notes')}</Label>
                <Input value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Optional notes..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('common.delete')}</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the payroll record for{' '}
                <strong>{selectedRecord?.employee.firstName} {selectedRecord?.employee.lastName}</strong>?
              </DialogDescription>
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
      </div>
    </Layout>
  );
}
