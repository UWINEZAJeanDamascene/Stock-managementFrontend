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
      active: { variant: 'default', className: 'bg-green-500' },
      fully_repaid: { variant: 'secondary', className: 'bg-blue-500' },
      closed: { variant: 'outline', className: 'bg-gray-500' },
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
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t('liabilities.title')}</h1>
            <p className="text-muted-foreground">{t('liabilities.subtitle')}</p>
          </div>
          <Button onClick={() => navigate('/liabilities/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('liabilities.addLiability')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('liabilities.totalLiabilities')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{liabilities.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('liabilities.totalPrincipal')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPrincipal)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t('liabilities.totalOutstanding')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">{t('liabilities.allStatuses')}</option>
            <option value="active">{t('liabilities.status.active')}</option>
            <option value="fully_repaid">{t('liabilities.status.fullyRepaid')}</option>
            <option value="closed">{t('liabilities.status.closed')}</option>
          </select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Lender</TableHead>
                  <TableHead className="text-right">Principal</TableHead>
                  <TableHead className="text-right">Outstanding Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      {t('common.loading')}
                    </TableCell>
                  </TableRow>
                ) : liabilities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center">
                        <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground" />
                        <p>{t('liabilities.noLiabilities')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  liabilities.map((liability) => (
                    <TableRow key={liability._id}>
                      <TableCell className="font-medium">{liability.loanNumber}</TableCell>
                      <TableCell>{liability.name}</TableCell>
                      <TableCell>{(liability as any).loanType ? t(`liabilities.types.${liability.loanType}`) : t(`liabilities.types.${liability.type || 'other'}`)}</TableCell>
                      <TableCell>{liability.lenderName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(liability.originalAmount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(liability.outstandingBalance)}</TableCell>
                      <TableCell>{getStatusBadge(liability.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/liabilities/${liability._id}`)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/liabilities/${liability._id}?action=repayment`)}
                            title="Record Repayment"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/liabilities/${liability._id}?action=interest`)}
                            title="Record Interest"
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
