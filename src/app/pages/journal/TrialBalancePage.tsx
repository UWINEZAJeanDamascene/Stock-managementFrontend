import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { journalEntriesApi, TrialBalanceEntry } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { ArrowLeft, Loader2, Calculator } from 'lucide-react';
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
  TableFooter,
} from '@/app/components/ui/table';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TrialBalancePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<TrialBalanceEntry[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalDebit, setTotalDebit] = useState<number>(0);
  const [totalCredit, setTotalCredit] = useState<number>(0);

  const fetchTrialBalance = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await journalEntriesApi.getTrialBalance(params);
      if (response.success) {
        const data = response.data || [];
        setEntries(data);
        setTotalDebit(response.totals?.totalDebit || data.reduce((s: number, e: TrialBalanceEntry) => s + (e.debit || 0), 0));
        setTotalCredit(response.totals?.totalCredit || data.reduce((s: number, e: TrialBalanceEntry) => s + (e.credit || 0), 0));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load trial balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
  }, []);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

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
                <Calculator className="h-6 w-6" />
                Trial Balance
              </h1>
              <p className="text-muted-foreground">Verify all debits equal all credits</p>
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
              <Button onClick={fetchTrialBalance}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calculator className="h-4 w-4 mr-2" />}
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Trial Balance</span>
              {isBalanced ? (
                <Badge className="bg-green-100 text-green-700">Balanced</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700">
                  Unbalanced by {Math.abs(totalDebit - totalCredit).toLocaleString()}
                </Badge>
              )}
            </CardTitle>
            {startDate || endDate ? (
              <CardDescription>
                Period: {startDate ? format(new Date(startDate), 'dd MMM yyyy') : 'Beginning'} — {endDate ? format(new Date(endDate), 'dd MMM yyyy') : 'Present'}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            {entries.length === 0 && !loading ? (
              <p className="text-center py-12 text-slate-500">No entries found for the selected period</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.accountCode}>
                      <TableCell className="font-mono">{entry.accountCode}</TableCell>
                      <TableCell>{entry.accountName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-bold bg-slate-50 text-lg">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right font-mono">{totalDebit.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">{totalCredit.toLocaleString()}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
