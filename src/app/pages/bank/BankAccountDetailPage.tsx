import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { bankAccountsApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Loader2,
  FileText,
  RefreshCw,
  Check,
  Plus,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/app/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useTranslation } from 'react-i18next';

interface BankAccount {
  _id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  accountType: string;
  currencyCode: string;
  openingBalance: number;
  cachedBalance: number;
  isDefault: boolean;
  isPrimary?: boolean;
  isActive: boolean;
  color?: string;
}

interface Transaction {
  _id: string;
  date: string;
  description: string;
  reference: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  runningBalance: number;
}

interface StatementLine {
  _id: string;
  transactionDate: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  runningBalance: number;
  isReconciled: boolean;
}

interface ReconciliationItem {
  _id: string;
  date: string;
  description: string;
  amount: number;
  matched: boolean;
}

export default function BankAccountDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [statementLines, setStatementLines] = useState<StatementLine[]>([]);
  const [activeTab, setActiveTab] = useState('transactions');

  // Reconciliation state
  const [journalItems, setJournalItems] = useState<ReconciliationItem[]>([]);
  const [bankItems, setBankItems] = useState<ReconciliationItem[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const fetchAccount = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await bankAccountsApi.getById(id);
      if (response.success) {
        setAccount(response.data);
      }
    } catch (error) {
      console.error('[BankAccountDetailPage] Failed to fetch account:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchTransactions = useCallback(async () => {
    if (!id) return;
    try {
      const response = await bankAccountsApi.getTransactions(id);
      if (response.success) {
        setTransactions(response.data || []);
      }
    } catch (error) {
      console.error('[BankAccountDetailPage] Failed to fetch transactions:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (account) {
      fetchTransactions();
    }
  }, [account, fetchTransactions]);

  const formatCurrency = (amount: any, currency: string = 'USD') => {
    if (amount === null || amount === undefined || amount === '') return '-';
    // Handle MongoDB Decimal128 or regular numbers/strings
    let num: number;
    if (typeof amount === 'object') {
      // Check for MongoDB Decimal128 format: { "$numberDecimal": "123.45" }
      if (amount.$numberDecimal) {
        num = parseFloat(amount.$numberDecimal);
      } else if (amount.toString && typeof amount.toString === 'function') {
        // Try toString but handle [object Object] case
        const str = amount.toString();
        if (str === '[object Object]') {
          return '-'; // Cannot parse this object
        }
        num = parseFloat(str);
      } else {
        return '-';
      }
    } else if (typeof amount === 'string') {
      num = parseFloat(amount);
    } else {
      num = amount;
    }
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(num || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const getDifference = () => {
    const journalAmount = journalItems.find(j => j._id === selectedJournal)?.amount || 0;
    const bankAmount = bankItems.find(b => b._id === selectedBank)?.amount || 0;
    return journalAmount - bankAmount;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bank-accounts')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{account?.name || t('bankAccount.details', 'Bank Account Details')}</h1>
            <p className="text-muted-foreground">
              {account?.bankName} - {account?.accountNumber}
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('bankAccount.currentBalance', 'Current Balance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(account?.cachedBalance || account?.openingBalance || 0, account?.currencyCode)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('bankAccount.currency', 'Currency')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{account?.currencyCode || 'USD'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('bankAccount.type', 'Type')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{account?.accountType?.replace('_', ' ') || 'Bank'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="transactions">{t('bankAccount.transactions', 'Transactions')}</TabsTrigger>
            <TabsTrigger value="statements">{t('bankAccount.statementLines', 'Statement Lines')}</TabsTrigger>
            <TabsTrigger value="reconciliation">{t('bankAccount.reconciliation', 'Reconciliation')}</TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t('bankAccounts.journalTransactions', 'Journal Transactions')}</CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchTransactions}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('common.refresh', 'Refresh')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('bankAccount.date', 'Date')}</TableHead>
                      <TableHead>{t('bankAccount.description', 'Description')}</TableHead>
                      <TableHead>{t('bankAccount.reference', 'Reference')}</TableHead>
                      <TableHead>{t('bankAccount.type', 'Type')}</TableHead>
                      <TableHead>{t('bankAccount.amount', 'Amount')}</TableHead>
                      <TableHead>{t('bankAccount.runningBalance', 'Running Balance')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {t('bankAccount.noTransactions', 'No transactions found')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx._id}>
                          <TableCell>{formatDate(tx.date)}</TableCell>
                          <TableCell>{tx.description}</TableCell>
                          <TableCell>{tx.reference || '-'}</TableCell>
                          <TableCell>
                            <span className={tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                              {tx.type}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">
                            {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount, account?.currencyCode)}
                          </TableCell>
                          <TableCell>{formatCurrency(tx.runningBalance, account?.currencyCode)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statement Lines Tab */}
          <TabsContent value="statements">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t('bankAccount.bankStatementLines', 'Bank Statement Lines')}</CardTitle>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('bankAccount.importStatement', 'Import Statement')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  {t('bankAccount.noStatementLines', 'No statement lines imported yet. Import a bank statement to see lines here.')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reconciliation Tab */}
          <TabsContent value="reconciliation">
            <Card>
              <CardHeader>
                <CardTitle>{t('bankAccount.reconciliation', 'Bank Reconciliation')}</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Difference Display */}
                <div className="mb-6 p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">{t('bankAccount.difference', 'Difference')}</div>
                  <div className={`text-2xl font-bold ${getDifference() === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(getDifference(), account?.currencyCode)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Journal Items (Left) */}
                  <div>
                    <h3 className="font-medium mb-2">{t('bankAccount.unmatchedJournal', 'Unmatched Journal Lines')}</h3>
                    <div className="border rounded-lg">
                      {journalItems.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          {t('bankAccount.noJournalItems', 'No unmatched journal items')}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead></TableHead>
                              <TableHead>{t('bankAccount.date', 'Date')}</TableHead>
                              <TableHead>{t('bankAccount.description', 'Description')}</TableHead>
                              <TableHead>{t('bankAccount.amount', 'Amount')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {journalItems.map((item) => (
                              <TableRow 
                                key={item._id} 
                                className={selectedJournal === item._id ? 'bg-muted' : ''}
                                onClick={() => setSelectedJournal(item._id)}
                              >
                                <TableCell>
                                  <input 
                                    type="radio" 
                                    checked={selectedJournal === item._id}
                                    onChange={() => setSelectedJournal(item._id)}
                                  />
                                </TableCell>
                                <TableCell>{formatDate(item.date)}</TableCell>
                                <TableCell>{item.description}</TableCell>
                                <TableCell>{formatCurrency(item.amount, account?.currencyCode)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>

                  {/* Bank Statement Items (Right) */}
                  <div>
                    <h3 className="font-medium mb-2">{t('bankAccount.unmatchedStatement', 'Unmatched Statement Lines')}</h3>
                    <div className="border rounded-lg">
                      {bankItems.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          {t('bankAccount.noBankItems', 'No unmatched statement items. Import a statement first.')}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead></TableHead>
                              <TableHead>{t('bankAccount.date', 'Date')}</TableHead>
                              <TableHead>{t('bankAccount.description', 'Description')}</TableHead>
                              <TableHead>{t('bankAccount.amount', 'Amount')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bankItems.map((item) => (
                              <TableRow 
                                key={item._id} 
                                className={selectedBank === item._id ? 'bg-muted' : ''}
                                onClick={() => setSelectedBank(item._id)}
                              >
                                <TableCell>
                                  <input 
                                    type="radio" 
                                    checked={selectedBank === item._id}
                                    onChange={() => setSelectedBank(item._id)}
                                  />
                                </TableCell>
                                <TableCell>{formatDate(item.date)}</TableCell>
                                <TableCell>{item.description}</TableCell>
                                <TableCell>{formatCurrency(item.amount, account?.currencyCode)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match Button */}
                <div className="mt-6 flex justify-center">
                  <Button 
                    disabled={!selectedJournal || !selectedBank || getDifference() !== 0}
                    onClick={() => {
                      // Handle match action
                      console.log('Match:', selectedJournal, selectedBank);
                    }}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {t('bankAccount.match', 'Match Selected')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
