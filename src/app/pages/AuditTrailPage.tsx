import { useEffect, useState, useCallback } from 'react';
import { Layout } from '../layout/Layout';
import { auditTrailApi } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import {
  History,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Eye,
  X,
  Calendar,
  User,
  Monitor,
  Globe,
  Clock,
  Activity,
  BarChart3,
  RefreshCw,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────

interface ActionLog {
  _id: string;
  user?: { _id: string; name: string; email: string };
  action: string;
  module: string;
  targetId?: string;
  targetModel?: string;
  details?: {
    method?: string;
    url?: string;
    body?: Record<string, unknown>;
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failed';
  createdAt: string;
}

interface AuditStats {
  total: number;
  byModule: { _id: string; count: number }[];
  byStatus: { _id: string; count: number }[];
  topUsers: { _id: string; name: string; email: string; count: number }[];
}

const MODULES = [
  'product', 'stock', 'supplier', 'client',
  'quotation', 'invoice', 'user', 'category', 'report', 'purchase', 'company'
];

const MODULE_COLORS: Record<string, string> = {
  product: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  stock: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  supplier: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  client: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  quotation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  invoice: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  user: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  category: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  report: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  purchase: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  company: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
};

function formatAction(action: string): string {
  // "POST /api/products" → "Created Product"
  // "PUT /api/products/123" → "Updated Product"
  // "DELETE /api/products/123" → "Deleted Product"
  const method = action.split(' ')[0];
  const path = action.split(' ')[1] || '';
  const segments = path.split('/').filter(Boolean);
  // Get entity from path (e.g., "products" from "/api/products/...")
  const entity = segments[1] || '';
  const singular = entity.replace(/s$/, '');

  switch (method) {
    case 'POST': return `Created ${singular}`;
    case 'PUT':
    case 'PATCH': return `Updated ${singular}`;
    case 'DELETE': return `Deleted ${singular}`;
    case 'GET': return `Viewed ${singular}`;
    default: return action;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════

export default function AuditTrailPage() {
  const { t } = useTranslation();

  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<ActionLog | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterModule) params.module = filterModule;
      if (filterStatus) params.status = filterStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await auditTrailApi.getAll(params) as any;
      if (response.success) {
        setLogs(response.data || []);
        setTotalPages(response.pages || 1);
        setTotal(response.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to fetch audit trail:', err);
      setError(err?.message || 'Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterModule, filterStatus, startDate, endDate]);

  const fetchStats = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await auditTrailApi.getStats(params) as any;
      if (response.success) {
        setStats(response.data);
      }
    } catch {
      // Stats are optional, don't show error
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterModule('');
    setFilterStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = filterModule || filterStatus || startDate || endDate || searchTerm;

  return (
    <Layout>
      <div className="p-3 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <History className="h-6 w-6 text-indigo-600" />
              {t('auditTrail.title', 'Audit Trail')}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('auditTrail.subtitle', 'Track all user actions and changes across the system')}
            </p>
          </div>
          <button
            onClick={() => { fetchLogs(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> {t('common.refresh', 'Refresh')}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('auditTrail.totalActions', 'Total Actions')}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.total.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('auditTrail.successful', 'Successful')}
                </span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {(stats.byStatus.find(s => s._id === 'success')?.count || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('auditTrail.failed', 'Failed')}
                </span>
              </div>
              <p className="text-2xl font-bold text-red-600">
                {(stats.byStatus.find(s => s._id === 'failed')?.count || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('auditTrail.modules', 'Modules')}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.byModule.length}</p>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('auditTrail.searchPlaceholder', 'Search actions...')}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Module filter */}
            <select
              value={filterModule}
              onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm min-w-[150px]"
            >
              <option value="">{t('auditTrail.allModules', 'All Modules')}</option>
              {MODULES.map(m => (
                <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>

            {/* Toggle advanced filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                hasActiveFilters
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Filter className="h-4 w-4" />
              {t('auditTrail.filters', 'Filters')}
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </button>
          </div>

          {/* Advanced filters row */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
              >
                <option value="">{t('auditTrail.allStatuses', 'All Statuses')}</option>
                <option value="success">{t('auditTrail.success', 'Success')}</option>
                <option value="failed">{t('auditTrail.failedStatus', 'Failed')}</option>
              </select>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                  placeholder="From"
                />
                <span className="text-slate-400 text-sm">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm"
                  placeholder="To"
                />
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <X className="h-3.5 w-3.5" /> {t('auditTrail.clearFilters', 'Clear')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results info */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {total > 0
              ? `${t('auditTrail.showing', 'Showing')} ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} ${t('auditTrail.of', 'of')} ${total.toLocaleString()}`
              : ''}
          </span>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <History className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {t('auditTrail.noLogs', 'No activity logs found')}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              {hasActiveFilters
                ? t('auditTrail.tryDifferentFilters', 'Try different filters')
                : t('auditTrail.noActivityYet', 'User actions will appear here')}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-3 md:p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('auditTrail.when', 'When')}
                    </th>
                    <th className="text-left p-3 md:p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('auditTrail.user', 'User')}
                    </th>
                    <th className="text-left p-3 md:p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('auditTrail.action', 'Action')}
                    </th>
                    <th className="text-left p-3 md:p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('auditTrail.module', 'Module')}
                    </th>
                    <th className="text-left p-3 md:p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('auditTrail.status', 'Status')}
                    </th>
                    <th className="text-right p-3 md:p-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t('auditTrail.details', 'Details')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-3 md:p-4">
                        <div className="text-sm font-medium text-slate-800 dark:text-white">
                          {timeAgo(log.createdAt)}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">
                          {formatDate(log.createdAt)} {formatTime(log.createdAt)}
                        </div>
                      </td>
                      <td className="p-3 md:p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 text-xs font-bold uppercase">
                            {log.user?.name?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                              {log.user?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                              {log.user?.email || ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 md:p-4">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {formatAction(log.action)}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate max-w-[250px]" title={log.action}>
                          {log.action}
                        </p>
                      </td>
                      <td className="p-3 md:p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          MODULE_COLORS[log.module] || 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {log.module}
                        </span>
                      </td>
                      <td className="p-3 md:p-4">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                            <CheckCircle className="h-3.5 w-3.5" /> {t('auditTrail.success', 'Success')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                            <XCircle className="h-3.5 w-3.5" /> {t('auditTrail.failedStatus', 'Failed')}
                          </span>
                        )}
                      </td>
                      <td className="p-3 md:p-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title={t('auditTrail.viewDetails', 'View details')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t('auditTrail.page', 'Page')} {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="h-4 w-4" /> {t('common.back', 'Back')}
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
              >
                {t('common.next', 'Next')} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3" onClick={() => setSelectedLog(null)}>
            <div
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Eye className="h-5 w-5 text-indigo-600" />
                  {t('auditTrail.actionDetails', 'Action Details')}
                </h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-4 md:p-5 overflow-y-auto max-h-[calc(85vh-65px)] space-y-4">
                {/* Status & timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedLog.status === 'success' ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                        <CheckCircle className="h-3.5 w-3.5" /> Success
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                        <XCircle className="h-3.5 w-3.5" /> Failed
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      MODULE_COLORS[selectedLog.module] || 'bg-slate-100 text-slate-700'
                    }`}>
                      {selectedLog.module}
                    </span>
                  </div>
                </div>

                {/* Info rows */}
                <div className="space-y-3">
                  <DetailRow
                    icon={<Clock className="h-4 w-4" />}
                    label={t('auditTrail.timestamp', 'Timestamp')}
                    value={`${formatDate(selectedLog.createdAt)} ${formatTime(selectedLog.createdAt)}`}
                  />
                  <DetailRow
                    icon={<User className="h-4 w-4" />}
                    label={t('auditTrail.user', 'User')}
                    value={selectedLog.user ? `${selectedLog.user.name} (${selectedLog.user.email})` : 'Unknown'}
                  />
                  <DetailRow
                    icon={<Activity className="h-4 w-4" />}
                    label={t('auditTrail.rawAction', 'Raw Action')}
                    value={selectedLog.action}
                    mono
                  />
                  {selectedLog.targetId && (
                    <DetailRow
                      icon={<Monitor className="h-4 w-4" />}
                      label={t('auditTrail.targetId', 'Target ID')}
                      value={selectedLog.targetId}
                      mono
                    />
                  )}
                  {selectedLog.ipAddress && (
                    <DetailRow
                      icon={<Globe className="h-4 w-4" />}
                      label={t('auditTrail.ipAddress', 'IP Address')}
                      value={selectedLog.ipAddress}
                      mono
                    />
                  )}
                  {selectedLog.userAgent && (
                    <DetailRow
                      icon={<Monitor className="h-4 w-4" />}
                      label={t('auditTrail.userAgent', 'User Agent')}
                      value={selectedLog.userAgent}
                      truncate
                    />
                  )}
                </div>

                {/* Request details */}
                {selectedLog.details && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {t('auditTrail.requestDetails', 'Request Details')}
                    </h3>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto max-h-48 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ─── Sub-component ──────────────────────────────────

function DetailRow({ icon, label, value, mono, truncate }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-slate-400 dark:text-slate-500 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`text-sm text-slate-800 dark:text-white mt-0.5 ${mono ? 'font-mono text-xs' : ''} ${truncate ? 'truncate' : 'break-words'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
