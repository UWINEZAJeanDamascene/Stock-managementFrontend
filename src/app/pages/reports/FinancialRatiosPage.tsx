import { useState, useEffect, useCallback } from 'react';
import { reportsApi, type FinancialRatiosReport, type FRCategory, type FRRatio } from '@/lib/api';
import { Layout } from '../../layout/Layout';
import {
  Loader2,
  Gauge,
  Printer,
  CalendarDays,
  TrendingUp,
  Droplets,
  BarChart3,
  Cog,
  Scale,
  CheckCircle,
  AlertCircle,
  XCircle,
  MinusCircle,
  Clock,
  Target,
  Activity,
  Database,
  ChevronDown,
  ChevronUp,
  BarChart2,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Progress } from '@/app/components/ui/progress';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/app/components/ui/collapsible';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/app/components/ui/chart';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────
type FinancialRatiosReportWithCache = FinancialRatiosReport & { from_cache?: boolean };

// ── Constants ─────────────────────────────────────────────────────────────────
interface RatioMeta {
  good: number;
  warning: number;
  direction: 'gte' | 'lte';
  unit: string;
}

const RATIO_META: Record<string, RatioMeta> = {
  current_ratio:             { good: 2,   warning: 1,    direction: 'gte', unit: 'x' },
  quick_ratio:               { good: 1,   warning: 0.5,  direction: 'gte', unit: 'x' },
  cash_ratio:                { good: 0.5, warning: 0.2,  direction: 'gte', unit: 'x' },
  working_capital:           { good: 1,   warning: 0,    direction: 'gte', unit: '' },
  gross_margin_pct:          { good: 40,  warning: 20,   direction: 'gte', unit: '%' },
  net_profit_margin_pct:     { good: 15,  warning: 5,    direction: 'gte', unit: '%' },
  ebitda_margin_pct:         { good: 20,  warning: 10,   direction: 'gte', unit: '%' },
  return_on_assets:          { good: 10,  warning: 5,    direction: 'gte', unit: '%' },
  return_on_equity:          { good: 15,  warning: 8,    direction: 'gte', unit: '%' },
  inventory_turnover:        { good: 6,   warning: 3,    direction: 'gte', unit: 'x' },
  days_inventory_outstanding:{ good: 60,  warning: 90,   direction: 'lte', unit: 'd' },
  ar_turnover:               { good: 8,   warning: 4,    direction: 'gte', unit: 'x' },
  days_sales_outstanding:    { good: 45,  warning: 60,   direction: 'lte', unit: 'd' },
  ap_turnover:               { good: 8,   warning: 4,    direction: 'gte', unit: 'x' },
  days_payable_outstanding:  { good: 30,  warning: 60,   direction: 'lte', unit: 'd' },
  debt_to_equity:            { good: 1,   warning: 2,    direction: 'lte', unit: 'x' },
  interest_coverage:         { good: 3,   warning: 1.5,  direction: 'gte', unit: 'x' },
};

const STATUS_CONFIG = {
  good: {
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    progressClass: '[&>div]:bg-emerald-500',
    icon: CheckCircle,
    iconClass: 'text-emerald-500',
    label: 'Good',
    bannerGradient: 'from-emerald-600 to-teal-700',
    bannerTitle: 'Financially Healthy',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    progressClass: '[&>div]:bg-amber-500',
    icon: AlertCircle,
    iconClass: 'text-amber-500',
    label: 'Warning',
    bannerGradient: 'from-amber-500 to-orange-600',
    bannerTitle: 'Needs Attention',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800',
  },
  danger: {
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    progressClass: '[&>div]:bg-red-500',
    icon: XCircle,
    iconClass: 'text-red-500',
    label: 'Danger',
    bannerGradient: 'from-red-600 to-rose-700',
    bannerTitle: 'Critical Issues Detected',
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800',
  },
  neutral: {
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    progressClass: '[&>div]:bg-slate-400',
    icon: MinusCircle,
    iconClass: 'text-slate-400',
    label: 'N/A',
    bannerGradient: 'from-slate-600 to-slate-700',
    bannerTitle: 'Insufficient Data',
    bg: 'bg-slate-50 dark:bg-slate-900/20',
    border: 'border-slate-200 dark:border-slate-700',
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

const CATEGORY_META = {
  liquidity:     { icon: Droplets,  color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-950/20',   border: 'border-blue-200 dark:border-blue-800' },
  profitability: { icon: TrendingUp, color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-800' },
  efficiency:    { icon: Cog,        color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-purple-200 dark:border-purple-800' },
  leverage:      { icon: Scale,      color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800' },
};

const HERO_RATIO_KEYS: Array<{ category: string; key: string }> = [
  { category: 'liquidity',     key: 'current_ratio' },
  { category: 'profitability', key: 'gross_margin_pct' },
  { category: 'efficiency',    key: 'days_sales_outstanding' },
  { category: 'leverage',      key: 'debt_to_equity' },
];

const radarChartConfig: ChartConfig = {
  score: { label: 'Health Score', color: '#6366f1' },
};

// ── Utility functions ─────────────────────────────────────────────────────────
function statusToScore(status: string): number {
  switch (status) {
    case 'good':    return 100;
    case 'warning': return 60;
    case 'danger':  return 25;
    default:        return 40;
  }
}

function computeProgress(ratioKey: string, value: number | null): number {
  if (value === null || value === undefined) return 0;
  const meta = RATIO_META[ratioKey];
  if (!meta) return 50;
  const { good, warning, direction } = meta;

  if (direction === 'gte') {
    if (value >= good) return 100;
    if (value >= warning) {
      const range = good - warning;
      return range <= 0 ? 75 : 50 + ((value - warning) / range) * 50;
    }
    return warning > 0 ? Math.max(0, (value / warning) * 50) : 0;
  } else {
    if (value <= 0) return 100;
    if (value <= good) return 100;
    if (value <= warning) {
      const range = warning - good;
      return range <= 0 ? 75 : 50 + ((warning - value) / range) * 50;
    }
    return Math.max(5, (good / value) * 50);
  }
}

function fmtVal(v: number | null, unit = ''): string {
  if (v === null || v === undefined) return 'N/A';
  const formatted =
    Math.abs(v) >= 10000
      ? v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return unit ? `${formatted}${unit}` : formatted;
}

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function formatInputKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[(status as StatusKey)] ?? STATUS_CONFIG.neutral;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${cfg.badge}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    </div>
  );
}

// ── Health Banner ─────────────────────────────────────────────────────────────
function HealthBanner({ report }: { report: FinancialRatiosReportWithCache }) {
  const { summary } = report;
  const cfg = STATUS_CONFIG[(summary.overall as StatusKey)] ?? STATUS_CONFIG.neutral;
  const Icon = cfg.icon;

  return (
    <Card className={`bg-gradient-to-r ${cfg.bannerGradient} border-0 text-white overflow-hidden`}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Status info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <h2 className="text-lg font-bold">{cfg.bannerTitle}</h2>
            </div>
            {report.company_name && (
              <p className="text-white/80 text-sm">
                {report.company_name} · As at{' '}
                {format(new Date(report.as_of_date), 'dd MMM yyyy')}
              </p>
            )}
            <p className="text-white/65 text-xs">
              Period: {format(new Date(report.date_from), 'dd MMM yyyy')} –{' '}
              {format(new Date(report.date_to), 'dd MMM yyyy')} ({report.days_in_period} days)
            </p>
          </div>

          {/* Right: Score tiles */}
          <div className="flex gap-3 shrink-0">
            {[
              { label: 'Good',    count: summary.good_count,    color: 'bg-white/20' },
              { label: 'Warning', count: summary.warning_count, color: 'bg-white/15' },
              { label: 'Danger',  count: summary.danger_count,  color: 'bg-white/10' },
            ].map(({ label, count, color }) => (
              <div key={label} className={`${color} rounded-xl px-4 py-2.5 text-center min-w-[64px]`}>
                <div className="text-2xl font-bold leading-none">{count}</div>
                <div className="text-[11px] text-white/80 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Hero KPI Cards ────────────────────────────────────────────────────────────
function HeroRatioCards({ report }: { report: FinancialRatiosReportWithCache }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {HERO_RATIO_KEYS.map(({ category, key }) => {
        const cat = report.ratios[category as keyof typeof report.ratios];
        const ratio = cat?.ratios?.[key as keyof typeof cat.ratios] as FRRatio | undefined;
        if (!ratio) return null;

        const catMeta = CATEGORY_META[category as keyof typeof CATEGORY_META];
        const ratioMeta = RATIO_META[key];
        const CategoryIcon = catMeta.icon;
        const progress = computeProgress(key, ratio.value);
        const cfg = STATUS_CONFIG[(ratio.status as StatusKey)] ?? STATUS_CONFIG.neutral;
        const displayValue = fmtVal(ratio.value, ratioMeta?.unit);

        return (
          <Card key={key} className={`border ${catMeta.border} ${catMeta.bg} transition-shadow hover:shadow-md`}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="p-1.5 rounded-lg bg-white/60 dark:bg-white/10">
                  <CategoryIcon className={`h-4 w-4 ${catMeta.color}`} />
                </div>
                <StatusBadge status={ratio.status} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-1">
              <div className="text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                {displayValue}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-3 leading-snug">
                {ratio.label}
              </div>
              <div className="space-y-1.5">
                <Progress
                  value={progress}
                  className={`h-1.5 ${cfg.progressClass}`}
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-snug">
                  {ratio.benchmark}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Health Radar Chart ────────────────────────────────────────────────────────
function HealthRadarChart({ report }: { report: FinancialRatiosReportWithCache }) {
  const { summary } = report;
  const radarData = [
    { category: 'Liquidity',     score: statusToScore(summary.liquidity),     fullMark: 100 },
    { category: 'Profitability', score: statusToScore(summary.profitability),  fullMark: 100 },
    { category: 'Efficiency',    score: statusToScore(summary.efficiency),     fullMark: 100 },
    { category: 'Leverage',      score: statusToScore(summary.leverage),       fullMark: 100 },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-indigo-500" />
          Financial Health Radar
        </CardTitle>
        <CardDescription className="text-xs">
          Category-level health — 100 = Good · 60 = Warning · 25 = Danger
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={radarChartConfig} className="h-[260px] w-full">
          <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono">{Number(value).toFixed(0)}</span>
                  )}
                />
              }
            />
            <PolarGrid stroke="rgba(148,163,184,0.25)" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fontSize: 12, fill: 'currentColor', className: 'text-slate-600 dark:text-slate-400' }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Health Score"
              dataKey="score"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.2}
              strokeWidth={2}
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 } as any}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ── Category Status Grid ──────────────────────────────────────────────────────
function CategoryStatusGrid({ report }: { report: FinancialRatiosReportWithCache }) {
  const entries = [
    { key: 'liquidity',     status: report.summary.liquidity },
    { key: 'profitability', status: report.summary.profitability },
    { key: 'efficiency',    status: report.summary.efficiency },
    { key: 'leverage',      status: report.summary.leverage },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-indigo-500" />
          Category Summary
        </CardTitle>
        <CardDescription className="text-xs">Financial health by category</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map(({ key, status }) => {
          const cat = report.ratios[key as keyof typeof report.ratios];
          const catMeta = CATEGORY_META[key as keyof typeof CATEGORY_META];
          const cfg = STATUS_CONFIG[(status as StatusKey)] ?? STATUS_CONFIG.neutral;
          const CategoryIcon = catMeta.icon;
          const ratios = Object.values(cat.ratios);
          const goodCount = ratios.filter(r => r.status === 'good').length;
          const totalCount = ratios.length;
          const score = statusToScore(status);

          return (
            <div
              key={key}
              className={`flex items-center gap-3 p-3 rounded-lg border ${catMeta.border} ${catMeta.bg} transition-colors`}
            >
              <div className="p-2 rounded-lg bg-white/50 dark:bg-white/10 shrink-0">
                <CategoryIcon className={`h-4 w-4 ${catMeta.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {cat.label}
                  </span>
                  <StatusBadge status={status} />
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={score}
                    className={`h-1.5 flex-1 ${cfg.progressClass}`}
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                    {goodCount}/{totalCount} good
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ── Ratio Row ─────────────────────────────────────────────────────────────────
function RatioRow({ ratioKey, ratio }: { ratioKey: string; ratio: FRRatio }) {
  const [expanded, setExpanded] = useState(false);
  const meta = RATIO_META[ratioKey];
  const progress = computeProgress(ratioKey, ratio.value);
  const cfg = STATUS_CONFIG[(ratio.status as StatusKey)] ?? STATUS_CONFIG.neutral;
  const Icon = cfg.icon;
  const displayValue = fmtVal(ratio.value, meta?.unit);
  const inputEntries = ratio.inputs ? Object.entries(ratio.inputs) : [];

  return (
    <div className="border-b last:border-b-0 py-3 last:pb-0 first:pt-0">
      <div className="flex items-start gap-2.5">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.iconClass}`} />
        <div className="flex-1 min-w-0">
          {/* Top row: label + value + status */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
              {ratio.label}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {displayValue}
              </span>
              <StatusBadge status={ratio.status} />
            </div>
          </div>

          {/* Progress bar */}
          <Progress value={progress} className={`h-1.5 mb-1 ${cfg.progressClass}`} />

          {/* Benchmark + expand toggle */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-slate-500 dark:text-slate-500 leading-snug">
              {ratio.benchmark}
            </span>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-indigo-500 transition-colors shrink-0"
              aria-expanded={expanded}
            >
              {expanded ? 'Hide' : 'Details'}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {/* Expanded detail panel */}
          {expanded && (
            <div className="mt-2 p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                <span className="font-semibold">Formula: </span>
                {ratio.formula}
              </div>
              {inputEntries.length > 0 && (
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Inputs: </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {inputEntries.map(([k, v]) => (
                      <span key={k}>
                        {formatInputKey(k)}:{' '}
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {fmtCurrency(v as number)}
                        </span>
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Category Card ─────────────────────────────────────────────────────────────
function CategoryCard({ catKey, category }: { catKey: string; category: FRCategory }) {
  const catMeta = CATEGORY_META[catKey as keyof typeof CATEGORY_META];
  const CategoryIcon = catMeta?.icon ?? BarChart3;
  const ratioEntries = Object.entries(category.ratios);
  const goodCount = ratioEntries.filter(([, r]) => r.status === 'good').length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CategoryIcon className={`h-5 w-5 ${catMeta?.color ?? 'text-slate-500'}`} />
            {category.label}
          </CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            {goodCount}/{ratioEntries.length} good
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {ratioEntries.map(([key, ratio]) => (
          <RatioRow key={key} ratioKey={key} ratio={ratio} />
        ))}
      </CardContent>
    </Card>
  );
}

// ── Input Data Section ────────────────────────────────────────────────────────
function InputDataSection({ report }: { report: FinancialRatiosReportWithCache }) {
  const [open, setOpen] = useState(false);

  // Collect all unique inputs from every ratio
  const allInputs: Record<string, number> = {};
  Object.values(report.ratios).forEach(cat => {
    Object.values(cat.ratios).forEach(ratio => {
      if (ratio.inputs) {
        Object.entries(ratio.inputs).forEach(([k, v]) => {
          if (!(k in allInputs)) allInputs[k] = v as number;
        });
      }
    });
  });

  const inputEntries = Object.entries(allInputs).sort(([a], [b]) => a.localeCompare(b));

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors rounded-xl">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <Database className="h-4 w-4 text-slate-500" />
                Source Data &amp; Inputs ({inputEntries.length} values)
              </CardTitle>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                {open ? 'Collapse' : 'Expand'}
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {inputEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <div className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-1 truncate">
                    {formatInputKey(key)}
                  </div>
                  <div className="text-sm font-mono font-semibold text-slate-900 dark:text-white truncate">
                    {fmtCurrency(value)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ── Quick Stats Strip ─────────────────────────────────────────────────────────
function QuickStatsStrip({ report }: { report: FinancialRatiosReportWithCache }) {
  // Collect all ratios across all categories
  const allRatios: Array<{ key: string; ratio: FRRatio; category: string }> = [];
  Object.entries(report.ratios).forEach(([catKey, cat]) => {
    Object.entries(cat.ratios).forEach(([key, ratio]) => {
      allRatios.push({ key, ratio, category: catKey });
    });
  });

  const goodCount  = allRatios.filter(r => r.ratio.status === 'good').length;
  const warnCount  = allRatios.filter(r => r.ratio.status === 'warning').length;
  const dangerCount= allRatios.filter(r => r.ratio.status === 'danger').length;
  const total      = allRatios.length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[
        { label: 'Total Ratios',    value: total,       color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-200 dark:border-slate-700' },
        { label: 'Good',            value: goodCount,   color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' },
        { label: 'Needs Attention', value: warnCount,   color: 'text-amber-700 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-950/30',    border: 'border-amber-200 dark:border-amber-800' },
        { label: 'Critical',        value: dangerCount, color: 'text-red-700 dark:text-red-400',        bg: 'bg-red-50 dark:bg-red-950/30',         border: 'border-red-200 dark:border-red-800' },
      ].map(({ label, value, color, bg, border }) => (
        <div key={label} className={`rounded-xl p-4 border ${bg} ${border}`}>
          <div className={`text-3xl font-bold font-mono ${color}`}>{value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinancialRatiosPage() {
  const [loading, setLoading]     = useState(false);
  const [report, setReport]       = useState<FinancialRatiosReportWithCache | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [asOfDate, setAsOfDate]   = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchRatios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await reportsApi.getFinancialRatios({
        as_of_date: asOfDate,
        date_from:  startDate,
        date_to:    endDate,
      });
      setReport(response as FinancialRatiosReportWithCache);
    } catch (err: any) {
      const msg = err.message || 'Failed to compute financial ratios';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [asOfDate, startDate, endDate]);

  useEffect(() => {
    fetchRatios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => window.print();

  return (
    <Layout>
      <TooltipProvider>
        <div className="space-y-6 max-w-7xl mx-auto">

          {/* ── Page Header ─────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                <Gauge className="h-7 w-7 text-indigo-500" />
                Financial Ratios
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                IAS/IFRS-compliant financial health indicators across 4 categories
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {report?.from_cache && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 border rounded-lg px-2.5 py-1.5 cursor-default select-none">
                      <Clock className="h-3.5 w-3.5" />
                      Cached
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Results loaded from cache. Recompute to refresh.</TooltipContent>
                </Tooltip>
              )}
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1.5" />
                Print
              </Button>
            </div>
          </div>

          {/* ── Date Filter ──────────────────────────────────────────────────── */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-end gap-4 flex-wrap">
                <div className="space-y-1.5 min-w-[160px]">
                  <Label className="text-xs text-slate-500 uppercase tracking-wide">As At Date</Label>
                  <Input
                    type="date"
                    value={asOfDate}
                    onChange={e => setAsOfDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 min-w-[160px]">
                  <Label className="text-xs text-slate-500 uppercase tracking-wide">Period Start</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 min-w-[160px]">
                  <Label className="text-xs text-slate-500 uppercase tracking-wide">Period End</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <Button onClick={fetchRatios} disabled={loading} size="sm" className="h-9">
                  {loading
                    ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    : <CalendarDays className="h-4 w-4 mr-1.5" />}
                  {loading ? 'Computing…' : 'Compute Ratios'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Error ───────────────────────────────────────────────────────── */}
          {error && !loading && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <CardContent className="flex items-center gap-3 py-4">
                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchRatios}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Loading skeleton ─────────────────────────────────────────────── */}
          {loading && <LoadingSkeleton />}

          {/* ── Empty prompt ─────────────────────────────────────────────────── */}
          {!loading && !report && !error && (
            <Card>
              <CardContent className="py-20 text-center">
                <Gauge className="h-14 w-14 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No data yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                  Select dates above and click <strong>Compute Ratios</strong> to view financial health indicators.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── Main dashboard ───────────────────────────────────────────────── */}
          {!loading && report && (
            <div className="space-y-6">

              {/* 1. Overall Health Banner */}
              <HealthBanner report={report} />

              {/* 2. Quick stats strip */}
              <QuickStatsStrip report={report} />

              {/* 3. Hero KPI Cards */}
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5" />
                  Key Performance Indicators
                </p>
                <HeroRatioCards report={report} />
              </div>

              {/* 4. Radar + Category summary */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HealthRadarChart report={report} />
                <CategoryStatusGrid report={report} />
              </div>

              {/* 5. Full ratio breakdown */}
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Detailed Ratio Analysis
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {Object.entries(report.ratios).map(([key, category]) => (
                    <CategoryCard key={key} catKey={key} category={category} />
                  ))}
                </div>
              </div>

              {/* 6. Source data inputs */}
              <InputDataSection report={report} />

              {/* 7. Footer timestamp */}
              <p className="text-[11px] text-slate-400 dark:text-slate-600 text-center pb-2">
                Generated {format(new Date(report.generated_at), 'dd MMM yyyy HH:mm')} ·{' '}
                Period: {report.days_in_period} days
                {report.from_cache && ' · Cached result'}
              </p>
            </div>
          )}
        </div>
      </TooltipProvider>
    </Layout>
  );
}
