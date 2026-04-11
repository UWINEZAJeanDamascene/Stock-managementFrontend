import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { journalEntriesApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { ArrowLeft, Loader2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface LedgerEntry {
  date: string;
  entryNumber: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance?: number;
}

interface LedgerAccount {
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  openingBalance: number;
  closingBalance: number;
  transactions: LedgerEntry[];
}

export default function GeneralLedgerPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [accountCodeFilter, setAccountCodeFilter] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const fetchGeneralLedger = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (accountCodeFilter) params.accountCode = accountCodeFilter;

      const response = await journalEntriesApi.getGeneralLedger(params);
      if (response.success) {
        const data = (response.data || []) as unknown as LedgerAccount[];
        setAccounts(data);
        if (accountCodeFilter) {
          setExpandedAccounts(new Set(data.map((a: LedgerAccount) => a.code)));
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load general ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeneralLedger();
  }, []);

  const toggleAccount = (code: string) => {
    const next = new Set(expandedAccounts);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setExpandedAccounts(next);
  };

  return (
    <Layout>
      <div className="space-y-6 bg-gray-50 dark:bg-slate-900 min-h-screen p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/journal')} className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
                <BookOpen className="h-6 w-6" />
                General Ledger
              </h1>
              <p className="text-muted-foreground dark:text-slate-400">All transactions grouped by account</p>
            </div>
          </div>
        </div>

        <Card className="dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="dark:bg-slate-700 dark:text-white dark:border-slate-600" />
              </div>
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Account Code</Label>
                <Input
                  value={accountCodeFilter}
                  onChange={(e) => setAccountCodeFilter(e.target.value)}
                  placeholder="e.g., 1100"
                  className="dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <Button onClick={fetchGeneralLedger} className="dark:bg-primary dark:text-primary-foreground">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookOpen className="h-4 w-4 mr-2" />}
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>

        {accounts.length === 0 && !loading ? (
          <Card className="dark:bg-slate-800">
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground dark:text-slate-400">No transactions found for the selected period</p>
            </CardContent>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.code} className="dark:bg-slate-800">
              <CardHeader
                className="cursor-pointer hover:bg-muted/50 dark:hover:bg-slate-700/50"
                onClick={() => toggleAccount(account.code)}
              >
                <CardTitle className="flex items-center justify-between dark:text-white">
                  <div className="flex items-center gap-2">
                    {expandedAccounts.has(account.code) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-mono dark:text-white">{account.code}</span>
                    <span className="dark:text-slate-300">-</span>
                    <span className="dark:text-slate-300">{account.name}</span>
                    <Badge variant="outline" className="dark:border-slate-600 dark:text-slate-300">{account.type}</Badge>
                  </div>
                  <span className={`font-mono text-lg ${account.closingBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {account.closingBalance.toLocaleString()}
                  </span>
                </CardTitle>
                <CardDescription className="dark:text-slate-400">
                  {(account.transactions || []).length} transactions | Closing Balance: {account.closingBalance.toLocaleString()}
                </CardDescription>
              </CardHeader>
              {expandedAccounts.has(account.code) && (
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                        <TableHead className="dark:text-slate-200">Date</TableHead>
                        <TableHead className="dark:text-slate-200">Entry #</TableHead>
                        <TableHead className="dark:text-slate-200">Description</TableHead>
                        <TableHead className="text-right dark:text-slate-200">Debit</TableHead>
                        <TableHead className="text-right dark:text-slate-200">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(account.transactions || []).map((t, idx) => (
                        <TableRow key={idx} className="dark:border-slate-600">
                          <TableCell className="dark:text-slate-300">{format(new Date(t.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="font-mono dark:text-slate-300">{t.entryNumber}</TableCell>
                          <TableCell className="dark:text-slate-300">{t.description}</TableCell>
                          <TableCell className="text-right font-mono dark:text-slate-300">
                            {t.debit > 0 ? t.debit.toLocaleString() : ''}
                          </TableCell>
                          <TableCell className="text-right font-mono dark:text-slate-300">
                            {t.credit > 0 ? t.credit.toLocaleString() : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </Layout>
  );
}
