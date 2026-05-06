import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { expensesApi, Expense, departmentsApi, rraTaxCategories, supportedCurrencies, CurrencyCode, RRATaxCategory } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Edit,
  Trash2,
  RotateCcw,
  Loader2,
  Receipt,
  Calendar,
  DollarSign,
  FileText,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
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
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function ExpenseDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    description: '',
    amount: 0,
    taxAmount: 0,
    expenseAccountId: '',
    paymentMethod: 'bank',
    bankAccountId: '',
    expenseDate: '',
    type: 'other_expense',
    reference: '',
    notes: '',
    // Rwanda-specific fields
    currencyCode: 'RWF' as CurrencyCode,
    exchangeRate: 1,
    rraTaxCategory: '' as RRATaxCategory,
    isVATRecoverable: true,
    departmentId: '',
  });

  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchExpense();
      fetchAccounts();
      fetchBankAccounts();
      fetchDepartments();
    }
  }, [id]);

  const fetchExpense = async () => {
    try {
      const response = await expensesApi.getById(id!);
      if (response.success && response.data) {
        setExpense(response.data);
        // Populate edit form
        setEditForm({
          description: response.data.description || '',
          amount: response.data.amount || 0,
          taxAmount: response.data.taxAmount || 0,
          expenseAccountId: response.data.account?._id || '',
          paymentMethod: response.data.method || 'bank',
          bankAccountId: response.data.bankAccount?._id || '',
          expenseDate: response.data.date ? new Date(response.data.date).toISOString().split('T')[0] : '',
          type: response.data.type || 'other_expense',
          reference: response.data.reference || '',
          notes: response.data.notes || '',
          // Rwanda-specific fields
          currencyCode: (response.data.currencyCode || 'RWF') as CurrencyCode,
          exchangeRate: response.data.exchangeRate || 1,
          rraTaxCategory: (response.data.rraTaxCategory || '') as RRATaxCategory,
          isVATRecoverable: response.data.isVATRecoverable !== undefined ? response.data.isVATRecoverable : true,
          departmentId: response.data.department?._id || '',
        });
      } else {
        toast.error('Expense not found');
        navigate('/expenses');
      }
    } catch (error) {
      console.error('[ExpenseDetailPage] Failed to fetch expense:', error);
      toast.error('Failed to load expense');
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await expensesApi.getExpenseAccounts();
      if (response.success && response.data) {
        setExpenseAccounts(response.data);
      }
    } catch (error) {
      console.error('[ExpenseDetailPage] Failed to fetch expense accounts:', error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await expensesApi.getBankAccounts();
      if (response.success && response.data) {
        setBankAccounts(response.data);
      }
    } catch (error) {
      console.error('[ExpenseDetailPage] Failed to fetch bank accounts:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentsApi.getAll({ isActive: true });
      if (response.success && response.data) {
        setDepartments(response.data);
      }
    } catch (error) {
      console.error('[ExpenseDetailPage] Failed to fetch departments:', error);
    }
  };

  const handleUpdate = async () => {
    if (!editForm.description || editForm.amount <= 0) {
      toast.error('Please provide valid expense details');
      return;
    }

    setSubmitting(true);
    try {
      const response = await expensesApi.update(id!, {
        description: editForm.description,
        amount: editForm.amount,
        tax_amount: editForm.taxAmount,
        total_amount: editForm.amount + editForm.taxAmount,
        expense_account_id: editForm.expenseAccountId,
        payment_method: editForm.paymentMethod,
        bank_account_id: editForm.bankAccountId || undefined,
        expense_date: editForm.expenseDate,
        type: editForm.type,
        reference: editForm.reference,
        notes: editForm.notes,
        // Rwanda-specific fields
        currencyCode: editForm.currencyCode,
        exchangeRate: editForm.exchangeRate,
        rraTaxCategory: editForm.rraTaxCategory,
        isVATRecoverable: editForm.isVATRecoverable,
        department_id: editForm.departmentId || undefined,
      });

      if (response.success) {
        toast.success('Expense updated successfully');
        setEditDialogOpen(false);
        fetchExpense();
      } else {
        toast.error('Failed to update expense');
      }
    } catch (error: any) {
      console.error('[ExpenseDetailPage] Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const response = await expensesApi.delete(id!);
      if (response.success) {
        toast.success('Expense cancelled successfully');
        setDeleteDialogOpen(false);
        navigate('/expenses');
      } else {
        toast.error('Failed to cancel expense');
      }
    } catch (error: any) {
      console.error('[ExpenseDetailPage] Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverse = async (reason: string) => {
    setSubmitting(true);
    try {
      const response = await expensesApi.reverse(id!, reason);
      if (response.success) {
        toast.success('Expense reversed successfully');
        setReverseDialogOpen(false);
        fetchExpense();
      } else {
        toast.error('Failed to reverse expense');
      }
    } catch (error: any) {
      console.error('[ExpenseDetailPage] Reverse error:', error);
      toast.error(error.response?.data?.message || 'Failed to reverse expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const response = await expensesApi.approve(id!);
      if (response.success) {
        toast.success('Expense approved successfully');
        fetchExpense();
      } else {
        toast.error('Failed to approve expense');
      }
    } catch (error: any) {
      console.error('[ExpenseDetailPage] Approve error:', error);
      // Handle segregation of duties error specifically
      if (error.response?.data?.code === 'SEGREGATION_OF_DUTIES') {
        toast.error(error.response.data.message, {
          duration: 5000,
          icon: '⚠️',
        });
      } else {
        toast.error(error.response?.data?.message || 'Failed to approve expense');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (reason: string) => {
    setSubmitting(true);
    try {
      const response = await expensesApi.reject(id!, reason);
      if (response.success) {
        toast.success('Expense rejected successfully');
        fetchExpense();
      } else {
        toast.error('Failed to reject expense');
      }
    } catch (error: any) {
      console.error('[ExpenseDetailPage] Reject error:', error);
      toast.error(error.response?.data?.message || 'Failed to reject expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async () => {
    setSubmitting(true);
    try {
      const response = await expensesApi.post(id!);
      if (response.success) {
        toast.success('Expense posted successfully');
        fetchExpense();
      } else {
        toast.error('Failed to post expense');
      }
    } catch (error: any) {
      console.error('[ExpenseDetailPage] Post error:', error);
      toast.error(error.response?.data?.message || 'Failed to post expense');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'RWF') => {
    if (currency === 'RWF') {
      return new Intl.NumberFormat('en-RW', {
        style: 'currency',
        currency: 'RWF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount || 0);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatRWF = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: string; className: string; icon: React.ReactElement }> = {
      pending: { variant: 'outline', className: 'bg-yellow-500 text-white dark:bg-yellow-600', icon: <Clock className="h-3 w-3" /> },
      approved: { variant: 'default', className: 'bg-green-500 dark:bg-green-600', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { variant: 'destructive', className: '', icon: <XCircle className="h-3 w-3" /> },
      posted: { variant: 'default', className: 'bg-green-500 dark:bg-green-600', icon: <CheckCircle className="h-3 w-3" /> },
      reversed: { variant: 'secondary', className: 'bg-orange-500 text-white dark:bg-orange-600', icon: <RotateCcw className="h-3 w-3" /> },
      cancelled: { variant: 'outline', className: 'bg-gray-500 dark:bg-gray-600', icon: <XCircle className="h-3 w-3" /> },
    };
    const { variant, className, icon } = config[status] || config.posted;
    return (
      <Badge variant={variant as any} className={className}>
        <span className="flex items-center gap-1">
          {icon}
          {status}
        </span>
      </Badge>
    );
  };

  const getPaymentMethodBadge = (method: string) => {
    const config: Record<string, { variant: string; className: string }> = {
      bank: { variant: 'default', className: 'bg-blue-500 dark:bg-blue-600' },
      cash: { variant: 'secondary', className: 'bg-green-500 dark:bg-green-600' },
      bank_transfer: { variant: 'outline', className: 'bg-blue-600 dark:bg-blue-700' },
      cheque: { variant: 'outline', className: 'bg-purple-500 dark:bg-purple-600' },
      mobile_money: { variant: 'outline', className: 'bg-yellow-500 dark:bg-yellow-600' },
      credit_card: { variant: 'outline', className: 'bg-pink-500 dark:bg-pink-600' },
      petty_cash: { variant: 'outline', className: 'bg-orange-500 dark:bg-orange-600' },
      payable: { variant: 'outline', className: 'bg-gray-500 dark:bg-gray-600' },
    };
    const { variant, className } = config[method] || { variant: 'outline', className: '' };
    return <Badge variant={variant as any} className={className}>{method}</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!expense) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/expenses')} className="dark:text-slate-300 dark:hover:bg-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Receipt className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h1 className="text-3xl font-bold dark:text-white">{expense.reference}</h1>
                <p className="text-muted-foreground dark:text-slate-400">{expense.description}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Approval buttons */}
            {expense.status === 'pending' && (
              <>
                <Button variant="outline" onClick={handleApprove} disabled={submitting} className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-900/20">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button variant="outline" onClick={() => setReverseDialogOpen(true)} disabled={submitting} className="text-red-600 border-red-600 hover:bg-red-50 dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900/20">
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}

            {expense.status === 'approved' && (
              <Button variant="outline" onClick={() => handlePost()} disabled={submitting} className="text-blue-600 border-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-400 dark:hover:bg-blue-900/20">
                <CheckCircle className="mr-2 h-4 w-4" />
                Post Expense
              </Button>
            )}
            
            {/* Edit button */}
            {expense.status === 'pending' && (
              <Button variant="outline" onClick={() => setEditDialogOpen(true)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            
            {/* Delete button */}
            {expense.status !== 'cancelled' && expense.status !== 'reversed' && (
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Status Banner */}
        {expense.status === 'pending' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-800 dark:text-yellow-300">This expense is pending approval and has not been posted to the ledger.</p>
          </div>
        )}

        {/* Segregation of Duties Warning */}
        {expense.status === 'pending' && expense.createdBy && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="text-blue-800 dark:text-blue-300">
              <p className="font-medium">Segregation of Duties Required</p>
              <p className="text-sm">
                Created by: <span className="font-semibold">{expense.createdBy.name}</span>.{' '}
                Another user must review and approve this expense for compliance.
              </p>
            </div>
          </div>
        )}

        {expense.status === 'reversed' && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <RotateCcw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <p className="text-orange-800 dark:text-orange-300">This expense has been reversed. A reversing journal entry has been created.</p>
          </div>
        )}

        {expense.status === 'cancelled' && (
          <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <p className="text-gray-800 dark:text-gray-300">This expense has been cancelled.</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-white">Status</CardTitle>
            </CardHeader>
            <CardContent>
              {getStatusBadge(expense.status)}
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-white">
                Net Amount {expense.currencyCode && expense.currencyCode !== 'RWF' && `(${expense.currencyCode})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">
                {formatCurrency(expense.amount, expense.currencyCode || 'RWF')}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-white">Tax Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(expense.taxAmount, expense.currencyCode || 'RWF')}
              </div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-white">Total (RWF)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatRWF(expense.totalAmountInRWF || expense.totalAmount)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* General Information */}
          <Card className="dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="dark:text-white">Expense Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm dark:text-slate-400">Date</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
                    <span className="dark:text-slate-200">{formatDate(expense.date)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm dark:text-slate-400">Payment Method</Label>
                  <div className="mt-1">{getPaymentMethodBadge(expense.method)}</div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm dark:text-slate-400">Description</Label>
                <p className="mt-1 dark:text-slate-200">{expense.description}</p>
              </div>

              {expense.notes && (
                <div>
                  <Label className="text-muted-foreground text-sm dark:text-slate-400">Notes</Label>
                  <p className="mt-1 dark:text-slate-200">{expense.notes}</p>
                </div>
              )}

              {expense.type && (
                <div>
                  <Label className="text-muted-foreground text-sm dark:text-slate-400">Type</Label>
                  <p className="mt-1 capitalize dark:text-slate-200">{expense.type.replace(/_/g, ' ')}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm dark:text-slate-400">Currency</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="dark:border-slate-600 dark:text-slate-300">
                      {expense.currencyCode || 'RWF'}
                      {expense.exchangeRate && expense.exchangeRate !== 1 && (
                        <span className="ml-2 text-xs text-muted-foreground dark:text-slate-400">
                          Rate: {expense.exchangeRate}
                        </span>
                      )}
                    </Badge>
                  </div>
                </div>
                {expense.rraTaxCategory && (
                  <div>
                    <Label className="text-muted-foreground text-sm dark:text-slate-400">RRA Tax Category</Label>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className={`dark:border-slate-600 ${
                          expense.rraTaxCategory === 'vat_standard'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : expense.rraTaxCategory === 'vat_exempt'
                            ? 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                            : expense.rraTaxCategory?.startsWith('wht')
                            ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                            : 'dark:text-slate-300'
                        }`}
                      >
                        {expense.rraTaxCategory.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {expense.department && (
                <div>
                  <Label className="text-muted-foreground text-sm dark:text-slate-400">Department</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="dark:border-slate-600 dark:text-slate-300">
                      {expense.department.code}
                    </Badge>
                    <span className="text-sm text-muted-foreground dark:text-slate-400">
                      {expense.department.name}
                    </span>
                  </div>
                </div>
              )}

              {expense.isVATRecoverable !== undefined && (
                <div>
                  <Label className="text-muted-foreground text-sm dark:text-slate-400">VAT Status</Label>
                  <p className="mt-1 text-sm dark:text-slate-200">
                    {expense.isVATRecoverable ? 'VAT Recoverable' : 'VAT Non-Recoverable'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="dark:text-white">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm dark:text-slate-400">Expense Account</Label>
                {expense.account ? (
                  <div className="mt-1">
                    <div className="font-semibold dark:text-white">{expense.account.code}</div>
                    <div className="text-sm text-muted-foreground dark:text-slate-400">{expense.account.name}</div>
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground dark:text-slate-400">Not specified</p>
                )}
              </div>

              {expense.bankAccount && (
                <div>
                  <Label className="text-muted-foreground text-sm dark:text-slate-400">Bank Account</Label>
                  <div className="mt-1">
                    <div className="font-semibold dark:text-white">{expense.bankAccount.code}</div>
                    <div className="text-sm text-muted-foreground dark:text-slate-400">{expense.bankAccount.name}</div>
                  </div>
                </div>
              )}

              {expense.pettyCashFund && (
                <div>
                  <Label className="text-muted-foreground text-sm dark:text-slate-400">Petty Cash Fund</Label>
                  <p className="mt-1 dark:text-slate-200">{expense.pettyCashFund.name}</p>
                </div>
              )}

              {expense.receiptRef && (
                <div>
                  <Label className="text-muted-foreground text-sm">Receipt Reference</Label>
                  <p className="mt-1">{expense.receiptRef}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audit Trail */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-muted-foreground text-sm">Created By</Label>
                {expense.createdBy ? (
                  <div className="mt-1 flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{expense.createdBy.name}</span>
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">Unknown</p>
                )}
              </div>
              {expense.approvedBy && (
                <div>
                  <Label className="text-muted-foreground text-sm">Approved By</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{expense.approvedBy.name}</span>
                  </div>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground text-sm">Created At</Label>
                <p className="mt-1">{formatDate(expense.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Edit Expense</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Update the expense details. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2 col-span-2">
                <Label className="dark:text-slate-200">Description *</Label>
                <Input
                  placeholder="Enter expense description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Amount (Net) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editForm.amount || ''}
                  onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Tax Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editForm.taxAmount || ''}
                  onChange={(e) => setEditForm({ ...editForm, taxAmount: parseFloat(e.target.value) || 0 })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>

              {/* Rwanda-specific fields */}
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Currency *</Label>
                <Select
                  value={editForm.currencyCode}
                  onValueChange={(value) => {
                    const newCurrency = value as CurrencyCode;
                    setEditForm({
                      ...editForm,
                      currencyCode: newCurrency,
                      exchangeRate: newCurrency === 'RWF' ? 1 : editForm.exchangeRate,
                    });
                  }}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    {supportedCurrencies.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code} className="dark:text-slate-200">
                        {curr.code} - {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editForm.currencyCode !== 'RWF' && (
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Exchange Rate *</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="1.0"
                    value={editForm.exchangeRate || ''}
                    onChange={(e) => setEditForm({ ...editForm, exchangeRate: parseFloat(e.target.value) || 1 })}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="dark:text-slate-200">RRA Tax Category *</Label>
                <Select
                  value={editForm.rraTaxCategory}
                  onValueChange={(value) => setEditForm({ ...editForm, rraTaxCategory: value as RRATaxCategory })}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select tax category" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 max-h-60">
                    {rraTaxCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="dark:text-slate-200">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-200">Department (Optional)</Label>
                <Select
                  value={editForm.departmentId || 'none'}
                  onValueChange={(value) => setEditForm({ ...editForm, departmentId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    <SelectItem value="none" className="dark:text-slate-200">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id} className="dark:text-slate-200">
                        {dept.code} - {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="dark:text-slate-200">Expense Account *</Label>
                <Select
                  value={editForm.expenseAccountId}
                  onValueChange={(value) => setEditForm({ ...editForm, expenseAccountId: value })}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    {expenseAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id} className="dark:text-slate-200">
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Payment Method *</Label>
                <Select
                  value={editForm.paymentMethod}
                  onValueChange={(value) => setEditForm({ ...editForm, paymentMethod: value })}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    <SelectItem value="bank" className="dark:text-slate-200">Bank</SelectItem>
                    <SelectItem value="cash" className="dark:text-slate-200">Cash</SelectItem>
                    <SelectItem value="bank_transfer" className="dark:text-slate-200">Bank Transfer</SelectItem>
                    <SelectItem value="cheque" className="dark:text-slate-200">Cheque</SelectItem>
                    <SelectItem value="mobile_money" className="dark:text-slate-200">Mobile Money</SelectItem>
                    <SelectItem value="credit_card" className="dark:text-slate-200">Credit Card</SelectItem>
                    <SelectItem value="petty_cash" className="dark:text-slate-200">Petty Cash</SelectItem>
                    <SelectItem value="payable" className="dark:text-slate-200">Payable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Bank Account</Label>
                <Select
                  value={editForm.bankAccountId}
                  onValueChange={(value) => setEditForm({ ...editForm, bankAccountId: value })}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    {bankAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id} className="dark:text-slate-200">
                        {account.accountName} - {account.bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Expense Date *</Label>
                <Input
                  type="date"
                  value={editForm.expenseDate}
                  onChange={(e) => setEditForm({ ...editForm, expenseDate: e.target.value })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value) => setEditForm({ ...editForm, type: value })}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    <SelectItem value="salaries_wages" className="dark:text-slate-200">Salaries & Wages</SelectItem>
                    <SelectItem value="rent" className="dark:text-slate-200">Rent</SelectItem>
                    <SelectItem value="utilities" className="dark:text-slate-200">Utilities</SelectItem>
                    <SelectItem value="transport_delivery" className="dark:text-slate-200">Transport & Delivery</SelectItem>
                    <SelectItem value="marketing_advertising" className="dark:text-slate-200">Marketing & Advertising</SelectItem>
                    <SelectItem value="other_expense" className="dark:text-slate-200">Other Expense</SelectItem>
                    <SelectItem value="interest_income" className="dark:text-slate-200">Interest Income</SelectItem>
                    <SelectItem value="other_income" className="dark:text-slate-200">Other Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Reference</Label>
                <Input
                  placeholder="Reference number"
                  value={editForm.reference}
                  onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="dark:text-slate-200">Notes</Label>
                <Input
                  placeholder="Additional notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Cancel Expense</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Are you sure you want to cancel this expense? This will mark it as cancelled and reverse any associated journal entries.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                No, Keep It
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Cancel Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reverse Dialog */}
        <Dialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Reverse Expense</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Please provide a reason for reversing this expense. A reversing journal entry will be created.
              </DialogDescription>
            </DialogHeader>
            <ReverseForm onSubmit={handleReverse} loading={submitting} onClose={() => setReverseDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

// Reverse Form Component
function ReverseForm({ onSubmit, loading, onClose }: { onSubmit: (reason: string) => void; loading: boolean; onClose: () => void }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reason);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="py-4">
        <Label htmlFor="reverseReason" className="dark:text-slate-200">Reason for Reversal *</Label>
        <Input
          id="reverseReason"
          placeholder="Enter reason for reversal"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-2 dark:bg-slate-700 dark:text-white dark:border-slate-600"
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
          Cancel
        </Button>
        <Button type="submit" variant="destructive" disabled={loading || !reason}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Reverse Expense
        </Button>
      </DialogFooter>
    </form>
  );
}
