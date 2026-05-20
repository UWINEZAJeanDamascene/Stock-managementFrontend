import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { companyService } from "@/services";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Activity,
  Ban,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Eye,
  Globe,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  XCircle,
  AlertTriangle,
  Crown,
  Loader2,
  Layers3
} from "lucide-react";
function planStyles(plan) {
  const known = {
    starter: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-800",
    professional: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
    enterprise: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
    growth: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
  };
  return known[plan] || "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700";
}
const statusStyles = {
  trialing: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  past_due: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800",
  suspended: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  rejected: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800"
};
const statusIcon = {
  active: /* @__PURE__ */ jsx(CheckCircle2, { className: "h-3.5 w-3.5" }),
  trialing: /* @__PURE__ */ jsx(Activity, { className: "h-3.5 w-3.5" }),
  past_due: /* @__PURE__ */ jsx(AlertTriangle, { className: "h-3.5 w-3.5" }),
  suspended: /* @__PURE__ */ jsx(Ban, { className: "h-3.5 w-3.5" }),
  cancelled: /* @__PURE__ */ jsx(XCircle, { className: "h-3.5 w-3.5" }),
  pending: /* @__PURE__ */ jsx(CalendarClock, { className: "h-3.5 w-3.5" }),
  approved: /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5" }),
  rejected: /* @__PURE__ */ jsx(XCircle, { className: "h-3.5 w-3.5" })
};
function formatDate(value) {
  if (!value) return "\u2014";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}
function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value || 0);
}
function titleCase(value) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub
}) {
  return /* @__PURE__ */ jsxs(Card, { className: "relative overflow-hidden border-slate-200/60 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
    /* @__PURE__ */ jsx("div", { className: cn("absolute left-0 top-0 h-full w-1", accent) }),
    /* @__PURE__ */ jsxs(CardContent, { className: "flex items-center justify-between p-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: label }),
        /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-slate-900 dark:text-white", children: value }),
        sub && /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: sub })
      ] }),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            accent.replace("bg-", "bg-").replace("500", "500/15")
          ),
          children: /* @__PURE__ */ jsx(Icon, { className: cn("h-5 w-5", accent.replace("bg-", "text-")) })
        }
      )
    ] })
  ] });
}
function TenantsPage() {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const loadTenants = async () => {
    try {
      setIsLoading(true);
      const response = await companyService.getPlatformDashboard();
      setCompanies(response.data.companies);
    } catch {
      try {
        const pending = await companyService.getPendingCompanies();
        setCompanies(pending.data);
      } catch {
        setCompanies([]);
      }
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadTenants();
  }, []);
  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter((c) => c.subscription_status === "active").length;
    const pending = companies.filter((c) => c.approvalStatus === "pending").length;
    const pastDue = companies.filter((c) => c.subscription_status === "past_due").length;
    const trialing = companies.filter((c) => c.subscription_status === "trialing").length;
    const suspended = companies.filter((c) => c.subscription_status === "suspended").length;
    const mrr = companies.reduce((sum, c) => {
      const amt = c.billing_amount || 0;
      return sum + (c.subscription_status === "active" || c.subscription_status === "trialing" ? amt : 0);
    }, 0);
    return { total, active, pending, pastDue, trialing, suspended, mrr };
  }, [companies]);
  const filtered = useMemo(() => {
    let data = [...companies];
    if (filter !== "all") {
      data = data.filter(
        (c) => filter === "pending" ? c.approvalStatus === "pending" : c.subscription_status === filter
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) => c.name.toLowerCase().includes(q) || c.code && c.code.toLowerCase().includes(q) || c.email && c.email.toLowerCase().includes(q)
      );
    }
    return data;
  }, [companies, filter, search]);
  const handleView = (company) => {
    setSelectedCompany(company);
    setSheetOpen(true);
  };
  const handleQuickStatus = async (company, status) => {
    try {
      setActionLoading(`${company._id}:${status}`);
      await companyService.updatePlatformAccess(company._id, {
        subscription_status: status,
        subscription_plan: company.subscription_plan,
        billing_cycle: company.billing_cycle
      });
      await loadTenants();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };
  const handleApprove = async (company) => {
    try {
      setActionLoading(company._id);
      await companyService.approveCompany(company._id);
      await loadTenants();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "w-full space-y-5", children: [
    /* @__PURE__ */ jsx("div", { className: "relative overflow-hidden rounded-xl border border-slate-200/60 bg-gradient-to-br from-indigo-50 via-violet-50 to-cyan-50 p-4 dark:from-indigo-950/40 dark:via-violet-950/30 dark:to-cyan-950/20 dark:border-white/10 sm:p-5 lg:p-6", children: /* @__PURE__ */ jsxs("div", { className: "relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:border-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300", children: [
          /* @__PURE__ */ jsx(Globe, { className: "h-3.5 w-3.5" }),
          "Tenant Directory"
        ] }),
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl", children: "Platform Tenants" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300", children: "Manage every registered company. Review subscriptions, approve new registrations, and monitor platform health in real time." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          onClick: loadTenants,
          disabled: isLoading,
          className: "border-slate-200 bg-white/80 text-slate-700 backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
          children: [
            isLoading ? /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(RefreshCw, { className: "mr-2 h-4 w-4" }),
            "Refresh"
          ]
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6", children: [
      /* @__PURE__ */ jsx(StatCard, { label: "Total Tenants", value: stats.total, icon: Building2, accent: "bg-indigo-500" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Active", value: stats.active, icon: CheckCircle2, accent: "bg-emerald-500" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Trialing", value: stats.trialing, icon: Activity, accent: "bg-sky-500" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Pending", value: stats.pending, icon: CalendarClock, accent: "bg-amber-500" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Past Due", value: stats.pastDue, icon: AlertTriangle, accent: "bg-red-500" }),
      /* @__PURE__ */ jsx(StatCard, { label: "Monthly Revenue", value: formatMoney(stats.mrr), icon: CreditCard, accent: "bg-violet-500" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between", children: [
      /* @__PURE__ */ jsx(Tabs, { value: filter, onValueChange: (v) => setFilter(v), children: /* @__PURE__ */ jsx(TabsList, { className: "h-auto w-full max-w-full justify-start gap-1 overflow-x-auto bg-white/70 p-1 backdrop-blur dark:bg-white/5 lg:w-fit", children: [
        { value: "all", label: "All" },
        { value: "active", label: "Active" },
        { value: "trialing", label: "Trialing" },
        { value: "pending", label: "Pending" },
        { value: "past_due", label: "Past Due" },
        { value: "suspended", label: "Suspended" }
      ].map((t) => /* @__PURE__ */ jsxs(
        TabsTrigger,
        {
          value: t.value,
          className: "shrink-0 text-xs data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-500/15 dark:data-[state=active]:text-indigo-300",
          children: [
            t.label,
            /* @__PURE__ */ jsx("span", { className: "ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300", children: t.value === "all" ? companies.length : t.value === "pending" ? companies.filter((c) => c.approvalStatus === "pending").length : companies.filter((c) => c.subscription_status === t.value).length })
          ]
        },
        t.value
      )) }) }),
      /* @__PURE__ */ jsxs("div", { className: "relative w-full md:w-80", children: [
        /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            placeholder: "Search tenants by name, code, email...",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            className: "border-slate-200 bg-white/80 pl-9 text-sm backdrop-blur placeholder:text-slate-400 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-[#0b111a]/60 dark:text-white"
          }
        )
      ] })
    ] }),
    isLoading ? /* @__PURE__ */ jsx("div", { className: "grid gap-4 md:grid-cols-2 2xl:grid-cols-3", children: Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-48 rounded-2xl" }, i)) }) : filtered.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 p-16 dark:border-white/10 dark:bg-white/5", children: [
      /* @__PURE__ */ jsx(Building2, { className: "mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" }),
      /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold text-slate-700 dark:text-slate-200", children: "No tenants found" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Try adjusting your filters or search query." })
    ] }) : /* @__PURE__ */ jsx("div", { className: "grid gap-4 md:grid-cols-2 2xl:grid-cols-3", children: filtered.map((company) => /* @__PURE__ */ jsxs(
      Card,
      {
        className: "group relative overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-indigo-500/5 dark:border-white/10 dark:bg-[#0f172a]/60",
        children: [
          /* @__PURE__ */ jsx(CardHeader, { className: "pb-3 pt-5", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx("div", { className: "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-500/20", children: company.name?.charAt(0).toUpperCase() || "?" }),
              /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsx("h3", { className: "truncate text-sm font-bold text-slate-900 dark:text-white", children: company.name }),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: company.code || "\u2014" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: cn("shrink-0 text-[10px] font-semibold", statusStyles[company.subscription_status || "active"]), children: [
              /* @__PURE__ */ jsx("span", { className: "mr-1", children: statusIcon[company.subscription_status || "active"] }),
              titleCase(company.subscription_status || "active")
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs(CardContent, { className: "space-y-3 pb-5", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: cn("text-[10px] font-semibold", planStyles(company.subscription_plan)), children: [
                /* @__PURE__ */ jsx(Crown, { className: "mr-1 h-3 w-3" }),
                titleCase(company.subscription_plan || "starter")
              ] }),
              company.approvalStatus === "pending" && /* @__PURE__ */ jsx(Badge, { variant: "outline", className: cn("text-[10px] font-semibold", statusStyles.pending), children: "Awaiting Approval" }),
              company.isActive === false && /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "border-rose-200 bg-rose-50 text-[10px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200", children: "Inactive" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3 text-xs", children: [
              /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-slate-50 p-2.5 dark:bg-white/5", children: [
                /* @__PURE__ */ jsx("p", { className: "mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400", children: "Billing" }),
                /* @__PURE__ */ jsx("p", { className: "font-semibold text-slate-800 dark:text-slate-100", children: formatMoney(company.billing_amount || 0) }),
                /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500 dark:text-slate-400", children: titleCase(company.billing_cycle || "monthly") })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-slate-50 p-2.5 dark:bg-white/5", children: [
                /* @__PURE__ */ jsx("p", { className: "mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400", children: "Next bill" }),
                /* @__PURE__ */ jsx("p", { className: "font-semibold text-slate-800 dark:text-slate-100", children: formatDate(company.next_billing_date) }),
                /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500 dark:text-slate-400", children: company.trial_ends_at ? `Trial ends ${formatDate(company.trial_ends_at)}` : "Recurring" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400", children: [
              /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
                /* @__PURE__ */ jsx(Users, { className: "h-3.5 w-3.5" }),
                company.users ?? 0,
                " users"
              ] }),
              /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
                /* @__PURE__ */ jsx(Layers3, { className: "h-3.5 w-3.5" }),
                company.enabledModuleCount ?? 0,
                " modules"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2 pt-1", children: [
              /* @__PURE__ */ jsxs(
                Button,
                {
                  size: "sm",
                  variant: "outline",
                  className: "h-8 flex-1 border-slate-200 bg-white/80 text-xs font-medium text-slate-700 backdrop-blur hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
                  onClick: () => handleView(company),
                  children: [
                    /* @__PURE__ */ jsx(Eye, { className: "mr-1.5 h-3.5 w-3.5" }),
                    "View"
                  ]
                }
              ),
              company.approvalStatus === "pending" ? /* @__PURE__ */ jsxs(
                Button,
                {
                  size: "sm",
                  className: "h-8 flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-xs font-medium text-white hover:from-indigo-700 hover:to-violet-700",
                  onClick: () => handleApprove(company),
                  disabled: actionLoading === company._id,
                  children: [
                    actionLoading === company._id ? /* @__PURE__ */ jsx(Loader2, { className: "mr-1.5 h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(CheckCircle2, { className: "mr-1.5 h-3.5 w-3.5" }),
                    "Approve"
                  ]
                }
              ) : company.subscription_status === "active" || company.subscription_status === "trialing" ? /* @__PURE__ */ jsxs(
                Button,
                {
                  size: "sm",
                  variant: "outline",
                  className: "h-8 flex-1 border-rose-200 bg-rose-50 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-500/10",
                  onClick: () => handleQuickStatus(company, "suspended"),
                  disabled: actionLoading === `${company._id}:suspended`,
                  children: [
                    actionLoading === `${company._id}:suspended` ? /* @__PURE__ */ jsx(Loader2, { className: "mr-1.5 h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(Ban, { className: "mr-1.5 h-3.5 w-3.5" }),
                    "Suspend"
                  ]
                }
              ) : /* @__PURE__ */ jsxs(
                Button,
                {
                  size: "sm",
                  className: "h-8 flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-medium text-white hover:from-emerald-700 hover:to-teal-700",
                  onClick: () => handleQuickStatus(company, "active"),
                  disabled: actionLoading === `${company._id}:active`,
                  children: [
                    actionLoading === `${company._id}:active` ? /* @__PURE__ */ jsx(Loader2, { className: "mr-1.5 h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(CheckCircle2, { className: "mr-1.5 h-3.5 w-3.5" }),
                    "Activate"
                  ]
                }
              )
            ] })
          ] })
        ]
      },
      company._id
    )) }),
    /* @__PURE__ */ jsx(Sheet, { open: sheetOpen, onOpenChange: setSheetOpen, children: /* @__PURE__ */ jsx(SheetContent, { className: "w-full overflow-y-auto border-slate-200 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b111a]/95 sm:max-w-xl", children: selectedCompany && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(SheetHeader, { className: "pb-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 pt-4", children: [
        /* @__PURE__ */ jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/20", children: selectedCompany.name?.charAt(0).toUpperCase() || "?" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(SheetTitle, { className: "text-left text-lg font-bold text-slate-900 dark:text-white", children: selectedCompany.name }),
          /* @__PURE__ */ jsx("p", { className: "text-left text-xs text-slate-500 dark:text-slate-400", children: selectedCompany.code || "No code" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-6 py-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: cn("text-xs font-semibold", statusStyles[selectedCompany.subscription_status || "active"]), children: [
            statusIcon[selectedCompany.subscription_status || "active"],
            /* @__PURE__ */ jsx("span", { className: "ml-1", children: titleCase(selectedCompany.subscription_status || "active") })
          ] }),
          /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: cn("text-xs font-semibold", planStyles(selectedCompany.subscription_plan)), children: [
            /* @__PURE__ */ jsx(Crown, { className: "mr-1 h-3 w-3" }),
            titleCase(selectedCompany.subscription_plan || "starter")
          ] }),
          /* @__PURE__ */ jsx(Badge, { variant: "outline", className: cn("text-xs font-semibold", statusStyles[selectedCompany.approvalStatus || "pending"]), children: titleCase(selectedCompany.approvalStatus || "pending") })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Contact" }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-sm", children: [
            selectedCompany.email && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-slate-700 dark:text-slate-200", children: [
              /* @__PURE__ */ jsx(Mail, { className: "h-4 w-4 text-slate-400" }),
              selectedCompany.email
            ] }),
            selectedCompany.phone && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-slate-700 dark:text-slate-200", children: [
              /* @__PURE__ */ jsx(Phone, { className: "h-4 w-4 text-slate-400" }),
              selectedCompany.phone
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Subscription" }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3 text-sm", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Amount" }),
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-slate-800 dark:text-slate-100", children: formatMoney(selectedCompany.billing_amount || 0) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Cycle" }),
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-slate-800 dark:text-slate-100", children: titleCase(selectedCompany.billing_cycle || "monthly") })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Next billing" }),
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-slate-800 dark:text-slate-100", children: formatDate(selectedCompany.next_billing_date) })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Trial ends" }),
              /* @__PURE__ */ jsx("p", { className: "font-semibold text-slate-800 dark:text-slate-100", children: formatDate(selectedCompany.trial_ends_at) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5", children: [
          /* @__PURE__ */ jsxs("h4", { className: "text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: [
            "Enabled Features (",
            selectedCompany.enabledModuleCount ?? 0,
            ")"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", children: selectedCompany.enabledModules?.map((m) => /* @__PURE__ */ jsx(
            Badge,
            {
              variant: "secondary",
              className: "bg-indigo-50 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
              children: titleCase(m)
            },
            m
          )) })
        ] }),
        selectedCompany.subscription_modules && selectedCompany.subscription_modules.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5", children: [
          /* @__PURE__ */ jsxs("h4", { className: "text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: [
            "Included Modules (",
            selectedCompany.subscription_modules.length,
            ")"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", children: selectedCompany.subscription_modules.map((m) => /* @__PURE__ */ jsx(
            Badge,
            {
              variant: "outline",
              className: "border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
              children: m
            },
            m
          )) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2 pt-2", children: [
          /* @__PURE__ */ jsx(
            Button,
            {
              variant: "outline",
              className: "flex-1 border-slate-200 bg-white/80 text-slate-700 backdrop-blur hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
              onClick: () => setSheetOpen(false),
              children: "Close"
            }
          ),
          selectedCompany.approvalStatus === "pending" && /* @__PURE__ */ jsxs(
            Button,
            {
              className: "flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700",
              onClick: () => {
                handleApprove(selectedCompany);
                setSheetOpen(false);
              },
              disabled: actionLoading === selectedCompany._id,
              children: [
                actionLoading === selectedCompany._id ? /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(CheckCircle2, { className: "mr-2 h-4 w-4" }),
                "Approve Tenant"
              ]
            }
          )
        ] })
      ] })
    ] }) }) })
  ] });
}
export {
  TenantsPage as default
};
