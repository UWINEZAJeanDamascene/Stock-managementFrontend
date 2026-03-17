import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { journalEntriesApi, GeneralLedgerEntry } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/app/components/ui/table';
import { 
  Download, 
  RefreshCw, 
  ChevronDown,
  ChevronUp,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';

interface GeneralLedgerAccount {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  entries: GeneralLedgerEntry[];
}

export default function GeneralLedgerPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<GeneralLedgerAccount[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [accountList, setAccountList] = useState<{ code: string; name: string }[]>([]);
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const now = new Date();
    // Default to year-to-date (Jan 1 to Dec 31 of current year)
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const lastDay = new Date(now.getFullYear(), 11, 31);
    
    setStartDate(format(firstDay, 'yyyy-MM-dd'));
    setEndDate(format(lastDay, 'yyyy-MM-dd'));
  }, []);

  useEffect(() => {
    fetchAccountsList();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchGeneralLedger();
    }
  }, [startDate, endDate, selectedAccount]);

  const fetchAccountsList = async () => {
    try {
      const response = await journalEntriesApi.getAccounts();
      if (response.success) {
        setAccountList(response.data.map((acc: { code: string; name: string }) => ({
          code: acc.code,
          name: acc.name
        })));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchGeneralLedger = async () => {
    setLoading(true);
    try {
      const params: { startDate: string; endDate: string; accountCode?: string } = {
        startDate,
        endDate
      };
      
      if (selectedAccount && selectedAccount !== 'all') {
        params.accountCode = selectedAccount;
      }
      
      const response = await journalEntriesApi.getGeneralLedger(params);
      
      if (response.success) {
        // Map backend response fields to frontend expected fields
        const mappedAccounts = (response.data || []).map((account: any) => ({
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          openingBalance: account.openingBalance,
          closingBalance: account.closingBalance,
          totalDebits: account.transactions?.reduce((sum: number, t: any) => sum + (t.debit || 0), 0) || 0,
          totalCredits: account.transactions?.reduce((sum: number, t: any) => sum + (t.credit || 0), 0) || 0,
          entries: account.transactions || []
        }));
        setAccounts(mappedAccounts);
      }
    } catch (error) {
      console.error('Error fetching general ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = (code: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [code]: !prev[code]
    }));
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Entry #', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'];
    const rows: string[][] = [];
    
    accounts.forEach(account => {
      rows.push([`${account.accountCode} - ${account.accountName}`, '', '', '', '', '', '']);
      
      rows.push([
        startDate,
        'OPB',
        'Opening Balance',
        '',
        '',
        '',
        account.openingBalance.toFixed(2)
      ]);
      
      let runningBalance = account.openingBalance;
      account.entries.forEach((tx: GeneralLedgerEntry) => {
        // For Asset and Expense accounts: debits increase balance
        // For Liability, Equity and Revenue accounts: credits increase balance
        if (account.accountType === 'asset' || account.accountType === 'expense') {
          runningBalance += tx.debit - tx.credit;
        } else {
          runningBalance += tx.credit - tx.debit;
        }
        rows.push([
          format(new Date(tx.date), 'yyyy-MM-dd'),
          tx.entryNumber,
          tx.description,
          tx.reference || '',
          tx.debit > 0 ? tx.debit.toFixed(2) : '',
          tx.credit > 0 ? tx.credit.toFixed(2) : '',
          runningBalance.toFixed(2)
        ]);
      });
      
      rows.push([
        endDate,
        'CPB',
        'Closing Balance',
        '',
        '',
        '',
        account.closingBalance.toFixed(2)
      ]);
      
      rows.push([]);
    });
    
    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general-ledger-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      asset: 'Assets',
      liability: 'Liabilities',
      equity: 'Equity',
      revenue: 'Revenue',
      expense: 'Expenses'
    };
    return labels[type] || type;
  };

  const totalDebits = accounts.reduce((sum, acc) => sum + acc.totalDebits, 0);
  const totalCredits = accounts.reduce((sum, acc) => sum + acc.totalCredits, 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('General Ledger')}</h1>
          <p className="text-muted-foreground">
            {t('Detailed transaction history by account')} {startDate && endDate ? `(${startDate} to ${endDate})` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchGeneralLedger} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('Refresh')}
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={loading || accounts.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {t('Export CSV')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">{t('Start Date')}</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">{t('End Date')}</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">{t('Account')}</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder={t('All Accounts')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Accounts')}</SelectItem>
                  {accountList.map((acc) => (
                    <SelectItem key={acc.code} value={acc.code}>
                      {acc.code} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">{t('Total Accounts')}</div>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">{t('Total Debits')}</div>
            <div className="text-2xl font-bold">{formatCurrency(totalDebits)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">{t('Total Credits')}</div>
            <div className="text-2xl font-bold">{formatCurrency(totalCredits)}</div>
          </CardContent>
        </Card>
      </div>

      {/* General Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t('General Ledger')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('No journal entries found for this period')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.accountCode} className="border rounded-lg overflow-hidden">
                  {/* Account Header */}
                  <div 
                    className="bg-slate-100 dark:bg-slate-800 p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => toggleAccount(account.accountCode)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedAccounts[account.accountCode] ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                        <div>
                          <div className="font-semibold">
                            {account.accountCode} - {account.accountName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getTypeLabel(account.accountType)} • {account.entries.length} {t('transactions')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">{t('Closing Balance')}</div>
                        <div className="font-bold">
                          {formatCurrency(Math.abs(account.closingBalance))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Transactions */}
                  {expandedAccounts[account.accountCode] && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('Date')}</TableHead>
                          <TableHead>{t('Entry #')}</TableHead>
                          <TableHead>{t('Description')}</TableHead>
                          <TableHead>{t('Reference')}</TableHead>
                          <TableHead className="text-right">{t('Debit')}</TableHead>
                          <TableHead className="text-right">{t('Credit')}</TableHead>
                          <TableHead className="text-right">{t('Balance')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Opening Balance Row */}
                        <TableRow className="bg-slate-50">
                          <TableCell className="text-muted-foreground">{startDate}</TableCell>
                          <TableCell className="font-medium">OPB</TableCell>
                          <TableCell colSpan={3} className="text-muted-foreground">
                            {t('Opening Balance')}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(account.openingBalance)}
                          </TableCell>
                        </TableRow>
                        
                        {/* Transaction Rows */}
                        {account.entries.map((tx, idx) => {
                          // Calculate previous balance using correct formula based on account type
                          let prevBalance: number;
                          if (account.accountType === 'asset' || account.accountType === 'expense') {
                            prevBalance = account.openingBalance + 
                              account.entries.slice(0, idx).reduce((s, t) => s + t.debit - t.credit, 0);
                          } else {
                            prevBalance = account.openingBalance + 
                              account.entries.slice(0, idx).reduce((s, t) => s + t.credit - t.debit, 0);
                          }
                          
                          // Calculate current balance
                          let currentBalance: number;
                          if (account.accountType === 'asset' || account.accountType === 'expense') {
                            currentBalance = prevBalance + tx.debit - tx.credit;
                          } else {
                            currentBalance = prevBalance + tx.credit - tx.debit;
                          }
                          
                          return (
                            <TableRow key={idx}>
                              <TableCell>{format(new Date(tx.date), 'yyyy-MM-dd')}</TableCell>
                              <TableCell className="font-mono text-xs">{tx.entryNumber}</TableCell>
                              <TableCell>{tx.description}</TableCell>
                              <TableCell className="text-muted-foreground">{tx.reference || '-'}</TableCell>
                              <TableCell className="text-right font-mono">
                                {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium">
                                {formatCurrency(Math.abs(currentBalance))}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        
                        {/* Closing Balance Row */}
                        <TableRow className="bg-slate-800 text-white font-bold">
                          <TableCell>{endDate}</TableCell>
                          <TableCell>CPB</TableCell>
                          <TableCell colSpan={3}>{t('Closing Balance')}</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(account.closingBalance)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
