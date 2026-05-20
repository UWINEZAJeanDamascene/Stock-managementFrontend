import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { companyService } from "@/services";
import { useCompanyStore } from "@/store/companyStore";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/app/components/ui/sheet";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Activity,
  AlertTriangle,
  Ban,
  BellRing,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Crown,
  DatabaseZap,
  Eye,
  FileText,
  Gauge,
  Globe2,
  History,
  KeyRound,
  Layers3,
  LogIn,
  Loader2,
  Mail,
  Megaphone,
  Power,
  RadioTower,
  ReceiptText,
  PackageCheck,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  ServerCog,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  WalletCards,
  XCircle
} from "lucide-react";
const featureLabels = {
  inventory: "Inventory",
  sales: "Sales",
  purchases: "Purchases",
  finance: "Finance",
  payroll: "Payroll",
  reports: "Reports",
  projects: "Projects",
  fixed_assets: "Fixed assets",
  ai_assistant: "AI assistant",
  integrations: "Integrations"
};
const featureKeys = Object.keys(featureLabels);
function planStyles(plan) {
  const known = {
    starter: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-800",
    professional: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
    enterprise: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
    core_operations: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
    business_command: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800"
  };
  return known[plan] || "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700";
}
const statusStyles = {
  trialing: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  past_due: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800",
  suspended: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
};
function emptyFeatureAccess() {
  return featureKeys.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {});
}
const messageTemplates = [
  {
    key: "feature-release",
    label: "Feature Release",
    subject: "New features now live on StockManager",
    message: "We have released platform improvements that may affect your workspace. Please review your dashboard for the latest updates and feel free to reach out with any questions."
  },
  {
    key: "maintenance",
    label: "Scheduled Maintenance",
    subject: "Scheduled platform maintenance",
    message: "Our platform will undergo scheduled maintenance to improve performance and reliability. We expect brief downtime during the maintenance window. Thank you for your patience."
  },
  {
    key: "policy-update",
    label: "Policy Update",
    subject: "Important policy update",
    message: "We are updating our terms of service and privacy policy to reflect new features and compliance requirements. Please review the changes in your account settings."
  },
  {
    key: "payment-notice",
    label: "Payment Notice",
    subject: "Subscription payment reminder",
    message: "Your subscription payment is coming due. Please arrange payment to keep your access active and avoid any service interruption."
  },
  {
    key: "security-alert",
    label: "Security Alert",
    subject: "Security best practices reminder",
    message: "As part of our ongoing security efforts, we recommend reviewing your account security settings, enabling two-factor authentication, and ensuring your password is strong and unique."
  }
];
const emptyDashboard = {
  stats: {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    pastDue: 0,
    upcomingPayments: 0,
    monthlyRecurringRevenue: 0
  },
  companies: [],
  packageMatrix: []
};
function formatDate(value) {
  if (!value) return "Not scheduled";
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
function splitPlanList(value) {
  return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
}
function percent(value, total) {
  if (!total) return 0;
  return Math.min(100, Math.round(value / total * 100));
}
function daysUntil(value) {
  if (!value) return null;
  const today = /* @__PURE__ */ new Date();
  const target = new Date(value);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 864e5);
}
function normalizeCompany(company) {
  const rawFeatureAccess = company.feature_access || {};
  const subscriptionModules = company.subscription_modules || [];
  return {
    ...company,
    approvalStatus: company.approvalStatus || company.status || "pending",
    subscription_plan: company.subscription_plan || "starter",
    subscription_status: company.subscription_status || "active",
    billing_cycle: company.billing_cycle || "monthly",
    billing_amount: company.billing_amount || 0,
    feature_access: rawFeatureAccess,
    enabledModules: featureKeys.filter((key) => rawFeatureAccess[key]),
    enabledModuleCount: featureKeys.filter((key) => rawFeatureAccess[key]).length,
    subscription_modules: subscriptionModules
  };
}
function accentFromTone(tone) {
  if (tone.includes("cyan")) return "bg-cyan-500";
  if (tone.includes("emerald")) return "bg-emerald-500";
  if (tone.includes("amber")) return "bg-amber-500";
  if (tone.includes("rose")) return "bg-rose-500";
  if (tone.includes("red")) return "bg-red-500";
  if (tone.includes("sky")) return "bg-sky-500";
  if (tone.includes("violet")) return "bg-violet-500";
  if (tone.includes("indigo")) return "bg-indigo-500";
  if (tone.includes("teal")) return "bg-teal-500";
  return "bg-slate-500";
}
function StatTile({
  title,
  value,
  detail,
  icon,
  tone,
  barValue
}) {
  return /* @__PURE__ */ jsxs(Card, { className: "group overflow-hidden border-0 bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-900/70", children: [
    /* @__PURE__ */ jsx("div", { className: `h-1 w-full ${accentFromTone(tone)}` }),
    /* @__PURE__ */ jsxs(CardContent, { className: "p-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: title }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white", children: value }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: detail })
        ] }),
        /* @__PURE__ */ jsx("div", { className: `rounded-xl p-2.5 shadow-sm ring-1 ring-black/5 transition-transform group-hover:scale-105 ${tone}`, children: icon })
      ] }),
      typeof barValue === "number" && /* @__PURE__ */ jsx("div", { className: "mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", children: /* @__PURE__ */ jsx("div", { className: `h-full rounded-full ${accentFromTone(tone)}`, style: { width: `${barValue}%` } }) })
    ] })
  ] });
}
function OpsMetric({
  label,
  value,
  detail,
  icon
}) {
  return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 p-4 text-white shadow-sm backdrop-blur-sm transition-all hover:bg-white/10", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-white/60", children: label }),
      /* @__PURE__ */ jsx("span", { className: "rounded-lg bg-white/10 p-2 text-cyan-100 ring-1 ring-white/10", children: icon })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "mt-3 text-2xl font-bold tracking-tight tabular-nums", children: value }),
    /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-white/50", children: detail })
  ] });
}
function SignalBar({ label, value, tone }) {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("div", { className: `h-2 w-2 rounded-full ${tone}` }),
        /* @__PURE__ */ jsx("span", { className: "font-medium text-slate-700 dark:text-slate-300", children: label })
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "font-semibold text-slate-900 dark:text-white", children: [
        value,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", children: /* @__PURE__ */ jsx("div", { className: `h-full rounded-full ${tone}`, style: { width: `${value}%` } }) })
  ] });
}
function WorkstreamCard({
  title,
  value,
  detail,
  icon,
  tone
}) {
  return /* @__PURE__ */ jsx("div", { className: "group rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
    /* @__PURE__ */ jsx("div", { className: `rounded-xl p-2.5 shadow-sm ring-1 ring-black/5 transition-transform group-hover:scale-105 ${tone}`, children: icon }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-slate-500 dark:text-slate-400", children: title }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-2xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white", children: value }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: detail })
    ] })
  ] }) });
}
function EmptyPanel({ title, text }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/30", children: [
    /* @__PURE__ */ jsx("div", { className: "rounded-2xl bg-slate-100 p-4 dark:bg-slate-800", children: /* @__PURE__ */ jsx(Building2, { className: "h-8 w-8 text-slate-400" }) }),
    /* @__PURE__ */ jsx("p", { className: "mt-4 text-sm font-semibold text-slate-800 dark:text-slate-100", children: title }),
    /* @__PURE__ */ jsx("p", { className: "mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400", children: text })
  ] });
}
function CompanySummary({ company }) {
  const billingDelta = daysUntil(company.next_billing_date);
  const accessDepth = percent(company.enabledModuleCount, featureKeys.length);
  const needsAttention = company.subscription_status === "past_due" || company.subscription_status === "suspended";
  const lifecycleTone = company.approvalStatus === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800" : company.approvalStatus === "rejected" ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800" : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800";
  return /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsx("h3", { className: "truncate text-base font-semibold text-slate-950 dark:text-white", children: company.name }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(Badge, { variant: "outline", className: `rounded-md text-xs font-medium ${lifecycleTone}`, children: titleCase(company.approvalStatus) }),
        /* @__PURE__ */ jsx(Badge, { variant: "outline", className: `rounded-md text-xs font-medium ${planStyles(company.subscription_plan)}`, children: titleCase(company.subscription_plan) }),
        /* @__PURE__ */ jsx(Badge, { variant: "outline", className: `rounded-md text-xs font-medium ${statusStyles[company.subscription_status]}`, children: titleCase(company.subscription_status) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2 xl:grid-cols-4", children: [
      /* @__PURE__ */ jsxs("span", { className: "flex min-w-0 items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(Mail, { className: "h-3.5 w-3.5 shrink-0 text-slate-400" }),
        /* @__PURE__ */ jsx("span", { className: "truncate", children: company.email })
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(Users, { className: "h-3.5 w-3.5 text-slate-400" }),
        company.activeUsers || 0,
        "/",
        company.users || 0,
        " active"
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(CalendarClock, { className: "h-3.5 w-3.5 text-slate-400" }),
        billingDelta === null ? "Not scheduled" : billingDelta < 0 ? `${Math.abs(billingDelta)} days overdue` : `Bills in ${billingDelta} days`
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(KeyRound, { className: "h-3.5 w-3.5 text-slate-400" }),
        accessDepth,
        "% module coverage"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4 flex items-center gap-4", children: [
      /* @__PURE__ */ jsx("div", { className: "h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", children: /* @__PURE__ */ jsx(
        "div",
        {
          className: `h-full rounded-full ${needsAttention ? "bg-gradient-to-r from-red-500 to-amber-400" : "bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400"}`,
          style: { width: `${accessDepth}%` }
        }
      ) }),
      /* @__PURE__ */ jsxs("p", { className: "shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300", children: [
        formatMoney(company.billing_amount),
        " / ",
        titleCase(company.billing_cycle)
      ] })
    ] })
  ] });
}
function AccessModal({
  company,
  packageMatrix,
  isOpen,
  onClose,
  onSave,
  saving
}) {
  const availablePlans = useMemo(() => packageMatrix.map((pm) => ({ key: pm.plan, name: pm.name })), [packageMatrix]);
  const accessFromMatrix = (plan) => {
    const template = packageMatrix.find((pm) => pm.plan === plan);
    const included = new Set(template?.features || []);
    return featureKeys.reduce((acc, key) => {
      acc[key] = included.has(key);
      return acc;
    }, {});
  };
  const [form, setForm] = useState({
    subscription_plan: "starter",
    subscription_status: "active",
    billing_cycle: "monthly",
    billing_amount: 0,
    next_billing_date: "",
    platform_notes: "",
    feature_access: emptyFeatureAccess(),
    subscription_modules: []
  });
  useEffect(() => {
    if (!company) return;
    const planDefaultModules = packageMatrix.find((pm) => pm.plan === company.subscription_plan)?.modules || [];
    const companyModules = company.subscription_modules || [];
    const cleaned = companyModules.filter((m) => planDefaultModules.includes(m));
    const initialModules = cleaned.length > 0 ? cleaned : planDefaultModules;
    setForm({
      subscription_plan: company.subscription_plan,
      subscription_status: company.subscription_status,
      billing_cycle: company.billing_cycle,
      billing_amount: company.billing_amount,
      next_billing_date: company.next_billing_date ? company.next_billing_date.slice(0, 10) : "",
      platform_notes: company.platform_notes || "",
      feature_access: { ...accessFromMatrix(company.subscription_plan), ...company.feature_access || {} },
      subscription_modules: initialModules
    });
  }, [company, packageMatrix]);
  const visibleFeatureKeys = useMemo(() => {
    const keys = /* @__PURE__ */ new Set();
    const selectedPlanTemplate = packageMatrix.find((pm) => pm.plan === form.subscription_plan);
    (selectedPlanTemplate?.features || []).forEach((f) => keys.add(f));
    if (company?.feature_access) {
      Object.keys(company.feature_access).forEach((k) => {
        if (company.feature_access[k]) keys.add(k);
      });
    }
    return Array.from(keys).sort();
  }, [packageMatrix, company, form.subscription_plan]);
  const selectedPackageModules = useMemo(() => {
    return packageMatrix.find((pm) => pm.plan === form.subscription_plan)?.modules || [];
  }, [packageMatrix, form.subscription_plan]);
  const availableModules = useMemo(() => {
    const all = /* @__PURE__ */ new Set();
    packageMatrix.forEach((pm) => {
      (pm.modules || []).forEach((m) => all.add(m));
    });
    return Array.from(all);
  }, [packageMatrix]);
  const handleSave = async () => {
    if (!company) return;
    await onSave(company._id, {
      ...form,
      next_billing_date: form.next_billing_date || null
    });
  };
  return /* @__PURE__ */ jsx(Dialog, { open: isOpen, onOpenChange: (open) => !open && onClose(), children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[92vh] overflow-y-auto sm:max-w-3xl", children: [
    /* @__PURE__ */ jsxs(DialogHeader, { children: [
      /* @__PURE__ */ jsx(DialogTitle, { children: "Package and Module Control" }),
      /* @__PURE__ */ jsxs(DialogDescription, { children: [
        "Set the subscription package, payment status, next billing date, and exact module access for ",
        company?.name || "this company",
        "."
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Package" }),
        /* @__PURE__ */ jsxs(Select, { value: form.subscription_plan, onValueChange: (value) => setForm((prev) => {
          const newPlanTemplate = packageMatrix.find((pm) => pm.plan === value);
          return {
            ...prev,
            subscription_plan: value,
            feature_access: accessFromMatrix(value),
            subscription_modules: newPlanTemplate?.modules || prev.subscription_modules
          };
        }), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsx(SelectContent, { children: availablePlans.map((p) => /* @__PURE__ */ jsx(SelectItem, { value: p.key, children: p.name }, p.key)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Billing status" }),
        /* @__PURE__ */ jsxs(Select, { value: form.subscription_status, onValueChange: (value) => setForm((prev) => ({ ...prev, subscription_status: value })), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "active", children: "Active" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "past_due", children: "Past due" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "suspended", children: "Suspended" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "cancelled", children: "Cancelled" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Billing cycle" }),
        /* @__PURE__ */ jsxs(Select, { value: form.billing_cycle, onValueChange: (value) => setForm((prev) => ({ ...prev, billing_cycle: value })), children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "monthly", children: "Monthly" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "quarterly", children: "Quarterly" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "annual", children: "Annual" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Billing amount" }),
        /* @__PURE__ */ jsx(Input, { type: "number", min: "0", value: form.billing_amount, onChange: (event) => setForm((prev) => ({ ...prev, billing_amount: Number(event.target.value) })) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2 md:col-span-2", children: [
        /* @__PURE__ */ jsx(Label, { children: "Next billing date" }),
        /* @__PURE__ */ jsx(Input, { type: "date", value: form.next_billing_date, onChange: (event) => setForm((prev) => ({ ...prev, next_billing_date: event.target.value })) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4 dark:border-slate-800", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-3 flex flex-wrap items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Layers3, { className: "h-4 w-4 text-cyan-600" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Included Package Modules" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "rounded-md", children: [
          selectedPackageModules.length,
          " modules"
        ] }) })
      ] }),
      availableModules.length > 0 ? /* @__PURE__ */ jsx("div", { className: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3", children: availableModules.map((module) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200", children: [
        /* @__PURE__ */ jsx(
          Checkbox,
          {
            checked: form.subscription_modules.includes(module),
            onCheckedChange: (checked) => {
              setForm((prev) => {
                const set = new Set(prev.subscription_modules || []);
                if (checked) set.add(module);
                else set.delete(module);
                return { ...prev, subscription_modules: Array.from(set) };
              });
            }
          }
        ),
        /* @__PURE__ */ jsx("span", { children: module })
      ] }, module)) }) : /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "No display modules are configured for any package." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4 dark:border-slate-800", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-3 flex flex-wrap items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(SlidersHorizontal, { className: "h-4 w-4 text-cyan-600" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Access Gates" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => setForm((prev) => ({ ...prev, feature_access: accessFromMatrix(prev.subscription_plan) })), children: "Apply package template" }),
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => setForm((prev) => ({ ...prev, subscription_modules: selectedPackageModules })), children: "Apply package modules" }),
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => setForm((prev) => ({ ...prev, feature_access: featureKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {}) })), children: "Enable all" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: visibleFeatureKeys.map((key) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800", children: [
        /* @__PURE__ */ jsx(Label, { className: "text-sm", children: featureLabels[key] || titleCase(key) }),
        /* @__PURE__ */ jsx(
          Switch,
          {
            checked: form.feature_access[key],
            onCheckedChange: (checked) => setForm((prev) => ({
              ...prev,
              feature_access: { ...prev.feature_access, [key]: checked }
            }))
          }
        )
      ] }, key)) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsx(Label, { children: "Internal platform notes" }),
      /* @__PURE__ */ jsx(Textarea, { value: form.platform_notes, onChange: (event) => setForm((prev) => ({ ...prev, platform_notes: event.target.value })), rows: 3 })
    ] }),
    /* @__PURE__ */ jsxs(DialogFooter, { children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: onClose, children: "Cancel" }),
      /* @__PURE__ */ jsxs(Button, { onClick: handleSave, disabled: saving, children: [
        saving ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(ShieldCheck, { className: "h-4 w-4" }),
        "Save controls"
      ] })
    ] })
  ] }) });
}
function PlatformAdminPage() {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [rejectCompany, setRejectCompany] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reminderCompany, setReminderCompany] = useState(null);
  const [reminderMessage, setReminderMessage] = useState("Your subscription payment is coming due. Please arrange payment to keep your access active.");
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastAudience, setBroadcastAudience] = useState("all");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);
  const [broadcastSubject, setBroadcastSubject] = useState("Platform update from StockManager");
  const [broadcastMessage, setBroadcastMessage] = useState("We have released platform improvements that may affect your workspace. Please review your dashboard for the latest updates.");
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsPagination, setAuditLogsPagination] = useState({ page: 1, per_page: 25, total: 0, total_pages: 1 });
  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [userDrawerCompany, setUserDrawerCompany] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [companyUsersLoading, setCompanyUsersLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false);
  const [impersonateToken, setImpersonateToken] = useState("");
  const [impersonateUser, setImpersonateUser] = useState(null);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [passwordResetResult, setPasswordResetResult] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ key: "", name: "", description: "", features: "", modules: "", outcomes: "", badge: "", icon: "", featured: false, button_label: "", default_billing_amount: "0", default_billing_cycle: "monthly", is_active: true, sort_order: "0" });
  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await companyService.getPlatformDashboard();
      setDashboard({
        ...response.data,
        companies: response.data.companies.map(normalizeCompany)
      });
    } catch (loadError) {
      try {
        const response = await companyService.getPendingCompanies();
        const pending = response.data.map((company) => normalizeCompany(company));
        setDashboard({ ...emptyDashboard, stats: { ...emptyDashboard.stats, pending: pending.length, total: pending.length }, companies: pending });
        setError("Advanced platform controls are not available yet, so the pending approval queue is shown.");
      } catch {
        setError("Failed to load platform administration data.");
      }
      console.error(loadError);
    } finally {
      setIsLoading(false);
    }
  };
  const loadAuditLogs = async (page = 1) => {
    try {
      setAuditLogsLoading(true);
      const response = await companyService.getPlatformAuditLogs({ page, per_page: 25 });
      if (response.success) {
        setAuditLogs(response.data);
        setAuditLogsPagination(response.pagination);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLogsLoading(false);
    }
  };
  const loadCompanyUsers = async (companyId) => {
    try {
      setCompanyUsersLoading(true);
      const response = await companyService.getCompanyUsers(companyId, { limit: 50 });
      if (response.success) {
        setCompanyUsers(response.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCompanyUsersLoading(false);
    }
  };
  const handleImpersonate = async (companyId, userId, userName, userEmail) => {
    try {
      setActionLoading(userId);
      const response = await companyService.impersonateUser(companyId, userId);
      if (response.success) {
        setImpersonateToken(response.data.access_token);
        setImpersonateUser({ name: userName, email: userEmail });
        setImpersonateDialogOpen(true);
      }
    } catch (e) {
      setError("Failed to impersonate user.");
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };
  const handleForcePasswordReset = async (companyId, userId) => {
    try {
      setActionLoading(userId);
      const response = await companyService.forcePasswordReset(companyId, userId);
      if (response.success) {
        setPasswordResetResult(response.data);
        setPasswordResetDialogOpen(true);
        flashSuccess("Password reset successfully. Temporary password generated.");
      }
    } catch (e) {
      setError("Failed to reset password.");
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };
  const loadSubscriptionPlans = async () => {
    try {
      setPlansLoading(true);
      const response = await companyService.getSubscriptionPlans();
      if (response.success) {
        setSubscriptionPlans(response.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPlansLoading(false);
    }
  };
  const handleSavePlan = async () => {
    try {
      setActionLoading("plan");
      const payload = {
        key: planForm.key,
        name: planForm.name,
        description: planForm.description,
        features: splitPlanList(planForm.features),
        modules: splitPlanList(planForm.modules),
        outcomes: splitPlanList(planForm.outcomes),
        badge: planForm.badge,
        icon: planForm.icon,
        featured: planForm.featured,
        button_label: planForm.button_label,
        default_billing_amount: Number(planForm.default_billing_amount) || 0,
        default_billing_cycle: planForm.default_billing_cycle,
        is_active: planForm.is_active,
        sort_order: Number(planForm.sort_order) || 0
      };
      if (editingPlan) {
        const { key: _, ...updatePayload } = payload;
        await companyService.updateSubscriptionPlan(editingPlan, updatePayload);
        flashSuccess("Plan updated successfully.");
      } else {
        await companyService.createSubscriptionPlan(payload);
        flashSuccess("Plan created successfully.");
      }
      setPlanDialogOpen(false);
      setEditingPlan(null);
      setPlanForm({ key: "", name: "", description: "", features: "", modules: "", outcomes: "", badge: "", icon: "", featured: false, button_label: "", default_billing_amount: "0", default_billing_cycle: "monthly", is_active: true, sort_order: "0" });
      await loadSubscriptionPlans();
    } catch (e) {
      setError("Failed to save plan.");
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };
  const handleDeletePlan = async (key) => {
    if (!confirm(`Delete plan "${key}"? This cannot be undone.`)) return;
    try {
      setActionLoading(key);
      await companyService.deleteSubscriptionPlan(key);
      flashSuccess("Plan deleted.");
      await loadSubscriptionPlans();
    } catch (e) {
      setError("Failed to delete plan.");
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };
  const openPlanDialog = (plan) => {
    if (plan) {
      setEditingPlan(plan.key);
      setPlanForm({
        key: plan.key,
        name: plan.name,
        description: plan.description,
        features: plan.features.join("\n"),
        modules: (plan.modules || []).join("\n"),
        outcomes: (plan.outcomes || []).join("\n"),
        badge: plan.badge || "",
        icon: plan.icon || "",
        featured: plan.featured || false,
        button_label: plan.button_label || "",
        default_billing_amount: String(plan.default_billing_amount),
        default_billing_cycle: plan.default_billing_cycle,
        is_active: plan.is_active,
        sort_order: String(plan.sort_order)
      });
    } else {
      setEditingPlan(null);
      setPlanForm({ key: "", name: "", description: "", features: "", modules: "", outcomes: "", badge: "", icon: "", featured: false, button_label: "", default_billing_amount: "0", default_billing_cycle: "monthly", is_active: true, sort_order: "0" });
    }
    setPlanDialogOpen(true);
  };
  const loadBroadcastHistory = async () => {
    try {
      const response = await companyService.getPlatformAuditLogs({ action: "company.platform_broadcast_sent", per_page: 20 });
      if (response.success) {
        setBroadcastHistory(response.data);
      }
    } catch (e) {
      console.error(e);
    }
  };
  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await companyService.getPlatformAnalytics();
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyticsLoading(false);
    }
  };
  useEffect(() => {
    loadDashboard();
    loadAuditLogs(1);
    loadBroadcastHistory();
    loadAnalytics();
    loadSubscriptionPlans();
  }, []);
  const companies = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return dashboard.companies;
    return dashboard.companies.filter(
      (company) => [company.name, company.email, company.code, company.tin].some((value) => value?.toLowerCase().includes(term))
    );
  }, [dashboard.companies, search]);
  const pendingCompanies = companies.filter((company) => company.approvalStatus === "pending");
  const approvedCompanies = companies.filter((company) => company.approvalStatus === "approved");
  const attentionCompanies = companies.filter((company) => company.subscription_status === "past_due" || company.subscription_status === "suspended");
  const starterCompanies = companies.filter((company) => company.subscription_plan === "starter");
  const enterpriseCompanies = companies.filter((company) => company.subscription_plan === "enterprise");
  const totalUsers = companies.reduce((sum, company) => sum + (company.users || 0), 0);
  const activeUsers = companies.reduce((sum, company) => sum + (company.activeUsers || 0), 0);
  const totalModuleSlots = Math.max(1, companies.length * featureKeys.length);
  const assignedModules = companies.reduce((sum, company) => sum + company.enabledModuleCount, 0);
  const approvalRate = percent(approvedCompanies.length, companies.length);
  const moduleCoverage = percent(assignedModules, totalModuleSlots);
  const userActivityRate = percent(activeUsers, totalUsers);
  const revenueAtRisk = attentionCompanies.reduce((sum, company) => sum + (company.billing_amount || 0), 0);
  const upcomingRenewals = companies.filter((company) => {
    const delta = daysUntil(company.next_billing_date);
    return delta !== null && delta >= 0 && delta <= 14;
  }).sort((a, b) => (daysUntil(a.next_billing_date) || 0) - (daysUntil(b.next_billing_date) || 0)).slice(0, 4);
  const newestCompanies = [...companies].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 4);
  const selectedCompanies = dashboard.companies.filter((company) => selectedCompanyIds.includes(company._id));
  const selectableCompanies = companies.filter((company) => company.approvalStatus === "approved");
  const replaceCompany = (updated) => {
    setDashboard((prev) => ({
      ...prev,
      companies: prev.companies.map((company) => company._id === updated._id ? normalizeCompany(updated) : company)
    }));
    try {
      const current = useCompanyStore.getState().company;
      if (current && current._id === updated._id) {
        useCompanyStore.getState().setCompany(normalizeCompany(updated));
      }
    } catch (e) {
    }
  };
  const removeCompanyFromQueue = (companyId, status) => {
    setDashboard((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        pending: Math.max(0, prev.stats.pending - 1),
        [status]: prev.stats[status] + 1
      },
      companies: prev.companies.map(
        (company) => company._id === companyId ? { ...company, approvalStatus: status, isActive: status === "approved" } : company
      )
    }));
  };
  const flashSuccess = (message) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 3500);
  };
  const toggleCompanySelection = (companyId, checked) => {
    setSelectedCompanyIds((prev) => {
      if (checked) return prev.includes(companyId) ? prev : [...prev, companyId];
      return prev.filter((id) => id !== companyId);
    });
  };
  const handleQuickStatus = async (company, status) => {
    try {
      setActionLoading(`${company._id}:${status}`);
      const response = await companyService.updatePlatformAccess(company._id, {
        subscription_status: status,
        subscription_plan: company.subscription_plan,
        billing_cycle: company.billing_cycle,
        billing_amount: company.billing_amount,
        next_billing_date: company.next_billing_date,
        feature_access: company.feature_access,
        platform_notes: company.platform_notes
      });
      replaceCompany(response.data);
      flashSuccess(`${company.name} is now ${titleCase(status)}.`);
    } catch (statusError) {
      setError("Failed to update company status.");
      console.error(statusError);
    } finally {
      setActionLoading(null);
    }
  };
  const handleApprove = async (company) => {
    try {
      setActionLoading(company._id);
      await companyService.approveCompany(company._id);
      removeCompanyFromQueue(company._id, "approved");
      flashSuccess(`${company.name} was approved.`);
    } catch (approveError) {
      setError("Failed to approve company.");
      console.error(approveError);
    } finally {
      setActionLoading(null);
    }
  };
  const handleReject = async () => {
    if (!rejectCompany) return;
    try {
      setActionLoading(rejectCompany._id);
      await companyService.rejectCompany(rejectCompany._id, rejectReason);
      removeCompanyFromQueue(rejectCompany._id, "rejected");
      setRejectCompany(null);
      setRejectReason("");
      flashSuccess(`${rejectCompany.name} was rejected.`);
    } catch (rejectError) {
      setError("Failed to reject company.");
      console.error(rejectError);
    } finally {
      setActionLoading(null);
    }
  };
  const handleSaveAccess = async (companyId, data) => {
    try {
      setActionLoading(companyId);
      const response = await companyService.updatePlatformAccess(companyId, data);
      replaceCompany(response.data);
      setSelectedCompany(null);
      flashSuccess("Package and module access updated.");
    } catch (saveError) {
      setError("Failed to update platform controls.");
      console.error(saveError);
    } finally {
      setActionLoading(null);
    }
  };
  const handleReminder = async () => {
    if (!reminderCompany) return;
    try {
      setActionLoading(reminderCompany._id);
      const response = await companyService.sendPaymentReminder(reminderCompany._id, {
        subject: `Payment reminder for ${reminderCompany.name}`,
        message: reminderMessage
      });
      replaceCompany(response.data.company);
      setReminderCompany(null);
      flashSuccess(response.data.sent ? "Payment reminder sent." : "Reminder recorded, but email delivery is not configured.");
    } catch (reminderError) {
      setError("Failed to send payment reminder.");
      console.error(reminderError);
    } finally {
      setActionLoading(null);
    }
  };
  const handleBroadcast = async () => {
    if (broadcastAudience === "selected" && !selectedCompanyIds.length) {
      setError("Select at least one company before sending a targeted platform update.");
      return;
    }
    try {
      setActionLoading("broadcast");
      const response = await companyService.broadcastPlatformUpdate({
        subject: broadcastSubject,
        message: broadcastMessage,
        companyIds: broadcastAudience === "selected" ? selectedCompanyIds : void 0
      });
      setBroadcastOpen(false);
      flashSuccess(response.data.sent ? `Platform update sent to ${response.data.recipients} companies.` : "Broadcast recorded, but no email recipients were available.");
      await loadDashboard();
    } catch (broadcastError) {
      setError("Failed to send platform update.");
      console.error(broadcastError);
    } finally {
      setActionLoading(null);
    }
  };
  const renderCompanyRow = (company, showApproval = false) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950 sm:p-5", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 gap-3", children: [
        /* @__PURE__ */ jsx(
          Checkbox,
          {
            checked: selectedCompanyIds.includes(company._id),
            onCheckedChange: (checked) => toggleCompanySelection(company._id, checked === true),
            "aria-label": `Select ${company.name}`,
            className: "mt-1"
          }
        ),
        /* @__PURE__ */ jsx(CompanySummary, { company })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center 2xl:justify-end", children: [
        /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", onClick: () => {
          setUserDrawerCompany(company);
          loadCompanyUsers(company._id);
          setUserDrawerOpen(true);
        }, children: [
          /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4" }),
          "Users"
        ] }),
        /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", onClick: () => setSelectedCompany(company), children: [
          /* @__PURE__ */ jsx(SlidersHorizontal, { className: "h-4 w-4" }),
          "Controls"
        ] }),
        /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200", onClick: () => setReminderCompany(company), children: [
          /* @__PURE__ */ jsx(BellRing, { className: "h-4 w-4" }),
          "Reminder"
        ] }),
        showApproval && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => handleApprove(company), disabled: actionLoading === company._id, children: [
            actionLoading === company._id ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4" }),
            "Approve"
          ] }),
          /* @__PURE__ */ jsxs(Button, { variant: "destructive", size: "sm", onClick: () => setRejectCompany(company), disabled: actionLoading === company._id, children: [
            /* @__PURE__ */ jsx(XCircle, { className: "h-4 w-4" }),
            "Reject"
          ] })
        ] }),
        company.subscription_status !== "active" && company.approvalStatus === "approved" && /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200", onClick: () => handleQuickStatus(company, "active"), disabled: actionLoading === `${company._id}:active`, children: [
          actionLoading === `${company._id}:active` ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Power, { className: "h-4 w-4" }),
          "Activate"
        ] }),
        !["suspended", "cancelled"].includes(company.subscription_status) && /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200", onClick: () => handleQuickStatus(company, "suspended"), disabled: actionLoading === `${company._id}:suspended`, children: [
          actionLoading === `${company._id}:suspended` ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Ban, { className: "h-4 w-4" }),
          "Suspend"
        ] }),
        company.subscription_status !== "cancelled" && /* @__PURE__ */ jsxs(Button, { variant: "destructive", size: "sm", onClick: () => handleQuickStatus(company, "cancelled"), disabled: actionLoading === `${company._id}:cancelled`, children: [
          actionLoading === `${company._id}:cancelled` ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(XCircle, { className: "h-4 w-4" }),
          "Cancel"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
        company.enabledModules.slice(0, 8).map((feature) => /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200", children: featureLabels[feature] }, feature)),
        company.enabledModuleCount > 8 && /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "rounded-md text-xs", children: [
          "+",
          company.enabledModuleCount - 8,
          " more"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2 text-center text-xs lg:shrink-0", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900", children: [
          /* @__PURE__ */ jsx("p", { className: "font-semibold text-slate-950 dark:text-white", children: company.code || "N/A" }),
          /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400", children: "Code" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900", children: [
          /* @__PURE__ */ jsx("p", { className: "font-semibold text-slate-950 dark:text-white", children: company.tin || "N/A" }),
          /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400", children: "TIN" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900", children: [
          /* @__PURE__ */ jsx("p", { className: "font-semibold text-slate-950 dark:text-white", children: formatDate(company.createdAt) }),
          /* @__PURE__ */ jsx("p", { className: "text-slate-500 dark:text-slate-400", children: "Joined" })
        ] })
      ] })
    ] })
  ] }, company._id);
  return /* @__PURE__ */ jsxs("div", { className: "min-h-full text-slate-950 dark:text-white", children: [
    /* @__PURE__ */ jsxs("div", { className: "w-full space-y-5", children: [
      /* @__PURE__ */ jsx("div", { className: "overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg dark:border-slate-800", children: /* @__PURE__ */ jsxs("div", { className: "relative grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] lg:p-6", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[linear-gradient(135deg,_rgba(45,212,191,0.18),_transparent_42%),linear-gradient(315deg,_rgba(16,185,129,0.16),_transparent_46%)]" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-200 backdrop-blur-sm", children: [
            /* @__PURE__ */ jsx(Crown, { className: "h-3.5 w-3.5" }),
            "Platform Command Center"
          ] }),
          /* @__PURE__ */ jsx("h1", { className: "max-w-4xl text-2xl font-bold tracking-tight text-white sm:text-3xl", children: "Platform Administration" }),
          /* @__PURE__ */ jsx("p", { className: "mt-3 max-w-3xl text-sm leading-relaxed text-slate-300", children: "Run the tenant estate like a real operations desk: onboard companies, govern modules, watch subscription risk, coordinate payments, and broadcast platform changes from one decisive workspace." }),
          /* @__PURE__ */ jsxs("div", { className: "mt-5 flex flex-col gap-3 sm:flex-row", children: [
            /* @__PURE__ */ jsxs(Button, { className: "bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold gap-2", onClick: () => setBroadcastOpen(true), children: [
              /* @__PURE__ */ jsx(Megaphone, { className: "h-4 w-4" }),
              "Broadcast update"
            ] }),
            /* @__PURE__ */ jsxs(Button, { variant: "outline", className: "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white gap-2 backdrop-blur-sm", onClick: loadDashboard, disabled: isLoading, children: [
              /* @__PURE__ */ jsx(RefreshCw, { className: `h-4 w-4 ${isLoading ? "animate-spin" : ""}` }),
              "Refresh intelligence"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative grid gap-3 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsx(OpsMetric, { label: "Estate health", value: `${approvalRate}%`, detail: `${approvedCompanies.length} approved tenants`, icon: /* @__PURE__ */ jsx(Gauge, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsx(OpsMetric, { label: "Revenue watch", value: formatMoney(revenueAtRisk), detail: `${attentionCompanies.length} accounts need action`, icon: /* @__PURE__ */ jsx(WalletCards, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsx(OpsMetric, { label: "Active seats", value: activeUsers, detail: `${userActivityRate}% of known users active`, icon: /* @__PURE__ */ jsx(Users, { className: "h-4 w-4" }) }),
          /* @__PURE__ */ jsx(OpsMetric, { label: "Module fabric", value: `${moduleCoverage}%`, detail: `${assignedModules} feature grants live`, icon: /* @__PURE__ */ jsx(DatabaseZap, { className: "h-4 w-4" }) })
        ] })
      ] }) }),
      successMessage && /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200", children: [
        /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 shrink-0" }),
        successMessage
      ] }),
      error && /* @__PURE__ */ jsxs("div", { className: "mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200", children: [
        /* @__PURE__ */ jsx(AlertTriangle, { className: "h-4 w-4 shrink-0" }),
        error
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-4 sm:grid-cols-2 2xl:grid-cols-4", children: isLoading ? Array.from({ length: 4 }).map((_, index) => /* @__PURE__ */ jsx(Skeleton, { className: "h-32 rounded-xl" }, index)) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(StatTile, { title: "Companies", value: dashboard.stats.total, detail: `${dashboard.stats.pending} awaiting registration review`, icon: /* @__PURE__ */ jsx(Building2, { className: "h-5 w-5" }), tone: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200", barValue: approvalRate }),
        /* @__PURE__ */ jsx(StatTile, { title: "MRR", value: formatMoney(dashboard.stats.monthlyRecurringRevenue), detail: "Normalized across billing cycles", icon: /* @__PURE__ */ jsx(CreditCard, { className: "h-5 w-5" }), tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200", barValue: Math.min(100, dashboard.stats.monthlyRecurringRevenue ? 76 : 0) }),
        /* @__PURE__ */ jsx(StatTile, { title: "Payment Watch", value: dashboard.stats.upcomingPayments, detail: `${dashboard.stats.pastDue} past due or suspended`, icon: /* @__PURE__ */ jsx(CalendarClock, { className: "h-5 w-5" }), tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200", barValue: percent(dashboard.stats.upcomingPayments, Math.max(1, companies.length)) }),
        /* @__PURE__ */ jsx(StatTile, { title: "Governance", value: featureKeys.length, detail: "Modules controlled per company", icon: /* @__PURE__ */ jsx(PackageCheck, { className: "h-5 w-5" }), tone: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200", barValue: moduleCoverage })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 2xl:grid-cols-[1.25fr_0.75fr]", children: [
        /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
          /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold text-slate-950 dark:text-white", children: "Operational Signals" }),
              /* @__PURE__ */ jsx(CardDescription, { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: "A quick read on platform workload, adoption, and access quality." })
            ] }),
            /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "border-cyan-200/60 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200", children: [
              /* @__PURE__ */ jsx(RadioTower, { className: "mr-1 h-3.5 w-3.5" }),
              "Live controls"
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs(CardContent, { className: "space-y-6", children: [
            /* @__PURE__ */ jsx(SignalBar, { label: "Approval throughput", value: approvalRate, tone: "bg-cyan-500" }),
            /* @__PURE__ */ jsx(SignalBar, { label: "Seat activation", value: userActivityRate, tone: "bg-emerald-500" }),
            /* @__PURE__ */ jsx(SignalBar, { label: "Module coverage", value: moduleCoverage, tone: "bg-amber-500" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-3 2xl:grid-cols-1", children: [
          /* @__PURE__ */ jsx(WorkstreamCard, { title: "Core Operations", value: starterCompanies.length, detail: "Starter plan accounts", icon: /* @__PURE__ */ jsx(Sparkles, { className: "h-5 w-5" }), tone: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200" }),
          /* @__PURE__ */ jsx(WorkstreamCard, { title: "Enterprise", value: enterpriseCompanies.length, detail: "High-touch accounts", icon: /* @__PURE__ */ jsx(Globe2, { className: "h-5 w-5" }), tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" }),
          /* @__PURE__ */ jsx(WorkstreamCard, { title: "Risk Queue", value: attentionCompanies.length, detail: "Billing or access intervention", icon: /* @__PURE__ */ jsx(AlertTriangle, { className: "h-5 w-5" }), tone: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-center md:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative w-full md:max-w-md", children: [
          /* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" }),
          /* @__PURE__ */ jsx(Input, { value: search, onChange: (event) => setSearch(event.target.value), className: "rounded-lg border-slate-200 bg-white pl-9 shadow-sm dark:border-slate-800 dark:bg-slate-950", placeholder: "Search company, email, code, or TIN" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400", children: [
          /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium dark:border-slate-800 dark:bg-slate-950", children: [
            /* @__PURE__ */ jsx(Activity, { className: "h-3.5 w-3.5 text-emerald-500" }),
            approvedCompanies.length,
            " active portfolio"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium dark:border-slate-800 dark:bg-slate-950", children: [
            /* @__PURE__ */ jsx(ReceiptText, { className: "h-3.5 w-3.5 text-amber-500" }),
            upcomingRenewals.length,
            " renewals in 14 days"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium dark:border-slate-800 dark:bg-slate-950", children: [
            /* @__PURE__ */ jsx(ServerCog, { className: "h-3.5 w-3.5 text-sky-500" }),
            dashboard.packageMatrix.length || 4,
            " packages"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm dark:from-slate-900 dark:to-slate-950 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("p", { className: "flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white", children: [
            /* @__PURE__ */ jsx(Megaphone, { className: "h-4 w-4 text-cyan-600" }),
            "Selected Communication Desk"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: selectedCompanyIds.length ? `${selectedCompanyIds.length} companies selected: ${selectedCompanies.slice(0, 3).map((company) => company.name).join(", ")}${selectedCompanies.length > 3 ? "..." : ""}` : "Select companies from any list, then send a targeted platform message." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "bg-white dark:bg-slate-950", onClick: () => setSelectedCompanyIds(selectableCompanies.map((company) => company._id)), children: [
            /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4" }),
            "Select approved"
          ] }),
          /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "bg-white dark:bg-slate-950", onClick: () => setSelectedCompanyIds([]), disabled: !selectedCompanyIds.length, children: [
            /* @__PURE__ */ jsx(XCircle, { className: "h-4 w-4" }),
            "Clear"
          ] }),
          /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => {
            setBroadcastAudience(selectedCompanyIds.length ? "selected" : "all");
            setBroadcastOpen(true);
          }, children: [
            /* @__PURE__ */ jsx(Megaphone, { className: "h-4 w-4" }),
            "Message ",
            selectedCompanyIds.length ? "selected" : "all"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Tabs, { defaultValue: "overview", className: "gap-4", children: [
        /* @__PURE__ */ jsxs(TabsList, { className: "h-auto w-full max-w-full justify-start gap-1 overflow-x-auto rounded-xl border border-slate-200/60 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:flex-wrap", children: [
          /* @__PURE__ */ jsx(TabsTrigger, { value: "overview", className: "shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900", children: "Overview" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "requests", className: "shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900", children: "Requests" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "portfolio", className: "shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900", children: "Portfolio" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "billing", className: "shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900", children: "Billing Watch" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "packages", className: "shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900", children: "Packages" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "activity", className: "shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900", children: "Activity" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "analytics", className: "shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900", children: "Analytics" }),
          /* @__PURE__ */ jsx(TabsTrigger, { value: "plans", className: "shrink-0 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900", children: "Plans" })
        ] }),
        /* @__PURE__ */ jsx(TabsContent, { value: "overview", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]", children: [
          /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
            /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white", children: [
              /* @__PURE__ */ jsx(RadioTower, { className: "h-5 w-5 text-cyan-600" }),
              "Control Room Workboard"
            ] }) }),
            /* @__PURE__ */ jsx(CardContent, { className: "grid gap-4 md:grid-cols-2", children: isLoading ? Array.from({ length: 4 }).map((_, index) => /* @__PURE__ */ jsx(Skeleton, { className: "h-28 rounded-xl" }, index)) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(WorkstreamCard, { title: "Registration Intake", value: pendingCompanies.length, detail: "Companies waiting for decision", icon: /* @__PURE__ */ jsx(ShieldCheck, { className: "h-5 w-5" }), tone: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200" }),
              /* @__PURE__ */ jsx(WorkstreamCard, { title: "Billing Escalation", value: attentionCompanies.length, detail: `${formatMoney(revenueAtRisk)} in watched subscriptions`, icon: /* @__PURE__ */ jsx(AlertTriangle, { className: "h-5 w-5" }), tone: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200" }),
              /* @__PURE__ */ jsx(WorkstreamCard, { title: "Module Governance", value: `${moduleCoverage}%`, detail: `${assignedModules} enabled module grants`, icon: /* @__PURE__ */ jsx(Layers3, { className: "h-5 w-5" }), tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200" }),
              /* @__PURE__ */ jsx(WorkstreamCard, { title: "Tenant Adoption", value: `${activeUsers}/${totalUsers || 0}`, detail: "Active seats across the estate", icon: /* @__PURE__ */ jsx(Users, { className: "h-5 w-5" }), tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid gap-4 lg:grid-cols-2 2xl:grid-cols-1", children: [
            /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white", children: [
                /* @__PURE__ */ jsx(CalendarClock, { className: "h-5 w-5 text-amber-600" }),
                "Renewals Next 14 Days"
              ] }) }),
              /* @__PURE__ */ jsx(CardContent, { className: "space-y-3", children: isLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-32 rounded-xl" }) : upcomingRenewals.length ? upcomingRenewals.map((company) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30", children: [
                /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                  /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-semibold text-slate-950 dark:text-white", children: company.name }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: formatDate(company.next_billing_date) })
                ] }),
                /* @__PURE__ */ jsx(Badge, { variant: "outline", className: statusStyles[company.subscription_status], children: formatMoney(company.billing_amount) })
              ] }, company._id)) : /* @__PURE__ */ jsx(EmptyPanel, { title: "No near renewals", text: "Renewals due in the next two weeks will surface here for proactive follow-up." }) })
            ] }),
            /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white", children: [
                /* @__PURE__ */ jsx(Building2, { className: "h-5 w-5 text-emerald-600" }),
                "Latest Companies"
              ] }) }),
              /* @__PURE__ */ jsx(CardContent, { className: "space-y-3", children: isLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-32 rounded-xl" }) : newestCompanies.length ? newestCompanies.map((company) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30", children: [
                /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                  /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-semibold text-slate-950 dark:text-white", children: company.name }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: company.email })
                ] }),
                /* @__PURE__ */ jsx(Badge, { variant: "outline", className: planStyles(company.subscription_plan), children: titleCase(company.subscription_plan) })
              ] }, company._id)) : /* @__PURE__ */ jsx(EmptyPanel, { title: "No company activity", text: "New tenant records will appear here as registrations and approvals happen." }) })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "requests", children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(ShieldCheck, { className: "h-5 w-5 text-cyan-600" }),
            /* @__PURE__ */ jsx("h3", { className: "text-base font-semibold text-slate-950 dark:text-white", children: "Company Registration Queue" })
          ] }),
          isLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-64 rounded-xl" }) : pendingCompanies.length ? pendingCompanies.map((company) => renderCompanyRow(company, true)) : /* @__PURE__ */ jsx(EmptyPanel, { title: "No pending registrations", text: "New public company registrations will appear here for approval, package assignment, and onboarding review." })
        ] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "portfolio", children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Building2, { className: "h-5 w-5 text-emerald-600" }),
            /* @__PURE__ */ jsx("h3", { className: "text-base font-semibold text-slate-950 dark:text-white", children: "Company Portfolio" })
          ] }),
          isLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-64 rounded-xl" }) : companies.length ? companies.map((company) => renderCompanyRow(company)) : /* @__PURE__ */ jsx(EmptyPanel, { title: "No companies found", text: "Adjust the search term or refresh the dashboard to load the company portfolio." })
        ] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "billing", children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(CreditCard, { className: "h-5 w-5 text-amber-600" }),
            /* @__PURE__ */ jsx("h3", { className: "text-base font-semibold text-slate-950 dark:text-white", children: "Billing and Renewal Watch" })
          ] }),
          isLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-64 rounded-xl" }) : attentionCompanies.length ? attentionCompanies.map((company) => renderCompanyRow(company)) : /* @__PURE__ */ jsx(EmptyPanel, { title: "No billing issues", text: "Past due and suspended accounts will appear here so the platform team can intervene quickly." })
        ] }) }),
        /* @__PURE__ */ jsxs(TabsContent, { value: "packages", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 shadow-sm dark:from-slate-900 dark:to-slate-950 dark:border-slate-800", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-slate-950 dark:text-white", children: "Company Package Builder" }),
                /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: "Packages are templates; the real contract is configured per company with plan, billing, renewal date, notes, and exact module grants." })
              ] }),
              /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "w-fit border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200", children: [
                featureKeys.length,
                " platform modules available"
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3", children: companies.slice(0, 6).map((company) => /* @__PURE__ */ jsx("div", { className: "group rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-semibold text-slate-950 dark:text-white", children: company.name }),
                /* @__PURE__ */ jsxs("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: [
                  company.enabledModuleCount,
                  "/",
                  featureKeys.length,
                  " modules, ",
                  formatMoney(company.billing_amount)
                ] })
              ] }),
              /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", className: "shrink-0", onClick: () => setSelectedCompany(company), children: [
                /* @__PURE__ */ jsx(SlidersHorizontal, { className: "h-4 w-4" }),
                "Configure"
              ] })
            ] }) }, company._id)) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "grid gap-4 sm:grid-cols-2 2xl:grid-cols-4", children: subscriptionPlans.length > 0 ? subscriptionPlans.map((plan) => {
            const planCompanies = dashboard.companies.filter((company) => company.subscription_plan === plan.key);
            return /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx("div", { className: "h-1 bg-emerald-500" }),
              /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center justify-between gap-2 text-base font-semibold text-slate-950 dark:text-white", children: [
                plan.name,
                /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "rounded-md border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200", children: planCompanies.length })
              ] }) }),
              /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                (plan.modules || []).map((module) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300", children: [
                  /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-emerald-500" }),
                  module
                ] }, module)),
                plan.outcomes && plan.outcomes.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-900", children: [
                  /* @__PURE__ */ jsx("p", { className: "mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Best outcome" }),
                  plan.outcomes.map((outcome) => /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-700 dark:text-slate-300", children: outcome }, outcome))
                ] })
              ] }) })
            ] }, plan.key);
          }) : /* @__PURE__ */ jsx("div", { className: "col-span-full py-10 text-center text-sm text-slate-500 dark:text-slate-400", children: "No subscription plans found. Create plans in the Plans tab." }) })
        ] }),
        /* @__PURE__ */ jsx(TabsContent, { value: "activity", children: /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
          /* @__PURE__ */ jsx(CardHeader, { className: "pb-2", children: /* @__PURE__ */ jsxs(CardTitle, { className: "flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white", children: [
            /* @__PURE__ */ jsx(ScrollText, { className: "h-5 w-5 text-cyan-600" }),
            "Platform Activity & Audit Trail"
          ] }) }),
          /* @__PURE__ */ jsx(CardContent, { children: auditLogsLoading ? /* @__PURE__ */ jsx("div", { className: "space-y-3", children: Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-12 rounded-xl" }, i)) }) : auditLogs.length === 0 ? /* @__PURE__ */ jsx(EmptyPanel, { title: "No activity recorded", text: "Platform audit logs will appear here once actions are taken." }) : /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800", children: [
              /* @__PURE__ */ jsxs("div", { className: "grid min-w-[680px] grid-cols-[minmax(260px,1fr)_120px_100px_140px] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400", children: [
                /* @__PURE__ */ jsx("span", { children: "Action" }),
                /* @__PURE__ */ jsx("span", { children: "Entity" }),
                /* @__PURE__ */ jsx("span", { children: "Status" }),
                /* @__PURE__ */ jsx("span", { className: "text-right", children: "Time" })
              ] }),
              auditLogs.map((log) => /* @__PURE__ */ jsxs("div", { className: "grid min-w-[680px] grid-cols-[minmax(260px,1fr)_120px_100px_140px] gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-0 dark:border-slate-800/60", children: [
                /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
                  /* @__PURE__ */ jsx("p", { className: "truncate font-medium text-slate-900 dark:text-white", children: log.action }),
                  /* @__PURE__ */ jsxs("p", { className: "truncate text-xs text-slate-500 dark:text-slate-400", children: [
                    log.user_id?.name || "System",
                    log.company_id ? ` \xB7 ${log.company_id.name}` : ""
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "flex items-center", children: /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "rounded-md text-xs", children: log.entity_type }) }),
                /* @__PURE__ */ jsx("div", { className: "flex items-center", children: /* @__PURE__ */ jsx(Badge, { variant: log.status === "success" ? "default" : "destructive", className: "rounded-md text-xs", children: log.status }) }),
                /* @__PURE__ */ jsx("div", { className: "flex items-center justify-end text-xs text-slate-500 dark:text-slate-400", children: formatDate(log.createdAt) })
              ] }, log._id))
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: [
                "Showing ",
                auditLogs.length,
                " of ",
                auditLogsPagination.total,
                " logs"
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", disabled: auditLogsPagination.page <= 1, onClick: () => loadAuditLogs(auditLogsPagination.page - 1), children: /* @__PURE__ */ jsx(ChevronLeft, { className: "h-4 w-4" }) }),
                /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", disabled: auditLogsPagination.page >= auditLogsPagination.total_pages, onClick: () => loadAuditLogs(auditLogsPagination.page + 1), children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" }) })
              ] })
            ] })
          ] }) })
        ] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "analytics", children: analyticsLoading || !analytics ? /* @__PURE__ */ jsx("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-3", children: Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-72 rounded-xl" }, i)) }) : /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2 2xl:grid-cols-4", children: [
            /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx("div", { className: "h-1 bg-cyan-500" }),
              /* @__PURE__ */ jsxs(CardContent, { className: "p-5", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "MRR" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white", children: formatMoney(analytics.mrr) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx("div", { className: "h-1 bg-emerald-500" }),
              /* @__PURE__ */ jsxs(CardContent, { className: "p-5", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Total Tenants" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white", children: analytics.totalTenants })
              ] })
            ] }),
            /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx("div", { className: "h-1 bg-amber-500" }),
              /* @__PURE__ */ jsxs(CardContent, { className: "p-5", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Active Tenants" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white", children: analytics.activeTenants })
              ] })
            ] }),
            /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx("div", { className: "h-1 bg-rose-500" }),
              /* @__PURE__ */ jsxs(CardContent, { className: "p-5", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: "Churn Rate" }),
                /* @__PURE__ */ jsxs("p", { className: "mt-2 text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white", children: [
                  analytics.totalTenants ? Math.round(analytics.churnTrend.reduce((s, d) => s + d.count, 0) / analytics.totalTenants * 100) : 0,
                  "%"
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid gap-4 xl:grid-cols-2", children: [
            /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx("div", { className: "h-1 bg-sky-500" }),
              /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold text-slate-950 dark:text-white", children: "Growth Trend (New Signups)" }) }),
              /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 250, children: /* @__PURE__ */ jsxs(BarChart, { data: analytics.growthTrend, children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3" }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "month", tick: { fontSize: 12 }, label: { value: "Month", position: "insideBottom", offset: -2, fontSize: 12 } }),
                /* @__PURE__ */ jsx(YAxis, { allowDecimals: false, tick: { fontSize: 12 }, label: { value: "New signups", angle: -90, position: "insideLeft", fontSize: 12 } }),
                /* @__PURE__ */ jsx(Tooltip, {}),
                /* @__PURE__ */ jsx(Bar, { dataKey: "count", fill: "#0ea5e9", radius: [4, 4, 0, 0] })
              ] }) }) })
            ] }),
            /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx("div", { className: "h-1 bg-red-500" }),
              /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold text-slate-950 dark:text-white", children: "Churn Trend" }) }),
              /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 250, children: /* @__PURE__ */ jsxs(BarChart, { data: analytics.churnTrend, children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3" }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "month", tick: { fontSize: 12 }, label: { value: "Month", position: "insideBottom", offset: -2, fontSize: 12 } }),
                /* @__PURE__ */ jsx(YAxis, { allowDecimals: false, tick: { fontSize: 12 }, label: { value: "Churned tenants", angle: -90, position: "insideLeft", fontSize: 12 } }),
                /* @__PURE__ */ jsx(Tooltip, {}),
                /* @__PURE__ */ jsx(Bar, { dataKey: "count", fill: "#ef4444", radius: [4, 4, 0, 0] })
              ] }) }) })
            ] }),
            /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx("div", { className: "h-1 bg-emerald-500" }),
              /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold text-slate-950 dark:text-white", children: "Active Tenant Trend" }) }),
              /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 250, children: /* @__PURE__ */ jsxs(AreaChart, { data: analytics.activeTenantTrend, children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3" }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "month", tick: { fontSize: 12 }, label: { value: "Month", position: "insideBottom", offset: -2, fontSize: 12 } }),
                /* @__PURE__ */ jsx(YAxis, { allowDecimals: false, tick: { fontSize: 12 }, label: { value: "Active tenants", angle: -90, position: "insideLeft", fontSize: 12 } }),
                /* @__PURE__ */ jsx(Tooltip, {}),
                /* @__PURE__ */ jsx(Area, { type: "monotone", dataKey: "count", stroke: "#10b981", fill: "#10b981", fillOpacity: 0.2 })
              ] }) }) })
            ] }),
            /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx("div", { className: "h-1 bg-violet-500" }),
              /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold text-slate-950 dark:text-white", children: "Plan Distribution" }) }),
              /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 250, children: /* @__PURE__ */ jsxs(PieChart, { children: [
                /* @__PURE__ */ jsx(
                  Pie,
                  {
                    data: Object.entries(analytics.planDistribution).map(([name, value]) => ({ name: titleCase(name), value })),
                    cx: "50%",
                    cy: "50%",
                    innerRadius: 60,
                    outerRadius: 80,
                    paddingAngle: 5,
                    dataKey: "value",
                    children: Object.entries(analytics.planDistribution).map((_, index) => /* @__PURE__ */ jsx(Cell, { fill: ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6"][index % 4] }, `cell-${index}`))
                  }
                ),
                /* @__PURE__ */ jsx(Tooltip, {}),
                /* @__PURE__ */ jsx(Legend, {})
              ] }) }) })
            ] }),
            /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx("div", { className: "h-1 bg-indigo-500" }),
              /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold text-slate-950 dark:text-white", children: "MRR by Plan" }) }),
              /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 250, children: /* @__PURE__ */ jsxs(BarChart, { data: Object.entries(analytics.mrrByPlan).map(([plan, value]) => ({ plan: titleCase(plan), value: Math.round((value || 0) * 100) / 100 })), children: [
                /* @__PURE__ */ jsx(CartesianGrid, { strokeDasharray: "3 3" }),
                /* @__PURE__ */ jsx(XAxis, { dataKey: "plan", tick: { fontSize: 12 }, label: { value: "Plan", position: "insideBottom", offset: -2, fontSize: 12 } }),
                /* @__PURE__ */ jsx(YAxis, { tick: { fontSize: 12 }, label: { value: "MRR ($)", angle: -90, position: "insideLeft", fontSize: 12 } }),
                /* @__PURE__ */ jsx(Tooltip, { formatter: (value) => formatMoney(value) }),
                /* @__PURE__ */ jsx(Bar, { dataKey: "value", fill: "#8b5cf6", radius: [4, 4, 0, 0] })
              ] }) }) })
            ] }),
            /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
              /* @__PURE__ */ jsx("div", { className: "h-1 bg-teal-500" }),
              /* @__PURE__ */ jsx(CardHeader, { children: /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold text-slate-950 dark:text-white", children: "Status Distribution" }) }),
              /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsx(ResponsiveContainer, { width: "100%", height: 250, children: /* @__PURE__ */ jsxs(PieChart, { children: [
                /* @__PURE__ */ jsx(
                  Pie,
                  {
                    data: Object.entries(analytics.statusDistribution).map(([name, value]) => ({ name: titleCase(name), value })),
                    cx: "50%",
                    cy: "50%",
                    innerRadius: 60,
                    outerRadius: 80,
                    paddingAngle: 5,
                    dataKey: "value",
                    children: Object.entries(analytics.statusDistribution).map((_, index) => /* @__PURE__ */ jsx(Cell, { fill: ["#10b981", "#f59e0b", "#ef4444", "#64748b", "#8b5cf6"][index % 5] }, `cell-${index}`))
                  }
                ),
                /* @__PURE__ */ jsx(Tooltip, {}),
                /* @__PURE__ */ jsx(Legend, {})
              ] }) }) })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(TabsContent, { value: "plans", children: /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70", children: [
          /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between pb-2", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(CardTitle, { className: "text-base font-semibold text-slate-950 dark:text-white", children: "Subscription Plans" }),
              /* @__PURE__ */ jsx(CardDescription, { children: "Create and manage platform subscription tiers and their feature sets." })
            ] }),
            /* @__PURE__ */ jsxs(Button, { size: "sm", className: "rounded-lg", onClick: () => openPlanDialog(), children: [
              /* @__PURE__ */ jsx(Plus, { className: "mr-1 h-4 w-4" }),
              " Add plan"
            ] })
          ] }),
          /* @__PURE__ */ jsx(CardContent, { children: plansLoading ? /* @__PURE__ */ jsx("div", { className: "space-y-3", children: Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-16 rounded-xl" }, i)) }) : subscriptionPlans.length === 0 ? /* @__PURE__ */ jsx(EmptyPanel, { title: "No plans configured", text: "Create your first subscription plan to define platform tiers." }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: subscriptionPlans.map((plan) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50/40 p-4 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900", children: [
            /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx("p", { className: "font-semibold text-slate-900 dark:text-white", children: plan.name }),
                /* @__PURE__ */ jsx("code", { className: "rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300", children: plan.key }),
                !plan.is_active && /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "rounded-md text-xs", children: "Inactive" })
              ] }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: plan.description || "No description" }),
              /* @__PURE__ */ jsx("div", { className: "mt-2 flex flex-wrap gap-1", children: plan.features.map((f) => /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "rounded-md text-[10px]", children: f }, f)) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "rounded-lg", onClick: () => openPlanDialog(plan), children: "Edit" }),
              /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", className: "rounded-lg text-red-600", disabled: actionLoading === plan.key, onClick: () => handleDeletePlan(plan.key), children: actionLoading === plan.key ? /* @__PURE__ */ jsx(Loader2, { className: "h-3 w-3 animate-spin" }) : "Delete" })
            ] })
          ] }, plan.key)) }) })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(AccessModal, { company: selectedCompany, packageMatrix: dashboard.packageMatrix, isOpen: !!selectedCompany, onClose: () => setSelectedCompany(null), onSave: handleSaveAccess, saving: !!selectedCompany && actionLoading === selectedCompany._id }),
    /* @__PURE__ */ jsx(Dialog, { open: !!rejectCompany, onOpenChange: (open) => !open && setRejectCompany(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Reject Company Registration" }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          "Send a clear reason to ",
          rejectCompany?.name || "this company",
          " so they know what to correct."
        ] })
      ] }),
      /* @__PURE__ */ jsx(Textarea, { value: rejectReason, onChange: (event) => setRejectReason(event.target.value), rows: 4, placeholder: "Reason for rejection" }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setRejectCompany(null), children: "Cancel" }),
        /* @__PURE__ */ jsxs(Button, { variant: "destructive", onClick: handleReject, disabled: !rejectCompany || actionLoading === rejectCompany._id, children: [
          rejectCompany && actionLoading === rejectCompany._id ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(XCircle, { className: "h-4 w-4" }),
          "Reject"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: !!reminderCompany, onOpenChange: (open) => !open && setReminderCompany(null), children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Send Payment Reminder" }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          "Notify ",
          reminderCompany?.name || "the company",
          " about upcoming or overdue subscription payment."
        ] })
      ] }),
      /* @__PURE__ */ jsx(Textarea, { value: reminderMessage, onChange: (event) => setReminderMessage(event.target.value), rows: 5 }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setReminderCompany(null), children: "Cancel" }),
        /* @__PURE__ */ jsxs(Button, { onClick: handleReminder, disabled: !reminderCompany || actionLoading === reminderCompany._id, children: [
          reminderCompany && actionLoading === reminderCompany._id ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(BellRing, { className: "h-4 w-4" }),
          "Send reminder"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: broadcastOpen, onOpenChange: setBroadcastOpen, children: /* @__PURE__ */ jsxs(DialogContent, { className: "max-h-[92vh] overflow-y-auto sm:max-w-3xl", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Send Platform Communication" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "Send feature changes, maintenance notices, policy updates, payment guidance, or account-specific instructions to all approved companies or selected companies only." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setBroadcastAudience("all"),
              className: `rounded-lg border p-4 text-left transition ${broadcastAudience === "all" ? "border-cyan-400 bg-cyan-50 text-cyan-900 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-100" : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"}`,
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold", children: [
                  /* @__PURE__ */ jsx(Globe2, { className: "h-4 w-4" }),
                  "All approved companies"
                ] }),
                /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs opacity-75", children: "Uses the platform broadcast endpoint default audience." })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => setBroadcastAudience("selected"),
              className: `rounded-lg border p-4 text-left transition ${broadcastAudience === "selected" ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100" : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"}`,
              children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold", children: [
                  /* @__PURE__ */ jsx(Users, { className: "h-4 w-4" }),
                  "Selected companies"
                ] }),
                /* @__PURE__ */ jsxs("p", { className: "mt-1 text-xs opacity-75", children: [
                  selectedCompanyIds.length || 0,
                  " selected for targeted communication."
                ] })
              ]
            }
          )
        ] }),
        broadcastAudience === "selected" && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-3 dark:border-slate-800", children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Recipients" }),
            /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", onClick: () => setSelectedCompanyIds(selectableCompanies.map((company) => company._id)), children: "Select all visible" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2", children: selectableCompanies.map((company) => /* @__PURE__ */ jsxs("label", { className: "flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800", children: [
            /* @__PURE__ */ jsx(
              Checkbox,
              {
                checked: selectedCompanyIds.includes(company._id),
                onCheckedChange: (checked) => toggleCompanySelection(company._id, checked === true)
              }
            ),
            /* @__PURE__ */ jsxs("span", { className: "min-w-0", children: [
              /* @__PURE__ */ jsx("span", { className: "block truncate font-medium text-slate-900 dark:text-white", children: company.name }),
              /* @__PURE__ */ jsx("span", { className: "block truncate text-xs text-slate-500 dark:text-slate-400", children: company.email })
            ] })
          ] }, company._id)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white", children: [
            /* @__PURE__ */ jsx(FileText, { className: "h-4 w-4" }),
            "Message templates"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: messageTemplates.map((tmpl) => /* @__PURE__ */ jsx(
            Button,
            {
              variant: "outline",
              size: "sm",
              className: "text-xs",
              onClick: () => {
                setBroadcastSubject(tmpl.subject);
                setBroadcastMessage(tmpl.message);
              },
              children: tmpl.label
            },
            tmpl.key
          )) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Subject" }),
          /* @__PURE__ */ jsx(Input, { value: broadcastSubject, onChange: (event) => setBroadcastSubject(event.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Message" }),
          /* @__PURE__ */ jsx(Textarea, { value: broadcastMessage, onChange: (event) => setBroadcastMessage(event.target.value), rows: 5 })
        ] }),
        broadcastHistory.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white", children: [
            /* @__PURE__ */ jsx(History, { className: "h-4 w-4" }),
            "Recent broadcast history"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "max-h-40 space-y-2 overflow-y-auto", children: broadcastHistory.map((item) => /* @__PURE__ */ jsxs("div", { className: "rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsx("span", { className: "font-medium text-slate-800 dark:text-slate-200", children: item.changes?.subject || "Platform update" }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "sm",
                    className: "h-6 px-2 text-[10px]",
                    onClick: () => {
                      setBroadcastSubject(item.changes?.subject || "Platform update");
                      setBroadcastMessage(item.changes?.message || "");
                    },
                    children: "Reuse"
                  }
                ),
                /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: formatDate(item.createdAt) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "mt-1 text-slate-500", children: [
              "Recipients: ",
              item.changes?.recipients ?? 0,
              " \xB7 Sent: ",
              item.changes?.sent ?? 0,
              " \xB7 Failed: ",
              item.changes?.failed ?? 0
            ] })
          ] }, item._id)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setBroadcastOpen(false), children: "Cancel" }),
        /* @__PURE__ */ jsxs(Button, { onClick: handleBroadcast, disabled: actionLoading === "broadcast", children: [
          actionLoading === "broadcast" ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Megaphone, { className: "h-4 w-4" }),
          "Send to ",
          broadcastAudience === "selected" ? `${selectedCompanyIds.length} selected` : "all approved"
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Sheet, { open: userDrawerOpen, onOpenChange: setUserDrawerOpen, children: /* @__PURE__ */ jsxs(SheetContent, { className: "w-full sm:max-w-lg", children: [
      /* @__PURE__ */ jsxs(SheetHeader, { children: [
        /* @__PURE__ */ jsxs(SheetTitle, { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Users, { className: "h-5 w-5" }),
          userDrawerCompany?.name,
          " \u2014 Users"
        ] }),
        /* @__PURE__ */ jsx(SheetDescription, { children: "View all users registered under this tenant company." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-6", children: companyUsersLoading ? /* @__PURE__ */ jsx("div", { className: "space-y-3", children: Array.from({ length: 4 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-14 rounded-lg" }, i)) }) : companyUsers.length === 0 ? /* @__PURE__ */ jsx(EmptyPanel, { title: "No users found", text: "This company does not have any registered users yet." }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: companyUsers.map((user) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-800", children: [
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx("p", { className: "truncate font-medium text-slate-900 dark:text-white", children: user.name }),
          /* @__PURE__ */ jsx("p", { className: "truncate text-xs text-slate-500 dark:text-slate-400", children: user.email })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxs(
            Button,
            {
              variant: "ghost",
              size: "sm",
              className: "h-7 px-2 text-xs",
              disabled: actionLoading === user._id,
              onClick: () => userDrawerCompany && handleImpersonate(userDrawerCompany._id, user._id, user.name, user.email),
              children: [
                actionLoading === user._id ? /* @__PURE__ */ jsx(Loader2, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ jsx(LogIn, { className: "h-3 w-3" }),
                "Impersonate"
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            Button,
            {
              variant: "ghost",
              size: "sm",
              className: "h-7 px-2 text-xs",
              disabled: actionLoading === user._id,
              onClick: () => userDrawerCompany && handleForcePasswordReset(userDrawerCompany._id, user._id),
              children: [
                actionLoading === user._id ? /* @__PURE__ */ jsx(Loader2, { className: "h-3 w-3 animate-spin" }) : /* @__PURE__ */ jsx(KeyRound, { className: "h-3 w-3" }),
                "Reset"
              ]
            }
          ),
          /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-xs", children: user.role }),
          /* @__PURE__ */ jsx(Badge, { variant: user.isActive ? "default" : "secondary", className: "text-xs", children: user.isActive ? "Active" : "Inactive" })
        ] })
      ] }, user._id)) }) })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: planDialogOpen, onOpenChange: (open) => {
      if (!open) setPlanDialogOpen(false);
    }, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-lg", children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: editingPlan ? "Edit Plan" : "Create Plan" }),
        /* @__PURE__ */ jsx(DialogDescription, { children: "Define subscription tier name, key, features, and billing defaults." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Key" }),
            /* @__PURE__ */ jsx(Input, { value: planForm.key, disabled: !!editingPlan, onChange: (e) => setPlanForm({ ...planForm, key: e.target.value }), placeholder: "e.g. starter" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Name" }),
            /* @__PURE__ */ jsx(Input, { value: planForm.name, onChange: (e) => setPlanForm({ ...planForm, name: e.target.value }), placeholder: "e.g. Starter" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Description" }),
          /* @__PURE__ */ jsx(Input, { value: planForm.description, onChange: (e) => setPlanForm({ ...planForm, description: e.target.value }), placeholder: "Short description" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Features (system keys, one per line)" }),
          /* @__PURE__ */ jsx(Textarea, { value: planForm.features, onChange: (e) => setPlanForm({ ...planForm, features: e.target.value }), rows: 3, placeholder: "inventory\nsales\nreports" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Pricing card sections (one per line)" }),
          /* @__PURE__ */ jsx(Textarea, { value: planForm.modules, onChange: (e) => setPlanForm({ ...planForm, modules: e.target.value }), rows: 7, placeholder: "Inventory Core|Products & Categories\nRevenue Flow|POS\nFinance Control|Bank Accounts" }),
          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-500 dark:text-slate-400", children: "Use Section|Feature to keep the public pricing card grouped like the design." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Included pills / outcomes (one per line)" }),
          /* @__PURE__ */ jsx(Textarea, { value: planForm.outcomes, onChange: (e) => setPlanForm({ ...planForm, outcomes: e.target.value }), rows: 3, placeholder: "included|control|Control Room included\nincluded|ai|Stacy AI Assistant included" }),
          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-slate-500 dark:text-slate-400", children: "Use included|control|Label or included|ai|Label for the colored pills on the pricing page." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Badge label" }),
            /* @__PURE__ */ jsx(Input, { value: planForm.badge, onChange: (e) => setPlanForm({ ...planForm, badge: e.target.value }), placeholder: "ENTRY TIER" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Icon (Lucide name)" }),
            /* @__PURE__ */ jsx(Input, { value: planForm.icon, onChange: (e) => setPlanForm({ ...planForm, icon: e.target.value }), placeholder: "Boxes, BarChart3, ShieldCheck" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Button label" }),
            /* @__PURE__ */ jsx(Input, { value: planForm.button_label, onChange: (e) => setPlanForm({ ...planForm, button_label: e.target.value }), placeholder: "Choose 10k" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "space-y-1 flex items-end", children: /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-sm", children: [
            /* @__PURE__ */ jsx("input", { type: "checkbox", checked: planForm.featured, onChange: (e) => setPlanForm({ ...planForm, featured: e.target.checked }) }),
            "Featured (Recommended badge)"
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Amount" }),
            /* @__PURE__ */ jsx(Input, { type: "number", value: planForm.default_billing_amount, onChange: (e) => setPlanForm({ ...planForm, default_billing_amount: e.target.value }), placeholder: "0" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Cycle" }),
            /* @__PURE__ */ jsxs("select", { className: "h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950", value: planForm.default_billing_cycle, onChange: (e) => setPlanForm({ ...planForm, default_billing_cycle: e.target.value }), children: [
              /* @__PURE__ */ jsx("option", { value: "monthly", children: "Monthly" }),
              /* @__PURE__ */ jsx("option", { value: "quarterly", children: "Quarterly" }),
              /* @__PURE__ */ jsx("option", { value: "annual", children: "Annual" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("label", { className: "text-xs font-medium", children: "Sort order" }),
            /* @__PURE__ */ jsx(Input, { type: "number", value: planForm.sort_order, onChange: (e) => setPlanForm({ ...planForm, sort_order: e.target.value }), placeholder: "0" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-sm", children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: planForm.is_active, onChange: (e) => setPlanForm({ ...planForm, is_active: e.target.checked }) }),
          "Active"
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setPlanDialogOpen(false), children: "Cancel" }),
        /* @__PURE__ */ jsx(Button, { onClick: handleSavePlan, disabled: actionLoading === "plan", children: actionLoading === "plan" ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "Save" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: impersonateDialogOpen, onOpenChange: setImpersonateDialogOpen, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Impersonation Token" }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          "You are impersonating ",
          impersonateUser?.name,
          " (",
          impersonateUser?.email,
          "). Copy the token below to authenticate as this user in a new session."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900", children: /* @__PURE__ */ jsx("code", { className: "block break-all text-xs text-slate-700 dark:text-slate-300", children: impersonateToken }) }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outline",
            size: "sm",
            className: "w-full",
            onClick: () => {
              navigator.clipboard.writeText(impersonateToken);
              flashSuccess("Token copied to clipboard.");
            },
            children: "Copy token to clipboard"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setImpersonateDialogOpen(false), children: "Close" }) })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: passwordResetDialogOpen, onOpenChange: setPasswordResetDialogOpen, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsx(DialogTitle, { children: "Password Reset Complete" }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          "A temporary password has been generated for ",
          passwordResetResult?.user.name,
          " (",
          passwordResetResult?.user.email,
          "). Share this securely with the user."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200", children: "Temporary password" }),
          /* @__PURE__ */ jsx("code", { className: "mt-1 block text-lg font-mono font-semibold text-amber-900 dark:text-amber-100", children: passwordResetResult?.tempPassword })
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "outline",
            size: "sm",
            className: "w-full",
            onClick: () => {
              if (passwordResetResult?.tempPassword) {
                navigator.clipboard.writeText(passwordResetResult.tempPassword);
                flashSuccess("Password copied to clipboard.");
              }
            },
            children: "Copy password to clipboard"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setPasswordResetDialogOpen(false), children: "Close" }) })
    ] }) })
  ] });
}
export {
  PlatformAdminPage as default
};
