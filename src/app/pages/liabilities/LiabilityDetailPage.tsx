import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { loansApi, Liability, LiabilityTransaction, bankAccountsApi } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Layout } from '../../layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
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
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  ArrowLeft,
  RefreshCcw,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  Pencil,
  Trash2,
  XCircle,
  CalendarDays,
  Zap,
  ChevronDown,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

export default function LiabilityDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  
  const [liability, setLiability] = useState<Liability | null>(null);
  const [transactions, setTransactions] = useState<LiabilityTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [repaymentOpen, setRepaymentOpen] = useState(false);
  const [interestOpen, setInterestOpen] = useState(false);
  const [drawdownOpen, setDrawdownOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [paymentSchedule, setPaymentSchedule] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Form states
  const [repaymentForm, setRepaymentForm] = useState({
    amount: 0,
    principalPortion: 0,
    interestPortion: 0,
    transactionDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    bankAccountId: ''
  });

  const [interestForm, setInterestForm] = useState({
    amount: 0,
    transactionDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    fetchLiability();
    fetchTransactions();
    fetchBankAccounts();
  }, [id]);

  // Handle query params to open dialogs directly
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'repayment' && !loading && liability) {
      setRepaymentOpen(true);
    } else if (action === 'interest' && !loading && liability) {
      setInterestOpen(true);
    }
  }, [searchParams, loading, liability]);

  const fetchBankAccounts = async () => {
    try {
      const response: any = await bankAccountsApi.getAll({});
      if (response.success) {
        setBankAccounts(response.data || []);
      }
    } catch (error) {
      console.error('[LiabilityDetailPage] Failed to fetch bank accounts:', error);
    }
  };

  const fetchLiability = async () => {
    try {
      const response: any = await loansApi.getById(id!);
      if (response.success && response.data) {
        setLiability(response.data);
      } else {
        toast.error(t('liabilities.errors.notFound'));
        navigate('/liabilities');
      }
    } catch (error) {
      console.error('[LiabilityDetailPage] Failed to fetch liability:', error);
      toast.error(t('liabilities.errors.fetchFailed'));
      navigate('/liabilities');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response: any = await loansApi.getTransactions(id!);
      if (response.success) {
        setTransactions(response.data || []);
      }
    } catch (error) {
      console.error('[LiabilityDetailPage] Failed to fetch transactions:', error);
    }
  };

  const handleRepayment = async () => {
    if (!repaymentForm.principalPortion || repaymentForm.principalPortion <= 0) {
      toast.error('Please enter a valid principal amount');
      return;
    }
    
    if (!repaymentForm.bankAccountId) {
      toast.error('Please select a bank account');
      return;
    }
    
    setSubmitting(true);
    try {
      const response: any = await loansApi.recordRepayment(id!, {
        principalPortion: repaymentForm.principalPortion,
        interestPortion: repaymentForm.interestPortion || 0,
        bankAccountId: repaymentForm.bankAccountId,
        transactionDate: repaymentForm.transactionDate,
        notes: repaymentForm.notes
      });
      
      if (response.success) {
        toast.success(t('liabilities.success.repayment'));
        setRepaymentOpen(false);
        fetchLiability();
        fetchTransactions();
        setRepaymentForm({
          amount: 0,
          principalPortion: 0,
          interestPortion: 0,
          transactionDate: new Date().toISOString().split('T')[0],
          reference: '',
          notes: '',
          bankAccountId: ''
        });
      } else {
        toast.error(response.error || t('liabilities.errors.repaymentFailed'));
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Repayment error:', error);
      toast.error(error.response?.data?.error || t('liabilities.errors.repaymentFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleInterest = async () => {
    if (!interestForm.amount || interestForm.amount <= 0) {
      toast.error(t('liabilities.errors.invalidAmount'));
      return;
    }
    
    setSubmitting(true);
    try {
      const response: any = await loansApi.recordInterest(id!, {
        amount: interestForm.amount,
        chargeDate: interestForm.transactionDate,
        notes: interestForm.notes
      });
      
      if (response.success) {
        toast.success(t('liabilities.success.interest'));
        setInterestOpen(false);
        fetchLiability();
        fetchTransactions();
        setInterestForm({
          amount: 0,
          transactionDate: new Date().toISOString().split('T')[0],
          reference: '',
          notes: ''
        });
      } else {
        toast.error(response.error || t('liabilities.errors.interestFailed'));
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Interest error:', error);
      toast.error(error.response?.data?.error || t('liabilities.errors.interestFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Drawdown form state
  const [drawdownForm, setDrawdownForm] = useState({
    amount: 0,
    bankAccountId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleDrawdown = async () => {
    if (!drawdownForm.amount || drawdownForm.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!drawdownForm.bankAccountId) {
      toast.error('Please select a bank account');
      return;
    }
    
    setSubmitting(true);
    try {
      const response: any = await loansApi.recordDrawdown(id!, {
        amount: drawdownForm.amount,
        bankAccountId: drawdownForm.bankAccountId,
        transactionDate: drawdownForm.transactionDate,
        notes: drawdownForm.notes
      });
      
      if (response.success) {
        toast.success('Drawdown recorded successfully');
        setDrawdownOpen(false);
        fetchLiability();
        fetchTransactions();
        setDrawdownForm({
          amount: 0,
          bankAccountId: '',
          transactionDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
      } else {
        toast.error(response.error || 'Failed to record drawdown');
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Drawdown error:', error);
      toast.error(error.response?.data?.error || 'Failed to record drawdown');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch payment schedule
  const handleViewSchedule = async () => {
    try {
      const response: any = await loansApi.getPaymentSchedule(id!);
      if (response.success && response.data) {
        setPaymentSchedule(response.data);
        setScheduleOpen(true);
      }
    } catch (error) {
      console.error('[LiabilityDetailPage] Failed to fetch schedule:', error);
      toast.error('Failed to load payment schedule');
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      const response: any = await loansApi.delete(id!);
      if (response.success) {
        toast.success(t('liabilities.success.deleted'));
        navigate('/liabilities');
      } else {
        toast.error(response.error || t('liabilities.errors.deleteFailed'));
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Delete error:', error);
      toast.error(error.response?.data?.message || t('liabilities.errors.deleteFailed'));
    } finally {
      setSubmitting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      const response: any = await loansApi.cancel(id!);
      if (response.success) {
        toast.success(t('liabilities.success.cancelled'));
        setCancelDialogOpen(false);
        fetchLiability();
      } else {
        toast.error(response.error || t('liabilities.errors.cancelFailed'));
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Cancel error:', error);
      toast.error(error.response?.data?.error || t('liabilities.errors.cancelFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Auto-Record Functions
  const handleQuickRepayment = async () => {
    if (!liability) return;

    // Check for valid bank account
    const loanBankAccountId = (liability as any).bankAccountId;
    const defaultBankAccount = bankAccounts.length > 0 ? bankAccounts[0]._id : null;
    const bankAccountId = loanBankAccountId || defaultBankAccount;

    if (!bankAccountId) {
      toast.error('No bank account available. Please configure a bank account first.');
      return;
    }

    setSubmitting(true);
    try {
      // Calculate payment schedule to get monthly amounts
      const scheduleResponse: any = await loansApi.calculatePaymentSchedule({
        originalAmount: liability.originalAmount,
        interestRate: liability.interestRate || 0,
        durationMonths: (liability as any).durationMonths || 12,
        interestMethod: (liability as any).interestMethod || 'simple',
        startDate: liability.startDate,
        loanType: liability.loanType
      });

      let principalPortion = 0;
      let interestPortion = 0;

      if (scheduleResponse.success && scheduleResponse.data?.schedule) {
        const schedule = scheduleResponse.data.schedule;
        interestPortion = schedule.monthlyInterest || 0;
        principalPortion = schedule.monthlyPrincipal || 0;

        // If simple method with 0 monthly principal, calculate principal
        if (principalPortion === 0 && schedule.totalPayment > 0) {
          principalPortion = schedule.totalPayment - interestPortion;
        }
      }

      // Calculate total accrued interest from loan start date to today
      const startDate = liability.startDate ? new Date(liability.startDate) : new Date();
      const today = new Date();
      const daysElapsed = Math.max(0, Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const yearsElapsed = daysElapsed / 365.25;

      // Calculate total accrued interest for the entire period
      if (interestPortion === 0 && liability.interestRate > 0) {
        // Simple interest: P * R * T
        interestPortion = liability.originalAmount * (liability.interestRate / 100) * yearsElapsed;
      }

      // Calculate remaining months until maturity
      const endDate = liability.endDate ? new Date(liability.endDate) : new Date();
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30));

      // Determine loan type and calculate appropriate principal
      const loanType = liability.loanType || 'bullet';
      const interestMethod = (liability as any).interestMethod || 'simple';

      if (principalPortion === 0) {
        if (loanType === 'amortizing' || interestMethod === 'compound') {
          // Amortizing: spread principal over remaining months
          principalPortion = liability.outstandingBalance / monthsRemaining;
        } else if (loanType === 'bullet' && daysRemaining <= 0) {
          // Bullet loan at/past maturity: pay full principal
          principalPortion = liability.outstandingBalance;
        } else {
          // Bullet loan before maturity: interest-only payment (principal = 0)
          principalPortion = 0;
        }
      }

      // Calculate total and cap at outstanding balance
      // The total repayment (principal + interest) should never exceed outstanding balance + interest
      // For a normal payment: principal + interest = payment amount
      // But principal portion alone cannot exceed outstanding balance
      principalPortion = Math.min(principalPortion, liability.outstandingBalance);

      // If this is a bullet loan at maturity, cap total at outstanding
      if (loanType === 'bullet' && daysRemaining <= 0) {
        // At maturity for bullet: principal should equal outstanding, interest is separate
        // But some backends expect: principalPortion + interestPortion <= outstandingBalance
        // So we need to adjust
        if (principalPortion + interestPortion > liability.outstandingBalance) {
          // Adjust: interest is paid first, then principal from remainder
          const availableForPrincipal = Math.max(0, liability.outstandingBalance - interestPortion);
          principalPortion = Math.min(principalPortion, availableForPrincipal);
        }
      }

      // Final validation
      if (principalPortion < 0) principalPortion = 0;
      if (interestPortion < 0) interestPortion = 0;

      if (principalPortion === 0 && interestPortion === 0) {
        toast.error('No payment to record - outstanding balance may be zero');
        setSubmitting(false);
        return;
      }

      // Ensure principal never exceeds outstanding balance (safety check for API validation)
      principalPortion = Math.min(principalPortion, liability.outstandingBalance);
      // Also ensure total doesn't exceed outstanding + interest (some backends validate this)
      const maxTotal = liability.outstandingBalance + interestPortion;
      if (principalPortion + interestPortion > maxTotal) {
        principalPortion = Math.max(0, maxTotal - interestPortion);
      }

      const transactionDate = new Date().toISOString().split('T')[0];

      // Round to 2 decimal places for API
      const finalPrincipal = Math.floor(principalPortion * 100) / 100;
      const finalInterest = Math.floor(interestPortion * 100) / 100;

      // Final safety check
      if (finalPrincipal > liability.outstandingBalance) {
        toast.error('Calculated principal exceeds outstanding balance. Please use Manual entry.');
        setSubmitting(false);
        return;
      }

      const response: any = await loansApi.recordRepayment(id!, {
        principalPortion: finalPrincipal,
        interestPortion: finalInterest,
        bankAccountId: bankAccountId,
        transactionDate: transactionDate,
        notes: `Auto-recorded repayment. Principal: ${formatCurrency(finalPrincipal)}, Interest: ${formatCurrency(finalInterest)}. Ref: AUTO-RP-${Date.now().toString().slice(-4)}`
      });

      if (response.success) {
        toast.success(`Quick repayment recorded: ${formatCurrency(principalPortion + interestPortion)}`);
        fetchLiability();
        fetchTransactions();
      } else {
        toast.error(response.error || 'Failed to record quick repayment');
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Quick repayment error:', error);
      toast.error(error.response?.data?.error || 'Failed to record quick repayment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickInterest = async () => {
    if (!liability) return;

    setSubmitting(true);
    try {
      // Calculate monthly interest
      const rate = liability.interestRate || 0;
      const balance = liability.outstandingBalance || 0;
      const monthlyInterest = (balance * (rate / 100)) / 12;

      if (monthlyInterest <= 0) {
        toast.error('No interest to charge (0% rate or no balance)');
        setSubmitting(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const response: any = await loansApi.recordInterest(id!, {
        amount: Math.round(monthlyInterest * 100) / 100,
        chargeDate: today,
        notes: `Auto-recorded monthly interest at ${rate}% annual rate. Ref: AUTO-INT-${Date.now().toString().slice(-4)}`
      });

      if (response.success) {
        toast.success(`Quick interest recorded: ${formatCurrency(monthlyInterest)}`);
        fetchLiability();
        fetchTransactions();
      } else {
        toast.error(response.error || 'Failed to record quick interest');
      }
    } catch (error: any) {
      console.error('[LiabilityDetailPage] Quick interest error:', error);
      toast.error(error.response?.data?.error || 'Failed to record quick interest');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(amount || 0);
  };

  const formatDate = (date: string | undefined | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: string; className: string }> = {
      active: { variant: 'default', className: 'bg-green-500 dark:bg-green-600' },
      fully_repaid: { variant: 'secondary', className: 'bg-blue-500 dark:bg-blue-600' },
      'paid-off': { variant: 'secondary', className: 'bg-blue-500 dark:bg-blue-600' },
      closed: { variant: 'outline', className: 'bg-gray-500 dark:bg-gray-600' },
      cancelled: { variant: 'outline', className: 'bg-gray-400 dark:bg-gray-500' },
      defaulted: { variant: 'destructive', className: '' },
      default: { variant: 'destructive', className: '' },
    };
    const { variant, className } = config[status] || config.default;
    return <Badge variant={variant as any} className={className}>{t(`liabilities.status.${status}`)}</Badge>;
  };

  const getTransactionTypeBadge = (type: string) => {
    const config: Record<string, { variant: string; className: string }> = {
      drawdown: { variant: 'default', className: 'bg-green-500 dark:bg-green-600' },
      repayment: { variant: 'secondary', className: 'bg-blue-500 dark:bg-blue-600' },
      interest_charge: { variant: 'outline', className: 'bg-orange-500 dark:bg-orange-600' },
      interest: { variant: 'outline', className: 'bg-orange-500 dark:bg-orange-600' }, // Backwards compatibility
      default: { variant: 'outline', className: '' },
    };
    const { variant, className } = config[type] || config.default;
    return <Badge variant={variant as any} className={className}>{t(`liabilities.transactionTypes.${type}`)}</Badge>;
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

  if (!liability) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-6 bg-gray-50 dark:bg-slate-900 min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/liabilities')} className="dark:text-slate-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold dark:text-white">{liability.name}</h1>
            <p className="text-muted-foreground dark:text-slate-400">{liability.loanNumber}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/liabilities/${id}/edit`)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
            <Pencil className="mr-2 h-4 w-4" />
            {t('liabilities.editLiability')}
          </Button>
          {liability.status !== 'cancelled' && liability.status !== 'fully_repaid' && liability.status !== 'paid-off' && (
            <Button variant="outline" onClick={() => setCancelDialogOpen(true)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              <XCircle className="mr-2 h-4 w-4" />
              {t('liabilities.actions.cancel')}
            </Button>
          )}
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('liabilities.actions.delete')}
          </Button>
          {/* Repayment Button Group */}
          {(() => {
            const liabAccount = (liability as any).liabilityAccountId;
            const liabIsValid = (liabAccount && typeof liabAccount === 'object' && liabAccount.name) || (typeof liabAccount === 'string' && liabAccount.length > 0);
            const liabNotConfigured = !liabAccount || (typeof liabAccount === 'string' && !liabAccount);

            if (!liabIsValid) {
              return (
                <Button
                  disabled
                  title={liabNotConfigured ? 'Liability account not configured - Please edit to add account' : 'Liability account is invalid - Please edit to select a valid account'}
                  className="dark:bg-primary dark:text-primary-foreground"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {t('liabilities.actions.recordRepayment')}
                </Button>
              );
            }

            return (
              <div className="flex">
                <Button
                  onClick={handleQuickRepayment}
                  disabled={submitting}
                  className="dark:bg-primary dark:text-primary-foreground rounded-r-none"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Quick Repay
                </Button>
                <Button
                  onClick={() => setRepaymentOpen(true)}
                  disabled={submitting}
                  variant="outline"
                  className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 rounded-l-none border-l-0"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Manual
                </Button>
              </div>
            );
          })()}

          {/* Interest Button Group */}
          {(() => {
            const intAccount = (liability as any).interestExpenseAccountId;
            const intIsValid = (intAccount && typeof intAccount === 'object' && intAccount.name) || (typeof intAccount === 'string' && intAccount.length > 0);
            const intNotConfigured = !intAccount || (typeof intAccount === 'string' && !intAccount);

            if (!intIsValid) {
              return (
                <Button
                  variant="outline"
                  disabled
                  title={intNotConfigured ? 'Interest expense account not configured' : 'Interest expense account is invalid'}
                  className="dark:border-slate-600 dark:text-slate-200"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {t('liabilities.actions.recordInterest')}
                </Button>
              );
            }

            return (
              <div className="flex">
                <Button
                  onClick={handleQuickInterest}
                  disabled={submitting}
                  variant="outline"
                  className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 rounded-r-none"
                >
                  <Zap className="mr-2 h-4 w-4 text-yellow-500" />
                  Quick Interest
                </Button>
                <Button
                  onClick={() => setInterestOpen(true)}
                  disabled={submitting}
                  variant="outline"
                  className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 rounded-l-none border-l-0"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Manual
                </Button>
              </div>
            );
          })()}
        </div>

        {/* Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">{t('liabilities.statusLabel')}</CardTitle>
            </CardHeader>
            <CardContent>
              {getStatusBadge(liability.status)}
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">{t('liabilities.principal')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{formatCurrency(liability.originalAmount)}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">{t('liabilities.outstandingBalance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(liability.outstandingBalance)}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">{t('liabilities.interestRate')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{liability.interestRate || 0}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Account Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">Liability Account</CardTitle>
            </CardHeader>
            <CardContent>
              {(liability as any).liabilityAccountId ? (
                <div>
                  {(liability as any).liabilityAccountId.name ? (
                    <>
                      <div className="text-lg font-semibold dark:text-white">{(liability as any).liabilityAccountId.name}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">{(liability as any).liabilityAccountId.code}</div>
                    </>
                  ) : (
                    <div className="text-lg font-semibold dark:text-white">{(liability as any).liabilityAccountId}</div>
                  )}
                </div>
              ) : (
                <div className="text-lg text-red-500 dark:text-red-400">Not configured - Please edit to add account</div>
              )}
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">Interest Expense Account</CardTitle>
            </CardHeader>
            <CardContent>
              {(liability as any).interestExpenseAccountId ? (
                <div>
                  {(liability as any).interestExpenseAccountId.name ? (
                    <>
                      <div className="text-lg font-semibold dark:text-white">{(liability as any).interestExpenseAccountId.name}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">{(liability as any).interestExpenseAccountId.code}</div>
                    </>
                  ) : (
                    <div className="text-lg font-semibold dark:text-white">{(liability as any).interestExpenseAccountId}</div>
                  )}
                </div>
              ) : (
                <div className="text-lg text-orange-500 dark:text-orange-400">Not configured - Required for interest recording</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* IFRS 9 - Financial Instruments */}
        <Card className="dark:bg-slate-800 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium dark:text-slate-400 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              IFRS 9 - Financial Instruments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500">Classification</p>
                <Badge variant="outline" className="mt-1">
                  {liability.ifrs9Classification === 'amortized_cost' ? 'Amortized Cost' :
                   liability.ifrs9Classification === 'fvoci' ? 'FVOCI' :
                   liability.ifrs9Classification === 'fvtpl' ? 'FVTPL' : 'Amortized Cost'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500">Impairment Stage</p>
                <Badge
                  variant="outline"
                  className={`mt-1 ${
                    liability.impairmentStage === 'stage_1' ? 'border-emerald-500/50 text-emerald-400' :
                    liability.impairmentStage === 'stage_2' ? 'border-amber-500/50 text-amber-400' :
                    'border-rose-500/50 text-rose-400'
                  }`}
                >
                  {liability.impairmentStage === 'stage_1' ? 'Stage 1 (12m ECL)' :
                   liability.impairmentStage === 'stage_2' ? 'Stage 2 (Lifetime ECL)' :
                   liability.impairmentStage === 'stage_3' ? 'Stage 3 (Credit-impaired)' : 'Stage 1'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500">ECL Provision</p>
                <p className="text-sm font-semibold text-slate-200">
                  {formatCurrency(liability.eclProvision || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Days Past Due</p>
                <p className={`text-sm font-semibold ${
                  (liability.daysPastDue || 0) > 30 ? 'text-rose-400' :
                  (liability.daysPastDue || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {liability.daysPastDue || 0} DPD
                </p>
              </div>
            </div>
            {(liability.probabilityOfDefault || liability.lossGivenDefault || liability.effectiveInterestRate) && (
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-700/50">
                <div>
                  <p className="text-xs text-slate-500">Probability of Default (PD)</p>
                  <p className="text-sm font-semibold text-slate-200">
                    {(liability.probabilityOfDefault || 0).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Loss Given Default (LGD)</p>
                  <p className="text-sm font-semibold text-slate-200">
                    {(liability.lossGivenDefault || 45).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Effective Interest Rate</p>
                  <p className="text-sm font-semibold text-slate-200">
                    {(liability.effectiveInterestRate || 0).toFixed(2)}%
                  </p>
                </div>
              </div>
            )}
            {liability.forbearanceStatus && liability.forbearanceStatus !== 'none' && (
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                  Forbearance: {liability.forbearanceStatus === 'temporary' ? 'Temporary' : 'Permanent'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History - Split into two tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Repayment History Table */}
          <Card className="dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('liabilities.repaymentHistory')}</CardTitle>
              <CardDescription className="dark:text-slate-400">{t('liabilities.repaymentHistoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.filter(tx => tx.type === 'repayment').length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground dark:text-slate-500" />
                  <p className="dark:text-slate-400">{t('liabilities.noRepayments')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                      <TableHead className="dark:text-slate-200">{t('liabilities.transactionDate')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('liabilities.reference')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('liabilities.principalPortion')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('liabilities.interestPortion')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('liabilities.total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(tx => tx.type === 'repayment')
                      .map((tx) => (
                        <TableRow key={tx._id} className="dark:border-slate-600">
                          <TableCell className="dark:text-slate-300">{formatDate(tx.transactionDate)}</TableCell>
                          <TableCell className="dark:text-slate-300">{tx.reference || '-'}</TableCell>
                          <TableCell className="text-right dark:text-slate-300">{formatCurrency(tx.principalPortion || 0)}</TableCell>
                          <TableCell className="text-right dark:text-slate-300">{formatCurrency(tx.interestPortion || 0)}</TableCell>
                          <TableCell className="text-right font-medium dark:text-white">{formatCurrency(tx.amount)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Interest Charges Table */}
          <Card className="dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('liabilities.interestCharges')}</CardTitle>
              <CardDescription className="dark:text-slate-400">{t('liabilities.interestChargesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.filter(tx => tx.type === 'interest_charge' || tx.type === 'interest').length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground dark:text-slate-500" />
                  <p className="dark:text-slate-400">{t('liabilities.noInterestCharges')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                      <TableHead className="dark:text-slate-200">{t('liabilities.transactionDate')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('liabilities.reference')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('liabilities.notes')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('liabilities.amount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(tx => tx.type === 'interest_charge' || tx.type === 'interest')
                      .map((tx) => (
                        <TableRow key={tx._id} className="dark:border-slate-600">
                          <TableCell className="dark:text-slate-300">{formatDate(tx.transactionDate)}</TableCell>
                          <TableCell className="dark:text-slate-300">{tx.reference || '-'}</TableCell>
                          <TableCell className="dark:text-slate-300">{tx.notes || '-'}</TableCell>
                          <TableCell className="text-right font-medium dark:text-white">{formatCurrency(tx.amount)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Drawdown History Table (Full Width) */}
        {transactions.filter(tx => tx.type === 'drawdown').length > 0 && (
          <Card className="mt-6 dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('liabilities.drawdownHistory')}</CardTitle>
              <CardDescription className="dark:text-slate-400">{t('liabilities.drawdownHistoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                    <TableHead className="dark:text-slate-200">{t('liabilities.transactionDate')}</TableHead>
                    <TableHead className="dark:text-slate-200">{t('liabilities.reference')}</TableHead>
                    <TableHead className="dark:text-slate-200">{t('liabilities.notes')}</TableHead>
                    <TableHead className="text-right dark:text-slate-200">{t('liabilities.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .filter(tx => tx.type === 'drawdown')
                    .map((tx) => (
                      <TableRow key={tx._id} className="dark:border-slate-600">
                        <TableCell className="dark:text-slate-300">{formatDate(tx.transactionDate)}</TableCell>
                        <TableCell className="dark:text-slate-300">{tx.reference || '-'}</TableCell>
                        <TableCell className="dark:text-slate-300">{tx.notes || '-'}</TableCell>
                        <TableCell className="text-right font-medium dark:text-white">{formatCurrency(tx.amount)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Repayment Dialog */}
        <Dialog open={repaymentOpen} onOpenChange={setRepaymentOpen}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t('liabilities.dialogs.repayment.title')}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">{t('liabilities.dialogs.repayment.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.totalAmount')} *</Label>
                <Input 
                  type="number" 
                  value={repaymentForm.amount}
                  onChange={(e) => setRepaymentForm({...repaymentForm, amount: parseFloat(e.target.value) || 0})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Bank Account *</Label>
                <Select 
                  value={repaymentForm.bankAccountId}
                  onValueChange={(value) => setRepaymentForm({...repaymentForm, bankAccountId: value})}
                >
                  <SelectTrigger className="dark:bg-slate-700 dark:text-white dark:border-slate-600">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    {bankAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.accountName} - {account.bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('liabilities.principalPortion')}</Label>
                  <Input 
                    type="number" 
                    value={repaymentForm.principalPortion}
                    onChange={(e) => setRepaymentForm({...repaymentForm, principalPortion: parseFloat(e.target.value) || 0})}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('liabilities.interestPortion')}</Label>
                  <Input 
                    type="number" 
                    value={repaymentForm.interestPortion}
                    onChange={(e) => setRepaymentForm({...repaymentForm, interestPortion: parseFloat(e.target.value) || 0})}
                    className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.date')}</Label>
                <Input 
                  type="date" 
                  value={repaymentForm.transactionDate}
                  onChange={(e) => setRepaymentForm({...repaymentForm, transactionDate: e.target.value})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.reference')}</Label>
                <Input 
                  value={repaymentForm.reference}
                  onChange={(e) => setRepaymentForm({...repaymentForm, reference: e.target.value})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.notes')}</Label>
                <Input 
                  value={repaymentForm.notes}
                  onChange={(e) => setRepaymentForm({...repaymentForm, notes: e.target.value})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRepaymentOpen(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.cancel')}</Button>
              <Button onClick={handleRepayment} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('liabilities.actions.recordRepayment')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Interest Dialog */}
        <Dialog open={interestOpen} onOpenChange={setInterestOpen}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t('liabilities.dialogs.interest.title')}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">{t('liabilities.dialogs.interest.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.interestAmount')} *</Label>
                <Input 
                  type="number" 
                  value={interestForm.amount}
                  onChange={(e) => setInterestForm({...interestForm, amount: parseFloat(e.target.value) || 0})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.date')}</Label>
                <Input 
                  type="date" 
                  value={interestForm.transactionDate}
                  onChange={(e) => setInterestForm({...interestForm, transactionDate: e.target.value})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.reference')}</Label>
                <Input 
                  value={interestForm.reference}
                  onChange={(e) => setInterestForm({...interestForm, reference: e.target.value})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">{t('liabilities.notes')}</Label>
                <Input 
                  value={interestForm.notes}
                  onChange={(e) => setInterestForm({...interestForm, notes: e.target.value})}
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInterestOpen(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.cancel')}</Button>
              <Button onClick={handleInterest} disabled={submitting} className="dark:bg-primary dark:text-primary-foreground">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('liabilities.actions.recordInterest')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t('liabilities.dialogs.cancel.title')}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">{t('liabilities.dialogs.cancel.description')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">{t('common.cancel')}</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('liabilities.actions.cancel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="dark:bg-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="dark:text-white">{t('liabilities.dialogs.delete.title')}</AlertDialogTitle>
              <AlertDialogDescription className="dark:text-slate-400">{t('liabilities.dialogs.delete.description')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={submitting} className="dark:bg-red-600 dark:text-white">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('liabilities.actions.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
