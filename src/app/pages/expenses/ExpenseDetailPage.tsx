import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { expensesApi, Expense } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Edit,
  Trash2,
  RefreshCcw,
  Loader2,
  Receipt,
  Calendar,
  DollarSign,
  FileText,
  User,
  CheckCircle,
  XCircle,
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
  });

  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchExpense();
      fetchAccounts();
      fetchBankAccounts();
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
      toast.error(error.response?.data?.message || 'Failed to approve expense');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
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
    const config: Record<string, { variant: string; className: string; icon: React.ReactNode }> = {
      pending: { variant: 'outline', className: 'bg-yellow-500', icon: <AlertCircle className="h-3 w-3" /> },
      approved: { variant: 'default', className: 'bg-green-500', icon: <CheckCircle className="h-3 w-3" /> },
      rejected: { variant: 'destructive', className: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
      posted: { variant: 'default', className: 'bg-green-500', icon: <CheckCircle className="h-3 w-3" /> },
      reversed: { variant: 'secondary', className: 'bg-orange-500', icon: <RefreshCcw className="h-3 w-3" /> },
      cancelled: { variant: 'outline', className: 'bg-gray-500', icon: <XCircle className="h-3 w-3" /> },
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
      bank: { variant: 'default', className: 'bg-blue-500' },
      cash: { variant: 'secondary', className: 'bg-green-500' },
      bank_transfer: { variant: 'outline', className: 'bg-blue-600' },
      cheque: { variant: 'outline', className: 'bg-purple-500' },
      mobile_money: { variant: 'outline', className: 'bg-yellow-500' },
      credit_card: { variant: 'outline', className: 'bg-pink-500' },
      petty_cash: { variant: 'outline', className: 'bg-orange-500' },
      payable: { variant: 'outline', className: 'bg-gray-500' },
    };
    const { variant, className } = config[method] || { variant: 'outline', className: '' };
    return <Badge variant={variant as any} className={className}>{method}</Badge>;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!expense) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/expenses')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Receipt className="h-8 w-8 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold">{expense.reference}</h1>
                <p className="text-muted-foreground">{expense.description}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Approval buttons */}
            {expense.status === 'pending' && (
              <>
                <Button variant="outline" onClick={handleApprove} disabled={submitting} className="text-green-600 border-green-600 hover:bg-green-50">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button variant="outline" onClick={() => setReverseDialogOpen(true)} disabled={submitting} className="text-red-600 border-red-600 hover:bg-red-50">
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}

            {expense.status === 'approved' && (
               <Button variant="outline" onClick={() => handlePost()} disabled={submitting} className="text-blue-600 border-blue-600 hover:bg-blue-50">
                 <CheckCircle className="mr-2 h-4 w-4" />
                 Post Expense
               </Button>
            )}
            
            {/* Edit button */}
            {expense.status === 'pending' && (
              <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">This expense is pending approval and has not been posted to the ledger.</p>
          </div>
        )}

        {expense.status === 'reversed' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <RefreshCcw className="h-5 w-5 text-orange-600" />
            <p className="text-orange-800">This expense has been reversed. A reversing journal entry has been created.</p>
          </div>
        )}

        {expense.status === 'cancelled' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-gray-600" />
            <p className="text-gray-800">This expense has been cancelled.</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              {getStatusBadge(expense.status)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(expense.amount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tax Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(expense.taxAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(expense.totalAmount)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Date</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(expense.date)}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Payment Method</Label>
                  <div className="mt-1">{getPaymentMethodBadge(expense.method)}</div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-sm">Description</Label>
                <p className="mt-1">{expense.description}</p>
              </div>

              {expense.notes && (
                <div>
                  <Label className="text-muted-foreground text-sm">Notes</Label>
                  <p className="mt-1">{expense.notes}</p>
                </div>
              )}

              {expense.type && (
                <div>
                  <Label className="text-muted-foreground text-sm">Type</Label>
                  <p className="mt-1 capitalize">{expense.type.replace(/_/g, ' ')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm">Expense Account</Label>
                {expense.account ? (
                  <div className="mt-1">
                    <div className="font-semibold">{expense.account.code}</div>
                    <div className="text-sm text-muted-foreground">{expense.account.name}</div>
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">Not specified</p>
                )}
              </div>

              {expense.bankAccount && (
                <div>
                  <Label className="text-muted-foreground text-sm">Bank Account</Label>
                  <div className="mt-1">
                    <div className="font-semibold">{expense.bankAccount.code}</div>
                    <div className="text-sm text-muted-foreground">{expense.bankAccount.name}</div>
                  </div>
                </div>
              )}

              {expense.pettyCashFund && (
                <div>
                  <Label className="text-muted-foreground text-sm">Petty Cash Fund</Label>
                  <p className="mt-1">{expense.pettyCashFund.name}</p>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription>
                Update the expense details. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2 col-span-2">
                <Label>Description *</Label>
                <Input
                  placeholder="Enter expense description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (Net) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editForm.amount || ''}
                  onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tax Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={editForm.taxAmount || ''}
                  onChange={(e) => setEditForm({ ...editForm, taxAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expense Account *</Label>
                <Select
                  value={editForm.expenseAccountId}
                  onValueChange={(value) => setEditForm({ ...editForm, expenseAccountId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select
                  value={editForm.paymentMethod}
                  onValueChange={(value) => setEditForm({ ...editForm, paymentMethod: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="petty_cash">Petty Cash</SelectItem>
                    <SelectItem value="payable">Payable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bank Account</Label>
                <Select
                  value={editForm.bankAccountId}
                  onValueChange={(value) => setEditForm({ ...editForm, bankAccountId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.accountName} - {account.bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expense Date *</Label>
                <Input
                  type="date"
                  value={editForm.expenseDate}
                  onChange={(e) => setEditForm({ ...editForm, expenseDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value) => setEditForm({ ...editForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salaries_wages">Salaries & Wages</SelectItem>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="transport_delivery">Transport & Delivery</SelectItem>
                    <SelectItem value="marketing_advertising">Marketing & Advertising</SelectItem>
                    <SelectItem value="other_expense">Other Expense</SelectItem>
                    <SelectItem value="interest_income">Interest Income</SelectItem>
                    <SelectItem value="other_income">Other Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  placeholder="Reference number"
                  value={editForm.reference}
                  onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Additional notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Expense</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this expense? This will mark it as cancelled and reverse any associated journal entries.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reverse Expense</DialogTitle>
              <DialogDescription>
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
        <Label htmlFor="reverseReason">Reason for Reversal *</Label>
        <Input
          id="reverseReason"
          placeholder="Enter reason for reversal"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-2"
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
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
