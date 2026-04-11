import { useState, useEffect } from 'react';
import { periodApi, AccountingPeriod } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Loader2,
  Calendar,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AccountingPeriodsPage() {
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const response = await periodApi.getAll({
        fiscal_year: fiscalYear,
        include_stats: true,
      });
      setPeriods(response.data);
      setCompanyName(response.company_name);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load periods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, [fiscalYear]);

  const handleGenerate = async () => {
    setActionLoading('generate');
    try {
      const response = await periodApi.generate(generateYear);
      toast.success(response.message);
      setFiscalYear(generateYear);
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate periods');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (id: string, name: string) => {
    if (!confirm(`Close period "${name}"? No more journal entries can be posted to this period.`)) return;
    setActionLoading(id);
    try {
      const response = await periodApi.close(id);
      toast.success(response.message);
      if (response.data.warnings?.length) {
        response.data.warnings.forEach(w => toast.warning(w));
      }
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message || 'Failed to close period');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopen = async (id: string, name: string) => {
    if (!confirm(`Reopen period "${name}"? Journal entries can be posted again.`)) return;
    setActionLoading(id);
    try {
      const response = await periodApi.reopen(id);
      toast.success(response.message);
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reopen period');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLock = async (id: string, name: string) => {
    if (!confirm(`Lock period "${name}" permanently? This cannot be undone.`)) return;
    setActionLoading(id);
    try {
      const response = await periodApi.lock(id);
      toast.success(response.message);
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message || 'Failed to lock period');
    } finally {
      setActionLoading(null);
    }
  };

  const handleYearEndClose = async () => {
    if (!confirm(`Perform year-end close for FY${fiscalYear}? All periods will be locked and P&L will transfer to Retained Earnings.`)) return;
    setActionLoading('year-end');
    try {
      const response = await periodApi.yearEndClose(fiscalYear);
      toast.success(response.message);
      fetchPeriods();
    } catch (error: any) {
      toast.error(error.message || 'Failed to perform year-end close');
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge className="bg-green-100/80 text-green-800 dark:bg-green-900/30 dark:text-green-400"><Unlock className="h-3 w-3 mr-1" />Open</Badge>;
      case 'closed': return <Badge className="bg-yellow-100/80 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"><Lock className="h-3 w-3 mr-1" />Closed</Badge>;
      case 'locked': return <Badge className="bg-red-100/80 text-red-800 dark:bg-red-900/30 dark:text-red-400"><Lock className="h-3 w-3 mr-1" />Locked</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto bg-gray-50 dark:bg-slate-900 min-h-screen p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 dark:text-white">
              <Calendar className="h-8 w-8" />
              Accounting Periods
            </h1>
            <p className="text-muted-foreground mt-1 dark:text-slate-400">Manage fiscal periods — open, close, lock, and year-end close</p>
          </div>
        </div>

        {/* Generate & Filter */}
        <Card className="dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="space-y-2">
                <Label className="dark:text-slate-200">Fiscal Year</Label>
                <Input
                  type="number"
                  value={fiscalYear}
                  onChange={e => setFiscalYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-28 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                />
              </div>
              <Button onClick={fetchPeriods} disabled={loading} variant="outline" className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Load
              </Button>
              <div className="ml-auto flex items-end gap-2">
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Generate FY</Label>
                  <Input
                    type="number"
                    value={generateYear}
                    onChange={e => setGenerateYear(parseInt(e.target.value) || new Date().getFullYear())}
                    className="w-28 dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  />
                </div>
                <Button onClick={handleGenerate} disabled={actionLoading === 'generate'}>
                  {actionLoading === 'generate' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
                  Generate
                </Button>
              </div>
            </div>
            {companyName && (
              <p className="text-sm text-muted-foreground mt-3 dark:text-slate-400">
                {companyName} — FY{fiscalYear} — {periods.length} periods
              </p>
            )}
          </CardContent>
        </Card>

        {/* Year-End Close */}
        {periods.length > 0 && periods.some(p => p.is_year_end && p.status !== 'locked') && (
          <Card className="border-orange-200 dark:border-orange-800 dark:bg-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2 dark:text-white">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Year-End Close FY{fiscalYear}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 dark:text-slate-400">
                    Transfer P&L to Retained Earnings and lock all periods. This action cannot be undone.
                  </p>
                </div>
                <Button variant="destructive" onClick={handleYearEndClose} disabled={actionLoading === 'year-end'}>
                  {actionLoading === 'year-end' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                  Close FY{fiscalYear}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Periods List */}
        {periods.length === 0 && !loading ? (
          <Card className="dark:bg-slate-800">
            <CardContent className="py-12 text-center text-muted-foreground dark:text-slate-400">
              No periods found for FY{fiscalYear}. Click Generate to create 12 monthly periods.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {periods.map((period) => (
              <Card key={period._id} className={
                `dark:bg-slate-800 ${period.status === 'locked' ? 'opacity-60' : period.is_year_end ? 'border-orange-200 dark:border-orange-800' : ''}`
              }>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold dark:text-white">{period.name}</span>
                          {period.is_year_end && (
                            <Badge variant="outline" className="text-orange-600 border-orange-300 dark:border-orange-700 dark:text-orange-400">Year-End</Badge>
                          )}
                          {statusBadge(period.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 dark:text-slate-400">
                          {format(new Date(period.start_date), 'dd MMM yyyy')} — {format(new Date(period.end_date), 'dd MMM yyyy')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Stats */}
                      {period.stats && (
                        <div className="text-right text-sm">
                          <div className="font-mono dark:text-slate-200">{period.stats.entry_count} entries</div>
                          {period.stats.entry_count > 0 && (
                            <div className="text-muted-foreground text-xs dark:text-slate-500">
                              DR: {period.stats.total_debit.toLocaleString()} | CR: {period.stats.total_credit.toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {period.status === 'open' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClose(period._id, period.name)}
                              disabled={actionLoading === period._id}
                              className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              {actionLoading === period._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3 mr-1" />}
                              Close
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLock(period._id, period.name)}
                              disabled={actionLoading === period._id}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Lock className="h-3 w-3 mr-1" />
                              Lock
                            </Button>
                          </>
                        )}
                        {period.status === 'closed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReopen(period._id, period.name)}
                              disabled={actionLoading === period._id}
                              className="dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                              {actionLoading === period._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3 mr-1" />}
                              Reopen
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLock(period._id, period.name)}
                              disabled={actionLoading === period._id}
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Lock className="h-3 w-3 mr-1" />
                              Lock
                            </Button>
                          </>
                        )}
                        {period.status === 'locked' && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 dark:text-slate-500">
                            <Lock className="h-3 w-3" />
                            {period.closed_at ? format(new Date(period.closed_at), 'dd MMM yyyy') : 'Locked'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
