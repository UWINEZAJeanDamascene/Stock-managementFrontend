import { useEffect, useMemo, useState } from 'react';
import { companyService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
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
  Cell,
} from 'recharts';
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
  Fingerprint,
} from 'lucide-react';

// ── Types ──
interface SecurityStats {
  users: {
    total: number;
    active: number;
    locked: number;
    twoFAEnabled: number;
    twoFARate: number;
    inactive: number;
  };
  logins: {
    todayTotal: number;
    todaySuccess: number;
    todayFailed: number;
    weekFailed: number;
    failedRate: number;
  };
  audit: {
    total: number;
    actionLogs: number;
    byEntity: Array<{ _id: string; count: number }>;
    byStatus: Array<{ _id: string; count: number }>;
  };
  ipWhitelist: { total: number };
  recentEvents: Array<{
    _id: string;
    action: string;
    entity_type: string;
    status: string;
    user: { name: string; email: string } | null;
    company: { name: string; code: string } | null;
    ip_address: string;
    createdAt: string;
  }>;
  recentFailedLogins: Array<{
    _id: string;
    user: { name: string; email: string } | null;
    ipAddress: string;
    createdAt: string;
  }>;
  activityTrend: Array<{ date: string; total: number; failed: number }>;
}

interface AuditLog {
  _id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  company_id?: { _id: string; name: string; code?: string } | null;
  user_id?: { _id: string; name: string; email: string } | null;
  status: string;
  createdAt: string;
}

// ── Dynamic color helpers ── no hardcoded module lists ──
const TAILWIND_PALETTES = [
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400', darkBorder: 'dark:border-blue-800', fill: '#3b82f6' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-400', darkBorder: 'dark:border-emerald-800', fill: '#10b981' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400', darkBorder: 'dark:border-orange-800', fill: '#f97316' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-400', darkBorder: 'dark:border-purple-800', fill: '#a855f7' },
  { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-400', darkBorder: 'dark:border-pink-800', fill: '#ec4899' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', darkBg: 'dark:bg-cyan-900/30', darkText: 'dark:text-cyan-400', darkBorder: 'dark:border-cyan-800', fill: '#06b6d4' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-400', darkBorder: 'dark:border-amber-800', fill: '#eab308' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', darkBg: 'dark:bg-rose-900/30', darkText: 'dark:text-rose-400', darkBorder: 'dark:border-rose-800', fill: '#f43f5e' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-400', darkBorder: 'dark:border-indigo-800', fill: '#6366f1' },
  { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', darkBg: 'dark:bg-teal-900/30', darkText: 'dark:text-teal-400', darkBorder: 'dark:border-teal-800', fill: '#14b8a6' },
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getEntityPalette(entityType: string) {
  return TAILWIND_PALETTES[hashString(entityType || 'unknown') % TAILWIND_PALETTES.length];
}

// ── Format helpers ──
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Metric card ──
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  loading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
  loading?: boolean;
}) {
  const toneMap = {
    blue: 'bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60',
    violet: 'bg-violet-50 text-violet-600 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900/60',
    slate: 'bg-slate-50 text-slate-600 ring-slate-100 dark:bg-slate-950/40 dark:text-slate-300 dark:ring-slate-900/60',
  };

  if (loading) {
    return (
      <Card className="border-slate-200/80 dark:border-slate-800">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="mt-5 h-8 w-24" />
          <Skeleton className="mt-3 h-3 w-36" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
            <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          </div>
          <div className={`rounded-lg p-2.5 ring-1 ${toneMap[tone]}`}>{icon}</div>
        </div>
        {subtitle && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ── Status badge ──
function StatusBadge({ status }: { status: string }) {
  if (status === 'success') {
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Success
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400">
      <XCircle className="mr-1 h-3 w-3" /> Failed
    </Badge>
  );
}

// ── Main Component ──
export default function SecurityAuditPage() {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, per_page: 20, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditFilterStatus, setAuditFilterStatus] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companyService.getPlatformSecurityStats() as any;
      if (response.success) {
        setStats(response.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load security stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (page = 1, status = '') => {
    try {
      setAuditLoading(true);
      const params: any = { page, per_page: 20 };
      if (status) params.status = status;
      const response = await companyService.getPlatformAuditLogs(params) as any;
      if (response.success) {
        setAuditLogs(response.data || []);
        setAuditPagination(response.pagination || { page: 1, per_page: 20, total: 0, total_pages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
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
      name: e._id || 'unknown',
      count: e.count,
      fill: getEntityPalette(e._id || 'unknown').fill,
    }));
  }, [stats]);

  const statusChartData = useMemo(() => {
    if (!stats?.audit?.byStatus) return [];
    return stats.audit.byStatus.map((s) => ({
      name: s._id,
      value: s.count,
      fill: s._id === 'success' ? '#10b981' : '#ef4444',
    }));
  }, [stats]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] 2xl:max-w-[2200px] w-full space-y-6">
        {/* Header */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white">
          <div className="p-6 lg:p-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/10">
                    <Shield className="mr-1 h-3.5 w-3.5" />
                    Platform Security Center
                  </Badge>
                  {stats && (
                    <Badge
                      variant="secondary"
                      className={
                        stats.logins.failedRate < 5
                          ? 'bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-200'
                          : stats.logins.failedRate < 15
                            ? 'bg-amber-500/20 text-amber-700 hover:bg-amber-500/20 dark:text-amber-200'
                            : 'bg-rose-500/20 text-rose-700 hover:bg-rose-500/20 dark:text-rose-200'
                      }
                    >
                      {stats.logins.failedRate < 5 ? 'Secure' : stats.logins.failedRate < 15 ? 'Caution' : 'At Risk'}
                    </Badge>
                  )}
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Security & Audit</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-300 sm:text-base">
                  Monitor platform security posture, login activity, and audit trails across all tenants.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                  onClick={() => { fetchStats(); fetchAuditLogs(auditPage, auditFilterStatus); }}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Users"
            value={stats?.users.total ?? 0}
            subtitle={stats ? `${stats.users.active} active · ${stats.users.inactive} inactive` : undefined}
            icon={<Users className="h-5 w-5" />}
            tone="blue"
            loading={loading}
          />
          <MetricCard
            title="Failed Logins Today"
            value={stats?.logins.todayFailed ?? 0}
            subtitle={stats ? `${stats.logins.failedRate}% failure rate · ${stats.logins.weekFailed} this week` : undefined}
            icon={<ShieldAlert className="h-5 w-5" />}
            tone={stats && stats.logins.failedRate > 15 ? 'rose' : 'amber'}
            loading={loading}
          />
          <MetricCard
            title="2FA Adoption"
            value={`${stats?.users.twoFARate ?? 0}%`}
            subtitle={stats ? `${stats.users.twoFAEnabled} of ${stats.users.total} users enabled` : undefined}
            icon={<Fingerprint className="h-5 w-5" />}
            tone="emerald"
            loading={loading}
          />
          <MetricCard
            title="IP Whitelist"
            value={stats?.ipWhitelist.total ?? 0}
            subtitle="Configured entries"
            icon={<Globe className="h-5 w-5" />}
            tone="violet"
            loading={loading}
          />
        </div>

        {/* Charts & Tables */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Security Events</TabsTrigger>
            <TabsTrigger value="failed">Failed Logins</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Activity Trend */}
              <Card className="border-slate-200/80 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    7-Day Activity Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[260px] w-full rounded-lg" />
                  ) : stats?.activityTrend && stats.activityTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={stats.activityTrend}>
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}
                          labelStyle={{ color: '#475569', fontWeight: 600 }}
                        />
                        <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#colorTotal)" strokeWidth={2} name="Total Actions" />
                        <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#colorFailed)" strokeWidth={2} name="Failed" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">No activity data available</div>
                  )}
                </CardContent>
              </Card>

              {/* Audit by Entity */}
              <Card className="border-slate-200/80 dark:border-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-violet-500" />
                    Audit by Entity Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[260px] w-full rounded-lg" />
                  ) : entityChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={entityChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}
                          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {entityChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">No entity data available</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Status Distribution */}
            <Card className="border-slate-200/80 dark:border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Audit Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[200px] w-full rounded-lg" />
                ) : statusChartData.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-8">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={statusChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 13 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}
                          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {statusChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">No status data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <Card className="border-slate-200/80 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  Recent Security Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : stats?.recentEvents && stats.recentEvents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                          <th className="pb-3 pr-4">Action</th>
                          <th className="pb-3 pr-4">Entity</th>
                          <th className="pb-3 pr-4">User</th>
                          <th className="pb-3 pr-4">Company</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4">IP</th>
                          <th className="pb-3">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {stats.recentEvents.map((event) => {
                          const palette = getEntityPalette(event.entity_type);
                          return (
                            <tr key={event._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                              <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">{event.action}</td>
                              <td className="py-3 pr-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${palette.bg} ${palette.text} ${palette.border} ${palette.darkBg} ${palette.darkText} ${palette.darkBorder}`}>
                                  {event.entity_type}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                                {event.user ? event.user.name || event.user.email : 'System'}
                              </td>
                              <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                                {event.company ? `${event.company.name} (${event.company.code})` : 'N/A'}
                              </td>
                              <td className="py-3 pr-4"><StatusBadge status={event.status} /></td>
                              <td className="py-3 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400">{event.ip_address || 'N/A'}</td>
                              <td className="py-3 text-slate-500 dark:text-slate-400 text-xs">{timeAgo(event.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-slate-400">No recent security events</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failed" className="mt-4">
            <Card className="border-slate-200/80 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ServerCrash className="h-4 w-4 text-rose-500" />
                  Recent Failed Logins
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : stats?.recentFailedLogins && stats.recentFailedLogins.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                          <th className="pb-3 pr-4">User</th>
                          <th className="pb-3 pr-4">Email</th>
                          <th className="pb-3 pr-4">IP Address</th>
                          <th className="pb-3">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {stats.recentFailedLogins.map((log) => (
                          <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            <td className="py-3 pr-4 font-medium text-slate-800 dark:text-slate-200">{log.user?.name || 'Unknown'}</td>
                            <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{log.user?.email || 'N/A'}</td>
                            <td className="py-3 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400">{log.ipAddress || 'N/A'}</td>
                            <td className="py-3 text-slate-500 dark:text-slate-400 text-xs">{timeAgo(log.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-slate-400">No failed logins recently</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={auditFilterStatus === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAuditFilterStatus('')}
              >
                All
              </Button>
              <Button
                variant={auditFilterStatus === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setAuditPage(1); setAuditFilterStatus('success'); }}
              >
                Success
              </Button>
              <Button
                variant={auditFilterStatus === 'failure' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setAuditPage(1); setAuditFilterStatus('failure'); }}
              >
                Failed
              </Button>
            </div>

            <Card className="border-slate-200/80 dark:border-slate-800">
              <CardContent className="p-0">
                {auditLoading ? (
                  <div className="space-y-3 p-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : auditLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                          <th className="py-3 px-6">Action</th>
                          <th className="py-3 px-6">Entity</th>
                          <th className="py-3 px-6">User</th>
                          <th className="py-3 px-6">Company</th>
                          <th className="py-3 px-6">Status</th>
                          <th className="py-3 px-6">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {auditLogs.map((log) => {
                          const palette = getEntityPalette(log.entity_type);
                          return (
                            <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                              <td className="py-3 px-6 font-medium text-slate-800 dark:text-slate-200">{log.action}</td>
                              <td className="py-3 px-6">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${palette.bg} ${palette.text} ${palette.border} ${palette.darkBg} ${palette.darkText} ${palette.darkBorder}`}>
                                  {log.entity_type}
                                </span>
                              </td>
                              <td className="py-3 px-6 text-slate-600 dark:text-slate-300">
                                {log.user_id ? (log.user_id.name || log.user_id.email) : 'System'}
                              </td>
                              <td className="py-3 px-6 text-slate-600 dark:text-slate-300">
                                {log.company_id ? `${log.company_id.name} (${log.company_id.code})` : 'N/A'}
                              </td>
                              <td className="py-3 px-6"><StatusBadge status={log.status} /></td>
                              <td className="py-3 px-6 text-slate-500 dark:text-slate-400 text-xs">{timeAgo(log.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-slate-400">No audit logs found</div>
                )}

                {/* Pagination */}
                {auditPagination.total_pages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Page {auditPagination.page} of {auditPagination.total_pages} ({auditPagination.total} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={auditPage <= 1}
                        onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={auditPage >= auditPagination.total_pages}
                        onClick={() => setAuditPage((p) => Math.min(auditPagination.total_pages, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
