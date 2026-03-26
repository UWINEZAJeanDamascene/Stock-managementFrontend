import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { pettyCashApi } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  ArrowLeft,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
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
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
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

export default function PettyCashTransactionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [fund, setFund] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchTransactions = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (typeFilter !== 'all') params.type = typeFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await pettyCashApi.getFundTransactions(id, params);
      console.log('[PettyCashTransactionsPage] API Response:', response);
      
      if (response.success && response.data) {
        setFund(response.data.fund);
        setTransactions(response.data.transactions);
        setTotal(response.total);
        setPages(response.pages);
      }
    } catch (error) {
      console.error('[PettyCashTransactionsPage] Failed to fetch transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [id, page, typeFilter, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilterChange = () => {
    setPage(1);
    fetchTransactions();
  };

  const handleResetFilters = () => {
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const exportTransactions = () => {
    // Simple CSV export
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance', 'Receipt Ref'];
    const rows = transactions.map(tx => [
      formatDate(tx.transactionDate),
      tx.typeLabel,
      tx.description,
      tx.amount.toFixed(2),
      tx.runningBalance.toFixed(2),
      tx.receiptRef || '',
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `petty-cash-transactions-${fund?.name || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/petty-cash')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Wallet className="h-8 w-8" />
                {fund?.name || t('pettyCash.transactions.title', 'Transactions')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('pettyCash.transactions.description', 'View transaction history')}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={exportTransactions}>
            <Download className="h-4 w-4 mr-2" />
            {t('common.export', 'Export')}
          </Button>
        </div>

        {/* Fund Summary */}
        {fund && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('pettyCash.currentBalance', 'Current Balance')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(fund.currentBalance)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('pettyCash.floatAmount', 'Float Amount')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(fund.floatAmount)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('pettyCash.replenishmentNeeded', 'Replenishment Needed')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${fund.replenishmentNeeded > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {formatCurrency(fund.replenishmentNeeded)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('pettyCash.totalTransactions', 'Total Transactions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{total}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-40">
                <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="top_up">Top Up</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="opening">Opening</SelectItem>
                    <SelectItem value="replenishment">Replenishment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Label className="text-xs text-muted-foreground mb-1 block">From Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="w-40">
                <Label className="text-xs text-muted-foreground mb-1 block">To Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={handleFilterChange} variant="secondary">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
              <Button onClick={handleResetFilters} variant="ghost">
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No transactions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('pettyCash.date', 'Date')}</TableHead>
                    <TableHead>{t('pettyCash.reference', 'Reference')}</TableHead>
                    <TableHead>{t('pettyCash.type', 'Type')}</TableHead>
                    <TableHead>{t('pettyCash.description', 'Description')}</TableHead>
                    <TableHead>{t('pettyCash.expenseAccount', 'Account')}</TableHead>
                    <TableHead className="text-right">{t('pettyCash.amount', 'Amount')}</TableHead>
                    <TableHead className="text-right">{t('pettyCash.balance', 'Balance')}</TableHead>
                    <TableHead>{t('pettyCash.receiptRef', 'Receipt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx._id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(tx.transactionDate)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {tx.referenceNo}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={tx.type === 'top_up' || tx.type === 'opening' || tx.type === 'replenishment' ? 'default' : 'secondary'}
                          className="gap-1"
                        >
                          {tx.type === 'top_up' && <TrendingUp className="h-3 w-3" />}
                          {tx.type === 'expense' && <TrendingDown className="h-3 w-3" />}
                          {tx.typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>
                        {tx.expenseAccountName ? (
                          <span className="text-sm">
                            {tx.expenseAccountName}
                            <span className="text-muted-foreground ml-1">({tx.expenseAccountId})</span>
                          </span>
                        ) : tx.expenseAccountId ? (
                          <span className="text-muted-foreground text-sm">{tx.expenseAccountId}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                        {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(tx.runningBalance)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tx.receiptRef || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}