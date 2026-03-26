import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { expensesApi, Expense } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  ArrowLeft, 
  RefreshCcw,
  Edit,
  Trash2,
  Loader2,
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  Building2,
  User
} from 'lucide-react';
import { toast } from 'sonner';

export default function ExpenseDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState<Expense | null>(null);

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      const response = await expensesApi.getById(id!);
      if (response.success && response.data) {
        setExpense(response.data);
      } else {
        toast.error(t('expenses.errors.fetchFailed'));
        navigate('/expenses');
      }
    } catch (error) {
      console.error('[ExpenseDetailPage] Failed to fetch expense:', error);
      toast.error(t('expenses.errors.fetchFailed'));
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleReverse = async () => {
    if (!confirm(t('expenses.confirmReverse'))) return;
    
    try {
      const response = await expensesApi.reverse(id!, t('expenses.reversalReason'));
      if (response.success) {
        toast.success(t('expenses.reverseSuccess'));
        fetchExpense();
      }
    } catch (error) {
      console.error('[ExpenseDetailPage] Failed to reverse expense:', error);
      toast.error(t('expenses.errors.reverseFailed'));
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('expenses.confirmDelete'))) return;
    
    try {
      const response = await expensesApi.delete(id!);
      if (response.success) {
        toast.success(t('expenses.deleteSuccess'));
        navigate('/expenses');
      }
    } catch (error) {
      console.error('[ExpenseDetailPage] Failed to delete expense:', error);
      toast.error(t('expenses.errors.deleteFailed'));
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
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  if (!expense) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p>{t('expenses.errors.notFound')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/expenses')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back') || 'Back'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t('expenses.detail')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {expense.reference || expense.expenseNumber || expense._id}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 mb-6">
          {expense.status === 'posted' && (
            <Button variant="outline" onClick={handleReverse}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              {t('expenses.reverse')}
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(`/expenses/${expense._id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('common.edit')}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('common.delete')}
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('expenses.status.title')}
                </CardTitle>
                {getStatusBadge(expense.status)}
              </div>
            </CardHeader>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t('expenses.basicInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('expenses.type')}</p>
                  <p className="font-medium">{expense.type ? t(`expenses.types.${expense.type}`) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('expenses.account')}</p>
                  {expense.account ? (
                    <p className="font-medium">{expense.account.name} ({expense.account.code})</p>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">{t('expenses.description')}</p>
                  <p className="font-medium">{expense.description || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t('expenses.amountDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('expenses.amount')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(expense.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('expenses.taxAmount')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(expense.taxAmount || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('expenses.totalAmount')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(expense.totalAmount || expense.amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date & Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('expenses.paymentInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('expenses.date')}</p>
                  <p className="font-medium flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    {formatDate(expense.expenseDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('expenses.paymentMethod')}</p>
                  <p className="font-medium flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    {expense.method || expense.paymentMethod || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('expenses.reference')}</p>
                  <p className="font-medium">{expense.reference || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('expenses.receiptRef')}</p>
                  <p className="font-medium">{expense.receiptRef || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Account / Petty Cash */}
          {(expense.bankAccount || expense.pettyCashFund) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t('expenses.paymentAccount')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {expense.bankAccount && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t('expenses.bankAccount')}</p>
                      <p className="font-medium">{expense.bankAccount.name}</p>
                      <p className="text-sm text-muted-foreground">{expense.bankAccount.code}</p>
                    </div>
                  )}
                  {expense.pettyCashFund && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t('expenses.pettyCashFund')}</p>
                      <p className="font-medium">{expense.pettyCashFund.name}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {expense.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('expenses.notes')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{expense.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('expenses.metadata')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('expenses.createdBy')}</p>
                  <p className="font-medium">{expense.createdBy?.name || '-'}</p>
                  <p className="text-sm text-muted-foreground">{expense.createdBy?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('expenses.createdAt')}</p>
                  <p className="font-medium">{formatDate(expense.createdAt)}</p>
                </div>
                {expense.approvedBy && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t('expenses.approvedBy')}</p>
                      <p className="font-medium">{expense.approvedBy.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t('expenses.approvedAt')}</p>
                      <p className="font-medium">{formatDate(expense.updatedAt)}</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
