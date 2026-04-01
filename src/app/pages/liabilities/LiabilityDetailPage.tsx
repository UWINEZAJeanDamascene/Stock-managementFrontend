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
  CalendarDays
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
      toast.error(error.response?.data?.message || t('liabilities.errors.cancelFailed'));
    } finally {
      setSubmitting(false);
      setCancelDialogOpen(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: string; className: string }> = {
      active: { variant: 'default', className: 'bg-green-500' },
      fully_repaid: { variant: 'secondary', className: 'bg-blue-500' },
      'paid-off': { variant: 'secondary', className: 'bg-blue-500' },
      closed: { variant: 'outline', className: 'bg-gray-500' },
      cancelled: { variant: 'outline', className: 'bg-gray-400' },
      defaulted: { variant: 'destructive', className: '' },
      default: { variant: 'destructive', className: '' },
    };
    const { variant, className } = config[status] || config.default;
    return <Badge variant={variant as any} className={className}>{t(`liabilities.status.${status}`)}</Badge>;
  };

  const getTransactionTypeBadge = (type: string) => {
    const config: Record<string, { variant: string; className: string }> = {
      drawdown: { variant: 'default', className: 'bg-green-500' },
      repayment: { variant: 'secondary', className: 'bg-blue-500' },
      interest_charge: { variant: 'outline', className: 'bg-orange-500' },
      interest: { variant: 'outline', className: 'bg-orange-500' }, // Backwards compatibility
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
      <div className="container mx-auto py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/liabilities')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{liability.name}</h1>
            <p className="text-muted-foreground">{liability.loanNumber}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/liabilities/${id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('liabilities.editLiability')}
          </Button>
          {liability.status !== 'cancelled' && liability.status !== 'fully_repaid' && liability.status !== 'paid-off' && (
            <Button variant="outline" onClick={() => setCancelDialogOpen(true)}>
              <XCircle className="mr-2 h-4 w-4" />
              {t('liabilities.actions.cancel')}
            </Button>
          )}
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('liabilities.actions.delete')}
          </Button>
          {/* Check if liability account is valid (has been resolved with name) - also allow string codes */}
          {(() => {
            const liabAccount = (liability as any).liabilityAccountId;
            const liabIsValid = (liabAccount && typeof liabAccount === 'object' && liabAccount.name) || (typeof liabAccount === 'string' && liabAccount.length > 0);
            const liabNotConfigured = !liabAccount || (typeof liabAccount === 'string' && !liabAccount);
            return (
              <Button 
                onClick={() => setRepaymentOpen(true)}
                disabled={!liabIsValid}
                title={liabNotConfigured ? 'Liability account not configured - Please edit to add account' : (!liabIsValid ? 'Liability account is invalid (deleted from Chart of Accounts) - Please edit to select a valid account' : '')}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {t('liabilities.actions.recordRepayment')}
              </Button>
            );
          })()}
          {(() => {
            const intAccount = (liability as any).interestExpenseAccountId;
            const intIsValid = (intAccount && typeof intAccount === 'object' && intAccount.name) || (typeof intAccount === 'string' && intAccount.length > 0);
            const intNotConfigured = !intAccount || (typeof intAccount === 'string' && !intAccount);
            return (
              <Button 
                variant="outline" 
                onClick={() => setInterestOpen(true)}
                disabled={!intIsValid}
                title={intNotConfigured ? 'Interest expense account not configured - Please edit to add account' : (!intIsValid ? 'Interest expense account is invalid (deleted from Chart of Accounts) - Please edit to select a valid account' : '')}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                {t('liabilities.actions.recordInterest')}
              </Button>
            );
          })()}
        </div>

        {/* Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('liabilities.statusLabel')}</CardTitle>
            </CardHeader>
            <CardContent>
              {getStatusBadge(liability.status)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('liabilities.principal')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(liability.originalAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('liabilities.outstandingBalance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(liability.outstandingBalance)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('liabilities.interestRate')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{liability.interestRate || 0}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Account Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Liability Account</CardTitle>
            </CardHeader>
            <CardContent>
              {(liability as any).liabilityAccountId ? (
                <div>
                  {(liability as any).liabilityAccountId.name ? (
                    <>
                      <div className="text-lg font-semibold">{(liability as any).liabilityAccountId.name}</div>
                      <div className="text-sm text-gray-500">{(liability as any).liabilityAccountId.code}</div>
                    </>
                  ) : (
                    <div className="text-lg font-semibold">{(liability as any).liabilityAccountId}</div>
                  )}
                </div>
              ) : (
                <div className="text-lg text-red-500">Not configured - Please edit to add account</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Interest Expense Account</CardTitle>
            </CardHeader>
            <CardContent>
              {(liability as any).interestExpenseAccountId ? (
                <div>
                  {(liability as any).interestExpenseAccountId.name ? (
                    <>
                      <div className="text-lg font-semibold">{(liability as any).interestExpenseAccountId.name}</div>
                      <div className="text-sm text-gray-500">{(liability as any).interestExpenseAccountId.code}</div>
                    </>
                  ) : (
                    <div className="text-lg font-semibold">{(liability as any).interestExpenseAccountId}</div>
                  )}
                </div>
              ) : (
                <div className="text-lg text-orange-500">Not configured - Required for interest recording</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transaction History - Split into two tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Repayment History Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('liabilities.repaymentHistory')}</CardTitle>
              <CardDescription>{t('liabilities.repaymentHistoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.filter(tx => tx.type === 'repayment').length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground" />
                  <p>{t('liabilities.noRepayments')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('liabilities.transactionDate')}</TableHead>
                      <TableHead>{t('liabilities.reference')}</TableHead>
                      <TableHead className="text-right">{t('liabilities.principalPortion')}</TableHead>
                      <TableHead className="text-right">{t('liabilities.interestPortion')}</TableHead>
                      <TableHead className="text-right">{t('liabilities.total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(tx => tx.type === 'repayment')
                      .map((tx) => (
                        <TableRow key={tx._id}>
                          <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                          <TableCell>{tx.reference || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(tx.principalPortion || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(tx.interestPortion || 0)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(tx.amount)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Interest Charges Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('liabilities.interestCharges')}</CardTitle>
              <CardDescription>{t('liabilities.interestChargesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {transactions.filter(tx => tx.type === 'interest_charge' || tx.type === 'interest').length === 0 ? (
                <div className="flex flex-col items-center py-12">
                  <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground" />
                  <p>{t('liabilities.noInterestCharges')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('liabilities.transactionDate')}</TableHead>
                      <TableHead>{t('liabilities.reference')}</TableHead>
                      <TableHead>{t('liabilities.notes')}</TableHead>
                      <TableHead className="text-right">{t('liabilities.amount')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(tx => tx.type === 'interest_charge' || tx.type === 'interest')
                      .map((tx) => (
                        <TableRow key={tx._id}>
                          <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                          <TableCell>{tx.reference || '-'}</TableCell>
                          <TableCell>{tx.notes || '-'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(tx.amount)}</TableCell>
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
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t('liabilities.drawdownHistory')}</CardTitle>
              <CardDescription>{t('liabilities.drawdownHistoryDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('liabilities.transactionDate')}</TableHead>
                    <TableHead>{t('liabilities.reference')}</TableHead>
                    <TableHead>{t('liabilities.notes')}</TableHead>
                    <TableHead className="text-right">{t('liabilities.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions
                    .filter(tx => tx.type === 'drawdown')
                    .map((tx) => (
                      <TableRow key={tx._id}>
                        <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                        <TableCell>{tx.reference || '-'}</TableCell>
                        <TableCell>{tx.notes || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(tx.amount)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Repayment Dialog */}
        <Dialog open={repaymentOpen} onOpenChange={setRepaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('liabilities.dialogs.repayment.title')}</DialogTitle>
              <DialogDescription>{t('liabilities.dialogs.repayment.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('liabilities.totalAmount')} *</Label>
                <Input 
                  type="number" 
                  value={repaymentForm.amount}
                  onChange={(e) => setRepaymentForm({...repaymentForm, amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Bank Account *</Label>
                <Select 
                  value={repaymentForm.bankAccountId}
                  onValueChange={(value) => setRepaymentForm({...repaymentForm, bankAccountId: value})}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('liabilities.principalPortion')}</Label>
                  <Input 
                    type="number" 
                    value={repaymentForm.principalPortion}
                    onChange={(e) => setRepaymentForm({...repaymentForm, principalPortion: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('liabilities.interestPortion')}</Label>
                  <Input 
                    type="number" 
                    value={repaymentForm.interestPortion}
                    onChange={(e) => setRepaymentForm({...repaymentForm, interestPortion: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('liabilities.date')}</Label>
                <Input 
                  type="date" 
                  value={repaymentForm.transactionDate}
                  onChange={(e) => setRepaymentForm({...repaymentForm, transactionDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('liabilities.reference')}</Label>
                <Input 
                  value={repaymentForm.reference}
                  onChange={(e) => setRepaymentForm({...repaymentForm, reference: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('liabilities.notes')}</Label>
                <Input 
                  value={repaymentForm.notes}
                  onChange={(e) => setRepaymentForm({...repaymentForm, notes: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRepaymentOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleRepayment} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('liabilities.actions.recordRepayment')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Interest Dialog */}
        <Dialog open={interestOpen} onOpenChange={setInterestOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('liabilities.dialogs.interest.title')}</DialogTitle>
              <DialogDescription>{t('liabilities.dialogs.interest.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('liabilities.interestAmount')} *</Label>
                <Input 
                  type="number" 
                  value={interestForm.amount}
                  onChange={(e) => setInterestForm({...interestForm, amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('liabilities.date')}</Label>
                <Input 
                  type="date" 
                  value={interestForm.transactionDate}
                  onChange={(e) => setInterestForm({...interestForm, transactionDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('liabilities.reference')}</Label>
                <Input 
                  value={interestForm.reference}
                  onChange={(e) => setInterestForm({...interestForm, reference: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('liabilities.notes')}</Label>
                <Input 
                  value={interestForm.notes}
                  onChange={(e) => setInterestForm({...interestForm, notes: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInterestOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleInterest} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('liabilities.actions.recordInterest')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Cancel Dialog */}
        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('liabilities.dialogs.cancel.title')}</DialogTitle>
              <DialogDescription>{t('liabilities.dialogs.cancel.description')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('liabilities.actions.cancel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('liabilities.dialogs.delete.title')}</AlertDialogTitle>
              <AlertDialogDescription>{t('liabilities.dialogs.delete.description')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={submitting}>
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
