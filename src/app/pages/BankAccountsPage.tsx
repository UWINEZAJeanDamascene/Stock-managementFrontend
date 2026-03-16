import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Layout } from '@/app/layout/Layout';
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
import { toast } from 'sonner';
import { journalEntriesApi } from '@/lib/api';
import { 
  Banknote, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight, 
  RefreshCw, 
  Trash2, 
  Building2, 
  Smartphone, 
  Wallet, 
  CheckCircle, 
  Upload, 
  FileSpreadsheet, 
  Link2, 
  AlertCircle, 
  Edit, 
  Eye,
  MoreHorizontal,
  X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface BankAccount {
  _id: string;
  name: string;
  accountType: 'bk_bank' | 'equity_bank' | 'im_bank' | 'cogebanque' | 'ecobank' | 'mtn_momo' | 'airtel_money' | 'cash_in_hand';
  accountNumber?: string;
  bankName?: string;
  branch?: string;
  openingBalance: number;
  currentBalance: number;
  // NEW: Balance calculated from Journal Entries (unified system)
  balance?: number;
  totalDebits?: number;
  totalCredits?: number;
  transactionCount?: number;
  glAccountCode?: string;
  targetBalance?: number;
  currency: string;
  isPrimary: boolean;
  isActive: boolean;
  holderName?: string;
  lastReconciledAt?: string;
  notes?: string;
  color: string;
  createdAt: string;
  // Indicates the balance is calculated from journal entries
  balanceSource?: 'journal_entries';
}

interface BankTransaction {
  _id: string;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'opening' | 'closing';
  amount: number;
  balanceAfter: number;
  description?: string;
  date: string;
  paymentMethod?: string;
  referenceNumber?: string;
  status: string;
  createdBy?: { name: string };
  notes?: string;
  account?: { name: string; accountType: string };
}

interface CashPosition {
  total: number;
  byType: {
    bk_bank: number;
    equity_bank: number;
    im_bank: number;
    cogebanque: number;
    ecobank: number;
    mtn_momo: number;
    airtel_money: number;
    cash_in_hand: number;
  };
  accounts: Array<{
    _id: string;
    name: string;
    accountType: string;
    currentBalance: number;
  }>;
}

const ACCOUNT_TYPES = [
  { value: 'bk_bank', label: 'BK Bank (Bank of Kigali)', icon: Building2, color: '#1E40AF' },
  { value: 'equity_bank', label: 'Equity Bank Rwanda', icon: Building2, color: '#059669' },
  { value: 'im_bank', label: 'I&M Bank', icon: Building2, color: '#0891B2' },
  { value: 'cogebanque', label: 'Cogebanque', icon: Building2, color: '#DC2626' },
  { value: 'ecobank', label: 'Ecobank Rwanda', icon: Building2, color: '#EA580C' },
  { value: 'mtn_momo', label: 'MTN MoMo', icon: Smartphone, color: '#F59E0B' },
  { value: 'airtel_money', label: 'Airtel Money', icon: Smartphone, color: '#DC2626' },
  { value: 'cash_in_hand', label: 'Cash in Hand', icon: Wallet, color: '#7C3AED' },
];

const TRANSACTION_TYPES = [
  { value: 'deposit', label: 'Deposit', icon: ArrowDownLeft, color: '#10B981' },
  { value: 'withdrawal', label: 'Withdrawal', icon: ArrowUpRight, color: '#EF4444' },
  { value: 'transfer_in', label: 'Transfer In', icon: ArrowDownLeft, color: '#3B82F6' },
  { value: 'transfer_out', label: 'Transfer Out', icon: ArrowUpRight, color: '#F59E0B' },
  { value: 'adjustment', label: 'Adjustment', icon: RefreshCw, color: '#8B5CF6' },
];

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token') || '';
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export default function BankAccountsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [cashPosition, setCashPosition] = useState<CashPosition | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [activeTab, setActiveTab] = useState('accounts');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showCSVImportMain, setShowCSVImportMain] = useState(false);
  const [csvImportAccount, setCsvImportAccount] = useState('');
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [csvData, setCSVData] = useState<Array<{date: string; description: string; amount: string; reference: string; debitCredit: 'debit' | 'credit' | ''}>>([]);
  const [autoMatch, setAutoMatch] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reconciliationData, setReconciliationData] = useState<any>(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  
  // CSV Import improvements
  const [bankFormat, setBankFormat] = useState<string>('bk_bank');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [filteredCSVData, setFilteredCSVData] = useState<Array<{date: string; description: string; amount: string; reference: string; debitCredit: 'debit' | 'credit' | ''}>>([]);
  const [importSummary, setImportSummary] = useState<{imported: number; matched: number; unmatched: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit mode state
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  
  const [newAccount, setNewAccount] = useState({
    name: '',
    accountType: 'bk_bank',
    accountNumber: '',
    bankName: '',
    branch: '',
    openingBalance: 0,
    targetBalance: 0,
    currency: 'FRW',
    isPrimary: false,
    holderName: '',
    notes: '',
    color: '#3B82F6',
    glAccountCode: ''
  });
  
  const [transferData, setTransferData] = useState({
    fromAccount: '',
    toAccount: '',
    amount: 0,
    description: '',
    referenceNumber: '',
    notes: ''
  });

  // State for General Ledger transactions (Cash at Bank ledger)
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [ledgerOpeningBalance, setLedgerOpeningBalance] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await apiCall('/bank-accounts');
      console.log('Bank accounts response:', response);
      setAccounts(response.data || []);
      setCashPosition(response.totals || null);
    } catch (error: any) {
      console.error('Error fetching accounts:', error);
      toast.error(t('bankAccounts.errors.fetchAccounts'));
    }
  }, [t]);

  const fetchAllTransactions = useCallback(async () => {
    try {
      const response = await apiCall('/bank-accounts/transactions?limit=100');
      setTransactions(response.data);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
    }
  }, []);

  // Fetch General Ledger transactions for Cash at Bank (1100)
  const fetchLedgerEntries = useCallback(async (accountType: string) => {
    try {
      setLedgerLoading(true);
      
      // Determine account code based on bank account type
      let accountCode = '1100'; // Default: Cash at Bank
      if (accountType === 'cash_in_hand') {
        accountCode = '1000'; // Cash in Hand
      } else if (accountType === 'mtn_momo') {
        accountCode = '1200'; // MTN MoMo
      } else if (accountType === 'airtel_money') {
        accountCode = '1205'; // Airtel Money
      }
      
      // Get current year date range - fetch all year data
      const now = new Date();
      const startDate = `${now.getFullYear()}-01-01`;
      const endDate = `${now.getFullYear()}-12-31`;
      
      // Fetch without accountCode filter first to get all data
      const response = await journalEntriesApi.getGeneralLedger({
        startDate,
        endDate
      });
      
      // Handle both response formats (backend may return different field names)
      if (response.success && response.data && response.data.length > 0) {
        // Try to find account code 1100 (Cash at Bank) 
        // The backend may return either 'code' or 'accountCode'
        let ledgerData = (response.data as any[]).find((a: any) => 
          a.code === accountCode || a.accountCode === accountCode
        );
        
        // If not found by code, try finding by name containing 'Bank' or 'Cash'
        if (!ledgerData) {
          ledgerData = (response.data as any[]).find((a: any) => {
            const name = (a.name || a.accountName || '').toLowerCase();
            return name.includes('bank') || name.includes('cash');
          });
        }
        
        if (ledgerData) {
          // Backend may return either 'entries' or 'transactions'
          const entries = ledgerData.entries || ledgerData.transactions || [];
          setLedgerEntries(entries);
          setLedgerOpeningBalance(ledgerData.openingBalance || 0);
        } else {
          // No cash/bank account found, show empty
          setLedgerEntries([]);
          setLedgerOpeningBalance(0);
        }
      } else {
        setLedgerEntries([]);
        setLedgerOpeningBalance(0);
      }
    } catch (error: any) {
      console.error('Error fetching ledger entries:', error);
      setLedgerEntries([]);
      setLedgerOpeningBalance(0);
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAccounts();
      await fetchAllTransactions();
      setLoading(false);
    };
    loadData();
  }, [fetchAccounts, fetchAllTransactions]);

  // Load ledger entries when transactions tab is active
  useEffect(() => {
    if (activeTab === 'transactions') {
      // Always refresh accounts to ensure we have the latest data
      fetchAccounts().then(() => {
        fetchLedgerEntries('bk_bank');
      });
    }
  }, [activeTab, fetchLedgerEntries, fetchAccounts]);

  useEffect(() => {
    if (selectedAccount) {
      fetchLedgerEntries(selectedAccount.accountType);
    }
  }, [selectedAccount, fetchLedgerEntries]);

  const handleCreateAccount = async () => {
    try {
      // Include GL Account Code based on account type
      const accountData = {
        ...newAccount,
        glAccountCode: getGLAccountCode(newAccount.accountType)
      };
      
      await apiCall('/bank-accounts', {
        method: 'POST',
        body: JSON.stringify(accountData),
      });
      toast.success(t('bankAccounts.messages.accountCreated'));
      setShowAddAccount(false);
      setNewAccount({
        name: '',
        accountType: 'bk_bank',
        accountNumber: '',
        bankName: '',
        branch: '',
        openingBalance: 0,
        targetBalance: 0,
        currency: 'FRW',
        isPrimary: false,
        holderName: '',
        notes: '',
        color: '#3B82F6',
        glAccountCode: ''
      });
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || t('bankAccounts.errors.createAccount'));
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount) return;
    try {
      const { _id, ...updateData } = editingAccount;
      await apiCall(`/bank-accounts/${_id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      toast.success(t('bankAccounts.messages.accountUpdated'));
      setEditingAccount(null);
      fetchAccounts();
      if (selectedAccount?._id === _id) {
        const response = await apiCall(`/bank-accounts/${_id}`);
        setSelectedAccount(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || t('bankAccounts.errors.updateAccount'));
    }
  };

  const handleTransfer = async () => {
    try {
      await apiCall('/bank-accounts/transfer', {
        method: 'POST',
        body: JSON.stringify(transferData),
      });
      toast.success(t('bankAccounts.messages.transferSuccess'));
      setShowTransfer(false);
      setTransferData({
        fromAccount: '',
        toAccount: '',
        amount: 0,
        description: '',
        referenceNumber: '',
        notes: ''
      });
      fetchAccounts();
      fetchAllTransactions();
    } catch (error: any) {
      toast.error(error.message || t('bankAccounts.errors.transfer'));
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm(t('bankAccounts.confirmations.deleteAccount'))) return;
    try {
      await apiCall(`/bank-accounts/${accountId}`, { method: 'DELETE' });
      toast.success(t('bankAccounts.messages.accountDeleted'));
      setShowAccountDetails(false);
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error: any) {
      toast.error(error.message || t('bankAccounts.errors.delete'));
    }
  };

  // Handle CSV file upload and parsing
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const parsed: Array<{date: string; description: string; amount: string; reference: string; debitCredit: 'debit' | 'credit' | ''}> = [];

      // Skip header row, parse data rows
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Try different CSV parsing approaches
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        
        if (parts.length >= 3) {
          let date = parts[0] || '';
          let description = parts[1] || '';
          let amount = parts[2] || '0';
          const reference = parts[3] || '';
          
          // Parse amount - handle different formats
          let numAmount = parseFloat(amount.replace(/[^0-9.-]/g, '')) || 0;
          
          // Determine debit/credit based on amount sign or format
          let debitCredit: 'debit' | 'credit' | '' = '';
          
          // BK Bank format: positive = credit, negative = debit
          // Some CSVs have separate debit/credit columns
          if (parts.length >= 5) {
            // Check for separate debit/credit columns
            const debitCol = parts[4]?.trim() || '';
            const creditCol = parts[5]?.trim() || '';
            if (debitCol && parseFloat(debitCol.replace(/[^0-9.-]/g, '')) > 0) {
              debitCredit = 'debit';
              amount = debitCol;
            } else if (creditCol && parseFloat(creditCol.replace(/[^0-9.-]/g, '')) > 0) {
              debitCredit = 'credit';
              amount = creditCol;
            }
          } else {
            // Default: positive = credit, negative = debit
            debitCredit = numAmount >= 0 ? 'credit' : 'debit';
          }

          parsed.push({ date, description, amount, reference, debitCredit });
        }
      }

      setCSVData(parsed);
      setFilteredCSVData(parsed);
      setImportSummary(null);
      
      // Auto-filter by date range if set
      if (dateFrom || dateTo) {
        filterByDateRange(parsed, dateFrom, dateTo);
      }
    };
    reader.readAsText(file);
  };

  // Filter CSV data by date range
  const filterByDateRange = (data: typeof csvData, from: string, to: string) => {
    let filtered = data;
    
    if (from) {
      const fromDate = new Date(from);
      filtered = filtered.filter(row => {
        const rowDate = new Date(row.date);
        return rowDate >= fromDate;
      });
    }
    
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(row => {
        const rowDate = new Date(row.date);
        return rowDate <= toDate;
      });
    }
    
    setFilteredCSVData(filtered);
  };

  // Handle date range filter change
  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    filterByDateRange(csvData, from, to);
  };

  // Import CSV transactions to account
  const handleImportCSV = async () => {
    const accountId = showCSVImportMain ? csvImportAccount : selectedAccount?._id;
    if (!accountId || filteredCSVData.length === 0) return;
    
    setUploading(true);
    try {
      const response = await apiCall(`/bank-accounts/${accountId}/import-csv`, {
        method: 'POST',
        body: JSON.stringify({
          transactions: filteredCSVData,
          autoMatch,
          bankFormat,
          dateFrom,
          dateTo
        })
      });
      
      // Show import summary
      const imported = response.data?.imported || filteredCSVData.length;
      const matched = response.data?.matched || 0;
      const unmatched = imported - matched;
      setImportSummary({ imported, matched, unmatched });
      
      toast.success(t('bankAccounts.messages.csvImported', { count: imported }));
      
      // Refresh data after a short delay to show summary
      setTimeout(() => {
        setShowCSVUpload(false);
        setShowCSVImportMain(false);
        setCSVData([]);
        setFilteredCSVData([]);
        setCsvImportAccount('');
        setImportSummary(null);
        setDateFrom('');
        setDateTo('');
        if (selectedAccount) {
          fetchLedgerEntries(selectedAccount.accountType);
        }
        fetchAccounts();
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || t('bankAccounts.errors.importCSV'));
    } finally {
      setUploading(false);
    }
  };

  // Get reconciliation report
  const handleGetReconciliation = async () => {
    if (!selectedAccount) return;
    
    setReconciliationLoading(true);
    try {
      const response = await apiCall(`/bank-accounts/${selectedAccount._id}/reconciliation-report`);
      setReconciliationData(response.data);
    } catch (error: any) {
      toast.error(error.message || t('bankAccounts.errors.reconciliation'));
    } finally {
      setReconciliationLoading(false);
    }
  };

  const getAccountTypeInfo = (type: string) => {
    return ACCOUNT_TYPES.find(acc => acc.value === type) || ACCOUNT_TYPES[0];
  };

  // Helper to get GL Account Code from account type
  const getGLAccountCode = (accountType: string): string => {
    const glCodeMap: Record<string, string> = {
      'bk_bank': '1105',
      'equity_bank': '1110',
      'im_bank': '1115',
      'cogebanque': '1120',
      'ecobank': '1125',
      'mtn_momo': '1200',
      'airtel_money': '1205',
      'cash_in_hand': '1000'
    };
    return glCodeMap[accountType] || '1100';
  };

  const getTransactionTypeInfo = (type: string) => {
    return TRANSACTION_TYPES.find(tx => tx.value === type) || TRANSACTION_TYPES[0];
  };

  const getBalanceColor = (balance: number, target?: number) => {
    if (target && balance < target) return 'text-red-600 dark:text-red-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-slate-600 dark:text-slate-400">{t('common.loading')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{t('bankAccounts.title')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('bankAccounts.subtitle')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Transfer Button */}
          <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 dark:border-slate-600 dark:text-slate-200">
                <ArrowLeftRight className="h-4 w-4" />
                {t('bankAccounts.actions.transfer')}
              </Button>
            </DialogTrigger>
            <DialogContent className="dark:bg-slate-800">
              <DialogHeader>
                <DialogTitle className="dark:text-white">{t('bankAccounts.transfer.title')}</DialogTitle>
                <DialogDescription className="dark:text-slate-400">{t('bankAccounts.transfer.description')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('bankAccounts.transfer.from')}</Label>
                  <Select value={transferData.fromAccount} onValueChange={(v) => setTransferData({ ...transferData, fromAccount: v })}>
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600"><SelectValue placeholder={t('bankAccounts.transfer.selectFrom')} /></SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {accounts.filter(a => a.isActive).map(account => (
                        <SelectItem key={account._id} value={account._id}>
                          {account.name} - {formatCurrency(account.currentBalance)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('bankAccounts.transfer.to')}</Label>
                  <Select value={transferData.toAccount} onValueChange={(v) => setTransferData({ ...transferData, toAccount: v })}>
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600"><SelectValue placeholder={t('bankAccounts.transfer.selectTo')} /></SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {accounts.filter(a => a.isActive && a._id !== transferData.fromAccount).map(account => (
                        <SelectItem key={account._id} value={account._id}>{account.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('bankAccounts.transfer.amount')}</Label>
                  <Input 
                    type="number" 
                    value={transferData.amount} 
                    onChange={(e) => setTransferData({ ...transferData, amount: parseFloat(e.target.value) || 0 })} 
                    placeholder="0.00"
                    className="dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('bankAccounts.transfer.description')}</Label>
                  <Input 
                    value={transferData.description} 
                    onChange={(e) => setTransferData({ ...transferData, description: e.target.value })} 
                    placeholder={t('bankAccounts.transfer.descriptionPlaceholder')}
                    className="dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTransfer(false)} className="dark:border-slate-600 dark:text-slate-200">{t('common.cancel')}</Button>
                <Button onClick={handleTransfer} disabled={!transferData.fromAccount || !transferData.toAccount || transferData.amount <= 0}>
                  {t('bankAccounts.actions.transfer')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Add Account Button */}
          <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('bankAccounts.actions.addAccount')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl dark:bg-slate-800">
              <DialogHeader>
                <DialogTitle className="dark:text-white">{t('bankAccounts.addAccount.title')}</DialogTitle>
                <DialogDescription className="dark:text-slate-400">{t('bankAccounts.addAccount.description')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.name')}</Label>
                    <Input 
                      value={newAccount.name} 
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} 
                      placeholder={t('bankAccounts.addAccount.namePlaceholder')}
                      className="dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.type')}</Label>
                    <Select value={newAccount.accountType} onValueChange={(v) => setNewAccount({ ...newAccount, accountType: v })}>
                      <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600"><SelectValue /></SelectTrigger>
                      <SelectContent className="dark:bg-slate-800">
                        {ACCOUNT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* GL Account Code - auto-calculated based on account type */}
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">GL Account Code</Label>
                    <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                      <span className="font-mono text-lg font-semibold dark:text-white">{getGLAccountCode(newAccount.accountType)}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">(auto-assigned)</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      This code links the bank account to Journal Entries for automatic balance calculation
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.accountNumber')}</Label>
                    <Input 
                      value={newAccount.accountNumber} 
                      onChange={(e) => setNewAccount({ ...newAccount, accountNumber: e.target.value })} 
                      placeholder={t('bankAccounts.addAccount.accountNumberPlaceholder')}
                      className="dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.bankName')}</Label>
                    <Input 
                      value={newAccount.bankName} 
                      onChange={(e) => setNewAccount({ ...newAccount, bankName: e.target.value })} 
                      placeholder={t('bankAccounts.addAccount.bankNamePlaceholder')}
                      className="dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.branch')}</Label>
                    <Input 
                      value={newAccount.branch} 
                      onChange={(e) => setNewAccount({ ...newAccount, branch: e.target.value })} 
                      placeholder={t('bankAccounts.addAccount.branchPlaceholder')}
                      className="dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.openingBalance')}</Label>
                    <Input 
                      type="number" 
                      value={newAccount.openingBalance} 
                      onChange={(e) => setNewAccount({ ...newAccount, openingBalance: parseFloat(e.target.value) || 0 })} 
                      placeholder="0.00"
                      className="dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.targetBalance')}</Label>
                    <Input 
                      type="number" 
                      value={newAccount.targetBalance} 
                      onChange={(e) => setNewAccount({ ...newAccount, targetBalance: parseFloat(e.target.value) || 0 })} 
                      placeholder="0.00"
                      className="dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.holderName')}</Label>
                    <Input 
                      value={newAccount.holderName} 
                      onChange={(e) => setNewAccount({ ...newAccount, holderName: e.target.value })} 
                      placeholder={t('bankAccounts.addAccount.holderNamePlaceholder')}
                      className="dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.notes')}</Label>
                    <Textarea 
                      value={newAccount.notes} 
                      onChange={(e) => setNewAccount({ ...newAccount, notes: e.target.value })} 
                      placeholder={t('bankAccounts.addAccount.notesPlaceholder')}
                      className="dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <input 
                      type="checkbox" 
                      id="isPrimary" 
                      checked={newAccount.isPrimary} 
                      onChange={(e) => setNewAccount({ ...newAccount, isPrimary: e.target.checked })} 
                      className="rounded"
                    />
                    <label htmlFor="isPrimary" className="dark:text-slate-200">{t('bankAccounts.addAccount.isPrimary')}</label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddAccount(false)} className="dark:border-slate-600 dark:text-slate-200">{t('common.cancel')}</Button>
                <Button onClick={handleCreateAccount} disabled={!newAccount.name}>{t('bankAccounts.actions.create')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* CSV Import Button - Show if accounts exist */}
          {accounts.length > 0 && (
            <>
              <Button variant="outline" onClick={() => setShowCSVImportMain(true)} className="gap-1 dark:border-slate-600 dark:text-slate-200">
                <Upload className="h-4 w-4" />
                {t('bankAccounts.actions.importCSV')}
              </Button>
              <Dialog open={showCSVImportMain} onOpenChange={setShowCSVImportMain}>
                <DialogContent className="max-w-2xl dark:bg-slate-800">
                  <DialogHeader>
                    <DialogTitle className="dark:text-white">{t('bankAccounts.csvImport.title')}</DialogTitle>
                    <DialogDescription className="dark:text-slate-400">{t('bankAccounts.csvImport.description')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="dark:text-slate-200">{t('bankAccounts.csvImport.selectAccount')}</Label>
                        <Select value={csvImportAccount} onValueChange={setCsvImportAccount}>
                          <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                            <SelectValue placeholder={t('bankAccounts.csvImport.selectAccountPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800">
                            {accounts.map(account => (
                              <SelectItem key={account._id} value={account._id}>{account.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-slate-200">{t('bankAccounts.csvImport.bankFormat')}</Label>
                        <Select value={bankFormat} onValueChange={setBankFormat}>
                          <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                            <SelectValue placeholder={t('bankAccounts.csvImport.selectBankFormat')} />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800">
                            {ACCOUNT_TYPES.filter(t => t.value !== 'cash_in_hand').map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Date Range Filter */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="dark:text-slate-200">{t('bankAccounts.csvImport.dateFrom')}</Label>
                        <Input 
                          type="date" 
                          value={dateFrom} 
                          onChange={(e) => handleDateRangeChange(e.target.value, dateTo)}
                          className="dark:bg-slate-700 dark:border-slate-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-slate-200">{t('bankAccounts.csvImport.dateTo')}</Label>
                        <Input 
                          type="date" 
                          value={dateTo} 
                          onChange={(e) => handleDateRangeChange(dateFrom, e.target.value)}
                          className="dark:bg-slate-700 dark:border-slate-600"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="dark:text-slate-200">{t('bankAccounts.csvImport.selectFile')}</Label>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleCSVUpload}
                        className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600"
                      />
                    </div>
                    
                    {/* Large Import Warning */}
                    {csvData.length > 500 && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{t('bankAccounts.csvImport.largeImportWarning')}</p>
                          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">{t('bankAccounts.csvImport.largeImportHint')}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Import Summary */}
                    {importSummary && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <p className="font-medium text-green-700 dark:text-green-400 mb-2">{t('bankAccounts.csvImport.importSummary')}</p>
                        <div className="flex gap-4 text-sm">
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            {t('bankAccounts.csvImport.imported', { count: importSummary.imported })}
                          </span>
                          <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <Link2 className="h-4 w-4" />
                            {t('bankAccounts.csvImport.matched', { count: importSummary.matched })}
                          </span>
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-4 w-4" />
                            {t('bankAccounts.csvImport.unmatched', { count: importSummary.unmatched })}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {filteredCSVData.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {t('bankAccounts.csvImport.preview', { count: filteredCSVData.length })}
                          {filteredCSVData.length !== csvData.length && (
                            <span className="ml-2 text-amber-600 dark:text-amber-400">
                              ({t('bankAccounts.csvImport.filtered', { total: csvData.length })})
                            </span>
                          )}
                        </p>
                        <div className="max-h-60 overflow-y-auto border rounded dark:border-slate-600">
                          <Table>
                            <TableHeader>
                              <TableRow className="dark:bg-slate-700">
                                <TableHead className="dark:text-slate-200">{t('bankAccounts.table.date')}</TableHead>
                                <TableHead className="dark:text-slate-200">{t('bankAccounts.table.description')}</TableHead>
                                <TableHead className="text-right dark:text-slate-200">{t('bankAccounts.table.amount')}</TableHead>
                                <TableHead className="text-center dark:text-slate-200">{t('bankAccounts.table.debitCredit')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredCSVData.slice(0, 10).map((row, i) => (
                                <TableRow key={i} className="dark:hover:bg-slate-700">
                                  <TableCell className="dark:text-slate-300 whitespace-nowrap">{row.date}</TableCell>
                                  <TableCell className="dark:text-slate-300 max-w-xs truncate">{row.description}</TableCell>
                                  <TableCell className="text-right dark:text-slate-300 font-mono">{row.amount}</TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={row.debitCredit === 'credit' ? 'default' : 'destructive'} className={row.debitCredit === 'credit' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}>
                                      {row.debitCredit === 'credit' ? t('bankAccounts.credit') : row.debitCredit === 'debit' ? t('bankAccounts.debit') : '-'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="autoMatchImport"
                            checked={autoMatch}
                            onChange={(e) => setAutoMatch(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="autoMatchImport" className="dark:text-slate-200 text-sm">{t('bankAccounts.csvImport.autoMatch')}</Label>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setShowCSVImportMain(false); setCSVData([]); setFilteredCSVData([]); setCsvImportAccount(''); setImportSummary(null); setDateFrom(''); setDateTo(''); }} className="dark:border-slate-600 dark:text-slate-200">
                      {t('common.cancel')}
                    </Button>
                    <Button onClick={handleImportCSV} disabled={filteredCSVData.length === 0 || uploading || !csvImportAccount || !!importSummary}>
                      {uploading ? t('common.loading') : t('bankAccounts.actions.import')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {cashPosition && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
          <Card className="col-span-2 sm:col-span-3 lg:col-span-4 xl:col-span-2 dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-200">{t('bankAccounts.totalCashPosition')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(cashPosition.total)}</div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('bankAccounts.acrossAccounts', { count: cashPosition.accounts.length })}</p>
            </CardContent>
          </Card>
          
          {ACCOUNT_TYPES.map(type => (
            <Card key={type.value} className="dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-2 dark:text-slate-200">
                  <type.icon className="h-3 w-3 md:h-4 md:w-4" style={{ color: type.color }} />
                  <span className="truncate">{type.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-sm md:text-xl font-bold ${getBalanceColor(cashPosition.byType[type.value as keyof typeof cashPosition.byType])}`}>
                  {formatCurrency(cashPosition.byType[type.value as keyof typeof cashPosition.byType] || 0)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="dark:bg-slate-800">
          <TabsTrigger value="accounts" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">{t('bankAccounts.tabs.accounts')}</TabsTrigger>
          <TabsTrigger value="transactions" className="dark:text-slate-200 dark:data-[state=active]:bg-slate-700">{t('bankAccounts.tabs.transactions')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="accounts" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {accounts.map(account => {
              const typeInfo = getAccountTypeInfo(account.accountType);
              return (
                <Card 
                  key={account._id} 
                  className={`cursor-pointer hover:shadow-md transition-all duration-200 dark:bg-slate-800 dark:border-slate-700 ${selectedAccount?._id === account._id ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''}`}
                  onClick={() => { setSelectedAccount(account); setShowAccountDetails(true); }}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${typeInfo.color}20` }}>
                          <typeInfo.icon className="h-4 w-4 md:h-5 md:w-5" style={{ color: typeInfo.color }} />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm md:text-base truncate dark:text-white">{account.name}</CardTitle>
                          <CardDescription className="text-xs dark:text-slate-400 truncate">{t(`bankAccounts.accountTypes.${account.accountType}`)}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {account.isPrimary && <Badge variant="secondary" className="text-xs flex-shrink-0">{t('bankAccounts.primary')}</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400">{t('bankAccounts.currentBalance')}</span>
                        <span className={`text-base md:text-lg font-bold ${getBalanceColor(account.balance !== undefined ? account.balance : account.currentBalance, account.targetBalance)}`}>
                          {formatCurrency(account.balance !== undefined ? account.balance : account.currentBalance)}
                        </span>
                      </div>
                      {account.glAccountCode && (
                        <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                          GL: {account.glAccountCode}
                        </div>
                      )}
                      {account.accountNumber && (
                        <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate">{t('bankAccounts.accountNumber')}: {account.accountNumber}</div>
                      )}
                      {account.bankName && (
                        <div className="text-xs md:text-sm text-slate-500 dark:text-slate-400 truncate">{account.bankName} {account.branch && `- ${account.branch}`}</div>
                      )}
                      {account.lastReconciledAt && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {t('bankAccounts.lastReconciled')}: {new Date(account.lastReconciledAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            {accounts.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Banknote className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 dark:text-slate-400">{t('bankAccounts.noAccounts')}</p>
                <Button className="mt-4" onClick={() => setShowAddAccount(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('bankAccounts.actions.addAccount')}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-4">
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="dark:text-white">General Ledger - Cash at Bank (1100)</CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Journal entries for all bank accounts</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fetchLedgerEntries('bk_bank')}
                  disabled={ledgerLoading}
                  className="dark:border-slate-600 dark:text-slate-200 gap-1"
                >
                  <RefreshCw className={`h-4 w-4 ${ledgerLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ledgerLoading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Opening Balance Summary */}
                  <div className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium dark:text-slate-300">Opening Balance:</span>
                      <span className="text-sm dark:text-slate-400">(OPB)</span>
                    </div>
                    <span className="text-lg font-bold dark:text-white">{formatCurrency(ledgerOpeningBalance)}</span>
                  </div>
                  
                  {/* Ledger Entries Table */}
                  <div className="overflow-x-auto border rounded-lg dark:border-slate-600">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="dark:bg-slate-700">
                          <TableHead className="dark:text-slate-200 whitespace-nowrap w-24">Date</TableHead>
                          <TableHead className="dark:text-slate-200 whitespace-nowrap w-20">JE #</TableHead>
                          <TableHead className="dark:text-slate-200 w-auto">Description</TableHead>
                          <TableHead className="text-right dark:text-slate-200 whitespace-nowrap w-28">Debit</TableHead>
                          <TableHead className="text-right dark:text-slate-200 whitespace-nowrap w-28">Credit</TableHead>
                          <TableHead className="text-right dark:text-slate-200 whitespace-nowrap w-32">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Ledger Entry Rows */}
                        {ledgerEntries.map((entry: any, idx: number) => {
                          const prevBalance = ledgerOpeningBalance + 
                            ledgerEntries.slice(0, idx).reduce((s: number, t: any) => s + (t.debit || 0) - (t.credit || 0), 0);
                          const currentBalance = prevBalance + (entry.debit || 0) - (entry.credit || 0);
                          
                          return (
                            <TableRow key={entry.entryNumber || idx} className="dark:hover:bg-slate-700/50">
                              <TableCell className="dark:text-slate-300 whitespace-nowrap">
                                {entry.date ? new Date(entry.date).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell className="font-mono text-xs dark:text-slate-300 whitespace-nowrap">
                                {entry.entryNumber || '-'}
                              </TableCell>
                              <TableCell className="dark:text-slate-300 max-w-xs truncate">
                                {entry.description || '-'}
                              </TableCell>
                              <TableCell className={`text-right font-mono dark:text-slate-300 whitespace-nowrap ${entry.debit > 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                                {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                              </TableCell>
                              <TableCell className={`text-right font-mono dark:text-slate-300 whitespace-nowrap ${entry.credit > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                              </TableCell>
                              <TableCell className={`text-right font-mono font-medium dark:text-slate-300 whitespace-nowrap ${currentBalance >= 0 ? '' : 'text-red-600'}`}>
                                {formatCurrency(currentBalance)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        
                        {ledgerEntries.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-slate-500 dark:text-slate-400">
                              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>No journal entries found for Cash at Bank</p>
                              <p className="text-sm mt-1">Transactions will appear here once journal entries are created</p>
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {/* Closing Balance Row */}
                        {ledgerEntries.length > 0 && (
                          <TableRow className="bg-slate-800 dark:bg-slate-900 font-bold">
                            <TableCell className="text-white whitespace-nowrap">-</TableCell>
                            <TableCell className="text-white whitespace-nowrap">CPB</TableCell>
                            <TableCell className="text-white" colSpan={3}>Closing Balance</TableCell>
                            <TableCell className="text-right font-mono text-white whitespace-nowrap">
                              {formatCurrency(accounts.length > 0 ? accounts.reduce((sum, acc) => sum + acc.currentBalance, 0) : (cashPosition?.total || 0))}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Current Balance Summary */}
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 flex items-center justify-between border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium dark:text-indigo-200">Current Bank Balance:</span>
                      <span className="text-sm dark:text-indigo-400">(CPB)</span>
                    </div>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(
                        accounts.length > 0 
                          ? accounts.reduce((sum, acc) => sum + acc.currentBalance, 0) 
                          : (cashPosition?.total || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Account Details Dialog */}
      <Dialog open={showAccountDetails && !!selectedAccount} onOpenChange={setShowAccountDetails}>
        {selectedAccount && (
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 dark:text-white">
                {(() => { const typeInfo = getAccountTypeInfo(selectedAccount.accountType); return <typeInfo.icon className="h-5 w-5" style={{ color: typeInfo.color }} />; })()}
                {selectedAccount.name}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {t(`bankAccounts.accountTypes.${selectedAccount.accountType}`)}
                {selectedAccount.accountNumber && ` - ${selectedAccount.accountNumber}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Balance Summary */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('bankAccounts.openingBalance')}</p>
                    <p className="text-lg font-semibold dark:text-white">{formatCurrency(selectedAccount.openingBalance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('bankAccounts.currentBalance')}</p>
                    <p className={`text-2xl font-bold ${getBalanceColor(selectedAccount.balance !== undefined ? selectedAccount.balance : selectedAccount.currentBalance, selectedAccount.targetBalance)}`}>
                      {formatCurrency(selectedAccount.balance !== undefined ? selectedAccount.balance : selectedAccount.currentBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('bankAccounts.targetBalance')}</p>
                    <p className="text-lg font-semibold dark:text-white">{formatCurrency(selectedAccount.targetBalance || 0)}</p>
                  </div>
                  {selectedAccount.glAccountCode && (
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">GL Account Code</p>
                      <p className="text-lg font-semibold dark:text-white font-mono">{selectedAccount.glAccountCode}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                {/* Edit Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1 dark:border-slate-600 dark:text-slate-200"
                  onClick={() => setEditingAccount({...selectedAccount})}
                >
                  <Edit className="h-4 w-4" />
                  {t('common.edit')}
                </Button>
                
                {/* CSV Import Button */}
                <Dialog open={showCSVUpload} onOpenChange={setShowCSVUpload}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 dark:border-slate-600 dark:text-slate-200">
                      <Upload className="h-4 w-4" />
                      {t('bankAccounts.actions.importCSV')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl dark:bg-slate-800">
                    <DialogHeader>
                      <DialogTitle className="dark:text-white">{t('bankAccounts.csvImport.title')}</DialogTitle>
                      <DialogDescription className="dark:text-slate-400">{t('bankAccounts.csvImport.description')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Bank Format Selector */}
                      <div className="space-y-2">
                        <Label className="dark:text-slate-200">{t('bankAccounts.csvImport.bankFormat')}</Label>
                        <Select value={bankFormat} onValueChange={setBankFormat}>
                          <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600">
                            <SelectValue placeholder={t('bankAccounts.csvImport.selectBankFormat')} />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800">
                            {ACCOUNT_TYPES.filter(t => t.value !== 'cash_in_hand').map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Date Range Filter */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="dark:text-slate-200">{t('bankAccounts.csvImport.dateFrom')}</Label>
                          <Input 
                            type="date" 
                            value={dateFrom} 
                            onChange={(e) => handleDateRangeChange(e.target.value, dateTo)}
                            className="dark:bg-slate-700 dark:border-slate-600"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="dark:text-slate-200">{t('bankAccounts.csvImport.dateTo')}</Label>
                          <Input 
                            type="date" 
                            value={dateTo} 
                            onChange={(e) => handleDateRangeChange(dateFrom, e.target.value)}
                            className="dark:bg-slate-700 dark:border-slate-600"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="dark:text-slate-200">{t('bankAccounts.csvImport.selectFile')}</Label>
                        <input
                          type="file"
                          accept=".csv,.txt"
                          onChange={handleCSVUpload}
                          className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600"
                        />
                      </div>
                      
                      {/* Large Import Warning */}
                      {csvData.length > 500 && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{t('bankAccounts.csvImport.largeImportWarning')}</p>
                            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">{t('bankAccounts.csvImport.largeImportHint')}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Import Summary */}
                      {importSummary && (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <p className="font-medium text-green-700 dark:text-green-400 mb-2">{t('bankAccounts.csvImport.importSummary')}</p>
                          <div className="flex gap-4 text-sm">
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="h-4 w-4" />
                              {t('bankAccounts.csvImport.imported', { count: importSummary.imported })}
                            </span>
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <Link2 className="h-4 w-4" />
                              {t('bankAccounts.csvImport.matched', { count: importSummary.matched })}
                            </span>
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <AlertCircle className="h-4 w-4" />
                              {t('bankAccounts.csvImport.unmatched', { count: importSummary.unmatched })}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {filteredCSVData.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {t('bankAccounts.csvImport.preview', { count: filteredCSVData.length })}
                            {filteredCSVData.length !== csvData.length && (
                              <span className="ml-2 text-amber-600 dark:text-amber-400">
                                ({t('bankAccounts.csvImport.filtered', { total: csvData.length })})
                              </span>
                            )}
                          </p>
                          <div className="max-h-40 overflow-y-auto border rounded dark:border-slate-600">
                            <Table>
                              <TableHeader>
                                <TableRow className="dark:bg-slate-700">
                                  <TableHead className="dark:text-slate-200">{t('bankAccounts.table.date')}</TableHead>
                                  <TableHead className="dark:text-slate-200">{t('bankAccounts.table.description')}</TableHead>
                                  <TableHead className="text-right dark:text-slate-200">{t('bankAccounts.table.amount')}</TableHead>
                                  <TableHead className="text-center dark:text-slate-200">{t('bankAccounts.table.debitCredit')}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredCSVData.slice(0, 5).map((row, i) => (
                                  <TableRow key={i} className="dark:hover:bg-slate-700">
                                    <TableCell className="dark:text-slate-300 whitespace-nowrap">{row.date}</TableCell>
                                    <TableCell className="dark:text-slate-300 max-w-xs truncate">{row.description}</TableCell>
                                    <TableCell className="text-right dark:text-slate-300 font-mono">{row.amount}</TableCell>
                                    <TableCell className="text-center">
                                      <Badge variant={row.debitCredit === 'credit' ? 'default' : 'destructive'} className={row.debitCredit === 'credit' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}>
                                        {row.debitCredit === 'credit' ? t('bankAccounts.credit') : row.debitCredit === 'debit' ? t('bankAccounts.debit') : '-'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="autoMatchDetail"
                              checked={autoMatch}
                              onChange={(e) => setAutoMatch(e.target.checked)}
                              className="rounded"
                            />
                            <Label htmlFor="autoMatchDetail" className="dark:text-slate-200 text-sm">{t('bankAccounts.csvImport.autoMatch')}</Label>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setShowCSVUpload(false); setCSVData([]); setFilteredCSVData([]); setImportSummary(null); setDateFrom(''); setDateTo(''); }} className="dark:border-slate-600 dark:text-slate-200">
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={handleImportCSV} disabled={filteredCSVData.length === 0 || uploading || !!importSummary}>
                        {uploading ? t('common.loading') : t('bankAccounts.actions.import')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                {/* Reconciliation Button */}
                <Dialog open={showReconciliation} onOpenChange={setShowReconciliation}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 dark:border-slate-600 dark:text-slate-200" onClick={handleGetReconciliation}>
                      <CheckCircle className="h-4 w-4" />
                      {t('bankAccounts.reconciliation.title')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-slate-800">
                    <DialogHeader>
                      <DialogTitle className="dark:text-white">{t('bankAccounts.reconciliation.title')}</DialogTitle>
                      <DialogDescription className="dark:text-slate-400">{t('bankAccounts.reconciliation.description')}</DialogDescription>
                    </DialogHeader>
                    
                    {reconciliationLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                      </div>
                    ) : reconciliationData ? (
                      <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4">
                          <Card className="dark:bg-slate-700 dark:border-slate-600">
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm font-medium dark:text-white">{t('bankAccounts.reconciliation.matched')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{reconciliationData.matched?.length || 0}</p>
                            </CardContent>
                          </Card>
                          <Card className="dark:bg-slate-700 dark:border-slate-600">
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm font-medium dark:text-white">{t('bankAccounts.reconciliation.unmatched')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{reconciliationData.unmatched?.length || 0}</p>
                            </CardContent>
                          </Card>
                          <Card className="dark:bg-slate-700 dark:border-slate-600">
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm font-medium dark:text-white">{t('bankAccounts.reconciliation.difference')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-2xl font-bold dark:text-white">{formatCurrency(reconciliationData.difference || 0)}</p>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Matched Transactions */}
                        {reconciliationData.matched && reconciliationData.matched.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 dark:text-white">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              {t('bankAccounts.reconciliation.matchedTransactions')}
                            </h3>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="dark:bg-slate-700">
                                    <TableHead className="dark:text-slate-200">{t('bankAccounts.table.date')}</TableHead>
                                    <TableHead className="dark:text-slate-200">{t('bankAccounts.table.description')}</TableHead>
                                    <TableHead className="dark:text-slate-200">{t('bankAccounts.table.amount')}</TableHead>
                                    <TableHead className="dark:text-slate-200">{t('bankAccounts.reconciliation.matchedTo')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {reconciliationData.matched.map((item: any, idx: number) => (
                                    <TableRow key={idx} className="dark:hover:bg-slate-700">
                                      <TableCell className="dark:text-slate-300">{new Date(item.transaction.date).toLocaleDateString()}</TableCell>
                                      <TableCell className="dark:text-slate-300">{item.transaction.description}</TableCell>
                                      <TableCell className={item.transaction.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                        {formatCurrency(Math.abs(item.transaction.amount))}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="dark:border-slate-600 dark:text-slate-300">{item.matchedTo.type}: {item.matchedTo.reference}</Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}

                        {/* Unmatched Transactions */}
                        {reconciliationData.unmatched && reconciliationData.unmatched.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 dark:text-white">
                              <AlertCircle className="h-5 w-5 text-red-600" />
                              {t('bankAccounts.reconciliation.unmatchedTransactions')}
                            </h3>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="dark:bg-slate-700">
                                    <TableHead className="dark:text-slate-200">{t('bankAccounts.table.date')}</TableHead>
                                    <TableHead className="dark:text-slate-200">{t('bankAccounts.table.description')}</TableHead>
                                    <TableHead className="dark:text-slate-200">{t('bankAccounts.table.amount')}</TableHead>
                                    <TableHead className="dark:text-slate-200">{t('bankAccounts.table.status')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {reconciliationData.unmatched.map((item: any, idx: number) => (
                                    <TableRow key={idx} className="dark:hover:bg-slate-700">
                                      <TableCell className="dark:text-slate-300">{new Date(item.transaction.date).toLocaleDateString()}</TableCell>
                                      <TableCell className="dark:text-slate-300">{item.transaction.description}</TableCell>
                                      <TableCell className={item.transaction.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                        {formatCurrency(Math.abs(item.transaction.amount))}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="destructive">{t('bankAccounts.reconciliation.notMatched')}</Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 text-center py-4">{t('bankAccounts.reconciliation.noData')}</p>
                    )}
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowReconciliation(false)} className="dark:border-slate-600 dark:text-slate-200">
                        {t('common.close')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                {/* Delete Button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:border-slate-600"
                  onClick={() => handleDeleteAccount(selectedAccount._id)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('common.delete')}
                </Button>
              </div>

              {/* Ledger Transactions - Cash at Bank */}
              <div>
                <h4 className="font-medium mb-2 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Cash at Bank Ledger ({selectedAccount.glAccountCode || (selectedAccount.accountType === 'cash_in_hand' ? '1000' : selectedAccount.accountType === 'mtn_momo' ? '1200' : selectedAccount.accountType === 'airtel_money' ? '1205' : '1100')})
                </h4>
                {ledgerLoading ? (
                  <div className="flex justify-center py-4">
                    <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="dark:bg-slate-700">
                          <TableHead className="dark:text-slate-200">Date</TableHead>
                          <TableHead className="dark:text-slate-200">JE #</TableHead>
                          <TableHead className="dark:text-slate-200">Description</TableHead>
                          <TableHead className="text-right dark:text-slate-200">Debit</TableHead>
                          <TableHead className="text-right dark:text-slate-200">Credit</TableHead>
                          <TableHead className="text-right dark:text-slate-200">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Opening Balance Row */}
                        <TableRow className="bg-slate-100 dark:bg-slate-700/50">
                          <TableCell className="dark:text-slate-300">-</TableCell>
                          <TableCell className="font-medium dark:text-slate-300">OPB</TableCell>
                          <TableCell className="dark:text-slate-300">Opening Balance</TableCell>
                          <TableCell className="text-right dark:text-slate-300">-</TableCell>
                          <TableCell className="text-right dark:text-slate-300">-</TableCell>
                          <TableCell className="text-right font-mono font-medium dark:text-slate-300">
                            {formatCurrency(ledgerOpeningBalance)}
                          </TableCell>
                        </TableRow>
                        
                        {/* Ledger Entry Rows */}
                        {ledgerEntries.map((entry: any, idx: number) => {
                          const prevBalance = ledgerOpeningBalance + 
                            ledgerEntries.slice(0, idx).reduce((s: number, t: any) => s + (t.debit || 0) - (t.credit || 0), 0);
                          const currentBalance = prevBalance + (entry.debit || 0) - (entry.credit || 0);
                          
                          return (
                            <TableRow key={entry.entryNumber || idx} className="dark:hover:bg-slate-700">
                              <TableCell className="dark:text-slate-300 whitespace-nowrap">
                                {entry.date ? new Date(entry.date).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell className="font-mono text-xs dark:text-slate-300">
                                {entry.entryNumber || '-'}
                              </TableCell>
                              <TableCell className="dark:text-slate-300 max-w-xs truncate">
                                {entry.description || '-'}
                              </TableCell>
                              <TableCell className={`text-right font-mono dark:text-slate-300 ${entry.debit > 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                                {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                              </TableCell>
                              <TableCell className={`text-right font-mono dark:text-slate-300 ${entry.credit > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                              </TableCell>
                              <TableCell className={`text-right font-mono font-medium dark:text-slate-300 ${currentBalance >= 0 ? '' : 'text-red-600'}`}>
                                {formatCurrency(currentBalance)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        
                        {ledgerEntries.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4 text-slate-500 dark:text-slate-400">
                              No ledger entries found
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {/* Closing Balance Row */}
                        {ledgerEntries.length > 0 && (
                          <TableRow className="bg-slate-800 text-white font-bold">
                            <TableCell>-</TableCell>
                            <TableCell>CPB</TableCell>
                            <TableCell colSpan={3}>Closing Balance</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(selectedAccount.balance !== undefined ? selectedAccount.balance : selectedAccount.currentBalance)}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
        {editingAccount && (
          <DialogContent className="max-w-2xl dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{t('bankAccounts.editAccount.title')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.name')}</Label>
                  <Input 
                    value={editingAccount.name} 
                    onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                    className="dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.type')}</Label>
                  <Select value={editingAccount.accountType} onValueChange={(v) => setEditingAccount({ ...editingAccount, accountType: v as any })}>
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600"><SelectValue /></SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {ACCOUNT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.accountNumber')}</Label>
                  <Input 
                    value={editingAccount.accountNumber || ''} 
                    onChange={(e) => setEditingAccount({ ...editingAccount, accountNumber: e.target.value })}
                    className="dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.bankName')}</Label>
                  <Input 
                    value={editingAccount.bankName || ''} 
                    onChange={(e) => setEditingAccount({ ...editingAccount, bankName: e.target.value })}
                    className="dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.targetBalance')}</Label>
                  <Input 
                    type="number" 
                    value={editingAccount.targetBalance || 0} 
                    onChange={(e) => setEditingAccount({ ...editingAccount, targetBalance: parseFloat(e.target.value) || 0 })}
                    className="dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.holderName')}</Label>
                  <Input 
                    value={editingAccount.holderName || ''} 
                    onChange={(e) => setEditingAccount({ ...editingAccount, holderName: e.target.value })}
                    className="dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="dark:text-slate-200">{t('bankAccounts.addAccount.notes')}</Label>
                  <Textarea 
                    value={editingAccount.notes || ''} 
                    onChange={(e) => setEditingAccount({ ...editingAccount, notes: e.target.value })}
                    className="dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingAccount(null)} className="dark:border-slate-600 dark:text-slate-200">{t('common.cancel')}</Button>
              <Button onClick={handleUpdateAccount}>{t('common.save')}</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
      </div>
      </Layout>
  );
}
