import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { companyService } from "@/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Globe,
  Eye,
  ServerCrash,
  FileText,
  Fingerprint
} from "lucide-react";
const TAILWIND_PALETTES = [
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", darkBg: "dark:bg-blue-900/30", darkText: "dark:text-blue-400", darkBorder: "dark:border-blue-800", fill: "#3b82f6" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", darkBg: "dark:bg-emerald-900/30", darkText: "dark:text-emerald-400", darkBorder: "dark:border-emerald-800", fill: "#10b981" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", darkBg: "dark:bg-orange-900/30", darkText: "dark:text-orange-400", darkBorder: "dark:border-orange-800", fill: "#f97316" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200", darkBg: "dark:bg-purple-900/30", darkText: "dark:text-purple-400", darkBorder: "dark:border-purple-800", fill: "#a855f7" },
  { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200", darkBg: "dark:bg-pink-900/30", darkText: "dark:text-pink-400", darkBorder: "dark:border-pink-800", fill: "#ec4899" },
  { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200", darkBg: "dark:bg-cyan-900/30", darkText: "dark:text-cyan-400", darkBorder: "dark:border-cyan-800", fill: "#06b6d4" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", darkBg: "dark:bg-amber-900/30", darkText: "dark:text-amber-400", darkBorder: "dark:border-amber-800", fill: "#eab308" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200", darkBg: "dark:bg-rose-900/30", darkText: "dark:text-rose-400", darkBorder: "dark:border-rose-800", fill: "#f43f5e" },
  { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200", darkBg: "dark:bg-indigo-900/30", darkText: "dark:text-indigo-400", darkBorder: "dark:border-indigo-800", fill: "#6366f1" },
  { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-200", darkBg: "dark:bg-teal-900/30", darkText: "dark:text-teal-400", darkBorder: "dark:border-teal-800", fill: "#14b8a6" }
];
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}
function getEntityPalette(entityType) {
  return TAILWIND_PALETTES[hashString(entityType || "unknown") % TAILWIND_PALETTES.length];
}
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 6e4);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString(void 0, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  loading
}) {
  const toneMap = {
    blue: "bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    amber: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    rose: "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60",
    violet: "bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60",
    slate: "bg-slate-50 text-slate-600 ring-slate-100 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-900/60"
  };
  if (loading) {
    return /* @__PURE__ */ jsx(Card, { className: "border-slate-200/80 dark:border-slate-800", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx(Skeleton, { className: "h-4 w-28" }),
        /* @__PURE__ */ jsx(Skeleton, { className: "h-9 w-9 rounded-lg" })
      ] }),
      /* @__PURE__ */ jsx(Skeleton, { className: "mt-5 h-8 w-24" }),
      /* @__PURE__ */ jsx(Skeleton, { className: "mt-3 h-3 w-36" })
    ] }) });
  }
  return /* @__PURE__ */ jsx(Card, { className: "overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-5", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400", children: title }),
        /* @__PURE__ */ jsx("p", { className: "mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white", children: typeof value === "number" ? value.toLocaleString() : value })
      ] }),
      /* @__PURE__ */ jsx("div", { className: `rounded-lg p-2.5 ring-1 ${toneMap[tone]}`, children: icon })
    ] }),
    subtitle && /* @__PURE__ */ jsx("p", { className: "mt-3 text-xs text-slate-500 dark:text-slate-400", children: subtitle })
  ] }) });
}
function StatusBadge({ status }) {
  if (status === "success") {
    return /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400", children: [
      /* @__PURE__ */ jsx(CheckCircle2, { className: "mr-1 h-3 w-3" }),
      " Success"
    ] });
  }
  return /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400", children: [
    /* @__PURE__ */ jsx(XCircle, { className: "mr-1 h-3 w-3" }),
    " Failed"
  ] });
}
function SecurityAuditPage() {
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, per_page: 20, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditFilterStatus, setAuditFilterStatus] = useState("");
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companyService.getPlatformSecurityStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      setError(err?.message || "Failed to load security stats");
    } finally {
      setLoading(false);
    }
  };
  const fetchAuditLogs = async (page = 1, status = "") => {
    try {
      setAuditLoading(true);
      const params = { page, per_page: 20 };
      if (status) params.status = status;
      const response = await companyService.getPlatformAuditLogs(params);
      if (response.success) {
        setAuditLogs(response.data || []);
        setAuditPagination(response.pagination || { page: 1, per_page: 20, total: 0, total_pages: 1 });
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setAuditLoading(false);
    }
  };
  useEffect(() => {
    fetchStats();
  }, []);
  useEffect(() => {
    fetchAuditLogs(auditPage, auditFilterStatus);
  }, [auditPage, auditFilterStatus]);
  const entityChartData = useMemo(() => {
    if (!stats?.audit?.byEntity) return [];
    return stats.audit.byEntity.map((e) => ({
      name: e._id || "unknown",
      count: e.count,
      fill: getEntityPalette(e._id || "unknown").fill
    }));
  }, [stats]);
  const statusChartData = useMemo(() => {
    if (!stats?.audit?.byStatus) return [];
    return stats.audit.byStatus.map((s) => ({
      name: s._id,
      value: s.count,
      fill: s._id === "success" ? "#10b981" : "#ef4444"
    }));
  }, [stats]);
  return /* @__PURE__ */ jsx("div", { className: "w-full space-y-5", children: /* @__PURE__ */ jsxs("div", { className: "w-full space-y-5", children: [
    /* @__PURE__ */ jsx("div", { className: "overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white", children: /* @__PURE__ */ jsx("div", { className: "p-4 sm:p-5 lg:p-6", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsxs(Badge, { className: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/10", children: [
            /* @__PURE__ */ jsx(Shield, { className: "mr-1 h-3.5 w-3.5" }),
            "Platform Security Center"
          ] }),
          stats && /* @__PURE__ */ jsx(
            Badge,
            {
              variant: "secondary",
              className: stats.logins.failedRate < 5 ? "bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-200" : stats.logins.failedRate < 15 ? "bg-amber-500/20 text-amber-700 hover:bg-amber-500/20 dark:text-amber-200" : "bg-rose-500/20 text-rose-700 hover:bg-rose-500/20 dark:text-rose-200",
              children: stats.logins.failedRate < 5 ? "Secure" : stats.logins.failedRate < 15 ? "Caution" : "At Risk"
            }
          )
        ] }),
        /* @__PURE__ */ jsx("h1", { className: "mt-4 text-2xl font-bold tracking-tight sm:text-3xl", children: "Security & Audit" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-300 sm:text-base", children: "Monitor platform security posture, login activity, and audit trails across all tenants." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap items-center gap-2", children: /* @__PURE__ */ jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          className: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white",
          onClick: () => {
            fetchStats();
            fetchAuditLogs(auditPage, auditFilterStatus);
          },
          children: [
            /* @__PURE__ */ jsx(RefreshCw, { className: "mr-1.5 h-3.5 w-3.5" }),
            "Refresh"
          ]
        }
      ) })
    ] }) }) }),
    error && /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(AlertTriangle, { className: "h-5 w-5" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: error })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2 2xl:grid-cols-4", children: [
      /* @__PURE__ */ jsx(
        MetricCard,
        {
          title: "Total Users",
          value: stats?.users.total ?? 0,
          subtitle: stats ? `${stats.users.active} active \xB7 ${stats.users.inactive} inactive` : void 0,
          icon: /* @__PURE__ */ jsx(Users, { className: "h-5 w-5" }),
          tone: "blue",
          loading
        }
      ),
      /* @__PURE__ */ jsx(
        MetricCard,
        {
          title: "Failed Logins Today",
          value: stats?.logins.todayFailed ?? 0,
          subtitle: stats ? `${stats.logins.failedRate}% failure rate \xB7 ${stats.logins.weekFailed} this week` : void 0,
          icon: /* @__PURE__ */ jsx(ShieldAlert, { className: "h-5 w-5" }),
          tone: stats && stats.logins.failedRate > 15 ? "rose" : "amber",
          loading
        }
      ),
      /* @__PURE__ */ jsx(
        MetricCard,
        {
          title: "2FA Adoption",
          value: `${stats?.users.twoFARate ?? 0}%`,
          subtitle: stats ? `${stats.users.twoFAEnabled} of ${stats.users.total} users enabled` : void 0,
          icon: /* @__PURE__ */ jsx(Fingerprint, { className: "h-5 w-5" }),
          tone: "emerald",
          loading
        }
      ),
      /* @__PURE__ */ jsx(
        MetricCard,
        {
          title: "IP Whitelist",
          value: stats?.ipWhitelist.total ?? 0,
          subtitle: "Configured entries",
          icon: /* @__PURE__ */ jsx(Globe, { className: "h-5 w-5" }),
          tone: "violet",
          loading
        }
      )
    ] }),
    /* @__PURE__ */ jsxs(Tabs, { defaultValue: "overview", className: "w-full", children: [
      /* @__PURE__ */ jsxs(TabsList, { className: "h-auto w-full justify-start gap-1 overflow-x-auto border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950 lg:w-fit", children: [
        /* @__PURE__ */ jsx(TabsTrigger, { value: "overview", className: "shrink-0", children: "Overview" }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "events", className: "shrink-0", children: "Security Events" }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "failed", className: "shrink-0", children: "Failed Logins" }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "audit", className: "shrink-0", children: "Audit Logs" })
      ] }),
      /* @__PURE__ */ jsxs(TabsContent, { value: "overview", className: "space-y-4 mt-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-4 2xl:grid-cols-2", children: [
          /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/80 dark:border-slate-800", children: [
            /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(Activity, { className: "h-4 w-4 text-blue-500" }),
              "7-Day Activity Trend"
            ] }) }),
            /* @__PURE__ */ jsx(CardContent, { children: loading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-[260px] w-full rounded-lg" }) : stats?.activityTrend && stats.activityTrend.length > 0 ? /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 260, children: /* @__PURE__ */ jsxs(AreaChart, { data: stats.activityTrend, children: [
              /* @__PURE__ */ jsxs("defs", { children: [
                /* @__PURE__ */ jsxs("linearGradient", { id: "colorTotal", x1: "0", y1: "0", x2: "0", y2: "1", children: [
                  /* @__PURE__ */ jsx("stop", { offset: "5%", stopColor: "#3b82f6", stopOpacity: 0.3 }),
                  /* @__PURE__ */ jsx("stop", { offset: "95%", stopColor: "#3b82f6", stopOpacity: 0 })
                ] }),
                /* @__PURE__ */ jsxs("linearGradient", { id: "colorFailed", x1: "0", y1: "0", x2: "0", y2: "1", children: [
                  /* @__PURE__ */ jsx("stop", { offset: "5%", stopColor: "#ef4444", stopOpacity: 0.3 }),
                  /* @__PURE__ */ jsx("stop", { offset: "95%", stopColor: "#ef4444", stopOpacity: 0 })
                ] })
              ] }),
              /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0" }),
              /* @__PURE__ */ jsx(XAxis, { dataKey: "date", tick: { fontSize: 12 }, stroke: "#94a3b8" }),
              /* @__PURE__ */ jsx(YAxis, { tick: { fontSize: 12 }, stroke: "#94a3b8" }),
              /* @__PURE__ */ jsx(
                Tooltip,
                {
                  contentStyle: { borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff" },
                  labelStyle: { color: "#475569", fontWeight: 600 }
                }
              ),
              /* @__PURE__ */ jsx(Area, { type: "monotone", dataKey: "total", stroke: "#3b82f6", fill: "url(#colorTotal)", strokeWidth: 2, name: "Total Actions" }),
              /* @__PURE__ */ jsx(Area, { type: "monotone", dataKey: "failed", stroke: "#ef4444", fill: "url(#colorFailed)", strokeWidth: 2, name: "Failed" })
            ] }) }) : /* @__PURE__ */ jsx("div", { className: "flex h-[260px] items-center justify-center text-sm text-slate-400", children: "No activity data available" }) })
          ] }),
          /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/80 dark:border-slate-800", children: [
            /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 text-violet-500" }),
              "Audit by Entity Type"
            ] }) }),
            /* @__PURE__ */ jsx(CardContent, { children: loading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-[260px] w-full rounded-lg" }) : entityChartData.length > 0 ? /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 260, children: /* @__PURE__ */ jsxs(BarChart, { data: entityChartData, layout: "vertical", children: [
              /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0", horizontal: false }),
              /* @__PURE__ */ jsx(XAxis, { type: "number", tick: { fontSize: 12 }, stroke: "#94a3b8" }),
              /* @__PURE__ */ jsx(YAxis, { dataKey: "name", type: "category", tick: { fontSize: 12 }, width: 100, stroke: "#94a3b8" }),
              /* @__PURE__ */ jsx(
                Tooltip,
                {
                  contentStyle: { borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff" },
                  cursor: { fill: "rgba(0,0,0,0.05)" }
                }
              ),
              /* @__PURE__ */ jsx(Bar, { dataKey: "count", radius: [0, 4, 4, 0], children: entityChartData.map((entry, index) => /* @__PURE__ */ jsx(Cell, { fill: entry.fill }, `cell-${index}`)) })
            ] }) }) : /* @__PURE__ */ jsx("div", { className: "flex h-[260px] items-center justify-center text-sm text-slate-400", children: "No entity data available" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/80 dark:border-slate-800", children: [
          /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(ShieldCheck, { className: "h-4 w-4 text-emerald-500" }),
            "Audit Status Distribution"
          ] }) }),
          /* @__PURE__ */ jsx(CardContent, { children: loading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-[200px] w-full rounded-lg" }) : statusChartData.length > 0 ? /* @__PURE__ */ jsx("div", { className: "flex flex-wrap items-center gap-8", children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 200, children: /* @__PURE__ */ jsxs(BarChart, { data: statusChartData, children: [
            /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0", vertical: false }),
            /* @__PURE__ */ jsx(XAxis, { dataKey: "name", tick: { fontSize: 13 }, stroke: "#94a3b8" }),
            /* @__PURE__ */ jsx(YAxis, { tick: { fontSize: 12 }, stroke: "#94a3b8" }),
            /* @__PURE__ */ jsx(
              Tooltip,
              {
                contentStyle: { borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff" },
                cursor: { fill: "rgba(0,0,0,0.05)" }
              }
            ),
            /* @__PURE__ */ jsx(Bar, { dataKey: "value", radius: [6, 6, 0, 0], children: statusChartData.map((entry, index) => /* @__PURE__ */ jsx(Cell, { fill: entry.fill }, `cell-${index}`)) })
          ] }) }) }) : /* @__PURE__ */ jsx("div", { className: "flex h-[200px] items-center justify-center text-sm text-slate-400", children: "No status data available" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx(TabsContent, { value: "events", className: "mt-4", children: /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/80 dark:border-slate-800", children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4 text-blue-500" }),
          "Recent Security Events"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { children: loading ? /* @__PURE__ */ jsx("div", { className: "space-y-3", children: Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-12 w-full rounded-lg" }, i)) }) : stats?.recentEvents && stats.recentEvents.length > 0 ? /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "min-w-[900px] w-full text-sm", children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400", children: [
            /* @__PURE__ */ jsx("th", { className: "pb-3 pr-4", children: "Action" }),
            /* @__PURE__ */ jsx("th", { className: "pb-3 pr-4", children: "Entity" }),
            /* @__PURE__ */ jsx("th", { className: "pb-3 pr-4", children: "User" }),
            /* @__PURE__ */ jsx("th", { className: "pb-3 pr-4", children: "Company" }),
            /* @__PURE__ */ jsx("th", { className: "pb-3 pr-4", children: "Status" }),
            /* @__PURE__ */ jsx("th", { className: "pb-3 pr-4", children: "IP" }),
            /* @__PURE__ */ jsx("th", { className: "pb-3", children: "Time" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-800", children: stats.recentEvents.map((event) => {
            const palette = getEntityPalette(event.entity_type);
            return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50 dark:hover:bg-slate-900/50", children: [
              /* @__PURE__ */ jsx("td", { className: "py-3 pr-4 font-medium text-slate-800 dark:text-slate-200", children: event.action }),
              /* @__PURE__ */ jsx("td", { className: "py-3 pr-4", children: /* @__PURE__ */ jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${palette.bg} ${palette.text} ${palette.border} ${palette.darkBg} ${palette.darkText} ${palette.darkBorder}`, children: event.entity_type }) }),
              /* @__PURE__ */ jsx("td", { className: "py-3 pr-4 text-slate-600 dark:text-slate-300", children: event.user ? event.user.name || event.user.email : "System" }),
              /* @__PURE__ */ jsx("td", { className: "py-3 pr-4 text-slate-600 dark:text-slate-300", children: event.company ? `${event.company.name} (${event.company.code})` : "N/A" }),
              /* @__PURE__ */ jsx("td", { className: "py-3 pr-4", children: /* @__PURE__ */ jsx(StatusBadge, { status: event.status }) }),
              /* @__PURE__ */ jsx("td", { className: "py-3 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400", children: event.ip_address || "N/A" }),
              /* @__PURE__ */ jsx("td", { className: "py-3 text-slate-500 dark:text-slate-400 text-xs", children: timeAgo(event.createdAt) })
            ] }, event._id);
          }) })
        ] }) }) : /* @__PURE__ */ jsx("div", { className: "flex h-40 items-center justify-center text-sm text-slate-400", children: "No recent security events" }) })
      ] }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "failed", className: "mt-4", children: /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/80 dark:border-slate-800", children: [
        /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, { className: "text-base font-semibold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(ServerCrash, { className: "h-4 w-4 text-rose-500" }),
          "Recent Failed Logins"
        ] }) }),
        /* @__PURE__ */ jsx(CardContent, { children: loading ? /* @__PURE__ */ jsx("div", { className: "space-y-3", children: Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-12 w-full rounded-lg" }, i)) }) : stats?.recentFailedLogins && stats.recentFailedLogins.length > 0 ? /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "min-w-[760px] w-full text-sm", children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400", children: [
            /* @__PURE__ */ jsx("th", { className: "pb-3 pr-4", children: "User" }),
            /* @__PURE__ */ jsx("th", { className: "pb-3 pr-4", children: "Email" }),
            /* @__PURE__ */ jsx("th", { className: "pb-3 pr-4", children: "IP Address" }),
            /* @__PURE__ */ jsx("th", { className: "pb-3", children: "Time" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-800", children: stats.recentFailedLogins.map((log) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50 dark:hover:bg-slate-900/50", children: [
            /* @__PURE__ */ jsx("td", { className: "py-3 pr-4 font-medium text-slate-800 dark:text-slate-200", children: log.user?.name || "Unknown" }),
            /* @__PURE__ */ jsx("td", { className: "py-3 pr-4 text-slate-600 dark:text-slate-300", children: log.user?.email || "N/A" }),
            /* @__PURE__ */ jsx("td", { className: "py-3 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400", children: log.ipAddress || "N/A" }),
            /* @__PURE__ */ jsx("td", { className: "py-3 text-slate-500 dark:text-slate-400 text-xs", children: timeAgo(log.createdAt) })
          ] }, log._id)) })
        ] }) }) : /* @__PURE__ */ jsx("div", { className: "flex h-40 items-center justify-center text-sm text-slate-400", children: "No failed logins recently" }) })
      ] }) }),
      /* @__PURE__ */ jsxs(TabsContent, { value: "audit", className: "mt-4 space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: auditFilterStatus === "" ? "default" : "outline",
              size: "sm",
              onClick: () => setAuditFilterStatus(""),
              children: "All"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: auditFilterStatus === "success" ? "default" : "outline",
              size: "sm",
              onClick: () => {
                setAuditPage(1);
                setAuditFilterStatus("success");
              },
              children: "Success"
            }
          ),
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: auditFilterStatus === "failure" ? "default" : "outline",
              size: "sm",
              onClick: () => {
                setAuditPage(1);
                setAuditFilterStatus("failure");
              },
              children: "Failed"
            }
          )
        ] }),
        /* @__PURE__ */ jsx(Card, { className: "border-slate-200/80 dark:border-slate-800", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-0", children: [
          auditLoading ? /* @__PURE__ */ jsx("div", { className: "space-y-3 p-6", children: Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-12 w-full rounded-lg" }, i)) }) : auditLogs.length > 0 ? /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "min-w-[860px] w-full text-sm", children: [
            /* @__PURE__ */ jsx("thead", { className: "bg-slate-50 dark:bg-slate-900/50", children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400", children: [
              /* @__PURE__ */ jsx("th", { className: "py-3 px-6", children: "Action" }),
              /* @__PURE__ */ jsx("th", { className: "py-3 px-6", children: "Entity" }),
              /* @__PURE__ */ jsx("th", { className: "py-3 px-6", children: "User" }),
              /* @__PURE__ */ jsx("th", { className: "py-3 px-6", children: "Company" }),
              /* @__PURE__ */ jsx("th", { className: "py-3 px-6", children: "Status" }),
              /* @__PURE__ */ jsx("th", { className: "py-3 px-6", children: "Time" })
            ] }) }),
            /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-800", children: auditLogs.map((log) => {
              const palette = getEntityPalette(log.entity_type);
              return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50 dark:hover:bg-slate-900/50", children: [
                /* @__PURE__ */ jsx("td", { className: "py-3 px-6 font-medium text-slate-800 dark:text-slate-200", children: log.action }),
                /* @__PURE__ */ jsx("td", { className: "py-3 px-6", children: /* @__PURE__ */ jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${palette.bg} ${palette.text} ${palette.border} ${palette.darkBg} ${palette.darkText} ${palette.darkBorder}`, children: log.entity_type }) }),
                /* @__PURE__ */ jsx("td", { className: "py-3 px-6 text-slate-600 dark:text-slate-300", children: log.user_id ? log.user_id.name || log.user_id.email : "System" }),
                /* @__PURE__ */ jsx("td", { className: "py-3 px-6 text-slate-600 dark:text-slate-300", children: log.company_id ? `${log.company_id.name} (${log.company_id.code})` : "N/A" }),
                /* @__PURE__ */ jsx("td", { className: "py-3 px-6", children: /* @__PURE__ */ jsx(StatusBadge, { status: log.status }) }),
                /* @__PURE__ */ jsx("td", { className: "py-3 px-6 text-slate-500 dark:text-slate-400 text-xs", children: timeAgo(log.createdAt) })
              ] }, log._id);
            }) })
          ] }) }) : /* @__PURE__ */ jsx("div", { className: "flex h-40 items-center justify-center text-sm text-slate-400", children: "No audit logs found" }),
          auditPagination.total_pages > 1 && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-3", children: [
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: [
              "Page ",
              auditPagination.page,
              " of ",
              auditPagination.total_pages,
              " (",
              auditPagination.total,
              " total)"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  disabled: auditPage <= 1,
                  onClick: () => setAuditPage((p) => Math.max(1, p - 1)),
                  children: "Previous"
                }
              ),
              /* @__PURE__ */ jsx(
                Button,
                {
                  variant: "outline",
                  size: "sm",
                  disabled: auditPage >= auditPagination.total_pages,
                  onClick: () => setAuditPage((p) => Math.min(auditPagination.total_pages, p + 1)),
                  children: "Next"
                }
              )
            ] })
          ] })
        ] }) })
      ] })
    ] })
  ] }) });
}
export {
  SecurityAuditPage as default
};
