import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { expensesApi, journalEntriesApi, ChartOfAccounts } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { 
  ArrowLeft, 
  Save,
  Loader2,
  DollarSign,
  FileText,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

export default function ExpenseFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<ChartOfAccounts[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    type: '' as string,
    expenseAccountId: '',
    description: '',
    amount: 0,
    taxAmount: 0,
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    bankAccountId: '',
    reference: '',
    notes: ''
  });

  useEffect(() => {
    fetchAccounts();
    if (isEditMode) {
      fetchExpense();
    }
  }, [id]);

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    try {
      const response: any = await journalEntriesApi.getAccounts({ type: 'expense', includeInactive: true });
      if (response.success) {
        console.log('[ExpenseFormPage] Accounts loaded:', response.data);
        setAccounts(response.data || []);
      }
    } catch (error) {
      console.error('[ExpenseFormPage] Failed to fetch accounts:', error);
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchExpense = async () => {
    try {
      const response = await expensesApi.getById(id!);
      if (response.success && response.data) {
        const expense = response.data;
        setFormData({
          type: expense.type || '',
          expenseAccountId: (expense as any).expenseAccountId || (expense.account?._id || ''),
          description: expense.description || '',
          amount: expense.amount || 0,
          taxAmount: expense.taxAmount || 0,
          expenseDate: expense.expenseDate ? expense.expenseDate.split('T')[0] : new Date().toISOString().split('T')[0],
          paymentMethod: expense.paymentMethod || '',
          bankAccountId: (expense as any).bankAccountId || '',
          reference: expense.reference || '',
          notes: expense.notes || ''
        });
      }
    } catch (error) {
      console.error('[ExpenseFormPage] Failed to fetch expense:', error);
      toast.error(t('expenses.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    return (formData.amount || 0) + (formData.taxAmount || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ExpenseFormPage] Submit triggered', { formData });
    
    if (!formData.type) {
      toast.error(t('expenses.errors.typeRequired'));
      return;
    }
    if (!formData.expenseAccountId) {
      toast.error(t('expenses.errors.accountRequired'));
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      toast.error(t('expenses.errors.amountRequired'));
      return;
    }
    if (!formData.paymentMethod) {
      toast.error(t('expenses.errors.paymentMethodRequired'));
      return;
    }

    console.log('[ExpenseFormPage] Validation passed, preparing payload');
    setSubmitting(true);
    try {
      // Get current user from localStorage (set during login)
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const postedBy = currentUser?._id || currentUser?.id;
      console.log('[ExpenseFormPage] Current user:', currentUser, 'postedBy:', postedBy);

      // Map frontend payment method to backend expected values
      const paymentMethodMap: Record<string, string> = {
        'bank': 'bank_transfer',
        'petty_cash': 'cash',
        'credit_card': 'credit',
        'payable': 'credit'
      };
      const backendPaymentMethod = paymentMethodMap[formData.paymentMethod] || formData.paymentMethod;

      // Map frontend field names to backend expected field names
      // Only send snake_case fields that the backend model expects
      const payload: any = {
        type: formData.type,
        description: formData.description,
        amount: formData.amount,
        tax_amount: formData.taxAmount || 0,
        expense_date: formData.expenseDate,
        payment_method: formData.paymentMethod,  // snake_case for new field
        paymentMethod: backendPaymentMethod,  // camelCase for legacy field
        notes: formData.notes || undefined,
        reference: formData.reference || undefined,
        expense_account_id: formData.expenseAccountId,  // Must be ObjectId
        total_amount: formData.amount + (formData.taxAmount || 0),
        paid: true,
        status: 'posted',
        posted_by: postedBy  // Required by backend model
      };
      console.log('[ExpenseFormPage] Payload:', payload);

      let response: any;
      if (isEditMode) {
        response = await expensesApi.update(id!, payload);
      } else {
        response = await expensesApi.create(payload);
      }
      console.log('[ExpenseFormPage] Response:', response);

      if (response.success) {
        toast.success(isEditMode ? t('expenses.updateSuccess') : t('expenses.createSuccess'));
        navigate('/expenses');
      } else {
        toast.error(response.error || (isEditMode ? t('expenses.errors.updateFailed') : t('expenses.errors.createFailed')));
      }
    } catch (error: any) {
      console.error('[ExpenseFormPage] Failed to save expense:', error);
      toast.error(error.response?.data?.error || (isEditMode ? t('expenses.errors.updateFailed') : t('expenses.errors.createFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || accountsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  const expenseTypes = [
    { value: 'salaries_wages', label: t('expenses.types.salaries_wages') },
    { value: 'rent', label: t('expenses.types.rent') },
    { value: 'utilities', label: t('expenses.types.utilities') },
    { value: 'transport_delivery', label: t('expenses.types.transport_delivery') },
    { value: 'marketing_advertising', label: t('expenses.types.marketing_advertising') },
    { value: 'other_expense', label: t('expenses.types.other_expense') },
    { value: 'interest_income', label: t('expenses.types.interest_income') },
    { value: 'other_income', label: t('expenses.types.other_income') },
    { value: 'other_expense_income', label: t('expenses.types.other_expense_income') },
  ];

  const paymentMethods = [
    { value: 'bank', label: t('expenses.paymentMethods.bank') },
    { value: 'petty_cash', label: t('expenses.paymentMethods.petty_cash') },
    { value: 'credit_card', label: t('expenses.paymentMethods.credit_card') },
    { value: 'payable', label: t('expenses.paymentMethods.payable') },
  ];

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
              {isEditMode ? t('expenses.editExpense') : t('expenses.addExpense')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isEditMode ? t('expenses.editDescription') : t('expenses.addDescription')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('expenses.basicInfo')}
                </CardTitle>
                <CardDescription>
                  {t('expenses.basicInfoDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">{t('expenses.type')}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('expenses.selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expenseAccountId">{t('expenses.expenseAccount')}</Label>
                  <Select
                    value={formData.expenseAccountId}
                    onValueChange={(value) => handleChange('expenseAccountId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('expenses.selectAccount')} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(account => (
                        <SelectItem key={account._id || account.code} value={account._id || ''}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">{t('expenses.description')}</Label>
                  <Input 
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder={t('expenses.descriptionPlaceholder')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Amount & Date */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t('expenses.amountInfo')}
                </CardTitle>
                <CardDescription>
                  {t('expenses.amountInfoDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">{t('expenses.amount')}</Label>
                  <Input 
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxAmount">{t('expenses.taxAmount')}</Label>
                  <Input 
                    id="taxAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.taxAmount}
                    onChange={(e) => handleChange('taxAmount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>{t('expenses.totalAmount')}</Label>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('en-US', { 
                      style: 'currency', 
                      currency: 'USD' 
                    }).format(calculateTotal())}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expenseDate">{t('expenses.date')}</Label>
                  <Input 
                    id="expenseDate"
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => handleChange('expenseDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">{t('expenses.reference')}</Label>
                  <Input 
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => handleChange('reference', e.target.value)}
                    placeholder={t('expenses.referencePlaceholder')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {t('expenses.paymentInfo')}
                </CardTitle>
                <CardDescription>
                  {t('expenses.paymentInfoDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">{t('expenses.paymentMethod')}</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => handleChange('paymentMethod', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('expenses.selectPaymentMethod')} />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">{t('expenses.notes')}</Label>
                  <Input 
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder={t('expenses.notesPlaceholder')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => navigate('/expenses')}>
                {t('common.cancel')}
              </Button>
              <Button type="button" disabled={submitting} onClick={handleSubmit}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isEditMode ? t('expenses.update') : t('expenses.save')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
