import { useState, useEffect } from "react";
import { reportsApi, CashFlowReport, CFSection } from "@/lib/api";
import { Layout } from "../../layout/Layout";
import {
  Loader2,
  Waves,
  Printer,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
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

function CashFlowSection({
  title,
  section,
  comparative,
  showComparative: _showComparative,
  defaultExpanded = false,
}: {
  title: string;
  section: CFSection;
  comparative?: CFSection;
  showComparative: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const totalLabel =
    title === "Operating"
      ? "net_cash_from_operating"
      : title === "Investing"
        ? "net_cash_from_investing"
        : "net_cash_from_financing";
  const net = section[totalLabel as keyof CFSection] as number;

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center w-full py-2 text-sm font-medium text-foreground hover:bg-muted/50 rounded px-1"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 mr-1 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground" />
        )}
        {title} Activities
      </button>

      {expanded && (
        <div className="border-l-2 ml-2">
          {/* Inflows */}
          {section.inflows.length > 0 && (
            <>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-2 pt-2 pb-1 flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3 text-green-500" />
                Inflows
              </div>
              {section.inflows.map((item, idx) => {
                const compItem = comparative?.inflows.find(
                  (c) => c.source_type === item.source_type,
                );
                return (
                  <SectionRow
                    key={`in-${idx}`}
                    label={item.label}
                    current={item.cash_in}
                    comparative={compItem?.cash_in}
                    indent={1}
                  />
                );
              })}
            </>
          )}

          {/* Outflows */}
          {section.outflows.length > 0 && (
            <>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-2 pt-2 pb-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-red-500" />
                Outflows
              </div>
              {section.outflows.map((item, idx) => {
                const compItem = comparative?.outflows.find(
                  (c) => c.source_type === item.source_type,
                );
                return (
                  <SectionRow
                    key={`out-${idx}`}
                    label={item.label}
                    current={item.cash_out}
                    comparative={compItem?.cash_out}
                    indent={1}
                    isNegative
                  />
                );
              })}
            </>
          )}

          {section.inflows.length === 0 && section.outflows.length === 0 && (
            <div className="text-xs text-muted-foreground pl-4 py-2">
              No cash movements in this section
            </div>
          )}
        </div>
      )}

      {/* Section Net */}
      <SectionRow
        label={`Net Cash ${net >= 0 ? "from" : "used in"} ${title} Activities`}
        current={net}
        comparative={
          comparative
            ? (comparative[totalLabel as keyof CFSection] as number)
            : undefined
        }
        bold
        isNegative={net < 0}
      />
    </div>
  );
}

export default function CashFlowPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showComparative, setShowComparative] = useState(false);
  const [compStartDate, setCompStartDate] = useState("");
  const [compEndDate, setCompEndDate] = useState("");

  const fetchCF = async () => {
    setLoading(true);
    try {
      const params: any = { date_from: startDate, date_to: endDate };
      if (showComparative && compStartDate && compEndDate) {
        params.comparative_date_from = compStartDate;
        params.comparative_date_to = compEndDate;
      }
      const response = await reportsApi.getCashFlow(params);
      setReport(response as any);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate Cash Flow Statement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCF();
  }, []);

  const cur = report?.current;
  const comp = report?.comparative;
  const handlePrint = () => window.print();

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Waves className="h-8 w-8" />
              Cash Flow Statement
            </h1>
            <p className="text-muted-foreground mt-1">
              Statement of Cash Flows — IAS 7 (Direct Method)
            </p>
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
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={fetchCF} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showComparative}
                    onChange={(e) => setShowComparative(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Compare Period
                </label>
              </div>
            </div>
            {showComparative && (
              <div className="flex items-end gap-4 mt-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Compare Start</Label>
                  <Input
                    type="date"
                    value={compStartDate}
                    onChange={(e) => setCompStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Compare End</Label>
                  <Input
                    type="date"
                    value={compEndDate}
                    onChange={(e) => setCompEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cash Flow Statement */}
        {cur && (
          <Card className="print:shadow-none">
            <CardHeader className="text-center border-b">
              {report?.company_name && (
                <CardDescription className="text-base font-semibold text-foreground">
                  {report.company_name}
                </CardDescription>
              )}
              <CardTitle className="text-xl">Statement of Cash Flows</CardTitle>
              <CardDescription>
                For the period {format(new Date(startDate), "dd MMM yyyy")} to{" "}
                {format(new Date(endDate), "dd MMM yyyy")}
              </CardDescription>
              <CardDescription className="text-xs">
                (Amounts in functional currency — Direct Method)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              {/* Column Headers */}
              <div className="flex items-center py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b mb-2">
                <span className="flex-1">Description</span>
                <span className="w-36 text-right">Current Period</span>
                {comp && <span className="w-36 text-right">Comparative</span>}
              </div>

              {/* ── 1. OPERATING ACTIVITIES ──────────────────────────── */}
              <CashFlowSection
                title="Operating"
                section={cur.operating}
                comparative={comp?.operating}
                showComparative={showComparative}
                defaultExpanded={true}
              />

              {/* ── 2. INVESTING ACTIVITIES ──────────────────────────── */}
              <CashFlowSection
                title="Investing"
                section={cur.investing}
                comparative={comp?.investing}
                showComparative={showComparative}
                defaultExpanded={true}
              />

              {/* ── 3. FINANCING ACTIVITIES ──────────────────────────── */}
              <CashFlowSection
                title="Financing"
                section={cur.financing}
                comparative={comp?.financing}
                showComparative={showComparative}
                defaultExpanded={true}
              />

              {/* ── NET CHANGE IN CASH ──────────────────────────────── */}
              <div className="mt-4 p-4 rounded-lg border-2 bg-muted/30">
                <div className="flex items-center">
                  <span className="flex-1 text-lg font-bold flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5" />
                    Net Change in Cash &amp; Cash Equivalents
                  </span>
                  <span
                    className={`w-36 text-right font-mono text-lg font-bold ${cur.net_change_in_cash >= 0 ? "text-foreground" : "text-destructive"}`}
                  >
                    {fmt(cur.net_change_in_cash)}
                  </span>
                  {comp && (
                    <span
                      className={`w-36 text-right font-mono text-lg font-bold ${comp.net_change_in_cash >= 0 ? "text-foreground" : "text-destructive"}`}
                    >
                      {fmt(comp.net_change_in_cash)}
                    </span>
                  )}
                </div>
              </div>

              {/* ── OPENING BALANCE ─────────────────────────────────── */}
              <div className="mt-3" />
              <SectionRow
                label="Cash & Cash Equivalents at Beginning of Period"
                current={cur.opening_cash_balance}
                comparative={comp?.opening_cash_balance}
                bold
              />

              {/* ── CLOSING BALANCE ─────────────────────────────────── */}
              <div className="mt-4 p-4 rounded-lg border-2 bg-primary/5">
                <div className="flex items-center">
                  <span className="flex-1 text-lg font-bold">
                    Cash &amp; Cash Equivalents at End of Period
                  </span>
                  <span
                    className={`w-36 text-right font-mono text-lg font-bold ${cur.closing_cash_balance >= 0 ? "text-foreground" : "text-destructive"}`}
                  >
                    {fmt(cur.closing_cash_balance)}
                  </span>
                  {comp && (
                    <span
                      className={`w-36 text-right font-mono text-lg font-bold ${comp.closing_cash_balance >= 0 ? "text-foreground" : "text-destructive"}`}
                    >
                      {fmt(comp.closing_cash_balance)}
                    </span>
                  )}
                </div>
              </div>

              {/* ── RECONCILIATION CHECK ────────────────────────────── */}
              {cur.is_reconciled ? (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                  <Badge
                    variant="secondary"
                    className="bg-green-100/80 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  >
                    <ArrowRightLeft className="h-3 w-3 mr-1" />
                    Reconciled — Opening + Net Change = Closing
                  </Badge>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                  <Badge
                    variant="secondary"
                    className="bg-red-100/80 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Not reconciled — difference of{" "}
                    {fmt(cur.reconciliation_diff)}
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
                  Generated{" "}
                  {format(new Date(report.generated_at), "dd MMM yyyy HH:mm")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading / Empty */}
        {!cur && !loading && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Select a date range and click Generate to view the Cash Flow
              Statement.
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
