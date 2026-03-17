import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/app/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Separator } from '@/app/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { toast } from 'sonner';
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  RefreshCw, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  Download,
  Undo2,
  Building2,
  CreditCard,
  Banknote,
  Smartphone,
  FileText,
  Users,
  Receipt,
  Landmark,
  PiggyBank,
  HandCoins,
  LucideIcon,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Eye,
} from 'lucide-react';
import { 
  bankHubApi, 
  bankAccountsApi,
  type BankHubTransaction, 
  type BankHubDashboardSummary,
  type BankHubTransactionType,
  type BankHubPaymentMethod,
  type BankHubInflowType,
  type BankHubOutflowType
} from '@/lib/api';

// Transaction type definitions
interface TransactionTypeOption {
  value: BankHubInflowType | BankHubOutflowType;
  label: string;
  icon: LucideIcon;
  color: string;
  debitAccount: string;
  creditAccount: string;
}

const INFLOW_TYPES: TransactionTypeOption[] = [
  { value: 'sale_payment', label: 'Sale Payment', icon: DollarSign, color: '#10B981', debitAccount: '1105 - Bank', creditAccount: '4000 - Sales' },
  { value: 'invoice_payment', label: 'Invoice Payment', icon: FileText, color: '#059669', debitAccount: '1105 - Bank', creditAccount: '1200 - Accounts Receivable' },
  { value: 'credit_note_refund', label: 'Credit Note Refund', icon: Undo2, color: '#0891B2', debitAccount: '1105 - Bank', creditAccount: '4200 - Sales Returns' },
  { value: 'loan_received', label: 'Loan Received', icon: Landmark, color: '#7C3AED', debitAccount: '1105 - Bank', creditAccount: '2100 - Loans Payable' },
  { value: 'capital_injection', label: 'Capital Injection', icon: PiggyBank, color: '#EC4899', debitAccount: '1105 - Bank', creditAccount: '3100 - Capital' },
  { value: 'interest_income', label: 'Interest Income', icon: TrendingUp, color: '#14B8A6', debitAccount: '1105 - Bank', creditAccount: '5000 - Other Income' },
  { value: 'other_income', label: 'Other Income', icon: Plus, color: '#8B5CF6', debitAccount: '1105 - Bank', creditAccount: '5000 - Other Income' },
  { value: 'tax_refund', label: 'Tax Refund', icon: Landmark, color: '#F59E0B', debitAccount: '1105 - Bank', creditAccount: '2200 - Tax Liabilities' },
  { value: 'client_advance', label: 'Client Advance', icon: ArrowDownLeft, color: '#6366F1', debitAccount: '1105 - Bank', creditAccount: '1300 - Prepayments' },
  { value: 'bank_transfer_in', label: 'Bank Transfer In', icon: ArrowLeftRight, color: '#3B82F6', debitAccount: '1105 - Bank', creditAccount: '1105 - Bank' },
];

const OUTFLOW_TYPES: TransactionTypeOption[] = [
  { value: 'purchase_payment', label: 'Purchase Payment', icon: Receipt, color: '#EF4444', debitAccount: '5000 - Purchases', creditAccount: '1105 - Bank' },
  { value: 'expense_payment', label: 'Expense Payment', icon: Receipt, color: '#F97316', debitAccount: '6000 - Expenses', creditAccount: '1105 - Bank' },
  { value: 'salary_payment', label: 'Salary Payment', icon: Users, color: '#DC2626', debitAccount: '6100 - Payroll', creditAccount: '1105 - Bank' },
  { value: 'tax_payment', label: 'Tax Payment', icon: Landmark, color: '#B91C1C', debitAccount: '2200 - Tax Liabilities', creditAccount: '1105 - Bank' },
  { value: 'loan_repayment', label: 'Loan Repayment', icon: Landmark, color: '#7C3AED', debitAccount: '2100 - Loans Payable', creditAccount: '1105 - Bank' },
  { value: 'petty_cash_funding', label: 'Petty Cash Funding', icon: HandCoins, color: '#F59E0B', debitAccount: '1100 - Petty Cash', creditAccount: '1105 - Bank' },
  { value: 'bank_transfer_out', label: 'Bank Transfer Out', icon: ArrowLeftRight, color: '#3B82F6', debitAccount: '1105 - Bank', creditAccount: '1105 - Bank' },
  { value: 'asset_purchase', label: 'Asset Purchase', icon: Building2, color: '#059669', debitAccount: '1500 - Fixed Assets', creditAccount: '1105 - Bank' },
  { value: 'dividend_payment', label: 'Dividend Payment', icon: PiggyBank, color: '#EC4899', debitAccount: '3100 - Capital', creditAccount: '1105 - Bank' },
  { value: 'other_expense', label: 'Other Expense', icon: Receipt, color: '#6B7280', debitAccount: '6000 - Expenses', creditAccount: '1105 - Bank' },
];

interface PaymentMethodOption {
  value: BankHubPaymentMethod;
  label: string;
  icon: LucideIcon;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'cheque', label: 'Cheque', icon: FileText },
  { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'other', label: 'Other', icon: DollarSign },
];

// Helper function to get type info
const getTypeInfo = (type: string, flow: 'inflow' | 'outflow'): TransactionTypeOption => {
  if (flow === 'inflow') {
    return INFLOW_TYPES.find(t => t.value === type) || INFLOW_TYPES[0];
  }
  return OUTFLOW_TYPES.find(t => t.value === type) || OUTFLOW_TYPES[0];
};

// Helper function to get payment method info
const getPaymentMethodInfo = (method: string): PaymentMethodOption => {
  return PAYMENT_METHODS.find(m => m.value === method) || PAYMENT_METHODS[0];
};

export default function BankHubPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [dashboard, setDashboard] = useState<BankHubDashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<BankHubTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    type: '' as BankHubTransactionType | '',
    flow: '' as 'inflow' | 'outflow' | '',
    paymentMethod: '' as BankHubPaymentMethod | '',
    startDate: '',
    endDate: '',
    search: '',
    page: 1,
    limit: 50,
  });

  // New transaction form
  const [newTransaction, setNewTransaction] = useState({
    type: '' as BankHubTransactionType | '',
    amount: 0,
    bankAccountId: '',
    paymentMethod: 'bank_transfer' as BankHubPaymentMethod,
    counterpartyType: '' as 'client' | 'supplier' | 'employee' | 'other' | '',
    counterpartyName: '',
    description: '',
    notes: '',
    transactionDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate current bank balance
  const currentBankBalance = useMemo(() => {
    if (!newTransaction.bankAccountId || !bankAccounts.length) return 0;
    const account = bankAccounts.find(a => a._id === newTransaction.bankAccountId);
    return account?.balance || account?.currentBalance || 0;
  }, [newTransaction.bankAccountId, bankAccounts]);

  // Calculate balance after transaction
  const balanceAfterTransaction = useMemo(() => {
    const isOutflow = newTransaction.type && OUTFLOW_TYPES.some(t => t.value === newTransaction.type);
    if (isOutflow) {
      return currentBankBalance - newTransaction.amount;
    }
    return currentBankBalance + newTransaction.amount;
  }, [currentBankBalance, newTransaction.amount, newTransaction.type]);

  // Get journal preview
  const journalPreview = useMemo(() => {
    if (!newTransaction.type || newTransaction.amount <= 0) return null;
    const isOutflow = OUTFLOW_TYPES.some(t => t.value === newTransaction.type);
    const typeInfo = getTypeInfo(newTransaction.type, isOutflow ? 'outflow' : 'inflow');
    return {
      debitAccount: typeInfo.debitAccount,
      creditAccount: typeInfo.creditAccount,
      amount: newTransaction.amount,
    };
  }, [newTransaction.type, newTransaction.amount]);

  // Validate transaction
  const validateTransaction = useCallback(() => {
    const errors: string[] = [];
    
    // Required fields
    if (!newTransaction.type) {
      errors.push('Transaction type is required');
    }
    if (newTransaction.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    if (!newTransaction.bankAccountId) {
      errors.push('Please select a bank account');
    }
    
    // Bank balance check for outflows
    const isOutflow = newTransaction.type && OUTFLOW_TYPES.some(t => t.value === newTransaction.type);
    if (isOutflow && currentBankBalance < newTransaction.amount) {
      errors.push(`Insufficient balance. Available: ${formatCurrency(currentBankBalance)}, Required: ${formatCurrency(newTransaction.amount)}`);
    }
    
    // Future date warning
    const today = new Date().toISOString().split('T')[0];
    if (newTransaction.transactionDate > today) {
      // This is just a warning, not an error
    }
    
    // Check journal entry is balanced (should always be since we use double entry)
    if (journalPreview && journalPreview.amount > 0) {
      // Journal entry is always balanced by design
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  }, [newTransaction, currentBankBalance, journalPreview, formatCurrency]);

  // Run validation when form changes
  useEffect(() => {
    validateTransaction();
  }, [validateTransaction]);

  const fetchDashboard = useCallback(async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const response = await bankHubApi.getDashboardSummary({
        startDate: startOfMonth,
        endDate: endOfMonth,
      });
      setDashboard(response.data);
    } catch (error: any) {
      console.error('Error fetching dashboard:', error);
      setDashboard({
        totalInflow: 0,
        totalOutflow: 0,
        netCashFlow: 0,
        closingBalance: 0,
        openingBalance: 0,
        byPaymentMethod: {
          cash: 0,
          bank_transfer: 0,
          cheque: 0,
          mobile_money: 0,
          card: 0,
          other: 0,
        },
        byType: {
          sale_payment: 0,
          invoice_payment: 0,
          credit_note_refund: 0,
          loan_received: 0,
          capital_injection: 0,
          interest_income: 0,
          other_income: 0,
          tax_refund: 0,
          client_advance: 0,
          bank_transfer_in: 0,
          purchase_payment: 0,
          expense_payment: 0,
          salary_payment: 0,
          tax_payment: 0,
          loan_repayment: 0,
          petty_cash_funding: 0,
          bank_transfer_out: 0,
          asset_purchase: 0,
          dividend_payment: 0,
          other_expense: 0,
        },
        recentTransactions: [],
        monthlyTrend: [],
      });
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      const params: Record<string, unknown> = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.type) params.type = filters.type;
      if (filters.flow) params.flow = filters.flow;
      if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.search) params.search = filters.search;

      const response = await bankHubApi.getTransactions(params);
      setTransactions(response.data);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    }
  }, [filters]);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      setBankAccounts(response.data || []);
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error);
      setBankAccounts([]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDashboard(), fetchTransactions(), fetchBankAccounts()]);
      setLoading(false);
    };
    loadData();
  }, [fetchDashboard, fetchTransactions, fetchBankAccounts]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab, fetchTransactions]);

  const handleCreateTransaction = async () => {
    if (!validateTransaction()) {
      toast.error('Please fix all validation errors before proceeding');
      return;
    }

    try {
      await bankHubApi.createTransaction({
        type: newTransaction.type as BankHubTransactionType,
        amount: newTransaction.amount,
        bankAccountId: newTransaction.bankAccountId || undefined,
        paymentMethod: newTransaction.paymentMethod,
        counterpartyType: newTransaction.counterpartyType || undefined,
        counterpartyName: newTransaction.counterpartyName || undefined,
        description: newTransaction.description,
        notes: newTransaction.notes,
        transactionDate: newTransaction.transactionDate,
        referenceNumber: newTransaction.referenceNumber || undefined,
      });
      
      toast.success('Transaction created successfully');
      setShowAddTransaction(false);
      setNewTransaction({
        type: '',
        amount: 0,
        bankAccountId: '',
        paymentMethod: 'bank_transfer',
        counterpartyType: '',
        counterpartyName: '',
        description: '',
        notes: '',
        transactionDate: new Date().toISOString().split('T')[0],
        referenceNumber: '',
      });
      setValidationErrors([]);
      fetchDashboard();
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create transaction');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await bankHubApi.exportTransactions({
        startDate: filters.startDate,
        endDate: filters.endDate,
        format: 'csv',
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank-hub-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Export completed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export');
    }
  };

  const renderIcon = (IconComponent: LucideIcon, className: string) => {
    return <IconComponent className={className} />;
  };

  // Check if transaction is outflow
  const isOutflow = newTransaction.type && OUTFLOW_TYPES.some(t => t.value === newTransaction.type);
  const isInflow = newTransaction.type && INFLOW_TYPES.some(t => t.value === newTransaction.type);
  const isFutureDate = newTransaction.transactionDate > new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-slate-600 dark:text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="h-8 w-8 text-indigo-600" />
              {t('bankHub.title', 'Bank Hub')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">{t('bankHub.subtitle', 'Centralized Cash Flow Management')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExport} className="gap-2 dark:border-slate-600 dark:text-slate-200">
              <Download className="h-4 w-4" />
              {t('common.export', 'Export')}
            </Button>
            <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('bankHub.addTransaction', 'Add Transaction')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-800">
                <DialogHeader>
                  <DialogTitle className="dark:text-white flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    {t('bankHub.addTransaction', 'Bank Transaction Hub')}
                  </DialogTitle>
                  <DialogDescription className="dark:text-slate-400">
                    {t('bankHub.addTransactionDesc', 'Record a new financial transaction with automatic journal entry')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Step 1: Bank Selection */}
                  <div className="space-y-3">
                    <Label className="dark:text-slate-200 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {t('bankHub.selectBank', 'Select Bank')} <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {bankAccounts.map(account => (
                        <div
                          key={account._id}
                          onClick={() => setNewTransaction({ ...newTransaction, bankAccountId: account._id })}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            newTransaction.bankAccountId === account._id 
                              ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' 
                              : 'border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-500" />
                              <span className="font-medium dark:text-white">{account.name}</span>
                            </div>
                            <span className={`font-semibold ${
                              (account.balance || account.currentBalance || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {formatCurrency(account.balance || account.currentBalance || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {bankAccounts.length === 0 && (
                        <p className="text-slate-500 dark:text-slate-400 col-span-2 text-center py-4">
                          No bank accounts found. Please create a bank account first.
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Step 2: Flow Selection */}
                  <div className="space-y-3">
                    <Label className="dark:text-slate-200">{t('bankHub.flow', 'Transaction Flow')}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={isInflow ? 'default' : 'outline'}
                        onClick={() => setNewTransaction({ ...newTransaction, type: 'sale_payment' })}
                        className={`gap-2 h-12 ${!isInflow && !newTransaction.type ? '' : (isInflow ? 'bg-green-600 hover:bg-green-700' : '')}`}
                      >
                        <ArrowDownLeft className="h-4 w-4" />
                        {t('bankHub.moneyIn', 'MONEY IN')}
                      </Button>
                      <Button
                        type="button"
                        variant={isOutflow ? 'default' : 'outline'}
                        onClick={() => setNewTransaction({ ...newTransaction, type: 'expense_payment' })}
                        className={`gap-2 h-12 ${!isOutflow && !newTransaction.type ? '' : (isOutflow ? 'bg-red-600 hover:bg-red-700' : '')}`}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        {t('bankHub.moneyOut', 'MONEY OUT')}
                      </Button>
                    </div>
                  </div>

                  {/* Step 3: Transaction Type */}
                  <div className="space-y-3">
                    <Label className="dark:text-slate-200">
                      {t('bankHub.type', 'Transaction Type')} <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={newTransaction.type} 
                      onValueChange={(v) => setNewTransaction({ ...newTransaction, type: v as BankHubTransactionType })}
                    >
                      <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                        <SelectValue placeholder={t('bankHub.selectType', 'Select transaction type')} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 max-h-80">
                        <div className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          MONEY IN
                        </div>
                        {INFLOW_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              {renderIcon(type.icon, "h-4 w-4")}
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                        <Separator className="my-2" />
                        <div className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          MONEY OUT
                        </div>
                        {OUTFLOW_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              {renderIcon(type.icon, "h-4 w-4")}
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Step 4: Amount and Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">
                        {t('bankHub.amount', 'Amount (FRW)')} <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        type="number" 
                        value={newTransaction.amount} 
                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) || 0 })} 
                        placeholder="0.00"
                        className="dark:bg-slate-700 dark:border-slate-600 text-lg font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">{t('bankHub.paymentMethod', 'Payment Method')}</Label>
                      <Select 
                        value={newTransaction.paymentMethod} 
                        onValueChange={(v) => setNewTransaction({ ...newTransaction, paymentMethod: v as BankHubPaymentMethod })}
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          {PAYMENT_METHODS.map(method => (
                            <SelectItem key={method.value} value={method.value}>
                              <div className="flex items-center gap-2">
                                {renderIcon(method.icon, "h-4 w-4")}
                                {method.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Counterparty */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">{t('bankHub.counterpartyType', 'Counterparty Type')}</Label>
                      <Select 
                        value={newTransaction.counterpartyType} 
                        onValueChange={(v) => setNewTransaction({ ...newTransaction, counterpartyType: v as any })}
                      >
                        <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                          <SelectValue placeholder={t('bankHub.select', 'Select')} />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800">
                          <SelectItem value="client">{t('bankHub.client', 'Client')}</SelectItem>
                          <SelectItem value="supplier">{t('bankHub.supplier', 'Supplier')}</SelectItem>
                          <SelectItem value="employee">{t('bankHub.employee', 'Employee')}</SelectItem>
                          <SelectItem value="other">{t('bankHub.other', 'Other')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">{t('bankHub.counterpartyName', 'Name')}</Label>
                      <Input 
                        value={newTransaction.counterpartyName} 
                        onChange={(e) => setNewTransaction({ ...newTransaction, counterpartyName: e.target.value })} 
                        placeholder={t('bankHub.name', 'Name')}
                        className="dark:bg-slate-700 dark:border-slate-600"
                      />
                    </div>
                  </div>

                  {/* Date and Reference */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">{t('bankHub.date', 'Date')}</Label>
                      <Input 
                        type="date" 
                        value={newTransaction.transactionDate} 
                        onChange={(e) => setNewTransaction({ ...newTransaction, transactionDate: e.target.value })} 
                        className="dark:bg-slate-700 dark:border-slate-600"
                      />
                      {isFutureDate && (
                        <Alert variant="default" className="mt-2 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertTitle className="text-yellow-800 dark:text-yellow-200">Future Date Warning</AlertTitle>
                          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                            The selected date is in the future. Please confirm this is intentional.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">{t('bankHub.reference', 'Reference')}</Label>
                      <Input 
                        value={newTransaction.referenceNumber} 
                        onChange={(e) => setNewTransaction({ ...newTransaction, referenceNumber: e.target.value })} 
                        placeholder={t('bankHub.referencePlaceholder', 'Auto-generated')}
                        className="dark:bg-slate-700 dark:border-slate-600"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">{t('bankHub.description', 'Description')}</Label>
                    <Textarea 
                      value={newTransaction.description} 
                      onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })} 
                      placeholder={t('bankHub.descriptionPlaceholder', 'Enter description')}
                      className="dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>

                  <Separator />

                  {/* Preview Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-indigo-600" />
                      <h3 className="font-semibold dark:text-white">{t('bankHub.preview', 'Transaction Preview')}</h3>
                    </div>

                    {/* Journal Preview */}
                    {journalPreview && newTransaction.amount > 0 && (
                      <Card className="dark:bg-slate-700/50">
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm dark:text-white flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {t('bankHub.journalPreview', 'Journal Entry Preview')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-2">
                          <Table>
                            <TableHeader>
                              <TableRow className="dark:border-slate-600">
                                <TableHead className="dark:text-slate-300">Account</TableHead>
                                <TableHead className="dark:text-slate-300">Type</TableHead>
                                <TableHead className="text-right dark:text-slate-300">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow className="dark:border-slate-600">
                                <TableCell className="dark:text-slate-300">{journalPreview.debitAccount}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">DEBIT</Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold dark:text-white">
                                  {formatCurrency(journalPreview.amount)}
                                </TableCell>
                              </TableRow>
                              <TableRow className="dark:border-slate-600">
                                <TableCell className="dark:text-slate-300">{journalPreview.creditAccount}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">CREDIT</Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono font-semibold dark:text-white">
                                  {formatCurrency(journalPreview.amount)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                          <div className="mt-2 flex items-center justify-end gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                              Debit = Credit ✓ Balanced
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Bank Balance Preview */}
                    {newTransaction.bankAccountId && newTransaction.amount > 0 && (
                      <Card className="dark:bg-slate-700/50">
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm dark:text-white flex items-center gap-2">
                            <Calculator className="h-4 w-4" />
                            {t('bankHub.balancePreview', 'Bank Balance Preview')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-2">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="dark:text-slate-300">Before:</span>
                              <span className="font-mono font-semibold dark:text-white">{formatCurrency(currentBankBalance)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="dark:text-slate-300">
                                {isOutflow ? 'This transaction (-):' : 'This transaction (+):'}
                              </span>
                              <span className={`font-mono font-semibold ${isOutflow ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {isOutflow ? '-' : '+'}{formatCurrency(newTransaction.amount)}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <span className="font-medium dark:text-white">After:</span>
                              <span className={`font-mono font-bold text-lg ${
                                balanceAfterTransaction >= 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {formatCurrency(balanceAfterTransaction)}
                              </span>
                            </div>
                          </div>
                          {balanceAfterTransaction < 0 && (
                            <Alert variant="destructive" className="mt-3">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Insufficient Funds</AlertTitle>
                              <AlertDescription>
                                This transaction will result in a negative balance.
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Validation Errors</AlertTitle>
                      <AlertDescription>
                        <ul className="list-disc pl-4 mt-2">
                          {validationErrors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setShowAddTransaction(false);
                    setValidationErrors([]);
                  }} className="dark:border-slate-600 dark:text-slate-200">
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button 
                    onClick={handleCreateTransaction} 
                    disabled={!newTransaction.type || newTransaction.amount <= 0 || validationErrors.length > 0}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {t('bankHub.confirmPost', 'Confirm & Post')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-200 flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-green-500" />
                {t('bankHub.totalInflow', 'Total Inflow')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(dashboard?.totalInflow || 0)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('bankHub.thisMonth', 'This month')}</p>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-200 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-red-500" />
                {t('bankHub.totalOutflow', 'Total Outflow')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(dashboard?.totalOutflow || 0)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('bankHub.thisMonth', 'This month')}</p>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-200 flex items-center gap-2">
                {dashboard?.netCashFlow && dashboard.netCashFlow >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                {t('bankHub.netCashFlow', 'Net Cash Flow')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${dashboard?.netCashFlow && dashboard.netCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(dashboard?.netCashFlow || 0)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('bankHub.thisMonth', 'This month')}</p>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-200 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-indigo-500" />
                {t('bankHub.closingBalance', 'Closing Balance')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(dashboard?.closingBalance || 0)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('bankHub.allAccounts', 'All accounts')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="dark:bg-slate-800">
            <TabsTrigger value="dashboard" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              {t('bankHub.dashboard', 'Dashboard')}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              {t('bankHub.transactions', 'Transactions')}
            </TabsTrigger>
            <TabsTrigger value="reports" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">
              {t('bankHub.reports', 'Reports')}
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* By Payment Method */}
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">{t('bankHub.byPaymentMethod', 'By Payment Method')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {PAYMENT_METHODS.map(method => {
                      const amount = dashboard?.byPaymentMethod?.[method.value] || 0;
                      if (amount === 0) return null;
                      return (
                        <div key={method.value} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {renderIcon(method.icon, "h-4 w-4 text-slate-500")}
                            <span className="dark:text-slate-300">{method.label}</span>
                          </div>
                          <span className="font-semibold dark:text-white">{formatCurrency(amount)}</span>
                        </div>
                      );
                    })}
                    {Object.keys(dashboard?.byPaymentMethod || {}).length === 0 && (
                      <p className="text-slate-500 dark:text-slate-400 text-center py-4">{t('bankHub.noData', 'No data available')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Trend */}
              <Card className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">{t('bankHub.monthlyTrend', 'Monthly Trend')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard?.monthlyTrend && dashboard.monthlyTrend.length > 0 ? (
                    <div className="space-y-3">
                      {dashboard.monthlyTrend.map((month, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="dark:text-slate-300">{month.month}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-green-600 dark:text-green-400">+{formatCurrency(month.inflow)}</span>
                            <span className="text-red-600 dark:text-red-400">-{formatCurrency(month.outflow)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-4">{t('bankHub.noTrendData', 'No trend data available')}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="dark:text-white">{t('bankHub.recentTransactions', 'Recent Transactions')}</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard?.recentTransactions && dashboard.recentTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.recentTransactions.slice(0, 5).map((txn) => {
                      const typeInfo = getTypeInfo(txn.type, txn.flow);
                      return (
                        <div key={txn._id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${txn.flow === 'inflow' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                              {txn.flow === 'inflow' ? (
                                <ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium dark:text-white">{typeInfo.label}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {txn.counterpartyName || txn.description || 'No description'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${txn.flow === 'inflow' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {txn.flow === 'inflow' ? '+' : '-'}{formatCurrency(txn.amount)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(txn.transactionDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-4">{t('bankHub.noRecentTransactions', 'No recent transactions')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            {/* Filters */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <CardTitle className="dark:text-white text-lg">{t('bankHub.filters', 'Filters')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <Label className="dark:text-slate-200 text-xs">{t('bankHub.flow', 'Flow')}</Label>
                    <Select value={filters.flow} onValueChange={(v) => setFilters({ ...filters, flow: v as any })}>
                      <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 mt-1">
                        <SelectValue placeholder={t('bankHub.all', 'All')} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="inflow">{t('bankHub.inflow', 'Inflow')}</SelectItem>
                        <SelectItem value="outflow">{t('bankHub.outflow', 'Outflow')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="dark:text-slate-200 text-xs">{t('bankHub.type', 'Type')}</Label>
                    <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v as any })}>
                      <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 mt-1">
                        <SelectValue placeholder={t('bankHub.all', 'All')} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="">{t('bankHub.all', 'All Types')}</SelectItem>
                        <SelectItem value="sale_payment">{t('bankHub.salePayment', 'Sale Payment')}</SelectItem>
                        <SelectItem value="purchase_payment">{t('bankHub.purchasePayment', 'Purchase Payment')}</SelectItem>
                        <SelectItem value="expense_payment">{t('bankHub.expensePayment', 'Expense Payment')}</SelectItem>
                        <SelectItem value="salary_payment">{t('bankHub.salaryPayment', 'Salary Payment')}</SelectItem>
                        <SelectItem value="tax_payment">{t('bankHub.taxPayment', 'Tax Payment')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="dark:text-slate-200 text-xs">{t('bankHub.paymentMethod', 'Method')}</Label>
                    <Select value={filters.paymentMethod} onValueChange={(v) => setFilters({ ...filters, paymentMethod: v as any })}>
                      <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 mt-1">
                        <SelectValue placeholder={t('bankHub.all', 'All')} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        <SelectItem value="">{t('bankHub.all', 'All Methods')}</SelectItem>
                        {PAYMENT_METHODS.map(method => (
                          <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="dark:text-slate-200 text-xs">{t('bankHub.fromDate', 'From Date')}</Label>
                    <Input 
                      type="date" 
                      value={filters.startDate} 
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} 
                      className="dark:bg-slate-700 dark:border-slate-600 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="dark:text-slate-200 text-xs">{t('bankHub.toDate', 'To Date')}</Label>
                    <Input 
                      type="date" 
                      value={filters.endDate} 
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} 
                      className="dark:bg-slate-700 dark:border-slate-600 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="dark:text-slate-200 text-xs">{t('bankHub.search', 'Search')}</Label>
                    <Input 
                      value={filters.search} 
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })} 
                      placeholder={t('bankHub.searchPlaceholder', 'Search...')}
                      className="dark:bg-slate-700 dark:border-slate-600 mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="dark:bg-slate-700">
                      <TableHead className="dark:text-slate-200">{t('bankHub.date', 'Date')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('bankHub.type', 'Type')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('bankHub.counterparty', 'Counterparty')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('bankHub.paymentMethod', 'Method')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('bankHub.reference', 'Reference')}</TableHead>
                      <TableHead className="text-right dark:text-slate-200">{t('bankHub.amount', 'Amount')}</TableHead>
                      <TableHead className="dark:text-slate-200">{t('bankHub.status', 'Status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length > 0 ? (
                      transactions.map((txn) => {
                        const typeInfo = getTypeInfo(txn.type, txn.flow);
                        const paymentInfo = getPaymentMethodInfo(txn.paymentMethod);
                        return (
                          <TableRow key={txn._id} className="dark:hover:bg-slate-700/50">
                            <TableCell className="dark:text-slate-300 whitespace-nowrap">
                              {new Date(txn.transactionDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {renderIcon(typeInfo.icon, "h-4 w-4")}
                                <span className="dark:text-slate-300">{typeInfo.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="dark:text-slate-300">
                              {txn.counterpartyName || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {renderIcon(paymentInfo.icon, "h-4 w-4 text-slate-500")}
                                <span className="dark:text-slate-300">{paymentInfo.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="dark:text-slate-300 font-mono text-xs">
                              {txn.referenceNumber || '-'}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${txn.flow === 'inflow' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {txn.flow === 'inflow' ? '+' : '-'}{formatCurrency(txn.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={txn.status === 'completed' ? 'default' : 'secondary'} className={txn.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}>
                                {txn.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">
                          <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>{t('bankHub.noTransactions', 'No transactions found')}</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('bankHub.cashFlowReport', 'Cash Flow Report')}
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {t('bankHub.cashFlowReportDesc', 'Detailed breakdown of cash inflows and outflows')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    {t('bankHub.reportsComingSoon', 'Detailed reports with charts and analytics coming soon')}
                  </p>
                  <Button variant="outline" onClick={() => handleExport()}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('bankHub.exportFullReport', 'Export Full Report')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}
