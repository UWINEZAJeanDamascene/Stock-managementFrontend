import { useEffect, useMemo, useState } from 'react';
import { companyService } from '@/services';
import {
  type PlatformCompany,
  type PlatformSubscriptionStatus,
} from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { cn } from '@/lib/utils';
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
  Layers3,
} from 'lucide-react';

// ── Helpers ──
function planStyles(plan: string): string {
  const known: Record<string, string> = {
    starter: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-200 dark:border-cyan-800',
    professional: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
    enterprise: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
    growth: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
  };
  return known[plan] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700';
}

const statusStyles: Record<string, string> = {
  trialing: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
  past_due: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800',
  suspended: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700',
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800',
};

const statusIcon: Record<string, React.ReactNode> = {
  active: <CheckCircle2 className="h-3.5 w-3.5" />,
  trialing: <Activity className="h-3.5 w-3.5" />,
  past_due: <AlertTriangle className="h-3.5 w-3.5" />,
  suspended: <Ban className="h-3.5 w-3.5" />,
  cancelled: <XCircle className="h-3.5 w-3.5" />,
  pending: <CalendarClock className="h-3.5 w-3.5" />,
  approved: <ShieldCheck className="h-3.5 w-3.5" />,
  rejected: <XCircle className="h-3.5 w-3.5" />,
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type FilterTab = 'all' | 'active' | 'pending' | 'past_due' | 'suspended' | 'trialing';

// ── Stat Card ──
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden border-slate-200/60 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60">
      <div className={cn('absolute left-0 top-0 h-full w-1', accent)} />
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl',
            accent.replace('bg-', 'bg-').replace('500', '500/15')
          )}
        >
          <Icon className={cn('h-5 w-5', accent.replace('bg-', 'text-'))} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──
export default function TenantsPage() {
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedCompany, setSelectedCompany] = useState<PlatformCompany | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      const response = await companyService.getPlatformDashboard();
      setCompanies(response.data.companies);
    } catch {
      try {
        const pending = await companyService.getPendingCompanies();
        setCompanies(pending.data as unknown as PlatformCompany[]);
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
    const active = companies.filter((c) => c.subscription_status === 'active').length;
    const pending = companies.filter((c) => c.approvalStatus === 'pending').length;
    const pastDue = companies.filter((c) => c.subscription_status === 'past_due').length;
    const trialing = companies.filter((c) => c.subscription_status === 'trialing').length;
    const suspended = companies.filter((c) => c.subscription_status === 'suspended').length;
    const mrr = companies.reduce((sum, c) => {
      const amt = c.billing_amount || 0;
      return sum + (c.subscription_status === 'active' || c.subscription_status === 'trialing' ? amt : 0);
    }, 0);
    return { total, active, pending, pastDue, trialing, suspended, mrr };
  }, [companies]);

  const filtered = useMemo(() => {
    let data = [...companies];
    if (filter !== 'all') {
      data = data.filter((c) =>
        filter === 'pending'
          ? c.approvalStatus === 'pending'
          : c.subscription_status === filter
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.code && c.code.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }
    return data;
  }, [companies, filter, search]);

  const handleView = (company: PlatformCompany) => {
    setSelectedCompany(company);
    setSheetOpen(true);
  };

  const handleQuickStatus = async (company: PlatformCompany, status: PlatformSubscriptionStatus) => {
    try {
      setActionLoading(`${company._id}:${status}`);
      await companyService.updatePlatformAccess(company._id, {
        subscription_status: status,
        subscription_plan: company.subscription_plan,
        billing_cycle: company.billing_cycle,
      });
      await loadTenants();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (company: PlatformCompany) => {
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

  return (
    <div className="space-y-8">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-indigo-50 via-violet-50 to-cyan-50 p-8 dark:from-indigo-950/40 dark:via-violet-950/30 dark:to-cyan-950/20 dark:border-white/10">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-300/30 blur-3xl dark:bg-indigo-500/15" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/15" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:border-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Globe className="h-3.5 w-3.5" />
              Tenant Directory
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Platform Tenants
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
              Manage every registered company. Review subscriptions, approve new registrations,
              and monitor platform health in real time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadTenants}
              disabled={isLoading}
              className="border-slate-200 bg-white/80 text-slate-700 backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Total Tenants" value={stats.total} icon={Building2} accent="bg-indigo-500" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} accent="bg-emerald-500" />
        <StatCard label="Trialing" value={stats.trialing} icon={Activity} accent="bg-sky-500" />
        <StatCard label="Pending" value={stats.pending} icon={CalendarClock} accent="bg-amber-500" />
        <StatCard label="Past Due" value={stats.pastDue} icon={AlertTriangle} accent="bg-red-500" />
        <StatCard label="Monthly Revenue" value={formatMoney(stats.mrr)} icon={CreditCard} accent="bg-violet-500" />
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
          <TabsList className="h-9 bg-white/70 backdrop-blur dark:bg-white/5">
            {[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'trialing', label: 'Trialing' },
              { value: 'pending', label: 'Pending' },
              { value: 'past_due', label: 'Past Due' },
              { value: 'suspended', label: 'Suspended' },
            ].map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="text-xs data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-500/15 dark:data-[state=active]:text-indigo-300"
              >
                {t.label}
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {t.value === 'all'
                    ? companies.length
                    : t.value === 'pending'
                    ? companies.filter((c) => c.approvalStatus === 'pending').length
                    : companies.filter((c) => c.subscription_status === t.value).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search tenants by name, code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-slate-200 bg-white/80 pl-9 text-sm backdrop-blur placeholder:text-slate-400 focus-visible:ring-indigo-500 dark:border-white/10 dark:bg-[#0b111a]/60 dark:text-white"
          />
        </div>
      </div>

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 p-16 dark:border-white/10 dark:bg-white/5">
          <Building2 className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">No tenants found</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((company) => (
            <Card
              key={company._id}
              className="group relative overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-indigo-500/5 dark:border-white/10 dark:bg-[#0f172a]/60"
            >
              <CardHeader className="pb-3 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-indigo-500/20">
                      {company.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{company.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{company.code || '—'}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 text-[10px] font-semibold', statusStyles[company.subscription_status || 'active'])}>
                    <span className="mr-1">{statusIcon[company.subscription_status || 'active']}</span>
                    {titleCase(company.subscription_status || 'active')}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn('text-[10px] font-semibold', planStyles(company.subscription_plan))}>
                    <Crown className="mr-1 h-3 w-3" />
                    {titleCase(company.subscription_plan || 'starter')}
                  </Badge>
                  {company.approvalStatus === 'pending' && (
                    <Badge variant="outline" className={cn('text-[10px] font-semibold', statusStyles.pending)}>
                      Awaiting Approval
                    </Badge>
                  )}
                  {company.isActive === false && (
                    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[10px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                      Inactive
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-white/5">
                    <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">Billing</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{formatMoney(company.billing_amount || 0)}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{titleCase(company.billing_cycle || 'monthly')}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-white/5">
                    <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">Next bill</p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{formatDate(company.next_billing_date)}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {company.trial_ends_at ? `Trial ends ${formatDate(company.trial_ends_at)}` : 'Recurring'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {company.users ?? 0} users
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Layers3 className="h-3.5 w-3.5" />
                    {company.enabledModuleCount ?? 0} modules
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 border-slate-200 bg-white/80 text-xs font-medium text-slate-700 backdrop-blur hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    onClick={() => handleView(company)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    View
                  </Button>
                  {company.approvalStatus === 'pending' ? (
                    <Button
                      size="sm"
                      className="h-8 flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-xs font-medium text-white hover:from-indigo-700 hover:to-violet-700"
                      onClick={() => handleApprove(company)}
                      disabled={actionLoading === company._id}
                    >
                      {actionLoading === company._id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Approve
                    </Button>
                  ) : company.subscription_status === 'active' || company.subscription_status === 'trialing' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 border-rose-200 bg-rose-50 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-500/10"
                      onClick={() => handleQuickStatus(company, 'suspended')}
                      disabled={actionLoading === `${company._id}:suspended`}
                    >
                      {actionLoading === `${company._id}:suspended` ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Ban className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-8 flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-xs font-medium text-white hover:from-emerald-700 hover:to-teal-700"
                      onClick={() => handleQuickStatus(company, 'active')}
                      disabled={actionLoading === `${company._id}:active`}
                    >
                      {actionLoading === `${company._id}:active` ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Activate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Detail Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto border-slate-200 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-[#0b111a]/95 sm:max-w-xl">
          {selectedCompany && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-3 pt-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/20">
                    {selectedCompany.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <SheetTitle className="text-left text-lg font-bold text-slate-900 dark:text-white">
                      {selectedCompany.name}
                    </SheetTitle>
                    <p className="text-left text-xs text-slate-500 dark:text-slate-400">{selectedCompany.code || 'No code'}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6 py-4">
                {/* Status row */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={cn('text-xs font-semibold', statusStyles[selectedCompany.subscription_status || 'active'])}>
                    {statusIcon[selectedCompany.subscription_status || 'active']}
                    <span className="ml-1">{titleCase(selectedCompany.subscription_status || 'active')}</span>
                  </Badge>
                  <Badge variant="outline" className={cn('text-xs font-semibold', planStyles(selectedCompany.subscription_plan))}>
                    <Crown className="mr-1 h-3 w-3" />
                    {titleCase(selectedCompany.subscription_plan || 'starter')}
                  </Badge>
                  <Badge variant="outline" className={cn('text-xs font-semibold', statusStyles[selectedCompany.approvalStatus || 'pending'])}>
                    {titleCase(selectedCompany.approvalStatus || 'pending')}
                  </Badge>
                </div>

                {/* Contact */}
                <div className="space-y-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contact</h4>
                  <div className="space-y-2 text-sm">
                    {selectedCompany.email && (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {selectedCompany.email}
                      </div>
                    )}
                    {selectedCompany.phone && (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                        <Phone className="h-4 w-4 text-slate-400" />
                        {selectedCompany.phone}
                      </div>
                    )}
                  </div>
                </div>

                {/* Billing */}
                <div className="space-y-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subscription</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Amount</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{formatMoney(selectedCompany.billing_amount || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Cycle</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{titleCase(selectedCompany.billing_cycle || 'monthly')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Next billing</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{formatDate(selectedCompany.next_billing_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Trial ends</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{formatDate(selectedCompany.trial_ends_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Modules */}
                <div className="space-y-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Enabled Features ({selectedCompany.enabledModuleCount ?? 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCompany.enabledModules?.map((m) => (
                      <Badge
                        key={m}
                        variant="secondary"
                        className="bg-indigo-50 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                      >
                        {titleCase(m)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Subscription modules */}
                {selectedCompany.subscription_modules && selectedCompany.subscription_modules.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Included Modules ({selectedCompany.subscription_modules.length})
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCompany.subscription_modules.map((m) => (
                        <Badge
                          key={m}
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                        >
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-200 bg-white/80 text-slate-700 backdrop-blur hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    onClick={() => setSheetOpen(false)}
                  >
                    Close
                  </Button>
                  {selectedCompany.approvalStatus === 'pending' && (
                    <Button
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700"
                      onClick={() => {
                        handleApprove(selectedCompany);
                        setSheetOpen(false);
                      }}
                      disabled={actionLoading === selectedCompany._id}
                    >
                      {actionLoading === selectedCompany._id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Approve Tenant
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
