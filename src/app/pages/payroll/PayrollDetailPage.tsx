import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { payrollApi, PayrollRecord } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Loader2,
  Edit,
  Trash2,
  Save,
  X,
  Calculator,
  FileText,
  AlertCircle,
  User,
  DollarSign,
  TrendingDown,
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
import { toast } from 'sonner';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export default function PayrollDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditRoute = location.pathname.endsWith('/edit');
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<PayrollRecord | null>(null);
  const [editing, setEditing] = useState(isEditRoute);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({
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
    basicSalary: 0,
    transportAllowance: 0,
    housingAllowance: 0,
    otherAllowances: 0,
    month: 1,
    year: new Date().getFullYear(),
    notes: '',
  });

  // Live calculations for edit form
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

  useEffect(() => {
    fetchRecord();
  }, [id]);

  useEffect(() => {
    const basic = editForm.basicSalary || 0;
    const transport = editForm.transportAllowance || 0;
    const housing = editForm.housingAllowance || 0;
    const other = editForm.otherAllowances || 0;
    const gross = basic + transport + housing + other;

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
  }, [editForm.basicSalary, editForm.transportAllowance, editForm.housingAllowance, editForm.otherAllowances]);

  const fetchRecord = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await payrollApi.getById(id);
      if (response.success) {
        setRecord(response.data);
        populateEditForm(response.data);
      }
    } catch (error) {
      console.error('[PayrollDetailPage] Failed to fetch:', error);
      toast.error(t('payroll.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const populateEditForm = (r: PayrollRecord) => {
    setEditForm({
      firstName: r.employee.firstName,
      lastName: r.employee.lastName,
      employeeId: r.employee.employeeId,
      email: r.employee.email || '',
      phone: r.employee.phone || '',
      department: r.employee.department || '',
      position: r.employee.position || '',
      nationalId: r.employee.nationalId || '',
      bankName: r.employee.bankName || '',
      bankAccount: r.employee.bankAccount || '',
      basicSalary: r.salary.basicSalary,
      transportAllowance: r.salary.transportAllowance,
      housingAllowance: r.salary.housingAllowance,
      otherAllowances: r.salary.otherAllowances,
      month: r.period.month,
      year: r.period.year,
      notes: r.notes || '',
    });
  };

  const handleUpdate = async () => {
    if (!record) return;
    if (!editForm.firstName || !editForm.lastName || !editForm.employeeId) {
      toast.error('Please fill in all required employee fields');
      return;
    }
    if (editForm.basicSalary <= 0) {
      toast.error('Basic salary must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const response = await payrollApi.update(record._id, {
        employee: {
          employeeId: editForm.employeeId,
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email || undefined,
          phone: editForm.phone || undefined,
          department: editForm.department || undefined,
          position: editForm.position || undefined,
          nationalId: editForm.nationalId || undefined,
          bankName: editForm.bankName || undefined,
          bankAccount: editForm.bankAccount || undefined,
        },
        salary: {
          basicSalary: editForm.basicSalary,
          transportAllowance: editForm.transportAllowance,
          housingAllowance: editForm.housingAllowance,
          otherAllowances: editForm.otherAllowances,
        },
        period: { month: editForm.month, year: editForm.year },
        notes: editForm.notes || undefined,
      });

      if (response.success) {
        toast.success(t('payroll.messages.updated') || 'Payroll record updated');
        setEditing(false);
        setRecord(response.data);
      }
    } catch (error: any) {
      console.error('[PayrollDetailPage] Update error:', error);
      toast.error(error?.message || t('payroll.messages.updateFailed') || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!record) return;
    setSubmitting(true);
    try {
      const response = await payrollApi.delete(record._id);
      if (response.success) {
        toast.success(t('payroll.messages.deleted'));
        navigate('/payroll');
      }
    } catch (error: any) {
      toast.error(error?.message || t('payroll.messages.deleteFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalise = async () => {
    if (!record) return;
    setSubmitting(true);
    try {
      const response = await payrollApi.finalise(record._id);
      if (response.success) {
        toast.success(t('payroll.messages.finalised') || 'Payroll record finalised');
        fetchRecord();
      }
    } catch (error: any) {
      toast.error(error?.message || t('payroll.messages.finaliseFailed') || 'Finalise failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(amount || 0);

  const getStatusBadge = (r: PayrollRecord) => {
    const status = r.record_status || r.payment?.status || 'draft';
    const config: Record<string, { className: string }> = {
      draft: { className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500' },
      pending: { className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700' },
      finalised: { className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700' },
      paid: { className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' },
    };
    const { className } = config[status] || config.draft;
    return <Badge variant="outline" className={className}>{status}</Badge>;
  };

  const getStatusBadgeCalc = (status: string) => {
    const config: Record<string, { className: string }> = {
      draft: { className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-500' },
      pending: { className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700' },
      finalised: { className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700' },
      paid: { className: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' },
    };
    const { className } = config[status] || config.draft;
    return <Badge variant="outline" className={className}>{status}</Badge>;
  };

  const canEdit = (r: PayrollRecord) => r.record_status === 'draft';
  const canDelete = (r: PayrollRecord) => r.record_status === 'draft';
  const canFinalise = (r: PayrollRecord) => r.record_status === 'draft';

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!record) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex flex-col items-center py-12">
            <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground dark:text-slate-400" />
            <p className="text-muted-foreground dark:text-slate-400">Payroll record not found</p>
            <Button variant="outline" className="mt-4 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700" onClick={() => navigate('/payroll')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payroll
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/payroll')} className="dark:text-slate-300 dark:hover:bg-slate-700">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold dark:text-white">
                  {record.employee.firstName} {record.employee.lastName}
                </h1>
                {getStatusBadge(record)}
              </div>
              <p className="text-sm text-muted-foreground dark:text-slate-400">
                Employee ID: {record.employee.employeeId} | {record.period.monthName} {record.period.year}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!editing && canEdit(record) && (
              <Button variant="outline" onClick={() => setEditing(true)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                <Edit className="mr-2 h-4 w-4" />
                {t('common.edit')}
              </Button>
            )}
            {canFinalise(record) && (
              <Button variant="outline" onClick={handleFinalise} disabled={submitting} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                {t('payroll.finaliseSelected') || 'Finalise'}
              </Button>
            )}
            {canDelete(record) && (
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.delete')}
              </Button>
            )}
          </div>
        </div>

        {editing ? (
          /* Edit Mode */
          <div className="space-y-6">
            {/* Employee Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" /> {t('payroll.form.employeeInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>{t('payroll.form.firstName')} *</Label>
                    <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.lastName')} *</Label>
                    <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.employeeId')} *</Label>
                    <Input value={editForm.employeeId} onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.email')}</Label>
                    <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.phone')}</Label>
                    <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.department')}</Label>
                    <Input value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.position')}</Label>
                    <Input value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.nationalId')}</Label>
                    <Input value={editForm.nationalId} onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.bankName')}</Label>
                    <Input value={editForm.bankName} onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.bankAccount')}</Label>
                    <Input value={editForm.bankAccount} onChange={(e) => setEditForm({ ...editForm, bankAccount: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Period */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" /> {t('payroll.form.periodInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>{t('payroll.form.payMonth')} *</Label>
                    <Select value={String(editForm.month)} onValueChange={(v) => setEditForm({ ...editForm, month: parseInt(v) })}>
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
                    <Select value={String(editForm.year)} onValueChange={(v) => setEditForm({ ...editForm, year: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Salary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" /> {t('payroll.form.salaryInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label>{t('payroll.form.basicSalary')} *</Label>
                    <Input type="number" min="0" value={editForm.basicSalary || ''} onChange={(e) => setEditForm({ ...editForm, basicSalary: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.transportAllowance')}</Label>
                    <Input type="number" min="0" value={editForm.transportAllowance || ''} onChange={(e) => setEditForm({ ...editForm, transportAllowance: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.housingAllowance')}</Label>
                    <Input type="number" min="0" value={editForm.housingAllowance || ''} onChange={(e) => setEditForm({ ...editForm, housingAllowance: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('payroll.form.otherAllowances')}</Label>
                    <Input type="number" min="0" value={editForm.otherAllowances || ''} onChange={(e) => setEditForm({ ...editForm, otherAllowances: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calculated Fields */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4" /> {t('payroll.form.calculatedFields')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    <p className="text-xs text-muted-foreground">{t('payroll.form.netPayCalc')}</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(calculations.netPay)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <Label>{t('payroll.form.notes')}</Label>
                  <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Optional notes..." />
                </div>
              </CardContent>
            </Card>

            {/* Edit Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditing(false); populateEditForm(record); }}>
                <X className="mr-2 h-4 w-4" />
                {t('common.cancel')}
              </Button>
              <Button onClick={handleUpdate} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {t('common.save') || 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 dark:text-slate-200">
                    <User className="h-4 w-4 text-muted-foreground dark:text-slate-400" /> Employee
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold dark:text-white">{record.employee.firstName} {record.employee.lastName}</div>
                  <p className="text-xs text-muted-foreground dark:text-slate-400">{record.employee.employeeId}</p>
                </CardContent>
              </Card>
              <Card className="dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 dark:text-slate-200">
                    <DollarSign className="h-4 w-4 text-muted-foreground dark:text-slate-400" /> Gross Salary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold dark:text-white">{formatCurrency(record.salary.grossSalary)}</div>
                </CardContent>
              </Card>
              <Card className="dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Total Deductions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(record.deductions.totalDeductions)}</div>
                </CardContent>
              </Card>
              <Card className="dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Net Pay</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(record.netPay)}</div>
                </CardContent>
              </Card>
              <Card className="dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium dark:text-slate-200">Period</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold dark:text-white">{record.period.monthName} {record.period.year}</div>
                </CardContent>
              </Card>
            </div>

            {/* Employee Details */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2 dark:text-white">
                  <User className="h-4 w-4" /> Employee Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Full Name</p>
                    <p className="font-medium dark:text-white">{record.employee.firstName} {record.employee.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Employee ID</p>
                    <p className="font-medium dark:text-white">{record.employee.employeeId}</p>
                  </div>
                  {record.employee.email && (
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">Email</p>
                      <p className="font-medium dark:text-white">{record.employee.email}</p>
                    </div>
                  )}
                  {record.employee.phone && (
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">Phone</p>
                      <p className="font-medium dark:text-white">{record.employee.phone}</p>
                    </div>
                  )}
                  {record.employee.department && (
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">Department</p>
                      <p className="font-medium dark:text-white">{record.employee.department}</p>
                    </div>
                  )}
                  {record.employee.position && (
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">Position</p>
                      <p className="font-medium dark:text-white">{record.employee.position}</p>
                    </div>
                  )}
                  {record.employee.nationalId && (
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">National ID</p>
                      <p className="font-medium dark:text-white">{record.employee.nationalId}</p>
                    </div>
                  )}
                  {record.employee.bankName && (
                    <div>
                      <p className="text-xs text-muted-foreground dark:text-slate-400">Bank</p>
                      <p className="font-medium dark:text-white">{record.employee.bankName} - {record.employee.bankAccount}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Salary Breakdown */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2 dark:text-white">
                  <DollarSign className="h-4 w-4" /> Salary Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Basic Salary</p>
                    <p className="font-medium dark:text-white">{formatCurrency(record.salary.basicSalary)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Transport Allowance</p>
                    <p className="font-medium dark:text-white">{formatCurrency(record.salary.transportAllowance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Housing Allowance</p>
                    <p className="font-medium dark:text-white">{formatCurrency(record.salary.housingAllowance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Other Allowances</p>
                    <p className="font-medium dark:text-white">{formatCurrency(record.salary.otherAllowances)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Gross Salary</p>
                    <p className="font-bold text-lg dark:text-white">{formatCurrency(record.salary.grossSalary)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deductions & Contributions */}
            <Card className="dark:bg-slate-800">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2 dark:text-white">
                  <TrendingDown className="h-4 w-4" /> Deductions & Contributions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">PAYE</p>
                    <p className="font-medium text-red-600 dark:text-red-400">{formatCurrency(record.deductions.paye)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">RSSB Employee Pension (6%)</p>
                    <p className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(record.deductions.rssbEmployeePension)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">RSSB Employee Maternity (0.3%)</p>
                    <p className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(record.deductions.rssbEmployeeMaternity)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Total Deductions</p>
                    <p className="font-bold text-red-700 dark:text-red-400">{formatCurrency(record.deductions.totalDeductions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">RSSB Employer Pension (6%)</p>
                    <p className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(record.contributions?.rssbEmployerPension || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">RSSB Employer Maternity (0.3%)</p>
                    <p className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(record.contributions?.rssbEmployerMaternity || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400">Occupational Hazard (2%)</p>
                    <p className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(record.contributions?.occupationalHazard || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold dark:text-slate-400">Net Pay</p>
                    <p className="font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(record.netPay)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {record.notes && (
              <Card className="dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm font-medium dark:text-white">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">{record.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Delete Confirmation */}
<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t('common.delete')}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Are you sure you want to delete the payroll record for{' '}
                <strong>{record.employee.firstName} {record.employee.lastName}</strong>?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.cancel')}</Button>
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
