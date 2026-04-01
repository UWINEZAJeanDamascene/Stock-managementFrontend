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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/journal')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                General Ledger
              </h1>
              <p className="text-muted-foreground">All transactions grouped by account</p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Account Code</Label>
                <Input
                  value={accountCodeFilter}
                  onChange={(e) => setAccountCodeFilter(e.target.value)}
                  placeholder="e.g., 1100"
                />
              </div>
              <Button onClick={fetchGeneralLedger}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookOpen className="h-4 w-4 mr-2" />}
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>

        {accounts.length === 0 && !loading ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">No transactions found for the selected period</p>
            </CardContent>
          </Card>
        ) : (
          accounts.map((account) => (
            <Card key={account.code}>
              <CardHeader
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleAccount(account.code)}
              >
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {expandedAccounts.has(account.code) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-mono">{account.code}</span>
                    <span>-</span>
                    <span>{account.name}</span>
                    <Badge variant="outline">{account.type}</Badge>
                  </div>
                  <span className={`font-mono text-lg ${account.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {account.closingBalance.toLocaleString()}
                  </span>
                </CardTitle>
                <CardDescription>
                  {(account.transactions || []).length} transactions | Closing Balance: {account.closingBalance.toLocaleString()}
                </CardDescription>
              </CardHeader>
              {expandedAccounts.has(account.code) && (
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Entry #</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(account.transactions || []).map((t, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{format(new Date(t.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="font-mono">{t.entryNumber}</TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell className="text-right font-mono">
                            {t.debit > 0 ? t.debit.toLocaleString() : ''}
                          </TableCell>
                          <TableCell className="text-right font-mono">
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
