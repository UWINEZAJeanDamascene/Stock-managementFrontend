import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { expensesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Eye,
  RefreshCw,
  Loader2,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  DollarSign,
  FileText,
  Edit,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Repeat,
  CheckCircle,
  XCircle,
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
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Expense {
  _id: string;
  reference: string;
  date: string;
  description: string;
  account: {
    _id: string;
    code: string;
    name: string;
  } | null;
  method: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  type?: string;
  category?: string;
  bankAccount?: {
    _id: string;
    code: string;
    name: string;
  } | null;
  pettyCashFund?: {
    _id: string;
    name: string;
  } | null;
  receiptRef?: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ExpensesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit, setLimit] = useState(20);

  // Filters
  const [filters, setFilters] = useState({
    type: '',
    startDate: '',
    endDate: '',
    paymentMethod: '',
    status: '', // Added status filter
  });

  // Form states
  const [newExpenseForm, setNewExpenseForm] = useState({
    description: '',
    amount: 0,
    taxAmount: 0,
    expenseAccountId: '',
    paymentMethod: 'bank',
    bankAccountId: '',
    expenseDate: new Date().toISOString().split('T')[0],
    type: 'other_expense',
    reference: '',
    notes: '',
    paid: true,
    isRecurring: false,
    recurringFrequency: 'monthly',
  });

  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: limit,
      };
      if (filters.type) params.type = filters.type;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
      if (filters.status) params.status = filters.status;

      const response = await expensesApi.getAll(params);
      console.log('[ExpensesListPage] API Response:', response);
      if (response.success) {
        setExpenses(response.data || []);
        setTotalCount(response.total || 0);
        setTotalPages(response.pages || 1);
      }
    } catch (error) {
      console.error('[ExpensesListPage] Failed to fetch expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, filters]);

  const fetchAccounts = useCallback(async () => {
    console.log('[ExpensesListPage] Fetching accounts...');
    try {
      const response = await expensesApi.getExpenseAccounts();
      console.log('[ExpensesListPage] Accounts response:', response);
      if (response.success && response.data) {
        console.log('[ExpensesListPage] Setting accounts:', response.data.length);
        setExpenseAccounts(response.data);
      } else {
        console.log('[ExpensesListPage] No accounts data or success=false');
      }
    } catch (error) {
      console.error('[ExpensesListPage] Failed to fetch expense accounts:', error);
    }
  }, []);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await expensesApi.getBankAccounts();
      if (response.success && response.data) {
        setBankAccounts(response.data);
      }
    } catch (error) {
      console.error('[ExpensesListPage] Failed to fetch bank accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchAccounts();
    fetchBankAccounts();
  }, [fetchExpenses, fetchAccounts, fetchBankAccounts]);

  const handleCreateExpense = async () => {
    if (!newExpenseForm.description || newExpenseForm.amount <= 0) {
      toast.error('Please provide valid expense details');
      return;
    }
    if (!newExpenseForm.expenseAccountId) {
      toast.error('Please select an expense account');
      return;
    }

    setSubmitting(true);
    try {
      const response = await expensesApi.create({
        description: newExpenseForm.description,
        amount: newExpenseForm.amount,
        tax_amount: newExpenseForm.taxAmount,
        total_amount: newExpenseForm.amount + newExpenseForm.taxAmount,
        expense_account_id: newExpenseForm.expenseAccountId,
        payment_method: newExpenseForm.paymentMethod,
        bank_account_id: newExpenseForm.bankAccountId || undefined,
        expense_date: newExpenseForm.expenseDate,
        type: newExpenseForm.type,
        reference: newExpenseForm.reference,
        notes: newExpenseForm.notes,
        paid: newExpenseForm.paid,
        isRecurring: newExpenseForm.isRecurring,
        recurringFrequency: newExpenseForm.recurringFrequency,
      });

      if (response.success) {
        toast.success('Expense created successfully');
        setShowCreateDialog(false);
        setNewExpenseForm({
          description: '',
          amount: 0,
          taxAmount: 0,
          expenseAccountId: '',
          paymentMethod: 'bank',
          bankAccountId: '',
          expenseDate: new Date().toISOString().split('T')[0],
          type: 'other_expense',
          reference: '',
          notes: '',
          paid: true,
          isRecurring: false,
          recurringFrequency: 'monthly',
        });
        fetchExpenses();
      } else {
        toast.error('Failed to create expense');
      }
    } catch (error: any) {
      console.error('[ExpensesListPage] Create expense error:', error);
      toast.error(error.response?.data?.message || 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;

    setSubmitting(true);
    try {
      const response = await expensesApi.delete(selectedExpense._id);
      if (response.success) {
        toast.success('Expense cancelled successfully');
        setShowDeleteDialog(false);
        setSelectedExpense(null);
        fetchExpenses();
      } else {
        toast.error('Failed to cancel expense');
      }
    } catch (error: any) {
      console.error('[ExpensesListPage] Delete expense error:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    const dataToExport = expenses.map(exp => ({
      Reference: exp.reference,
      Date: exp.date,
      Description: exp.description,
      Account: exp.account ? `${exp.account.code} - ${exp.account.name}` : '',
      Method: exp.method,
      Amount: exp.amount,
      Tax: exp.taxAmount,
      Total: exp.totalAmount,
      Status: exp.status,
      Type: exp.type,
      Notes: exp.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: string; className: string }> = {
      pending: { variant: 'outline', className: 'bg-yellow-500 text-white' },
      approved: { variant: 'default', className: 'bg-green-500' },
      rejected: { variant: 'destructive', className: '' },
      posted: { variant: 'default', className: 'bg-green-500' },
      reversed: { variant: 'secondary', className: 'bg-orange-500 text-white' },
      cancelled: { variant: 'outline', className: 'bg-gray-500 text-white' },
    };
    const { variant, className } = config[status] || config.posted;
    return <Badge variant={variant as any} className={className}>{status}</Badge>;
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

  return (
    <Layout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Receipt className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold">Expenses</h1>
              <p className="text-muted-foreground">Manage business expenses</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Expense
            </Button>
          </div>
        </div>

        {/* Summary Cards - We'll keep them for now but maybe move them to a dashboard view later */}
        {/* We can also add a recurring expenses summary here if needed */}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters({ ...filters, type: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
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
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="reversed">Reversed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="Start Date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
              <Input
                type="date"
                placeholder="End Date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="ghost" onClick={() => setFilters({ type: '', startDate: '', endDate: '', paymentMethod: '', status: '' })}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No expenses found</p>
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Expense
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {expense.isRecurring && <Repeat className="h-4 w-4 text-purple-500" />}
                            {expense.reference}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(expense.date)}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>
                          {expense.account ? (
                            <div>
                              <div className="font-medium">{expense.account.code}</div>
                              <div className="text-xs text-muted-foreground">{expense.account.name}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{getPaymentMethodBadge(expense.method)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(expense.totalAmount)}</TableCell>
                        <TableCell>{getStatusBadge(expense.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/expenses/${expense._id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {expense.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/expenses/${expense._id}/edit`)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedExpense(expense);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
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
                    Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount} expenses
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
                        <SelectValue placeholder="Limit" />
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

        {/* Create Expense Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Expense</DialogTitle>
              <DialogDescription>
                Record a new business expense. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-2 col-span-2">
                <Label>Description *</Label>
                <Input
                  placeholder="Enter expense description"
                  value={newExpenseForm.description}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (Net) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newExpenseForm.amount || ''}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tax Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newExpenseForm.taxAmount || ''}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, taxAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expense Account *</Label>
                <Select
                  value={newExpenseForm.expenseAccountId}
                  onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, expenseAccountId: value })}
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
                  value={newExpenseForm.paymentMethod}
                  onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, paymentMethod: value })}
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
                  value={newExpenseForm.bankAccountId}
                  onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, bankAccountId: value })}
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
                  value={newExpenseForm.expenseDate}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, expenseDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newExpenseForm.type}
                  onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, type: value })}
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
              <div className="space-y-2 col-span-2 border-t pt-4 mt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={newExpenseForm.isRecurring}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, isRecurring: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isRecurring" className="flex items-center gap-2 cursor-pointer">
                    <Repeat className="h-4 w-4 text-purple-500" />
                    Recurring Expense
                  </Label>
                </div>
                {newExpenseForm.isRecurring && (
                  <div className="ml-6 mt-2">
                    <Label className="text-sm text-muted-foreground">Frequency</Label>
                    <Select
                      value={newExpenseForm.recurringFrequency}
                      onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, recurringFrequency: value })}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  placeholder="Reference number"
                  value={newExpenseForm.reference}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, reference: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Notes</Label>
                <Input
                  placeholder="Additional notes"
                  value={newExpenseForm.notes}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateExpense} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Expense</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this expense? This action will reverse any associated journal entries.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                No, Keep It
              </Button>
              <Button variant="destructive" onClick={handleDeleteExpense} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Cancel Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
