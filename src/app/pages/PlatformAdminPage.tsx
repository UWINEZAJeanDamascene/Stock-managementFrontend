import { useEffect, useMemo, useState, type ReactNode } from "react";
import { companyService } from "@/services";
import {
  type PlatformAccessUpdate,
  type PlatformBillingCycle,
  type PlatformCompany,
  type PlatformDashboardData,
  type PlatformFeatureAccess,
  type PlatformFeatureKey,
  type PlatformPlan,
  type PlatformSubscriptionStatus,
} from "@/lib/api";
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
  DialogTitle,
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
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Progress } from "@/app/components/ui/progress";
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
  XCircle,
} from "lucide-react";

const featureLabels: Record<PlatformFeatureKey, string> = {
  inventory: "Inventory",
  sales: "Sales",
  purchases: "Purchases",
  finance: "Finance",
  payroll: "Payroll",
  reports: "Reports",
  projects: "Projects",
  fixed_assets: "Fixed assets",
  ai_assistant: "AI assistant",
  integrations: "Integrations",
};

const featureKeys = Object.keys(featureLabels) as PlatformFeatureKey[];

function planStyles(plan: string): string {
  const known: Record<string, string> = {
    starter: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-800",
    professional: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
    enterprise: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
    core_operations: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800",
    business_command: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-800",
  };
  return known[plan] || "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700";
}

const statusStyles: Record<PlatformSubscriptionStatus, string> = {
  trialing: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800",
  past_due: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800",
  suspended: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
};

function emptyFeatureAccess(): PlatformFeatureAccess {
  return featureKeys.reduce((acc, key) => {
    acc[key] = false;
    return acc;
  }, {} as PlatformFeatureAccess);
}

const messageTemplates = [
  {
    key: "feature-release",
    label: "Feature Release",
    subject: "New features now live on StockManager",
    message: "We have released platform improvements that may affect your workspace. Please review your dashboard for the latest updates and feel free to reach out with any questions.",
  },
  {
    key: "maintenance",
    label: "Scheduled Maintenance",
    subject: "Scheduled platform maintenance",
    message: "Our platform will undergo scheduled maintenance to improve performance and reliability. We expect brief downtime during the maintenance window. Thank you for your patience.",
  },
  {
    key: "policy-update",
    label: "Policy Update",
    subject: "Important policy update",
    message: "We are updating our terms of service and privacy policy to reflect new features and compliance requirements. Please review the changes in your account settings.",
  },
  {
    key: "payment-notice",
    label: "Payment Notice",
    subject: "Subscription payment reminder",
    message: "Your subscription payment is coming due. Please arrange payment to keep your access active and avoid any service interruption.",
  },
  {
    key: "security-alert",
    label: "Security Alert",
    subject: "Security best practices reminder",
    message: "As part of our ongoing security efforts, we recommend reviewing your account security settings, enabling two-factor authentication, and ensuring your password is strong and unique.",
  },
];

const emptyDashboard: PlatformDashboardData = {
  stats: {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    pastDue: 0,
    upcomingPayments: 0,
    monthlyRecurringRevenue: 0,
  },
  companies: [],
  packageMatrix: [],
};

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function splitPlanList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const today = new Date();
  const target = new Date(value);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function normalizeCompany(company: PlatformCompany): PlatformCompany {
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
    subscription_modules: subscriptionModules,
  };
}

function accentFromTone(tone: string): string {
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
  barValue,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  tone: string;
  barValue?: number;
}) {
  return (
    <Card className="group overflow-hidden border-0 bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-900/70">
      <div className={`h-1 w-full ${accentFromTone(tone)}`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white">{value}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
          </div>
          <div className={`rounded-xl p-2.5 shadow-sm ring-1 ring-black/5 transition-transform group-hover:scale-105 ${tone}`}>{icon}</div>
        </div>
        {typeof barValue === "number" && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={`h-full rounded-full ${accentFromTone(tone)}`} style={{ width: `${barValue}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OpsMetric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white shadow-sm backdrop-blur-sm transition-all hover:bg-white/10">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-white/60">{label}</p>
        <span className="rounded-lg bg-white/10 p-2 text-cyan-100 ring-1 ring-white/10">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-white/50">{detail}</p>
    </div>
  );
}

function SignalBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${tone}`} />
          <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        <span className="font-semibold text-slate-900 dark:text-white">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function WorkstreamCard({
  title,
  value,
  detail,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="group rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700">
      <div className="flex items-start gap-4">
        <div className={`rounded-xl p-2.5 shadow-sm ring-1 ring-black/5 transition-transform group-hover:scale-105 ${tone}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/30">
      <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
        <Building2 className="h-8 w-8 text-slate-400" />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

function CompanySummary({ company }: { company: PlatformCompany }) {
  const billingDelta = daysUntil(company.next_billing_date);
  const accessDepth = percent(company.enabledModuleCount, featureKeys.length);
  const needsAttention = company.subscription_status === "past_due" || company.subscription_status === "suspended";
  const lifecycleTone = company.approvalStatus === "approved"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
    : company.approvalStatus === "rejected"
      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800"
      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800";

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="truncate text-base font-semibold text-slate-950 dark:text-white">{company.name}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={`rounded-md text-xs font-medium ${lifecycleTone}`}>
            {titleCase(company.approvalStatus)}
          </Badge>
          <Badge variant="outline" className={`rounded-md text-xs font-medium ${planStyles(company.subscription_plan)}`}>
            {titleCase(company.subscription_plan)}
          </Badge>
          <Badge variant="outline" className={`rounded-md text-xs font-medium ${statusStyles[company.subscription_status]}`}>
            {titleCase(company.subscription_status)}
          </Badge>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2 xl:grid-cols-4">
        <span className="flex min-w-0 items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{company.email}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          {company.activeUsers || 0}/{company.users || 0} active
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
          {billingDelta === null ? "Not scheduled" : billingDelta < 0 ? `${Math.abs(billingDelta)} days overdue` : `Bills in ${billingDelta} days`}
        </span>
        <span className="flex items-center gap-1.5">
          <KeyRound className="h-3.5 w-3.5 text-slate-400" />
          {accessDepth}% module coverage
        </span>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${needsAttention ? "bg-gradient-to-r from-red-500 to-amber-400" : "bg-gradient-to-r from-cyan-500 via-emerald-500 to-lime-400"}`}
            style={{ width: `${accessDepth}%` }}
          />
        </div>
        <p className="shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {formatMoney(company.billing_amount)} / {titleCase(company.billing_cycle)}
        </p>
      </div>
    </div>
  );
}

function AccessModal({
  company,
  packageMatrix,
  isOpen,
  onClose,
  onSave,
  saving,
}: {
  company: PlatformCompany | null;
  packageMatrix: Array<{ plan: PlatformPlan; name: string; modules: string[]; features: PlatformFeatureKey[] }>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyId: string, data: PlatformAccessUpdate) => Promise<void>;
  saving: boolean;
}) {
  const availablePlans = useMemo(() => packageMatrix.map((pm) => ({ key: pm.plan, name: pm.name })), [packageMatrix]);

  const accessFromMatrix = (plan: PlatformPlan): PlatformFeatureAccess => {
    const template = packageMatrix.find((pm) => pm.plan === plan);
    const included = new Set(template?.features || []);
    return featureKeys.reduce((acc, key) => {
      acc[key] = included.has(key);
      return acc;
    }, {} as PlatformFeatureAccess);
  };

  const [form, setForm] = useState<Required<Pick<PlatformAccessUpdate, "subscription_plan" | "subscription_status" | "billing_cycle">> & {
    billing_amount: number;
    next_billing_date: string;
    platform_notes: string;
    feature_access: PlatformFeatureAccess;
    subscription_modules: string[];
  }>({
    subscription_plan: "starter",
    subscription_status: "active",
    billing_cycle: "monthly",
    billing_amount: 0,
    next_billing_date: "",
    platform_notes: "",
    feature_access: emptyFeatureAccess(),
    subscription_modules: [],
  });

  useEffect(() => {
    if (!company) return;
    const planDefaultModules = packageMatrix.find((pm) => pm.plan === company.subscription_plan)?.modules || [];
    const companyModules = company.subscription_modules || [];
    // Clean stale modules: keep only modules that belong to the current plan's defaults.
    // This removes legacy umbrellas (e.g. 'Financial reports') left over from plan downgrades or old data.
    const cleaned = companyModules.filter((m) => planDefaultModules.includes(m));
    const initialModules = cleaned.length > 0 ? cleaned : planDefaultModules;

    setForm({
      subscription_plan: company.subscription_plan,
      subscription_status: company.subscription_status,
      billing_cycle: company.billing_cycle,
      billing_amount: company.billing_amount,
      next_billing_date: company.next_billing_date ? company.next_billing_date.slice(0, 10) : "",
      platform_notes: company.platform_notes || "",
      feature_access: { ...accessFromMatrix(company.subscription_plan), ...(company.feature_access || {}) },
      subscription_modules: initialModules,
    });
  }, [company, packageMatrix]);

  const visibleFeatureKeys = useMemo(() => {
    const keys = new Set<PlatformFeatureKey>();
    // show features included in the currently selected plan
    const selectedPlanTemplate = packageMatrix.find((pm) => pm.plan === form.subscription_plan);
    (selectedPlanTemplate?.features || []).forEach((f) => keys.add(f));
    // also keep any features the company already has enabled so they don't disappear on view
    if (company?.feature_access) {
      (Object.keys(company.feature_access) as PlatformFeatureKey[]).forEach((k) => {
        if (company.feature_access[k]) keys.add(k);
      });
    }
    return Array.from(keys).sort();
  }, [packageMatrix, company, form.subscription_plan]);

  const selectedPackageModules = useMemo(() => {
    return packageMatrix.find((pm) => pm.plan === form.subscription_plan)?.modules || [];
  }, [packageMatrix, form.subscription_plan]);

  const availableModules = useMemo(() => {
    const all = new Set<string>();
    packageMatrix.forEach((pm) => {
      (pm.modules || []).forEach((m) => all.add(m));
    });
    return Array.from(all);
  }, [packageMatrix]);

  const handleSave = async () => {
    if (!company) return;
    await onSave(company._id, {
      ...form,
      next_billing_date: form.next_billing_date || null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Package and Module Control</DialogTitle>
          <DialogDescription>
            Set the subscription package, payment status, next billing date, and exact module access for {company?.name || "this company"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Package</Label>
            <Select value={form.subscription_plan} onValueChange={(value: PlatformPlan) => setForm((prev) => {
              const newPlanTemplate = packageMatrix.find((pm) => pm.plan === value);
              return {
                ...prev,
                subscription_plan: value,
                feature_access: accessFromMatrix(value),
                subscription_modules: newPlanTemplate?.modules || prev.subscription_modules,
              };
            })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availablePlans.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Billing status</Label>
            <Select value={form.subscription_status} onValueChange={(value: PlatformSubscriptionStatus) => setForm((prev) => ({ ...prev, subscription_status: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="past_due">Past due</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Billing cycle</Label>
            <Select value={form.billing_cycle} onValueChange={(value: PlatformBillingCycle) => setForm((prev) => ({ ...prev, billing_cycle: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Billing amount</Label>
            <Input type="number" min="0" value={form.billing_amount} onChange={(event) => setForm((prev) => ({ ...prev, billing_amount: Number(event.target.value) }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Next billing date</Label>
            <Input type="date" value={form.next_billing_date} onChange={(event) => setForm((prev) => ({ ...prev, next_billing_date: event.target.value }))} />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-cyan-600" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Included Package Modules</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="rounded-md">{selectedPackageModules.length} modules</Badge>
            </div>
          </div>

          {availableModules.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availableModules.map((module) => (
                <div key={module} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200">
                  <Checkbox
                    checked={form.subscription_modules.includes(module)}
                    onCheckedChange={(checked) => {
                      setForm((prev) => {
                        const set = new Set(prev.subscription_modules || []);
                        if (checked) set.add(module);
                        else set.delete(module);
                        return { ...prev, subscription_modules: Array.from(set) };
                      });
                    }}
                  />
                  <span>{module}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No display modules are configured for any package.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-cyan-600" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Access Gates</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setForm((prev) => ({ ...prev, feature_access: accessFromMatrix(prev.subscription_plan) }))}>Apply package template</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setForm((prev) => ({ ...prev, subscription_modules: selectedPackageModules }))}>Apply package modules</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setForm((prev) => ({ ...prev, feature_access: featureKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {} as PlatformFeatureAccess) }))}>Enable all</Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFeatureKeys.map((key) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                <Label className="text-sm">{featureLabels[key] || titleCase(key)}</Label>
                <Switch
                  checked={form.feature_access[key]}
                  onCheckedChange={(checked) => setForm((prev) => ({
                    ...prev,
                    feature_access: { ...prev.feature_access, [key]: checked },
                  }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Internal platform notes</Label>
          <Textarea value={form.platform_notes} onChange={(event) => setForm((prev) => ({ ...prev, platform_notes: event.target.value }))} rows={3} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Save controls
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PlatformAdminPage() {
  const [dashboard, setDashboard] = useState<PlatformDashboardData>(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<PlatformCompany | null>(null);
  const [rejectCompany, setRejectCompany] = useState<PlatformCompany | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reminderCompany, setReminderCompany] = useState<PlatformCompany | null>(null);
  const [reminderMessage, setReminderMessage] = useState("Your subscription payment is coming due. Please arrange payment to keep your access active.");
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastAudience, setBroadcastAudience] = useState<"all" | "selected">("all");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [broadcastSubject, setBroadcastSubject] = useState("Platform update from StockManager");
  const [broadcastMessage, setBroadcastMessage] = useState("We have released platform improvements that may affect your workspace. Please review your dashboard for the latest updates.");
  const [broadcastHistory, setBroadcastHistory] = useState<{ _id: string; action: string; changes?: unknown; createdAt: string }[]>([]);

  const [auditLogs, setAuditLogs] = useState<Array<{
    _id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    company_id?: { _id: string; name: string; code?: string } | null;
    user_id?: { _id: string; name: string; email: string } | null;
    changes?: unknown;
    status: string;
    createdAt: string;
  }>>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsPagination, setAuditLogsPagination] = useState({ page: 1, per_page: 25, total: 0, total_pages: 1 });

  const [userDrawerOpen, setUserDrawerOpen] = useState(false);
  const [userDrawerCompany, setUserDrawerCompany] = useState<PlatformCompany | null>(null);
  const [companyUsers, setCompanyUsers] = useState<Array<{ _id: string; name: string; email: string; role: string; isActive: boolean; lastLogin?: string; createdAt: string }>>([]);
  const [companyUsersLoading, setCompanyUsersLoading] = useState(false);

  const [analytics, setAnalytics] = useState<{
    mrr: number;
    mrrByPlan: Record<string, number>;
    totalTenants: number;
    activeTenants: number;
    planDistribution: Record<string, number>;
    statusDistribution: Record<string, number>;
    growthTrend: Array<{ month: string; count: number }>;
    churnTrend: Array<{ month: string; count: number }>;
    activeTenantTrend: Array<{ month: string; count: number }>;
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false);
  const [impersonateToken, setImpersonateToken] = useState("");
  const [impersonateUser, setImpersonateUser] = useState<{ name: string; email: string } | null>(null);
  const [passwordResetDialogOpen, setPasswordResetDialogOpen] = useState(false);
  const [passwordResetResult, setPasswordResetResult] = useState<{ tempPassword: string; user: { name: string; email: string } } | null>(null);

  const [subscriptionPlans, setSubscriptionPlans] = useState<Array<{ _id: string; key: string; name: string; description: string; features: string[]; modules: string[]; outcomes: string[]; badge: string; icon: string; featured: boolean; button_label: string; default_billing_amount: number; default_billing_cycle: string; is_active: boolean; sort_order: number }>>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({ key: "", name: "", description: "", features: "" as string, modules: "" as string, outcomes: "" as string, badge: "" as string, icon: "" as string, featured: false, button_label: "" as string, default_billing_amount: "0", default_billing_cycle: "monthly", is_active: true, sort_order: "0" });

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await companyService.getPlatformDashboard();
      setDashboard({
        ...response.data,
        companies: response.data.companies.map(normalizeCompany),
      });
    } catch (loadError) {
      try {
        const response = await companyService.getPendingCompanies();
        const pending = response.data.map((company) => normalizeCompany(company as unknown as PlatformCompany));
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

  const loadCompanyUsers = async (companyId: string) => {
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

  const handleImpersonate = async (companyId: string, userId: string, userName: string, userEmail: string) => {
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

  const handleForcePasswordReset = async (companyId: string, userId: string) => {
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
        sort_order: Number(planForm.sort_order) || 0,
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

  const handleDeletePlan = async (key: string) => {
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

  const openPlanDialog = (plan?: typeof subscriptionPlans[0]) => {
    if (plan) {
      setEditingPlan(plan.key);
      setPlanForm({
        key: plan.key,
        name: plan.name,
        description: plan.description,
        features: plan.features.join("\n"),
        modules: (plan.modules || []).join("\n"),
        outcomes: (plan.outcomes || []).join("\n"),
        badge: plan.badge || '',
        icon: plan.icon || '',
        featured: plan.featured || false,
        button_label: plan.button_label || '',
        default_billing_amount: String(plan.default_billing_amount),
        default_billing_cycle: plan.default_billing_cycle,
        is_active: plan.is_active,
        sort_order: String(plan.sort_order),
      });
    } else {
      setEditingPlan(null);
      setPlanForm({ key: "", name: "", description: "", features: "", modules: "", outcomes: "", badge: "", icon: "", featured: false, button_label: "", default_billing_amount: "0", default_billing_cycle: "monthly", is_active: true, sort_order: "0" });
    }
    setPlanDialogOpen(true);
  };

  const loadBroadcastHistory = async () => {
    try {
      const response = await companyService.getPlatformAuditLogs({ action: 'company.platform_broadcast_sent', per_page: 20 });
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
    return dashboard.companies.filter((company) =>
      [company.name, company.email, company.code, company.tin].some((value) => value?.toLowerCase().includes(term)),
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
  const upcomingRenewals = companies
    .filter((company) => {
      const delta = daysUntil(company.next_billing_date);
      return delta !== null && delta >= 0 && delta <= 14;
    })
    .sort((a, b) => (daysUntil(a.next_billing_date) || 0) - (daysUntil(b.next_billing_date) || 0))
    .slice(0, 4);
  const newestCompanies = [...companies]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 4);
  const selectedCompanies = dashboard.companies.filter((company) => selectedCompanyIds.includes(company._id));
  const selectableCompanies = companies.filter((company) => company.approvalStatus === "approved");

  const replaceCompany = (updated: PlatformCompany) => {
    setDashboard((prev) => ({
      ...prev,
      companies: prev.companies.map((company) => company._id === updated._id ? normalizeCompany(updated) : company),
    }));
    // If the updated company matches the currently-loaded tenant company in the global store,
    // update it so UI (sidebar, etc.) reflects changes immediately.
    try {
      const current = useCompanyStore.getState().company;
      if (current && current._id === updated._id) {
        useCompanyStore.getState().setCompany(normalizeCompany(updated));
      }
    } catch (e) {
      // noop - defensive in case store not initialized in this view
    }
  };

  const removeCompanyFromQueue = (companyId: string, status: "approved" | "rejected") => {
    setDashboard((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        pending: Math.max(0, prev.stats.pending - 1),
        [status]: prev.stats[status] + 1,
      },
      companies: prev.companies.map((company) =>
        company._id === companyId ? { ...company, approvalStatus: status, isActive: status === "approved" } : company,
      ),
    }));
  };

  const flashSuccess = (message: string) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(null), 3500);
  };

  const toggleCompanySelection = (companyId: string, checked: boolean) => {
    setSelectedCompanyIds((prev) => {
      if (checked) return prev.includes(companyId) ? prev : [...prev, companyId];
      return prev.filter((id) => id !== companyId);
    });
  };

  const handleQuickStatus = async (company: PlatformCompany, status: PlatformSubscriptionStatus) => {
    try {
      setActionLoading(`${company._id}:${status}`);
      const response = await companyService.updatePlatformAccess(company._id, {
        subscription_status: status,
        subscription_plan: company.subscription_plan,
        billing_cycle: company.billing_cycle,
        billing_amount: company.billing_amount,
        next_billing_date: company.next_billing_date,
        feature_access: company.feature_access,
        platform_notes: company.platform_notes,
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

  const handleApprove = async (company: PlatformCompany) => {
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

  const handleSaveAccess = async (companyId: string, data: PlatformAccessUpdate) => {
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
        message: reminderMessage,
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
        companyIds: broadcastAudience === "selected" ? selectedCompanyIds : undefined,
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

  const renderCompanyRow = (company: PlatformCompany, showApproval = false) => (
    <div key={company._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex gap-3 min-w-0">
          <Checkbox
            checked={selectedCompanyIds.includes(company._id)}
            onCheckedChange={(checked) => toggleCompanySelection(company._id, checked === true)}
            aria-label={`Select ${company.name}`}
            className="mt-1"
          />
          <CompanySummary company={company} />
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <Button variant="outline" size="sm" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" onClick={() => { setUserDrawerCompany(company); loadCompanyUsers(company._id); setUserDrawerOpen(true); }}>
            <Eye className="h-4 w-4" />
            Users
          </Button>
          <Button variant="outline" size="sm" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" onClick={() => setSelectedCompany(company)}>
            <SlidersHorizontal className="h-4 w-4" />
            Controls
          </Button>
          <Button variant="outline" size="sm" className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" onClick={() => setReminderCompany(company)}>
            <BellRing className="h-4 w-4" />
            Reminder
          </Button>
          {showApproval && (
            <>
              <Button size="sm" onClick={() => handleApprove(company)} disabled={actionLoading === company._id}>
                {actionLoading === company._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Approve
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setRejectCompany(company)} disabled={actionLoading === company._id}>
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          {company.subscription_status !== "active" && company.approvalStatus === "approved" && (
            <Button variant="outline" size="sm" className="border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" onClick={() => handleQuickStatus(company, "active")} disabled={actionLoading === `${company._id}:active`}>
              {actionLoading === `${company._id}:active` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Activate
            </Button>
          )}
          {!["suspended", "cancelled"].includes(company.subscription_status) && (
            <Button variant="outline" size="sm" className="border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200" onClick={() => handleQuickStatus(company, "suspended")} disabled={actionLoading === `${company._id}:suspended`}>
              {actionLoading === `${company._id}:suspended` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Suspend
            </Button>
          )}
          {company.subscription_status !== "cancelled" && (
            <Button variant="destructive" size="sm" onClick={() => handleQuickStatus(company, "cancelled")} disabled={actionLoading === `${company._id}:cancelled`}>
              {actionLoading === `${company._id}:cancelled` ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {company.enabledModules.slice(0, 8).map((feature) => (
            <Badge key={feature} variant="secondary" className="rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {featureLabels[feature]}
            </Badge>
          ))}
          {company.enabledModuleCount > 8 && (
            <Badge variant="secondary" className="rounded-md text-xs">+{company.enabledModuleCount - 8} more</Badge>
          )}
        </div>
        <div className="flex gap-3 text-center text-xs shrink-0">
          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
            <p className="font-semibold text-slate-950 dark:text-white">{company.code || "N/A"}</p>
            <p className="text-slate-500 dark:text-slate-400">Code</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
            <p className="font-semibold text-slate-950 dark:text-white">{company.tin || "N/A"}</p>
            <p className="text-slate-500 dark:text-slate-400">TIN</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
            <p className="font-semibold text-slate-950 dark:text-white">{formatDate(company.createdAt)}</p>
            <p className="text-slate-500 dark:text-slate-400">Joined</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-slate-950 dark:bg-[#07100f] dark:text-white">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg dark:border-slate-800">
          <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_440px]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(45,212,191,0.18),_transparent_50%),radial-gradient(ellipse_at_top_right,_rgba(250,204,21,0.12),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(16,185,129,0.15),_transparent_50%)]" />
            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-200 backdrop-blur-sm">
                <Crown className="h-3.5 w-3.5" />
                Platform Command Center
              </div>
              <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Platform Administration
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                Run the tenant estate like a real operations desk: onboard companies, govern modules, watch subscription risk, coordinate payments, and broadcast platform changes from one decisive workspace.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-semibold gap-2" onClick={() => setBroadcastOpen(true)}>
                  <Megaphone className="h-4 w-4" />
                  Broadcast update
                </Button>
                <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white gap-2 backdrop-blur-sm" onClick={loadDashboard} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh intelligence
                </Button>
              </div>
            </div>
            <div className="relative grid gap-3 sm:grid-cols-2">
              <OpsMetric label="Estate health" value={`${approvalRate}%`} detail={`${approvedCompanies.length} approved tenants`} icon={<Gauge className="h-4 w-4" />} />
              <OpsMetric label="Revenue watch" value={formatMoney(revenueAtRisk)} detail={`${attentionCompanies.length} accounts need action`} icon={<WalletCards className="h-4 w-4" />} />
              <OpsMetric label="Active seats" value={activeUsers} detail={`${userActivityRate}% of known users active`} icon={<Users className="h-4 w-4" />} />
              <OpsMetric label="Module fabric" value={`${moduleCoverage}%`} detail={`${assignedModules} feature grants live`} icon={<DatabaseZap className="h-4 w-4" />} />
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />) : (
            <>
              <StatTile title="Companies" value={dashboard.stats.total} detail={`${dashboard.stats.pending} awaiting registration review`} icon={<Building2 className="h-5 w-5" />} tone="bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200" barValue={approvalRate} />
              <StatTile title="MRR" value={formatMoney(dashboard.stats.monthlyRecurringRevenue)} detail="Normalized across billing cycles" icon={<CreditCard className="h-5 w-5" />} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" barValue={Math.min(100, dashboard.stats.monthlyRecurringRevenue ? 76 : 0)} />
              <StatTile title="Payment Watch" value={dashboard.stats.upcomingPayments} detail={`${dashboard.stats.pastDue} past due or suspended`} icon={<CalendarClock className="h-5 w-5" />} tone="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200" barValue={percent(dashboard.stats.upcomingPayments, Math.max(1, companies.length))} />
              <StatTile title="Governance" value={featureKeys.length} detail="Modules controlled per company" icon={<PackageCheck className="h-5 w-5" />} tone="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200" barValue={moduleCoverage} />
            </>
          )}
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Operational Signals</CardTitle>
                  <CardDescription className="mt-1 text-xs text-slate-500 dark:text-slate-400">A quick read on platform workload, adoption, and access quality.</CardDescription>
                </div>
                <Badge variant="outline" className="border-cyan-200/60 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">
                  <RadioTower className="mr-1 h-3.5 w-3.5" />
                  Live controls
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <SignalBar label="Approval throughput" value={approvalRate} tone="bg-cyan-500" />
              <SignalBar label="Seat activation" value={userActivityRate} tone="bg-emerald-500" />
              <SignalBar label="Module coverage" value={moduleCoverage} tone="bg-amber-500" />
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <WorkstreamCard title="Core Operations" value={starterCompanies.length} detail="Starter plan accounts" icon={<Sparkles className="h-5 w-5" />} tone="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200" />
            <WorkstreamCard title="Enterprise" value={enterpriseCompanies.length} detail="High-touch accounts" icon={<Globe2 className="h-5 w-5" />} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" />
            <WorkstreamCard title="Risk Queue" value={attentionCompanies.length} detail="Billing or access intervention" icon={<AlertTriangle className="h-5 w-5" />} tone="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200" />
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-lg border-slate-200 bg-white pl-9 shadow-sm dark:border-slate-800 dark:bg-slate-950" placeholder="Search company, email, code, or TIN" />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium dark:border-slate-800 dark:bg-slate-950">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              {approvedCompanies.length} active portfolio
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium dark:border-slate-800 dark:bg-slate-950">
              <ReceiptText className="h-3.5 w-3.5 text-amber-500" />
              {upcomingRenewals.length} renewals in 14 days
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium dark:border-slate-800 dark:bg-slate-950">
              <ServerCog className="h-3.5 w-3.5 text-sky-500" />
              {dashboard.packageMatrix.length || 4} packages
            </span>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 shadow-sm dark:from-slate-900 dark:to-slate-950 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
              <Megaphone className="h-4 w-4 text-cyan-600" />
              Selected Communication Desk
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {selectedCompanyIds.length ? `${selectedCompanyIds.length} companies selected: ${selectedCompanies.slice(0, 3).map((company) => company.name).join(", ")}${selectedCompanies.length > 3 ? "..." : ""}` : "Select companies from any list, then send a targeted platform message."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="bg-white dark:bg-slate-950" onClick={() => setSelectedCompanyIds(selectableCompanies.map((company) => company._id))}>
              <CheckCircle2 className="h-4 w-4" />
              Select approved
            </Button>
            <Button variant="outline" size="sm" className="bg-white dark:bg-slate-950" onClick={() => setSelectedCompanyIds([])} disabled={!selectedCompanyIds.length}>
              <XCircle className="h-4 w-4" />
              Clear
            </Button>
            <Button size="sm" onClick={() => { setBroadcastAudience(selectedCompanyIds.length ? "selected" : "all"); setBroadcastOpen(true); }}>
              <Megaphone className="h-4 w-4" />
              Message {selectedCompanyIds.length ? "selected" : "all"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="gap-4">
          <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-xl border border-slate-200/60 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <TabsTrigger value="overview" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">Overview</TabsTrigger>
            <TabsTrigger value="requests" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">Requests</TabsTrigger>
            <TabsTrigger value="portfolio" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">Portfolio</TabsTrigger>
            <TabsTrigger value="billing" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">Billing Watch</TabsTrigger>
            <TabsTrigger value="packages" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">Packages</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">Activity</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">Analytics</TabsTrigger>
            <TabsTrigger value="plans" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:text-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-900">Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
              <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white"><RadioTower className="h-5 w-5 text-cyan-600" />Control Room Workboard</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {isLoading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />) : (
                    <>
                      <WorkstreamCard title="Registration Intake" value={pendingCompanies.length} detail="Companies waiting for decision" icon={<ShieldCheck className="h-5 w-5" />} tone="bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200" />
                      <WorkstreamCard title="Billing Escalation" value={attentionCompanies.length} detail={`${formatMoney(revenueAtRisk)} in watched subscriptions`} icon={<AlertTriangle className="h-5 w-5" />} tone="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200" />
                      <WorkstreamCard title="Module Governance" value={`${moduleCoverage}%`} detail={`${assignedModules} enabled module grants`} icon={<Layers3 className="h-5 w-5" />} tone="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200" />
                      <WorkstreamCard title="Tenant Adoption" value={`${activeUsers}/${totalUsers || 0}`} detail="Active seats across the estate" icon={<Users className="h-5 w-5" />} tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" />
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4">
                <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white"><CalendarClock className="h-5 w-5 text-amber-600" />Renewals Next 14 Days</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isLoading ? <Skeleton className="h-32 rounded-xl" /> : upcomingRenewals.length ? upcomingRenewals.map((company) => (
                      <div key={company._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{company.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(company.next_billing_date)}</p>
                        </div>
                        <Badge variant="outline" className={statusStyles[company.subscription_status]}>{formatMoney(company.billing_amount)}</Badge>
                      </div>
                    )) : <EmptyPanel title="No near renewals" text="Renewals due in the next two weeks will surface here for proactive follow-up." />}
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white"><Building2 className="h-5 w-5 text-emerald-600" />Latest Companies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isLoading ? <Skeleton className="h-32 rounded-xl" /> : newestCompanies.length ? newestCompanies.map((company) => (
                      <div key={company._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{company.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{company.email}</p>
                        </div>
                        <Badge variant="outline" className={planStyles(company.subscription_plan)}>{titleCase(company.subscription_plan)}</Badge>
                      </div>
                    )) : <EmptyPanel title="No company activity" text="New tenant records will appear here as registrations and approvals happen." />}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-600" />
                <h3 className="text-base font-semibold text-slate-950 dark:text-white">Company Registration Queue</h3>
              </div>
              {isLoading ? <Skeleton className="h-64 rounded-xl" /> : pendingCompanies.length ? pendingCompanies.map((company) => renderCompanyRow(company, true)) : (
                <EmptyPanel title="No pending registrations" text="New public company registrations will appear here for approval, package assignment, and onboarding review." />
              )}
            </div>
          </TabsContent>

          <TabsContent value="portfolio">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-semibold text-slate-950 dark:text-white">Company Portfolio</h3>
              </div>
              {isLoading ? <Skeleton className="h-64 rounded-xl" /> : companies.length ? companies.map((company) => renderCompanyRow(company)) : (
                <EmptyPanel title="No companies found" text="Adjust the search term or refresh the dashboard to load the company portfolio." />
              )}
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-semibold text-slate-950 dark:text-white">Billing and Renewal Watch</h3>
              </div>
              {isLoading ? <Skeleton className="h-64 rounded-xl" /> : attentionCompanies.length ? attentionCompanies.map((company) => renderCompanyRow(company)) : (
                <EmptyPanel title="No billing issues" text="Past due and suspended accounts will appear here so the platform team can intervene quickly." />
              )}
            </div>
          </TabsContent>

          <TabsContent value="packages">
            <div className="mb-4 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 shadow-sm dark:from-slate-900 dark:to-slate-950 dark:border-slate-800">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Company Package Builder</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Packages are templates; the real contract is configured per company with plan, billing, renewal date, notes, and exact module grants.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  {featureKeys.length} platform modules available
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {companies.slice(0, 6).map((company) => (
                  <div key={company._id} className="group rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{company.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{company.enabledModuleCount}/{featureKeys.length} modules, {formatMoney(company.billing_amount)}</p>
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => setSelectedCompany(company)}>
                        <SlidersHorizontal className="h-4 w-4" />
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {subscriptionPlans.length > 0 ? subscriptionPlans.map((plan) => {
                const planCompanies = dashboard.companies.filter((company) => company.subscription_plan === plan.key);
                return (
                  <Card key={plan.key} className="overflow-hidden border-0 bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-900/70">
                    <div className="h-1 bg-emerald-500" />
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold text-slate-950 dark:text-white">
                        {plan.name}
                        <Badge variant="outline" className="rounded-md border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">{planCompanies.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(plan.modules || []).map((module) => (
                          <div key={module} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            {module}
                          </div>
                        ))}
                        {plan.outcomes && plan.outcomes.length > 0 && (
                          <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Best outcome</p>
                            {plan.outcomes.map((outcome) => (
                              <p key={outcome} className="text-sm text-slate-700 dark:text-slate-300">{outcome}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              }) : (
                <div className="col-span-full py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  No subscription plans found. Create plans in the Plans tab.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                  <ScrollText className="h-5 w-5 text-cyan-600" />
                  Platform Activity & Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditLogsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                  </div>
                ) : auditLogs.length === 0 ? (
                  <EmptyPanel title="No activity recorded" text="Platform audit logs will appear here once actions are taken." />
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="grid grid-cols-[1fr_120px_100px_140px] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                        <span>Action</span>
                        <span>Entity</span>
                        <span>Status</span>
                        <span className="text-right">Time</span>
                      </div>
                      {auditLogs.map((log) => (
                        <div key={log._id} className="grid grid-cols-[1fr_120px_100px_140px] gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-0 dark:border-slate-800/60">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900 dark:text-white">{log.action}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {log.user_id?.name || "System"}
                              {log.company_id ? ` · ${log.company_id.name}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <Badge variant="outline" className="rounded-md text-xs">
                              {log.entity_type}
                            </Badge>
                          </div>
                          <div className="flex items-center">
                            <Badge variant={log.status === "success" ? "default" : "destructive"} className="rounded-md text-xs">
                              {log.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-end text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(log.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Showing {auditLogs.length} of {auditLogsPagination.total} logs
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={auditLogsPagination.page <= 1} onClick={() => loadAuditLogs(auditLogsPagination.page - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={auditLogsPagination.page >= auditLogsPagination.total_pages} onClick={() => loadAuditLogs(auditLogsPagination.page + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            {analyticsLoading || !analytics ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                    <div className="h-1 bg-cyan-500" />
                    <CardContent className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">MRR</p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white">{formatMoney(analytics.mrr)}</p>
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                    <div className="h-1 bg-emerald-500" />
                    <CardContent className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Tenants</p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white">{analytics.totalTenants}</p>
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                    <div className="h-1 bg-amber-500" />
                    <CardContent className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Tenants</p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white">{analytics.activeTenants}</p>
                    </CardContent>
                  </Card>
                  <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                    <div className="h-1 bg-rose-500" />
                    <CardContent className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Churn Rate</p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white">
                        {analytics.totalTenants ? Math.round((analytics.churnTrend.reduce((s, d) => s + d.count, 0) / analytics.totalTenants) * 100) : 0}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                    <div className="h-1 bg-sky-500" />
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Growth Trend (New Signups)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={analytics.growthTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} label={{ value: 'New signups', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                    <div className="h-1 bg-red-500" />
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Churn Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={analytics.churnTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} label={{ value: 'Churned tenants', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                    <div className="h-1 bg-emerald-500" />
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Active Tenant Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={analytics.activeTenantTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} label={{ value: 'Month', position: 'insideBottom', offset: -2, fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} label={{ value: 'Active tenants', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="count" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                    <div className="h-1 bg-violet-500" />
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Plan Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={Object.entries(analytics.planDistribution).map(([name, value]) => ({ name: titleCase(name), value }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {Object.entries(analytics.planDistribution).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6"][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                    <div className="h-1 bg-indigo-500" />
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">MRR by Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={Object.entries(analytics.mrrByPlan).map(([plan, value]) => ({ plan: titleCase(plan), value: Math.round((value || 0) * 100) / 100 }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="plan" tick={{ fontSize: 12 }} label={{ value: 'Plan', position: 'insideBottom', offset: -2, fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} label={{ value: 'MRR ($)', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                          <Tooltip formatter={(value: number) => formatMoney(value)} />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
                    <div className="h-1 bg-teal-500" />
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Status Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={Object.entries(analytics.statusDistribution).map(([name, value]) => ({ name: titleCase(name), value }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {Object.entries(analytics.statusDistribution).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={["#10b981", "#f59e0b", "#ef4444", "#64748b", "#8b5cf6"][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="plans">
            <Card className="overflow-hidden border-0 bg-white shadow-sm dark:bg-slate-900/70">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">Subscription Plans</CardTitle>
                  <CardDescription>Create and manage platform subscription tiers and their feature sets.</CardDescription>
                </div>
                <Button size="sm" className="rounded-lg" onClick={() => openPlanDialog()}>
                  <Plus className="mr-1 h-4 w-4" /> Add plan
                </Button>
              </CardHeader>
              <CardContent>
                {plansLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                  </div>
                ) : subscriptionPlans.length === 0 ? (
                  <EmptyPanel title="No plans configured" text="Create your first subscription plan to define platform tiers." />
                ) : (
                  <div className="space-y-3">
                    {subscriptionPlans.map((plan) => (
                      <div key={plan.key} className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50/40 p-4 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 dark:text-white">{plan.name}</p>
                            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{plan.key}</code>
                            {!plan.is_active && <Badge variant="secondary" className="rounded-md text-xs">Inactive</Badge>}
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{plan.description || "No description"}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {plan.features.map((f) => (
                              <Badge key={f} variant="outline" className="rounded-md text-[10px]">{f}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => openPlanDialog(plan)}>Edit</Button>
                          <Button variant="ghost" size="sm" className="rounded-lg text-red-600" disabled={actionLoading === plan.key} onClick={() => handleDeletePlan(plan.key)}>
                            {actionLoading === plan.key ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AccessModal company={selectedCompany} packageMatrix={dashboard.packageMatrix} isOpen={!!selectedCompany} onClose={() => setSelectedCompany(null)} onSave={handleSaveAccess} saving={!!selectedCompany && actionLoading === selectedCompany._id} />

      <Dialog open={!!rejectCompany} onOpenChange={(open) => !open && setRejectCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Company Registration</DialogTitle>
            <DialogDescription>Send a clear reason to {rejectCompany?.name || "this company"} so they know what to correct.</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={4} placeholder="Reason for rejection" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectCompany(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectCompany || actionLoading === rejectCompany._id}>
              {rejectCompany && actionLoading === rejectCompany._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reminderCompany} onOpenChange={(open) => !open && setReminderCompany(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Payment Reminder</DialogTitle>
            <DialogDescription>Notify {reminderCompany?.name || "the company"} about upcoming or overdue subscription payment.</DialogDescription>
          </DialogHeader>
          <Textarea value={reminderMessage} onChange={(event) => setReminderMessage(event.target.value)} rows={5} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderCompany(null)}>Cancel</Button>
            <Button onClick={handleReminder} disabled={!reminderCompany || actionLoading === reminderCompany._id}>
              {reminderCompany && actionLoading === reminderCompany._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
              Send reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Send Platform Communication</DialogTitle>
            <DialogDescription>Send feature changes, maintenance notices, policy updates, payment guidance, or account-specific instructions to all approved companies or selected companies only.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setBroadcastAudience("all")}
                className={`rounded-lg border p-4 text-left transition ${broadcastAudience === "all" ? "border-cyan-400 bg-cyan-50 text-cyan-900 dark:border-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-100" : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"}`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold"><Globe2 className="h-4 w-4" />All approved companies</div>
                <p className="mt-1 text-xs opacity-75">Uses the platform broadcast endpoint default audience.</p>
              </button>
              <button
                type="button"
                onClick={() => setBroadcastAudience("selected")}
                className={`rounded-lg border p-4 text-left transition ${broadcastAudience === "selected" ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100" : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"}`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" />Selected companies</div>
                <p className="mt-1 text-xs opacity-75">{selectedCompanyIds.length || 0} selected for targeted communication.</p>
              </button>
            </div>

            {broadcastAudience === "selected" && (
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Recipients</p>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCompanyIds(selectableCompanies.map((company) => company._id))}>Select all visible</Button>
                </div>
                <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {selectableCompanies.map((company) => (
                    <label key={company._id} className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                      <Checkbox
                        checked={selectedCompanyIds.includes(company._id)}
                        onCheckedChange={(checked) => toggleCompanySelection(company._id, checked === true)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-900 dark:text-white">{company.name}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{company.email}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <FileText className="h-4 w-4" />
                Message templates
              </div>
              <div className="flex flex-wrap gap-2">
                {messageTemplates.map((tmpl) => (
                  <Button
                    key={tmpl.key}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => { setBroadcastSubject(tmpl.subject); setBroadcastMessage(tmpl.message); }}
                  >
                    {tmpl.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={broadcastSubject} onChange={(event) => setBroadcastSubject(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={broadcastMessage} onChange={(event) => setBroadcastMessage(event.target.value)} rows={5} />
            </div>

            {broadcastHistory.length > 0 && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <History className="h-4 w-4" />
                  Recent broadcast history
                </div>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {broadcastHistory.map((item) => (
                    <div key={item._id} className="rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{((item.changes as unknown) as { subject?: string })?.subject || "Platform update"}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => {
                              setBroadcastSubject(((item.changes as unknown) as { subject?: string })?.subject || "Platform update");
                              setBroadcastMessage(((item.changes as unknown) as { message?: string })?.message || "");
                            }}
                          >
                            Reuse
                          </Button>
                          <span className="text-slate-500">{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                      <div className="mt-1 text-slate-500">
                        Recipients: {((item.changes as unknown) as { recipients?: number })?.recipients ?? 0} · Sent: {((item.changes as unknown) as { sent?: number })?.sent ?? 0} · Failed: {((item.changes as unknown) as { failed?: number })?.failed ?? 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
            <Button onClick={handleBroadcast} disabled={actionLoading === "broadcast"}>
              {actionLoading === "broadcast" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
              Send to {broadcastAudience === "selected" ? `${selectedCompanyIds.length} selected` : "all approved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={userDrawerOpen} onOpenChange={setUserDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {userDrawerCompany?.name} — Users
            </SheetTitle>
            <SheetDescription>
              View all users registered under this tenant company.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {companyUsersLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : companyUsers.length === 0 ? (
              <EmptyPanel title="No users found" text="This company does not have any registered users yet." />
            ) : (
              <div className="space-y-3">
                {companyUsers.map((user) => (
                  <div key={user._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-white">{user.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={actionLoading === user._id}
                        onClick={() => userDrawerCompany && handleImpersonate(userDrawerCompany._id, user._id, user.name, user.email)}
                      >
                        {actionLoading === user._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
                        Impersonate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={actionLoading === user._id}
                        onClick={() => userDrawerCompany && handleForcePasswordReset(userDrawerCompany._id, user._id)}
                      >
                        {actionLoading === user._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />}
                        Reset
                      </Button>
                      <Badge variant="outline" className="text-xs">{user.role}</Badge>
                      <Badge variant={user.isActive ? "default" : "secondary"} className="text-xs">{user.isActive ? "Active" : "Inactive"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={planDialogOpen} onOpenChange={(open) => { if (!open) setPlanDialogOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create Plan"}</DialogTitle>
            <DialogDescription>Define subscription tier name, key, features, and billing defaults.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Key</label>
                <Input value={planForm.key} disabled={!!editingPlan} onChange={(e) => setPlanForm({ ...planForm, key: e.target.value })} placeholder="e.g. starter" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Name</label>
                <Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. Starter" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Description</label>
              <Input value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} placeholder="Short description" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Features (system keys, one per line)</label>
              <Textarea value={planForm.features} onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })} rows={3} placeholder={"inventory\nsales\nreports"} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Pricing card sections (one per line)</label>
              <Textarea value={planForm.modules} onChange={(e) => setPlanForm({ ...planForm, modules: e.target.value })} rows={7} placeholder={"Inventory Core|Products & Categories\nRevenue Flow|POS\nFinance Control|Bank Accounts"} />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Use Section|Feature to keep the public pricing card grouped like the design.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Included pills / outcomes (one per line)</label>
              <Textarea value={planForm.outcomes} onChange={(e) => setPlanForm({ ...planForm, outcomes: e.target.value })} rows={3} placeholder={"included|control|Control Room included\nincluded|ai|Stacy AI Assistant included"} />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Use included|control|Label or included|ai|Label for the colored pills on the pricing page.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Badge label</label>
                <Input value={planForm.badge} onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })} placeholder="ENTRY TIER" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Icon (Lucide name)</label>
                <Input value={planForm.icon} onChange={(e) => setPlanForm({ ...planForm, icon: e.target.value })} placeholder="Boxes, BarChart3, ShieldCheck" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Button label</label>
                <Input value={planForm.button_label} onChange={(e) => setPlanForm({ ...planForm, button_label: e.target.value })} placeholder="Choose 10k" />
              </div>
              <div className="space-y-1 flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={planForm.featured} onChange={(e) => setPlanForm({ ...planForm, featured: e.target.checked })} />
                  Featured (Recommended badge)
                </label>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Amount</label>
                <Input type="number" value={planForm.default_billing_amount} onChange={(e) => setPlanForm({ ...planForm, default_billing_amount: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Cycle</label>
                <select className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950" value={planForm.default_billing_cycle} onChange={(e) => setPlanForm({ ...planForm, default_billing_cycle: e.target.value })}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Sort order</label>
                <Input type="number" value={planForm.sort_order} onChange={(e) => setPlanForm({ ...planForm, sort_order: e.target.value })} placeholder="0" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={planForm.is_active} onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })} />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePlan} disabled={actionLoading === "plan"}>
              {actionLoading === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={impersonateDialogOpen} onOpenChange={setImpersonateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impersonation Token</DialogTitle>
            <DialogDescription>
              You are impersonating {impersonateUser?.name} ({impersonateUser?.email}). Copy the token below to authenticate as this user in a new session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <code className="block break-all text-xs text-slate-700 dark:text-slate-300">{impersonateToken}</code>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(impersonateToken);
                flashSuccess("Token copied to clipboard.");
              }}
            >
              Copy token to clipboard
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonateDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordResetDialogOpen} onOpenChange={setPasswordResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset Complete</DialogTitle>
            <DialogDescription>
              A temporary password has been generated for {passwordResetResult?.user.name} ({passwordResetResult?.user.email}). Share this securely with the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">Temporary password</p>
              <code className="mt-1 block text-lg font-mono font-semibold text-amber-900 dark:text-amber-100">{passwordResetResult?.tempPassword}</code>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                if (passwordResetResult?.tempPassword) {
                  navigator.clipboard.writeText(passwordResetResult.tempPassword);
                  flashSuccess("Password copied to clipboard.");
                }
              }}
            >
              Copy password to clipboard
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordResetDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
