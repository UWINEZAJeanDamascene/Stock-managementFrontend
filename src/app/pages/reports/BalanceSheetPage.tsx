import { useState, useEffect } from 'react';
import { reportsApi, BalanceSheetReport, BSSection } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Loader2,
  Scale,
  Printer,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Building2,
  Landmark,
  Wallet
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return '-';
  if (n === 0) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function SectionRow({
  label,
  current,
  comparative,
  bold = false,
  indent = 0,
  isNegative = false,
  className = ''
}: {
  label: string;
  current: number | string;
  comparative?: number | string;
  bold?: boolean;
  indent?: number;
  isNegative?: boolean;
  className?: string;
}) {
  const currentStr = typeof current === 'number' ? fmt(current) : current;
  const compStr = comparative !== undefined ? (typeof comparative === 'number' ? fmt(comparative) : comparative) : null;
  return (
    <div
      className={`flex items-start sm:items-center py-1.5 text-sm ${bold ? 'font-semibold border-t border-b bg-muted/50' : ''} ${className}`}
      style={{ paddingLeft: `${indent * 24}px` }}
    >
      <span className={`flex-1 min-w-0 pr-2 ${bold ? 'font-semibold' : ''} ${isNegative ? 'text-destructive' : ''}`}>{label}</span>
      <span className={`w-24 sm:w-36 text-right font-mono tabular-nums text-xs sm:text-sm shrink-0 ${isNegative ? 'text-destructive' : ''}`}>{currentStr}</span>
      {compStr !== null && (
        <span className="w-24 sm:w-36 text-right font-mono tabular-nums text-muted-foreground text-xs sm:text-sm shrink-0">{compStr}</span>
      )}
    </div>
  );
}

function ExpandableSection({
  title,
  current,
  comparative,
  showComparative: _showComparative,
  defaultExpanded = false
}: {
  title: string;
  current: BSSection;
  comparative?: BSSection;
  showComparative: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (current.lines.length === 0) return null;

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center w-full py-2 text-sm font-medium text-foreground hover:bg-muted/50 rounded px-1"
      >
        {expanded ? <ChevronDown className="h-4 w-4 mr-1 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground" />}
        {title}
      </button>
      {expanded && (
        <div className="border-l-2 ml-2">
          {current.lines.map((line) => {
            const compLine = comparative?.lines.find(l => l.account_code === line.account_code);
            return (
              <SectionRow
                key={line.account_code}
                label={`${line.account_code} ${line.account_name}`}
                current={line.amount}
                comparative={compLine?.amount}
                indent={1}
                isNegative={line.amount < 0}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BalanceSheetPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showComparative, setShowComparative] = useState(false);
  const [compDate, setCompDate] = useState('');

  const fetchBS = async () => {
    setLoading(true);
    try {
      const params: any = { as_of_date: asOfDate };
      if (showComparative && compDate) {
        params.comparative_date = compDate;
      }
      const response = await reportsApi.getBalanceSheet(params);
      setReport(response as any);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate Balance Sheet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBS();
  }, []);

  const cur = report?.current;
  const comp = report?.comparative;
  const handlePrint = () => window.print();

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Scale className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
              <span className="truncate">Balance Sheet</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Statement of Financial Position — IAS 1
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4">
              <div className="space-y-1.5 w-full sm:w-auto">
                <Label className="text-sm">As At Date</Label>
                <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="w-full sm:w-auto" />
              </div>
              <Button onClick={fetchBS} disabled={loading} size="sm" className="w-full sm:w-auto">
                {loading ? <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" /> : <CalendarDays className="h-4 w-4 mr-1 sm:mr-2" />}
                <span className="hidden sm:inline">Generate</span>
                <span className="sm:hidden">Gen</span>
              </Button>
              <div className="flex items-center gap-2 sm:ml-auto pt-2 sm:pt-0">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showComparative}
                    onChange={e => setShowComparative(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="hidden sm:inline">Compare Period</span>
                  <span className="sm:hidden">Compare</span>
                </label>
              </div>
            </div>
            {showComparative && (
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 sm:gap-4 mt-4 pt-4 border-t">
                <div className="space-y-1.5 w-full sm:w-auto">
                  <Label className="text-sm">Compare As At</Label>
                  <Input type="date" value={compDate} onChange={e => setCompDate(e.target.value)} className="w-full sm:w-auto" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance Sheet */}
        {cur && (
          <Card className="print:shadow-none">
            <CardHeader className="text-center border-b">
              {report?.company_name && (
                <CardDescription className="text-base font-semibold text-foreground">
                  {report.company_name}
                </CardDescription>
              )}
              <CardTitle className="text-xl">Statement of Financial Position</CardTitle>
              <CardDescription>
                As at {format(new Date(asOfDate), 'dd MMM yyyy')}
              </CardDescription>
              <CardDescription className="text-xs">
                (Amounts in functional currency)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              {/* Column Headers */}
              <div className="flex items-center py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b mb-2">
                <span className="flex-1">Description</span>
                <span className="w-24 sm:w-36 text-right">{format(new Date(asOfDate), 'dd MMM')}</span>
                {comp && <span className="w-24 sm:w-36 text-right hidden sm:inline">{format(new Date(compDate), 'dd MMM')}</span>}
              </div>

              {/* ═══ ASSETS ═══════════════════════════════════════════ */}
              <div className="mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  ASSETS
                </h3>
              </div>

              {/* ── Non-Current Assets ──────────────────────────────── */}
              <ExpandableSection
                title="Non-Current Assets"
                current={cur.non_current_assets}
                comparative={comp?.non_current_assets}
                showComparative={showComparative}
                defaultExpanded={true}
              />
              <SectionRow
                label="Total Non-Current Assets"
                current={cur.non_current_assets.total}
                comparative={comp?.non_current_assets.total}
                bold
              />

              {/* ── Current Assets ──────────────────────────────────── */}
              <div className="mt-3" />
              <ExpandableSection
                title="Current Assets"
                current={cur.current_assets}
                comparative={comp?.current_assets}
                showComparative={showComparative}
                defaultExpanded={true}
              />
              <SectionRow
                label="Total Current Assets"
                current={cur.current_assets.total}
                comparative={comp?.current_assets.total}
                bold
              />

              {/* ── Total Assets ────────────────────────────────────── */}
              <div className="mt-4 p-4 rounded-lg border-2 bg-muted/30">
                <div className="flex items-center">
                  <span className="flex-1 text-lg font-bold">TOTAL ASSETS</span>
                  <span className={`w-36 text-right font-mono text-lg font-bold ${cur.total_assets >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                    {fmt(cur.total_assets)}
                  </span>
                  {comp && (
                    <span className={`w-36 text-right font-mono text-lg font-bold ${comp.total_assets >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                      {fmt(comp.total_assets)}
                    </span>
                  )}
                </div>
              </div>

              {/* ═══ EQUITY & LIABILITIES ═══════════════════════════ */}
              <div className="mt-6 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-2 flex items-center gap-2">
                  <Landmark className="h-4 w-4" />
                  EQUITY &amp; LIABILITIES
                </h3>
              </div>

              {/* ── Equity ──────────────────────────────────────────── */}
              <ExpandableSection
                title="Equity"
                current={cur.equity}
                comparative={comp?.equity}
                showComparative={showComparative}
                defaultExpanded={true}
              />
              {cur.current_period_net_profit !== 0 && (
                <div className="text-xs text-muted-foreground pl-1 py-0.5">
                  Retained Earnings includes current period net profit of {fmt(cur.current_period_net_profit)}
                </div>
              )}
              <SectionRow
                label="Total Equity"
                current={cur.equity.total}
                comparative={comp?.equity.total}
                bold
              />

              {/* ── Non-Current Liabilities ─────────────────────────── */}
              <div className="mt-3" />
              <ExpandableSection
                title="Non-Current Liabilities"
                current={cur.non_current_liabilities}
                comparative={comp?.non_current_liabilities}
                showComparative={showComparative}
                defaultExpanded={false}
              />
              <SectionRow
                label="Total Non-Current Liabilities"
                current={cur.non_current_liabilities.total}
                comparative={comp?.non_current_liabilities.total}
                bold
              />

              {/* ── Current Liabilities ─────────────────────────────── */}
              <div className="mt-3" />
              <ExpandableSection
                title="Current Liabilities"
                current={cur.current_liabilities}
                comparative={comp?.current_liabilities}
                showComparative={showComparative}
                defaultExpanded={true}
              />
              <SectionRow
                label="Total Current Liabilities"
                current={cur.current_liabilities.total}
                comparative={comp?.current_liabilities.total}
                bold
              />

              {/* ── Total Liabilities ───────────────────────────────── */}
              <div className="mt-3" />
              <SectionRow
                label="Total Liabilities"
                current={cur.total_liabilities}
                comparative={comp?.total_liabilities}
                bold
              />

              {/* ── Total Equity & Liabilities ──────────────────────── */}
              <div className="mt-4 p-4 rounded-lg border-2 bg-primary/5">
                <div className="flex items-center">
                  <span className="flex-1 text-lg font-bold">TOTAL EQUITY &amp; LIABILITIES</span>
                  <span className={`w-36 text-right font-mono text-lg font-bold ${cur.total_equity_and_liabilities >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                    {fmt(cur.total_equity_and_liabilities)}
                  </span>
                  {comp && (
                    <span className={`w-36 text-right font-mono text-lg font-bold ${comp.total_equity_and_liabilities >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                      {fmt(comp.total_equity_and_liabilities)}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Balance Check ───────────────────────────────────── */}
              {cur.is_balanced ? (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                  <Badge variant="secondary" className="bg-green-100/80 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <Wallet className="h-3 w-3 mr-1" />
                    Balanced — Assets = Equity + Liabilities
                  </Badge>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                  <Badge variant="secondary" className="bg-red-100/80 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Out of balance by {fmt(cur.difference)}
                  </Badge>
                </div>
              )}

              {/* Warning */}
              {(report as any)?.warning && (
                <div className="mt-2 p-3 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {(report as any).warning}
                </div>
              )}

              {/* Generated timestamp */}
              {report?.generated_at && (
                <p className="text-xs text-muted-foreground text-center mt-6">
                  Generated {format(new Date(report.generated_at), 'dd MMM yyyy HH:mm')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading / Empty */}
        {!cur && !loading && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Select a date and click Generate to view the Balance Sheet.
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
