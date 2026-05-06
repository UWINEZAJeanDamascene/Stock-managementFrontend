import { useState, useEffect } from 'react';
import { Layout } from '../../layout/Layout';
import {
  Loader2,
  CalendarDays,
  Printer,
  Clock,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  CalendarClock,
  Shield,
  ShieldAlert,
  Globe,
  Scale,
  TrendingUp,
  AlertTriangle,
  Lock,
  Unlock,
  Users,
  Building2,
  Wallet
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { reportsApi, DebtMaturityReport } from '@/lib/api';

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return '-';
  if (n === 0) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function BucketCard({
  bucket,
  defaultExpanded = false
}: {
  bucket: DebtMaturityReport['buckets'][0];
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const getBucketColor = (key: string) => {
    if (key === 'undetermined') return 'bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-800';
    return 'bg-slate-50 border-slate-300 dark:bg-slate-900/30 dark:border-slate-700';
  };

  return (
    <Card className={`border-2 ${getBucketColor(bucket.key)}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 opacity-70" />
            <CardTitle className="text-lg">{bucket.label}</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono">
            {(() => {
              const cnt = bucket?.loan_count ?? 0;
              return `${cnt} loan${cnt !== 1 ? 's' : ''}`;
            })()}
          </Badge>
        </div>
        {bucket.endDate && bucket.startDate && (
          <CardDescription>
            {format(parseISO(bucket.startDate), 'MMM yyyy')} - {format(parseISO(bucket.endDate), 'MMM yyyy')}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {/* IFRS 7.39 Cash Flow Summary */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center py-1 border-b border-dashed">
            <span className="text-sm text-muted-foreground">Principal</span>
            <span className="font-mono font-medium">{fmt(bucket?.principal_amount ?? 0)}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-dashed">
            <span className="text-sm text-muted-foreground">Interest (Undiscounted)</span>
            <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{fmt(bucket.interest_amount ?? 0)}</span>
          </div>
          <div className="flex justify-between items-center py-1 font-semibold">
            <span className="text-sm">Total Cash Flow</span>
            <span className="font-mono">{fmt(bucket?.total_cash_flow ?? bucket?.principal_amount ?? 0)}</span>
          </div>
          {(bucket.effective_interest_rate ?? 0) > 0 && (
            <div className="flex justify-between items-center py-1">
              <span className="text-xs text-muted-foreground">Effective Interest Rate</span>
              <span className="font-mono text-xs">{bucket.effective_interest_rate}%</span>
            </div>
          )}
        </div>

        {(bucket?.loans?.length ?? 0) > 0 && (
          <div className="border-t pt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              {expanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              Details
            </button>

            {expanded && (
              <div className="space-y-2">
                {bucket.loans.map((loan: DebtMaturityReport['loan_details'][0]) => (
                  <div key={loan.loanId} className={`py-2 text-sm bg-muted/40 rounded px-2 ${loan.covenantReclassified ? 'border-l-2 border-red-400' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium flex items-center gap-1">
                        {loan.loanNumber} - {loan.name}
                        {loan.isSecured && <Lock className="h-3 w-3 text-green-600" />}
                        {loan.covenantBreach && <AlertTriangle className="h-3 w-3 text-red-500" />}
                        {loan.classification === 'related_party' && <Users className="h-3 w-3 text-purple-500" />}
                      </div>
                      <div className="font-mono">{fmt(loan.principalAmount)}</div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div className="flex gap-2 flex-wrap">
                        {loan.lenderName && <span>Lender: {loan.lenderName}</span>}
                        {loan.endDate && <span>Matures: {format(parseISO(loan.endDate), 'dd MMM yyyy')}</span>}
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          loan.classification === 'finance_lease' ? 'bg-blue-100 text-blue-700' :
                          loan.classification === 'related_party' ? 'bg-purple-100 text-purple-700' :
                          loan.classification === 'bond' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {loan.classification.replace('_', ' ')}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                          {loan.currencyCode}
                        </span>
                      </div>
                      {loan.interestAmount > 0 && (
                        <div>Interest: {fmt(loan.interestAmount)} @ {loan.interestRate}%</div>
                      )}
                      {loan.covenantReclassified && (
                        <div className="text-red-500 font-medium">Reclassified to Current (IAS 1.74)</div>
                      )}
                      {loan.liabilityAccount && (
                        <div>Account: {loan.liabilityAccount.code} - {loan.liabilityAccount.name}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// IFRS 7.33 Classification Breakdown Card
function ClassificationBreakdown({ report }: { report: DebtMaturityReport }) {
  const { classification_breakdown } = report;
  const typeEntries = classification_breakdown?.type ? Object.entries(classification_breakdown.type).filter(([, v]) => v.count > 0) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          IFRS 7.33 — Classification Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Classification */}
        <div>
          <div className="text-sm font-medium mb-2">By Security (IFRS 7.33)</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">Secured</span>
              </div>
              <div className="mt-1 font-mono font-bold">{fmt(classification_breakdown?.security?.secured?.amount || 0)}</div>
              <div className="text-xs text-muted-foreground">{classification_breakdown?.security?.secured?.count || 0} loans</div>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200 dark:bg-slate-900/20 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-400">
                <Unlock className="h-4 w-4" />
                <span className="text-sm font-medium">Unsecured</span>
              </div>
              <div className="mt-1 font-mono font-bold">{fmt(classification_breakdown?.security?.unsecured?.amount || 0)}</div>
              <div className="text-xs text-muted-foreground">{classification_breakdown?.security?.unsecured?.count || 0} loans</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Type Classification */}
        <div>
          <div className="text-sm font-medium mb-2">By Type (IFRS 7.33)</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {typeEntries.map(([key, value]) => (
              <div key={key} className="p-2 rounded bg-muted/50 text-sm">
                <div className="text-xs text-muted-foreground">{value.label}</div>
                <div className="font-mono font-medium">{fmt(value.amount)}</div>
                <div className="text-xs text-muted-foreground">{value.count} loans</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// IFRS 7.34 Currency Breakdown Card
function CurrencyBreakdown({ report }: { report: DebtMaturityReport }) {
  if (report.currency_breakdown.length === 0) return null;

  const hasForeignCurrency = report.currency_breakdown.some(c => c.currency_code !== 'RWF');
  if (!hasForeignCurrency) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="h-4 w-4" />
          IFRS 7.34 — Currency Exposure
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(report.currency_breakdown || []).map((curr) => (
            <div key={curr.currency_code} className="flex items-center justify-between p-2 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{curr.currency_code}</Badge>
                <span className="text-sm text-muted-foreground">{curr.count} loans</span>
              </div>
              <div className="text-right">
                <div className="font-mono font-medium">{fmt(curr.amount)}</div>
                {curr.currency_code !== 'RWF' && (
                  <div className="text-xs text-muted-foreground">
                    ≈ {fmt(curr.amount_in_rwf)} RWF @ {curr.exchange_rate_avg}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// IAS 1.74 Covenant Reclassifications
function CovenantWarnings({ report }: { report: DebtMaturityReport }) {
  if (report.covenant_reclassifications.length === 0) return null;

  return (
    <Card className="border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
          <ShieldAlert className="h-4 w-4" />
          IAS 1.74 — Covenant Breach Reclassifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            The following loans have been reclassified to Current liabilities due to covenant breaches:
          </p>
          {(report.covenant_reclassifications || []).map((item) => (
            <div key={item.loan_id} className="flex items-start gap-2 p-2 rounded bg-white/50 dark:bg-black/20">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-sm">{item.loan_number} - {item.name}</div>
                <div className="text-xs text-muted-foreground">{item.note}</div>
                {item.breach_date && (
                  <div className="text-xs text-red-600">
                    Breach date: {format(parseISO(item.breach_date), 'dd MMM yyyy')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Balance Sheet Reconciliation
function BalanceSheetReconciliation({ report }: { report: DebtMaturityReport }) {
  const balance_sheet_reconciliation = report?.balance_sheet_reconciliation || { schedule_total: 0, balance_sheet_borrowings: 0, difference: 0, reconciled: false, note: 'Data not available' };

  return (
    <Card className={balance_sheet_reconciliation.reconciled ? 'border-green-300' : 'border-amber-300'}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Balance Sheet Reconciliation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Schedule Total</div>
            <div className="font-mono font-medium">{fmt(balance_sheet_reconciliation.schedule_total)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">BS Borrowings</div>
            <div className="font-mono font-medium">{fmt(balance_sheet_reconciliation.balance_sheet_borrowings)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Difference</div>
            <div className={`font-mono font-medium ${balance_sheet_reconciliation.reconciled ? 'text-green-600' : 'text-amber-600'}`}>
              {fmt(balance_sheet_reconciliation.difference)}
            </div>
          </div>
        </div>
        <div className={`text-xs p-2 rounded ${balance_sheet_reconciliation.reconciled ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
          {balance_sheet_reconciliation.reconciled ? (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {balance_sheet_reconciliation.note}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {balance_sheet_reconciliation.note}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DebtMaturityPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DebtMaturityReport | null>(null);
  const [asOfDate, setAsOfDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getDebtMaturitySchedule({ as_of_date: asOfDate });
      setReport(response as any);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate Debt Maturity Schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handlePrint = () => window.print();

  const buckets = report?.buckets || [];
  const undeterminedBucket = buckets.find((b) => b.key === 'undetermined');
  const regularBuckets = buckets.filter((b) => b.key !== 'undetermined');

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
              <span className="truncate">Debt Maturity Schedule</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              IFRS 7 Financial Instruments — Undiscounted Cash Flow & Maturity Disclosure
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
                <Input
                  type="date"
                  value={asOfDate}
                  onChange={e => setAsOfDate(e.target.value)}
                  className="w-full sm:w-auto"
                />
              </div>
              <Button onClick={fetchReport} disabled={loading} size="sm" className="w-full sm:w-auto">
                {loading ? <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" /> : <CalendarDays className="h-4 w-4 mr-1 sm:mr-2" />}
                <span className="hidden sm:inline">Generate</span>
                <span className="sm:hidden">Gen</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report */}
        {report && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="print:shadow-none">
              <CardHeader className="text-center border-b">
                <CardDescription className="text-base font-semibold text-foreground">
                  Debt Maturity Schedule — IFRS 7 Compliant
                </CardDescription>
                <CardTitle className="text-xl">As at {format(parseISO(report.report_date), 'dd MMM yyyy')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Summary Metrics - IFRS 7.39 Cash Flow Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-sm text-muted-foreground mb-1">Total Principal</div>
                    <div className="text-xl font-bold font-mono">{fmt(report?.summary?.total_debt ?? 0)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{report?.summary?.total_loans ?? 0} loans</div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground mb-1">Total Interest</div>
                    <div className="text-xl font-bold font-mono text-blue-700 dark:text-blue-400">
                      {fmt(report?.summary?.total_interest ?? 0)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Undiscounted</div>
                  </div>
                  <div className="p-4 bg-slate-100 border border-slate-300 dark:bg-slate-800 dark:border-slate-700 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground mb-1">Total Cash Flow</div>
                    <div className="text-xl font-bold font-mono">{fmt(report?.summary?.total_cash_flow ?? 0)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Principal + Interest</div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 dark:bg-slate-900/20 dark:border-slate-800 rounded-lg text-center">
                    <div className="text-sm text-muted-foreground mb-1">With Maturity Date</div>
                    <div className="text-xl font-bold font-mono text-slate-700 dark:text-slate-300">
                      {fmt(report?.summary?.debt_with_maturity_date ?? 0)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(report?.summary?.total_loans ?? 0) > 0
                        ? Math.round(((report?.summary?.debt_with_maturity_date ?? 0) / (report?.summary?.total_debt || 1)) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>

                {/* Covenant Breach Warning */}
                {(() => {
                  const count = report?.summary?.covenant_breach_count ?? 0;
                  return count > 0 ? (
                    <div className="mb-6 p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-red-800 dark:text-red-200">
                          {count} loan{count !== 1 ? 's' : ''} with covenant breach
                        </span>
                        <p className="text-red-700 dark:text-red-300 mt-1">
                          Reclassified to Current liabilities per IAS 1.74. See details below.
                        </p>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Warning if undetermined debt exists */}
                {(() => {
                  const undetCount = undeterminedBucket?.loan_count ?? 0;
                  const undetAmount = undeterminedBucket?.principal_amount ?? 0;
                  return undetAmount > 0 ? (
                    <div className="mb-6 p-3 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-amber-800 dark:text-amber-200">
                          {undetCount} loan{undetCount !== 1 ? 's' : ''} without maturity date
                        </span>
                        <p className="text-amber-700 dark:text-amber-300 mt-1">
                          Loans without end dates cannot be classified into time buckets. Update loan records with maturity dates for complete IFRS disclosure.
                        </p>
                      </div>
                    </div>
                  ) : null;
                })()}
              </CardContent>
            </Card>

            {/* Covenant Reclassifications */}
            <CovenantWarnings report={report} />

            {/* IFRS 7.33 Classification & 7.34 Currency Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ClassificationBreakdown report={report} />
              <CurrencyBreakdown report={report} />
            </div>

            {/* Balance Sheet Reconciliation */}
            <BalanceSheetReconciliation report={report} />

            {/* Time Buckets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regularBuckets.map((bucket) => (
                <BucketCard
                  key={bucket.key}
                  bucket={bucket}
                  defaultExpanded={bucket.key === 'current_year' || bucket.key === 'year_1'}
                />
              ))}
            </div>

            {/* Undetermined Bucket (if exists) */}
            {undeterminedBucket && (undeterminedBucket?.principal_amount ?? 0) > 0 && (
              <BucketCard bucket={undeterminedBucket} defaultExpanded={false} />
            )}

            {/* IFRS Disclosure Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  IFRS 7 Disclosure Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                  {(report.ifrs_disclosure_notes || []).map((note: string, i: number) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Generated timestamp */}
            <p className="text-xs text-muted-foreground text-center">
              Generated {format(new Date(report.generated_at), 'dd MMM yyyy HH:mm')}
            </p>
          </div>
        )}

        {/* Loading / Empty */}
        {!report && !loading && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Select a date and click Generate to view the Debt Maturity Schedule.
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
