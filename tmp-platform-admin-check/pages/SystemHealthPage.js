import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { companyService } from "@/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Badge } from "@/app/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  HardDrive,
  Layers3,
  Loader2,
  MemoryStick,
  Microchip,
  RefreshCw,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
  XCircle,
  Zap
} from "lucide-react";
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor(seconds % 86400 / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(" ");
}
function formatDate(iso) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(iso));
}
const statusConfig = {
  ok: {
    icon: CheckCircle2,
    label: "Operational",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800"
  },
  degraded: {
    icon: AlertTriangle,
    label: "Degraded",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800"
  },
  down: {
    icon: XCircle,
    label: "Critical",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800"
  },
  error: {
    icon: XCircle,
    label: "Error",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800"
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800"
  },
  critical: {
    icon: XCircle,
    label: "Critical",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800"
  }
};
function getStatusConfig(key) {
  return statusConfig[key] || statusConfig.ok;
}
function statusFromRatio(used, total) {
  if (total <= 0) return "ok";
  const ratio = used / total;
  if (ratio >= 0.95) return "critical";
  if (ratio >= 0.85) return "warning";
  return "ok";
}
function StatusCard({
  title,
  status,
  detail,
  icon: Icon,
  metric
}) {
  const cfg = getStatusConfig(status);
  const StatusIcon = cfg.icon;
  return /* @__PURE__ */ jsx(Card, { className: "relative overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: /* @__PURE__ */ jsxs(CardContent, { className: "flex items-center gap-4 p-5", children: [
    /* @__PURE__ */ jsx("div", { className: cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border", cfg.bg, cfg.border), children: /* @__PURE__ */ jsx(Icon, { className: cn("h-6 w-6", cfg.color) }) }),
    /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: title }),
        /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: cn("border px-1.5 py-0 text-[10px] font-semibold", cfg.border, cfg.bg, cfg.color), children: [
          /* @__PURE__ */ jsx(StatusIcon, { className: "mr-1 h-3 w-3" }),
          cfg.label
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "mt-0.5 text-sm text-slate-700 dark:text-slate-200", children: detail }),
      metric && /* @__PURE__ */ jsx("p", { className: "mt-0.5 text-xs text-slate-500 dark:text-slate-400", children: metric })
    ] })
  ] }) });
}
function MemoryBar({
  label,
  used,
  total,
  unit,
  status
}) {
  const pct = total > 0 ? Math.round(used / total * 100) : 0;
  const cfg = getStatusConfig(status);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
      /* @__PURE__ */ jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: label }),
      /* @__PURE__ */ jsxs("span", { className: cn("font-semibold", cfg.color), children: [
        used.toFixed(1),
        " / ",
        total.toFixed(1),
        " ",
        unit,
        " (",
        pct,
        "%)"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", children: /* @__PURE__ */ jsx(
      "div",
      {
        className: cn(
          "h-full rounded-full transition-all duration-500",
          status === "critical" ? "bg-rose-500" : status === "warning" ? "bg-amber-500" : "bg-emerald-500"
        ),
        style: { width: `${Math.min(100, pct)}%` }
      }
    ) })
  ] });
}
function SystemHealthPage() {
  const [health, setHealth] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [healthError, setHealthError] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);
  const [gcResult, setGcResult] = useState(null);
  const [gcLoading, setGcLoading] = useState(false);
  const handleRunGC = async () => {
    try {
      setGcLoading(true);
      const res = await companyService.runGC();
      setGcResult({ gc_ran: res.gc_ran, message: res.message, heap_freed_mb: res.heap_freed_mb });
      await loadData();
    } catch (e) {
      setGcResult({ gc_ran: false, message: "GC request failed. Ensure you are a platform admin.", heap_freed_mb: 0 });
    } finally {
      setGcLoading(false);
    }
  };
  const loadData = async () => {
    setIsRefreshing(true);
    setHealthError(null);
    setDashboardError(null);
    const healthPromise = companyService.getSystemHealth().then((res) => {
      setHealth(res);
      setHealthError(null);
    }).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      setHealthError(msg);
      console.error("Failed to load system health:", e);
    });
    const dashboardPromise = companyService.getPlatformDashboard().then((res) => {
      setCompanies(res.data.companies);
      setDashboardError(null);
    }).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e);
      setDashboardError(msg);
      console.error("Failed to load dashboard:", e);
    });
    await Promise.all([healthPromise, dashboardPromise]);
    setLastUpdated(/* @__PURE__ */ new Date());
    setIsLoading(false);
    setIsRefreshing(false);
  };
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3e4);
    return () => clearInterval(interval);
  }, []);
  const tenantStats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter((c) => c.subscription_status === "active").length;
    const pending = companies.filter((c) => c.approvalStatus === "pending").length;
    const pastDue = companies.filter((c) => c.subscription_status === "past_due").length;
    const suspended = companies.filter((c) => c.subscription_status === "suspended").length;
    return { total, active, pending, pastDue, suspended };
  }, [companies]);
  const overallCfg = getStatusConfig(health?.status || "ok");
  const OverallIcon = overallCfg.icon;
  const heapLimitMb = health?.memory.heap_limit_mb || health?.metrics?.capacity.node_heap_limit_mb || health?.memory.heap_total_mb || 0;
  const rssLimitMb = health?.metrics?.system.total_memory_mb || Math.max(heapLimitMb, health?.memory.rss_mb || 0);
  const rssStatus = health ? statusFromRatio(health.memory.rss_mb, rssLimitMb) : "ok";
  return /* @__PURE__ */ jsxs("div", { className: "w-full space-y-5", children: [
    /* @__PURE__ */ jsx("div", { className: "relative overflow-hidden rounded-xl border border-slate-200/60 bg-gradient-to-br from-emerald-50 via-cyan-50 to-indigo-50 p-4 dark:from-emerald-950/40 dark:via-cyan-950/30 dark:to-indigo-950/20 dark:border-white/10 sm:p-5 lg:p-6", children: /* @__PURE__ */ jsxs("div", { className: "relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300", children: [
          /* @__PURE__ */ jsx(Activity, { className: "h-3.5 w-3.5" }),
          "Live Monitoring"
        ] }),
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl", children: "System Health" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300", children: "Real-time platform infrastructure monitoring. Database latency, memory usage, cache status, and tenant health \u2014 all in one operations view." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
        gcResult && /* @__PURE__ */ jsx("span", { className: cn(
          "text-xs font-medium",
          gcResult.gc_ran ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
        ), children: gcResult.gc_ran ? `GC freed ${gcResult.heap_freed_mb.toFixed(1)}MB` : gcResult.message }),
        lastUpdated && /* @__PURE__ */ jsxs("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: [
          /* @__PURE__ */ jsx(Clock, { className: "mr-1 inline h-3.5 w-3.5" }),
          "Updated ",
          lastUpdated.toLocaleTimeString()
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleRunGC,
            disabled: gcLoading || isRefreshing,
            className: "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 backdrop-blur transition hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
            children: [
              gcLoading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Zap, { className: "h-4 w-4" }),
              "Run GC"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: loadData,
            disabled: isRefreshing,
            className: "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 backdrop-blur transition hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
            children: [
              isRefreshing ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(RefreshCw, { className: "h-4 w-4" }),
              "Refresh"
            ]
          }
        )
      ] })
    ] }) }),
    isLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-24 rounded-2xl" }) : health ? /* @__PURE__ */ jsx(
      "div",
      {
        className: cn(
          "relative overflow-hidden rounded-2xl border p-6 transition-all",
          overallCfg.bg,
          overallCfg.border
        ),
        children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-start gap-4 sm:flex-row sm:items-center", children: [
          /* @__PURE__ */ jsx("div", { className: cn("flex h-14 w-14 items-center justify-center rounded-2xl border bg-white/80 dark:bg-white/10", overallCfg.border), children: /* @__PURE__ */ jsx(OverallIcon, { className: cn("h-7 w-7", overallCfg.color) }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
            /* @__PURE__ */ jsxs("h2", { className: cn("text-lg font-bold", overallCfg.color), children: [
              overallCfg.label,
              " \u2014 All systems ",
              health.status === "ok" ? "nominal" : health.status
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300", children: [
              /* @__PURE__ */ jsxs("span", { children: [
                "API ",
                health.version
              ] }),
              /* @__PURE__ */ jsxs("span", { children: [
                "Uptime ",
                formatUptime(health.uptime_seconds)
              ] }),
              /* @__PURE__ */ jsxs("span", { children: [
                "Last check ",
                formatDate(health.timestamp)
              ] })
            ] })
          ] })
        ] })
      }
    ) : null,
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h2", { className: "mb-4 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Service Status" }),
      isLoading ? /* @__PURE__ */ jsx("div", { className: "grid gap-4 sm:grid-cols-2 2xl:grid-cols-4", children: Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-24 rounded-xl" }, i)) }) : health ? /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2 2xl:grid-cols-4", children: [
        /* @__PURE__ */ jsx(
          StatusCard,
          {
            title: "Database",
            status: health.database.status,
            detail: health.database.status === "ok" ? "MongoDB connected" : "Connection issue detected",
            icon: Database,
            metric: `Latency ${health.database.ping_ms}ms`
          }
        ),
        /* @__PURE__ */ jsx(
          StatusCard,
          {
            title: "Cache",
            status: health.cache.status,
            detail: health.cache.status === "ok" ? "Redis operational" : "Cache unreachable",
            icon: Zap
          }
        ),
        /* @__PURE__ */ jsx(
          StatusCard,
          {
            title: "Memory",
            status: health.memory.status,
            detail: `RSS ${health.memory.rss_mb.toFixed(1)} MB`,
            icon: MemoryStick,
            metric: `Heap ${health.memory.heap_used_mb.toFixed(1)} / ${heapLimitMb.toFixed(1)} MB`
          }
        ),
        /* @__PURE__ */ jsx(
          StatusCard,
          {
            title: "API Server",
            status: health.status === "down" ? "error" : "ok",
            detail: health.status === "down" ? "Service unavailable" : "Responding normally",
            icon: Server,
            metric: `Uptime ${formatUptime(health.uptime_seconds)}`
          }
        )
      ] }) : healthError ? /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 p-8 text-center dark:border-rose-800 dark:bg-rose-950/20", children: [
        /* @__PURE__ */ jsx(AlertTriangle, { className: "mx-auto mb-3 h-8 w-8 text-rose-400 dark:text-rose-500" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-rose-700 dark:text-rose-300", children: "Unable to fetch system health data." }),
        healthError && /* @__PURE__ */ jsx("p", { className: "mt-1 max-w-md mx-auto text-xs text-rose-600/80 dark:text-rose-400/70 break-words", children: healthError }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: loadData,
            disabled: isRefreshing,
            className: "mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/40",
            children: [
              isRefreshing ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(RefreshCw, { className: "h-3.5 w-3.5" }),
              "Retry"
            ]
          }
        )
      ] }) : /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-dashed border-slate-200 bg-white/50 p-8 text-center dark:border-white/10 dark:bg-white/5", children: [
        /* @__PURE__ */ jsx(AlertTriangle, { className: "mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-600 dark:text-slate-300", children: "No health data available." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-5 2xl:grid-cols-2", children: [
      /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white", children: [
          /* @__PURE__ */ jsx(MemoryStick, { className: "h-4 w-4 text-indigo-500" }),
          "Memory Utilization"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { className: "space-y-5", children: isLoading || !health ? /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsx(Skeleton, { className: "h-8 rounded-lg" }),
          /* @__PURE__ */ jsx(Skeleton, { className: "h-8 rounded-lg" }),
          /* @__PURE__ */ jsx(Skeleton, { className: "h-8 rounded-lg" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(
            MemoryBar,
            {
              label: "Heap Used",
              used: health.memory.heap_used_mb,
              total: heapLimitMb,
              unit: "MB",
              status: health.memory.status
            }
          ),
          /* @__PURE__ */ jsx(
            MemoryBar,
            {
              label: "RSS (Resident Set)",
              used: health.memory.rss_mb,
              total: rssLimitMb,
              unit: "MB",
              status: rssStatus
            }
          ),
          health.memory_trend && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
            /* @__PURE__ */ jsxs("p", { className: "text-xs font-semibold text-slate-700 dark:text-slate-200", children: [
              "Trend (",
              health.memory_trend.readings,
              " readings over ",
              Math.round(health.memory_trend.duration_sec / 60),
              "m)"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "mt-2 flex items-center gap-4 text-xs", children: [
              /* @__PURE__ */ jsxs("span", { className: cn("font-medium", health.memory_trend.growth_mb > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"), children: [
                health.memory_trend.growth_mb > 0 ? "+" : "",
                health.memory_trend.growth_mb.toFixed(1),
                " MB"
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "text-slate-500 dark:text-slate-400", children: [
                health.memory_trend.rate_mb_per_min > 0 ? "+" : "",
                health.memory_trend.rate_mb_per_min.toFixed(1),
                " MB/min"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300", children: [
            /* @__PURE__ */ jsx("p", { className: "font-medium", children: "Status interpretation:" }),
            /* @__PURE__ */ jsxs("ul", { className: "mt-1 space-y-0.5 pl-4 list-disc", children: [
              /* @__PURE__ */ jsxs("li", { children: [
                /* @__PURE__ */ jsx("span", { className: "text-emerald-600 dark:text-emerald-400 font-medium", children: "OK" }),
                " \u2014 Heap usage below 85% of Node heap limit"
              ] }),
              /* @__PURE__ */ jsxs("li", { children: [
                /* @__PURE__ */ jsx("span", { className: "text-amber-600 dark:text-amber-400 font-medium", children: "Warning" }),
                " \u2014 Heap usage 85\u201395% of Node heap limit"
              ] }),
              /* @__PURE__ */ jsxs("li", { children: [
                /* @__PURE__ */ jsx("span", { className: "text-rose-600 dark:text-rose-400 font-medium", children: "Critical" }),
                " \u2014 Heap usage above 95% of Node heap limit"
              ] })
            ] })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white", children: [
          /* @__PURE__ */ jsx(Layers3, { className: "h-4 w-4 text-indigo-500" }),
          "Tenant Estate Overview"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { className: "space-y-4", children: isLoading ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" }),
          /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" }),
          /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" })
        ] }) : /* @__PURE__ */ jsx(Fragment, { children: [
          { label: "Total Tenants", value: tenantStats.total, icon: Users, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
          { label: "Active Subscriptions", value: tenantStats.active, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Pending Approval", value: tenantStats.pending, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
          { label: "Past Due", value: tenantStats.pastDue, icon: AlertTriangle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10" },
          { label: "Suspended", value: tenantStats.suspended, icon: ShieldCheck, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-500/10" }
        ].map((item) => /* @__PURE__ */ jsxs(
          "div",
          {
            className: "flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsx("div", { className: cn("flex h-9 w-9 items-center justify-center rounded-lg", item.bg), children: /* @__PURE__ */ jsx(item.icon, { className: cn("h-4 w-4", item.color) }) }),
                /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-200", children: item.label })
              ] }),
              /* @__PURE__ */ jsx("span", { className: "text-lg font-bold text-slate-900 dark:text-white", children: item.value })
            ]
          },
          item.label
        )) }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-5 2xl:grid-cols-2", children: [
      /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white", children: [
          /* @__PURE__ */ jsx(Activity, { className: "h-4 w-4 text-indigo-500" }),
          "Request Performance"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { className: "space-y-4", children: isLoading || !health?.metrics ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" }),
          /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" }),
          /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Avg Response" }),
              /* @__PURE__ */ jsxs("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: [
                health.metrics.requests.avg_response_ms.toFixed(1),
                "ms"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Recent Avg (1m)" }),
              /* @__PURE__ */ jsxs("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: [
                health.metrics.requests.recent_avg_ms.toFixed(1),
                "ms"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Requests / min" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: health.metrics.requests.requests_per_min })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Error Rate" }),
              /* @__PURE__ */ jsxs("p", { className: cn("mt-1 text-lg font-bold", health.metrics.requests.error_rate > 5 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"), children: [
                health.metrics.requests.error_rate.toFixed(2),
                "%"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Slow Rate (>500ms)" }),
              /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm font-bold text-slate-900 dark:text-white", children: [
                health.metrics.requests.slow_rate.toFixed(2),
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Event Loop Lag" }),
              /* @__PURE__ */ jsxs("p", { className: cn("mt-1 text-sm font-bold", health.metrics.event_loop_lag_ms > 50 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"), children: [
                health.metrics.event_loop_lag_ms.toFixed(2),
                "ms"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Total Requests" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm font-bold text-slate-900 dark:text-white", children: health.metrics.requests.total_requests.toLocaleString() })
            ] })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white", children: [
          /* @__PURE__ */ jsx(Microchip, { className: "h-4 w-4 text-indigo-500" }),
          "System Load"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { className: "space-y-4", children: isLoading || !health?.metrics ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" }),
          /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "CPU Cores" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: health.metrics.system.cpu_count })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Load 1m" }),
              /* @__PURE__ */ jsx("p", { className: cn("mt-1 text-lg font-bold", health.metrics.system.load_percent_1m > 80 ? "text-rose-600 dark:text-rose-400" : health.metrics.system.load_percent_1m > 60 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"), children: health.metrics.system.load_average_1m.toFixed(2) }),
              /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-slate-500 dark:text-slate-400", children: [
                health.metrics.system.load_percent_1m,
                "% utilization"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Server OS Memory" }),
              /* @__PURE__ */ jsxs("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: [
                health.metrics.system.free_memory_mb.toLocaleString(),
                " / ",
                health.metrics.system.total_memory_mb.toLocaleString(),
                " MB"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "OS Uptime" }),
              /* @__PURE__ */ jsxs("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: [
                health.metrics.system.uptime_hours.toFixed(1),
                "h"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              "Load 5m: ",
              health.metrics.system.load_average_5m.toFixed(2)
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-slate-300 dark:text-slate-600", children: "|" }),
            /* @__PURE__ */ jsxs("span", { children: [
              "Load 15m: ",
              health.metrics.system.load_average_15m.toFixed(2)
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-slate-300 dark:text-slate-600", children: "|" }),
            /* @__PURE__ */ jsxs("span", { children: [
              "Active DB connections: ",
              health.metrics.active_connections
            ] })
          ] })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white", children: [
        /* @__PURE__ */ jsx(Database, { className: "h-4 w-4 text-indigo-500" }),
        "Database Stats"
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: isLoading || !health?.metrics?.database_stats ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" }),
        /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-4 grid gap-3 sm:grid-cols-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Database" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm font-bold text-slate-900 dark:text-white", children: health.metrics.database_stats.name })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Total Size" }),
            /* @__PURE__ */ jsxs("p", { className: "mt-1 text-sm font-bold text-slate-900 dark:text-white", children: [
              health.metrics.database_stats.total_size_mb.toFixed(1),
              " MB"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Collections" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm font-bold text-slate-900 dark:text-white", children: health.metrics.database_stats.collections_count })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "overflow-hidden rounded-xl border border-slate-100 dark:border-white/5", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left text-xs", children: [
          /* @__PURE__ */ jsx("thead", { className: "bg-slate-50/80 text-slate-500 dark:bg-white/5 dark:text-slate-400", children: /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Collection" }),
            /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Documents" }),
            /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Size (MB)" }),
            /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Avg Obj (B)" }),
            /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Indexes" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-white/5", children: health.metrics.database_stats.top_collections.map((col) => /* @__PURE__ */ jsxs("tr", { className: "text-slate-700 dark:text-slate-200", children: [
            /* @__PURE__ */ jsx("td", { className: "px-3 py-2 font-medium", children: col.name }),
            /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: col.documents.toLocaleString() }),
            /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: col.size_mb.toFixed(1) }),
            /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: Math.round(col.avg_obj_size).toLocaleString() }),
            /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: col.indexes })
          ] }, col.name)) })
        ] }) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-5 2xl:grid-cols-2", children: [
      /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white", children: [
          /* @__PURE__ */ jsx(HardDrive, { className: "h-4 w-4 text-indigo-500" }),
          "Company Dataset"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { className: "space-y-4", children: isLoading || !health?.metrics?.company_stats ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" }),
          /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Total Companies" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: health.metrics.company_stats.total_companies })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Active Companies" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400", children: health.metrics.company_stats.active_companies })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Tenant Documents" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: health.metrics.company_stats.total_tenant_documents.toLocaleString() })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Avg Docs / Company" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: health.metrics.company_stats.avg_documents_per_company.toLocaleString() })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "overflow-hidden rounded-xl border border-slate-100 dark:border-white/5", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left text-xs", children: [
            /* @__PURE__ */ jsx("thead", { className: "bg-slate-50/80 text-slate-500 dark:bg-white/5 dark:text-slate-400", children: /* @__PURE__ */ jsxs("tr", { children: [
              /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Collection" }),
              /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Documents" })
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-white/5", children: health.metrics.company_stats.collection_breakdown.slice(0, 6).map((item) => /* @__PURE__ */ jsxs("tr", { className: "text-slate-700 dark:text-slate-200", children: [
              /* @__PURE__ */ jsx("td", { className: "px-3 py-2 font-medium capitalize", children: item.collection }),
              /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: item.documents.toLocaleString() })
            ] }, item.collection)) })
          ] }) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
        /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white", children: [
          /* @__PURE__ */ jsx(TrendingUp, { className: "h-4 w-4 text-indigo-500" }),
          "System Capacity"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { className: "space-y-4", children: isLoading || !health?.metrics ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" }),
          /* @__PURE__ */ jsx(Skeleton, { className: "h-10 rounded-lg" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
              /* @__PURE__ */ jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: "Capacity Used" }),
              /* @__PURE__ */ jsxs("span", { className: cn("font-semibold", health.metrics.capacity.capacity_used_percent > 85 ? "text-rose-600 dark:text-rose-400" : health.metrics.capacity.capacity_used_percent > 60 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"), children: [
                health.metrics.capacity.capacity_used_percent,
                "% (",
                health.metrics.capacity.current_active_companies,
                " / ",
                health.metrics.capacity.estimated_max_companies,
                " companies)"
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", children: /* @__PURE__ */ jsx(
              "div",
              {
                className: cn(
                  "h-full rounded-full transition-all duration-500",
                  health.metrics.capacity.capacity_used_percent > 85 ? "bg-rose-500" : health.metrics.capacity.capacity_used_percent > 60 ? "bg-amber-500" : "bg-emerald-500"
                ),
                style: { width: `${Math.min(100, health.metrics.capacity.capacity_used_percent)}%` }
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Headroom (Companies)" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: health.metrics.capacity.headroom_companies })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Heap Headroom" }),
              /* @__PURE__ */ jsxs("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: [
                health.metrics.capacity.heap_headroom_mb.toFixed(0),
                " MB"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "DB Headroom" }),
              /* @__PURE__ */ jsxs("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: [
                health.metrics.capacity.db_headroom_mb.toFixed(0),
                " MB"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Node Heap Limit" }),
              /* @__PURE__ */ jsxs("p", { className: "mt-1 text-lg font-bold text-slate-900 dark:text-white", children: [
                health.metrics.capacity.node_heap_limit_mb.toFixed(0),
                " MB"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/5", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2", children: "How this is calculated" }),
            /* @__PURE__ */ jsxs("div", { className: "grid gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { children: "Avg DB / company:" }),
                /* @__PURE__ */ jsxs("span", { className: "font-medium text-slate-900 dark:text-white", children: [
                  health.metrics.capacity.derived_from.actual_db_per_company_mb.toFixed(1),
                  " MB"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { children: "Avg docs / company:" }),
                /* @__PURE__ */ jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: health.metrics.capacity.derived_from.actual_docs_per_company.toFixed(0) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { children: "Heap model / company:" }),
                /* @__PURE__ */ jsxs("span", { className: "font-medium text-slate-900 dark:text-white", children: [
                  health.metrics.capacity.derived_from.heap_per_company_mb.toFixed(1),
                  " MB"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { children: "Current bottleneck:" }),
                /* @__PURE__ */ jsx("span", { className: cn(
                  "font-medium capitalize",
                  health.metrics.capacity.derived_from.bottleneck === "memory" ? "text-rose-600 dark:text-rose-400" : health.metrics.capacity.derived_from.bottleneck === "database" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                ), children: health.metrics.capacity.derived_from.bottleneck })
              ] })
            ] })
          ] })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
      /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white", children: [
        /* @__PURE__ */ jsx(Server, { className: "h-4 w-4 text-indigo-500" }),
        "System Information"
      ] }) }),
      /* @__PURE__ */ jsx(CardContent, { children: isLoading || !health ? /* @__PURE__ */ jsx(Skeleton, { className: "h-16 rounded-lg" }) : /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2 2xl:grid-cols-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "API Version" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-900 dark:text-white", children: health.version })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Server Uptime" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-900 dark:text-white", children: formatUptime(health.uptime_seconds) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Last Health Check" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-900 dark:text-white", children: formatDate(health.timestamp) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Database Ping" }),
          /* @__PURE__ */ jsxs("p", { className: "text-sm font-bold text-slate-900 dark:text-white", children: [
            health.database.ping_ms,
            "ms"
          ] })
        ] })
      ] }) })
    ] })
  ] });
}
export {
  SystemHealthPage as default
};
