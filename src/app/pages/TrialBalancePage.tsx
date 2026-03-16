import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { journalEntriesApi, TrialBalanceEntry as ApiTrialBalanceEntry } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
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
  CheckCircle2, 
  XCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';

// Extended type with balance calculated locally
interface TrialBalanceEntry extends ApiTrialBalanceEntry {
  balance: number;
}

export default function TrialBalancePage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrialBalanceEntry[]>([]);
  const [totals, setTotals] = useState({ totalDebit: 0, totalCredit: 0, totalBalance: 0 });
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

  // Group data by account type
  const groupedData = data.reduce((acc, entry) => {
    if (!acc[entry.accountType]) {
      acc[entry.accountType] = [];
    }
    acc[entry.accountType].push(entry);
    return acc;
  }, {} as Record<string, TrialBalanceEntry[]>);

  useEffect(() => {
    // Set default dates to beginning of current year
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1); // January 1st
    const lastDay = new Date(now.getFullYear(), 11, 31); // December 31st
    
    setStartDate(format(firstDay, 'yyyy-MM-dd'));
    setEndDate(format(lastDay, 'yyyy-MM-dd'));
    setPeriod({
      start: format(firstDay, 'yyyy-MM-dd'),
      end: format(lastDay, 'yyyy-MM-dd')
    });
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchTrialBalance();
    }
  }, [startDate, endDate]);

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const response = await journalEntriesApi.getTrialBalance({
        startDate,
        endDate
      });
      
      if (response.success) {
        // Calculate balance for each entry (debit - credit)
        const entriesWithBalance = (response.data || []).map((entry) => ({
          ...entry,
          balance: entry.debit - entry.credit
        }));
        setData(entriesWithBalance as TrialBalanceEntry[]);
        setTotals(response.totals);
        setPeriod(response.period);
      }
    } catch (error) {
      console.error('Error fetching trial balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleType = (type: string) => {
    setExpandedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const isBalanced = Math.abs(totals.totalDebit - totals.totalCredit) < 0.01;

  const exportToCSV = () => {
    const headers = ['Account Code', 'Account Name', 'Type', 'Debit', 'Credit', 'Balance'];
    const rows = data.map(entry => [
      entry.accountCode,
      entry.accountName,
      entry.accountType,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.balance.toFixed(2)
    ]);
    
    // Add totals row
    rows.push(['', '', 'TOTALS', totals.totalDebit.toFixed(2), totals.totalCredit.toFixed(2), '']);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trial-balance-${period.start}-to-${period.end}.csv`;
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('Trial Balance')}</h1>
          <p className="text-muted-foreground">
            {t('Summary of all accounts at')} {period.start && period.end ? `${period.start} to ${period.end}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTrialBalance} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('Refresh')}
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={loading || data.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {t('Export CSV')}
          </Button>
        </div>
      </div>

      {/* Date Filter */}
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
          </div>
        </CardContent>
      </Card>

      {/* Balance Status */}
      <Card className={isBalanced ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-3">
            {isBalanced ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <span className="text-green-800 dark:text-green-400 font-medium">
                  {t('Trial Balance is BALANCED')}
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-red-600" />
                <span className="text-red-800 dark:text-red-400 font-medium">
                  {t('Trial Balance is NOT BALANCED')}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trial Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t('Trial Balance')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('No journal entries found for this period')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Account Code')}</TableHead>
                  <TableHead>{t('Account Name')}</TableHead>
                  <TableHead>{t('Type')}</TableHead>
                  <TableHead className="text-right">{t('Debit')}</TableHead>
                  <TableHead className="text-right">{t('Credit')}</TableHead>
                  <TableHead className="text-right">{t('Balance')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedData).map(([type, entries]) => (
                  <>
                    {/* Type Header Row */}
                    <TableRow key={type} className="bg-slate-100 dark:bg-slate-800 cursor-pointer" onClick={() => toggleType(type)}>
                      <TableCell colSpan={6} className="font-semibold">
                        <div className="flex items-center gap-2">
                          {expandedTypes[type] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          {getTypeLabel(type)} ({entries.length} {t('accounts')})
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Account Rows */}
                    {expandedTypes[type] !== false && entries.map((entry) => (
                      <TableRow key={entry.accountCode}>
                        <TableCell className="font-mono">{entry.accountCode}</TableCell>
                        <TableCell>{entry.accountName}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            entry.accountType === 'asset' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            entry.accountType === 'liability' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            entry.accountType === 'equity' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                            entry.accountType === 'revenue' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                          }`}>
                            {entry.accountType}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-medium ${
                          entry.balance >= 0 ? 'text-black dark:text-white' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(entry.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
                
                {/* Totals Row */}
                <TableRow className="bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold">
                  <TableCell colSpan={3} className="text-right">{t('TOTALS')}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(totals.totalDebit)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(totals.totalCredit)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(totals.totalDebit - totals.totalCredit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
