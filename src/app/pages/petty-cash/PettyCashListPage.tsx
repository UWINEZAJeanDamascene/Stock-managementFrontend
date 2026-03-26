import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { pettyCashApi, bankAccountsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Plus,
  Eye,
  RefreshCw,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Search,
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
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export default function PettyCashListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [selectedFund, setSelectedFund] = useState<any | null>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [newFundForm, setNewFundForm] = useState({
    name: '',
    floatAmount: 0,
    openingBalance: 0,
    custodianId: '',
    notes: '',
  });
  
  const [topUpForm, setTopUpForm] = useState({
    amount: 0,
    bank_account_id: '',
    description: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });
  
  const [expenseForm, setExpenseForm] = useState({
    amount: 0,
    expenseAccountId: '5100',
    description: '',
    receiptRef: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  const fetchFunds = useCallback(async () => {
    setLoading(true);
    try {
      const response = await pettyCashApi.getFunds({ isActive: true });
      console.log('[PettyCashListPage] Funds API Response:', response);
      if (response.success && response.data) {
        setFunds(response.data);
      }
    } catch (error) {
      console.error('[PettyCashListPage] Failed to fetch funds:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await bankAccountsApi.getAll({ isActive: true });
      console.log('[PettyCashListPage] Bank accounts response:', response);
      if (response.success) {
        console.log('[PettyCashListPage] Bank accounts data:', response.data);
        setBankAccounts(response.data);
      }
    } catch (error) {
      console.error('[PettyCashListPage] Failed to fetch bank accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchFunds();
    fetchBankAccounts();
  }, [fetchFunds, fetchBankAccounts]);

  const filteredFunds = funds.filter(fund =>
    fund.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (fund.custodian?.name && fund.custodian.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateFund = async () => {
    if (!newFundForm.name || newFundForm.floatAmount <= 0) {
      toast.error('Please provide valid fund details');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await pettyCashApi.createFund({
        name: newFundForm.name,
        floatAmount: newFundForm.floatAmount,
        openingBalance: newFundForm.openingBalance,
        custodianId: newFundForm.custodianId || undefined,
        notes: newFundForm.notes,
      });
      
      if (response.success) {
        toast.success('Petty cash fund created successfully');
        setShowCreateDialog(false);
        setNewFundForm({ name: '', floatAmount: 0, openingBalance: 0, custodianId: '', notes: '' });
        fetchFunds();
      } else {
        toast.error('Failed to create fund');
      }
    } catch (error: any) {
      console.error('[PettyCashListPage] Create fund error:', error);
      toast.error(error.response?.data?.message || 'Failed to create fund');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTopUp = async () => {
    if (!topUpForm.amount || !topUpForm.bank_account_id) {
      toast.error('Please provide amount and select a bank account');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await pettyCashApi.topUp(selectedFund?._id!, {
        amount: topUpForm.amount,
        bank_account_id: topUpForm.bank_account_id,
        description: topUpForm.description,
        transactionDate: topUpForm.transactionDate,
      });
      
      if (response.success) {
        toast.success('Top-up successful');
        setShowTopUpDialog(false);
        setTopUpForm({ amount: 0, bank_account_id: '', description: '', transactionDate: new Date().toISOString().split('T')[0] });
        fetchFunds();
        fetchBankAccounts(); // Refresh bank balances
      } else {
        toast.error('Failed to process top-up');
      }
    } catch (error: any) {
      console.error('[PettyCashListPage] Top-up error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to process top-up';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordExpense = async () => {
    if (!expenseForm.amount || !expenseForm.expenseAccountId) {
      toast.error('Please provide amount and expense account');
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await pettyCashApi.recordExpense(selectedFund?._id!, {
        amount: expenseForm.amount,
        expenseAccountId: expenseForm.expenseAccountId,
        description: expenseForm.description,
        receiptRef: expenseForm.receiptRef,
        transactionDate: expenseForm.transactionDate,
      });
      
      if (response.success) {
        toast.success('Expense recorded successfully');
        setShowExpenseDialog(false);
        setExpenseForm({ amount: 0, expenseAccountId: '5100', description: '', receiptRef: '', transactionDate: new Date().toISOString().split('T')[0] });
        fetchFunds();
      } else {
        toast.error('Failed to record expense');
      }
    } catch (error: any) {
      console.error('[PettyCashListPage] Record expense error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to record expense';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const openTopUpDialog = (fund: any) => {
    setSelectedFund(fund);
    setShowTopUpDialog(true);
  };

  const openExpenseDialog = (fund: any) => {
    setSelectedFund(fund);
    setShowExpenseDialog(true);
  };

  const viewTransactions = (fund: any) => {
    navigate(`/petty-cash/${fund._id}/transactions`);
  };

  const formatCurrency = (amount: any, currency: string = 'USD') => {
    // Handle MongoDB Decimal128 or regular number
    let numAmount = 0;
    if (amount !== null && amount !== undefined && amount !== '') {
      if (typeof amount === 'object') {
        // MongoDB Decimal128
        if (amount.$numberDecimal) {
          numAmount = parseFloat(amount.$numberDecimal);
        } else if (typeof amount.toString === 'function') {
          // Try to convert object to number
          numAmount = parseFloat(amount.toString());
        }
      } else if (typeof amount === 'string') {
        numAmount = parseFloat(amount);
      } else {
        numAmount = Number(amount);
      }
    }
    if (isNaN(numAmount)) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Wallet className="h-8 w-8" />
              {t('pettyCash.title', 'Petty Cash Funds')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('pettyCash.list.description', 'Manage your petty cash funds and transactions')}
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('pettyCash.createFund', 'Create Fund')}
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('pettyCash.search', 'Search funds...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={fetchFunds}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Funds Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredFunds.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No petty cash funds found</p>
              <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
                Create your first fund
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFunds.map((fund) => (
              <Card key={fund._id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold">{fund.name}</CardTitle>
                    <Badge variant={fund.isActive ? 'default' : 'secondary'}>
                      {fund.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {fund.custodian && (
                    <p className="text-sm text-muted-foreground">
                      {t('pettyCash.custodian', 'Custodian')}: {fund.custodian.name}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Balance Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('pettyCash.currentBalance', 'Current Balance')}
                      </p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(fund.currentBalance)}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">
                        {t('pettyCash.floatAmount', 'Float Amount')}
                      </p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(fund.floatAmount)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Replenishment Alert */}
                  {fund.replenishmentNeeded > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-800">
                        {t('pettyCash.replenishmentNeeded', 'Replenishment needed')}: {formatCurrency(fund.replenishmentNeeded)}
                      </span>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => openTopUpDialog(fund)}
                    >
                      <TrendingUp className="h-3 w-3" />
                      {t('pettyCash.topUp', 'Top Up')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => openExpenseDialog(fund)}
                    >
                      <TrendingDown className="h-3 w-3" />
                      {t('pettyCash.recordExpense', 'Expense')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewTransactions(fund)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Fund Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('pettyCash.createFund', 'Create New Fund')}</DialogTitle>
              <DialogDescription>
                Create a new petty cash fund for your organization
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Fund Name *</Label>
                <Input
                  id="name"
                  value={newFundForm.name}
                  onChange={(e) => setNewFundForm({ ...newFundForm, name: e.target.value })}
                  placeholder="e.g., Main Office Petty Cash"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="floatAmount">Float Amount *</Label>
                <Input
                  id="floatAmount"
                  type="number"
                  value={newFundForm.floatAmount}
                  onChange={(e) => setNewFundForm({ ...newFundForm, floatAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="Target balance"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="openingBalance">Opening Balance</Label>
                <Input
                  id="openingBalance"
                  type="number"
                  value={newFundForm.openingBalance}
                  onChange={(e) => setNewFundForm({ ...newFundForm, openingBalance: parseFloat(e.target.value) || 0 })}
                  placeholder="Initial amount"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={newFundForm.notes}
                  onChange={(e) => setNewFundForm({ ...newFundForm, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFund} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Fund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Top Up Dialog */}
        <Dialog open={showTopUpDialog} onOpenChange={setShowTopUpDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('pettyCash.topUp', 'Top Up Petty Cash')}</DialogTitle>
              <DialogDescription>
                Add funds to {selectedFund?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-lg font-semibold">{selectedFund && formatCurrency(selectedFund.currentBalance)}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="topUpAmount">Amount *</Label>
                <Input
                  id="topUpAmount"
                  type="number"
                  value={topUpForm.amount}
                  onChange={(e) => setTopUpForm({ ...topUpForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Amount to add"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bankAccount">Source Bank Account *</Label>
                <Select
                  value={topUpForm.bank_account_id}
                  onValueChange={(value) => setTopUpForm({ ...topUpForm, bank_account_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.name} ({formatCurrency(account.cachedBalance ?? account.currentBalance ?? account.openingBalance ?? 0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="topUpDescription">Description</Label>
                <Input
                  id="topUpDescription"
                  value={topUpForm.description}
                  onChange={(e) => setTopUpForm({ ...topUpForm, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="topUpDate">Transaction Date</Label>
                <Input
                  id="topUpDate"
                  type="date"
                  value={topUpForm.transactionDate}
                  onChange={(e) => setTopUpForm({ ...topUpForm, transactionDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTopUpDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleTopUp} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Top Up
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Record Expense Dialog */}
        <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('pettyCash.recordExpense', 'Record Expense')}</DialogTitle>
              <DialogDescription>
                Record an expense from {selectedFund?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-lg font-semibold">{selectedFund && formatCurrency(selectedFund.currentBalance)}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expenseAmount">Amount *</Label>
                <Input
                  id="expenseAmount"
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Expense amount"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expenseAccount">Expense Account *</Label>
                <Select
                  value={expenseForm.expenseAccountId}
                  onValueChange={(value) => setExpenseForm({ ...expenseForm, expenseAccountId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expense account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5100">Operating Expenses (5100)</SelectItem>
                    <SelectItem value="5200">Administrative Expenses (5200)</SelectItem>
                    <SelectItem value="5300">Marketing Expenses (5300)</SelectItem>
                    <SelectItem value="5400">Travel & Entertainment (5400)</SelectItem>
                    <SelectItem value="5500">Utilities (5500)</SelectItem>
                    <SelectItem value="5600">Office Supplies (5600)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expenseDescription">Description *</Label>
                <Input
                  id="expenseDescription"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="Expense description"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="receiptRef">Receipt Reference</Label>
                <Input
                  id="receiptRef"
                  value={expenseForm.receiptRef}
                  onChange={(e) => setExpenseForm({ ...expenseForm, receiptRef: e.target.value })}
                  placeholder="Receipt number (optional)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expenseDate">Transaction Date</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={expenseForm.transactionDate}
                  onChange={(e) => setExpenseForm({ ...expenseForm, transactionDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordExpense} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}