import { useState, useEffect } from 'react';
import { reportsApi, FinancialRatiosReport, FRCategory, FRRatio } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Loader2,
  Gauge,
  Printer,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Droplets,
  BarChart3,
  Cog,
  Scale,
  CheckCircle,
  AlertCircle,
  XCircle,
  MinusCircle
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

const fmtVal = (v: number | null) => {
  if (v === null || v === undefined) return 'N/A';
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const statusColor = (status: string) => {
  switch (status) {
    case 'good': return 'bg-green-100/80 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'warning': return 'bg-yellow-100/80 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'danger': return 'bg-red-100/80 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-slate-100/80 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400';
  }
};

const statusIcon = (status: string) => {
  switch (status) {
    case 'good': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'danger': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <MinusCircle className="h-4 w-4 text-slate-400" />;
  }
};

const categoryIcon = (key: string) => {
  switch (key) {
    case 'liquidity': return <Droplets className="h-5 w-5 text-blue-500" />;
    case 'profitability': return <TrendingUp className="h-5 w-5 text-green-500" />;
    case 'efficiency': return <Cog className="h-5 w-5 text-purple-500" />;
    case 'leverage': return <Scale className="h-5 w-5 text-orange-500" />;
    default: return <BarChart3 className="h-5 w-5" />;
  }
};

function RatioCard({ ratio }: { ratio: FRRatio }) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {statusIcon(ratio.status)}
          <span className="font-medium text-sm">{ratio.label}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1 pl-6">
          {ratio.formula}
        </div>
        <div className="text-xs text-muted-foreground pl-6">
          {ratio.benchmark}
        </div>
      </div>
      <div className="text-right ml-4">
        <div className="font-mono text-lg font-semibold">
          {fmtVal(ratio.value)}
        </div>
        <Badge className={`text-xs ${statusColor(ratio.status)}`}>
          {ratio.status}
        </Badge>
      </div>
    </div>
  );
}

function CategorySection({ catKey, category }: { catKey: string; category: FRCategory }) {
  const ratios = Object.values(category.ratios);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {categoryIcon(catKey)}
          {category.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ratios.map((ratio, idx) => (
          <RatioCard key={idx} ratio={ratio} />
        ))}
      </CardContent>
    </Card>
  );
}

export default function FinancialRatiosPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<FinancialRatiosReport | null>(null);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchRatios = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getFinancialRatios({
        as_of_date: asOfDate,
        date_from: startDate,
        date_to: endDate,
      });
      setReport(response as any);
    } catch (error: any) {
      toast.error(error.message || 'Failed to compute financial ratios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatios();
  }, []);

  const handlePrint = () => window.print();

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Gauge className="h-8 w-8" />
              Financial Ratios
            </h1>
            <p className="text-muted-foreground mt-1">Key financial health indicators</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="space-y-2">
                <Label>As At Date</Label>
                <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <Button onClick={fetchRatios} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarDays className="h-4 w-4 mr-2" />}
                Compute
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {report?.summary && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Overall Health Assessment</CardTitle>
              {report.company_name && (
                <CardDescription>{report.company_name} — {format(new Date(report.as_of_date), 'dd MMM yyyy')}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overall</div>
                  <Badge className={`${statusColor(report.summary.overall)} text-sm`}>
                    {report.summary.overall}
                  </Badge>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Liquidity</div>
                  <Badge className={`${statusColor(report.summary.liquidity)} text-sm`}>
                    {report.summary.liquidity}
                  </Badge>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Profitability</div>
                  <Badge className={`${statusColor(report.summary.profitability)} text-sm`}>
                    {report.summary.profitability}
                  </Badge>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Efficiency</div>
                  <Badge className={`${statusColor(report.summary.efficiency)} text-sm`}>
                    {report.summary.efficiency}
                  </Badge>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Leverage</div>
                  <Badge className={`${statusColor(report.summary.leverage)} text-sm`}>
                    {report.summary.leverage}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> {report.summary.good_count} Good</span>
                <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3 text-yellow-500" /> {report.summary.warning_count} Warning</span>
                <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> {report.summary.danger_count} Danger</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ratios Grid */}
        {report?.ratios && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(report.ratios).map(([key, category]) => (
              <CategorySection key={key} catKey={key} category={category} />
            ))}
          </div>
        )}

        {/* Loading / Empty */}
        {!report?.ratios && !loading && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Select dates and click Compute to view financial ratios.
            </CardContent>
          </Card>
        )}

        {/* Generated timestamp */}
        {report?.generated_at && (
          <p className="text-xs text-muted-foreground text-center">
            Generated {format(new Date(report.generated_at), 'dd MMM yyyy HH:mm')} — Period: {report.days_in_period} days
          </p>
        )}
      </div>
    </Layout>
  );
}
