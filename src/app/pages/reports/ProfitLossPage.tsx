import { useState, useEffect } from "react";
import { profitLossApi, companyApi, PLStatement, PLSection } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Printer,
  CalendarDays,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";

const fmt = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  if (n === 0) return "-";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fmtSigned = (n: number | null) => {
  if (n === null || n === undefined) return "-";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `(${formatted})` : formatted;
};

const fmtPct = (n: number) => `${n.toFixed(2)}%`;

function SectionRow({
  label,
  current,
  comparative,
  bold = false,
  indent = 0,
  isNegative = false,
  className = "",
}: {
  label: string;
  current: number | string;
  comparative?: number | string;
  bold?: boolean;
  indent?: number;
  isNegative?: boolean;
  className?: string;
}) {
  const currentStr = typeof current === "number" ? fmt(current) : current;
  const compStr =
    comparative !== undefined
      ? typeof comparative === "number"
        ? fmt(comparative)
        : comparative
      : null;
  return (
    <div
      className={`flex items-center py-1.5 text-sm ${bold ? "font-semibold border-t border-b bg-muted/50" : ""} ${className}`}
      style={{ paddingLeft: `${indent * 24}px` }}
    >
      <span
        className={`flex-1 ${bold ? "font-semibold" : ""} ${isNegative ? "text-destructive" : ""}`}
      >
        {label}
      </span>
      <span
        className={`w-36 text-right font-mono tabular-nums ${isNegative ? "text-destructive" : ""}`}
      >
        {currentStr}
      </span>
      {compStr !== null && (
        <span className="w-36 text-right font-mono tabular-nums text-muted-foreground">
          {compStr}
        </span>
      )}
    </div>
  );
}

function ExpandableSection({
  title,
  current,
  comparative,
  showComparative: _showComparative,
  defaultExpanded = false,
}: {
  title: string;
  current: PLSection;
  comparative?: PLSection;
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
        {expanded ? (
          <ChevronDown className="h-4 w-4 mr-1 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground" />
        )}
        {title}
      </button>
      {expanded && (
        <div className="border-l-2 ml-2">
          {current.lines.map((line) => {
            const compLine = comparative?.lines.find(
              (l) => l.account_code === line.account_code,
            );
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

export default function ProfitLossPage() {
  const [loading, setLoading] = useState(false);
  const [statement, setStatement] = useState<PLStatement | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showComparative, setShowComparative] = useState(false);
  const [compStartDate, setCompStartDate] = useState("");
  const [compEndDate, setCompEndDate] = useState("");

  const fetchCompany = async () => {
    try {
      const res = await companyApi.getMe();
      if (res && (res as any).data) {
        const company = (res as any).data;
        setCompanyName(company.name || "");
      }
    } catch {
      // silent — company name is cosmetic
    }
  };

  const fetchPL = async () => {
    setLoading(true);
    try {
      const params: any = {
        date_from: startDate,
        date_to: endDate,
      };
      if (showComparative && compStartDate && compEndDate) {
        params.comparative_date_from = compStartDate;
        params.comparative_date_to = compEndDate;
      }

      const response = await profitLossApi.getStatement(params);
      setStatement(response);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate P&L");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
    fetchPL();
  }, []);

  const cur = statement?.current;
  const comp = statement?.comparative;

  const handlePrint = () => window.print();

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
              <span className="truncate">Profit &amp; Loss</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Statement of Profit or Loss and Other Comprehensive Income — IAS 1
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
                <Label className="text-sm">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-auto"
                />
              </div>
              <div className="space-y-1.5 w-full sm:w-auto">
                <Label className="text-sm">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-auto"
                />
              </div>
              <Button onClick={fetchPL} disabled={loading} size="sm" className="w-full sm:w-auto">
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4 mr-1 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Generate</span>
                <span className="sm:hidden">Gen</span>
              </Button>
              <div className="flex items-center gap-2 sm:ml-auto pt-2 sm:pt-0">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showComparative}
                    onChange={(e) => setShowComparative(e.target.checked)}
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
                  <Label className="text-sm">Compare Start</Label>
                  <Input
                    type="date"
                    value={compStartDate}
                    onChange={(e) => setCompStartDate(e.target.value)}
                    className="w-full sm:w-auto"
                  />
                </div>
                <div className="space-y-1.5 w-full sm:w-auto">
                  <Label className="text-sm">Compare End</Label>
                  <Input
                    type="date"
                    value={compEndDate}
                    onChange={(e) => setCompEndDate(e.target.value)}
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* P&L Statement */}
        {cur && (
          <Card className="print:shadow-none">
            <CardHeader className="text-center border-b">
              {companyName && (
                <CardDescription className="text-base font-semibold text-foreground">
                  {companyName}
                </CardDescription>
              )}
              <CardTitle className="text-xl">
                Statement of Profit or Loss
              </CardTitle>
              <CardDescription>
                For the period {format(new Date(startDate), "dd MMM yyyy")} to{" "}
                {format(new Date(endDate), "dd MMM yyyy")}
              </CardDescription>
              <CardDescription className="text-xs">
                (Amounts in functional currency)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              {/* Column Headers */}
              <div className="flex items-center py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b mb-2">
                <span className="flex-1">Description</span>
                <span className="w-36 text-right">Current Period</span>
                {comp && <span className="w-36 text-right">Comparative</span>}
              </div>

              {/* ═══ PART A: PROFIT OR LOSS ═══════════════════════════ */}

              {/* ── 1. REVENUE ────────────────────────────────────────── */}
              <ExpandableSection
                title="Revenue"
                current={cur.revenue}
                comparative={comp?.revenue}
                showComparative={showComparative}
                defaultExpanded={true}
              />
              <SectionRow
                label="Total Revenue"
                current={cur.revenue.total}
                comparative={comp?.revenue.total}
                bold
              />

              {/* ── 2. COST OF SALES ──────────────────────────────────── */}
              <div className="mt-3" />
              <ExpandableSection
                title="Cost of Sales"
                current={cur.cogs}
                comparative={comp?.cogs}
                showComparative={showComparative}
                defaultExpanded={false}
              />
              <SectionRow
                label="Total Cost of Sales"
                current={cur.cogs.total}
                comparative={comp?.cogs.total}
                bold
                isNegative
              />

              {/* ── 3. GROSS PROFIT ───────────────────────────────────── */}
              <div className="mt-3" />
              <SectionRow
                label="Gross Profit"
                current={cur.gross_profit}
                comparative={comp?.gross_profit}
                bold
                className="text-base"
              />
              <SectionRow
                label="Gross Margin"
                current={fmtPct(cur.gross_margin_pct)}
                comparative={comp ? fmtPct(comp.gross_margin_pct) : undefined}
                className="text-muted-foreground"
              />

              {/* ── 4. OTHER INCOME ───────────────────────────────────── */}
              {cur.other_income.lines.length > 0 && (
                <>
                  <div className="mt-3" />
                  <ExpandableSection
                    title="Other Income"
                    current={cur.other_income}
                    comparative={comp?.other_income}
                    showComparative={showComparative}
                    defaultExpanded={false}
                  />
                  <SectionRow
                    label="Total Other Income"
                    current={cur.other_income.total}
                    comparative={comp?.other_income.total}
                    bold
                  />
                </>
              )}

              {/* ── 5. DISTRIBUTION COSTS ─────────────────────────────── */}
              {cur.distribution_costs.lines.length > 0 && (
                <>
                  <div className="mt-3" />
                  <ExpandableSection
                    title="Distribution Costs"
                    current={cur.distribution_costs}
                    comparative={comp?.distribution_costs}
                    showComparative={showComparative}
                    defaultExpanded={false}
                  />
                  <SectionRow
                    label="Total Distribution Costs"
                    current={cur.distribution_costs.total}
                    comparative={comp?.distribution_costs.total}
                    bold
                    isNegative
                  />
                </>
              )}

              {/* ── 6. ADMINISTRATIVE EXPENSES ────────────────────────── */}
              {cur.administrative_expenses.lines.length > 0 && (
                <>
                  <div className="mt-3" />
                  <ExpandableSection
                    title="Administrative Expenses"
                    current={cur.administrative_expenses}
                    comparative={comp?.administrative_expenses}
                    showComparative={showComparative}
                    defaultExpanded={false}
                  />
                  <SectionRow
                    label="Total Administrative Expenses"
                    current={cur.administrative_expenses.total}
                    comparative={comp?.administrative_expenses.total}
                    bold
                    isNegative
                  />
                </>
              )}

              {/* ── 7. OTHER EXPENSES ─────────────────────────────────── */}
              {cur.other_expenses.lines.length > 0 && (
                <>
                  <div className="mt-3" />
                  <ExpandableSection
                    title="Other Expenses"
                    current={cur.other_expenses}
                    comparative={comp?.other_expenses}
                    showComparative={showComparative}
                    defaultExpanded={false}
                  />
                  <SectionRow
                    label="Total Other Expenses"
                    current={cur.other_expenses.total}
                    comparative={comp?.other_expenses.total}
                    bold
                    isNegative
                  />
                </>
              )}

              {/* ── 8. OPERATING PROFIT (EBIT) ────────────────────────── */}
              <div className="mt-3" />
              <SectionRow
                label="Operating Profit (EBIT)"
                current={cur.operating_profit}
                comparative={comp?.operating_profit}
                bold
                className="text-base"
              />
              <SectionRow
                label="Operating Margin"
                current={fmtPct(cur.operating_margin_pct)}
                comparative={
                  comp ? fmtPct(comp.operating_margin_pct) : undefined
                }
                className="text-muted-foreground"
              />

              {/* ── EBITDA ─────────────────────────────────────────────── */}
              <SectionRow
                label="EBITDA"
                current={cur.ebitda}
                comparative={comp?.ebitda}
                className="text-muted-foreground"
              />
              <SectionRow
                label="EBITDA Margin"
                current={fmtPct(cur.ebitda_margin_pct)}
                comparative={comp ? fmtPct(comp.ebitda_margin_pct) : undefined}
                className="text-muted-foreground"
              />
              {cur.depreciation_and_amortisation > 0 && (
                <SectionRow
                  label="Depreciation & Amortisation"
                  current={cur.depreciation_and_amortisation}
                  comparative={comp?.depreciation_and_amortisation}
                  indent={1}
                  isNegative
                  className="text-muted-foreground text-xs"
                />
              )}

              {/* ── 9. FINANCE INCOME ─────────────────────────────────── */}
              {cur.finance_income && cur.finance_income.lines.length > 0 && (
                <>
                  <div className="mt-3" />
                  <ExpandableSection
                    title="Finance Income"
                    current={cur.finance_income}
                    comparative={comp?.finance_income}
                    showComparative={showComparative}
                    defaultExpanded={false}
                  />
                  <SectionRow
                    label="Total Finance Income"
                    current={cur.finance_income.total}
                    comparative={comp?.finance_income?.total}
                    bold
                  />
                </>
              )}

              {/* ── 10. FINANCE COSTS ─────────────────────────────────── */}
              {cur.finance_costs.lines.length > 0 && (
                <>
                  <div className="mt-3" />
                  <ExpandableSection
                    title="Finance Costs"
                    current={cur.finance_costs}
                    comparative={comp?.finance_costs}
                    showComparative={showComparative}
                    defaultExpanded={false}
                  />
                  <SectionRow
                    label="Total Finance Costs"
                    current={cur.finance_costs.total}
                    comparative={comp?.finance_costs.total}
                    bold
                    isNegative
                  />
                </>
              )}

              {/* ── 11. SHARE OF ASSOCIATES ───────────────────────────── */}
              {cur.share_of_associates !== 0 && (
                <SectionRow
                  label="Share of Profit of Associates / JVs"
                  current={cur.share_of_associates}
                  comparative={comp?.share_of_associates}
                />
              )}

              {/* ── 12. PROFIT BEFORE TAX ──────────────────────────────── */}
              <div className="mt-3" />
              <SectionRow
                label="Profit Before Tax"
                current={cur.profit_before_tax}
                comparative={comp?.profit_before_tax}
                bold
                className="text-base"
              />

              {/* ── 13. TAX EXPENSE ────────────────────────────────────── */}
              <div className="mt-1" />
              {cur.tax.lines.length > 0 ? (
                <>
                  <ExpandableSection
                    title="Income Tax Expense"
                    current={cur.tax}
                    comparative={comp?.tax}
                    showComparative={showComparative}
                    defaultExpanded={true}
                  />
                  <SectionRow
                    label="Total Income Tax"
                    current={cur.tax.total}
                    comparative={comp?.tax.total}
                    bold
                    isNegative
                  />
                </>
              ) : (
                <SectionRow
                  label={`Income Tax Expense (${(cur.corporate_tax_rate * 100).toFixed(0)}% of PBT)`}
                  current={cur.tax.total}
                  comparative={comp?.tax.total}
                  bold
                  isNegative
                />
              )}
              {cur.computed_tax && (
                <div className="text-xs text-muted-foreground pl-1 py-0.5">
                  Auto-computed at {(cur.corporate_tax_rate * 100).toFixed(0)}%
                  of Profit Before Tax
                </div>
              )}
              <SectionRow
                label="Effective Tax Rate"
                current={fmtPct(cur.effective_tax_rate)}
                comparative={comp ? fmtPct(comp.effective_tax_rate) : undefined}
                className="text-muted-foreground"
              />

              {/* ── 14. PROFIT AFTER TAX (CONTINUING OPERATIONS) ──────── */}
              <div className="mt-3" />
              <SectionRow
                label="Profit After Tax (Continuing Operations)"
                current={cur.profit_after_tax}
                comparative={comp?.profit_after_tax}
                bold
              />

              {/* ── 15. DISCONTINUED OPERATIONS ───────────────────────── */}
              {cur.discontinued_operations.total !== 0 && (
                <SectionRow
                  label="Profit/(Loss) from Discontinued Operations"
                  current={cur.discontinued_operations.total}
                  comparative={comp?.discontinued_operations.total}
                  isNegative={cur.discontinued_operations.total < 0}
                />
              )}

              {/* ── 16. PROFIT FOR THE PERIOD ──────────────────────────── */}
              <div className="mt-3 p-4 rounded-lg border-2 bg-muted/30">
                <div className="flex items-center">
                  <span className="flex-1 text-lg font-bold">
                    Profit for the Period {cur.is_profit ? "" : "(Loss)"}
                  </span>
                  <span
                    className={`w-36 text-right font-mono text-lg font-bold ${cur.profit_for_period >= 0 ? "text-foreground" : "text-destructive"}`}
                  >
                    {fmt(cur.profit_for_period)}
                  </span>
                  {comp && (
                    <span
                      className={`w-36 text-right font-mono text-lg font-bold ${comp.profit_for_period >= 0 ? "text-foreground" : "text-destructive"}`}
                    >
                      {fmt(comp.profit_for_period)}
                    </span>
                  )}
                </div>
                <div className="flex items-center mt-1">
                  <span className="flex-1 text-sm text-muted-foreground">
                    Net Margin
                  </span>
                  <span className="w-36 text-right text-sm text-muted-foreground">
                    {fmtPct(cur.net_margin_pct)}
                  </span>
                  {comp && (
                    <span className="w-36 text-right text-sm text-muted-foreground">
                      {fmtPct(comp.net_margin_pct)}
                    </span>
                  )}
                </div>
              </div>

              {/* ═══ PART B: OTHER COMPREHENSIVE INCOME ═══════════════ */}

              {/* ── 17. OTHER COMPREHENSIVE INCOME ────────────────────── */}
              <div className="mt-6 mb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1">
                  Other Comprehensive Income
                </h3>
              </div>
              {cur.other_comprehensive_income.lines.length > 0 ? (
                <>
                  <ExpandableSection
                    title="OCI Items"
                    current={cur.other_comprehensive_income}
                    comparative={comp?.other_comprehensive_income}
                    showComparative={showComparative}
                    defaultExpanded={false}
                  />
                  <SectionRow
                    label="Total Other Comprehensive Income"
                    current={cur.other_comprehensive_income.total}
                    comparative={comp?.other_comprehensive_income.total}
                    bold
                  />
                </>
              ) : (
                <>
                  <SectionRow
                    label="Total Other Comprehensive Income"
                    current={0}
                    comparative={comp ? 0 : undefined}
                    bold
                  />
                  <div className="text-xs text-muted-foreground pl-1 py-0.5 italic">
                    No OCI items — revaluation surplus, FX translation and
                    similar items will appear here when posted
                  </div>
                </>
              )}

              {/* ── 18. TOTAL COMPREHENSIVE INCOME ─────────────────────── */}
              <div className="mt-3 p-4 rounded-lg border-2 bg-primary/5">
                <div className="flex items-center">
                  <span className="flex-1 text-lg font-bold">
                    Total Comprehensive Income for the Period
                  </span>
                  <span
                    className={`w-36 text-right font-mono text-lg font-bold ${cur.total_comprehensive_income >= 0 ? "text-foreground" : "text-destructive"}`}
                  >
                    {fmt(cur.total_comprehensive_income)}
                  </span>
                  {comp && (
                    <span
                      className={`w-36 text-right font-mono text-lg font-bold ${comp.total_comprehensive_income >= 0 ? "text-foreground" : "text-destructive"}`}
                    >
                      {fmt(comp.total_comprehensive_income)}
                    </span>
                  )}
                </div>
              </div>

              {/* ── 19. ATTRIBUTION (GROUP REPORTING) ──────────────────── */}
              <div className="mt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-2">
                  Profit Attributable To
                </h3>
              </div>
              <SectionRow
                label="Owners of the Parent"
                current={cur.profit_attributable_to_owners}
                comparative={comp?.profit_attributable_to_owners}
                indent={1}
              />
              <SectionRow
                label="Non-Controlling Interests"
                current={cur.profit_attributable_to_nci}
                comparative={comp?.profit_attributable_to_nci}
                indent={1}
              />
              <div className="mt-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-2">
                  Total Comprehensive Income Attributable To
                </h3>
              </div>
              <SectionRow
                label="Owners of the Parent"
                current={cur.comprehensive_income_attributable_to_owners}
                comparative={comp?.comprehensive_income_attributable_to_owners}
                indent={1}
              />
              <SectionRow
                label="Non-Controlling Interests"
                current={cur.comprehensive_income_attributable_to_nci}
                comparative={comp?.comprehensive_income_attributable_to_nci}
                indent={1}
              />

              {/* ── 20. EARNINGS PER SHARE ────────────────────────────── */}
              <div className="mt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-1 mb-2">
                  Earnings Per Share
                </h3>
              </div>
              <SectionRow
                label="Basic EPS"
                current={
                  cur.earnings_per_share.basic_eps !== null
                    ? fmtSigned(cur.earnings_per_share.basic_eps)
                    : "N/A (no shares configured)"
                }
                comparative={
                  comp && comp.earnings_per_share.basic_eps !== null
                    ? fmtSigned(comp.earnings_per_share.basic_eps)
                    : undefined
                }
              />
              <SectionRow
                label="Diluted EPS"
                current={
                  cur.earnings_per_share.diluted_eps !== null
                    ? fmtSigned(cur.earnings_per_share.diluted_eps)
                    : "N/A (no shares configured)"
                }
                comparative={
                  comp && comp.earnings_per_share.diluted_eps !== null
                    ? fmtSigned(comp.earnings_per_share.diluted_eps)
                    : undefined
                }
              />

              {/* Variance indicator */}
              {comp && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                  {cur.net_profit >= comp.net_profit ? (
                    <Badge
                      variant="secondary"
                      className="bg-green-100/80 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />+
                      {fmt(cur.net_profit - comp.net_profit)} vs comparative
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-red-100/80 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    >
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {fmt(cur.net_profit - comp.net_profit)} vs comparative
                    </Badge>
                  )}
                </div>
              )}

              {/* Generated timestamp */}
              {statement?.generated_at && (
                <p className="text-xs text-muted-foreground text-center mt-6">
                  Generated{" "}
                  {format(
                    new Date(statement.generated_at),
                    "dd MMM yyyy HH:mm",
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading / Empty */}
        {!cur && !loading && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Select a date range and click Generate to view the P&amp;L
              statement.
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
