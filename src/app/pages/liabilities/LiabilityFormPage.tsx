import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { loansApi, Liability, journalEntriesApi, ChartOfAccounts, PaymentScheduleResponse } from '@/lib/api';
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
  Wallet,
  Building2,
  Percent,
  Calendar,
  Hash,
  FileText,
  Calculator,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';

export default function LiabilityFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<ChartOfAccounts[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<ChartOfAccounts[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [calculatingSchedule, setCalculatingSchedule] = useState(false);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleResponse['schedule'] | null>(null);
  
  const [formData, setFormData] = useState({
    loanNumber: '',
    name: '',
    loanType: 'loan',
    lenderName: '',
    lenderContact: '',
    originalAmount: 0,
    interestRate: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    liabilityAccountId: '',
    interestExpenseAccountId: '',
    purpose: '',
    durationMonths: 12,
    interestMethod: 'simple',
    paymentTerms: 'monthly',
    collateral: ''
  });

  // Calculate payment schedule when relevant fields change
  const calculateSchedule = useCallback(async () => {
    if (!formData.originalAmount || formData.originalAmount <= 0 || 
        !formData.durationMonths || formData.durationMonths <= 0) {
      setPaymentSchedule(null);
      return;
    }

    setCalculatingSchedule(true);
    try {
      const response: any = await loansApi.calculatePaymentSchedule({
        originalAmount: formData.originalAmount,
        interestRate: formData.interestRate || 0,
        durationMonths: formData.durationMonths,
        interestMethod: formData.interestMethod,
        startDate: formData.startDate,
        loanType: formData.loanType
      });
      
      if (response.success && response.data?.schedule) {
        setPaymentSchedule(response.data.schedule);
      } else {
        setPaymentSchedule(null);
      }
    } catch (error) {
      console.error('[LiabilityFormPage] Failed to calculate schedule:', error);
      setPaymentSchedule(null);
    } finally {
      setCalculatingSchedule(false);
    }
  }, [formData.originalAmount, formData.interestRate, formData.durationMonths, formData.interestMethod, formData.startDate, formData.loanType]);

  useEffect(() => {
    fetchAccounts();
    if (isEditMode && id) {
      fetchLiability();
    }
  }, [id]);

  // Calculate schedule when form data changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (!isEditMode) {
        calculateSchedule();
      }
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [calculateSchedule, isEditMode]);

  const fetchAccounts = async () => {
    try {
      // Fetch all accounts including inactive (for liability account selection)
      const response: any = await journalEntriesApi.getAccounts({ includeInactive: true });
      if (response.success) {
        const allAccounts = response.data || [];
        // Show all accounts for liability and expense selection
        // This ensures users can select any valid account
        setAccounts(allAccounts);
        setExpenseAccounts(allAccounts);
      }
    } catch (error) {
      console.error('[LiabilityFormPage] Failed to fetch accounts:', error);
    } finally {
      setAccountsLoading(false);
    }
  };

  const fetchLiability = async () => {
    try {
      const response: any = await loansApi.getById(id!);
      if (response.success && response.data) {
        const liability = response.data;
        setFormData({
          loanNumber: liability.loanNumber || '',
          name: liability.name || '',
          loanType: liability.loanType || liability.type || 'loan',
          lenderName: liability.lenderName || '',
          lenderContact: liability.lenderContact || '',
          originalAmount: liability.originalAmount || 0,
          interestRate: liability.interestRate || 0,
          startDate: liability.startDate ? liability.startDate.split('T')[0] : '',
          endDate: liability.endDate ? liability.endDate.split('T')[0] : '',
          liabilityAccountId: (liability as any).liabilityAccountId?._id || (liability as any).liabilityAccountId || '',
          interestExpenseAccountId: (liability as any).interestExpenseAccountId?._id || (liability as any).interestExpenseAccountId || '',
          purpose: (liability as any).purpose || '',
          durationMonths: (liability as any).durationMonths || 12,
          interestMethod: (liability as any).interestMethod || 'simple',
          paymentTerms: (liability as any).paymentTerms || 'monthly',
          collateral: (liability as any).collateral || ''
        });
      }
    } catch (error) {
      console.error('[LiabilityFormPage] Failed to fetch liability:', error);
      toast.error(t('liabilities.errors.notFound'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error(t('liabilities.errors.invalidAmount'));
      return;
    }

    if (formData.originalAmount <= 0) {
      toast.error(t('liabilities.errors.invalidAmount'));
      return;
    }

    if (!formData.liabilityAccountId) {
      toast.error('Please select a liability account');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        loanType: formData.loanType,
        lenderName: formData.lenderName,
        lenderContact: formData.lenderContact || undefined,
        originalAmount: formData.originalAmount,
        outstandingBalance: formData.originalAmount,
        interestRate: formData.interestRate,
        interestMethod: formData.interestMethod,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        liabilityAccountId: formData.liabilityAccountId,
        interestExpenseAccountId: formData.interestExpenseAccountId || undefined,
        purpose: formData.purpose,
        durationMonths: formData.durationMonths,
        paymentTerms: formData.paymentTerms,
        collateral: formData.collateral || undefined,
        status: 'active'
      };

      let response: any;
      if (isEditMode) {
        response = await loansApi.update(id!, payload);
      } else {
        response = await loansApi.create(payload);
      }

      if (response.success) {
        toast.success(isEditMode ? 'Liability updated successfully' : 'Liability created successfully');
        navigate('/liabilities');
      } else {
        toast.error(response.error || (isEditMode ? 'Failed to update liability' : 'Failed to create liability'));
      }
    } catch (error: any) {
      console.error('[LiabilityFormPage] Failed to save liability:', error);
      toast.error(error.response?.data?.error || (isEditMode ? 'Failed to update liability' : 'Failed to create liability'));
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

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/liabilities')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back') || 'Back'}
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isEditMode ? t('liabilities.editLiability') : t('liabilities.addLiability')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isEditMode ? 'Update liability information' : 'Add a new liability to your accounts'}
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
                  {t('liabilities.title')}
                </CardTitle>
                <CardDescription>
                  Basic liability information
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="loanNumber">{t('liabilities.reference')}</Label>
                  <Input 
                    id="loanNumber"
                    value={formData.loanNumber}
                    onChange={(e) => handleChange('loanNumber', e.target.value)}
                    placeholder="Auto-generated if empty"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">{t('liabilities.name')} *</Label>
                  <Input 
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Bank Loan"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loanType">{t('liabilities.type')} *</Label>
                  <Select 
                    value={formData.loanType} 
                    onValueChange={(value) => handleChange('loanType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loan">{t('liabilities.types.loan')}</SelectItem>
                      <SelectItem value="short-term">Short-term</SelectItem>
                      <SelectItem value="long-term">Long-term</SelectItem>
                      <SelectItem value="hire_purchase">{t('liabilities.types.hire_purchase')}</SelectItem>
                      <SelectItem value="accrual">{t('liabilities.types.accrual')}</SelectItem>
                      <SelectItem value="other">{t('liabilities.types.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lenderName">{t('liabilities.lender')} *</Label>
                  <Input 
                    id="lenderName"
                    value={formData.lenderName}
                    onChange={(e) => handleChange('lenderName', e.target.value)}
                    placeholder="Bank Name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lenderContact">{t('liabilities.lenderContact')}</Label>
                  <Input 
                    id="lenderContact"
                    value={formData.lenderContact}
                    onChange={(e) => handleChange('lenderContact', e.target.value)}
                    placeholder="Contact person or phone"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Financial Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Financial Details
                </CardTitle>
                <CardDescription>
                  Loan amount and interest information
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="liabilityAccountId">Liability Account *</Label>
                  <Select 
                    value={formData.liabilityAccountId} 
                    onValueChange={(value) => handleChange('liabilityAccountId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account._id || account.code} value={account._id || account.code}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="originalAmount">{t('liabilities.principal')} *</Label>
                  <Input 
                    id="originalAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.originalAmount}
                    onChange={(e) => handleChange('originalAmount', parseFloat(e.target.value) || 0)}
                    placeholder="10000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interestRate">{t('liabilities.interestRate')} (%)</Label>
                  <Input 
                    id="interestRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => handleChange('interestRate', parseFloat(e.target.value) || 0)}
                    placeholder="5.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interestExpenseAccountId">Interest Expense Account</Label>
                  <Select 
                    value={formData.interestExpenseAccountId} 
                    onValueChange={(value) => handleChange('interestExpenseAccountId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select expense account" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseAccounts.map((account) => (
                        <SelectItem key={account._id || account.code} value={account._id || ''}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationMonths">Duration (months)</Label>
                  <Input 
                    id="durationMonths"
                    type="number"
                    min="1"
                    value={formData.durationMonths}
                    onChange={(e) => handleChange('durationMonths', parseInt(e.target.value) || 12)}
                    placeholder="12"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Dates
                </CardTitle>
                <CardDescription>
                  Start and end dates for the liability
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input 
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input 
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">{t('liabilities.paymentTerms')}</Label>
                  <Select 
                    value={formData.paymentTerms} 
                    onValueChange={(value) => handleChange('paymentTerms', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{t('liabilities.paymentTermOptions.monthly')}</SelectItem>
                      <SelectItem value="quarterly">{t('liabilities.paymentTermOptions.quarterly')}</SelectItem>
                      <SelectItem value="annually">{t('liabilities.paymentTermOptions.annually')}</SelectItem>
                      <SelectItem value="bullet">{t('liabilities.paymentTermOptions.bullet')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collateral">{t('liabilities.collateral')}</Label>
                  <Input 
                    id="collateral"
                    value={formData.collateral}
                    onChange={(e) => handleChange('collateral', e.target.value)}
                    placeholder="Collateral description"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input 
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => handleChange('purpose', e.target.value)}
                    placeholder="Purpose of the loan"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Schedule Preview */}
            {!isEditMode && paymentSchedule && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Payment Schedule Preview
                  </CardTitle>
                  <CardDescription>
                    Based on your loan parameters (updated automatically)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 mb-4">
                    <div className="p-4 bg-background rounded-lg border">
                      <div className="text-sm text-muted-foreground">Monthly Payment</div>
                      <div className="text-2xl font-bold text-primary">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentSchedule.monthlyPayment)}
                      </div>
                    </div>
                    <div className="p-4 bg-background rounded-lg border">
                      <div className="text-sm text-muted-foreground">Total Payment</div>
                      <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentSchedule.totalPayment)}
                      </div>
                    </div>
                    <div className="p-4 bg-background rounded-lg border">
                      <div className="text-sm text-muted-foreground">Total Interest</div>
                      <div className="text-2xl font-bold text-destructive">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(paymentSchedule.totalInterest)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Interest Method */}
                  <div className="space-y-2">
                    <Label htmlFor="interestMethod">Interest Calculation Method</Label>
                    <Select 
                      value={formData.interestMethod} 
                      onValueChange={(value) => handleChange('interestMethod', value)}
                    >
                      <SelectTrigger className="w-full md:w-[300px]">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple Interest</SelectItem>
                        <SelectItem value="compound">Compound (Amortized)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {formData.interestMethod === 'simple' 
                        ? 'Interest calculated on original principal. Best for short-term loans.'
                        : 'Interest calculated on remaining balance. Standard for mortgages and long-term loans.'}
                    </p>
                  </div>

                  {/* Payment Schedule Table (first 6 months) */}
                  <div className="mt-4 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Principal</TableHead>
                          <TableHead>Interest</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentSchedule.schedule.slice(0, 6).map((payment) => (
                          <TableRow key={payment.paymentNumber}>
                            <TableCell>{payment.paymentNumber}</TableCell>
                            <TableCell>{payment.paymentDate}</TableCell>
                            <TableCell>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payment.principalPortion)}</TableCell>
                            <TableCell>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payment.interestPortion)}</TableCell>
                            <TableCell className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payment.totalPayment)}</TableCell>
                            <TableCell>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payment.remainingBalance)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {paymentSchedule.schedule.length > 6 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        ...and {paymentSchedule.schedule.length - 6} more payments
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading state for schedule calculation */}
            {!isEditMode && calculatingSchedule && formData.originalAmount > 0 && (
              <Card>
                <CardContent className="py-8 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Calculating payment schedule...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/liabilities')}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {t('common.save')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}
