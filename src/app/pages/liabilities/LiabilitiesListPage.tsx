import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { loansApi, Liability } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { 
  Plus, 
  Eye, 
  RefreshCcw, 
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function LiabilitiesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetchLiabilities();
  }, [statusFilter]);

  const fetchLiabilities = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response: any = await loansApi.getAll(params);
      if (response.success) {
        setLiabilities(response.data || []);
      }
    } catch (error) {
      console.error('[LiabilitiesListPage] Failed to fetch liabilities:', error);
      toast.error(t('liabilities.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: string; className: string }> = {
      active: { variant: 'default', className: 'bg-green-500 dark:bg-green-600' },
      fully_repaid: { variant: 'secondary', className: 'bg-blue-500 dark:bg-blue-600' },
      'paid-off': { variant: 'secondary', className: 'bg-blue-500 dark:bg-blue-600' },
      closed: { variant: 'outline', className: 'bg-gray-500 dark:bg-gray-600' },
      cancelled: { variant: 'outline', className: 'bg-gray-400 dark:bg-gray-500' },
      defaulted: { variant: 'destructive', className: '' },
      default: { variant: 'destructive', className: '' },
    };
    const { variant, className } = config[status] || config.default;
    return <Badge variant={variant as any} className={className}>{t(`liabilities.status.${status}`)}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(amount || 0);
  };

  const totalPrincipal = liabilities.reduce((sum, l) => sum + (l.originalAmount || 0), 0);
  const totalOutstanding = liabilities.reduce((sum, l) => sum + (l.outstandingBalance || 0), 0);

  return (
    <Layout>
      <div className="container mx-auto py-6 bg-gray-50 dark:bg-slate-900 min-h-screen p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold dark:text-white">{t('liabilities.title')}</h1>
            <p className="text-muted-foreground dark:text-slate-400">{t('liabilities.subtitle')}</p>
          </div>
          <Button onClick={() => navigate('/liabilities/new')} className="dark:bg-primary dark:text-primary-foreground">
            <Plus className="mr-2 h-4 w-4" />
            {t('liabilities.addLiability')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">{t('liabilities.totalLiabilities')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{liabilities.length}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">{t('liabilities.totalPrincipal')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold dark:text-white">{formatCurrency(totalPrincipal)}</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium dark:text-slate-400">{t('liabilities.totalOutstanding')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalOutstanding)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md dark:bg-slate-700 dark:text-white dark:border-slate-600"
          >
            <option value="all">{t('liabilities.allStatuses')}</option>
            <option value="active">{t('liabilities.status.active')}</option>
            <option value="fully_repaid">{t('liabilities.status.fullyRepaid')}</option>
            <option value="closed">{t('liabilities.status.closed')}</option>
          </select>
        </div>

        {/* Table */}
        <Card className="dark:bg-slate-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="dark:bg-slate-700/50 dark:border-slate-600">
                  <TableHead className="dark:text-slate-200">Reference</TableHead>
                  <TableHead className="dark:text-slate-200">Name</TableHead>
                  <TableHead className="dark:text-slate-200">Type</TableHead>
                  <TableHead className="dark:text-slate-200">Lender</TableHead>
                  <TableHead className="text-right dark:text-slate-200">Principal</TableHead>
                  <TableHead className="text-right dark:text-slate-200">Outstanding Balance</TableHead>
                  <TableHead className="dark:text-slate-200">Status</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 dark:text-slate-400">
                      {t('common.loading')}
                    </TableCell>
                  </TableRow>
                ) : liabilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center">
                        <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground dark:text-slate-500" />
                        <p className="dark:text-slate-400">{t('liabilities.noLiabilities')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  liabilities.map((liability) => (
                    <TableRow key={liability._id} className="dark:border-slate-600">
                      <TableCell className="font-medium dark:text-white">{liability.loanNumber}</TableCell>
                      <TableCell className="dark:text-slate-300">{liability.name}</TableCell>
                      <TableCell className="dark:text-slate-300">{(liability as any).loanType ? t(`liabilities.types.${liability.loanType}`) : t(`liabilities.types.${liability.type || 'other'}`)}</TableCell>
                      <TableCell className="dark:text-slate-300">{liability.lenderName}</TableCell>
                      <TableCell className="text-right dark:text-slate-300">{formatCurrency(liability.originalAmount)}</TableCell>
                      <TableCell className="text-right dark:text-slate-300">{formatCurrency(liability.outstandingBalance)}</TableCell>
                      <TableCell>{getStatusBadge(liability.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/liabilities/${liability._id}`)}
                            title="View"
                            className="dark:text-slate-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/liabilities/${liability._id}?action=repayment`)}
                            title="Record Repayment"
                            className="dark:text-slate-300"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/liabilities/${liability._id}?action=interest`)}
                            title="Record Interest"
                            className="dark:text-slate-300"
                          >
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
