import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { expensesApi, budgetsApi } from '@/lib/api';
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
  notes?: string;
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
    budgetId: '',
  });

  const [expenseAccounts, setExpenseAccounts] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);

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

  const fetchBudgets = useCallback(async () => {
    try {
      const response = await budgetsApi.getAll({ status: 'approved' });
      if (response.success && response.data) {
        setBudgets(response.data);
      }
    } catch (error) {
      console.error('[ExpensesListPage] Failed to fetch budgets:', error);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchAccounts();
    fetchBankAccounts();
    fetchBudgets();
  }, [fetchExpenses, fetchAccounts, fetchBankAccounts, fetchBudgets]);

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
        budget_id: newExpenseForm.budgetId || undefined,
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
          budgetId: '',
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
      pending: { variant: 'outline', className: 'bg-yellow-500 text-white dark:bg-yellow-600' },
      approved: { variant: 'default', className: 'bg-green-500 dark:bg-green-600' },
      rejected: { variant: 'destructive', className: 'dark:bg-red-700' },
      posted: { variant: 'default', className: 'bg-green-500 dark:bg-green-600' },
      reversed: { variant: 'secondary', className: 'bg-orange-500 text-white dark:bg-orange-600' },
      cancelled: { variant: 'outline', className: 'bg-gray-500 text-white dark:bg-gray-600' },
    };
    const { variant, className } = config[status] || config.posted;
    return <Badge variant={variant as any} className={className}>{status}</Badge>;
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

  return (
    <Layout>
      <div className="container mx-auto py-6 bg-gray-50 dark:bg-slate-900 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Receipt className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h1 className="text-3xl font-bold dark:text-white">Expenses</h1>
              <p className="text-muted-foreground dark:text-slate-400">Manage business expenses</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} className="dark:bg-primary dark:text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              New Expense
            </Button>
          </div>
        </div>

        {/* Summary Cards - We'll keep them for now but maybe move them to a dashboard view later */}
        {/* We can also add a recurring expenses summary here if needed */}

        {/* Filters */}
        <Card className="mb-6 dark:bg-slate-800">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-slate-400" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters({ ...filters, type: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="all" className="dark:text-slate-200">All Types</SelectItem>
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
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem value="all" className="dark:text-slate-200">All Statuses</SelectItem>
                  <SelectItem value="pending" className="dark:text-slate-200">Pending</SelectItem>
                  <SelectItem value="approved" className="dark:text-slate-200">Approved</SelectItem>
                  <SelectItem value="rejected" className="dark:text-slate-200">Rejected</SelectItem>
                  <SelectItem value="posted" className="dark:text-slate-200">Posted</SelectItem>
                  <SelectItem value="reversed" className="dark:text-slate-200">Reversed</SelectItem>
                  <SelectItem value="cancelled" className="dark:text-slate-200">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="Start Date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
              <Input
                type="date"
                placeholder="End Date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="ghost" onClick={() => setFilters({ type: '', startDate: '', endDate: '', paymentMethod: '', status: '' })} className="dark:text-slate-300 dark:hover:bg-slate-700">
                <RefreshCw className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card className="dark:bg-slate-800">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground dark:text-slate-400" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground dark:text-slate-400" />
                <p className="text-muted-foreground dark:text-slate-400">No expenses found</p>
                <Button className="mt-4 dark:bg-primary dark:text-primary-foreground" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Expense
                </Button>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                      <TableHead className="dark:text-slate-200">Reference</TableHead>
                      <TableHead className="dark:text-slate-200">Date</TableHead>
                      <TableHead className="dark:text-slate-200">Description</TableHead>
                      <TableHead className="dark:text-slate-200">Account</TableHead>
                      <TableHead className="dark:text-slate-200">Method</TableHead>
                      <TableHead className="text-right dark:text-slate-200">Total</TableHead>
                      <TableHead className="dark:text-slate-200">Status</TableHead>
                      <TableHead className="text-right dark:text-slate-200">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense._id} className="dark:border-slate-600">
                        <TableCell className="font-medium dark:text-white">
                          <div className="flex items-center gap-2">
                            {expense.isRecurring && <Repeat className="h-4 w-4 text-purple-500 dark:text-purple-400" />}
                            {expense.reference}
                          </div>
                        </TableCell>
                        <TableCell className="dark:text-slate-300">{formatDate(expense.date)}</TableCell>
                        <TableCell className="dark:text-slate-300">{expense.description}</TableCell>
                        <TableCell className="dark:text-slate-300">
                          {expense.account ? (
                            <div>
                              <div className="font-medium dark:text-white">{expense.account.code}</div>
                              <div className="text-xs text-muted-foreground dark:text-slate-400">{expense.account.name}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="dark:text-slate-300">{getPaymentMethodBadge(expense.method)}</TableCell>
                        <TableCell className="text-right font-medium dark:text-white">{formatCurrency(expense.totalAmount)}</TableCell>
                        <TableCell>{getStatusBadge(expense.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/expenses/${expense._id}`)}
                              className="dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {expense.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/expenses/${expense._id}/edit`)}
                                  className="dark:text-slate-300 dark:hover:bg-slate-700"
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
                                  className="dark:text-red-400 dark:hover:bg-slate-700"
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
                <div className="flex items-center justify-between px-4 py-4 border-t dark:border-slate-600">
                  <div className="text-sm text-muted-foreground dark:text-slate-400">
                    Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount} expenses
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="dark:border-slate-600 dark:text-slate-200"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm dark:text-slate-300">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="dark:border-slate-600 dark:text-slate-200"
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
          <DialogContent className="max-w-2xl dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Create New Expense</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Record a new business expense. Fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-2 col-span-2">
                <Label className="dark:text-slate-200">Description *</Label>
                <Input
                  placeholder="Enter expense description"
                  value={newExpenseForm.description}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, description: e.target.value })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Amount (Net) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newExpenseForm.amount || ''}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, amount: parseFloat(e.target.value) || 0 })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Tax Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newExpenseForm.taxAmount || ''}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, taxAmount: parseFloat(e.target.value) || 0 })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Expense Account *</Label>
                <Select
                  value={newExpenseForm.expenseAccountId}
                  onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, expenseAccountId: value })}
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
                <Label className="dark:text-slate-200">Budget (Optional)</Label>
                <Select
                  value={newExpenseForm.budgetId || "_none"}
                  onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, budgetId: value === "_none" ? "" : value })}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select budget for tracking" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    <SelectItem value="_none" className="dark:text-slate-200">None</SelectItem>
                    {budgets.map((budget) => (
                      <SelectItem key={budget._id} value={budget._id} className="dark:text-slate-200">
                        {budget.name} (${(budget.remaining || 0).toLocaleString()} left)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Payment Method *</Label>
                <Select
                  value={newExpenseForm.paymentMethod}
                  onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, paymentMethod: value })}
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
                  value={newExpenseForm.bankAccountId}
                  onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, bankAccountId: value })}
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
                  value={newExpenseForm.expenseDate}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, expenseDate: e.target.value })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Type</Label>
                <Select
                  value={newExpenseForm.type}
                  onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, type: value })}
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
              <div className="space-y-2 col-span-2 border-t pt-4 mt-2 dark:border-slate-600">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={newExpenseForm.isRecurring}
                    onChange={(e) => setNewExpenseForm({ ...newExpenseForm, isRecurring: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 dark:border-slate-500"
                  />
                  <Label htmlFor="isRecurring" className="flex items-center gap-2 cursor-pointer dark:text-slate-200">
                    <Repeat className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                    Recurring Expense
                  </Label>
                </div>
                {newExpenseForm.isRecurring && (
                  <div className="ml-6 mt-2">
                    <Label className="text-sm text-muted-foreground dark:text-slate-400">Frequency</Label>
                    <Select
                      value={newExpenseForm.recurringFrequency}
                      onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, recurringFrequency: value })}
                    >
                      <SelectTrigger className="w-full mt-1 dark:bg-slate-700 dark:text-white dark:border-slate-600">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="daily" className="dark:text-slate-200">Daily</SelectItem>
                        <SelectItem value="weekly" className="dark:text-slate-200">Weekly</SelectItem>
                        <SelectItem value="monthly" className="dark:text-slate-200">Monthly</SelectItem>
                        <SelectItem value="quarterly" className="dark:text-slate-200">Quarterly</SelectItem>
                        <SelectItem value="yearly" className="dark:text-slate-200">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Reference</Label>
                <Input
                  placeholder="Reference number"
                  value={newExpenseForm.reference}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, reference: e.target.value })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="dark:text-slate-200">Notes</Label>
                <Input
                  placeholder="Additional notes"
                  value={newExpenseForm.notes}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, notes: e.target.value })}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                Cancel
              </Button>
              <Button onClick={handleCreateExpense} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Cancel Expense</DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                Are you sure you want to cancel this expense? This action will reverse any associated journal entries.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
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
