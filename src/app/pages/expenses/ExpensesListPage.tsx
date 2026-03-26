import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { expensesApi, Expense } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { 
  Plus, 
  Eye, 
  RefreshCcw, 
  Filter,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

export default function ExpensesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    expenseAccountId: '',
    paymentMethod: '',
    startDate: '',
    endDate: ''
  });
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
  }, [filters]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.type) params.type = filters.type;
      if (filters.expenseAccountId) params.expenseAccountId = filters.expenseAccountId;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await expensesApi.getAll(params);
      if (response.success) {
        setExpenses(response.data || []);
      }
    } catch (error) {
      console.error('[ExpensesListPage] Failed to fetch expenses:', error);
      toast.error(t('expenses.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params: any = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await expensesApi.getSummary(params);
      if (response.success) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error('[ExpensesListPage] Failed to fetch summary:', error);
    }
  };

  const handleReverse = async (id: string) => {
    if (!confirm(t('expenses.confirmReverse'))) return;
    
    try {
      const response = await expensesApi.reverse(id, t('expenses.reversalReason'));
      if (response.success) {
        toast.success(t('expenses.reverseSuccess'));
        fetchExpenses();
        fetchSummary();
      }
    } catch (error) {
      console.error('[ExpensesListPage] Failed to reverse expense:', error);
      toast.error(t('expenses.errors.reverseFailed'));
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: string; className: string }> = {
      posted: { variant: 'default', className: 'bg-green-500' },
      reversed: { variant: 'secondary', className: 'bg-orange-500' },
      draft: { variant: 'outline', className: 'bg-gray-500' },
      cancelled: { variant: 'destructive', className: '' },
      default: { variant: 'outline', className: '' },
    };
    const { variant, className } = config[status] || config.default;
    return <Badge variant={variant as any} className={className}>{t(`expenses.status.${status}`)}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const expenseTypes = [
    { value: 'salaries_wages', label: t('expenses.types.salaries_wages') },
    { value: 'rent', label: t('expenses.types.rent') },
    { value: 'utilities', label: t('expenses.types.utilities') },
    { value: 'transport_delivery', label: t('expenses.types.transport_delivery') },
    { value: 'marketing_advertising', label: t('expenses.types.marketing_advertising') },
    { value: 'other_expense', label: t('expenses.types.other_expense') },
    { value: 'interest_income', label: t('expenses.types.interest_income') },
    { value: 'other_income', label: t('expenses.types.other_income') },
  ];

  const paymentMethods = [
    { value: 'bank', label: t('expenses.paymentMethods.bank') },
    { value: 'petty_cash', label: t('expenses.paymentMethods.petty_cash') },
    { value: 'credit_card', label: t('expenses.paymentMethods.credit_card') },
    { value: 'payable', label: t('expenses.paymentMethods.payable') },
  ];

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t('expenses.title')}</h1>
            <p className="text-muted-foreground">{t('expenses.subtitle')}</p>
          </div>
          <Button onClick={() => navigate('/expenses/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('expenses.addExpense')}
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              {t('common.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">{t('expenses.filters.type')}</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                >
                  <option value="">{t('common.all')}</option>
                  {expenseTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('expenses.filters.paymentMethod')}</label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                >
                  <option value="">{t('common.all')}</option>
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('expenses.filters.startDate')}</label>
                <input
                  type="date"
                  className="w-full border rounded-md px-3 py-2"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('expenses.filters.endDate')}</label>
                <input
                  type="date"
                  className="w-full border rounded-md px-3 py-2"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({ type: '', expenseAccountId: '', paymentMethod: '', startDate: '', endDate: '' })}
                  className="w-full"
                >
                  {t('common.clearFilters')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('expenses.totalExpenses')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('expenses.totalAmount')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('expenses.operatingExpenses')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.totalOperating || 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('expenses.otherIncome')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.totalOtherIncome || 0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('expenses.list')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('expenses.date')}</TableHead>
                    <TableHead>{t('expenses.reference')}</TableHead>
                    <TableHead>{t('expenses.description')}</TableHead>
                    <TableHead>{t('expenses.account')}</TableHead>
                    <TableHead>{t('expenses.method')}</TableHead>
                    <TableHead className="text-right">{t('expenses.amount')}</TableHead>
                    <TableHead>{t('expenses.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t('expenses.noExpenses')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((expense) => (
                      <TableRow key={expense._id}>
                        <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                        <TableCell className="font-medium">{expense.reference || expense.expenseNumber || '-'}</TableCell>
                        <TableCell>{expense.description || '-'}</TableCell>
                        <TableCell>
                          {expense.account ? (
                            <div>
                              <div className="font-medium">{expense.account.name}</div>
                              <div className="text-xs text-muted-foreground">{expense.account.code}</div>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <CreditCard className="mr-2 h-4 w-4" />
                            {expense.method || expense.paymentMethod || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(expense.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/expenses/${expense._id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {expense.status === 'posted' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleReverse(expense._id)}
                              >
                                <RefreshCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
