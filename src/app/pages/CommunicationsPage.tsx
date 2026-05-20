import { useEffect, useMemo, useState } from 'react';
import { companyService } from '@/services';
import { type PlatformCompany } from '@/lib/api';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Checkbox } from '@/app/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  Globe,
  History,
  Loader2,
  Mail,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Users,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

// ── Templates ──
const messageTemplates = [
  {
    key: 'feature-release',
    label: 'Feature Release',
    subject: 'New features now live on StockManager',
    message:
      'We have released platform improvements that may affect your workspace. Please review your dashboard for the latest updates and feel free to reach out with any questions.',
    accent: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800',
  },
  {
    key: 'maintenance',
    label: 'Scheduled Maintenance',
    subject: 'Scheduled platform maintenance',
    message:
      'Our platform will undergo scheduled maintenance to improve performance and reliability. We expect brief downtime during the maintenance window. Thank you for your patience.',
    accent: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
  },
  {
    key: 'policy-update',
    label: 'Policy Update',
    subject: 'Important policy update',
    message:
      'We are updating our terms of service and privacy policy to reflect new features and compliance requirements. Please review the changes in your account settings.',
    accent: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800',
  },
  {
    key: 'payment-notice',
    label: 'Payment Notice',
    subject: 'Subscription payment reminder',
    message:
      'Your subscription payment is coming due. Please arrange payment to keep your access active and avoid any service interruption.',
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
  },
  {
    key: 'security-alert',
    label: 'Security Alert',
    subject: 'Security best practices reminder',
    message:
      'As part of our ongoing security efforts, we recommend reviewing your account security settings, enabling two-factor authentication, and ensuring your password is strong and unique.',
    accent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800',
  },
];

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// ── Email Preview ──
function EmailPreview({ subject, message }: { subject: string; message: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-white/5 dark:text-slate-500">
        Email Preview
      </div>
      <div className="p-4">
        <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-800 dark:bg-white/5 dark:text-slate-100">
          Subject: {subject}
        </div>
        <div className="rounded-lg border border-slate-100 p-4 dark:border-white/5">
          <div className="mx-auto max-w-[520px] space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">StockManager Platform</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">no-reply@stockmanager.rw</p>
              </div>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {message.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 p-4 text-center dark:from-indigo-950/30 dark:to-violet-950/20">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You are receiving this because you are a registered tenant on StockManager.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function CommunicationsPage() {
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [broadcastHistory, setBroadcastHistory] = useState<
    Array<{
      _id: string;
      action: string;
      changes?: { subject?: string; message?: string; recipients?: number; sent?: number; failed?: number };
      createdAt: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Composer state
  const [broadcastAudience, setBroadcastAudience] = useState<'all' | 'selected'>('all');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [broadcastSubject, setBroadcastSubject] = useState('Platform update from StockManager');
  const [broadcastMessage, setBroadcastMessage] = useState(
    'We have released platform improvements that may affect your workspace. Please review your dashboard for the latest updates.'
  );
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'compose' | 'history'>('compose');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [dashboardRes, historyRes] = await Promise.all([
        companyService.getPlatformDashboard(),
        companyService.getPlatformAuditLogs({ action: 'company.platform_broadcast_sent', per_page: 50 }),
      ]);
      setCompanies(dashboardRes.data.companies);
      if (historyRes.success) {
        setBroadcastHistory(
          historyRes.data.map((item: any) => ({
            _id: item._id,
            action: item.action,
            changes: item.changes || {},
            createdAt: item.createdAt,
          }))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies.filter((c) => c.approvalStatus === 'approved');
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        c.approvalStatus === 'approved' &&
        (c.name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q)))
    );
  }, [companies, search]);

  const handleBroadcast = async () => {
    setError(null);
    setSuccessMessage(null);
    if (broadcastAudience === 'selected' && !selectedCompanyIds.length) {
      setError('Select at least one company before sending a targeted broadcast.');
      return;
    }
    try {
      setActionLoading(true);
      const response = await companyService.broadcastPlatformUpdate({
        subject: broadcastSubject,
        message: broadcastMessage,
        companyIds: broadcastAudience === 'selected' ? selectedCompanyIds : undefined,
      });
      setSuccessMessage(
        response.data.sent
          ? `Broadcast sent successfully to ${response.data.recipients} tenant${response.data.recipients === 1 ? '' : 's'}.`
          : 'Broadcast recorded, but no email recipients were available.'
      );
      setBroadcastSubject('');
      setBroadcastMessage('');
      setSelectedCompanyIds([]);
      await loadData();
    } catch (e) {
      setError('Failed to send broadcast. Please try again.');
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCompany = (id: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedCompanyIds(filteredCompanies.map((c) => c._id));
  };

  const clearAll = () => {
    setSelectedCompanyIds([]);
  };

  return (
    <div className="w-full space-y-5">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200/60 bg-gradient-to-br from-violet-50 via-indigo-50 to-cyan-50 p-4 dark:from-violet-950/40 dark:via-indigo-950/30 dark:to-cyan-950/20 dark:border-white/10 sm:p-5 lg:p-6">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-800 dark:bg-violet-500/15 dark:text-violet-300">
              <MessageSquare className="h-3.5 w-3.5" />
              Broadcast Center
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Communications
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
              Compose and send platform-wide announcements, maintenance notices, and policy updates
              to all tenants or targeted groups. Preview exactly how your message will look before sending.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="border-slate-200 bg-white/80 text-slate-700 backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'compose' | 'history')}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-white/70 p-1 backdrop-blur dark:bg-white/5 sm:w-fit">
          <TabsTrigger
            value="compose"
            className="shrink-0 text-xs data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-500/15 dark:data-[state=active]:text-indigo-300"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Compose
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="shrink-0 text-xs data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-500/15 dark:data-[state=active]:text-indigo-300"
          >
            <History className="mr-1.5 h-3.5 w-3.5" />
            History
            {broadcastHistory.length > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {broadcastHistory.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'compose' && (
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
          {/* ── Left: Composer ── */}
          <div className="space-y-6">
            {/* Templates */}
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Message Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {messageTemplates.map((tmpl) => (
                    <button
                      key={tmpl.key}
                      onClick={() => {
                        setBroadcastSubject(tmpl.subject);
                        setBroadcastMessage(tmpl.message);
                      }}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all hover:shadow-sm',
                        tmpl.accent
                      )}
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Audience */}
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Audience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastAudience('all')}
                    className={cn(
                      'flex flex-col gap-2 rounded-xl border p-4 text-left transition-all',
                      broadcastAudience === 'all'
                        ? 'border-indigo-300 bg-indigo-50 shadow-sm dark:border-indigo-700 dark:bg-indigo-500/10'
                        : 'border-slate-200 bg-white/50 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                      <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      All Tenants
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Send to every approved company ({companies.filter((c) => c.approvalStatus === 'approved').length})
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBroadcastAudience('selected')}
                    className={cn(
                      'flex flex-col gap-2 rounded-xl border p-4 text-left transition-all',
                      broadcastAudience === 'selected'
                        ? 'border-emerald-300 bg-emerald-50 shadow-sm dark:border-emerald-700 dark:bg-emerald-500/10'
                        : 'border-slate-200 bg-white/50 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                      <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Selected Tenants
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedCompanyIds.length} selected for targeted broadcast
                    </p>
                  </button>
                </div>

                {broadcastAudience === 'selected' && (
                  <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="Search tenants..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="border-slate-200 bg-white/80 pl-8 text-xs dark:border-white/10 dark:bg-[#0b111a]/60"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={selectAll}>
                          All
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={clearAll}>
                          None
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                      {filteredCompanies.map((company) => (
                        <label
                          key={company._id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white dark:hover:bg-white/5"
                        >
                          <Checkbox
                            checked={selectedCompanyIds.includes(company._id)}
                            onCheckedChange={() => toggleCompany(company._id)}
                            className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white dark:border-slate-600"
                          />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{company.name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{company.email || 'No email'}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message body */}
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 dark:text-slate-200">Subject</Label>
                  <Input
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    placeholder="Enter broadcast subject..."
                    className="border-slate-200 bg-white/80 text-sm dark:border-white/10 dark:bg-[#0b111a]/60 dark:text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-700 dark:text-slate-200">Body</Label>
                  <Textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={5}
                    className="border-slate-200 bg-white/80 text-sm dark:border-white/10 dark:bg-[#0b111a]/60 dark:text-white"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    {successMessage}
                  </div>
                )}

                <Button
                  onClick={handleBroadcast}
                  disabled={actionLoading || !broadcastSubject.trim() || !broadcastMessage.trim()}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-semibold text-white hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {broadcastAudience === 'all'
                    ? `Send to All Tenants (${companies.filter((c) => c.approvalStatus === 'approved').length})`
                    : `Send to ${selectedCompanyIds.length} Selected Tenant${selectedCompanyIds.length === 1 ? '' : 's'}`}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Preview ── */}
          <div className="space-y-6">
            <EmailPreview subject={broadcastSubject} message={broadcastMessage} />

            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-500/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Total Tenants</p>
                  <p className="mt-1 text-2xl font-bold text-indigo-900 dark:text-indigo-100">{companies.length}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">Approved</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                    {companies.filter((c) => c.approvalStatus === 'approved').length}
                  </p>
                </div>
                <div className="rounded-xl bg-sky-50 p-4 dark:bg-sky-500/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-300">Emails Sent</p>
                  <p className="mt-1 text-2xl font-bold text-sky-900 dark:text-sky-100">
                    {broadcastHistory.reduce((sum, h) => sum + (h.changes?.sent || 0), 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">Total Broadcasts</p>
                  <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">{broadcastHistory.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : broadcastHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 p-16 dark:border-white/10 dark:bg-white/5">
              <History className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">No broadcasts yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Switch to Compose to send your first platform communication.</p>
            </div>
          ) : (
            broadcastHistory.map((item) => (
              <Card
                key={item._id}
                className="border-slate-200/60 bg-white/80 backdrop-blur-xl transition-all hover:shadow-sm dark:border-white/10 dark:bg-[#0f172a]/60"
              >
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {item.changes?.subject || 'Platform update'}
                      </p>
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{item.changes?.message || ''}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {item.changes?.recipients !== undefined && (
                        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-[10px] font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300">
                          <Users className="mr-1 h-3 w-3" />
                          {item.changes.recipients} recipient{item.changes.recipients === 1 ? '' : 's'}
                        </Badge>
                      )}
                      {item.changes?.sent !== undefined && (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {item.changes.sent} sent
                        </Badge>
                      )}
                      {item.changes?.failed !== undefined && item.changes.failed > 0 && (
                        <Badge variant="outline" className="border-red-200 bg-red-50 text-[10px] font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                          <XCircle className="mr-1 h-3 w-3" />
                          {item.changes.failed} failed
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex-col sm:items-end">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
