import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { payrollRunApi, chartOfAccountsApi, bankAccountsApi, PayrollRun, PayrollRunPreview, BankAccount } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  RotateCcw,
  FileText,
  DollarSign,
  Users,
  Building2,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
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
import { Input } from '@/app/components/ui/input';
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

export default function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<PayrollRun | null>(null);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<PayrollRunPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Post dialog
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reverse dialog
  const [showReverseDialog, setShowReverseDialog] = useState(false);
  const [reversalReason, setReversalReason] = useState('');

  const [chartAccounts, setChartAccounts] = useState<Array<{ _id: string; code: string; name: string; type: string }>>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [createForm, setCreateForm] = useState({
    pay_period_start: '',
    pay_period_end: '',
    payment_date: '',
    salary_account_id: '',
    tax_payable_account_id: '',
    bank_account_id: '',
    other_deductions_account_id: '',
    notes: '',
  });

  useEffect(() => {
    if (id && id !== 'new') {
      fetchRun();
    } else {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchRun = async () => {
    if (!id || id === 'new') return;
    setLoading(true);
    try {
      const response = await payrollRunApi.getById(id);
      if (response.success) {
        setRun(response.data);
      }
    } catch (error) {
      console.error('[PayrollRunDetailPage] Failed to fetch:', error);
      toast.error(t('payroll.messages.runLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [accountsRes, bankRes] = await Promise.all([
        chartOfAccountsApi.getAll(),
        bankAccountsApi.getAll(),
      ]);
      if (accountsRes.success) setChartAccounts(accountsRes.data || []);
      if (bankRes.success) setBankAccounts(bankRes.data || []);
    } catch (error) {
      console.error('[PayrollRunDetailPage] Failed to fetch dropdown data:', error);
    }
  };

  const handlePreview = async () => {
    if (!run) return;
    setPreviewLoading(true);
    try {
      const salaryAccountId = typeof run.salary_account_id === 'object' ? run.salary_account_id._id : run.salary_account_id;
      const taxAccountId = typeof run.tax_payable_account_id === 'object' ? run.tax_payable_account_id._id : run.tax_payable_account_id;
      const bankAccountId = typeof run.bank_account_id === 'object' ? run.bank_account_id._id : run.bank_account_id;
      const otherDedId = run.other_deductions_account_id
        ? (typeof run.other_deductions_account_id === 'object' ? run.other_deductions_account_id._id : run.other_deductions_account_id)
        : undefined;

      const response = await payrollRunApi.preview({
        pay_period_start: run.pay_period_start,
        pay_period_end: run.pay_period_end,
        salary_account_id: salaryAccountId,
        tax_payable_account_id: taxAccountId,
        bank_account_id: bankAccountId,
        other_deductions_account_id: otherDedId,
      });
      if (response.success) {
        setPreview(response.data);
        setShowPreview(true);
      }
    } catch (error: any) {
      toast.error(error?.message || t('payroll.messages.previewFailed'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePost = async () => {
    if (!run) return;
    setSubmitting(true);
    try {
      const response = await payrollRunApi.post(run._id);
      if (response.success) {
        toast.success(t('payroll.messages.runPosted'));
        setShowPostDialog(false);
        fetchRun();
      }
    } catch (error: any) {
      toast.error(error?.message || t('payroll.messages.runPostFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverse = async () => {
    if (!run) return;
    setSubmitting(true);
    try {
      const response = await payrollRunApi.reverse(run._id, {
        reason: reversalReason || undefined,
      });
      if (response.success) {
        toast.success(t('payroll.messages.runReversed'));
        setShowReverseDialog(false);
        setReversalReason('');
        fetchRun();
      }
    } catch (error: any) {
      toast.error(error?.message || t('payroll.messages.runReverseFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateFromRecords = async () => {
    if (!createForm.pay_period_start || !createForm.pay_period_end || !createForm.payment_date ||
        !createForm.salary_account_id || !createForm.tax_payable_account_id || !createForm.bank_account_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const response = await payrollRunApi.createFromRecords({
        pay_period_start: createForm.pay_period_start,
        pay_period_end: createForm.pay_period_end,
        payment_date: createForm.payment_date,
        salary_account_id: createForm.salary_account_id,
        tax_payable_account_id: createForm.tax_payable_account_id,
        bank_account_id: createForm.bank_account_id,
        other_deductions_account_id: createForm.other_deductions_account_id || undefined,
        notes: createForm.notes || undefined,
      });
      if (response.success) {
        toast.success(t('payroll.messages.runCreated'));
        navigate(`/payroll-runs/${response.data._id}`);
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string }> = {
      draft: { className: 'bg-gray-100 text-gray-700 border-gray-300' },
      posted: { className: 'bg-green-100 text-green-700 border-green-300' },
      reversed: { className: 'bg-red-100 text-red-700 border-red-300' },
    };
    const { className } = config[status] || config.draft;
    return <Badge variant="outline" className={className}>{status}</Badge>;
  };

  const getAccountLabel = (account: any) => {
    if (!account) return '-';
    if (typeof account === 'object') return `${account.code || ''} - ${account.name || ''}`;
    return account;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  // If no ID, show create from records
  if (id === 'new') {
    return (
      <Layout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/payroll-runs')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t('payroll.run.createFromRecords')}</h1>
              <p className="text-sm text-muted-foreground">{t('payroll.run.subtitle')}</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payroll Run Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Pay Period Start *</Label>
                  <Input type="date" value={createForm.pay_period_start} onChange={(e) => setCreateForm({ ...createForm, pay_period_start: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Pay Period End *</Label>
                  <Input type="date" value={createForm.pay_period_end} onChange={(e) => setCreateForm({ ...createForm, pay_period_end: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{t('payroll.run.paymentDateLabel')} *</Label>
                  <Input type="date" value={createForm.payment_date} onChange={(e) => setCreateForm({ ...createForm, payment_date: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{t('payroll.run.selectBankAccount')} *</Label>
                  <Select value={createForm.bank_account_id} onValueChange={(v) => setCreateForm({ ...createForm, bank_account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select bank account..." /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((ba) => (
                        <SelectItem key={ba._id} value={ba._id}>{ba.name} ({ba.bankName || ba.accountType})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t('payroll.run.selectSalaryAccount')} *</Label>
                  <Select value={createForm.salary_account_id} onValueChange={(v) => setCreateForm({ ...createForm, salary_account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select salary account..." /></SelectTrigger>
                    <SelectContent>
                      {chartAccounts.filter((a) => a.type === 'expense').map((a) => (
                        <SelectItem key={a._id} value={a._id}>{a.code} - {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t('payroll.run.selectTaxAccount')} *</Label>
                  <Select value={createForm.tax_payable_account_id} onValueChange={(v) => setCreateForm({ ...createForm, tax_payable_account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select tax payable account..." /></SelectTrigger>
                    <SelectContent>
                      {chartAccounts.filter((a) => a.type === 'liability').map((a) => (
                        <SelectItem key={a._id} value={a._id}>{a.code} - {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t('payroll.run.selectDeductionsAccount')}</Label>
                  <Select value={createForm.other_deductions_account_id} onValueChange={(v) => setCreateForm({ ...createForm, other_deductions_account_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                    <SelectContent>
                      {chartAccounts.filter((a) => a.type === 'liability').map((a) => (
                        <SelectItem key={a._id} value={a._id}>{a.code} - {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>{t('payroll.form.notes')}</Label>
                <Input value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Optional notes..." />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => navigate('/payroll-runs')}>{t('common.cancel')}</Button>
                <Button onClick={handleCreateFromRecords} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('payroll.run.createFromRecords')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!run) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex flex-col items-center py-12">
            <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Payroll run not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/payroll-runs')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payroll Runs
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/payroll-runs')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono">{run.reference_no}</h1>
                {getStatusBadge(run.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(run.pay_period_start)} - {formatDate(run.pay_period_end)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {run.status === 'draft' && (
              <>
                <Button variant="outline" onClick={handlePreview} disabled={previewLoading}>
                  {previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                  {t('payroll.run.previewJournal')}
                </Button>
                <Button onClick={() => setShowPostDialog(true)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('payroll.run.postRun')}
                </Button>
              </>
            )}
            {run.status === 'posted' && (
              <Button variant="outline" onClick={() => setShowReverseDialog(true)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('payroll.run.reverseRun')}
              </Button>
            )}
          </div>
        </div>

        {/* Aggregated Totals */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" /> {t('payroll.employees')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{run.employee_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" /> {t('payroll.totalGross')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(run.total_gross)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">{t('payroll.totalPAYE')} + RSSB</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(run.total_tax + run.total_other_deductions)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">{t('payroll.totalNet')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(run.total_net)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('payroll.paymentDate')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{formatDate(run.payment_date)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Account References */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Account References
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Bank Account</p>
                <p className="font-medium">{getAccountLabel(run.bank_account_id)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Salary Expense</p>
                <p className="font-medium">{getAccountLabel(run.salary_account_id)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tax Payable</p>
                <p className="font-medium">{getAccountLabel(run.tax_payable_account_id)}</p>
              </div>
              {run.other_deductions_account_id && (
                <div>
                  <p className="text-xs text-muted-foreground">Other Deductions</p>
                  <p className="font-medium">{getAccountLabel(run.other_deductions_account_id)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Linked Journal Entry */}
        {run.journal_entry_id && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" /> {t('payroll.run.linkedJournalEntry')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t('payroll.run.entryNumber')}</p>
                  <p className="font-mono font-bold">
                    {typeof run.journal_entry_id === 'object' ? (run.journal_entry_id as any).entryNumber : run.journal_entry_id}
                  </p>
                </div>
                {run.posted_by && (
                  <div>
                    <p className="text-xs text-muted-foreground">Posted By</p>
                    <p className="font-medium">{typeof run.posted_by === 'object' ? (run.posted_by as any).name : run.posted_by}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employee Lines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> {t('payroll.run.employeeLines')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('payroll.employeeName')}</TableHead>
                  <TableHead>{t('payroll.employeeId')}</TableHead>
                  <TableHead className="text-right">{t('payroll.grossSalary')}</TableHead>
                  <TableHead className="text-right">{t('payroll.paye')}</TableHead>
                  <TableHead className="text-right">{t('payroll.rssbEmployee')}</TableHead>
                  <TableHead className="text-right">{t('payroll.rssbEmployer')}</TableHead>
                  <TableHead className="text-right">{t('payroll.netPay')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{line.employee_name}</TableCell>
                    <TableCell className="text-muted-foreground">{line.employee_id}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.gross_salary)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(line.tax_deduction)}</TableCell>
                    <TableCell className="text-right text-orange-600">{formatCurrency(line.other_deductions)}</TableCell>
                    <TableCell className="text-right text-blue-600">{formatCurrency(line.rssb_employer)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">{formatCurrency(line.net_pay)}</TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={2}>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(run.total_gross)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrency(run.total_tax)}</TableCell>
                  <TableCell className="text-right text-orange-600">{formatCurrency(run.total_other_deductions)}</TableCell>
                  <TableCell className="text-right text-blue-600">
                    {formatCurrency(run.lines.reduce((s, l) => s + (l.rssb_employer || 0), 0))}
                  </TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(run.total_net)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Notes */}
        {run.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{run.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Journal Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('payroll.run.journalPreview')}</DialogTitle>
              <DialogDescription>Preview of journal entry that will be created when posting.</DialogDescription>
            </DialogHeader>
            {preview && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Employees</p>
                    <p className="font-bold">{preview.employeeCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Debit</p>
                    <p className="font-bold">{formatCurrency(preview.lines.reduce((s, l) => s + l.debit, 0))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Credit</p>
                    <p className="font-bold">{formatCurrency(preview.lines.reduce((s, l) => s + l.credit, 0))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={preview.isBalanced ? 'default' : 'destructive'} className={preview.isBalanced ? 'bg-green-500' : ''}>
                    {preview.isBalanced ? t('payroll.run.balanced') : t('payroll.run.notBalanced')}
                  </Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('payroll.run.accountCode')}</TableHead>
                      <TableHead>{t('payroll.run.accountName')}</TableHead>
                      <TableHead>{t('payroll.run.description')}</TableHead>
                      <TableHead className="text-right">{t('payroll.run.debit')}</TableHead>
                      <TableHead className="text-right">{t('payroll.run.credit')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.lines.map((line, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{line.accountCode}</TableCell>
                        <TableCell>{line.accountName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{line.description}</TableCell>
                        <TableCell className="text-right">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</TableCell>
                        <TableCell className="text-right">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell className="text-right">{formatCurrency(preview.lines.reduce((s, l) => s + l.debit, 0))}</TableCell>
                      <TableCell className="text-right">{formatCurrency(preview.lines.reduce((s, l) => s + l.credit, 0))}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>{t('common.close')}</Button>
              {run.status === 'draft' && (
                <Button onClick={() => { setShowPreview(false); setShowPostDialog(true); }}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t('payroll.run.postRun')}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Post Confirmation Dialog */}
        <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('payroll.run.postConfirmTitle')}</DialogTitle>
              <DialogDescription>{t('payroll.run.postConfirmMessage')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPostDialog(false)}>{t('common.cancel')}</Button>
              <Button onClick={handlePost} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('payroll.run.postRun')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reverse Confirmation Dialog */}
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
